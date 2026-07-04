import { z } from "zod";
import * as sharedTypes from "@algowix/shared-types";

export const filePresignedUrlSchema = sharedTypes.filePresignedUrlSchema;
export type FilePresignedUrlInput = sharedTypes.FilePresignedUrlFormInput;

export const fileListQuerySchema = z.object({
  folder: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type FileListQueryInput = z.infer<typeof fileListQuerySchema>;
