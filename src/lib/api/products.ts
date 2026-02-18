import ApiClient from './client';

export interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string;
  category: string;
  description: string;
  sizes: string[];
  colors?: string[];
  stock: number;
  tags?: string[];
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface ProductFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  tags?: string[];
}

export interface ProductSort {
  field: "price" | "name" | "created_at";
  order: "asc" | "desc";
}

/**
 * Get all products with optional filters and sorting
 */
export async function getProducts(
  filters?: ProductFilters,
  sort?: ProductSort
): Promise<Product[]> {
  const params = new URLSearchParams();
  
  if (filters?.category) params.append('category', filters.category);
  if (filters?.minPrice) params.append('minPrice', filters.minPrice.toString());
  if (filters?.maxPrice) params.append('maxPrice', filters.maxPrice.toString());
  if (filters?.inStock) params.append('inStock', 'true');
  if (filters?.tags) filters.tags.forEach(tag => params.append('tags', tag));
  
  if (sort) params.append('sort', `${sort.field}_${sort.order}`);
  
  const endpoint = `/products${params.toString() ? `?${params.toString()}` : ''}`;
  console.log('[Products API] Fetching from endpoint:', endpoint);
  
  const response = await ApiClient.get<{ products: Product[] }>(endpoint);
  console.log('[Products API] Response received:', response.products.length, 'products');
  return response.products;
}

/**
 * Get a single product by ID
 */
export async function getProductById(id: string): Promise<Product | null> {
  try {
    return await ApiClient.get<Product>(`/products/${id}`);
  } catch (error) {
    console.error('[Products API] Error fetching product:', error);
    return null;
  }
}

/**
 * Get products by category
 */
export async function getProductsByCategory(
  category: string
): Promise<Product[]> {
  return getProducts({ category });
}

/**
 * Semantic search using our lightweight vector search
 */
export async function searchProductsSemantic(
  query: string,
  limit: number = 10
): Promise<Product[]> {
  try {
    const response = await ApiClient.get<{ products: Product[] }>(
      `/products/search?q=${encodeURIComponent(query)}&limit=${limit}`
    );
    return response.products;
  } catch (error) {
    console.error('[Products API] Error in semantic search:', error);
    return [];
  }
}

/**
 * Get recommended products based on user activity
 */
export async function getRecommendedProducts(
  sessionId: string,
  limit: number = 4
): Promise<Product[]> {
  try {
    // For now, return newest products as recommendations
    const response = await ApiClient.get<{ products: Product[] }>(
      `/products?limit=${limit}&sort=created_at_desc`
    );
    return response.products;
  } catch (error) {
    console.error('[Products API] Error fetching recommendations:', error);
    return [];
  }
}

/**
 * Get dynamic recommendations based on user search history
 */
export async function getRecommendedProductsDynamic(
  sessionId: string,
  limit: number = 4
): Promise<Product[]> {
  try {
    const response = await ApiClient.get<{ products: Product[] }>(
      `/recommendations?limit=${limit}`
    );
    return response.products;
  } catch (error) {
    console.warn("[Products API] Recommendations endpoint failed, falling back to newest:", error);
    try {
      const response = await ApiClient.get<{ products: Product[] }>(
        `/products?limit=${limit}&sort=created_at_desc`
      );
      return response.products;
    } catch (e) {
      console.error("[Products API] Fallback recommendations failed:", e);
      return [];
    }
  }
}

/**
 * User search history entry
 */
interface SearchHistoryEntry {
  query: string;
  category?: string;
  keywords?: string[];
  timestamp: number;
}

/**
 * Add a search entry to user's search history
 */
export function addToSearchHistory(
  query: string,
  category?: string,
  keywords?: string[]
): void {
  try {
    const stored = localStorage.getItem("user_search_history");
    let history: SearchHistoryEntry[] = stored ? JSON.parse(stored) : [];
    
    // Add new entry
    history.push({
      query,
      category,
      keywords,
      timestamp: Date.now(),
    });
    
    // Keep only last 20 searches
    if (history.length > 20) {
      history = history.slice(-20);
    }
    
    localStorage.setItem("user_search_history", JSON.stringify(history));
    
    // Dispatch custom event for same-window listeners
    window.dispatchEvent(new Event("searchHistoryUpdated"));
  } catch (e) {
    console.warn("[Products API] Could not save search history:", e);
  }
}

/**
 * Clear user's search history
 */
export function clearSearchHistory(): void {
  try {
    localStorage.removeItem("user_search_history");
    window.dispatchEvent(new Event("searchHistoryUpdated"));
  } catch (e) {
    console.warn("[Products API] Could not clear search history:", e);
  }
}

/**
 * Check inventory for a specific product variant
 */
export async function checkInventory(
  productId: string,
  size?: string,
  color?: string
): Promise<{ available: boolean; stock: number; product: Product | null }> {
  const product = await getProductById(productId);

  if (!product) {
    return { available: false, stock: 0, product: null };
  }

  // For now, we'll check overall stock
  // In a real system, you'd track stock per variant (size/color combination)
  return {
    available: product.stock > 0,
    stock: product.stock,
    product,
  };
}

/**
 * Get product counts per category
 */
export async function getCategoryCounts(): Promise<Record<string, number>> {
  try {
    const response = await ApiClient.get<{ categories: { category: string; count: number }[] }>(
      "/products/categories"
    );
    
    const counts: Record<string, number> = {};
    response.categories.forEach(cat => {
      counts[cat.category] = cat.count;
    });
    
    return counts;
  } catch (error) {
    console.error("[Products API] Error fetching category counts:", error);
    return {};
  }
}

/**
 * Get a single product by ID - works with our new backend
 */
export async function getProductByIdUniversal(id: string): Promise<Product | null> {
  return getProductById(id);
}
