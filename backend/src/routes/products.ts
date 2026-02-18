import express from 'express';
import { db } from '../utils/database';
import { vectorService } from '../services/vectorService';
import { validate, productSchema } from '../utils/validation';
import { optionalAuth } from '../middleware/auth';

const router = express.Router();

function expandQuery(raw: string): string {
  const q = String(raw || '').toLowerCase();
  const synonyms: Record<string, string[]> = {
    pants: ['trousers', 'slacks'],
    trousers: ['pants', 'slacks'],
    slacks: ['pants', 'trousers'],
    hoodie: ['hooded', 'sweatshirt'],
    sweatshirt: ['hoodie'],
    sneakers: ['shoes', 'trainer', 'trainers'],
    sneaker: ['shoes', 'trainer', 'trainers'],
    trainers: ['sneakers', 'shoes'],
    trainer: ['sneakers', 'shoes'],
    handbag: ['bag', 'purse'],
    purse: ['bag', 'handbag'],
  };

  const tokens = q.split(/\W+/).filter(Boolean);
  const expanded = new Set<string>();
  for (const t of tokens) {
    expanded.add(t);
    if (t.endsWith('s') && t.length > 3) expanded.add(t.slice(0, -1));
    const syn = synonyms[t];
    if (syn) syn.forEach(s => expanded.add(s));
  }

  return Array.from(expanded).join(' ');
}

/**
 * @route   GET /api/products
 * @desc    Get products with optional filters and sorting
 * @access   Public
 */
router.get('/', optionalAuth, async (req: express.Request, res: express.Response) => {
  try {
    const {
      category,
      minPrice,
      maxPrice,
      inStock,
      tags,
      sort = 'created_at_desc',
      page = 1,
      limit = 20
    } = req.query;

    let query = 'SELECT * FROM products WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    // Apply filters
    if (category) {
      query += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (minPrice) {
      query += ` AND price >= $${paramIndex}`;
      params.push(parseFloat(minPrice as string));
      paramIndex++;
    }

    if (maxPrice) {
      query += ` AND price <= $${paramIndex}`;
      params.push(parseFloat(maxPrice as string));
      paramIndex++;
    }

    if (inStock === 'true') {
      query += ` AND stock > 0`;
    }

    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      query += ` AND tags::jsonb ?| $${paramIndex}::jsonb`;
      params.push(JSON.stringify(tagArray));
      paramIndex++;
    }

    // Apply sorting
    const [sortField, sortOrder] = (sort as string).split('_');
    const validSortFields = ['price', 'name', 'created_at'];
    const field = validSortFields.includes(sortField) ? sortField : 'created_at';
    const order = sortOrder === 'asc' ? 'ASC' : 'DESC';
    
    query += ` ORDER BY ${field} ${order}`;

    // Apply pagination
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit as string), offset);

    const result = await db.query(query, params);
    
    // Convert price from string to number for frontend compatibility
    const products = result.rows.map(product => ({
      ...product,
      price: parseFloat(product.price)
    }));
    
    res.json({
      products,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: result.rowCount || result.rows.length
      }
    });
  } catch (error: any) {
    console.error('Products fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch products'
    });
  }
});

/**
 * @route   GET /api/products/search
 * @desc    Semantic search for products using FAISS
 * @access   Public
 */
router.get('/search', async (req: express.Request, res: express.Response) => {
  try {
    const { q: query, limit = 10 } = req.query;
    
    if (!query) {
      return res.status(400).json({
        error: 'Search query is required'
      });
    }

    const expandedQuery = expandQuery(query as string);

    // Try vector search first
    console.log(`[Search] Trying vector search for query: "${query}"`);
    const vectorResults = await vectorService.searchProducts(expandedQuery, parseInt(limit as string));
    console.log(`[Search] Vector search returned ${vectorResults.length} results`);
    
    // Only use vector search if we have high-quality results (similarity > 0.1)
    const highQualityResults = vectorResults.filter(r => r.score > 0.1);
    console.log(`[Search] High-quality vector results: ${highQualityResults.length}`);
    
    if (highQualityResults.length > 0) {
      console.log(`[Search] Using vector search results`);
      // Get full product details from database
      const productIds = highQualityResults.map(r => r.id);
      const placeholders = productIds.map((_, index) => `$${index + 1}`).join(',');
      
      const dbQuery = `SELECT * FROM products WHERE id IN (${placeholders})`;
      const dbResult = await db.query(dbQuery, productIds);
      
      // Map results with vector scores and convert price to number
      const productsWithScores = dbResult.rows.map(product => {
        const vectorResult = vectorResults.find(vr => vr.id === product.id);
        return {
          ...product,
          price: parseFloat(product.price),
          similarityScore: vectorResult?.score || 0,
          metadata: vectorResult?.metadata || {}
        };
      });

      // Track search activity if authenticated
      if (req.user) {
        const activityQuery = `
          INSERT INTO user_activity (session_id, user_id, activity_type, metadata)
          VALUES ($1, $2, $3, $4)
        `;
        
        await db.query(activityQuery, [
          `session_${Date.now()}`,
          req.user.userId,
          'search',
          JSON.stringify({ query, resultsCount: productsWithScores.length })
        ]);
      }

      return res.json({
        products: productsWithScores,
        searchType: 'vector',
        query: query
      });
    }

    // Fallback to text-based search
    console.log(`[Search] Using text-based search for query: "${query}"`);
    
    // Enhanced search query including tags and metadata
    const searchQuery = `
      SELECT * FROM products 
      WHERE 
        name ILIKE $1 OR 
        category ILIKE $1 OR
        description ILIKE $1 OR
        tags::text ILIKE $1
      ORDER BY 
        CASE 
          WHEN name ILIKE $1 THEN 1
          WHEN category ILIKE $1 THEN 2
          WHEN tags::text ILIKE $1 THEN 3
          WHEN description ILIKE $1 THEN 4
          ELSE 5
        END,
        created_at DESC
    `;

    const fallbackResult = await db.query(searchQuery, [`%${expandedQuery}%`]);

    console.log(`[Search] Found ${fallbackResult.rows.length} raw results for query: "${query}"`);

    // Enhanced relevance filtering with tags and metadata
    const searchTerm = expandedQuery.toLowerCase().trim();
    console.log(`[Search] Filtering results for search term: "${searchTerm}"`);
    
    const relevantResults = fallbackResult.rows.filter(product => {
      const name = product.name.toLowerCase();
      const description = product.description.toLowerCase();
      const category = product.category.toLowerCase();
      const tags = (product.tags || []).join(' ').toLowerCase();
      
      // Also check metadata fields
      const style = (product.metadata?.style || '').toLowerCase();
      const season = Array.isArray(product.metadata?.season) 
        ? product.metadata.season.join(' ').toLowerCase()
        : (product.metadata?.season || '').toLowerCase();
      const occasions = (product.metadata?.occasion || []).join(' ').toLowerCase();
      
      // Name match (highest priority)
      if (name.includes(searchTerm)) {
        console.log(`[Search] ✓ Name match: "${product.name}" contains "${searchTerm}"`);
        return true;
      }
      
      // Category match
      if (category.includes(searchTerm)) {
        console.log(`[Search] ✓ Category match: "${product.category}" contains "${searchTerm}"`);
        return true;
      }
      
      // Tags match (very important for product discovery)
      if (tags.includes(searchTerm)) {
        console.log(`[Search] ✓ Tags match: "${tags}" contains "${searchTerm}"`);
        return true;
      }
      
      // Style match (e.g., "casual", "formal", "elegant")
      if (style.includes(searchTerm)) {
        console.log(`[Search] ✓ Style match: "${style}" contains "${searchTerm}"`);
        return true;
      }
      
      // Occasion match (e.g., "work", "wedding", "travel")
      if (occasions.includes(searchTerm)) {
        console.log(`[Search] ✓ Occasion match: "${occasions}" contains "${searchTerm}"`);
        return true;
      }
      
      // Season match (e.g., "summer", "winter", "fall")
      if (season.includes(searchTerm)) {
        console.log(`[Search] ✓ Season match: "${season}" contains "${searchTerm}"`);
        return true;
      }
      
      // Description match (lower priority)
      if (description.includes(searchTerm)) {
        console.log(`[Search] ✓ Description match: "${product.description}" contains "${searchTerm}"`);
        return true;
      }
      
      console.log(`[Search] ✗ No match for: "${product.name}"`);
      return false;
    });

    console.log(`[Search] Filtered to ${relevantResults.length} relevant results`);

    const finalResults = relevantResults.slice(0, parseInt(limit as string)).map(product => ({
      ...product,
      price: parseFloat(product.price)
    }));

    console.log(`[Search] Returning ${finalResults.length} results:`, finalResults.map(p => p.name));

    res.json({
      products: finalResults,
      searchType: 'text',
      query: query
    });

  } catch (error: any) {
    console.error('Search error:', error);
    res.status(500).json({
      error: 'Search failed'
    });
  }
});

/**
 * @route   GET /api/products/categories
 * @desc    Get all product categories with counts
 * @access   Public
 */
router.get('/categories', async (req: express.Request, res: express.Response) => {
  try {
    const query = `
      SELECT category, COUNT(*) as count 
      FROM products 
      GROUP BY category 
      ORDER BY count DESC
    `;

    const result = await db.query(query);

    res.json({
      categories: result.rows
    });

  } catch (error: any) {
    console.error('Categories fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch categories'
    });
  }
});

/**
 * @route   GET /api/products/:id
 * @desc    Get single product by ID
 * @access   Public
 */
router.get('/:id', async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    
    const query = 'SELECT * FROM products WHERE id = $1';
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Product not found'
      });
    }

    // Track user activity if authenticated
    if (req.user) {
      const activityQuery = `
        INSERT INTO user_activity (session_id, user_id, activity_type, product_id, metadata)
        VALUES ($1, $2, $3, $4, $5)
      `;
      
      await db.query(activityQuery, [
        `session_${Date.now()}`, // You might want to track actual session
        req.user.userId,
        'view',
        id,
        JSON.stringify({ timestamp: new Date().toISOString() })
      ]);
    }

    const product = result.rows[0];
    
    // Convert price to number for frontend compatibility
    const productWithNumberPrice = {
      ...product,
      price: parseFloat(product.price)
    };

    res.json(productWithNumberPrice);
  } catch (error: any) {
    console.error('Product fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch product'
    });
  }
});

/**
 * @route   POST /api/products
 * @desc    Create new product (admin only)
 * @access   Private (add admin middleware later)
 */
router.post('/', validate(productSchema), async (req: express.Request, res: express.Response) => {
  try {
    const {
      name,
      description,
      price,
      category,
      sizes,
      colors,
      stock = 0,
      tags = [],
      metadata = {},
      image_url
    } = req.body;

    const query = `
      INSERT INTO products (name, description, price, category, sizes, colors, stock, tags, metadata, image_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const result = await db.query(query, [
      name,
      description,
      price,
      category,
      JSON.stringify(sizes),
      JSON.stringify(colors),
      stock,
      JSON.stringify(tags),
      JSON.stringify(metadata),
      image_url
    ]);

    // Index in vector search
    try {
      const productData = {
        id: result.rows[0].id,
        name,
        description,
        category,
        tags
      };
      
      await vectorService.indexProducts([productData]);
    } catch (vectorError) {
      console.warn('Vector indexing failed:', vectorError);
    }

    res.status(201).json({
      message: 'Product created successfully',
      product: result.rows[0]
    });

  } catch (error: any) {
    console.error('Product creation error:', error);
    res.status(500).json({
      error: 'Failed to create product'
    });
  }
});

export default router;
