import ApiClient from './client';
import { getCart, clearCart } from "./cart";
import type { CartItem } from "./cart";

export interface ShippingAddress {
  email: string;
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}

export interface Order {
  id: string;
  user_id?: string;
  total: number;
  status: string;
  shipping_address: ShippingAddress;
  coupon_code?: string;
  created_at: string;
  updated_at?: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  size: string;
  quantity: number;
  price: number;
  product?: {
    id: string;
    name: string;
    image_url: string;
  };
}

export interface CreateOrderRequest {
  items: {
    product_id: string;
    size: string;
    quantity: number;
    price: number;
  }[];
  shipping_address: ShippingAddress;
  coupon_code?: string;
}

/**
 * Create a new order from cart items
 */
export async function createOrder(
  shippingInfo: ShippingAddress,
  couponCode?: string
): Promise<Order | null> {
  try {
    const cartItems = await getCart();

    if (cartItems.length === 0) {
      throw new Error("Cart is empty");
    }

    // Calculate total
    let subtotal = cartItems.reduce((sum, item) => {
      const price = item.product?.price || 0;
      return sum + price * item.quantity;
    }, 0);

    let discount = 0;
    if (couponCode) {
      const { applyCoupon } = await import("./cart");
      const result = await applyCoupon(couponCode, subtotal);
      discount = result.discount;
    }

    const total = subtotal - discount;

    // Prepare order items for backend
    const orderItems = cartItems.map((item) => ({
      product_id: item.product_id,
      size: item.size,
      quantity: item.quantity,
      price: item.product?.price || 0,
    }));

    const orderRequest: CreateOrderRequest = {
      items: orderItems,
      shipping_address: shippingInfo,
      coupon_code: couponCode,
    };

    console.log('[Orders API] Creating order with request:', orderRequest);

    const response = await ApiClient.post<{ order: Order }>(
      '/orders',
      orderRequest,
      true // Include auth token
    );

    console.log('[Orders API] Order created successfully:', response.order);

    // Clear cart after successful order creation
    await clearCart();

    return response.order;
  } catch (error) {
    console.error('[Orders API] Error creating order:', error);
    return null;
  }
}

/**
 * Get user's orders
 */
export async function getUserOrders(): Promise<Order[]> {
  try {
    const response = await ApiClient.get<{ orders: Order[] }>('/orders', true);
    return response.orders;
  } catch (error) {
    console.error('[Orders API] Error fetching user orders:', error);
    return [];
  }
}

/**
 * Get order by ID
 */
export async function getOrder(orderId: string): Promise<Order | null> {
  try {
    const response = await ApiClient.get<{ order: Order }>(`/orders/${orderId}`, true);
    return response.order;
  } catch (error) {
    console.error('[Orders API] Error fetching order:', error);
    return null;
  }
}

/**
 * Get order items
 */
export async function getOrderItems(orderId: string): Promise<OrderItem[]> {
  try {
    const order = await getOrder(orderId);
    return order?.items || [];
  } catch (error) {
    console.error('[Orders API] Error fetching order items:', error);
    return [];
  }
}

/**
 * Cancel order
 */
export async function cancelOrder(orderId: string): Promise<boolean> {
  try {
    await ApiClient.put(`/orders/${orderId}/cancel`, {}, true);
    return true;
  } catch (error) {
    console.error('[Orders API] Error cancelling order:', error);
    return false;
  }
}

/**
 * Get order status
 */
export async function getOrderStatus(orderId: string): Promise<string | null> {
  try {
    const order = await getOrder(orderId);
    return order?.status || null;
  } catch (error) {
    console.error('[Orders API] Error fetching order status:', error);
    return null;
  }
}
