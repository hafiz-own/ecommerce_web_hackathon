import product1 from "@/assets/product-1.jpg";
import product2 from "@/assets/product-2.jpg";
import product3 from "@/assets/product-3.jpg";
import product4 from "@/assets/product-4.jpg";
import product5 from "@/assets/product-5.jpg";
import product6 from "@/assets/product-6.jpg";

export interface Product {
  id: number;
  name: string;
  price: number;
  image: string;
  category: string;
  description: string;
  sizes: string[];
}

// Product images are mapped consistently:
// product1 - Blazer/Jacket image
// product2 - Sneakers/Shoes image  
// product3 - Bag/Tote image
// product4 - Overcoat/Coat image
// product5 - Trousers/Pants image
// product6 - Sweater/Knitwear image

export const products: Product[] = [
  // Clothes
  { id: 1, name: "Linen Blazer", price: 189, image: product1, category: "Clothes", description: "A lightweight linen blazer perfect for layering. Tailored fit with natural texture for a sophisticated yet relaxed look.", sizes: ["S", "M", "L", "XL"] },
  { id: 4, name: "Wool Overcoat", price: 349, image: product4, category: "Clothes", description: "Double-breasted wool overcoat with satin lining. A timeless silhouette for the colder months.", sizes: ["S", "M", "L", "XL"] },
  { id: 5, name: "Relaxed Trousers", price: 119, image: product5, category: "Clothes", description: "Wide-leg relaxed trousers in organic cotton. Elastic waistband with drawstring for effortless style.", sizes: ["S", "M", "L", "XL"] },
  { id: 6, name: "Knit Sweater", price: 145, image: product6, category: "Clothes", description: "Chunky knit sweater in a soft wool blend. Ribbed cuffs and hem with relaxed drop-shoulder fit.", sizes: ["S", "M", "L", "XL"] },
  { id: 11, name: "Denim Jacket", price: 179, image: product1, category: "Clothes", description: "Washed denim jacket with brass button closures. Classic fit with chest pockets and adjustable cuffs.", sizes: ["S", "M", "L", "XL"] },
  
  // Shoes - Use product2 (sneakers image) for all shoes
  { id: 2, name: "Classic Sneakers", price: 129, image: product2, category: "Shoes", description: "Minimalist leather sneakers with cushioned insole. Clean lines and premium materials for everyday comfort.", sizes: ["38", "39", "40", "41", "42", "43", "44"] },
  { id: 9, name: "Chelsea Boots", price: 229, image: product2, category: "Shoes", description: "Classic Chelsea boots in polished leather. Elastic side panels and pull tab for easy on and off.", sizes: ["38", "39", "40", "41", "42", "43", "44"] },
  { id: 12, name: "Running Sneakers", price: 159, image: product2, category: "Shoes", description: "Performance running sneakers with responsive cushioning. Breathable mesh upper in tonal colorway.", sizes: ["38", "39", "40", "41", "42", "43", "44"] },
  
  // Bags - Use product3 (bag image) for all bags
  { id: 3, name: "Canvas Tote", price: 79, image: product3, category: "Bags", description: "Oversized canvas tote with reinforced handles. Spacious interior with internal pocket for essentials.", sizes: ["One Size"] },
  { id: 10, name: "Crossbody Bag", price: 139, image: product3, category: "Bags", description: "Compact crossbody bag in pebbled leather. Adjustable strap with zip closure and card slots.", sizes: ["One Size"] },
  
  // Accessories - Use appropriate images
  { id: 7, name: "Leather Belt", price: 59, image: product5, category: "Accessories", description: "Full-grain leather belt with brushed brass buckle. 3cm width for a refined, versatile accessory.", sizes: ["S", "M", "L"] },
  { id: 8, name: "Silk Scarf", price: 89, image: product6, category: "Accessories", description: "Hand-printed silk scarf with abstract geometric pattern. Lightweight and luxurious drape.", sizes: ["One Size"] },
];
