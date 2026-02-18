import ApiClient from './client';
import type { Product } from "./products";

export interface CartItem {
  id: string;
  session_id: string;
  user_id?: string;
  product_id: string;
  size: string;
  quantity: number;
  product?: Product;
  created_at?: string;
  updated_at?: string;
}

export interface Coupon {
  id: string;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_purchase?: number;
  max_discount?: number;
  valid_from: string;
  valid_until: string;
  usage_limit?: number;
  used_count: number;
  created_by_agent: boolean;
  reason?: string;
}

/**
 * Get cart items for current session/user
 */
export async function getCart(): Promise<CartItem[]> {
  try {
    console.log('[Cart API] Fetching cart...');
    const response = await ApiClient.get<{ items: CartItem[]; subtotal: number; count: number }>('/cart', true);
    console.log('[Cart API] Cart response:', response);
    console.log('[Cart API] Cart items count:', response.items?.length || 0);
    console.log('[Cart API] Session ID:', response.items?.[0]?.session_id);
    return response.items.map(item => ({
      ...item,
      product: item.product || {
        id: item.product_id,
        name: 'Unknown Product',
        description: '',
        price: 0,
        image_url: '',
        category: 'Unknown',
        sizes: [],
        stock: 0,
        tags: [],
        metadata: {}
      }
    }));
  } catch (error) {
    console.error('[Cart API] Error fetching cart:', error);
    return [];
  }
}

/**
 * Add item to cart
 */
export async function addToCart(
  productId: string,
  size: string,
  quantity: number = 1
): Promise<CartItem | null> {
  try {
    console.log('[Cart API] Adding to cart:', { productId, size, quantity });
    const response = await ApiClient.post<{ item: CartItem }>(
      '/cart',
      { product_id: productId, size, quantity },
      true
    );
    console.log('[Cart API] Add to cart response:', response);
    return response.item;
  } catch (error) {
    console.error('[Cart API] Error adding to cart:', error);
    console.error('[Cart API] Error details:', error.message);
    return null;
  }
}

/**
 * Update cart item quantity
 */
export async function updateCartItem(
  itemId: string,
  quantity: number
): Promise<CartItem | null> {
  try {
    const response = await ApiClient.put<{ item: CartItem }>(
      `/cart/${itemId}`,
      { quantity },
      true
    );
    return response.item;
  } catch (error) {
    console.error('[Cart API] Error updating cart item:', error);
    return null;
  }
}

/**
 * Remove item from cart
 */
export async function removeCartItem(itemId: string): Promise<boolean> {
  try {
    await ApiClient.delete(`/cart/${itemId}`, true);
    return true;
  } catch (error) {
    console.error('[Cart API] Error removing cart item:', error);
    return false;
  }
}

/**
 * Clear entire cart
 */
export async function clearCart(): Promise<boolean> {
  try {
    await ApiClient.delete('/cart', true);
    return true;
  } catch (error) {
    console.error('[Cart API] Error clearing cart:', error);
    return false;
  }
}

/**
 * Validate and get coupon details
 */
export async function validateCoupon(code: string): Promise<Coupon | null> {
  try {
    const response = await ApiClient.post<{ coupon: Coupon; discount: number }>(
      '/cart/apply-coupon',
      { code }
    );
    return response.coupon;
  } catch (error) {
    console.error('[Cart API] Error validating coupon:', error);
    return null;
  }
}

/**
 * Apply coupon to cart
 */
export async function applyCoupon(
  code: string,
  cartTotal: number
): Promise<{ coupon: Coupon | null; discount: number; error?: string }> {
  try {
    const response = await ApiClient.post<{ coupon: Coupon; discount: number }>(
      '/cart/apply-coupon',
      { code, cart_total: cartTotal }
    );
    return {
      coupon: response.coupon,
      discount: response.discount
    };
  } catch (error: any) {
    console.error('[Cart API] Error applying coupon:', error);
    return {
      coupon: null,
      discount: 0,
      error: error.message || 'Failed to apply coupon'
    };
  }
}

/**
 * Calculate cart total
 */
export async function getCartTotal(couponCode?: string): Promise<{
  subtotal: number;
  discount: number;
  total: number;
  coupon?: Coupon;
}> {
  try {
    const response = await ApiClient.get<{ items: CartItem[]; subtotal: number; count: number }>('/cart', true);
    
    let discount = 0;
    let coupon: Coupon | undefined;
    
    if (couponCode) {
      const result = await applyCoupon(couponCode, response.subtotal);
      discount = result.discount;
      coupon = result.coupon || undefined;
    }

    return {
      subtotal: response.subtotal,
      discount,
      total: Math.max(0, response.subtotal - discount),
      coupon
    };
  } catch (error) {
    console.error('[Cart API] Error calculating cart total:', error);
    return {
      subtotal: 0,
      discount: 0,
      total: 0
    };
  }
}
