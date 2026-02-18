import ApiClient from "./client";

export type ActivityType =
  | "search"
  | "view"
  | "add_to_cart"
  | "coupon_generated"
  | "filter";

export async function trackActivity(
  activity_type: ActivityType,
  options?: {
    product_id?: string;
    metadata?: Record<string, any>;
  }
): Promise<void> {
  try {
    await ApiClient.post<{ activity: any }>(
      "/activity",
      {
        activity_type,
        product_id: options?.product_id,
        metadata: options?.metadata || {},
      },
      false
    );
  } catch (error) {
    console.warn("[Activity] Failed to track activity:", error);
  }
}
