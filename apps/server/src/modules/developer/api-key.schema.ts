import { z } from "zod";

// 10-API-Gateway.md §5 — API key scopes reuse the same resource.action
// permission strings as JWT-based RBAC (e.g. "organization.read"), so
// requirePermission() works unchanged for either auth method.
export const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  scopes: z.array(z.string().min(1)).min(1, "At least one scope is required"),
  expiresAt: z.string().datetime().optional(),
});

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
