import { prisma } from "../../database/prisma.js";
import { tenantScopedClient } from "../../database/tenant-scope.js";

export const notificationRepository = {
  create(data: {
    organizationId: string;
    userId: string;
    type: string;
    title: string;
    body: string;
    actionUrl?: string | null;
  }) {
    return prisma.notification.create({ data });
  },

  list(organizationId: string, userId: string, opts: { page: number; limit: number; unreadOnly: boolean }) {
    const where = { userId, ...(opts.unreadOnly ? { isRead: false } : {}) };
    return Promise.all([
      tenantScopedClient(organizationId).notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (opts.page - 1) * opts.limit,
        take: opts.limit,
      }),
      tenantScopedClient(organizationId).notification.count({ where }),
    ]);
  },

  unreadCount(organizationId: string, userId: string) {
    return tenantScopedClient(organizationId).notification.count({ where: { userId, isRead: false } });
  },

  findById(organizationId: string, userId: string, id: string) {
    return tenantScopedClient(organizationId).notification.findFirst({ where: { id, userId } });
  },

  markRead(organizationId: string, id: string) {
    return tenantScopedClient(organizationId).notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  },

  markAllRead(organizationId: string, userId: string) {
    return tenantScopedClient(organizationId).notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  },

  delete(organizationId: string, id: string) {
    return tenantScopedClient(organizationId).notification.delete({ where: { id } });
  },

  getUser(userId: string) {
    return prisma.user.findUnique({ where: { id: userId }, select: { notificationPrefs: true } });
  },

  savePreferences(userId: string, prefs: string) {
    return prisma.user.update({ where: { id: userId }, data: { notificationPrefs: prefs } });
  },
};
