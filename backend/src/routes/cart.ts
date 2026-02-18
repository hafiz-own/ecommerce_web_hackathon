import express from 'express';
import { db } from '../utils/database';
import { validate, cartItemSchema } from '../utils/validation';
import { optionalAuth } from '../middleware/auth';

const router = express.Router();

/**
 * Generate session ID for guest users
 */
function getSessionId(req: express.Request): string {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // Authenticated user - use user ID as session
    return `user_${(req as any).user?.userId}`;
  }
  
  // Guest user - use session ID from header or generate new one
  const sessionId = req.headers['x-session-id'] as string;
  if (sessionId) {
    return sessionId;
  }
  
  return `guest_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

async function handleDelete(req: express.Request, res: express.Response) {
  try {
    const { id } = req.params;
    const sessionId = getSessionId(req);
    
    const query = `
      DELETE FROM cart_items 
      WHERE id = $1 AND session_id = $2
      RETURNING *
    `;
    
    const result = await db.query(query, [id, sessionId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Cart item not found'
      });
    }

    return res.json({
      message: 'Item removed from cart',
      item: result.rows[0]
    });

  } catch (error: any) {
    console.error('Cart delete error:', error);
    return res.status(500).json({
      error: 'Failed to remove cart item'
    });
  }
}

/**
 * @route   GET /api/cart
 * @desc    Get cart items for current session/user
 * @access   Public (with optional auth)
 */
router.get('/', optionalAuth, async (req: express.Request, res: express.Response) => {
  try {
    const sessionId = getSessionId(req);
    
    const query = `
      SELECT 
        ci.*,
        p.name as product_name,
        p.price as product_price,
        p.image_url as product_image,
        p.category as product_category,
        p.stock as product_stock
      FROM cart_items ci
      LEFT JOIN products p ON ci.product_id = p.id
      WHERE ci.session_id = $1
      ORDER BY ci.created_at DESC
    `;
    
    const result = await db.query(query, [sessionId]);
    
    // Calculate totals
    let subtotal = 0;
    const items = result.rows.map(item => {
      const itemTotal = parseFloat(item.product_price) * item.quantity;
      subtotal += itemTotal;
      
      return {
        id: item.id,
        product_id: item.product_id,
        product: {
          id: item.product_id,
          name: item.product_name,
          price: parseFloat(item.product_price),
          image_url: item.product_image,
          category: item.product_category,
          stock: item.product_stock
        },
        size: item.size,
        quantity: item.quantity,
        total: itemTotal
      };
    });

    res.json({
      items,
      subtotal: parseFloat(subtotal.toFixed(2)),
      count: items.reduce((sum, item) => sum + item.quantity, 0)
    });

  } catch (error: any) {
    console.error('Cart fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch cart'
    });
  }
});

/**
 * @route   POST /api/cart
 * @desc    Add item to cart
 * @access   Public (with optional auth)
 */
router.post('/', validate(cartItemSchema), optionalAuth, async (req: express.Request, res: express.Response) => {
  try {
    const { product_id, size, quantity } = req.body;
    const sessionId = getSessionId(req);
    
    // Check if product exists and has stock
    const productQuery = 'SELECT * FROM products WHERE id = $1';
    const productResult = await db.query(productQuery, [product_id]);
    
    if (productResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Product not found'
      });
    }
    
    const product = productResult.rows[0];
    
    // Check if item already exists in cart
    const existingQuery = `
      SELECT * FROM cart_items 
      WHERE session_id = $1 AND product_id = $2 AND size = $3
    `;
    const existingResult = await db.query(existingQuery, [sessionId, product_id, size]);
    
    if (existingResult.rows.length > 0) {
      // Update quantity
      const updateQuery = `
        UPDATE cart_items 
        SET quantity = quantity + $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `;
      
      const updateResult = await db.query(updateQuery, [quantity, existingResult.rows[0].id]);
      
      // Track activity
      if (req.user) {
        await trackActivity((req as any).user?.userId, 'add_to_cart', product_id, {
          quantity,
          size,
          total_quantity: existingResult.rows[0].quantity + quantity
        });
      }
      
      return res.json({
        message: 'Cart item updated',
        item: updateResult.rows[0]
      });
    }
    
    // Add new cart item
    const insertQuery = `
      INSERT INTO cart_items (session_id, user_id, product_id, size, quantity)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const insertResult = await db.query(insertQuery, [
      sessionId,
      (req as any).user?.userId || null,
      product_id,
      size,
      quantity
    ]);
    
    // Track activity
    if (req.user) {
      await trackActivity((req as any).user?.userId, 'add_to_cart', product_id, {
        quantity,
        size
      });
    }
    
    res.status(201).json({
      message: 'Item added to cart',
      item: insertResult.rows[0]
    });

  } catch (error: any) {
    console.error('Cart add error:', error);
    res.status(500).json({
      error: 'Failed to add item to cart'
    });
  }
});

/**
 * @route   PUT /api/cart/:id
 * @desc    Update cart item quantity
 * @access   Public (with optional auth)
 */
router.put('/:id', optionalAuth, async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;
    const sessionId = getSessionId(req);
    
    if (quantity <= 0) {
      // Remove item if quantity is 0 or less
      return handleDelete(req, res);
    }
    
    const query = `
      UPDATE cart_items 
      SET quantity = $1, updated_at = NOW()
      WHERE id = $2 AND session_id = $3
      RETURNING *
    `;
    
    const result = await db.query(query, [quantity, id, sessionId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Cart item not found'
      });
    }

    res.json({
      message: 'Cart item updated',
      item: result.rows[0]
    });

  } catch (error: any) {
    console.error('Cart update error:', error);
    res.status(500).json({
      error: 'Failed to update cart item'
    });
  }
});

/**
 * @route   DELETE /api/cart/:id
 * @desc    Remove item from cart
 * @access   Public (with optional auth)
 */
router.delete('/:id', optionalAuth, async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const sessionId = getSessionId(req);
    
    const query = `
      DELETE FROM cart_items 
      WHERE id = $1 AND session_id = $2
      RETURNING *
    `;
    
    const result = await db.query(query, [id, sessionId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Cart item not found'
      });
    }

    res.json({
      message: 'Item removed from cart',
      item: result.rows[0]
    });

  } catch (error: any) {
    console.error('Cart delete error:', error);
    res.status(500).json({
      error: 'Failed to remove cart item'
    });
  }
});

/**
 * @route   DELETE /api/cart
 * @desc    Clear entire cart
 * @access   Public (with optional auth)
 */
router.delete('/', optionalAuth, async (req: express.Request, res: express.Response) => {
  try {
    const sessionId = getSessionId(req);
    
    const query = 'DELETE FROM cart_items WHERE session_id = $1';
    await db.query(query, [sessionId]);

    res.json({
      message: 'Cart cleared successfully'
    });

  } catch (error: any) {
    console.error('Cart clear error:', error);
    res.status(500).json({
      error: 'Failed to clear cart'
    });
  }
});

/**
 * @route   POST /api/cart/apply-coupon
 * @desc    Apply coupon code to cart
 * @access   Public
 */
router.post('/apply-coupon', async (req: express.Request, res: express.Response) => {
  try {
    const { code, cart_total } = req.body;
    const sessionId = getSessionId(req);
    
    if (!code) {
      return res.status(400).json({
        error: 'Coupon code is required'
      });
    }

    // Find coupon in database
    const couponQuery = `
      SELECT * FROM coupons 
      WHERE code = $1 
      AND valid_from <= NOW() 
      AND (valid_until IS NULL OR valid_until >= NOW())
      AND (usage_limit IS NULL OR used_count < usage_limit)
    `;
    
    const couponResult = await db.query(couponQuery, [code.toUpperCase()]);
    
    if (couponResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Invalid or expired coupon',
        coupon: null,
        discount: 0
      });
    }

    const coupon = couponResult.rows[0];

    // Enforce session binding for AI-generated coupons
    if (coupon.created_by_agent && coupon.session_id && coupon.session_id !== sessionId) {
      return res.status(403).json({
        error: 'This coupon is not valid for your session',
        coupon: null,
        discount: 0
      });
    }

    let discount = 0;

    // Check minimum purchase requirement
    if (cart_total && (!coupon.min_purchase || cart_total >= coupon.min_purchase)) {
      if (coupon.discount_type === 'percentage') {
        discount = (cart_total * coupon.discount_value) / 100;
        if (coupon.max_discount) {
          discount = Math.min(discount, coupon.max_discount);
        }
      } else {
        discount = coupon.discount_value;
      }
    } else if (cart_total && coupon.min_purchase && cart_total < coupon.min_purchase) {
      return res.status(400).json({
        error: `Minimum purchase of $${coupon.min_purchase} required`,
        coupon: null,
        discount: 0
      });
    }

    res.json({
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        min_purchase: coupon.min_purchase,
        max_discount: coupon.max_discount
      },
      discount
    });

  } catch (error: any) {
    console.error('Coupon apply error:', error);
    res.status(500).json({
      error: 'Failed to apply coupon',
      coupon: null,
      discount: 0
    });
  }
});

/**
 * Helper function to track user activity
 */
async function trackActivity(userId: string, activityType: string, productId?: string, metadata?: any) {
  const query = `
    INSERT INTO user_activity (user_id, session_id, activity_type, product_id, metadata)
    VALUES ($1, $2, $3, $4, $5)
  `;
  
  await db.query(query, [
    userId,
    `session_${Date.now()}`,
    activityType,
    productId || null,
    JSON.stringify(metadata || {})
  ]);
}

export default router;
