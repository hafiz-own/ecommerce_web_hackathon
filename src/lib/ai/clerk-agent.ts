import { GoogleGenerativeAI } from "@google/generative-ai";
import { getProducts } from "@/lib/api/products";
import { addToCart } from "@/lib/api/cart";
import ApiClient from "@/lib/api/client";
import type { Product } from "@/lib/api/products";
import { advancedSearch } from "@/lib/ai/rag";
import { createOrder, type ShippingAddress } from "@/lib/api/orders";

export interface ClerkMessage {
  role: "user" | "assistant" | "system";
  content: string;
  products?: Product[];
  action?: ClerkAction;
}

export interface ClerkAction {
  type: "filter" | "sort" | "set_filters" | "add_to_cart" | "navigate" | "coupon_created";
  payload?: any;
}

export interface ClerkResponse {
  message: string;
  products?: Product[];
  action?: ClerkAction;
}

// Store inventory cache (refreshed periodically)
let productCache: Product[] = [];
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function getInventory(): Promise<Product[]> {
  const now = Date.now();
  if (productCache.length > 0 && now - cacheTimestamp < CACHE_DURATION) {
    return productCache;
  }
  try {
    const products = await getProducts({}, { field: "created_at", order: "desc" });
    if (products.length > 0) {
      productCache = products;
      cacheTimestamp = now;
    }
    return productCache;
  } catch (error) {
    console.warn("[Clerk] Failed to fetch inventory:", error);
    return productCache;
  }
}

function formatInventoryForAI(products: Product[]): string {
  return products.map((p, i) => 
    `${i + 1}. "${p.name}" | $${p.price} | Category: ${p.category} | Sizes: ${p.sizes.join(", ")} | Stock: ${p.stock > 0 ? "In Stock" : "Out of Stock"} | ID: ${p.id}`
  ).join("\n");
}

// Function declarations for Gemini (using inline types)
const functionDeclarations = [
  {
    name: "search_products",
    description: "Search for products in the store inventory based on user's needs. Use this when user asks to see products, find items, or browse categories.",
    parameters: {
      type: "OBJECT" as const,
      properties: {
        query: {
          type: "STRING" as const,
          description: "Search terms - product type, category, style, occasion, etc."
        },
        category: {
          type: "STRING" as const,
          description: "Filter by category: Shoes, Clothes, Bags, or Accessories",
          enum: ["Shoes", "Clothes", "Bags", "Accessories"]
        },
        max_price: {
          type: "NUMBER" as const,
          description: "Maximum price filter"
        },
        sort_by: {
          type: "STRING" as const,
          description: "Sort order for results",
          enum: ["price_low", "price_high", "newest"]
        }
      },
      required: ["query"]
    }
  },
  {
    name: "add_to_cart",
    description: "Add a product to the user's shopping cart. Only use when user explicitly wants to buy/add a specific product AND has confirmed the size.",
    parameters: {
      type: "OBJECT" as const,
      properties: {
        product_id: {
          type: "STRING" as const,
          description: "The product ID to add"
        },
        product_name: {
          type: "STRING" as const,
          description: "The product name for confirmation"
        },
        size: {
          type: "STRING" as const,
          description: "The size selected by the user"
        },
        quantity: {
          type: "NUMBER" as const,
          description: "Quantity to add (default 1)"
        }
      },
      required: ["product_id", "product_name", "size"]
    }
  },
  {
    name: "apply_filter",
    description: "Update the shop page display - sort products or filter by category. Use when user wants to see cheaper/expensive options or browse a category.",
    parameters: {
      type: "OBJECT" as const,
      properties: {
        filter_type: {
          type: "STRING" as const,
          description: "Type of filter to apply",
          enum: ["sort_price_low", "sort_price_high", "filter_category"]
        },
        category: {
          type: "STRING" as const,
          description: "Category to filter by (only if filter_type is filter_category)"
        }
      },
      required: ["filter_type"]
    }
  },
  {
    name: "generate_discount",
    description: "Generate a discount coupon for the user. Only use when user gives a valid reason like birthday, wedding, student, first purchase, or bulk order.",
    parameters: {
      type: "OBJECT" as const,
      properties: {
        reason: {
          type: "STRING" as const,
          description: "The reason for the discount",
          enum: ["birthday", "wedding", "student", "first_purchase", "bulk_order", "valentines", "loyal_customer"]
        },
        discount_percent: {
          type: "NUMBER" as const,
          description: "Discount percentage (5-20)"
        }
      },
      required: ["reason", "discount_percent"]
    }
  },
  {
    name: "check_inventory",
    description: "Check if a specific product is available in a specific size/color.",
    parameters: {
      type: "OBJECT" as const,
      properties: {
        product_name: {
          type: "STRING" as const,
          description: "Name of the product to check"
        },
        size: {
          type: "STRING" as const,
          description: "Size to check availability for"
        }
      },
      required: ["product_name"]
    }
  }
];

export class ClerkAgent {
  private apiKey: string | null;
  private genAI: GoogleGenerativeAI | null;
  private model: any;
  private chatSession: any;
  private inventory: Product[] = [];
  private lastShownProducts: Product[] = [];
  private isInitialized: boolean = false;
  private pendingAddToCart: { product: Product; quantity: number } | null = null;
  private checkoutState: {
    step: 'idle' | 'email' | 'firstName' | 'lastName' | 'address' | 'city' | 'state' | 'zip' | 'confirm';
    shipping: Partial<ShippingAddress>;
  } = { step: 'idle', shipping: {} };

  private isProductRequest(message: string): boolean {
    const lower = message.toLowerCase();

    // Intent verbs/phrases (stable)
    const intentPhrases = [
      'show me',
      'find',
      'looking for',
      'recommend',
      'suggest',
      'do you have',
      'i want',
      'need',
      'browse',
      'search',
    ];

    if (intentPhrases.some(p => lower.includes(p))) return true;

    // Data-driven triggers from inventory (auto-updates when new products are added)
    const categories = new Set((this.inventory || []).map(p => p.category).filter(Boolean));
    for (const category of categories) {
      if (lower.includes(String(category).toLowerCase())) return true;
    }

    const tagSet = new Set<string>();
    for (const p of this.inventory || []) {
      for (const t of p.tags || []) {
        const cleaned = String(t).trim().toLowerCase();
        if (cleaned.length >= 3) tagSet.add(cleaned);
      }
    }
    for (const t of tagSet) {
      if (lower.includes(t)) return true;
    }

    // Fallback: if message contains a significant token from any product name
    const tokens = lower.split(/\W+/).filter(w => w.length >= 4);
    for (const p of this.inventory || []) {
      const nameTokens = String(p.name || '').toLowerCase().split(/\W+/).filter(w => w.length >= 4);
      if (nameTokens.some(nt => tokens.includes(nt))) return true;
    }

    return false;
  }

  private normalizeSizeToken(token: string): string {
    const t = String(token || '').trim().toUpperCase();
    // Normalize common speech-to-text variants
    if (t === 'EXTRA SMALL') return 'XS';
    if (t === 'EXTRA LARGE') return 'XL';
    if (t === 'XXL' || t === '2XL') return 'XXL';
    if (t === 'XXXL' || t === '3XL') return 'XXXL';
    return t.replace(/\s+/g, '');
  }

  private extractSizeFromMessage(message: string, product: Product): string | null {
    const lower = message.toLowerCase();
    const sizes = (product.sizes || []).map(s => String(s));
    for (const s of sizes) {
      const normalized = this.normalizeSizeToken(s);
      if (!normalized) continue;
      if (lower.includes(normalized.toLowerCase())) return s;
    }

    // Common single-letter / short size mentions
    const tokens = lower.split(/\W+/).filter(Boolean);
    for (const tok of tokens) {
      const normTok = this.normalizeSizeToken(tok);
      const match = sizes.find(s => this.normalizeSizeToken(s) === normTok);
      if (match) return match;
    }

    return null;
  }

  private resolveProductReference(message: string): Product | null {
    const lower = message.toLowerCase();
    const list = this.lastShownProducts || [];

    // ordinal references
    const ordinals: Array<{ patterns: RegExp[]; index: number }> = [
      { patterns: [/\bfirst\b/, /\b1st\b/, /\bone\b/], index: 0 },
      { patterns: [/\bsecond\b/, /\b2nd\b/, /\btwo\b/], index: 1 },
      { patterns: [/\bthird\b/, /\b3rd\b/, /\bthree\b/], index: 2 },
    ];
    for (const o of ordinals) {
      if (o.patterns.some(p => p.test(lower))) {
        if (list[o.index]) return list[o.index];
      }
    }

    // vague reference
    if (/(\bthat\b|\bthis\b|\bthe one\b)/.test(lower)) {
      if (list[0]) return list[0];
    }

    // Try to match by product name tokens
    const tokens = lower.split(/\W+/).filter(w => w.length >= 4);
    for (const p of list) {
      const nameTokens = String(p.name || '').toLowerCase().split(/\W+/).filter(w => w.length >= 4);
      if (nameTokens.some(nt => tokens.includes(nt))) return p;
    }

    // Final fallback: match inventory by contains
    for (const p of this.inventory || []) {
      const pn = String(p.name || '').toLowerCase();
      if (pn && lower.includes(pn)) return p;
    }

    return null;
  }

  private isAddToCartIntent(message: string): boolean {
    const lower = message.toLowerCase();
    return (
      lower.includes('add to cart') ||
      (lower.includes('add') && lower.includes('cart')) ||
      lower.includes('buy') ||
      lower.includes('purchase')
    );
  }

  private isCheckoutIntent(message: string): boolean {
    const lower = message.toLowerCase();
    return (
      lower.includes('checkout') ||
      lower.includes('place order') ||
      lower.includes('complete purchase') ||
      lower.includes('buy now') ||
      lower.includes('pay now')
    );
  }

  private isAffirmative(message: string): boolean {
    const lower = message.toLowerCase().trim();
    return ['yes', 'y', 'yeah', 'yep', 'sure', 'ok', 'okay', 'confirm', 'do it', 'place it'].some(w => lower === w || lower.includes(w));
  }

  private isNegative(message: string): boolean {
    const lower = message.toLowerCase().trim();
    return ['no', 'n', 'nope', 'cancel', 'stop', 'not now'].some(w => lower === w || lower.includes(w));
  }

  constructor() {
    this.apiKey = import.meta.env.VITE_GEMINI_API_KEY || null;
    
    if (this.apiKey) {
      this.genAI = new GoogleGenerativeAI(this.apiKey);
    } else {
      this.genAI = null;
      this.model = null;
      console.warn("[Clerk] No API key - AI features disabled");
    }
  }

  private async ensureInitialized(): Promise<boolean> {
    if (this.isInitialized && this.model && this.chatSession) {
      return true;
    }
    
    if (!this.genAI) return false;
    
    try {
      // Load inventory for context
      this.inventory = await getInventory();
      
      if (this.inventory.length === 0) {
        console.warn("[Clerk] No inventory loaded");
      }
      
      const systemInstruction = this.buildSystemPrompt();
      
      this.model = this.genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction,
        tools: [{ functionDeclarations }] as any,
      });
      
      // Start a chat session
      this.chatSession = this.model.startChat({
        history: [],
      });
      
      this.isInitialized = true;
      console.log("[Clerk] AI Model initialized with", this.inventory.length, "products");
      return true;
    } catch (error) {
      console.error("[Clerk] Failed to initialize model:", error);
      this.model = null;
      return false;
    }
  }

  private buildSystemPrompt(): string {
    const inventoryList = formatInventoryForAI(this.inventory);
    
    return `You are "The Clerk" - a friendly, knowledgeable personal shopper at TrendZone, a modern fashion store. You're not a robot - you're like a helpful friend who works at a cool clothing store.

## YOUR PERSONALITY
- Warm, friendly, and conversational (not formal or robotic)
- Enthusiastic about fashion but not pushy
- Helpful and patient, like a real store clerk
- Use natural language, occasional emojis, and be personable
- Remember context from the conversation

## CURRENT STORE INVENTORY (${this.inventory.length} products)
${inventoryList}

## YOUR CAPABILITIES (use function calls)
1. **search_products** - Help customers find products based on their needs, style, occasion
2. **add_to_cart** - When they decide to buy, help them choose size and add to cart
3. **generate_discount** - For valid reasons (birthday, wedding, student, bulk), offer 10-20% off
4. **apply_filter** - Sort by price or filter by category when asked
5. **check_inventory** - Check if specific product/size is available

## IMPORTANT RULES
1. ONLY recommend products from the inventory above - never make up products
2. When showing products, mention their actual name, price, and key features
3. Before adding to cart, ALWAYS confirm the SIZE with the customer
4. For discounts, only valid reasons get codes: birthday (15%), wedding (20%), student (10%), first order (10%), bulk (12%)
5. Be conversational! Don't just list products - engage naturally
6. If asked about something not in inventory, suggest alternatives we DO have
7. **CRITICAL: ALWAYS call search_products or apply_filter when user asks for products, even if asking follow-up questions**
8. When user asks for a specific item (sunglasses, shoes, etc.) - ALWAYS call search_products to show them
9. When user mentions an occasion (birthday, wedding) - call search_products to show relevant outfit ideas AND generate_discount if appropriate
10. Don't just ask questions without showing products - be proactive and show relevant items

## RESPONSE FORMAT
- Keep responses concise but friendly (2-4 sentences usually)
- When showing products, describe them naturally, don't just list
- ALWAYS call the appropriate function to execute actions
- After showing products, ask follow-up questions to help them decide

## EXAMPLES OF GOOD RESPONSES
- User: "I want shoes" → Call search_products with query:"shoes", then describe the options naturally
- User: "It's my birthday" → Call BOTH generate_discount AND search_products to show birthday outfit ideas
- User: "can you provide sunglasses" → Call search_products with query:"sunglasses" to show sunglasses options
- User: "suggest me something for birthday" → Call search_products for outfit ideas AND generate_discount
- User: "Add the blazer in size M" → Call add_to_cart with the product details
- User: "Show me cheaper options" → Call apply_filter with filter_type:"sort_price_low"
- User: "today's my friend wedding" → Call search_products for wedding outfit ideas (formal clothes, accessories)

## BAD RESPONSES (AVOID THESE)
- NEVER just ask questions without showing products
- NEVER say "Let me show you" without actually calling search_products
- NEVER respond without a function call if user is asking for products`;
  }

  async chat(userMessage: string, sessionId: string): Promise<ClerkResponse> {
    // Always refresh inventory early for reference resolution
    this.inventory = await getInventory();

    // Start checkout flow
    if (this.checkoutState.step === 'idle' && this.isCheckoutIntent(userMessage)) {
      this.checkoutState = { step: 'email', shipping: {} };
      return {
        message: 'Absolutely — let’s checkout. What email should I use for the order?',
        action: { type: 'navigate', payload: { path: '/cart' } }
      };
    }

    // Checkout multi-turn state machine
    if (this.checkoutState.step !== 'idle') {
      if (this.isNegative(userMessage)) {
        this.checkoutState = { step: 'idle', shipping: {} };
        return { message: 'No problem — checkout cancelled. Want to keep browsing or update your cart?', action: { type: 'navigate', payload: { path: '/cart' } } };
      }

      const s = this.checkoutState.shipping;

      const advance = (next: typeof this.checkoutState.step) => {
        this.checkoutState = { ...this.checkoutState, step: next };
      };

      switch (this.checkoutState.step) {
        case 'email': {
          const email = String(userMessage || '').trim();
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return { message: 'What email should I use for the order? (example: you@example.com)' };
          }
          s.email = email;
          advance('firstName');
          return { message: 'Great — what’s your first name?' };
        }
        case 'firstName': {
          const firstName = String(userMessage || '').trim();
          if (firstName.length < 1) return { message: 'What’s your first name?' };
          s.firstName = firstName;
          advance('lastName');
          return { message: 'And your last name?' };
        }
        case 'lastName': {
          const lastName = String(userMessage || '').trim();
          if (lastName.length < 1) return { message: 'And your last name?' };
          s.lastName = lastName;
          advance('address');
          return { message: 'What’s your shipping address (street + number)?' };
        }
        case 'address': {
          const address = String(userMessage || '').trim();
          if (address.length < 3) return { message: 'What’s your shipping address (street + number)?' };
          s.address = address;
          advance('city');
          return { message: 'City?' };
        }
        case 'city': {
          const city = String(userMessage || '').trim();
          if (city.length < 2) return { message: 'City?' };
          s.city = city;
          advance('state');
          return { message: 'State / province?' };
        }
        case 'state': {
          const state = String(userMessage || '').trim();
          if (state.length < 2) return { message: 'State / province?' };
          s.state = state;
          advance('zip');
          return { message: 'ZIP / postal code?' };
        }
        case 'zip': {
          const zip = String(userMessage || '').trim();
          if (zip.length < 3) return { message: 'ZIP / postal code?' };
          s.zip = zip;
          advance('confirm');

          const coupon = (() => {
            try {
              return localStorage.getItem('applied_coupon_code') || undefined;
            } catch {
              return undefined;
            }
          })();

          return {
            message:
              `Perfect. Please confirm your details:\n` +
              `- Email: ${s.email}\n` +
              `- Name: ${s.firstName} ${s.lastName}\n` +
              `- Address: ${s.address}, ${s.city}, ${s.state} ${s.zip}` +
              (coupon ? `\n- Coupon: ${coupon}` : '') +
              `\n\nReply **yes** to place the order, or **cancel**.`
          };
        }
        case 'confirm': {
          if (!this.isAffirmative(userMessage)) {
            return { message: 'Reply **yes** to place the order, or **cancel**.' };
          }

          const coupon = (() => {
            try {
              return localStorage.getItem('applied_coupon_code') || undefined;
            } catch {
              return undefined;
            }
          })();

          const shipping = this.checkoutState.shipping as ShippingAddress;
          this.checkoutState = { step: 'idle', shipping: {} };

          try {
            const order = await createOrder(shipping, coupon);
            if (order) {
              return {
                message: `All set — your order is placed! Order ID: **${order.id}**`,
                action: { type: 'navigate', payload: { path: '/checkout' } }
              };
            }
          } catch (error: any) {
            const msg = String(error?.message || '');
            if (msg.includes('401') || msg.toLowerCase().includes('token')) {
              return {
                message: 'To place the order, please sign in first — I’ll take you there.',
                action: { type: 'navigate', payload: { path: '/signin' } }
              };
            }
          }

          return {
            message: 'I couldn’t place the order automatically. I’m taking you to checkout so you can complete it there.',
            action: { type: 'navigate', payload: { path: '/checkout' } }
          };
        }
        default:
          break;
      }
    }

    // Multi-turn: if we're waiting for a size, treat the next message as a size response.
    if (this.pendingAddToCart) {
      const pending = this.pendingAddToCart;
      const extractedSize = this.extractSizeFromMessage(userMessage, pending.product);
      if (extractedSize) {
        this.pendingAddToCart = null;
        try {
          await addToCart(pending.product.id, extractedSize, pending.quantity);
        } catch (error) {
          console.warn('[Clerk] Cart add failed (pending flow):', error);
        }
        return {
          message: `Perfect — I added **${pending.product.name}** (size ${extractedSize}) to your cart.`,
          products: [pending.product],
          action: {
            type: 'add_to_cart',
            payload: { productId: pending.product.id, size: extractedSize, quantity: pending.quantity }
          }
        };
      }

      // Still waiting for a size
      return {
        message: `Which size would you like for **${pending.product.name}**? Available: ${pending.product.sizes.join(', ')}`,
        products: [pending.product],
      };
    }

    // If Gemini doesn't help, handle simple add-to-cart intent locally.
    if (this.isAddToCartIntent(userMessage)) {
      const product = this.resolveProductReference(userMessage);
      if (product) {
        const extractedSize = this.extractSizeFromMessage(userMessage, product);
        if (!extractedSize) {
          this.pendingAddToCart = { product, quantity: 1 };
          return {
            message: `Sure — what size should I add for **${product.name}**? Available: ${product.sizes.join(', ')}`,
            products: [product]
          };
        }

        try {
          await addToCart(product.id, extractedSize, 1);
        } catch (error) {
          console.warn('[Clerk] Cart add failed (local intent):', error);
        }

        return {
          message: `Done — **${product.name}** (size ${extractedSize}) is in your cart.`,
          products: [product],
          action: { type: 'add_to_cart', payload: { productId: product.id, size: extractedSize, quantity: 1 } }
        };
      }
    }

    // Ensure model is initialized
    const initialized = await this.ensureInitialized();

    // EnsureInitialized may have refreshed inventory too, but keep this.inventory current above.
    
    // If not initialized, use fallback
    if (!initialized || !this.chatSession) {
      console.warn("[Clerk] Using fallback response - not initialized");
      return this.fallbackResponse(userMessage);
    }

    try {
      // Send message to Gemini
      const result = await this.chatSession.sendMessage(userMessage);
      const response = result.response;
      
      // Check for function calls
      const functionCalls = response.functionCalls();
      
      if (functionCalls && functionCalls.length > 0) {
        return await this.handleFunctionCalls(functionCalls, response.text(), sessionId);
      }
      
      // No function call - just a text response (conversation/follow-up question)
      const text = response.text();

      // If user asked for products but Gemini didn't call tools, enforce a search.
      if (this.isProductRequest(userMessage)) {
        const products = await this.executeSearch({ query: userMessage });
        if (products.length > 0) {
          this.lastShownProducts = products;
          return {
            message: text || "Of course — here are some great options I found:",
            products,
            action: {
              type: "set_filters",
              payload: { searchQuery: userMessage }
            }
          };
        }
      }
      
      // Don't show products for conversational responses (follow-up questions, clarifications)
      // Only show products when we explicitly searched for them via function calls
      return {
        message: text || "I'm here to help! What are you looking for today?",
        // Don't carry over old products - this was causing wrong products to show
        // Products should only be returned when Gemini calls search_products function
      };
      
    } catch (error: any) {
      console.error("[Clerk] Chat error:", error);
      
      // Reset session on error
      this.isInitialized = false;
      
      // If it's a rate limit or API error, use fallback
      if (error.message?.includes("429") || error.message?.includes("quota")) {
        return {
          message: "I'm a bit busy right now! Let me show you some of our popular items while things calm down.",
          products: this.inventory.slice(0, 4),
        };
      }
      
      return this.fallbackResponse(userMessage);
    }
  }

  private async handleFunctionCalls(functionCalls: any[], textResponse: string, sessionId: string): Promise<ClerkResponse> {
    let products: Product[] = [];
    let action: ClerkAction | undefined;
    let message = textResponse || "";
    
    for (const call of functionCalls) {
      const { name, args } = call;
      
      switch (name) {
        case "search_products": {
          const searchResults = await this.executeSearch(args);
          products = searchResults;
          this.lastShownProducts = searchResults;
          
          if (args.category) {
            action = {
              type: "set_filters",
              payload: { category: args.category }
            };
          }
          break;
        }
        
        case "add_to_cart": {
          const cartResult = await this.executeAddToCart(args, sessionId);
          if (cartResult.success) {
            products = cartResult.product ? [cartResult.product] : [];
            action = {
              type: "add_to_cart",
              payload: {
                productId: args.product_id,
                size: args.size,
                quantity: args.quantity || 1
              }
            };
            if (cartResult.message) message = cartResult.message;
          } else {
            message = cartResult.message;
          }
          break;
        }
        
        case "apply_filter": {
          const filterResult = await this.executeFilter(args);
          products = filterResult.products;
          this.lastShownProducts = filterResult.products;
          action = filterResult.action;
          break;
        }
        
        case "generate_discount": {
          const discountResult = await this.executeDiscount(args, sessionId);
          message = discountResult.message;
          if (discountResult.couponCode) {
            action = {
              type: "coupon_created",
              payload: { code: discountResult.couponCode }
            };
          }
          break;
        }
        
        case "check_inventory": {
          const inventoryResult = await this.executeInventoryCheck(args);
          products = inventoryResult.products;
          if (!message) message = inventoryResult.message;
          break;
        }
      }
    }
    
    const hasProducts = products.length > 0;
    const normalized = String(message || "").trim();

    // Gemini may return function calls without any visible text. Never return an empty message.
    if (!normalized) {
      if (action?.type === 'add_to_cart') {
        message = "Done — I added that to your cart.";
      } else if (action?.type === 'filter') {
        message = hasProducts ? "Here are some options you might like:" : "Done — I've updated the shop view.";
      } else if (hasProducts) {
        message = "Here are some options you might like:";
      } else {
        message = "Got it.";
      }
    }

    return { message, products: hasProducts ? products : undefined, action };
  }

  private async executeSearch(args: any): Promise<Product[]> {
    const { query, category, max_price, sort_by } = args;

    let results: Product[] = [];

    const extractKeywords = (raw: string): string[] => {
      const q = String(raw || '').toLowerCase();
      const stop = new Set([
        'the', 'a', 'an', 'and', 'or', 'for', 'to', 'of', 'in', 'on', 'with', 'without', 'under', 'over',
        'me', 'my', 'i', 'im', "i'm", 'want', 'need', 'show', 'find', 'looking', 'search', 'buy',
        'please', 'cheap', 'affordable', 'best', 'good', 'new'
      ]);

      const tokens = q.split(/\W+/).filter(Boolean);
      const base = tokens
        .map(t => (t.endsWith('s') && t.length > 3 ? t.slice(0, -1) : t))
        .filter(t => t.length > 2 && !stop.has(t));

      const synonyms: Record<string, string[]> = {
        pants: ['trousers', 'slacks'],
        trousers: ['pants', 'slacks'],
        slacks: ['pants', 'trousers'],
        sneakers: ['shoes', 'trainer', 'trainers'],
        sneaker: ['shoes', 'trainer', 'trainers'],
        trainers: ['sneakers', 'shoes'],
        trainer: ['sneakers', 'shoes'],
        handbag: ['bag', 'purse'],
        purse: ['bag', 'handbag'],
      };

      const out = new Set<string>();
      for (const t of base) {
        out.add(t);
        const syn = synonyms[t];
        if (syn) syn.forEach(s => out.add(s));
      }
      return Array.from(out);
    };

    const keywordRankInventory = (kw: string[]): Product[] => {
      if (!kw.length) return [];
      const scored = this.inventory
        .map((p) => {
          const text = `${p.name} ${p.category} ${p.description} ${(p.tags || []).join(' ')}`.toLowerCase();
          let score = 0;
          for (const k of kw) {
            if (p.name?.toLowerCase().includes(k)) score += 4;
            else if (p.category?.toLowerCase().includes(k)) score += 3;
            else if ((p.tags || []).some(t => String(t).toLowerCase().includes(k))) score += 2;
            else if (text.includes(k)) score += 1;
          }
          return { p, score };
        })
        .filter(x => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(x => x.p);

      return scored;
    };

    if (query) {
      const keywords = extractKeywords(query);
      results = keywordRankInventory(keywords);

      if (results.length === 0) {
        try {
          const rag = await advancedSearch(query, 20);
          results = rag.products;
        } catch (error) {
          console.warn('[Clerk] advancedSearch failed, falling back to inventory filter:', error);
        }
      }
    }

    if (results.length === 0) {
      results = [...this.inventory];

      if (category) {
        results = results.filter(p => p.category === category);
      }

      if (max_price) {
        results = results.filter(p => p.price <= max_price);
      }

      if (query) {
        const queryLower = query.toLowerCase();
        const queryWords = queryLower.split(/\s+/).filter((w: string) => w.length > 2);
        results = results.filter(p => {
          const searchText = `${p.name} ${p.description} ${p.category} ${(p.tags || []).join(" ")}`.toLowerCase();
          return queryWords.some((word: string) => searchText.includes(word)) || searchText.includes(queryLower);
        });
      }
    }

    if (category) {
      results = results.filter(p => p.category === category);
    }

    if (max_price) {
      results = results.filter(p => p.price <= max_price);
    }

    if (sort_by === "price_low") {
      results.sort((a, b) => a.price - b.price);
    } else if (sort_by === "price_high") {
      results.sort((a, b) => b.price - a.price);
    }

    return results.slice(0, 6);
  }

  private async executeAddToCart(args: any, sessionId: string): Promise<{success: boolean; message: string; product?: Product}> {
    const { product_id, product_name, size, quantity = 1 } = args;
    
    // Find the product
    const product = this.inventory.find(p => p.id === product_id) || 
                    this.inventory.find(p => p.name.toLowerCase() === product_name.toLowerCase()) ||
                    this.inventory.find(p => p.name.toLowerCase().includes(product_name.toLowerCase()));
    
    if (!product) {
      return { success: false, message: `I couldn't find "${product_name}" in our inventory. Let me show you what we have!` };
    }
    
    // Validate size
    const validSize = product.sizes.find(s => s.toLowerCase() === size.toLowerCase()) || 
                      product.sizes.find(s => s === size);
    
    if (!validSize) {
      // Start a multi-turn flow: ask for a valid size.
      this.pendingAddToCart = { product, quantity };
      return { 
        success: false, 
        message: `Hmm, size "${size}" isn't available for ${product.name}. We have: ${product.sizes.join(", ")}. Which one would you like?` 
      };
    }
    
    // Add to cart
    try {
      await addToCart(product.id, validSize, quantity);
    } catch (error) {
      console.warn("[Clerk] Cart add failed:", error);
    }
    
    return { 
      success: true, 
      message: `Perfect! I've added **${product.name}** (size ${validSize}) to your cart! 🛒 Ready to checkout, or would you like to keep browsing?`,
      product 
    };
  }

  private async executeFilter(args: any): Promise<{products: Product[]; action: ClerkAction}> {
    const { filter_type, category } = args;
    
    let products = [...this.inventory];
    let actionPayload: any = {};
    
    if (filter_type === "sort_price_low") {
      products.sort((a, b) => a.price - b.price);
      actionPayload = { filterType: "sort_by_price", value: "asc" };
    } else if (filter_type === "sort_price_high") {
      products.sort((a, b) => b.price - a.price);
      actionPayload = { filterType: "sort_by_price", value: "desc" };
    } else if (filter_type === "filter_category" && category) {
      products = products.filter(p => p.category === category);
      actionPayload = { filterType: "filter_by_category", value: category };
    }
    
    return {
      products: products.slice(0, 5),
      action: { type: "filter", payload: actionPayload }
    };
  }

  private async executeDiscount(args: any, sessionId: string): Promise<{message: string; couponCode?: string}> {
    const { reason, discount_percent } = args;
    
    // Validate discount
    const validDiscounts: Record<string, number> = {
      birthday: 15,
      wedding: 20,
      student: 10,
      first_purchase: 10,
      bulk_order: 12,
      valentines: 10,
      loyal_customer: 10,
    };
    
    const discount = validDiscounts[reason] || Math.min(discount_percent, 15);
    
    // Generate coupon code
    const prefixes: Record<string, string> = {
      birthday: "BDAY",
      wedding: "WEDDING",
      student: "STUDENT",
      first_purchase: "WELCOME",
      bulk_order: "BULK",
      valentines: "LOVE",
      loyal_customer: "LOYAL",
    };
    
    const prefix = prefixes[reason] || "SPECIAL";
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    let couponCode = `${prefix}-${discount}${suffix}`;

    // Create coupon in backend DB (session-bound, single-use)
    try {
      const response = await ApiClient.post<{ coupon: { code: string } }>(
        '/ai/coupons',
        { reason, discount_percent: discount },
        false
      );
      couponCode = response.coupon.code;
    } catch (error) {
      console.warn('[Clerk] Failed to create coupon in backend:', error);
    }
    
    const messages: Record<string, string> = {
      birthday: `Happy Birthday! 🎂 Here's a special ${discount}% discount just for you!`,
      wedding: `Congratulations on your wedding! 💍 Here's ${discount}% off to celebrate!`,
      student: `Student discount activated! 📚 Here's ${discount}% off for you.`,
      first_purchase: `Welcome to TrendZone! 🎉 Here's ${discount}% off your first order!`,
      bulk_order: `Thanks for the bulk order! Here's ${discount}% off for buying multiple items.`,
      valentines: `Spreading the love! 💝 Here's ${discount}% off for Valentine's!`,
      loyal_customer: `Thanks for being a loyal customer! 🌟 Here's ${discount}% off!`,
    };
    
    return {
      message: `${messages[reason] || `Here's a special ${discount}% discount for you!`}\n\nYour code: **${couponCode}**\n\nUse it at checkout!`,
      couponCode,
    };
  }

  private async executeInventoryCheck(args: any): Promise<{products: Product[]; message: string}> {
    const { product_name, size } = args;
    
    // Find matching products
    const matches = this.inventory.filter(p => 
      p.name.toLowerCase().includes(product_name.toLowerCase())
    );
    
    if (matches.length === 0) {
      return {
        products: [],
        message: `I don't see "${product_name}" in our current inventory. Would you like me to show you similar items?`
      };
    }
    
    const product = matches[0];
    const availability = product.stock > 0 ? "in stock" : "currently out of stock";
    let message = `**${product.name}** is ${availability}!`;
    
    if (size && product.sizes.map(s => s.toLowerCase()).includes(size.toLowerCase())) {
      message += ` Size ${size} is available.`;
    } else if (size) {
      message += ` We don't have size ${size}, but we do have: ${product.sizes.join(", ")}`;
    } else {
      message += ` Available sizes: ${product.sizes.join(", ")}`;
    }
    
    return { products: matches.slice(0, 3), message };
  }

  private fallbackResponse(userMessage: string): ClerkResponse {
    const lower = userMessage.toLowerCase();
    
    // Simple keyword matching as fallback when API is unavailable
    if (lower.includes("shoe") || lower.includes("sneaker") || lower.includes("boot") || lower.includes("loafer")) {
      const shoes = this.inventory.filter(p => p.category === "Shoes").slice(0, 4);
      return {
        message: "Let me show you our shoe collection! We've got some great options - from casual sneakers to classic boots. Take a look!",
        products: shoes.length > 0 ? shoes : undefined,
        action: { type: "filter", payload: { filterType: "filter_by_category", value: "Shoes" } }
      };
    }
    
    if (lower.includes("clothes") || lower.includes("clothing") || lower.includes("blazer") || lower.includes("jacket") || lower.includes("sweater")) {
      const clothes = this.inventory.filter(p => p.category === "Clothes").slice(0, 4);
      return {
        message: "Here's our clothing collection! We've got everything from cozy sweaters to sharp blazers.",
        products: clothes.length > 0 ? clothes : undefined,
        action: { type: "filter", payload: { filterType: "filter_by_category", value: "Clothes" } }
      };
    }
    
    if (lower.includes("bag") || lower.includes("tote") || lower.includes("backpack")) {
      const bags = this.inventory.filter(p => p.category === "Bags").slice(0, 4);
      return {
        message: "Check out our bag collection! Perfect for work, travel, or everyday use.",
        products: bags.length > 0 ? bags : undefined,
        action: { type: "filter", payload: { filterType: "filter_by_category", value: "Bags" } }
      };
    }
    
    if (lower.includes("cheap") || lower.includes("affordable") || lower.includes("budget") || lower.includes("low price")) {
      const sorted = [...this.inventory].sort((a, b) => a.price - b.price).slice(0, 5);
      return {
        message: "Looking for something budget-friendly? Here are our most affordable options - great quality without breaking the bank!",
        products: sorted,
        action: { type: "filter", payload: { filterType: "sort_by_price", value: "asc" } }
      };
    }
    
    if (lower.includes("expensive") || lower.includes("premium") || lower.includes("luxury") || lower.includes("high end")) {
      const sorted = [...this.inventory].sort((a, b) => b.price - a.price).slice(0, 5);
      return {
        message: "Looking for something special? Here are our premium picks - top quality pieces that make a statement!",
        products: sorted,
        action: { type: "filter", payload: { filterType: "sort_by_price", value: "desc" } }
      };
    }
    
    if (lower.includes("birthday")) {
      return this.executeDiscount({ reason: "birthday", discount_percent: 15 }, "fallback").then(result => ({
        message: result.message,
        action: result.couponCode ? { type: "filter", payload: { action: "apply_coupon", couponCode: result.couponCode } } : undefined
      })) as any; // Will be resolved
    }
    
    if (lower.includes("wedding")) {
      return {
        message: "Congratulations on the wedding! 💍 I'd love to help you find the perfect outfit AND get you a special discount! Just let me know what you're looking for.",
      };
    }
    
    if (lower.includes("discount") || lower.includes("deal") || lower.includes("coupon")) {
      return {
        message: "I'd love to help with a discount! We offer special codes for:\n\n• 🎂 Birthdays - 15% off\n• 💍 Weddings - 20% off\n• 📚 Students - 10% off\n• 🆕 First order - 10% off\n\nJust let me know your occasion!",
      };
    }
    
    if (lower.includes("cart") || lower.includes("checkout")) {
      return {
        message: "You can check your cart by clicking the cart icon in the top right! Ready to checkout? Everything's waiting for you there. 🛒",
      };
    }
    
    if (lower.includes("hi") || lower.includes("hello") || lower.includes("hey")) {
      return {
        message: "Hey there! Welcome to TrendZone! 👋 I'm The Clerk, your personal shopping buddy. Looking for anything specific today? Shoes, clothes, bags - or maybe you want me to surprise you with some recommendations?",
        products: this.inventory.slice(0, 4),
      };
    }
    
    if (lower.includes("thank") || lower.includes("bye") || lower.includes("goodbye")) {
      return {
        message: "You're welcome! It was great helping you today. Come back anytime - I'll be here! Happy shopping! 🛍️",
      };
    }
    
    // Default: show popular items
    return {
      message: "Hey! I'm here to help you find the perfect stuff. Here are some of our popular items - or just tell me what you're looking for! I can help with shoes, clothes, bags, accessories... and I might even have some discounts for you! 😉",
      products: this.inventory.slice(0, 4),
    };
  }

  clearHistory() {
    this.lastShownProducts = [];
    this.isInitialized = false;
    if (this.genAI) {
      this.ensureInitialized(); // Reinitialize with fresh chat
    }
  }

  getContext() {
    return {
      inventoryCount: this.inventory.length,
      lastShownProductCount: this.lastShownProducts.length,
      hasModel: !!this.model,
      isInitialized: this.isInitialized,
    };
  }
}
