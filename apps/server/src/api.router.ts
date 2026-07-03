import { Router } from "express";
import { authRouter } from "./modules/auth/auth.router.js";
import { tenantRouter } from "./modules/tenant/tenant.router.js";
import { tenantAdminRouter } from "./modules/tenant/tenant.admin.router.js";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/tenants", tenantRouter);
apiRouter.use("/admin/tenants", tenantAdminRouter);
