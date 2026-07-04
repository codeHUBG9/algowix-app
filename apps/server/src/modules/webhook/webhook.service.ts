import { randomBytes, createHmac } from "node:crypto";
import { webhookRepository } from "./webhook.repository.js";
import { assertPublicHttpsUrl } from "../../utils/ssrf.js";
import { NotFoundError } from "../../utils/errors.js";
import type { CreateWebhookInput, UpdateWebhookInput } from "./webhook.schema.js";
import type { Webhook } from "@prisma/client";

function toPublic(webhook: Webhook) {
  return {
    id: webhook.id,
    name: webhook.name,
    url: webhook.url,
    events: JSON.parse(webhook.events) as string[],
    isActive: webhook.isActive,
    lastTriggeredAt: webhook.lastTriggeredAt,
    failureCount: webhook.failureCount,
    createdAt: webhook.createdAt,
  };
}

// 18-Integrations.md §2 — signature over payload+timestamp, same shape as
// the doc's sample (and the same construction utils/internalKey.ts already
// uses for platform<->product HMAC signing, just a distinct secret per webhook).
function sign(secret: string, body: string, timestamp: string): string {
  return createHmac("sha256", secret).update(body + timestamp).digest("hex");
}

async function send(webhook: Webhook, eventType: string, payload: Record<string, unknown>) {
  const body = JSON.stringify({ event: eventType, data: payload, timestamp: new Date().toISOString() });
  const timestamp = Date.now().toString();
  const signature = sign(webhook.secret, body, timestamp);
  const deliveryId = randomBytes(12).toString("hex");

  let statusCode: number | null = null;
  let responseText: string | null = null;
  let success = false;

  try {
    const res = await fetch(webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-AlgoWix-Signature": `sha256=${signature}`,
        "X-AlgoWix-Timestamp": timestamp,
        "X-AlgoWix-Event": eventType,
        "X-AlgoWix-Delivery": deliveryId,
      },
      body,
      signal: AbortSignal.timeout(8000),
    });
    statusCode = res.status;
    responseText = (await res.text().catch(() => "")).slice(0, 2000);
    success = res.ok;
  } catch (err) {
    responseText = err instanceof Error ? err.message : "Delivery failed";
  }

  await webhookRepository.recordDelivery({
    webhookId: webhook.id,
    eventType,
    payload: body,
    statusCode,
    response: responseText,
    success,
  });
  await webhookRepository.touchTriggered(webhook.id, success);
  return { success, statusCode };
}

export const webhookService = {
  async list(organizationId: string) {
    const rows = await webhookRepository.list(organizationId);
    return rows.map(toPublic);
  },

  async getById(organizationId: string, id: string) {
    const webhook = await webhookRepository.findById(organizationId, id);
    if (!webhook) throw new NotFoundError("Webhook not found");
    return toPublic(webhook);
  },

  async create(organizationId: string, input: CreateWebhookInput) {
    assertPublicHttpsUrl(input.url, "Webhook URL");
    const secret = `whsec_${randomBytes(24).toString("hex")}`;
    const webhook = await webhookRepository.create(organizationId, {
      name: input.name,
      url: input.url,
      secret,
      events: JSON.stringify(input.events),
    });
    return { ...toPublic(webhook), secret };
  },

  async update(organizationId: string, id: string, input: UpdateWebhookInput) {
    const existing = await webhookRepository.findById(organizationId, id);
    if (!existing) throw new NotFoundError("Webhook not found");
    if (input.url) assertPublicHttpsUrl(input.url, "Webhook URL");

    const webhook = await webhookRepository.update(organizationId, id, {
      ...(input.name ? { name: input.name } : {}),
      ...(input.url ? { url: input.url } : {}),
      ...(input.events ? { events: JSON.stringify(input.events) } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    });
    return toPublic(webhook);
  },

  async delete(organizationId: string, id: string) {
    const existing = await webhookRepository.findById(organizationId, id);
    if (!existing) throw new NotFoundError("Webhook not found");
    await webhookRepository.delete(organizationId, id);
  },

  async test(organizationId: string, id: string) {
    const webhook = await webhookRepository.findById(organizationId, id);
    if (!webhook) throw new NotFoundError("Webhook not found");
    return send(webhook, "webhook.test", { message: "This is a test event from AlgoWix." });
  },

  async deliveries(organizationId: string, id: string) {
    const webhook = await webhookRepository.findById(organizationId, id);
    if (!webhook) throw new NotFoundError("Webhook not found");
    return webhookRepository.deliveries(organizationId, id, 50);
  },

  // Called from platform services when a real event happens (see e.g.
  // billing.service.ts, invite.service.ts) — fires every active webhook the
  // org has subscribed to that event, in parallel, best-effort. Delivery
  // retries per 18-Integrations.md §2's schedule (5m/30m/2h/12h) would need a
  // job queue that doesn't exist in this environment (same deferral as every
  // other cron in this codebase); retryFailedDeliveries below is the
  // admin-triggered substitute.
  async dispatch(organizationId: string, eventType: string, payload: Record<string, unknown>) {
    const webhooks = await webhookRepository.findActiveSubscribed(organizationId, eventType);
    await Promise.all(webhooks.map((w) => send(w, eventType, payload)));
  },

  // Admin-triggered substitute for the doc's automatic 5m/30m/2h/12h retry
  // schedule — re-sends the original payload for deliveries that failed in
  // the last 24h, once per call.
  async retryFailedDeliveries(organizationId: string) {
    const webhooks = await webhookRepository.list(organizationId);
    let retried = 0;
    for (const webhook of webhooks.filter((w) => w.isActive)) {
      const recentFailures = await webhookRepository.deliveries(organizationId, webhook.id, 20);
      for (const delivery of recentFailures.filter((d) => !d.success)) {
        const parsed = JSON.parse(delivery.payload) as { data: Record<string, unknown> };
        await send(webhook, delivery.eventType, parsed.data);
        retried++;
      }
    }
    return { retried };
  },
};
