import { auditRepository } from "./audit.repository.js";
import { NotFoundError } from "../../utils/errors.js";
import type { AuditQueryInput, AuditExportQueryInput } from "./audit.schema.js";

function csvEscape(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

const CSV_COLUMNS = [
  "id",
  "createdAt",
  "actorType",
  "actorEmail",
  "action",
  "resource",
  "resourceId",
  "severity",
  "ipAddress",
] as const;

export const auditService = {
  async list(organizationId: string, query: AuditQueryInput) {
    const [rows, total] = await auditRepository.list(organizationId, query);
    return { data: rows, total };
  },

  async getById(organizationId: string, id: string) {
    const entry = await auditRepository.findById(organizationId, id);
    if (!entry) throw new NotFoundError("Audit log entry not found");
    return {
      ...entry,
      before: entry.before ? JSON.parse(entry.before) : null,
      after: entry.after ? JSON.parse(entry.after) : null,
    };
  },

  stats(organizationId: string, from?: string, to?: string) {
    const toDate = to ? new Date(to) : new Date();
    const fromDate = from ? new Date(from) : new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    return auditRepository.stats(organizationId, fromDate, toDate);
  },

  async exportRows(organizationId: string, query: AuditExportQueryInput) {
    const rows = await auditRepository.exportRows(organizationId, query);

    if (query.format === "json") {
      return { contentType: "application/json", body: JSON.stringify(rows, null, 2) };
    }

    const lines = [CSV_COLUMNS.join(",")];
    for (const row of rows) {
      lines.push(CSV_COLUMNS.map((col) => csvEscape((row as Record<string, unknown>)[col])).join(","));
    }
    return { contentType: "text/csv", body: lines.join("\n") };
  },
};
