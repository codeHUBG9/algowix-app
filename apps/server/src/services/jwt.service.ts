import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { SignJWT, importPKCS8, importSPKI, jwtVerify, exportJWK } from "jose";
import type { KeyLike } from "jose";
import { env } from "../config/env.js";
import type { AccessTokenPayload } from "@algowix/shared-types";

const ISSUER = "https://app.algowix.local";
const AUDIENCE = "algowix-platform";

let cachedPrivateKey: KeyLike | undefined;
let cachedPublicKey: KeyLike | undefined;

async function getPrivateKey(): Promise<KeyLike> {
  if (!cachedPrivateKey) {
    const pem = readFileSync(resolve(process.cwd(), env.JWT_PRIVATE_KEY_PATH), "utf8");
    cachedPrivateKey = await importPKCS8(pem, "RS256");
  }
  return cachedPrivateKey;
}

async function getPublicKey(): Promise<KeyLike> {
  if (!cachedPublicKey) {
    const pem = readFileSync(resolve(process.cwd(), env.JWT_PUBLIC_KEY_PATH), "utf8");
    cachedPublicKey = await importSPKI(pem, "RS256");
  }
  return cachedPublicKey;
}

export async function generateAccessToken(payload: AccessTokenPayload): Promise<string> {
  const privateKey = await getPrivateKey();

  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "RS256", kid: env.JWT_KEY_ID })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(env.ACCESS_TOKEN_TTL)
    .setJti(randomUUID())
    .sign(privateKey);
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  const publicKey = await getPublicKey();
  const { payload } = await jwtVerify(token, publicKey, {
    issuer: ISSUER,
    audience: AUDIENCE,
  });
  return payload as unknown as AccessTokenPayload;
}

// 04-System-Design.md §4.2 / 13-RBAC.md §5 Level 2 — a short-lived, product-scoped
// launch token. Audience is the product's own slug (not the fixed platform AUDIENCE)
// so a product can only accept tokens minted for it, matching what
// platform-sdk's verifyLaunchToken already expects (issuer=platformUrl, audience=productSlug).
export interface LaunchTokenPayload {
  userId: string;
  organizationId: string;
  orgSlug: string;
  email: string;
  permissions: string[];
}

export async function generateLaunchToken(productSlug: string, payload: LaunchTokenPayload): Promise<string> {
  const privateKey = await getPrivateKey();

  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "RS256", kid: env.JWT_KEY_ID })
    .setIssuer(ISSUER)
    .setAudience(productSlug)
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime("60s")
    .setJti(randomUUID())
    .sign(privateKey);
}

export async function getJwks() {
  const publicKey = await getPublicKey();
  const jwk = await exportJWK(publicKey);
  return {
    keys: [{ ...jwk, use: "sig", alg: "RS256", kid: env.JWT_KEY_ID }],
  };
}
