import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Loader2 } from "lucide-react";
import { getProducts, type Product } from "@/lib/api/products";

const ProductGrid = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        console.log('[ProductGrid] Starting to fetch products...');
        setLoading(true);
        const data = await getProducts({}, { field: "created_at", order: "desc" });
        console.log('[ProductGrid] Products received:', data);
        console.log('[ProductGrid] Products length:', data?.length || 0);
        if (data && data.length > 0) {
          console.log('[ProductGrid] Setting products:', data.slice(0, 6));
          setProducts(data.slice(0, 6));
        } else {
          console.log('[ProductGrid] No products found or empty data');
        }
      } catch (error) {
        console.error("[ProductGrid] Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  return (
    <section className="py-12 lg:py-16 px-4 sm:px-6 lg:px-12 max-w-[1440px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-12 scroll-reveal">
        <h2 className="font-display font-bold text-foreground" style={{ fontSize: "clamp(1.75rem, 3vw, 2.5rem)" }}>
          Ready to Wear
        </h2>
        <Link to="/shop" className="font-display text-sm font-medium text-foreground flex items-center gap-2 hover:text-accent transition-colors">
          SHOP NOW <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 lg:gap-8">
          {products.length === 0 ? (
            <div className="col-span-full text-center py-10">
              <p className="text-muted-foreground">No products found</p>
            </div>
          ) : (
            products.map((product) => (
              <Link to={`/product/${product.id}`} key={product.id} className="group cursor-pointer">
                <div className="rounded-2xl lg:rounded-3xl overflow-hidden bg-secondary aspect-[3/4] mb-4">
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <h3 className="font-display font-medium text-foreground text-base">{product.name}</h3>
                <p className="font-display font-semibold text-foreground mt-1">${product.price}</p>
              </Link>
            ))
          )}
        </div>
      )}
    </section>
  );
};

export default ProductGrid;
