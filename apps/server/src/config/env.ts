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
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
