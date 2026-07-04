import { createHmac, timingSafeEqual } from "node:crypto";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

// 09-Product-Integration.md §7 — a lightweight SDK for product teams (CRM,
// Inventory, HRMS) to integrate against the platform. Ships as its own
// package (not imported from apps/server) because it's meant to be
// `npm install @algowix/platform-sdk`-ed into a *different* repository — it
// cannot reach into this monorepo's internals, so the HMAC signing logic
// mirrors (deliberately duplicates) apps/server/src/utils/internalKey.ts
// rather than importing it.

const MAX_SKEW_MS = 5 * 60 * 1000;

export interface AlgoWixSDKOptions {
  productSlug: string;
  internalSecret: string;
  platformUrl: string;
}

export interface LaunchTokenIdentity {
  userId: string;
  organizationId: string;
  orgSlug: string;
  permissions: string[];
  [key: string]: unknown;
}

export interface PushNotificationPayload {
  organizationId: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  actionUrl?: string;
}

export interface PushAuditEventPayload {
  organizationId: string;
  actorId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  before?: unknown;
  after?: unknown;
}

function sign(bodyStr: string, secret: string): { signature: string; timestamp: string } {
  const timestamp = Date.now().toString();
  const signature = createHmac("sha256", secret).update(bodyStr + timestamp).digest("hex");
  return { signature, timestamp };
}

export class AlgoWixSDK {
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;

  constructor(private readonly options: AlgoWixSDKOptions) {
    this.jwks = createRemoteJWKSet(new URL("/.well-known/jwks.json", options.platformUrl));
  }

  // Verifies the launch token the platform appends to a product's SSO
  // redirect URL (09-Product-Integration.md §9's CRM example).
  async verifyLaunchToken(token: string): Promise<LaunchTokenIdentity> {
    const { payload } = await jwtVerify(token, this.jwks, {
      issuer: this.options.platformUrl,
      audience: this.options.productSlug,
    });
    return payload as JWTPayload & LaunchTokenIdentity;
  }

  // §5.1 — push a notification back to the platform for the platform's
  // notification center to surface.
  async pushNotification(payload: PushNotificationPayload): Promise<void> {
    await this.post("/api/internal/notifications", payload);
  }

  // §5.2 — push an audit event for the platform's cross-product audit log.
  async pushAuditEvent(payload: PushAuditEventPayload): Promise<void> {
    await this.post("/api/internal/audit", payload);
  }

  // A product implementing the contract API (§3) verifies inbound platform
  // calls (provision/suspend/deprovision/health) the same way the platform
  // verifies inbound pushes from products — same signature scheme, either
  // direction.
  verifyPlatformRequest(rawBody: string, timestamp: string, signature: string): boolean {
    const sentAt = Number(timestamp);
    if (!Number.isFinite(sentAt) || Math.abs(Date.now() - sentAt) > MAX_SKEW_MS) return false;

    const expected = createHmac("sha256", this.options.internalSecret).update(rawBody + timestamp).digest("hex");
    const expectedBuf = Buffer.from(expected, "hex");
    const actualBuf = Buffer.from(signature, "hex");
    if (expectedBuf.length !== actualBuf.length) return false;
    return timingSafeEqual(expectedBuf, actualBuf);
  }

  private async post(path: string, payload: unknown): Promise<void> {
    const bodyStr = JSON.stringify(payload);
    const { signature, timestamp } = sign(bodyStr, this.options.internalSecret);

    const res = await fetch(new URL(path, this.options.platformUrl), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "platform-internal-key": signature,
        "platform-internal-timestamp": timestamp,
      },
      body: bodyStr,
    });

    if (!res.ok) {
      throw new Error(`${path} responded with HTTP ${res.status}`);
    }
  }
}
