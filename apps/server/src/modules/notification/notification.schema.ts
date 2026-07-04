import { z } from "zod";
import * as sharedTypes from "@algowix/shared-types";

export const notificationPreferencesSchema = sharedTypes.notificationPreferencesSchema;
export type NotificationPreferencesInput = sharedTypes.NotificationPreferencesFormInput;

export const notificationListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  unreadOnly: z.coerce.boolean().default(false),
});

export type NotificationListQueryInput = z.infer<typeof notificationListQuerySchema>;
