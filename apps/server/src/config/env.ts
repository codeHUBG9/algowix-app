import { config } from "dotenv";
import { z } from "zod";

config({ path: [".env.local", ".env"] });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  ALLOWED_ORIGINS: z.string().default("http://localhost:3000"),
  JWT_PRIVATE_KEY_PATH: z.string().default("./keys/private.pem"),
  JWT_PUBLIC_KEY_PATH: z.string().default("./keys/public.pem"),
  JWT_KEY_ID: z.string().default("dev-key-1"),
  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().default(30),
  PLATFORM_ADMIN_KEY: z.string().default("dev-platform-admin-key-change-me"),
  PROVISION_RETRY_DELAYS_MS: z.string().default("60000,300000,900000"),
  // 09-Product-Integration.md §4 — shared HMAC secret for platform<->product
  // server-to-server calls. One secret for all products for now (no Azure
  // Key Vault in this environment); a real deployment would issue one per
  // product and rotate quarterly per the doc.
  PRODUCT_INTERNAL_SECRET: z.string().default("dev-product-internal-secret-change-me"),
  // 11-Billing.md §2 — real gateway credentials. Left unset in this environment
  // (no merchant account); gateway/index.ts falls back to MockGateway whenever
  // the relevant pair is absent, so the checkout/webhook flow still works end
  // to end without them.
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  // Dev-only signing secret for MockGateway webhook simulation (see
  // internal.dev.router.ts's /dev/billing/sign-mock-webhook).
  MOCK_GATEWAY_WEBHOOK_SECRET: z.string().default("dev-mock-gateway-webhook-secret-change-me"),
  // 11-Billing.md §5 — AlgoWix's own GST registration, used for tax calc.
  ALGOWIX_GST_NUMBER: z.string().default("27AAAAA0000A1Z5"),
  ALGOWIX_STATE: z.string().default("MH"),
  // Invoice PDFs are written to local disk (no Azure Blob in this environment).
  INVOICE_STORAGE_DIR: z.string().default("./storage/invoices"),
  // 16-Files.md — local-disk stand-in for the doc's Azure Blob containers,
  // same pattern as INVOICE_STORAGE_DIR above.
  FILE_STORAGE_DIR: z.string().default("./storage/files"),
  // 22-Security.md §5 — application-level encryption for OAuth tokens stored
  // on Integration rows (utils/crypto.ts). A dev default is fine here (no
  // Azure Key Vault in this environment, same as PLATFORM_ADMIN_KEY etc.) but
  // must be a real secret, rotated, in any deployed environment.
  APP_ENCRYPTION_KEY: z.string().default("dev-app-encryption-key-32-bytes!!"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
