import ApiClient from './client';
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
  try {
    const response = await ApiClient.post<{ product: Product }>(
      '/admin/products',
      data,
      true // Include auth token
    );
    return response.product;
  } catch (error) {
    console.error('[Admin API] Error creating product:', error);
    return null;
  }
}

/**
 * Update a product
 */
export async function updateProduct(id: string, data: Partial<ProductFormData>): Promise<Product | null> {
  try {
    const response = await ApiClient.put<{ product: Product }>(
      `/admin/products/${id}`,
      data,
      true // Include auth token
    );
    return response.product;
  } catch (error) {
    console.error('[Admin API] Error updating product:', error);
    return null;
  }
}

/**
 * Delete a product
 */
export async function deleteProduct(id: string): Promise<boolean> {
  try {
    await ApiClient.delete(`/admin/products/${id}`, true);
    return true;
  } catch (error) {
    console.error('[Admin API] Error deleting product:', error);
    return false;
  }
}

/**
 * Get all products (admin view)
 */
export async function getAdminProducts(
  page: number = 1,
  limit: number = 20,
  search?: string
): Promise<{ products: Product[]; total: number }> {
  try {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    if (search) params.append('search', search);

    const endpoint = `/admin/products?${params.toString()}`;
    const response = await ApiClient.get<{ products: Product[]; total: number }>(endpoint, true);
    return response;
  } catch (error) {
    console.error('[Admin API] Error fetching admin products:', error);
    return { products: [], total: 0 };
  }
}

// ==================== ORDERS ====================

export interface Order {
  id: string;
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

export interface OrderWithItems extends Order {
  items: OrderItem[];
}

/**
 * Get all orders (admin view)
 */
export async function getAdminOrders(
  page: number = 1,
  limit: number = 20,
  status?: string
): Promise<{ orders: OrderWithItems[]; total: number }> {
  try {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    if (status) params.append('status', status);

    const endpoint = `/admin/orders?${params.toString()}`;
    const response = await ApiClient.get<{ orders: OrderWithItems[]; total: number }>(endpoint, true);
    return response;
  } catch (error) {
    console.error('[Admin API] Error fetching admin orders:', error);
    return { orders: [], total: 0 };
  }
}

/**
 * Update order status
 */
export async function updateOrderStatus(orderId: string, status: string): Promise<boolean> {
  try {
    await ApiClient.put(`/admin/orders/${orderId}/status`, { status }, true);
    return true;
  } catch (error) {
    console.error('[Admin API] Error updating order status:', error);
    return false;
  }
}

// ==================== COUPONS ====================

export interface Coupon {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_purchase?: number;
  max_discount?: number;
  usage_limit?: number;
  used_count: number;
  valid_from: string;
  valid_until?: string;
  created_by_agent?: boolean;
  reason?: string;
  session_id?: string;
  created_at: string;
  updated_at?: string;
}

export interface CouponFormData {
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_purchase?: number;
  max_discount?: number;
  usage_limit?: number;
  valid_from: string;
  valid_until?: string;
  reason?: string;
}

/**
 * Get all coupons
 */
export async function getAdminCoupons(
  page: number = 1,
  limit: number = 20
): Promise<{ coupons: Coupon[]; total: number }> {
  try {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    const endpoint = `/admin/coupons?${params.toString()}`;
    const response = await ApiClient.get<{ coupons: Coupon[]; total: number }>(endpoint, true);
    return response;
  } catch (error) {
    console.error('[Admin API] Error fetching coupons:', error);
    return { coupons: [], total: 0 };
  }
}

/**
 * Create a new coupon
 */
export async function createCoupon(data: CouponFormData): Promise<Coupon | null> {
  try {
    const response = await ApiClient.post<{ coupon: Coupon }>(
      '/admin/coupons',
      data,
      true // Include auth token
    );
    return response.coupon;
  } catch (error) {
    console.error('[Admin API] Error creating coupon:', error);
    return null;
  }
}

/**
 * Delete a coupon
 */
export async function deleteCoupon(id: string): Promise<boolean> {
  try {
    await ApiClient.delete(`/admin/coupons/${id}`, true);
    return true;
  } catch (error) {
    console.error('[Admin API] Error deleting coupon:', error);
    return false;
  }
}

// ==================== DASHBOARD ====================

export interface DashboardStats {
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  activeCoupons: number;
  recentOrders: Order[];
  topProducts: {
    product: Product;
    sales: number;
  }[];
}

/**
 * Get dashboard statistics
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const response = await ApiClient.get<DashboardStats>('/admin/dashboard', true);
    return response;
  } catch (error) {
    console.error('[Admin API] Error fetching dashboard stats:', error);
    return {
      totalProducts: 0,
      totalOrders: 0,
      totalRevenue: 0,
      activeCoupons: 0,
      recentOrders: [],
      topProducts: []
    };
  }
}

// ==================== ANALYTICS ====================

export interface AnalyticsData {
  sales: {
    date: string;
    revenue: number;
    orders: number;
  }[];
  topProducts: {
    product_id: string;
    name: string;
    sales: number;
    revenue: number;
  }[];
  categories: {
    category: string;
    sales: number;
    revenue: number;
  }[];
}

/**
 * Get analytics data
 */
export async function getAnalytics(period: string = '30'): Promise<AnalyticsData | null> {
  try {
    const response = await ApiClient.get<AnalyticsData>(`/admin/analytics?period=${period}`, true);
    return response;
  } catch (error) {
    console.error('[Admin API] Error fetching analytics:', error);
    return null;
  }
}

/**
 * Get product categories
 */
export async function getCategories(): Promise<string[]> {
  try {
    const response = await ApiClient.get<{ categories: { category: string; count: number }[] }>('/products/categories', false);
    return response.categories.map(cat => cat.category);
  } catch (error) {
    console.error('[Admin API] Error fetching categories:', error);
    return [];
  }
}

/**
 * Upload product image
 */
export async function uploadProductImage(file: File): Promise<{ url: string }> {
  try {
    const formData = new FormData();
    formData.append('image', file);
    
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    const response = await fetch(`${apiBase}/admin/products/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      },
      body: formData
    });
    
    if (!response.ok) {
      throw new Error('Image upload failed');
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('[Admin API] Error uploading image:', error);
    throw error;
  }
}

/**
 * Regenerate vector embeddings/metadata files
 */
export async function reindexEmbeddings(): Promise<{ success: boolean; count: number; message: string } | null> {
  try {
    const response = await ApiClient.post<{ success: boolean; count: number; message: string }>(
      '/admin/reindex-embeddings',
      {},
      true
    );
    return response;
  } catch (error) {
    console.error('[Admin API] Error reindexing embeddings:', error);
    return null;
  }
}
