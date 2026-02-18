import express from 'express';
import { db } from '../utils/database';
import { validate, orderSchema } from '../utils/validation';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

/**
 * @route   GET /api/orders
 * @desc    Get user's orders
 * @access   Private
 */
router.get('/', authenticateToken, async (req: express.Request, res: express.Response) => {
  try {
    const userId = req.user?.userId;
    
    const query = `
      SELECT 
        o.*,
        COUNT(oi.id) as item_count
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.user_id = $1
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `;
    
    const result = await db.query(query, [userId]);
    
    res.json({
      orders: result.rows
    });

  } catch (error: any) {
    console.error('Orders fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch orders'
    });
  }
});

/**
 * @route   GET /api/orders/:id
 * @desc    Get order details
 * @access   Private
 */
router.get('/:id', authenticateToken, async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    
    // Get order details
    const orderQuery = `
      SELECT * FROM orders 
      WHERE id = $1 AND user_id = $2
    `;
    const orderResult = await db.query(orderQuery, [id, userId]);
    
    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Order not found'
      });
    }
    
    // Get order items
    const itemsQuery = `
      SELECT 
        oi.*,
        p.name as product_name,
        p.image_url as product_image,
        p.category as product_category
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = $1
    `;
    const itemsResult = await db.query(itemsQuery, [id]);
    
    res.json({
      order: orderResult.rows[0],
      items: itemsResult.rows
    });

  } catch (error: any) {
    console.error('Order fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch order'
    });
  }
});

/**
 * @route   POST /api/orders
 * @desc    Create new order
 * @access   Private
 */
router.post('/', validate(orderSchema), authenticateToken, async (req: express.Request, res: express.Response) => {
  try {
    const { items, shipping_address, coupon_code } = req.body;
    const userId = req.user?.userId;
    
    // Calculate total
    let subtotal = 0;
    for (const item of items) {
      subtotal += item.price * item.quantity;
    }
    
    // Apply coupon if provided
    let discount = 0;
    let coupon = null;
    
    if (coupon_code) {
      const couponQuery = `
        SELECT * FROM coupons 
        WHERE code = $1 
        AND valid_from <= NOW() 
        AND (valid_until IS NULL OR valid_until >= NOW())
        AND (usage_limit IS NULL OR used_count < usage_limit)
      `;
      const couponResult = await db.query(couponQuery, [coupon_code.toUpperCase()]);
      
      if (couponResult.rows.length > 0) {
        coupon = couponResult.rows[0];
        
        // Check minimum purchase
        if (!coupon.min_purchase || subtotal >= coupon.min_purchase) {
          if (coupon.discount_type === 'percentage') {
            discount = (subtotal * coupon.discount_value) / 100;
            if (coupon.max_discount) {
              discount = Math.min(discount, coupon.max_discount);
            }
          } else {
            discount = coupon.discount_value;
          }
          
          // Update coupon usage count
          await db.query(
            'UPDATE coupons SET used_count = used_count + 1 WHERE id = $1',
            [coupon.id]
          );
        }
      }
    }
    
    const total = Math.max(0, subtotal - discount);
    
    // Create order
    const orderId = require('uuid').v4();
    const orderQuery = `
      INSERT INTO orders (id, user_id, session_id, total, status, shipping_address, coupon_code)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const orderResult = await db.query(orderQuery, [
      orderId,
      userId || null,
      `session_${Date.now()}`,
      total,
      'pending',
      JSON.stringify(shipping_address),
      coupon_code
    ]);
    
    // Create order items
    for (const item of items) {
      const itemQuery = `
        INSERT INTO order_items (order_id, product_id, size, quantity, price)
        VALUES ($1, $2, $3, $4, $5)
      `;
      await db.query(itemQuery, [orderId, item.product_id, item.size, item.quantity, item.price]);
      
      // Update product stock
      await db.query(
        'UPDATE products SET stock = stock - $1 WHERE id = $2',
        [item.quantity, item.product_id]
      );
    }
    
    // Clear cart
    await db.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);
    
    // Track activity
    await trackActivity(userId, 'purchase', null, {
      order_id: orderId,
      total,
      item_count: items.length
    });
    
    res.status(201).json({
      message: 'Order created successfully',
      order: orderResult.rows[0],
      total,
      discount,
      coupon
    });

  } catch (error: any) {
    console.error('Order creation error:', error);
    res.status(500).json({
      error: 'Failed to create order'
    });
  }
});

/**
 * @route   PUT /api/orders/:id/cancel
 * @desc    Cancel order
 * @access   Private
 */
router.put('/:id/cancel', authenticateToken, async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    
    // Check if order exists and can be cancelled
    const orderQuery = `
      SELECT * FROM orders 
      WHERE id = $1 AND user_id = $2 AND status = 'pending'
    `;
    const orderResult = await db.query(orderQuery, [id, userId]);
    
    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Order not found or cannot be cancelled'
      });
    }
    
    // Get order items to restore stock
    const itemsQuery = `
      SELECT product_id, quantity FROM order_items WHERE order_id = $1
    `;
    const itemsResult = await db.query(itemsQuery, [id]);
    
    // Restore product stock
    for (const item of itemsResult.rows) {
      await db.query(
        'UPDATE products SET stock = stock + $1 WHERE id = $2',
        [item.quantity, item.product_id]
      );
    }
    
    // Update order status
    await db.query(
      'UPDATE orders SET status = $1 WHERE id = $2',
      ['cancelled', id]
    );
    
    res.json({
      message: 'Order cancelled successfully'
    });

  } catch (error: any) {
    console.error('Order cancellation error:', error);
    res.status(500).json({
      error: 'Failed to cancel order'
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
