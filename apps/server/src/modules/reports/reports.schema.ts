import { z } from "zod";

export const reportExportQuerySchema = z.object({
  reportType: z.enum(["users", "billing", "products"]),
});

export type ReportExportQueryInput = z.infer<typeof reportExportQuerySchema>;
