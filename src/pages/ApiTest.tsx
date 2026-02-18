import { useState, useEffect } from 'react';
import { getProducts } from '@/lib/api/products';

const ApiTest = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('[ApiTest] Starting API test...');
    
    const testAPI = async () => {
      try {
        console.log('[ApiTest] Calling getProducts...');
        const result = await getProducts({}, { field: 'created_at', order: 'desc' });
        console.log('[ApiTest] API response:', result);
        console.log('[ApiTest] Products count:', result?.length || 0);
        setProducts(result || []);
        setLoading(false);
      } catch (err) {
        console.error('[ApiTest] API error:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    testAPI();
  }, []);

  if (loading) {
    return <div>Loading API test...</div>;
  }

  if (error) {
    return (
      <div>
        <h1>API Test Error</h1>
        <p>Error: {error}</p>
      </div>
    );
  }

  return (
    <div>
      <h1>API Test Results</h1>
      <p>Products found: {products.length}</p>
      <ul>
        {products.slice(0, 3).map(product => (
          <li key={product.id}>
            {product.name} - ${product.price} (ID: {product.id})
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ApiTest;
