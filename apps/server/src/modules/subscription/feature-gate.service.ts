import { productRepository } from "../product/product.repository.js";

// 12-Subscriptions.md §3 — feature gating. Reuses the same JSON.parse(plan.features)
// / JSON.parse(plan.limits) convention product.service.ts's toPublicPlan already
// established (SQL Server has no native JSON column type here).
export const featureGateService = {
  async canAccess(organizationId: string, productSlug: string, feature: string): Promise<{ allowed: boolean; reason?: string }> {
    const product = await productRepository.findBySlug(productSlug);
    if (!product) return { allowed: false, reason: "PRODUCT_NOT_FOUND" };

    const subscription = await productRepository.findSubscription(organizationId, product.id);
    if (!subscription) return { allowed: false, reason: "NO_ACTIVE_SUBSCRIPTION" };
    if (subscription.status === "SUSPENDED") return { allowed: false, reason: "SUBSCRIPTION_SUSPENDED" };
    if (subscription.status === "CANCELLED") return { allowed: false, reason: "SUBSCRIPTION_CANCELLED" };

    const features = JSON.parse(subscription.plan.features) as string[];
    return features.includes(feature) ? { allowed: true } : { allowed: false, reason: "FEATURE_NOT_IN_PLAN" };
  },

  async checkLimit(
    organizationId: string,
    productSlug: string,
    metric: string,
    currentValue: number
  ): Promise<{ withinLimit: boolean; limit: number | null; current: number }> {
    const product = await productRepository.findBySlug(productSlug);
    if (!product) return { withinLimit: false, limit: null, current: currentValue };

    const subscription = await productRepository.findSubscription(organizationId, product.id);
    if (!subscription) return { withinLimit: false, limit: null, current: currentValue };

    const limits = JSON.parse(subscription.plan.limits) as Record<string, number>;
    const limit = limits[metric] ?? null;
    return { withinLimit: limit === null || currentValue < limit, limit, current: currentValue };
  },
};
