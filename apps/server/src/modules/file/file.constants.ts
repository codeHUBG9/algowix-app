// 16-Files.md §5
export const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export const SIZE_LIMITS = {
  avatar: 5 * 1024 * 1024,
  logo: 2 * 1024 * 1024,
  document: 50 * 1024 * 1024,
  import: 100 * 1024 * 1024,
} as const;

// 16-Files.md §6 — quota expressed in MB; ENTERPRISE is unlimited (null).
const STORAGE_QUOTA_MB: Record<string, number | null> = {
  STARTER: 1 * 1024,
  GROWTH: 10 * 1024,
  BUSINESS: 100 * 1024,
  ENTERPRISE: null,
};

export function storageQuotaMb(plan: string): number | null {
  return plan in STORAGE_QUOTA_MB ? STORAGE_QUOTA_MB[plan]! : STORAGE_QUOTA_MB.STARTER!;
}

export const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "application/pdf": "pdf",
  "text/csv": "csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};
