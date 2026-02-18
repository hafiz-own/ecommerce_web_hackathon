import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";
import { FilterProvider } from "@/contexts/FilterContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { UserAuthProvider } from "@/contexts/UserAuthContext";
import ClerkChat from "@/components/ClerkChat";
import ScrollToTop from "@/components/ScrollToTop";
import Index from "./pages/Index";
import Shop from "./pages/Shop";
import ShopTest from "./pages/ShopTest";
import ShopMinimal from "./pages/ShopMinimal";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import SignIn from "./pages/SignIn";
import AuthCallback from "./pages/AuthCallback";
import Contact from "./pages/Contact";
import TestAPI from "./pages/TestAPI";
import ApiTest from "./pages/ApiTest";
import NotFound from "./pages/NotFound";

// Admin Pages
import AdminLayout from "@/components/admin/AdminLayout";
import AdminLogin from "@/pages/admin/Login";
import AdminDashboard from "@/pages/admin/Dashboard";
import AdminProducts from "@/pages/admin/Products";
import AdminProductForm from "@/pages/admin/ProductForm";
import AdminOrders from "@/pages/admin/Orders";
import AdminCoupons from "@/pages/admin/Coupons";
import AdminSettings from "@/pages/admin/Settings";
import ProtectedRoute from "@/components/admin/ProtectedRoute";

const queryClient = new QueryClient();

// Wrapper to conditionally show ClerkChat (hide on admin pages)
const ClerkChatWrapper = () => {
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith("/admin");
  
  if (isAdminPage) return null;
  return <ClerkChat />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <UserAuthProvider>
        <AuthProvider>
          <FilterProvider>
            <CartProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <ScrollToTop />
                <Routes>
                  {/* Storefront Routes */}
                  <Route path="/" element={<Index />} />
                  <Route path="/shop" element={<Shop />} />
                  <Route path="/shop-test" element={<ShopTest />} />
                  <Route path="/shop-minimal" element={<ShopMinimal />} />
                  <Route path="/product/:id" element={<ProductDetail />} />
                  <Route path="/cart" element={<Cart />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/signin" element={<SignIn />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/test-api" element={<TestAPI />} />
                  <Route path="/api-test" element={<ApiTest />} />
                  
                  {/* Admin Login (public) */}
                  <Route path="/admin/login" element={<AdminLogin />} />
                  
                  {/* Protected Admin Routes */}
                  <Route
                    path="/admin"
                    element={
                      <ProtectedRoute>
                        <AdminLayout />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<AdminDashboard />} />
                    <Route path="products" element={<AdminProducts />} />
                    <Route path="products/new" element={<AdminProductForm />} />
                    <Route path="products/:id" element={<AdminProductForm />} />
                    <Route path="orders" element={<AdminOrders />} />
                    <Route path="coupons" element={<AdminCoupons />} />
                    <Route path="coupons/new" element={<AdminCoupons />} />
                    <Route path="settings" element={<AdminSettings />} />
                  </Route>
                  
                  <Route path="*" element={<NotFound />} />
                </Routes>
                <ClerkChatWrapper />
              </BrowserRouter>
            </CartProvider>
          </FilterProvider>
        </AuthProvider>
      </UserAuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
