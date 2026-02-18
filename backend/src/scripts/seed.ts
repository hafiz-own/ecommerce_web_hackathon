import { db } from '../utils/database';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Load seed data from existing files
async function loadSeedData() {
  try {
    // Read seed products from original files
    const seedProductsPath = path.join(__dirname, '../../../supabase/seed-products.sql');
    const seedAdditionalPath = path.join(__dirname, '../../../supabase/seed-products-additional.sql');
    
    let seedProductsSQL = '';
    let seedAdditionalSQL = '';
    
    try {
      seedProductsSQL = await fs.readFile(seedProductsPath, 'utf-8');
    } catch (error) {
      console.warn('⚠️  Could not read seed-products.sql');
    }
    
    try {
      seedAdditionalSQL = await fs.readFile(seedAdditionalPath, 'utf-8');
    } catch (error) {
      console.warn('⚠️  Could not read seed-products-additional.sql');
    }
    
    // Parse SQL to extract product data
    const products = parseProductsFromSQL(seedProductsSQL + seedAdditionalSQL);
    return products;
  } catch (error) {
    console.error('❌ Failed to load seed data:', error);
    return [];
  }
}

function parseProductsFromSQL(sql: string): any[] {
  const products: any[] = [];
  
  // Regular expression to match INSERT statements for products
  const insertRegex = /INSERT\s+INTO\s+products\s*\([^)]+\)\s*VALUES\s*\(([^;]+)\);?/gi;
  
  let match;
  while ((match = insertRegex.exec(sql)) !== null) {
    const valuesStr = match[1];
    
    // Parse the values - this is a simplified parser
    const product: any = {
      id: uuidv4(),
      name: extractStringValue(valuesStr, 'name'),
      description: extractStringValue(valuesStr, 'description'),
      price: extractNumberValue(valuesStr),
      image_url: extractStringValue(valuesStr, 'image_url'),
      category: extractStringValue(valuesStr, 'category'),
      sizes: extractArrayValue(valuesStr, 'sizes'),
      colors: extractArrayValue(valuesStr, 'colors'),
      stock: extractNumberValue(valuesStr, 'stock') || 10,
      tags: extractArrayValue(valuesStr, 'tags'),
      metadata: {}
    };
    
    if (product.name && product.price && product.category) {
      products.push(product);
    }
  }
  
  return products;
}

function extractStringValue(valuesStr: string, fieldName: string): string {
  // Look for patterns like 'Product Name' or "Product Name"
  const regex = new RegExp(`['"]([^'"]+)['"]\\s*(?=,|\\)|$)`, 'i');
  const match = valuesStr.match(regex);
  return match ? match[1] : '';
}

function extractNumberValue(valuesStr: string): number {
  // Look for numeric values
  const regex = /(\d+\.?\d*)/;
  const match = valuesStr.match(regex);
  return match ? parseFloat(match[1]) : 0;
}

function extractArrayValue(valuesStr: string, fieldName: string): string[] {
  // Look for array patterns like '{item1,item2}'
  const regex = /\{([^}]+)\}/;
  const match = valuesStr.match(regex);
  if (match) {
    return match[1].split(',').map(item => item.trim().replace(/['"]/g, ''));
  }
  return [];
}

async function seed() {
  console.log('🌱 Starting database seeding...');
  
  try {
    const products = await loadSeedData();
    
    if (products.length === 0) {
      console.log('⚠️  No products found in seed data, creating sample products...');
      
      // Create some sample products if no seed data found
      const sampleProducts = [
        {
          id: uuidv4(),
          name: 'Classic White Sneakers',
          description: 'Comfortable and stylish white sneakers perfect for everyday wear.',
          price: 89.99,
          image_url: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500',
          category: 'Shoes',
          sizes: ['7', '8', '9', '10', '11'],
          colors: ['White', 'Black'],
          stock: 50,
          tags: ['sneakers', 'casual', 'white'],
          metadata: {}
        },
        {
          id: uuidv4(),
          name: 'Denim Jacket',
          description: 'Classic denim jacket with modern fit and styling.',
          price: 129.99,
          image_url: 'https://images.unsplash.com/photo-1571697356524-1c1a1b7b5b1?w=500',
          category: 'Clothes',
          sizes: ['S', 'M', 'L', 'XL'],
          colors: ['Blue', 'Black'],
          stock: 30,
          tags: ['jacket', 'denim', 'casual'],
          metadata: {}
        },
        {
          id: uuidv4(),
          name: 'Leather Tote Bag',
          description: 'Genuine leather tote bag with spacious interior.',
          price: 159.99,
          image_url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a70?w=500',
          category: 'Bags',
          sizes: ['One Size'],
          colors: ['Brown', 'Black'],
          stock: 25,
          tags: ['tote', 'leather', 'spacious'],
          metadata: {}
        },
        {
          id: uuidv4(),
          name: 'Aviator Sunglasses',
          description: 'Classic aviator style sunglasses with UV protection.',
          price: 79.99,
          image_url: 'https://images.unsplash.com/photo-1473496250808-b1e5fb7600a3?w=500',
          category: 'Accessories',
          sizes: ['One Size'],
          colors: ['Gold', 'Silver'],
          stock: 40,
          tags: ['sunglasses', 'aviator', 'uv-protection'],
          metadata: {}
        }
      ];
      
      products.push(...sampleProducts);
    }
    
    console.log(`📦 Found ${products.length} products to seed`);
    
    // Insert products into database
    for (const product of products) {
      const query = `
        INSERT INTO products (id, name, description, price, image_url, category, sizes, colors, stock, tags, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO NOTHING
      `;
      
      await db.query(query, [
        product.id,
        product.name,
        product.description,
        product.price,
        product.image_url,
        product.category,
        JSON.stringify(product.sizes),
        JSON.stringify(product.colors),
        product.stock,
        JSON.stringify(product.tags),
        JSON.stringify(product.metadata)
      ]);
    }
    
    console.log('✅ Products seeded successfully');
    
    // Create some sample coupons
    const coupons = [
      {
        id: uuidv4(),
        code: 'WELCOME10',
        discount_type: 'percentage',
        discount_value: 10,
        min_purchase: 50,
        valid_from: new Date(),
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        usage_limit: 100,
        used_count: 0,
        created_by_agent: false,
        reason: 'Welcome discount for new customers'
      },
      {
        id: uuidv4(),
        code: 'SUMMER20',
        discount_type: 'percentage',
        discount_value: 20,
        min_purchase: 100,
        valid_from: new Date(),
        valid_until: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
        usage_limit: 200,
        used_count: 0,
        created_by_agent: false,
        reason: 'Summer sale discount'
      }
    ];
    
    for (const coupon of coupons) {
      const couponQuery = `
        INSERT INTO coupons (id, code, discount_type, discount_value, min_purchase, valid_from, valid_until, usage_limit, used_count, created_by_agent, reason)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (code) DO NOTHING
      `;
      
      await db.query(couponQuery, [
        coupon.id,
        coupon.code,
        coupon.discount_type,
        coupon.discount_value,
        coupon.min_purchase,
        coupon.valid_from,
        coupon.valid_until,
        coupon.usage_limit,
        coupon.used_count,
        coupon.created_by_agent,
        coupon.reason
      ]);
    }
    
    console.log('✅ Coupons seeded successfully');
    console.log('🎉 Database seeding completed!');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await db.end();
    console.log('🔌 Database connection closed');
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seed();
}

export { seed };
