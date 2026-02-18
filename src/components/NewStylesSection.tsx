import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { getRecommendedProductsDynamic, type Product } from "@/lib/api/products";
import product1 from "@/assets/product-1_linen_blazer.jpg";
import product2 from "@/assets/product-2_white_sneakers.jpg";
import product3 from "@/assets/product-3_totte_bag.jpg";
import product4 from "@/assets/product-4_wool_overcoat.jpg";

// Default fallback recommendations (used when no search history)
const defaultRecommended = [
  { id: "1", name: "Linen Blazer", price: 189, image: product1 },
  { id: "2", name: "Classic Sneakers", price: 129, image: product2 },
  { id: "3", name: "Canvas Tote", price: 79, image: product3 },
  { id: "4", name: "Wool Overcoat", price: 349, image: product4 },
];

const NewStylesSection = () => {
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [isPersonalized, setIsPersonalized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const sessionId = localStorage.getItem("cart_session_id") || "default";
        const products = await getRecommendedProductsDynamic(sessionId, 4);
        
        if (products.length > 0) {
          setRecommendations(products);
          // Check if recommendations are personalized (based on search history)
          const searchHistory = JSON.parse(localStorage.getItem("user_search_history") || "[]");
          setIsPersonalized(searchHistory.length > 0);
        } else {
          // Use default recommendations
          setRecommendations(defaultRecommended.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            image_url: item.image,
            category: "Clothes",
            description: "",
            sizes: [],
            stock: 10,
          })));
        }
      } catch (error) {
        console.error("[NewStylesSection] Error fetching recommendations:", error);
        // Fallback to defaults
        setRecommendations(defaultRecommended.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          image_url: item.image,
          category: "Clothes",
          description: "",
          sizes: [],
          stock: 10,
        })));
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
    
    // Listen for search history updates
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "user_search_history") {
        fetchRecommendations();
      }
    };
    
    window.addEventListener("storage", handleStorageChange);
    
    // Also listen for custom event from same window
    const handleSearchUpdate = () => {
      fetchRecommendations();
    };
    window.addEventListener("searchHistoryUpdated", handleSearchUpdate);
    
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("searchHistoryUpdated", handleSearchUpdate);
    };
  }, []);

  return (
    <section className="py-12 lg:py-16 px-4 sm:px-6 lg:px-12 max-w-[1440px] mx-auto">
      <div className="flex items-center justify-between mb-12 scroll-reveal">
        <div className="flex items-center gap-3">
          <h2 className="font-display font-bold text-foreground" style={{ fontSize: "clamp(1.75rem, 3vw, 2.5rem)" }}>
            Recommended For You
          </h2>
          {isPersonalized && (
            <span className="hidden sm:flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
              <Sparkles className="w-3 h-3" />
              Personalized
            </span>
          )}
        </div>
        <Link to="/shop" className="font-display text-sm font-medium text-foreground flex items-center gap-2 hover:text-accent transition-colors">
          VIEW ALL <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 scroll-reveal">
        {loading ? (
          // Loading skeleton
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="rounded-2xl lg:rounded-3xl bg-secondary aspect-[3/4] mb-4" />
              <div className="h-4 bg-secondary rounded w-3/4 mb-2" />
              <div className="h-4 bg-secondary rounded w-1/4" />
            </div>
          ))
        ) : (
          recommendations.map((item) => (
            <Link to={`/product/${item.id}`} key={item.id} className="group cursor-pointer">
              <div className="rounded-2xl lg:rounded-3xl overflow-hidden bg-secondary aspect-[3/4] mb-4">
                <img 
                  src={item.image_url} 
                  alt={item.name} 
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105" 
                />
              </div>
              <h3 className="font-display font-medium text-foreground text-base">{item.name}</h3>
              <p className="font-display font-semibold text-foreground mt-1">${item.price}</p>
            </Link>
          ))
        )}
      </div>
    </section>
  );
};

export default NewStylesSection;
