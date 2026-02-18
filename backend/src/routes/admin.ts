import express from 'express';
import { db } from '../utils/database';
import { validate, productSchema, couponSchema } from '../utils/validation';
import { requireAdmin } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import { vectorService } from '../services/vectorService';

const router = express.Router();

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(process.cwd(), 'uploads', 'products'));
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `${uniqueName}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  }
});

/**
 * @route   POST /api/admin/products/upload
 * @desc    Upload product image
 * @access   Private (admin)
 */
router.post('/products/upload', requireAdmin, upload.single('image'), async (req: express.Request, res: express.Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'Image is required'
      });
    }

    res.json({
      url: `http://localhost:3001/uploads/products/${req.file.filename}`
    });
  } catch (error: any) {
    console.error('Product image upload error:', error);
    res.status(500).json({
      error: 'Failed to upload image'
    });
  }
});

/**
 * @route   POST /api/admin/reindex-embeddings
 * @desc    Regenerate product embeddings + metadata files for vector search
 * @access   Private (admin)
 */
router.post('/reindex-embeddings', requireAdmin, async (req: express.Request, res: express.Response) => {
  try {
    const result = await db.query('SELECT * FROM products ORDER BY created_at DESC');
    const products = result.rows.map((p: any) => ({
      id: String(p.id),
      name: String(p.name || ''),
      category: String(p.category || ''),
      price: parseFloat(p.price),
      description: String(p.description || ''),
      tags: Array.isArray(p.tags) ? p.tags : [],
      metadata: p.metadata || {},
    }));

    await vectorService.indexProducts(products);

    res.json({
      success: true,
      count: products.length,
      message: 'Embeddings reindexed successfully'
    });
  } catch (error: any) {
    console.error('Reindex embeddings error:', error);
    res.status(500).json({
      error: 'Failed to reindex embeddings'
    });
  }
});

/**
 * @route   GET /api/admin/dashboard
 * @desc    Get admin dashboard stats
 * @access   Private (admin)
 */
router.get('/dashboard', requireAdmin, async (req: express.Request, res: express.Response) => {
  try {
    // Get basic stats
    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM products) as total_products,
        (SELECT COUNT(*) FROM orders) as total_orders,
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM orders WHERE status = 'pending') as pending_orders,
        (SELECT COALESCE(SUM(total), 0) FROM orders WHERE created_at >= NOW() - INTERVAL '30 days') as revenue_30_days
    `;
    
    const statsResult = await db.query(statsQuery);
    
    // Get recent orders
    const recentOrdersQuery = `
      SELECT o.*, u.email as user_email
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
      LIMIT 10
    `;
    
    const recentOrdersResult = await db.query(recentOrdersQuery);
    
    // Get top products
    const topProductsQuery = `
      SELECT 
        p.id, p.name, p.price, p.category, p.image_url,
        SUM(oi.quantity) as total_sold,
        COUNT(oi.id) as order_count
      FROM products p
      LEFT JOIN order_items oi ON p.id = oi.product_id
      GROUP BY p.id, p.name, p.price, p.category
      ORDER BY total_sold DESC
      LIMIT 10
    `;
    
    const topProductsResult = await db.query(topProductsQuery);
    
    const s = statsResult.rows[0] || {};
    res.json({
      totalProducts: parseInt(s.total_products || '0'),
      totalOrders: parseInt(s.total_orders || '0'),
      totalRevenue: parseFloat(s.revenue_30_days || '0'),
      activeCoupons: 0,
      recentOrders: recentOrdersResult.rows,
      topProducts: topProductsResult.rows.map((p: any) => ({
        product: p,
        sales: parseInt(p.total_sold || '0')
      }))
    });

  } catch (error: any) {
    console.error('Dashboard fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch dashboard data'
    });
  }
});

/**
 * @route   GET /api/admin/products
 * @desc    Get all products (admin view)
 * @access   Private (admin)
 */
router.get('/products', requireAdmin, async (req: express.Request, res: express.Response) => {
  try {
    const { page = 1, limit = 20, category, search } = req.query;
    
    let query = 'SELECT * FROM products WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;
    
    if (category) {
      query += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }
    
    if (search) {
      query += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit as string), (parseInt(page as string) - 1) * parseInt(limit as string));
    
    const result = await db.query(query, params);
    
    // Get total count
    const countQuery = query.replace(/SELECT \* FROM/, 'SELECT COUNT(*) FROM').replace(/ORDER BY.*$/, '');
    const countResult = await db.query(countQuery, params.slice(0, -2));
    
    res.json({
      products: result.rows,
      total: parseInt(countResult.rows[0].count)
    });

  } catch (error: any) {
    console.error('Admin products fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch products'
    });
  }
});

/**
 * @route   POST /api/admin/products
 * @desc    Create new product
 * @access   Private (admin)
 */
router.post('/products', upload.single('image'), validate(productSchema), requireAdmin, async (req: express.Request, res: express.Response) => {
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
      metadata = {}
    } = req.body;
    
    const imageUrl = req.file ? `/uploads/products/${req.file.filename}` : null;
    
    const query = `
      INSERT INTO products (name, description, price, image_url, category, sizes, colors, stock, tags, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    
    const result = await db.query(query, [
      name,
      description,
      price,
      imageUrl,
      category,
      JSON.stringify(sizes),
      JSON.stringify(colors),
      stock,
      JSON.stringify(tags),
      JSON.stringify(metadata)
    ]);
    
    // Index for vector search
    try {
      const { vectorService } = await import('../services/vectorService');
      await vectorService.indexProducts([{
        id: result.rows[0].id,
        name,
        description,
        category,
        price,
        tags
      }]);
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

/**
 * @route   PUT /api/admin/products/:id
 * @desc    Update product
 * @access   Private (admin)
 */
router.put('/products/:id', upload.single('image'), requireAdmin, async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    let query = 'UPDATE products SET ';
    const fields = [];
    const values = [];
    let paramIndex = 1;
    
    // Handle image upload
    if (req.file) {
      fields.push(`image_url = $${paramIndex}`);
      values.push(`/uploads/products/${req.file.filename}`);
      paramIndex++;
    }
    
    // Handle other fields
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined && key !== 'id') {
        if (['sizes', 'colors', 'tags', 'metadata'].includes(key)) {
          fields.push(`${key} = $${paramIndex}`);
          values.push(JSON.stringify(value));
        } else {
          fields.push(`${key} = $${paramIndex}`);
          values.push(value);
        }
        paramIndex++;
      }
    }
    
    if (fields.length === 0) {
      return res.status(400).json({
        error: 'No fields to update'
      });
    }
    
    fields.push(`updated_at = NOW()`);
    values.push(id);
    
    query += fields.join(', ') + ` WHERE id = $${paramIndex} RETURNING *`;
    
    const result = await db.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Product not found'
      });
    }
    
    res.json({
      message: 'Product updated successfully',
      product: result.rows[0]
    });

  } catch (error: any) {
    console.error('Product update error:', error);
    res.status(500).json({
      error: 'Failed to update product'
    });
  }
});

/**
 * @route   DELETE /api/admin/products/:id
 * @desc    Delete product
 * @access   Private (admin)
 */
router.delete('/products/:id', requireAdmin, async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    
    // Check if product exists
    const productQuery = 'SELECT * FROM products WHERE id = $1';
    const productResult = await db.query(productQuery, [id]);
    
    if (productResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Product not found'
      });
    }
    
    // Delete product
    await db.query('DELETE FROM products WHERE id = $1', [id]);
    
    res.json({
      message: 'Product deleted successfully'
    });

  } catch (error: any) {
    console.error('Product deletion error:', error);
    res.status(500).json({
      error: 'Failed to delete product'
    });
  }
});

/**
 * @route   GET /api/admin/orders
 * @desc    Get all orders (admin view)
 * @access   Private (admin)
 */
router.get('/orders', requireAdmin, async (req: express.Request, res: express.Response) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    
    let query = `
      SELECT 
        o.*,
        u.email as user_email,
        u.name as user_name,
        COUNT(oi.id) as item_count
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
    `;
    
    const params: any[] = [];
    let whereClause = '';
    
    if (status) {
      whereClause += ` WHERE o.status = $1`;
      params.push(status);
    }
    
    query += whereClause + ` GROUP BY o.id, u.email, u.name ORDER BY o.created_at DESC`;
    
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit as string), offset);
    
    const result = await db.query(query, params);

    // Total count (without pagination)
    let countQuery = 'SELECT COUNT(*) FROM orders o';
    const countParams: any[] = [];
    if (status) {
      countQuery += ' WHERE o.status = $1';
      countParams.push(status);
    }
    const countResult = await db.query(countQuery, countParams);

    res.json({
      orders: result.rows,
      total: parseInt(countResult.rows[0].count)
    });

  } catch (error: any) {
    console.error('Admin orders fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch orders'
    });
  }
});

/**
 * @route   POST /api/admin/coupons
 * @desc    Create new coupon
 * @access   Private (admin)
 */
router.post('/coupons', validate(couponSchema), requireAdmin, async (req: express.Request, res: express.Response) => {
  try {
    const couponData = req.body;
    const couponId = require('uuid').v4();
    
    const query = `
      INSERT INTO coupons (id, code, discount_type, discount_value, min_purchase, max_discount, valid_until, usage_limit, created_by_agent, reason)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    
    const result = await db.query(query, [
      couponId,
      couponData.code.toUpperCase(),
      couponData.discount_type,
      couponData.discount_value,
      couponData.min_purchase || null,
      couponData.max_discount || null,
      couponData.valid_until || null,
      couponData.usage_limit || null,
      false,
      couponData.reason || null
    ]);
    
    res.status(201).json({
      message: 'Coupon created successfully',
      coupon: result.rows[0]
    });

  } catch (error: any) {
    console.error('Coupon creation error:', error);
    res.status(500).json({
      error: 'Failed to create coupon'
    });
  }
});

/**
 * @route   GET /api/admin/analytics
 * @desc    Get analytics data
 * @access   Private (admin)
 */
router.get('/analytics', requireAdmin, async (req: express.Request, res: express.Response) => {
  try {
    const { period = '30' } = req.query;
    
    // Sales over time
    const salesQuery = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as orders,
        COALESCE(SUM(total), 0) as revenue
      FROM orders 
      WHERE created_at >= NOW() - INTERVAL '${period} days'
      GROUP BY DATE(created_at)
      ORDER BY date
    `;
    
    const salesResult = await db.query(salesQuery);
    
    // Top categories
    const categoriesQuery = `
      SELECT 
        p.category,
        COUNT(DISTINCT o.id) as orders,
        COALESCE(SUM(o.total), 0) as revenue
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      WHERE o.created_at >= NOW() - INTERVAL '${period} days'
      GROUP BY p.category
      ORDER BY revenue DESC
    `;
    
    const categoriesResult = await db.query(categoriesQuery);
    
    // User activity
    const activityQuery = `
      SELECT 
        activity_type,
        COUNT(*) as count
      FROM user_activity 
      WHERE created_at >= NOW() - INTERVAL '${period} days'
      GROUP BY activity_type
      ORDER BY count DESC
    `;
    
    const activityResult = await db.query(activityQuery);
    
    res.json({
      sales: salesResult.rows,
      categories: categoriesResult.rows,
      activity: activityResult.rows
    });

  } catch (error: any) {
    console.error('Analytics fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch analytics'
    });
  }
});

/**
 * @route   GET /api/admin/coupons
 * @desc    Get all coupons (admin view)
 * @access   Private (admin)
 */
router.get('/coupons', requireAdmin, async (req: express.Request, res: express.Response) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    const query = `
      SELECT *, 
             (SELECT COUNT(*) FROM coupons) as total
      FROM coupons 
      ORDER BY created_at DESC 
      LIMIT $1 OFFSET $2
    `;
    
    const result = await db.query(query, [parseInt(limit as string), offset]);
    const total = result.rows.length > 0 ? result.rows[0].total : 0;
    
    // Remove total from individual coupon objects
    const coupons = result.rows.map(({ total, ...coupon }) => coupon);
    
    res.json({
      coupons,
      total,
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    });
  } catch (error: any) {
    console.error('Coupons fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch coupons'
    });
  }
});

/**
 * @route   DELETE /api/admin/coupons/:id
 * @desc    Delete coupon
 * @access   Private (admin)
 */
router.delete('/coupons/:id', requireAdmin, async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    
    const query = 'DELETE FROM coupons WHERE id = $1';
    await db.query(query, [id]);
    
    res.json({
      message: 'Coupon deleted successfully'
    });
  } catch (error: any) {
    console.error('Coupon delete error:', error);
    res.status(500).json({
      error: 'Failed to delete coupon'
    });
  }
});

/**
 * @route   PUT /api/admin/orders/:id/status
 * @desc    Update order status
 * @access   Private (admin)
 */
router.put('/orders/:id/status', requireAdmin, async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Invalid status'
      });
    }
    
    const query = 'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2';
    await db.query(query, [status, id]);
    
    res.json({
      message: 'Order status updated successfully',
      status
    });
  } catch (error: any) {
    console.error('Order status update error:', error);
    res.status(500).json({
      error: 'Failed to update order status'
    });
  }
});

export default router;
