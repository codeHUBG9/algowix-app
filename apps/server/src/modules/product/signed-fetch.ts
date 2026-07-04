import { env } from "../../config/env.js";
import { signPayload } from "../../utils/internalKey.js";

// GET-only counterpart to provisioning.service.ts's callProductEndpoint —
// used for the read-side contract endpoints (health, usage, license) that
// carry no request body. Signed over an empty body string, same scheme.
export async function signedGet<T>(baseUrl: string, path: string, timeoutMs = 8000): Promise<T> {
  const { signature, timestamp } = signPayload("", env.PRODUCT_INTERNAL_SECRET);

  const res = await fetch(`${baseUrl}${path}`, {
    method: "GET",
    headers: {
      "platform-internal-key": signature,
      "platform-internal-timestamp": timestamp,
    },
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    throw new Error(`${path} responded with HTTP ${res.status}`);
  }

  return (await res.json()) as T;
}
