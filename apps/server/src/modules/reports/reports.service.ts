import { reportsRepository } from "./reports.repository.js";
import { auditRepository } from "../audit/audit.repository.js";

function csvFrom(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const columns = Object.keys(rows[0]!);
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [columns.join(",")];
  for (const row of rows) lines.push(columns.map((c) => escape(row[c])).join(","));
  return lines.join("\n");
}

export const reportsService = {
  async dashboard(organizationId: string) {
    const [summary, userGrowth] = await Promise.all([
      reportsRepository.dashboardSummary(organizationId),
      reportsRepository.userGrowth(organizationId),
    ]);
    return { ...summary, userGrowth };
  },

  users(organizationId: string) {
    return reportsRepository.userActivity(organizationId);
  },

  billing(organizationId: string) {
    return reportsRepository.billingReport(organizationId);
  },

  products(organizationId: string) {
    return reportsRepository.productUsage(organizationId);
  },

  async auditSummary(organizationId: string) {
    const to = new Date();
    const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
    return auditRepository.stats(organizationId, from, to);
  },

  // 17-Reports.md §5 — the doc models this as an async job (POST returns a
  // jobId, GET polls for a downloadUrl). No BullMQ/Redis in this environment
  // (same deferral as every other "background job" in this codebase — see
  // 07's purge job, 09's health checks), and every report here is small
  // enough to compute synchronously, so this returns the CSV directly
  // instead of a job handle.
  async export(organizationId: string, reportType: "users" | "billing" | "products") {
    if (reportType === "users") {
      const data = await reportsRepository.userActivity(organizationId);
      return csvFrom(data.mostActiveUsers as unknown as Record<string, unknown>[]);
    }
    if (reportType === "billing") {
      const data = await reportsRepository.billingReport(organizationId);
      return csvFrom(data.invoiceHistory as unknown as Record<string, unknown>[]);
    }
    const data = await reportsRepository.productUsage(organizationId);
    return csvFrom(data as unknown as Record<string, unknown>[]);
  },
};
