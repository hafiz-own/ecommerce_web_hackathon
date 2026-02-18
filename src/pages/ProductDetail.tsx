import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Minus, Plus, ShoppingBag, Check, Loader2, Sparkles } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TryOnModal from "@/components/TryOnModal";
import { getProductByIdUniversal, getProducts, type Product } from "@/lib/api/products";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [tryOnModalOpen, setTryOnModalOpen] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const productData = await getProductByIdUniversal(id);
        setProduct(productData);
        
        // Fetch related products
        if (productData) {
          const allProducts = await getProducts({ category: productData.category });
          const related = allProducts.filter((p) => p.id !== productData.id).slice(0, 4);
          setRelatedProducts(related);
        }
      } catch (error) {
        console.error("Error fetching product:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-32 text-center flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mb-4" />
          <p className="font-body text-muted-foreground">Loading product...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-32 text-center">
          <h1 className="font-display text-2xl text-foreground">Product not found</h1>
          <Link to="/shop" className="font-body text-accent mt-4 inline-block">Back to shop</Link>
        </div>
      </div>
    );
  }

  const handleAddToCart = async () => {
    if (!selectedSize) {
      toast.error("Please select a size");
      return;
    }
    try {
      console.log('[ProductDetail] Adding to cart:', { productId: product.id, size: selectedSize, quantity });
      await addToCart(product.id, selectedSize, quantity);
      toast.success(`${product.name} added to cart`);
    } catch (error) {
      console.error('[ProductDetail] Error adding to cart:', error);
      toast.error("Failed to add to cart");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-28 pb-12 px-4 sm:px-6 lg:px-12 max-w-[1440px] mx-auto">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 font-body text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="grid md:grid-cols-2 gap-10 lg:gap-16">
          {/* Image */}
          <div className="rounded-3xl overflow-hidden bg-secondary aspect-[3/4]">
            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
          </div>

          {/* Details */}
          <div className="flex flex-col justify-center">
            <p className="font-body text-sm text-muted-foreground uppercase tracking-widest mb-2">{product.category}</p>
            <h1 className="font-display font-bold text-foreground" style={{ fontSize: "clamp(1.8rem, 3vw, 3rem)" }}>
              {product.name}
            </h1>
            <p className="font-display text-2xl font-bold text-foreground mt-3">${product.price}</p>
            <p className="font-body text-muted-foreground mt-6 leading-relaxed">{product.description}</p>

            {/* Size */}
            <div className="mt-8">
              <p className="font-display text-sm font-medium text-foreground mb-3">Size</p>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSelectedSize(s)}
                    className={`font-display text-sm px-4 py-2.5 rounded-full border transition-colors ${
                      selectedSize === s
                        ? "bg-foreground text-primary-foreground border-foreground"
                        : "border-border text-foreground hover:border-foreground"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div className="mt-8 flex items-center gap-4">
              <p className="font-display text-sm font-medium text-foreground">Qty</p>
              <div className="flex items-center border border-border rounded-full">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-3 hover:bg-secondary rounded-l-full transition-colors">
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-5 font-display font-medium text-sm">{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)} className="p-3 hover:bg-secondary rounded-r-full transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Add to cart */}
            <button
              onClick={handleAddToCart}
              className="mt-8 w-full bg-foreground text-primary-foreground font-display font-semibold rounded-full py-4 text-sm hover:-translate-y-0.5 hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2"
            >
              <ShoppingBag className="w-4 h-4" /> Add to Cart — ${product.price * quantity}
            </button>

            {/* Virtual Try-On */}
            {product.metadata?.try_on_enabled && (
              <button
                onClick={() => setTryOnModalOpen(true)}
                className="mt-4 w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-display font-semibold rounded-full py-4 text-sm hover:-translate-y-0.5 hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" /> Virtual Try-On
              </button>
            )}
          </div>
        </div>

        {/* Related */}
        {relatedProducts.length > 0 && (
          <div className="mt-20">
            <h2 className="font-display font-bold text-foreground text-2xl mb-8">You may also like</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5 lg:gap-8">
              {relatedProducts.map((p) => (
                <Link to={`/product/${p.id}`} key={p.id} className="group">
                  <div className="rounded-2xl overflow-hidden bg-secondary aspect-[3/4] mb-3">
                    <img src={p.image_url} alt={p.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
                  </div>
                  <h3 className="font-display font-medium text-foreground text-sm">{p.name}</h3>
                  <p className="font-display font-semibold text-foreground mt-1">${p.price}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
      <Footer />
      
      {/* Try-On Modal */}
      {product && (
        <TryOnModal
          open={tryOnModalOpen}
          onClose={() => setTryOnModalOpen(false)}
          productId={product.id}
          productName={product.name}
        />
      )}
    </div>
  );
};

export default ProductDetail;
