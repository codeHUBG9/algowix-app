import { Router } from "express";
import { env } from "./config/env.js";
import { authRouter } from "./modules/auth/auth.router.js";
import { tenantRouter } from "./modules/tenant/tenant.router.js";
import { tenantAdminRouter } from "./modules/tenant/tenant.admin.router.js";
import { organizationRouter } from "./modules/organization/organization.router.js";
import { inviteAcceptRouter } from "./modules/organization/invite-accept.router.js";
import { productRouter } from "./modules/product/product.router.js";
import { productAdminRouter } from "./modules/product/product.admin.router.js";
import { internalDevRouter } from "./modules/internal/internal.dev.router.js";
import { billingRouter } from "./modules/billing/billing.router.js";
import { billingAdminRouter } from "./modules/billing/billing.admin.router.js";
import { subscriptionRouter } from "./modules/subscription/subscription.router.js";
import { subscriptionAdminRouter } from "./modules/subscription/subscription.admin.router.js";
import { roleRouter } from "./modules/rbac/role.router.js";
import { permissionRouter } from "./modules/rbac/permission.router.js";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/tenants", tenantRouter);
apiRouter.use("/admin/tenants", tenantAdminRouter);
apiRouter.use("/organizations", organizationRouter);
apiRouter.use("/invites", inviteAcceptRouter);
apiRouter.use("/products", productRouter);
apiRouter.use("/admin/products", productAdminRouter);
apiRouter.use("/billing", billingRouter);
apiRouter.use("/admin/billing", billingAdminRouter);
apiRouter.use("/subscriptions", subscriptionRouter);
apiRouter.use("/admin/subscriptions", subscriptionAdminRouter);
apiRouter.use("/roles", roleRouter);
apiRouter.use("/permissions", permissionRouter);

// Dev/test-only — see internal.dev.router.ts. Never registered in production.
if (env.NODE_ENV !== "production") {
  apiRouter.use("/dev", internalDevRouter);
}
