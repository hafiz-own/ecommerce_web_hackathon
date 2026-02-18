import { supabase } from "@/lib/supabase";
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
  session_id: string;
  user_id?: string;
  total: number;
  status: string;
  shipping_address: ShippingAddress;
  coupon_code?: string;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  size: string;
  quantity: number;
  price: number;
}

/**
 * Create a new order from cart items
 */
export async function createOrder(
  shippingInfo: ShippingAddress,
  couponCode?: string
): Promise<Order | null> {
  if (!supabase) {
    console.warn("[Orders API] Supabase client not initialized");
    return null;
  }

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
  const sessionId = localStorage.getItem("cart_session_id") || "";

  // Create order
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      session_id: sessionId,
      total,
      status: "pending",
      shipping_address: shippingInfo,
      coupon_code: couponCode,
    })
    .select()
    .single();

  if (orderError || !order) {
    console.error("[Orders API] Error creating order:", orderError);
    return null;
  }

  // Create order items
  const orderItems = cartItems.map((item) => ({
    order_id: order.id,
    product_id: item.product_id,
    size: item.size,
    quantity: item.quantity,
    price: item.product?.price || 0,
  }));

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(orderItems);

  if (itemsError) {
    console.error("[Orders API] Error creating order items:", itemsError);
    // Order was created but items failed - this is a problem
    // In production, you'd want to rollback the order
    return null;
  }

  // Increment coupon usage if applicable
  if (couponCode) {
    const { data: coupon } = await supabase
      .from("coupons")
      .select("used_count")
      .eq("code", couponCode.toUpperCase())
      .single();
    
    if (coupon) {
      await supabase
        .from("coupons")
        .update({ used_count: coupon.used_count + 1 })
        .eq("code", couponCode.toUpperCase());
    }
  }

  // Clear cart
  await clearCart();

  // Log purchase activity
  if (supabase) {
    for (const item of cartItems) {
      try {
        const { error } = await supabase.from("user_activity").insert({
          session_id: sessionId,
          activity_type: "purchase",
          product_id: item.product_id,
          metadata: { order_id: order.id },
        });
        if (error) {
          console.warn("[Orders API] Failed to log activity:", error);
        }
      } catch (error) {
        // Ignore errors - activity logging is not critical
        console.warn("[Orders API] Activity logging error:", error);
      }
    }
  }

  return order;
}

/**
 * Get order by ID
 */
export async function getOrder(orderId: string): Promise<Order | null> {
  if (!supabase) {
    console.warn("[Orders API] Supabase client not initialized");
    return null;
  }

  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (error) {
    console.error("[Orders API] Error fetching order:", error);
    return null;
  }

  return data;
}

/**
 * Get order items
 */
export async function getOrderItems(orderId: string): Promise<OrderItem[]> {
  if (!supabase) {
    console.warn("[Orders API] Supabase client not initialized");
    return [];
  }

  const { data, error } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", orderId);

  if (error) {
    console.error("[Orders API] Error fetching order items:", error);
    return [];
  }

  return data || [];
}
