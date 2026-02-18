import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCart, addToCart as addToCartAPI, updateCartItem, removeCartItem, clearCart, applyCoupon as applyCouponAPI } from '@/lib/api/cart';
import type { CartItem } from '@/lib/api/cart';

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  total: number;
  isLoading: boolean;
  addToCart: (productId: string, size: string, quantity?: number) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
  // Coupon functionality (placeholder for future implementation)
  couponCode?: string | null;
  discount?: number;
  applyCoupon?: (code: string) => Promise<{ success: boolean; error?: string }>;
  removeCoupon?: () => Promise<void>;
}

const CartContext = createContext<CartContextType | null>(null);

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [discount, setDiscount] = useState(0);

  const refreshCart = async () => {
    try {
      setIsLoading(true);
      const cartItems = await getCart();
      setItems(cartItems);
    } catch (error) {
      console.error('[CartContext] Error refreshing cart:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshCart();
  }, []);

  const addToCart = async (productId: string, size: string, quantity: number = 1) => {
    try {
      const result = await addToCartAPI(productId, size, quantity);
      if (result) {
        await refreshCart();
      }
    } catch (error) {
      console.error('[CartContext] Error adding to cart:', error);
    }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    try {
      if (quantity <= 0) {
        await removeItem(itemId);
      } else {
        await updateCartItem(itemId, quantity);
        await refreshCart();
      }
    } catch (error) {
      console.error('[CartContext] Error updating quantity:', error);
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      await removeCartItem(itemId);
      await refreshCart();
    } catch (error) {
      console.error('[CartContext] Error removing item:', error);
    }
  };

  const clearCartItems = async () => {
    try {
      await clearCart();
      try {
        localStorage.removeItem('applied_coupon_code');
      } catch {
        // ignore
      }
      await refreshCart();
    } catch (error) {
      console.error('[CartContext] Error clearing cart:', error);
    }
  };

  // Calculate totals
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + (item.product?.price || 0) * item.quantity, 0);
  const total = Math.max(0, subtotal - discount);

  const applyCoupon = async (code: string) => {
    try {
      const result = await applyCouponAPI(code, subtotal);
      if (result.coupon && result.discount > 0) {
        setCouponCode(result.coupon.code);
        setDiscount(result.discount);
        try {
          localStorage.setItem('applied_coupon_code', result.coupon.code);
        } catch {
          // ignore
        }
        return { success: true };
      }

      setCouponCode(null);
      setDiscount(0);
      return { success: false, error: result.error || 'Invalid coupon code' };
    } catch (error: any) {
      setCouponCode(null);
      setDiscount(0);
      return { success: false, error: error?.message || 'Failed to apply coupon' };
    }
  };

  const removeCoupon = async () => {
    setCouponCode(null);
    setDiscount(0);
    try {
      localStorage.removeItem('applied_coupon_code');
    } catch {
      // ignore
    }
  };

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        subtotal,
        total,
        isLoading,
        addToCart,
        updateQuantity,
        removeItem,
        clearCart: clearCartItems,
        refreshCart,
        couponCode,
        discount,
        applyCoupon,
        removeCoupon,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
