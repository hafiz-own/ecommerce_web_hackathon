import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const ShopTest = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  console.log('[ShopTest] Component loaded');

  useEffect(() => {
    console.log('[ShopTest] Starting fetch...');
    
    // Direct API call
    fetch('http://localhost:3001/api/products?sort=created_at_desc')
      .then(response => {
        console.log('[ShopTest] Response status:', response.status);
        return response.json();
      })
      .then(data => {
        console.log('[ShopTest] Data received:', data);
        setProducts(data.products || []);
        setLoading(false);
      })
      .catch(error => {
        console.error('[ShopTest] Error:', error);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Shop (Test Version)</h1>
        
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="ml-2">Loading products...</span>
          </div>
        ) : (
          <div>
            <p>Found {products.length} products</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {products.slice(0, 6).map((product) => (
                <div key={product.id} className="border rounded-lg p-4">
                  <h3 className="font-semibold">{product.name}</h3>
                  <p className="text-sm text-gray-600">{product.category}</p>
                  <p className="text-lg font-bold">${product.price}</p>
                  <Link to={`/product/${product.id}`} className="text-blue-500 hover:underline">
                    View Product
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default ShopTest;
