import { useState, useEffect } from 'react';
import { getProducts } from '@/lib/api/products';
import { useUserAuth } from '@/contexts/UserAuthContext';
import { useCart } from '@/contexts/CartContext';
import { toast } from 'sonner';

const TestAPI = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, isAuthenticated } = useUserAuth();
  const { items, addToCart } = useCart();

  useEffect(() => {
    const testAPI = async () => {
      try {
        const productsData = await getProducts();
        setProducts(productsData);
        toast.success('API connection successful!');
      } catch (error: any) {
        console.error('API Test Error:', error);
        toast.error('API connection failed: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    testAPI();
  }, []);

  const handleAddToCart = async (productId: string, size: string) => {
    try {
      await addToCart(productId, size, 1);
      toast.success('Added to cart!');
    } catch (error: any) {
      toast.error('Failed to add to cart: ' + error.message);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">API Integration Test</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Authentication Status</h2>
          <p className="text-sm text-gray-600">
            {isAuthenticated ? `Authenticated as ${user?.email}` : 'Not authenticated'}
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Cart Status</h2>
          <p className="text-sm text-gray-600">
            {items.length} items in cart
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Products</h2>
          <p className="text-sm text-gray-600">
            {products.length} products loaded
          </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Products from API</h2>
        {loading ? (
          <p>Loading products...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.slice(0, 6).map((product) => (
              <div key={product.id} className="border rounded-lg p-4">
                <h3 className="font-semibold">{product.name}</h3>
                <p className="text-sm text-gray-600">{product.category}</p>
                <p className="text-lg font-bold">${product.price}</p>
                <div className="mt-2">
                  <select className="border rounded px-2 py-1 mr-2">
                    {product.sizes?.map((size: string) => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleAddToCart(product.id, product.sizes?.[0] || 'M')}
                    className="bg-blue-500 text-white px-4 py-1 rounded text-sm"
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TestAPI;
