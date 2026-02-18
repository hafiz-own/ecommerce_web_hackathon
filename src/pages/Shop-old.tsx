import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { SlidersHorizontal, Loader2, Search, X } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useFilter } from "@/contexts/FilterContext";
import { getProducts, searchProductsSemantic, addToSearchHistory, type Product } from "@/lib/api/products";
import { toast } from "sonner";

const categories = ["All", "Clothes", "Shoes", "Bags", "Accessories"];

const Shop = () => {
  console.log('[Shop] Shop component starting...');
  
  try {
    const [searchParams] = useSearchParams();
    const { filters, setCategory, setSort, setSearchQuery } = useFilter();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState("All");
    const [localSearch, setLocalSearch] = useState("");

    console.log('[Shop] Shop component loaded successfully!');
    console.log('[Shop] Initial filters:', filters);
    
    // Test API directly
    fetch('http://localhost:3001/api/products?sort=created_at_desc')
      .then(response => response.json())
      .then(data => {
        console.log('[Shop] Direct API test - products count:', data.products?.length || 0);
        console.log('[Shop] Direct API test - first product:', data.products?.[0]?.name || 'None');
      })
      .catch(error => {
        console.error('[Shop] Direct API test - error:', error);
      });

  // Handle URL query params for category
  useEffect(() => {
    const categoryParam = searchParams.get("category");
    if (categoryParam && categories.includes(categoryParam)) {
      setCategory(categoryParam);
      setActiveCategory(categoryParam);
    }
  }, [searchParams, setCategory]);

  // Sync local category state with filter context
  useEffect(() => {
    if (filters.category) {
      setActiveCategory(filters.category);
    } else {
      setActiveCategory("All");
    }
  }, [filters.category]);
  
  // Show toast when filters change (triggered by the Clerk)
  useEffect(() => {
    if (filters.sortBy === "price") {
      toast.info(`Products sorted by price: ${filters.sortOrder === "asc" ? "Low to High" : "High to Low"}`);
    }
  }, [filters.sortBy, filters.sortOrder]);

  // Sync local search with filter context
  useEffect(() => {
    if (filters.searchQuery) {
      setLocalSearch(filters.searchQuery);
    }
  }, [filters.searchQuery]);

  // Fetch products based on filters
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        console.log("[Shop] Fetching products with filters:", filters);
        
        // If there's a search query, use semantic search
        if (filters.searchQuery && filters.searchQuery.trim()) {
          console.log("[Shop] Searching for:", filters.searchQuery);
          const searchResults = await searchProductsSemantic(filters.searchQuery, 20);
          console.log("[Shop] Search results:", searchResults.length);
          
          // Apply additional filters (category, price) to search results
          let filteredResults = searchResults;
          
          if (filters.category && filters.category !== "All") {
            filteredResults = filteredResults.filter(p => p.category === filters.category);
          }
          if (filters.minPrice !== null) {
            filteredResults = filteredResults.filter(p => p.price >= filters.minPrice!);
          }
          if (filters.maxPrice !== null) {
            filteredResults = filteredResults.filter(p => p.price <= filters.maxPrice!);
          }
          
          // Apply sorting
          if (filters.sortBy === "price") {
            filteredResults.sort((a, b) => 
              filters.sortOrder === "asc" ? a.price - b.price : b.price - a.price
            );
          } else if (filters.sortBy === "name") {
            filteredResults.sort((a, b) => 
              filters.sortOrder === "asc" 
                ? a.name.localeCompare(b.name) 
                : b.name.localeCompare(a.name)
            );
          }
          
          console.log("[Shop] Final filtered search results:", filteredResults.length);
          setProducts(filteredResults);
          return;
        }
        
        // Otherwise use regular filtering
        const productFilters: any = {};
        if (filters.category && filters.category !== "All") {
          productFilters.category = filters.category;
        }
        if (filters.minPrice !== null) {
          productFilters.minPrice = filters.minPrice;
        }
        if (filters.maxPrice !== null) {
          productFilters.maxPrice = filters.maxPrice;
        }

        const sortField =
          filters.sortBy === "default" ? "created_at" : filters.sortBy;
        const productsData = await getProducts(productFilters, {
          field: sortField as any,
          order: filters.sortOrder,
        });

        console.log("[Shop] Products data received:", productsData.length);
        setProducts(productsData);
      } catch (error) {
        console.error("[Shop] Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [filters]);

  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat);
    if (cat === "All") {
      setCategory(null);
    } else {
      setCategory(cat);
    }
  };

  const handleSortChange = (value: string) => {
    if (value === "low") {
      setSort("price", "asc");
    } else if (value === "high") {
      setSort("price", "desc");
    } else if (value === "name") {
      setSort("name", "asc");
    } else {
      setSort("created_at", "desc");
    }
  };

  const getSortValue = () => {
    if (filters.sortBy === "price" && filters.sortOrder === "asc") return "low";
    if (filters.sortBy === "price" && filters.sortOrder === "desc") return "high";
    if (filters.sortBy === "name") return "name";
    return "default";
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-28 pb-12 px-4 sm:px-6 lg:px-12 max-w-[1440px] mx-auto">
        {/* Header */}
        <div className="mb-10">
          <h1 className="font-display font-bold text-foreground" style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)" }}>
            {filters.searchQuery ? `Results for "${filters.searchQuery}"` : "Shop All"}
          </h1>
          <p className="font-body text-muted-foreground mt-2">
            {filters.searchQuery 
              ? `Found ${products.length} product${products.length !== 1 ? 's' : ''}`
              : "Discover our full collection of curated fashion pieces."}
          </p>
          
          {/* Search Bar */}
          <div className="mt-4 flex gap-2 items-center max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && localSearch.trim()) {
                    setSearchQuery(localSearch);
                    // Track search for recommendations
                    const keywords = localSearch.toLowerCase().split(/\s+/).filter(w => w.length > 2);
                    addToSearchHistory(localSearch, undefined, keywords);
                  }
                }}
                placeholder="Search products..."
                className="w-full pl-9 pr-4 py-2 text-sm bg-background border border-border rounded-full focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            {filters.searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setLocalSearch("");
                }}
                className="p-2 rounded-full hover:bg-secondary transition-colors"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-10">
          <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryChange(cat)}
              className={`font-display text-sm px-5 py-2 rounded-full border transition-colors ${
                activeCategory === cat
                  ? "bg-foreground text-primary-foreground border-foreground"
                  : "border-border text-foreground hover:border-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
          <select
            value={getSortValue()}
            onChange={(e) => handleSortChange(e.target.value)}
            className="ml-auto font-body text-sm bg-background border border-border rounded-full px-4 py-2 text-foreground focus:outline-none"
          >
            <option value="default">Sort by</option>
            <option value="low">Price: Low → High</option>
            <option value="high">Price: High → Low</option>
            <option value="name">Name</option>
          </select>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="text-center py-20 flex flex-col items-center">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mb-4" />
            <p className="font-body text-muted-foreground">Loading products...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-body text-muted-foreground">No products found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 lg:gap-8">
            {products.map((product) => (
              <Link to={`/product/${product.id}`} key={product.id} className="group cursor-pointer">
                <div className="rounded-2xl lg:rounded-3xl overflow-hidden bg-secondary aspect-[3/4] mb-4">
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <h3 className="font-display font-medium text-foreground text-sm sm:text-base">{product.name}</h3>
                <p className="font-display font-semibold text-foreground mt-1">${product.price}</p>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Shop;
