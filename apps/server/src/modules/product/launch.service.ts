import { prisma } from "../../database/prisma.js";
import { productRepository } from "./product.repository.js";
import { generateLaunchToken } from "../../services/jwt.service.js";
import { ForbiddenError, NotFoundError } from "../../utils/errors.js";
import type { AccessTokenPayload } from "@algowix/shared-types";

// 13-RBAC.md §5 Level 1 — a role with zero RoleProductAccess rows is
// unrestricted (every subscribed product); restriction only kicks in once an
// admin opts a role into an explicit product allow-list. Owner always passes,
// same "cannot be locked out of their own org" precedent as the Owner-can't-
// be-suspended/removed guards elsewhere in this module.
async function hasProductAccess(organizationId: string, userId: string, productId: string): Promise<boolean> {
  const membership = await prisma.orgMembership.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
    include: { role: { include: { productAccess: { select: { productId: true } } } } },
  });
  if (!membership) return false;
  if (membership.role.name === "Owner") return true;
  if (membership.role.productAccess.length === 0) return true;
  return membership.role.productAccess.some((pa) => pa.productId === productId);
}

export const launchService = {
  // 04-System-Design.md §4.2 SSO launch flow — mints a short-lived, product-
  // scoped JWT a product verifies via platform-sdk's verifyLaunchToken
  // (same JWKS this platform already publishes at /.well-known/jwks.json).
  async launch(slug: string, auth: AccessTokenPayload) {
    const product = await productRepository.findBySlug(slug);
    if (!product || !product.isActive) throw new NotFoundError("Product not found");

    const subscription = await productRepository.findSubscription(auth.organizationId, product.id);
    if (!subscription || !["TRIALING", "ACTIVE"].includes(subscription.status)) {
      throw new ForbiddenError("No active subscription for this product");
    }

    const allowed = await hasProductAccess(auth.organizationId, auth.userId, product.id);
    if (!allowed) throw new ForbiddenError("Your role does not have access to this product");

    const token = await generateLaunchToken(slug, {
      userId: auth.userId,
      organizationId: auth.organizationId,
      orgSlug: auth.orgSlug,
      email: auth.email,
      permissions: auth.permissions,
    });

    return { url: `${product.baseUrl}?token=${token}` };
  },
};
