import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const ShopMinimal = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  console.log('[ShopMinimal] Component loaded');

  useEffect(() => {
    console.log('[ShopMinimal] Starting fetch...');
    
    // Direct API call
    fetch('http://localhost:3001/api/products?sort=created_at_desc')
      .then(response => {
        console.log('[ShopMinimal] Response status:', response.status);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('[ShopMinimal] Data received:', data);
        console.log('[ShopMinimal] Products count:', data.products?.length || 0);
        setProducts(data.products || []);
        setLoading(false);
      })
      .catch(error => {
        console.error('[ShopMinimal] Error:', error);
        setError(error.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="ml-2">Loading products...</span>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-20">
            <h1 className="text-2xl font-bold text-red-500 mb-4">Error Loading Products</h1>
            <p className="text-gray-600">{error}</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Shop (Minimal Version)</h1>
        
        <div className="mb-4">
          <p>Found {products.length} products</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {products.slice(0, 6).map((product) => (
            <div key={product.id} className="border rounded-lg p-4">
              <h3 className="font-semibold">{product.name}</h3>
              <p className="text-sm text-gray-600">{product.category}</p>
              <p className="text-lg font-bold">${product.price}</p>
              <p className="text-xs text-gray-500">ID: {product.id}</p>
              <Link to={`/product/${product.id}`} className="text-blue-500 hover:underline block mt-2">
                View Product (UUID: {product.id})
              </Link>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ShopMinimal;
