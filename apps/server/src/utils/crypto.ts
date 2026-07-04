import { createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto";
import { env } from "../config/env.js";

// 22-Security.md §5 — application-level encryption for fields beyond DB-level
// encryption (OAuth tokens on Integration rows). AES-256-GCM with a random
// IV per value; output is `iv:authTag:ciphertext` (all hex) so it's a single
// opaque string to store in an NVarChar column.
const ALGORITHM = "aes-256-gcm";

function deriveKey(): Buffer {
  // APP_ENCRYPTION_KEY is a passphrase, not necessarily 32 raw bytes — hash it
  // down to a fixed-size key rather than requiring an exact-length secret.
  return createHash("sha256").update(env.APP_ENCRYPTION_KEY).digest();
}

export function encrypt(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, deriveKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decrypt(payload: string): string {
  const [ivHex, authTagHex, dataHex] = payload.split(":");
  if (!ivHex || !authTagHex || !dataHex) throw new Error("Malformed encrypted payload");
  const decipher = createDecipheriv(ALGORITHM, deriveKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]).toString("utf8");
}
