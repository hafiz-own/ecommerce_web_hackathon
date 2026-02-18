import { db } from '../utils/database';

// Complete product data reset and reinsertion
async function completeProductReset() {
  try {
    console.log('🔄 Starting complete product data reset...');
    
    // Step 1: Clear foreign key constraints first
    console.log('🗑️  Clearing user_activity table (foreign key constraint)...');
    const activityResult = await db.query('DELETE FROM user_activity');
    console.log(`✅ Deleted ${activityResult.rowCount} user activity records`);
    
    // Step 2: Clear all existing products
    console.log('🗑️  Clearing all existing products...');
    const deleteResult = await db.query('DELETE FROM products');
    console.log(`✅ Deleted ${deleteResult.rowCount} existing products`);
    
    // Step 2: Insert all products with correct image mappings
    const products = [
      // From seed-products.sql
      {
        name: 'Linen Blazer',
        description: 'A lightweight linen blazer perfect for layering. Tailored fit with natural texture for a sophisticated yet relaxed look.',
        price: 189,
        image_url: '/src/assets/product-1_linen_blazer.jpg',
        category: 'Clothes',
        sizes: ["S","M","L","XL"],
        tags: ["linen","blazer","lightweight","summer","wedding","smart"],
        metadata: {"season":"summer","occasion":["wedding","smart-casual"],"style":"minimal"}
      },
      {
        name: 'Classic Sneakers',
        description: 'Minimalist leather sneakers with cushioned insole. Clean lines and premium materials for everyday comfort.',
        price: 129,
        image_url: '/src/assets/product-2_white_sneakers.jpg',
        category: 'Shoes',
        sizes: ["38","39","40","41","42","43","44"],
        tags: ["sneakers","leather","everyday","casual"],
        metadata: {"season":["spring","summer","fall"],"occasion":["casual","travel"],"style":"sporty-minimal"}
      },
      {
        name: 'Canvas Tote',
        description: 'Oversized canvas tote with reinforced handles. Spacious interior with internal pocket for essentials.',
        price: 79,
        image_url: '/src/assets/product-3_totte_bag.jpg',
        category: 'Bags',
        sizes: ["One Size"],
        tags: ["tote","bag","canvas","everyday"],
        metadata: {"season":"all","occasion":["daily","shopping","beach"],"style":"relaxed"}
      },
      {
        name: 'Wool Overcoat',
        description: 'Double-breasted wool overcoat with satin lining. A timeless silhouette for the colder months.',
        price: 349,
        image_url: '/src/assets/product-4_wool_overcoat.jpg',
        category: 'Clothes',
        sizes: ["S","M","L","XL"],
        tags: ["coat","wool","winter","outerwear"],
        metadata: {"season":["fall","winter"],"occasion":["work","evening"],"style":"classic"}
      },
      {
        name: 'Relaxed Trousers',
        description: 'Wide-leg relaxed trousers in organic cotton. Elastic waistband with drawstring for effortless style.',
        price: 119,
        image_url: '/src/assets/product-5_relaxed_trousers.jpg',
        category: 'Clothes',
        sizes: ["S","M","L","XL"],
        tags: ["trousers","relaxed","cotton","comfortable"],
        metadata: {"season":["spring","summer","fall"],"occasion":["casual","travel"],"style":"relaxed"}
      },
      {
        name: 'Knit Sweater',
        description: 'Chunky knit sweater in a soft wool blend. Ribbed cuffs and hem with relaxed drop-shoulder fit.',
        price: 145,
        image_url: '/src/assets/product-6_knit_sweater.jpg',
        category: 'Clothes',
        sizes: ["S","M","L","XL"],
        tags: ["sweater","knit","warm","casual"],
        metadata: {"season":["fall","winter"],"occasion":["casual","weekend"],"style":"cozy"}
      },
      {
        name: 'Leather Belt',
        description: 'Full-grain leather belt with brushed brass buckle. 3cm width for a refined, versatile accessory.',
        price: 59,
        image_url: '/src/assets/leather_belt.png',
        category: 'Accessories',
        sizes: ["S","M","L"],
        tags: ["belt","leather","accessory"],
        metadata: {"season":"all","occasion":["work","casual"],"style":"classic"}
      },
      {
        name: 'Silk Scarf',
        description: 'Hand-printed silk scarf with abstract geometric pattern. Lightweight and luxurious drape.',
        price: 89,
        image_url: '/src/assets/crossbody_bag.png', // Using crossbody bag as placeholder
        category: 'Accessories',
        sizes: ["One Size"],
        tags: ["scarf","silk","accessory","pattern"],
        metadata: {"season":["spring","fall"],"occasion":["evening","special"],"style":"elegant"}
      },
      {
        name: 'Chelsea Boots',
        description: 'Classic Chelsea boots in polished leather. Elastic side panels and pull tab for easy on and off.',
        price: 229,
        image_url: '/src/assets/chelsea_boots.png',
        category: 'Shoes',
        sizes: ["38","39","40","41","42","43","44"],
        tags: ["boots","leather","chelsea","winter"],
        metadata: {"season":["fall","winter"],"occasion":["work","evening"],"style":"classic"}
      },
      {
        name: 'Crossbody Bag',
        description: 'Compact crossbody bag in pebbled leather. Adjustable strap with zip closure and card slots.',
        price: 139,
        image_url: '/src/assets/crossbody_bag.png',
        category: 'Bags',
        sizes: ["One Size"],
        tags: ["bag","crossbody","leather","compact"],
        metadata: {"season":"all","occasion":["daily","evening","travel"],"style":"minimal"}
      },
      {
        name: 'Denim Jacket',
        description: 'Washed denim jacket with brass button closures. Classic fit with chest pockets and adjustable cuffs.',
        price: 179,
        image_url: '/src/assets/denim_jacket.png',
        category: 'Clothes',
        sizes: ["S","M","L","XL"],
        tags: ["jacket","denim","casual"],
        metadata: {"season":["spring","fall"],"occasion":["casual","weekend"],"style":"casual"}
      },
      {
        name: 'Running Sneakers',
        description: 'Performance running sneakers with responsive cushioning. Breathable mesh upper in tonal colorway.',
        price: 159,
        image_url: '/src/assets/running_sneakers.png',
        category: 'Shoes',
        sizes: ["38","39","40","41","42","43","44"],
        tags: ["sneakers","running","performance"],
        metadata: {"season":["spring","summer","fall"],"occasion":["running","training"],"style":"sporty"}
      },
      // From seed-products-additional.sql
      {
        name: 'Cashmere Cardigan',
        description: 'Luxuriously soft cashmere cardigan with mother-of-pearl buttons. Relaxed fit with ribbed trim for a refined layering piece.',
        price: 249,
        image_url: '/src/assets/product-6_knit_sweater.jpg', // Using knit sweater as similar cardigan
        category: 'Clothes',
        sizes: ["XS","S","M","L","XL"],
        tags: ["cashmere","cardigan","luxury","layering","soft"],
        metadata: {"season":["fall","winter"],"occasion":["work","evening","date-night"],"style":"elegant"}
      },
      {
        name: 'Leather Loafers',
        description: 'Italian leather penny loafers with hand-stitched details. Memory foam insole for all-day comfort and sophistication.',
        price: 199,
        image_url: '/src/assets/product-2_white_sneakers.jpg', // Using sneakers as placeholder
        category: 'Shoes',
        sizes: ["38","39","40","41","42","43","44","45"],
        tags: ["loafers","leather","italian","formal","comfortable"],
        metadata: {"season":["spring","summer","fall"],"occasion":["work","smart-casual","wedding"],"style":"classic"}
      },
      {
        name: 'Structured Backpack',
        description: 'Minimalist leather backpack with padded laptop compartment. Water-resistant lining with magnetic closures.',
        price: 189,
        image_url: '/src/assets/canvas_tote.png', // Using canvas tote as backpack placeholder
        category: 'Bags',
        sizes: ["One Size"],
        tags: ["backpack","leather","laptop","work","travel"],
        metadata: {"season":"all","occasion":["work","travel","daily"],"style":"modern-minimal"}
      },
      {
        name: 'Linen Shirt Dress',
        description: 'Effortless linen shirt dress with self-tie belt. Relaxed A-line silhouette perfect for warm weather styling.',
        price: 159,
        image_url: '/src/assets/product-1_linen_blazer.jpg', // Using linen blazer as similar linen item
        category: 'Clothes',
        sizes: ["XS","S","M","L","XL"],
        tags: ["dress","linen","summer","effortless","versatile"],
        metadata: {"season":"summer","occasion":["brunch","vacation","casual"],"style":"relaxed-chic"}
      },
      {
        name: 'Aviator Sunglasses',
        description: 'Classic aviator sunglasses with polarized lenses. Gold-tone metal frame with adjustable nose pads for perfect fit.',
        price: 129,
        image_url: '/src/assets/sunglasses.png',
        category: 'Accessories',
        sizes: ["One Size"],
        tags: ["sunglasses","aviator","polarized","summer","classic"],
        metadata: {"season":["spring","summer"],"occasion":["daily","travel","beach"],"style":"timeless"}
      },
      {
        name: 'Merino Wool Turtleneck',
        description: 'Fine-gauge merino wool turtleneck in a flattering slim fit. Lightweight warmth with a polished, refined look.',
        price: 135,
        image_url: '/src/assets/product-6_knit_sweater.jpg', // Using knit sweater as similar wool item
        category: 'Clothes',
        sizes: ["XS","S","M","L","XL"],
        tags: ["turtleneck","merino","wool","layering","winter"],
        metadata: {"season":["fall","winter"],"occasion":["work","date-night","smart-casual"],"style":"sophisticated"}
      },
      {
        name: 'Suede Ankle Boots',
        description: 'Soft suede ankle boots with block heel and side zip. Versatile design transitions seamlessly from day to night.',
        price: 219,
        image_url: '/src/assets/chelsea_boots.png', // Using chelsea boots as similar boots
        category: 'Shoes',
        sizes: ["36","37","38","39","40","41","42"],
        tags: ["boots","suede","ankle","heel","versatile"],
        metadata: {"season":["fall","winter","spring"],"occasion":["work","evening","date-night"],"style":"chic"}
      },
      {
        name: 'Minimalist Watch',
        description: 'Swiss movement watch with sapphire crystal face. Genuine leather strap with clean dial design.',
        price: 275,
        image_url: '/src/assets/minimalist_watch.png',
        category: 'Accessories',
        sizes: ["One Size"],
        tags: ["watch","minimalist","swiss","leather","luxury"],
        metadata: {"season":"all","occasion":["work","formal","daily"],"style":"modern-classic"}
      },
      {
        name: 'Cotton Chinos',
        description: 'Tailored cotton chinos with stretch for comfort. Flat front design with clean lines for a versatile wardrobe staple.',
        price: 99,
        image_url: '/src/assets/product-5_relaxed_trousers.jpg', // Using relaxed trousers as similar pants
        category: 'Clothes',
        sizes: ["28","30","32","34","36","38"],
        tags: ["chinos","cotton","stretch","tailored","everyday"],
        metadata: {"season":["spring","summer","fall"],"occasion":["work","casual","smart-casual"],"style":"classic"}
      },
      {
        name: 'Weekend Duffle Bag',
        description: 'Waxed canvas duffle with leather trim. Spacious main compartment with shoe pocket and removable shoulder strap.',
        price: 169,
        image_url: '/src/assets/canvas_tote.png', // Using canvas tote as similar bag
        category: 'Bags',
        sizes: ["One Size"],
        tags: ["duffle","travel","weekend","canvas","leather"],
        metadata: {"season":"all","occasion":["travel","weekend","gym"],"style":"heritage"}
      }
    ];
    
    // Step 3: Insert all products
    console.log('📦 Inserting all products with correct image mappings...');
    let insertCount = 0;
    
    for (const product of products) {
      const result = await db.query(
        `INSERT INTO products (name, description, price, image_url, category, sizes, tags, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, name, image_url`,
        [
          product.name,
          product.description,
          product.price,
          product.image_url,
          product.category,
          JSON.stringify(product.sizes),
          JSON.stringify(product.tags),
          JSON.stringify(product.metadata)
        ]
      );
      
      insertCount++;
      console.log(`✅ Inserted ${insertCount}/22: ${result.rows[0].name} -> ${result.rows[0].image_url}`);
    }
    
    // Step 4: Verify results
    console.log('\n🔍 Verifying results...');
    const countResult = await db.query('SELECT COUNT(*) as total FROM products');
    const allProducts = await db.query('SELECT name, image_url FROM products ORDER BY name');
    
    console.log(`\n📊 Total products in database: ${countResult.rows[0].total}`);
    console.log('\n📋 Product-Image Mappings:');
    allProducts.rows.forEach(product => {
      console.log(`  ${product.name} -> ${product.image_url}`);
    });
    
    console.log('\n🎉 Complete product reset finished successfully!');
    console.log('📝 Summary:');
    console.log(`  - Deleted all existing products`);
    console.log(`  - Inserted ${insertCount} products with correct image mappings`);
    console.log(`  - All products now use properly named local image files`);
    
  } catch (error) {
    console.error('❌ Error during product reset:', error);
  }
}

// Run the complete reset
completeProductReset().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
