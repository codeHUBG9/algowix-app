import type { Product, ProductPlan, Subscription } from "@prisma/client";
import { productRepository } from "./product.repository.js";
import { NotFoundError } from "../../utils/errors.js";

type ProductWithPlans = Product & { plans: ProductPlan[] };

function toPublicPlan(plan: ProductPlan) {
  return {
    id: plan.id,
    name: plan.name,
    slug: plan.slug,
    description: plan.description,
    monthlyPrice: plan.monthlyPrice,
    annualPrice: plan.annualPrice,
    currency: plan.currency,
    trialDays: plan.trialDays,
    maxSeats: plan.maxSeats,
    features: JSON.parse(plan.features) as unknown,
    limits: JSON.parse(plan.limits) as unknown,
  };
}

// 09-Product-Integration.md §2 — the public catalog never exposes baseUrl,
// contractApiPath, or health-monitoring internals; those are platform-only.
function toPublicProduct(product: ProductWithPlans) {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,
    shortDescription: product.shortDescription,
    logoUrl: product.logoUrl,
    category: product.category,
    isBeta: product.isBeta,
    plans: product.plans.map(toPublicPlan),
  };
}

function toSubscriptionStatus(subscription: Subscription | null) {
  if (!subscription) return null;
  return {
    status: subscription.status,
    planId: subscription.planId,
    seatCount: subscription.seatCount,
    trialEndsAt: subscription.trialEndsAt,
    currentPeriodEnd: subscription.currentPeriodEnd,
    provisioningStatus: subscription.provisioningStatus,
    tenantUrl: subscription.tenantUrl,
    adminLoginUrl: subscription.adminLoginUrl,
  };
}

export const productService = {
  async list(organizationId?: string) {
    const products = await productRepository.findAllActive();
    return Promise.all(
      products.map(async (product) => ({
        ...toPublicProduct(product),
        subscription: organizationId
          ? toSubscriptionStatus(await productRepository.findSubscription(organizationId, product.id))
          : null,
      }))
    );
  },

  async getBySlug(slug: string, organizationId?: string) {
    const product = await productRepository.findBySlug(slug);
    if (!product || !product.isActive || !product.isPublic) throw new NotFoundError("Product not found");

    return {
      ...toPublicProduct(product),
      subscription: organizationId
        ? toSubscriptionStatus(await productRepository.findSubscription(organizationId, product.id))
        : null,
    };
  },

  async getPlans(slug: string) {
    const product = await productRepository.findBySlug(slug);
    if (!product || !product.isActive || !product.isPublic) throw new NotFoundError("Product not found");
    return product.plans.map(toPublicPlan);
  },
};
