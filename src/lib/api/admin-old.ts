import { supabase } from "@/lib/supabase";
import type { Product } from "./products";

// ==================== PRODUCTS ====================

export interface ProductFormData {
  name: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
  sizes: string[];
  colors: string[];
  stock: number;
  tags: string[];
  metadata: Record<string, any>;
}

/**
 * Create a new product
 */
export async function createProduct(data: ProductFormData): Promise<Product | null> {
  if (!supabase) {
    console.warn("[Admin API] Supabase client not initialized");
    return null;
  }

  const { data: product, error } = await supabase
    .from("products")
    .insert({
      name: data.name,
      description: data.description,
      price: data.price,
      image_url: data.image_url,
      category: data.category,
      sizes: data.sizes,
      colors: data.colors,
      stock: data.stock,
      tags: data.tags,
      metadata: data.metadata,
    })
    .select()
    .single();

  if (error) {
    console.error("[Admin API] Error creating product:", error);
    throw new Error(error.message);
  }

  return product;
}

/**
 * Update a product
 */
export async function updateProduct(id: string, data: Partial<ProductFormData>): Promise<Product | null> {
  if (!supabase) {
    console.warn("[Admin API] Supabase client not initialized");
    return null;
  }

  const { data: product, error } = await supabase
    .from("products")
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[Admin API] Error updating product:", error);
    throw new Error(error.message);
  }

  return product;
}

/**
 * Delete a product
 */
export async function deleteProduct(id: string): Promise<boolean> {
  if (!supabase) {
    console.warn("[Admin API] Supabase client not initialized");
    return false;
  }

  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[Admin API] Error deleting product:", error);
    throw new Error(error.message);
  }

  return true;
}

/**
 * Get all products for admin (with pagination)
 */
export async function getAdminProducts(
  page: number = 1,
  limit: number = 20,
  search?: string
): Promise<{ products: Product[]; total: number }> {
  if (!supabase) {
    console.warn("[Admin API] Supabase client not initialized");
    return { products: [], total: 0 };
  }

  let query = supabase
    .from("products")
    .select("*", { count: "exact" });

  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,category.ilike.%${search}%`);
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (error) {
    console.error("[Admin API] Error fetching products:", error);
    return { products: [], total: 0 };
  }

  return {
    products: (data || []).map(p => ({
      ...p,
      sizes: p.sizes || [],
      colors: p.colors || [],
      tags: p.tags || [],
    })),
    total: count || 0,
  };
}

// ==================== ORDERS ====================

export interface OrderWithItems {
  id: string;
  session_id: string;
  user_id?: string;
  total: number;
  status: string;
  shipping_address: {
    email: string;
    firstName: string;
    lastName: string;
    address: string;
    city: string;
    state: string;
    zip: string;
  };
  coupon_code?: string;
  created_at: string;
  items: {
    id: string;
    product_id: string;
    size: string;
    quantity: number;
    price: number;
    product?: Product;
  }[];
}

/**
 * Get all orders for admin (with pagination)
 */
export async function getAdminOrders(
  page: number = 1,
  limit: number = 20,
  status?: string
): Promise<{ orders: OrderWithItems[]; total: number }> {
  if (!supabase) {
    console.warn("[Admin API] Supabase client not initialized");
    return { orders: [], total: 0 };
  }

  let query = supabase
    .from("orders")
    .select(`
      *,
      items:order_items(
        *,
        product:products(*)
      )
    `, { count: "exact" });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (error) {
    console.error("[Admin API] Error fetching orders:", error);
    return { orders: [], total: 0 };
  }

  return {
    orders: data || [],
    total: count || 0,
  };
}

/**
 * Update order status
 */
export async function updateOrderStatus(orderId: string, status: string): Promise<boolean> {
  if (!supabase) {
    console.warn("[Admin API] Supabase client not initialized");
    return false;
  }

  const { error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", orderId);

  if (error) {
    console.error("[Admin API] Error updating order status:", error);
    throw new Error(error.message);
  }

  return true;
}

// ==================== COUPONS ====================

export interface Coupon {
  id: string;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_purchase?: number;
  max_discount?: number;
  valid_from: string;
  valid_until?: string;
  usage_limit?: number;
  used_count: number;
  created_by_agent: boolean;
  reason?: string;
  created_at: string;
}

export interface CouponFormData {
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_purchase?: number;
  max_discount?: number;
  valid_from: string;
  valid_until?: string;
  usage_limit?: number;
  reason?: string;
}

/**
 * Get all coupons for admin
 */
export async function getAdminCoupons(
  page: number = 1,
  limit: number = 20
): Promise<{ coupons: Coupon[]; total: number }> {
  if (!supabase) {
    console.warn("[Admin API] Supabase client not initialized");
    return { coupons: [], total: 0 };
  }

  const { data, error, count } = await supabase
    .from("coupons")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (error) {
    console.error("[Admin API] Error fetching coupons:", error);
    return { coupons: [], total: 0 };
  }

  return {
    coupons: data || [],
    total: count || 0,
  };
}

/**
 * Create a new coupon
 */
export async function createCoupon(data: CouponFormData): Promise<Coupon | null> {
  if (!supabase) {
    console.warn("[Admin API] Supabase client not initialized");
    return null;
  }

  const { data: coupon, error } = await supabase
    .from("coupons")
    .insert({
      code: data.code.toUpperCase(),
      discount_type: data.discount_type,
      discount_value: data.discount_value,
      min_purchase: data.min_purchase,
      max_discount: data.max_discount,
      valid_from: data.valid_from,
      valid_until: data.valid_until,
      usage_limit: data.usage_limit,
      reason: data.reason,
      created_by_agent: false,
    })
    .select()
    .single();

  if (error) {
    console.error("[Admin API] Error creating coupon:", error);
    throw new Error(error.message);
  }

  return coupon;
}

/**
 * Delete a coupon
 */
export async function deleteCoupon(id: string): Promise<boolean> {
  if (!supabase) {
    console.warn("[Admin API] Supabase client not initialized");
    return false;
  }

  const { error } = await supabase
    .from("coupons")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[Admin API] Error deleting coupon:", error);
    throw new Error(error.message);
  }

  return true;
}

// ==================== DASHBOARD STATS ====================

export interface DashboardStats {
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  activeCoupons: number;
  recentOrders: OrderWithItems[];
  topProducts: { product: Product; sales: number }[];
}

/**
 * Get dashboard statistics
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  if (!supabase) {
    console.warn("[Admin API] Supabase client not initialized");
    return {
      totalProducts: 0,
      totalOrders: 0,
      totalRevenue: 0,
      pendingOrders: 0,
      activeCoupons: 0,
      recentOrders: [],
      topProducts: [],
    };
  }

  // Get product count
  const { count: productCount } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true });

  // Get order stats
  const { data: orders } = await supabase
    .from("orders")
    .select("total, status");

  const totalOrders = orders?.length || 0;
  const totalRevenue = orders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;
  const pendingOrders = orders?.filter(o => o.status === "pending").length || 0;

  // Get active coupons count
  const now = new Date().toISOString();
  const { count: couponCount } = await supabase
    .from("coupons")
    .select("*", { count: "exact", head: true })
    .lte("valid_from", now)
    .or(`valid_until.is.null,valid_until.gte.${now}`);

  // Get recent orders
  const { data: recentOrders } = await supabase
    .from("orders")
    .select(`
      *,
      items:order_items(
        *,
        product:products(*)
      )
    `)
    .order("created_at", { ascending: false })
    .limit(5);

  // Get top products by sales
  const { data: orderItems } = await supabase
    .from("order_items")
    .select(`
      product_id,
      quantity,
      product:products(*)
    `);

  const productSales: Record<string, { product: Product; sales: number }> = {};
  orderItems?.forEach(item => {
    if (item.product_id && item.product) {
      if (!productSales[item.product_id]) {
        productSales[item.product_id] = { product: item.product as Product, sales: 0 };
      }
      productSales[item.product_id].sales += item.quantity;
    }
  });

  const topProducts = Object.values(productSales)
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 5);

  return {
    totalProducts: productCount || 0,
    totalOrders,
    totalRevenue,
    pendingOrders,
    activeCoupons: couponCount || 0,
    recentOrders: recentOrders || [],
    topProducts,
  };
}

// ==================== IMAGE UPLOAD ====================

/**
 * Upload image to Supabase Storage
 */
export async function uploadProductImage(file: File): Promise<string | null> {
  if (!supabase) {
    console.warn("[Admin API] Supabase client not initialized");
    return null;
  }

  const fileExt = file.name.split(".").pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `products/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("product-images")
    .upload(filePath, file);

  if (uploadError) {
    console.error("[Admin API] Error uploading image:", uploadError);
    throw new Error(uploadError.message);
  }

  const { data } = supabase.storage
    .from("product-images")
    .getPublicUrl(filePath);

  return data.publicUrl;
}

/**
 * Delete image from Supabase Storage
 */
export async function deleteProductImage(imageUrl: string): Promise<boolean> {
  if (!supabase) {
    console.warn("[Admin API] Supabase client not initialized");
    return false;
  }

  // Extract file path from URL
  const urlParts = imageUrl.split("/product-images/");
  if (urlParts.length < 2) return false;

  const filePath = urlParts[1];

  const { error } = await supabase.storage
    .from("product-images")
    .remove([filePath]);

  if (error) {
    console.error("[Admin API] Error deleting image:", error);
    return false;
  }

  return true;
}

// ==================== CATEGORIES ====================

/**
 * Get all unique categories
 */
export async function getCategories(): Promise<string[]> {
  if (!supabase) {
    return ["Clothes", "Shoes", "Bags", "Accessories"];
  }

  const { data } = await supabase
    .from("products")
    .select("category")
    .order("category");

  if (!data) return ["Clothes", "Shoes", "Bags", "Accessories"];

  const categories = [...new Set(data.map(p => p.category))];
  return categories.length > 0 ? categories : ["Clothes", "Shoes", "Bags", "Accessories"];
}
