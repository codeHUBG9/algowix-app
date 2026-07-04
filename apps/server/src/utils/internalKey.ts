import { createHmac, timingSafeEqual } from "node:crypto";

// 09-Product-Integration.md §4 — HMAC-signed server-to-server auth between
// the platform and product contract APIs. Signature = HMAC-SHA256(body +
// timestamp, sharedSecret); receiver rejects timestamps older than 5 minutes
// (replay protection) per the doc.
const MAX_SKEW_MS = 5 * 60 * 1000;

export function signPayload(bodyStr: string, secret: string): { signature: string; timestamp: string } {
  const timestamp = Date.now().toString();
  const signature = createHmac("sha256", secret).update(bodyStr + timestamp).digest("hex");
  return { signature, timestamp };
}

export function verifySignature(bodyStr: string, timestamp: string, signature: string, secret: string): boolean {
  const sentAt = Number(timestamp);
  if (!Number.isFinite(sentAt)) return false;
  if (Math.abs(Date.now() - sentAt) > MAX_SKEW_MS) return false;

  const expected = createHmac("sha256", secret).update(bodyStr + timestamp).digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");
  const actualBuf = Buffer.from(signature, "hex");
  if (expectedBuf.length !== actualBuf.length) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
}
