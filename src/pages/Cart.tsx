import { useState } from "react";
import { Link } from "react-router-dom";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, Tag, X } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useCart } from "@/contexts/CartContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const Cart = () => {
  const { items, removeItem, updateQuantity, total, itemCount, subtotal, isLoading, couponCode, discount, applyCoupon, removeCoupon } = useCart();
  const [couponInput, setCouponInput] = useState("");
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const handleApplyCoupon = async () => {
    if (!applyCoupon) {
      toast.info("Coupon functionality coming soon!");
      return;
    }

    const code = couponInput.trim().toUpperCase();
    if (!code) return;

    try {
      setApplyingCoupon(true);
      const result = await applyCoupon(code);
      if (result.success) {
        toast.success(`Coupon ${code} applied!`);
        setCouponInput("");
      } else {
        toast.error(result.error || "Invalid coupon code");
      }
    } finally {
      setApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = async () => {
    if (removeCoupon) {
      await removeCoupon();
    }
    toast.info("Coupon removed");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-28 pb-12 px-4 sm:px-6 lg:px-12 max-w-[1440px] mx-auto">
        <h1 className="font-display font-bold text-foreground text-3xl mb-2">Your Cart</h1>
        <p className="font-body text-muted-foreground mb-10">{itemCount} {itemCount === 1 ? "item" : "items"}</p>

        {items.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingBag className="w-16 h-16 mx-auto text-muted-foreground/30 mb-6" />
            <p className="font-display text-xl text-foreground mb-4">Your cart is empty</p>
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 bg-foreground text-primary-foreground font-display font-semibold rounded-full px-8 py-3 text-sm hover:-translate-y-0.5 transition-all"
            >
              Continue Shopping <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-10">
            {/* Items */}
            <div className="lg:col-span-2 space-y-6">
              {items.map((item) => (
                <div key={`${item.id}-${item.size}`} className="flex gap-5 p-4 rounded-2xl border border-border bg-card">
                  <Link to={`/product/${item.product_id}`} className="w-24 h-28 sm:w-32 sm:h-36 rounded-xl overflow-hidden bg-secondary flex-shrink-0">
                    <img src={item.product?.image_url || '/placeholder.svg'} alt={item.product?.name || 'Product'} className="w-full h-full object-cover" />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-display font-medium text-foreground">{item.product?.name || 'Unknown Product'}</h3>
                        <p className="font-body text-sm text-muted-foreground mt-1">Size: {item.size}</p>
                      </div>
                      <button onClick={() => removeItem(item.id)} className="p-2 text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center border border-border rounded-full">
                        <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-2 hover:bg-secondary rounded-l-full transition-colors">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-4 font-display text-sm font-medium">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-2 hover:bg-secondary rounded-r-full transition-colors">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="font-display font-bold text-foreground">${((item.product?.price || 0) * item.quantity).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="lg:col-span-1">
              <div className="rounded-2xl border border-border bg-card p-6 sticky top-28">
                <h3 className="font-display font-bold text-foreground text-lg mb-6">Order Summary</h3>
                
                {/* Coupon Input */}
                {!couponCode ? (
                  <div className="mb-6">
                    <div className="flex gap-2">
                      <Input
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        placeholder="Coupon code"
                        className="flex-1"
                        onKeyPress={(e) => e.key === "Enter" && handleApplyCoupon()}
                      />
                      <Button
                        onClick={handleApplyCoupon}
                        disabled={!couponInput.trim() || applyingCoupon}
                        size="icon"
                      >
                        <Tag className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mb-6 p-3 bg-accent/10 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-accent" />
                      <span className="font-display font-medium text-sm">{couponCode}</span>
                    </div>
                    <button
                      onClick={handleRemoveCoupon}
                      className="p-1 hover:bg-accent/20 rounded transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <div className="space-y-3 font-body text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span><span>${subtotal.toFixed(2)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-accent">
                      <span>Discount</span><span>-${discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-muted-foreground">
                    <span>Shipping</span><span>Free</span>
                  </div>
                  <div className="border-t border-border pt-3 flex justify-between font-display font-bold text-foreground text-base">
                    <span>Total</span><span>${total.toFixed(2)}</span>
                  </div>
                </div>
                <Link
                  to="/checkout"
                  className="mt-6 w-full bg-foreground text-primary-foreground font-display font-semibold rounded-full py-4 text-sm hover:-translate-y-0.5 hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2"
                >
                  Checkout <ArrowRight className="w-4 h-4" />
                </Link>
                <Link to="/shop" className="mt-3 w-full border-2 border-border font-display font-medium rounded-full py-3 text-sm hover:border-foreground transition-colors flex items-center justify-center text-foreground">
                  Continue Shopping
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Cart;
