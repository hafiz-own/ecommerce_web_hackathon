import { searchProductsSemantic } from "@/lib/api/products";
import type { Product } from "@/lib/api/products";

/**
 * Common misspellings and corrections
 */
const spellCorrections: Record<string, string> = {
  // Shoes
  "sneeker": "sneaker", "sneekers": "sneakers", "sneker": "sneaker", "snekers": "sneakers",
  "shoos": "shoes", "shoez": "shoes", "shos": "shoes",
  "boot": "boots", "bootz": "boots", "bots": "boots",
  "loafer": "loafers", "lofer": "loafers", "loafers": "loafers", "lofers": "loafers",
  "sandle": "sandal", "sandles": "sandals", "sandels": "sandals",
  "heel": "heels", "heals": "heels", "hels": "heels",
  
  // Clothes
  "blaser": "blazer", "blazr": "blazer", "blzer": "blazer",
  "sweeter": "sweater", "sweter": "sweater", "sweatter": "sweater",
  "jackt": "jacket", "jaket": "jacket", "jcket": "jacket",
  "trouser": "trousers", "trousrs": "trousers", "trowsers": "trousers",
  "overcoat": "overcoat", "overcot": "overcoat", "ovrecoat": "overcoat",
  "cardgen": "cardigan", "cardigan": "cardigan", "cardigon": "cardigan",
  "turtlenck": "turtleneck", "turtleneck": "turtleneck",
  "dres": "dress", "drss": "dress",
  "chino": "chinos", "chenos": "chinos",
  "denim": "denim", "denm": "denim",
  
  // Bags
  "tote": "tote", "tot": "tote",
  "backpak": "backpack", "backpck": "backpack", "bakpack": "backpack",
  "crossbdy": "crossbody", "crosbody": "crossbody",
  "duffel": "duffle", "dufel": "duffle",
  
  // Accessories
  "belt": "belt", "blt": "belt",
  "scraf": "scarf", "scrf": "scarf",
  "sunglass": "sunglasses", "sungalsses": "sunglasses", "sunglases": "sunglasses",
  "wach": "watch", "wtch": "watch", "wtach": "watch",
  
  // Colors
  "wite": "white", "whte": "white",
  "blak": "black", "blck": "black",
  "blu": "blue", "bleu": "blue",
  "gry": "gray", "grey": "gray",
  "brwn": "brown", "bown": "brown",
  "rd": "red", "redd": "red",
  "grn": "green", "gren": "green",
  "pnk": "pink", "pnik": "pink",
  "beig": "beige", "bege": "beige",
  "nvy": "navy", "navey": "navy",
};

/**
 * Color keywords for filtering
 */
const colorKeywords = [
  "white", "black", "blue", "navy", "red", "green", "brown", "beige", "gray", "grey",
  "pink", "purple", "orange", "yellow", "cream", "tan", "burgundy", "maroon", "teal",
  "gold", "silver", "bronze", "camel", "olive", "coral", "mint", "ivory", "charcoal"
];

/**
 * Correct misspelled words in query
 */
function correctSpelling(query: string): string {
  const words = query.toLowerCase().split(/\s+/);
  const correctedWords = words.map(word => {
    // Check direct corrections
    if (spellCorrections[word]) {
      return spellCorrections[word];
    }
    
    // Check for close matches (simple edit distance)
    for (const [misspelled, correct] of Object.entries(spellCorrections)) {
      if (word.length > 3 && misspelled.length > 3) {
        // Check if word starts similarly
        if (word.substring(0, 3) === misspelled.substring(0, 3)) {
          const distance = levenshteinDistance(word, misspelled);
          if (distance <= 2) {
            return correct;
          }
        }
      }
    }
    
    return word;
  });
  
  return correctedWords.join(" ");
}

/**
 * Simple Levenshtein distance for spell checking
 */
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  
  const matrix: number[][] = [];
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}

/**
 * Extract color from query
 */
function extractColor(query: string): string | null {
  const lowerQuery = query.toLowerCase();
  for (const color of colorKeywords) {
    if (lowerQuery.includes(color)) {
      return color;
    }
  }
  return null;
}

/**
 * Extract main search keywords (product type)
 */
function extractProductKeywords(query: string): string[] {
  const lowerQuery = query.toLowerCase();
  const productTypes = [
    "sneakers", "sneaker", "shoes", "shoe", "boots", "boot", "loafers", "loafer",
    "sandals", "sandal", "heels", "heel", "flats", "flat", "oxford", "oxfords",
    "blazer", "jacket", "sweater", "cardigan", "turtleneck", "overcoat", "coat",
    "trousers", "pants", "chinos", "jeans", "shorts", "dress", "shirt",
    "tote", "bag", "backpack", "crossbody", "duffle", "purse", "clutch",
    "belt", "scarf", "watch", "sunglasses", "hat", "cap", "wallet"
  ];
  
  const found: string[] = [];
  for (const type of productTypes) {
    if (lowerQuery.includes(type)) {
      found.push(type);
    }
  }
  
  return found;
}

/**
 * Search result with metadata about the search
 */
export interface SearchResult {
  products: Product[];
  correctedQuery?: string;
  extractedColor?: string | null;
  noMatch: boolean;
  searchKeyword: string;
}

/**
 * Advanced semantic search with spell correction and attribute filtering
 */
export async function semanticSearch(
  query: string,
  limit: number = 10
): Promise<Product[]> {
  // Use our new API's semantic search
  try {
    const products = await searchProductsSemantic(query, limit);
    return products;
  } catch (error) {
    console.error('[RAG] Semantic search failed:', error);
    return [];
  }
}

/**
 * Advanced search that returns metadata about the search
 */
export async function advancedSearch(
  query: string,
  limit: number = 10
): Promise<SearchResult> {
  // Correct spelling first
  const correctedQuery = correctSpelling(query);
  const wasQueryCorrected = correctedQuery !== query.toLowerCase();
  
  // Extract color preference
  const extractedColor = extractColor(correctedQuery);
  
  // Extract product keywords for the search
  const productKeywords = extractProductKeywords(correctedQuery);
  const searchKeyword = productKeywords[0] || correctedQuery.split(/\s+/).filter(w => w.length > 2)[0] || correctedQuery;
  
  // Use our new API's semantic search
  try {
    const products = await searchProductsSemantic(correctedQuery, limit);
    
    return {
      products,
      correctedQuery: wasQueryCorrected ? correctedQuery : undefined,
      extractedColor,
      noMatch: products.length === 0,
      searchKeyword,
    };
  } catch (error) {
    console.error('[RAG] Advanced search failed:', error);
    return {
      products: [],
      correctedQuery: wasQueryCorrected ? correctedQuery : undefined,
      extractedColor,
      noMatch: true,
      searchKeyword,
    };
  }
}



