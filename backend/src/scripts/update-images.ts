import { db } from '../utils/database';

// Update product image URLs to use local assets
async function updateProductImages() {
  try {
    console.log('Updating product image URLs...');
    
    // Update each product with the correct local image path
    const updates = [
      { name: 'Aviator Sunglasses', image_url: '/src/assets/product-5.jpg' },
      { name: 'Leather Tote Bag', image_url: '/src/assets/product-2.jpg' },
      { name: 'Denim Jacket', image_url: '/src/assets/product-5.jpg' },
      { name: 'Classic White Sneakers', image_url: '/src/assets/product-2.jpg' },
    ];
    
    for (const update of updates) {
      const result = await db.query(
        'UPDATE products SET image_url = $1 WHERE name = $2 RETURNING id, name, image_url',
        [update.image_url, update.name]
      );
      console.log(`Updated:`, result.rows[0]);
    }
    
    // Show all updated products
    const allProducts = await db.query('SELECT id, name, image_url FROM products ORDER BY name');
    console.log('All products after update:');
    allProducts.rows.forEach(product => {
      console.log(`${product.name}: ${product.image_url}`);
    });
    
    console.log('✅ Product image URLs updated successfully!');
    
  } catch (error) {
    console.error('❌ Error updating product images:', error);
  }
}

// Run the update
updateProductImages().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
