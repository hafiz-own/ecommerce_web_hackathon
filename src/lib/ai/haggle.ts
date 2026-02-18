import { getGeminiModel } from "./gemini-client";
import { supabase } from "@/lib/supabase";

export interface HaggleResult {
  success: boolean;
  couponCode?: string;
  discount: number;
  message: string;
  reason?: string;
}

/**
 * Analyze user's haggle request and determine discount eligibility
 */
export async function analyzeHaggleRequest(
  userMessage: string
): Promise<{
  eligible: boolean;
  discountPercent: number;
  reason: string;
  sentiment: "positive" | "neutral" | "negative";
}> {
  const lowerMessage = userMessage.toLowerCase();
  
  // Check for common good reasons FIRST (before AI call)
  // This ensures birthday/wedding etc. ALWAYS work
  const hasBirthday = lowerMessage.includes("birthday") || lowerMessage.includes("birth day") || lowerMessage.includes("bday");
  const hasWedding = lowerMessage.includes("wedding") || lowerMessage.includes("marry") || lowerMessage.includes("marriage") || lowerMessage.includes("getting married");
  const hasFirstTime = lowerMessage.includes("first time") || lowerMessage.includes("new customer") || lowerMessage.includes("first order");
  const hasBulk = lowerMessage.includes("bulk") || lowerMessage.includes("multiple") || lowerMessage.includes("buying two") || lowerMessage.includes("buying 2") || lowerMessage.includes("several items");
  const hasValentine = lowerMessage.includes("valentine") || lowerMessage.includes("love");
  const hasStudent = lowerMessage.includes("student");
  const hasLoyalCustomer = lowerMessage.includes("loyal") || lowerMessage.includes("regular customer") || lowerMessage.includes("shop here often");
  
  // Determine discount based on reason
  if (hasBirthday) {
    return {
      eligible: true,
      discountPercent: 15,
      reason: "Birthday celebration",
      sentiment: "positive",
    };
  }
  
  if (hasWedding) {
    return {
      eligible: true,
      discountPercent: 20,
      reason: "Wedding celebration",
      sentiment: "positive",
    };
  }
  
  if (hasFirstTime) {
    return {
      eligible: true,
      discountPercent: 10,
      reason: "First-time customer",
      sentiment: "positive",
    };
  }
  
  if (hasBulk) {
    return {
      eligible: true,
      discountPercent: 12,
      reason: "Bulk purchase",
      sentiment: "positive",
    };
  }
  
  if (hasValentine) {
    return {
      eligible: true,
      discountPercent: 10,
      reason: "Valentine's Day",
      sentiment: "positive",
    };
  }
  
  if (hasStudent) {
    return {
      eligible: true,
      discountPercent: 10,
      reason: "Student discount",
      sentiment: "positive",
    };
  }
  
  if (hasLoyalCustomer) {
    return {
      eligible: true,
      discountPercent: 10,
      reason: "Loyal customer",
      sentiment: "positive",
    };
  }
  
  // Check for rude behavior
  const rudeWords = ["stupid", "idiot", "dumb", "hate", "sucks", "worst", "terrible", "awful", "garbage", "trash"];
  const isRude = rudeWords.some(word => lowerMessage.includes(word));
  
  if (isRude) {
    return {
      eligible: false,
      discountPercent: 0,
      reason: "Rude behavior detected",
      sentiment: "negative",
    };
  }
  
  // Try AI analysis for more complex requests
  try {
    const model = getGeminiModel("gemini-2.5-flash");
    
    if (!model) {
      // No AI available and no keyword match
      return {
        eligible: false,
        discountPercent: 0,
        reason: "No valid reason provided",
        sentiment: "neutral",
      };
    }
    
    const prompt = `Analyze this customer request for a discount and determine:
1. Is the request reasonable and polite? (true/false)
2. What discount percentage should be offered? (5, 10, 15, or 20)
3. What is the reason given? (extract key reason)
4. What is the sentiment? (positive, neutral, or negative)

Customer message: "${userMessage}"

Respond in JSON format only:
{
  "eligible": true/false,
  "discountPercent": number (5-20),
  "reason": "extracted reason",
  "sentiment": "positive" | "neutral" | "negative"
}`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    // Parse JSON response
    let analysis: any = {
      eligible: false,
      discountPercent: 0,
      reason: "",
      sentiment: "neutral",
    };

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.warn("[Haggle] Failed to parse Gemini response");
      return {
        eligible: false,
        discountPercent: 0,
        reason: "Unable to process request",
        sentiment: "neutral",
      };
    }

    // If user is rude, make them ineligible
    if (analysis.sentiment === "negative") {
      return {
        eligible: false,
        discountPercent: 0,
        reason: analysis.reason || "Request not eligible",
        sentiment: "negative",
      };
    }

    return analysis;
  } catch (error) {
    console.error("[Haggle] Error analyzing request:", error);
    return {
      eligible: false,
      discountPercent: 0,
      reason: "Unable to process request",
      sentiment: "neutral",
    };
  }
}

/**
 * Generate a unique coupon code
 */
function generateCouponCode(reason: string, discount: number): string {
  // Extract key words from reason
  const keywords = reason
    .toLowerCase()
    .split(" ")
    .filter((w) => w.length > 3)
    .slice(0, 2);

  // Create code prefix from keywords or use default
  let prefix = "SPECIAL";
  if (keywords.length > 0) {
    prefix = keywords
      .map((w) => w.substring(0, 3).toUpperCase())
      .join("");
  }

  // Common prefixes for known reasons
  const lowerReason = reason.toLowerCase();
  if (lowerReason.includes("birthday")) prefix = "BDAY";
  if (lowerReason.includes("wedding") || lowerReason.includes("marry")) prefix = "WEDDING";
  if (lowerReason.includes("first")) prefix = "WELCOME";
  if (lowerReason.includes("bulk")) prefix = "BULK";
  if (lowerReason.includes("love") || lowerReason.includes("valentine"))
    prefix = "LOVE";

  // Add discount and random suffix
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${discount}${suffix}`;
}

// Local coupon storage for when Supabase is not available
const localCoupons: Map<string, {
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  reason: string;
  valid_until: string;
}> = new Map();

/**
 * Create coupon in database (or local storage as fallback)
 */
async function createCoupon(
  code: string,
  discountType: "percentage" | "fixed",
  discountValue: number,
  reason: string,
  validDays: number = 30
): Promise<boolean> {
  const now = new Date();
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + validDays);

  // Try Supabase first
  if (supabase) {
    try {
      const { error } = await supabase.from("coupons").insert({
        code: code.toUpperCase(),
        discount_type: discountType,
        discount_value: discountValue,
        valid_from: now.toISOString(),
        valid_until: validUntil.toISOString(),
        usage_limit: 1, // Single use coupon
        used_count: 0,
        created_by_agent: true,
        reason,
      });

      if (!error) {
        return true;
      }
      console.warn("[Haggle] Supabase insert failed, using local storage:", error);
    } catch (error) {
      console.warn("[Haggle] Supabase error, using local storage:", error);
    }
  }

  // Fallback: store locally and in localStorage for persistence
  localCoupons.set(code.toUpperCase(), {
    code: code.toUpperCase(),
    discount_type: discountType,
    discount_value: discountValue,
    reason,
    valid_until: validUntil.toISOString(),
  });

  // Also store in localStorage for persistence
  try {
    const storedCoupons = JSON.parse(localStorage.getItem("clerk_coupons") || "{}");
    storedCoupons[code.toUpperCase()] = {
      code: code.toUpperCase(),
      discount_type: discountType,
      discount_value: discountValue,
      reason,
      valid_until: validUntil.toISOString(),
    };
    localStorage.setItem("clerk_coupons", JSON.stringify(storedCoupons));
  } catch (e) {
    console.warn("[Haggle] Failed to store coupon in localStorage");
  }

  return true;
}

/**
 * Get locally stored coupon
 */
export function getLocalCoupon(code: string): { discount_type: "percentage" | "fixed"; discount_value: number } | null {
  // Check in-memory first
  const memCoupon = localCoupons.get(code.toUpperCase());
  if (memCoupon) {
    return { discount_type: memCoupon.discount_type, discount_value: memCoupon.discount_value };
  }

  // Check localStorage
  try {
    const storedCoupons = JSON.parse(localStorage.getItem("clerk_coupons") || "{}");
    const coupon = storedCoupons[code.toUpperCase()];
    if (coupon && new Date(coupon.valid_until) > new Date()) {
      return { discount_type: coupon.discount_type, discount_value: coupon.discount_value };
    }
  } catch (e) {
    // Ignore
  }

  return null;
}

/**
 * Main haggle function - processes discount request and generates coupon
 */
export async function processHaggle(
  userMessage: string,
  sessionId: string
): Promise<HaggleResult> {
  // Analyze the request
  const analysis = await analyzeHaggleRequest(userMessage);

  if (!analysis.eligible) {
    return {
      success: false,
      discount: 0,
      message:
        analysis.sentiment === "negative"
          ? "I appreciate your interest, but I'm not able to offer a discount at this time. Is there anything else I can help you with?"
          : "I understand your request, but I'm not able to offer a discount for this purchase. However, I'd be happy to help you find great products within your budget!",
    };
  }

  // Generate coupon code
  const couponCode = generateCouponCode(analysis.reason, analysis.discountPercent);

  // Create coupon in database
  const created = await createCoupon(
    couponCode,
    "percentage",
    analysis.discountPercent,
    analysis.reason
  );

  if (!created) {
    return {
      success: false,
      discount: 0,
      message:
        "I tried to create a discount for you, but encountered an issue. Please try again later.",
    };
  }

  // Determine friendly message based on reason
  let friendlyMessage = "";
  const lowerReason = analysis.reason.toLowerCase();
  
  if (lowerReason.includes("wedding") || lowerReason.includes("marry")) {
    friendlyMessage = `Congratulations on your wedding! 💍 I've created a special ${analysis.discountPercent}% discount code just for you: **${couponCode}**. Use it at checkout!`;
  } else if (lowerReason.includes("birthday")) {
    friendlyMessage = `Happy Birthday! 🎉 I've created a special ${analysis.discountPercent}% discount code just for you: **${couponCode}**. Use it at checkout!`;
  } else if (lowerReason.includes("first")) {
    friendlyMessage = `Welcome to TrendZone! 🎊 As a first-time customer, here's a ${analysis.discountPercent}% discount: **${couponCode}**. Enjoy your shopping!`;
  } else if (lowerReason.includes("bulk") || lowerReason.includes("multiple")) {
    friendlyMessage = `I appreciate your interest in multiple items! Here's a ${analysis.discountPercent}% discount code: **${couponCode}**. Use it at checkout!`;
  } else {
    friendlyMessage = `I'd be happy to help! I've created a ${analysis.discountPercent}% discount code for you: **${couponCode}**. Use it at checkout to save!`;
  }

  return {
    success: true,
    couponCode,
    discount: analysis.discountPercent,
    message: friendlyMessage,
    reason: analysis.reason,
  };
}
