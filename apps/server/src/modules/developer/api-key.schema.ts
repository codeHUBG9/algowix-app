import { z } from "zod";

// 10-API-Gateway.md §5 — API key scopes reuse the same resource.action
// permission strings as JWT-based RBAC (e.g. "organization.read"), so
// requirePermission() works unchanged for either auth method.
export const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  scopes: z.array(z.string().min(1)).min(1, "At least one scope is required"),
  // 20-Developer-Portal.md §6 — sandbox environment. "test" keys behave
  // identically server-side (there's no separate sandbox database in this
  // environment) — the distinction exists so a developer can tell live vs.
  // test keys apart at a glance via the awx_test_/awx_live_ prefix.
  environment: z.enum(["live", "test"]).default("live"),
  expiresAt: z.string().datetime().optional(),
});

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
