import { z } from "zod";
import * as sharedTypes from "@algowix/shared-types";

export const createSubscriptionSchema = sharedTypes.createSubscriptionSchema;
export const upgradeSubscriptionSchema = sharedTypes.upgradeSubscriptionSchema;
export const downgradeSubscriptionSchema = sharedTypes.downgradeSubscriptionSchema;
export const updateSeatsSchema = sharedTypes.updateSeatsSchema;
export const cancelSubscriptionSchema = sharedTypes.cancelSubscriptionSchema;

export type CreateSubscriptionInput = sharedTypes.CreateSubscriptionFormInput;
export type UpgradeSubscriptionInput = sharedTypes.UpgradeSubscriptionFormInput;
export type DowngradeSubscriptionInput = sharedTypes.DowngradeSubscriptionFormInput;
export type UpdateSeatsInput = sharedTypes.UpdateSeatsFormInput;
export type CancelSubscriptionInput = sharedTypes.CancelSubscriptionFormInput;

// Server-only

export const featureAccessQuerySchema = z.object({
  product: z.string().trim().min(1, "product is required"),
  feature: z.string().trim().min(1, "feature is required"),
});
export type FeatureAccessQuery = z.infer<typeof featureAccessQuerySchema>;
