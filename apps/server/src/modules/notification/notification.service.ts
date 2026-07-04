import type { Response } from "express";
import { notificationRepository } from "./notification.repository.js";
import { NotFoundError } from "../../utils/errors.js";
import { categoryForType } from "./notification.types.js";
import { notificationPreferencesSchema, type NotificationPreferencesFormInput } from "@algowix/shared-types";

const DEFAULT_PREFERENCES: NotificationPreferencesFormInput = {
  email: { billing: true, team: true, product: true, digest: false, digestTime: "09:00", digestTimezone: "Asia/Kolkata" },
  push: { enabled: true, types: [] },
};

// 14-Notifications.md §4 — real-time delivery via SSE. A per-process
// in-memory registry (same interim-until-Redis pattern as rateLimiter.ts's
// store and tenantContext.ts's cache) — fine for single-instance local dev,
// would need a pub/sub fan-out (Redis) across multiple server instances.
const sseClients = new Map<string, Set<Response>>();

function parsePreferences(raw: string | null): NotificationPreferencesFormInput {
  if (!raw) return DEFAULT_PREFERENCES;
  try {
    return notificationPreferencesSchema.parse(JSON.parse(raw));
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function toPublic(n: {
  id: string;
  type: string;
  title: string;
  body: string;
  actionUrl: string | null;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    actionUrl: n.actionUrl,
    isRead: n.isRead,
    readAt: n.readAt,
    createdAt: n.createdAt,
  };
}

export const notificationService = {
  registerClient(userId: string, res: Response) {
    const set = sseClients.get(userId) ?? new Set<Response>();
    set.add(res);
    sseClients.set(userId, set);
  },

  unregisterClient(userId: string, res: Response) {
    const set = sseClients.get(userId);
    if (!set) return;
    set.delete(res);
    if (set.size === 0) sseClients.delete(userId);
  },

  pushRealtime(userId: string, notification: ReturnType<typeof toPublic>) {
    const set = sseClients.get(userId);
    if (!set) return;
    const payload = `data: ${JSON.stringify(notification)}\n\n`;
    for (const client of set) client.write(payload);
  },

  // Called from other modules (invites, billing, dunning, product health) to
  // notify a specific user of an event — creates the in-app row, pushes it
  // over SSE if the user has an open connection, and (since there's no email
  // provider wired up anywhere in this codebase — see auth's verify-email
  // TODO) logs an "email" line to the console instead of actually queuing one,
  // gated by the user's own category preference like the doc's shouldSendEmail.
  async notify(input: { organizationId: string; userId: string; type: string; title: string; body: string; actionUrl?: string }) {
    const saved = await notificationRepository.create({
      organizationId: input.organizationId,
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      actionUrl: input.actionUrl ?? null,
    });

    const publicNotification = toPublic(saved);
    notificationService.pushRealtime(input.userId, publicNotification);

    const category = categoryForType(input.type);
    const prefsRow = await notificationRepository.getUser(input.userId);
    const prefs = parsePreferences(prefsRow?.notificationPrefs ?? null);
    const emailEnabled = category === "security" ? true : prefs.email[category];
    if (emailEnabled) {
      console.log(`[dev] Notification email to user ${input.userId}: ${input.title} — ${input.body}`);
    }

    return publicNotification;
  },

  async list(organizationId: string, userId: string, opts: { page: number; limit: number; unreadOnly: boolean }) {
    const [rows, total] = await notificationRepository.list(organizationId, userId, opts);
    return { data: rows.map(toPublic), total };
  },

  unreadCount(organizationId: string, userId: string) {
    return notificationRepository.unreadCount(organizationId, userId);
  },

  async markRead(organizationId: string, userId: string, id: string) {
    const existing = await notificationRepository.findById(organizationId, userId, id);
    if (!existing) throw new NotFoundError("Notification not found");
    return toPublic(await notificationRepository.markRead(organizationId, id));
  },

  markAllRead(organizationId: string, userId: string) {
    return notificationRepository.markAllRead(organizationId, userId);
  },

  async delete(organizationId: string, userId: string, id: string) {
    const existing = await notificationRepository.findById(organizationId, userId, id);
    if (!existing) throw new NotFoundError("Notification not found");
    await notificationRepository.delete(organizationId, id);
  },

  async getPreferences(userId: string) {
    const row = await notificationRepository.getUser(userId);
    return parsePreferences(row?.notificationPrefs ?? null);
  },

  async updatePreferences(userId: string, input: NotificationPreferencesFormInput) {
    const merged: NotificationPreferencesFormInput = {
      email: { ...DEFAULT_PREFERENCES.email, ...input.email },
      push: { ...DEFAULT_PREFERENCES.push, ...input.push },
    };
    await notificationRepository.savePreferences(userId, JSON.stringify(merged));
    return merged;
  },
};
