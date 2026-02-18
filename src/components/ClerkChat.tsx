import { useState, useRef, useEffect, FormEvent, useMemo } from "react";
import { ClerkAgent, type ClerkResponse } from "@/lib/ai/clerk-agent";
import { useFilter } from "@/contexts/FilterContext";
import { useCart } from "@/contexts/CartContext";
import { useUserAuth } from "@/contexts/UserAuthContext";
import { Send, Bot, Paperclip, Mic, CornerDownLeft, Sparkles, Star, ExternalLink, User } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ChatBubble,
  ChatBubbleAvatar,
  ChatBubbleMessage,
} from "@/components/ui/chat-bubble";
import { ChatInput } from "@/components/ui/chat-input";
import {
  ExpandableChat,
  ExpandableChatHeader,
  ExpandableChatBody,
  ExpandableChatFooter,
} from "@/components/ui/expandable-chat";
import { ChatMessageList } from "@/components/ui/chat-message-list";
import { addToSearchHistory } from "@/lib/api/products";
import { trackActivity } from "@/lib/api/activity";
import type { Product } from "@/lib/api/products";
import { toast } from "sonner";

// Format markdown-like text to React elements
const formatMessage = (text: string): React.ReactNode[] => {
  const elements: React.ReactNode[] = [];
  let key = 0;
  
  // Split by lines first to handle bullet points
  const lines = text.split('\n');
  
  lines.forEach((line, lineIndex) => {
    // Process each line for bold text
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    const lineElements: React.ReactNode[] = [];
    
    parts.forEach((part, partIndex) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        // Bold text
        lineElements.push(<strong key={`${key++}`}>{part.slice(2, -2)}</strong>);
      } else if (part) {
        // Regular text - also handle *italic* if present
        const italicParts = part.split(/(\*[^*]+\*)/g);
        italicParts.forEach((iPart) => {
          if (iPart.startsWith("*") && iPart.endsWith("*") && !iPart.startsWith("**")) {
            lineElements.push(<em key={`${key++}`}>{iPart.slice(1, -1)}</em>);
          } else if (iPart) {
            lineElements.push(iPart);
          }
        });
      }
    });
    
    // Add the line content
    if (lineElements.length > 0) {
      elements.push(<span key={`line-${lineIndex}`}>{lineElements}</span>);
    }
    
    // Add line break if not the last line
    if (lineIndex < lines.length - 1) {
      elements.push(<br key={`br-${lineIndex}`} />);
    }
  });
  
  return elements;
};

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  products?: Product[];
  action?: any;
  timestamp: Date;
  couponCode?: string;
}

const ClerkChat = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useUserAuth();
  
  // Get user avatar URL or use default placeholder
  const userAvatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;
  const userDisplayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split("@")[0] || "You";
  const userInitial = userDisplayName.charAt(0).toUpperCase();
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: "assistant",
      content: "Hi! I'm The Clerk, your AI personal shopper. I can help you:\n\n• Find products (\"Show me summer outfits\")\n• Add items to cart (\"Add the blazer to my cart\")\n• Filter the shop (\"Show me cheaper options\")\n• Get discounts (\"It's my birthday!\")\n\nWhat are you looking for today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const agentRef = useRef<ClerkAgent | null>(null);
  const recognitionRef = useRef<any>(null);
  const { applyFilter, setSort, setCategory, setSearchQuery } = useFilter();
  const { addToCart: addToCartItem, applyCoupon } = useCart();

  // Initialize agent
  useEffect(() => {
    agentRef.current = new ClerkAgent();
  }, []);

  // Initialize speech recognition (Web Speech API)
  useEffect(() => {
    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      recognitionRef.current = null;
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let interim = '';
      let finalText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = String(event.results[i][0]?.transcript || '');
        if (event.results[i].isFinal) {
          finalText += transcript;
        } else {
          interim += transcript;
        }
      }

      const combined = `${finalText} ${interim}`.trim();
      if (combined) {
        setInput(combined);
      }
    };

    recognition.onerror = (event: any) => {
      setIsListening(false);
      const msg = event?.error ? String(event.error) : 'Speech recognition error';
      toast.error(`Voice input error: ${msg}`);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    };
  }, []);

  // Get session ID
  const getSessionId = () => {
    // Use the same session id as ApiClient (x-session-id)
    let sessionId = localStorage.getItem("guest_session_id");

    // Backward-compat: migrate existing cart_session_id if it exists
    if (!sessionId) {
      const legacy = localStorage.getItem("cart_session_id");
      if (legacy) {
        sessionId = legacy;
        localStorage.setItem("guest_session_id", legacy);
      }
    }

    if (!sessionId) {
      sessionId = `guest_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      localStorage.setItem("guest_session_id", sessionId);
    }

    return sessionId;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !agentRef.current) return;

    const userMessage = input.trim();
    setInput("");
    setIsLoading(true);

    // Add user message
    const userMsg: Message = {
      id: Date.now(),
      role: "user",
      content: userMessage,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const sessionId = getSessionId();
      const response = await agentRef.current.chat(userMessage, sessionId);

      // Extract coupon code from message if present
      const couponMatch = response.message.match(/\*\*([A-Z0-9-]+)\*\*/);
      const couponCode = couponMatch ? couponMatch[1] : undefined;

      // Add assistant response
      const assistantMsg: Message = {
        id: Date.now() + 1,
        role: "assistant",
        content: response.message,
        products: response.products,
        action: response.action,
        timestamp: new Date(),
        couponCode,
      };
      setMessages((prev) => [...prev, assistantMsg]);

      // Handle actions
      if (response.action) {
        await handleAction(response.action, response.products);
      }
    } catch (error) {
      console.error("Error chatting with Clerk:", error);
      const errorMsg: Message = {
        id: Date.now() + 1,
        role: "assistant",
        content: "I'm sorry, I encountered an error. Could you please try again?",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (action: any, products?: Product[]) => {
    console.log("[ClerkChat] Handling action:", action);

    // New standardized action: set_filters
    if (action.type === "set_filters" && action.payload) {
      const { category, searchQuery, sortBy, sortOrder, minPrice, maxPrice } = action.payload;

      if (category !== undefined) {
        setCategory(category);
      }
      if (searchQuery !== undefined) {
        setSearchQuery(searchQuery);
        const keywords = String(searchQuery)
          .split(/\s+/)
          .filter((w: string) => w.length > 2);
        addToSearchHistory(String(searchQuery), category || undefined, keywords);
        trackActivity("search", { metadata: { query: String(searchQuery), category: category || null, keywords } });
      }
      if (sortBy) {
        setSort(sortBy, sortOrder || "asc");
        trackActivity("filter", { metadata: { sortBy, sortOrder: sortOrder || "asc" } });
      }
      if (minPrice !== undefined || maxPrice !== undefined) {
        applyFilter("filter_by_price_range", { min: minPrice, max: maxPrice });
        trackActivity("filter", { metadata: { minPrice: minPrice ?? null, maxPrice: maxPrice ?? null } });
      }

      if (location.pathname !== "/shop") {
        navigate("/shop");
      }
      return;
    }

    // New standardized action: coupon_created
    if (action.type === "coupon_created" && action.payload?.code) {
      console.log("[ClerkChat] Coupon generated:", action.payload.code);
      trackActivity("coupon_generated", { metadata: { code: action.payload.code } });
      return;
    }
    
    if (action.type === "filter" && action.payload) {
      const { filterType, value, action: payloadAction, couponCode, searchQuery, productKeywords } = action.payload;
      
      // Handle coupon - DON'T auto-apply or navigate, just show the code
      if (payloadAction === "apply_coupon" && couponCode) {
        // Don't auto-apply - user will click the button
        console.log("[ClerkChat] Coupon generated:", couponCode);
        return;
      }
      
      // Apply filter and navigate
      if (filterType === "sort_by_price") {
        console.log("[ClerkChat] Applying sort_by_price:", value);
        setSort("price", value as "asc" | "desc");
        toast.success(`Sorting by price: ${value === "asc" ? "Low to High" : "High to Low"}`);
      } else if (filterType === "filter_by_category") {
        console.log("[ClerkChat] Applying filter_by_category:", value);
        setCategory(value);
        // If we have product keywords (like "sneakers"), use those for search too
        if (productKeywords) {
          setSearchQuery(productKeywords);
          // Track search history for recommendations
          addToSearchHistory(productKeywords, value, productKeywords ? [productKeywords] : undefined);
        } else {
          // Track category search in history
          addToSearchHistory(value, value, [value.toLowerCase()]);
        }
        toast.success(`Showing ${value} - check the shop!`, {
          duration: 3000,
        });
      } else if (filterType === "search") {
        // Search query - this updates the shop to show relevant products
        console.log("[ClerkChat] Applying search filter:", value);
        // Use product keywords if available, otherwise use the search query
        const searchTerm = productKeywords || value;
        setSearchQuery(searchTerm);
        // Track search history for recommendations
        const keywords = productKeywords ? [productKeywords] : searchTerm.split(/\s+/).filter((w: string) => w.length > 2);
        addToSearchHistory(searchTerm, undefined, keywords);
        toast.success(`Showing results for "${searchTerm}"`, {
          duration: 3000,
        });
      } else if (filterType) {
        console.log("[ClerkChat] Applying filter:", filterType, value);
        applyFilter(filterType, value);
      }
      
      // Navigate to shop page
      if (location.pathname !== "/shop") {
        navigate("/shop");
      }
    } else if (action.type === "add_to_cart" && action.payload) {
      const { productId, size, quantity } = action.payload;
      // Find the product from the response or recent products
      let product = products?.find(p => p.id === productId);
      
      // If not found in current products, search in recent messages
      if (!product) {
        for (let i = messages.length - 1; i >= 0; i--) {
          if (messages[i].products) {
            product = messages[i].products?.find(p => p.id === productId);
            if (product) break;
          }
        }
      }
      
      if (product) {
        await handleProductAddToCart(product, size || product.sizes?.[0] || "M", quantity || 1);
        trackActivity("add_to_cart", { product_id: product.id, metadata: { size: size || product.sizes?.[0] || "M", quantity: quantity || 1 } });
      } else {
        console.warn("[ClerkChat] Product not found for add_to_cart action:", productId);
      }
    } else if (action.type === "navigate" && action.payload) {
      navigate(action.payload.path);
    }
  };

  const handleProductAddToCart = async (product: Product, size: string, quantity: number = 1) => {
    try {
      await addToCartItem(product.id, size, quantity);

      toast.success(`Added ${product.name} to cart!`);
      
      const successMsg: Message = {
        id: Date.now(),
        role: "assistant",
        content: `✓ Added ${product.name} (size: ${size}) to your cart! Would you like to continue shopping or checkout?`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, successMsg]);
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast.error("Failed to add to cart. Please try again.");
    }
  };

  const handleApplyCoupon = async (code: string) => {
    try {
      const result = await applyCoupon(code);
      if (result.success) {
        toast.success(`Coupon ${code} applied successfully!`);
        navigate("/cart");
      } else {
        toast.error(result.error || "Invalid coupon code");
      }
    } catch (error) {
      toast.error("Failed to apply coupon");
    }
  };

  const handleAttachFile = () => {
    // Future: file attachment feature
  };

  const handleMicrophoneClick = () => {
    // Future: voice input feature
    const recognition = recognitionRef.current;
    if (!recognition) {
      toast.error('Voice input is not supported in this browser.');
      return;
    }

    try {
      if (isListening) {
        recognition.stop();
        setIsListening(false);
      } else {
        recognition.start();
        setIsListening(true);
        toast.message('Listening… click the mic again to stop.');
      }
    } catch (error: any) {
      setIsListening(false);
      toast.error(error?.message || 'Failed to start voice input');
    }
  };

  return (
    <ExpandableChat
      size="lg"
      position="bottom-right"
      icon={<Sparkles className="h-6 w-6" />}
    >
      <ExpandableChatHeader className="flex-col text-center justify-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Sparkles className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold">The Clerk</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Your AI Personal Shopper
        </p>
      </ExpandableChatHeader>

      <ExpandableChatBody>
        <ChatMessageList>
          {messages.map((message) => (
            <ChatBubble
              key={message.id}
              variant={message.role === "user" ? "sent" : "received"}
            >
              <ChatBubbleAvatar
                className="h-8 w-8 shrink-0"
                src={
                  message.role === "user"
                    ? userAvatarUrl || undefined
                    : undefined
                }
                fallback={message.role === "user" ? userInitial : "AI"}
              />
              <div className="flex-1 min-w-0">
                <ChatBubbleMessage
                  variant={message.role === "user" ? "sent" : "received"}
                >
                  <p className="text-sm whitespace-pre-wrap">{formatMessage(message.content)}</p>
                </ChatBubbleMessage>

                {/* Product Cards - Rich Results */}
                {message.products && message.products.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {message.products.map((product) => (
                      <Card
                        key={product.id}
                        className="p-3 bg-background border border-border hover:border-primary/50 transition-colors"
                      >
                        <div className="flex gap-3">
                          <Link to={`/product/${product.id}`} className="shrink-0">
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-20 h-20 rounded-lg object-cover hover:opacity-90 transition-opacity"
                            />
                          </Link>
                          <div className="flex-1 min-w-0">
                            <Link
                              to={`/product/${product.id}`}
                              className="font-medium text-sm hover:text-primary transition-colors block truncate"
                            >
                              {product.name}
                            </Link>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              {product.category} • {product.stock > 0 ? "In Stock" : "Out of Stock"}
                            </p>
                            <div className="flex items-center gap-1 mt-1">
                              <div className="flex items-center">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star key={star} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                ))}
                              </div>
                              <span className="text-xs text-muted-foreground">(4.8)</span>
                            </div>
                            <p className="font-bold text-sm mt-1 text-primary">
                              ${product.price}
                            </p>
                            <div className="flex gap-2 mt-2">
                              <Link
                                to={`/product/${product.id}`}
                                className="text-xs bg-secondary px-2 py-1 rounded hover:bg-secondary/80 flex items-center gap-1"
                              >
                                <ExternalLink className="w-3 h-3" /> View
                              </Link>
                              {product.sizes && product.sizes.length > 0 && (
                                <button
                                  onClick={() =>
                                    handleProductAddToCart(
                                      product,
                                      product.sizes[0],
                                      1
                                    )
                                  }
                                  className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded hover:bg-primary/90"
                                >
                                  Add to Cart
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
                
                {/* Coupon Code Display */}
                {message.couponCode && (
                  <div className="mt-3 p-3 bg-accent/10 border border-accent/30 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Your discount code:</p>
                    <div className="flex items-center gap-2">
                      <code className="bg-background px-2 py-1 rounded text-sm font-mono font-bold">
                        {message.couponCode}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7"
                        onClick={() => handleApplyCoupon(message.couponCode!)}
                      >
                        Apply to Cart
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </ChatBubble>
          ))}

          {isLoading && (
            <ChatBubble variant="received">
              <ChatBubbleAvatar
                className="h-8 w-8 shrink-0"
                fallback="AI"
              />
              <ChatBubbleMessage isLoading />
            </ChatBubble>
          )}
        </ChatMessageList>
      </ExpandableChatBody>

      <ExpandableChatFooter>
        <form
          onSubmit={handleSubmit}
          className="relative rounded-lg border bg-background focus-within:ring-1 focus-within:ring-ring p-1"
        >
          <ChatInput
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything about products..."
            className="min-h-12 resize-none rounded-lg bg-background border-0 p-3 shadow-none focus-visible:ring-0"
            disabled={isLoading}
          />
          <div className="flex items-center p-3 pt-0 justify-between">
            <div className="flex">
              <Button
                variant="ghost"
                size="icon"
                type="button"
                onClick={handleAttachFile}
                className="opacity-50"
              >
                <Paperclip className="size-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                type="button"
                onClick={handleMicrophoneClick}
                className={isListening ? "opacity-100 text-primary" : "opacity-50"}
              >
                <Mic className="size-4" />
              </Button>
            </div>
            <Button type="submit" size="sm" className="ml-auto gap-1.5" disabled={!input.trim() || isLoading}>
              Send
              <CornerDownLeft className="size-3.5" />
            </Button>
          </div>
        </form>
      </ExpandableChatFooter>
    </ExpandableChat>
  );
};

export default ClerkChat;
