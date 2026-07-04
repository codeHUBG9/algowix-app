// 18-Integrations.md §1 — native integration catalog. No real OAuth apps are
// registered with any of these providers in this environment (no Google/Slack
// developer console access), so every connect flow uses the mock OAuth
// exchange in integration.service.ts regardless of what a production
// deployment's real credentials would look like.
export interface IntegrationCatalogEntry {
  provider: string;
  name: string;
  category: "Communication" | "Productivity" | "Finance" | "Payments" | "HR" | "Analytics";
  scopes: string[];
}

export const INTEGRATION_CATALOG: IntegrationCatalogEntry[] = [
  { provider: "gmail", name: "Gmail", category: "Communication", scopes: ["email.read", "email.send"] },
  { provider: "outlook", name: "Outlook", category: "Communication", scopes: ["email.read", "email.send"] },
  { provider: "slack", name: "Slack", category: "Communication", scopes: ["chat:write", "channels:read"] },
  { provider: "whatsapp_business", name: "WhatsApp Business", category: "Communication", scopes: ["messages.send"] },
  { provider: "google_drive", name: "Google Drive", category: "Productivity", scopes: ["files.read", "files.write"] },
  { provider: "onedrive", name: "OneDrive", category: "Productivity", scopes: ["files.read", "files.write"] },
  { provider: "notion", name: "Notion", category: "Productivity", scopes: ["pages.read", "pages.write"] },
  { provider: "tally", name: "Tally", category: "Finance", scopes: ["ledgers.read"] },
  { provider: "zoho_books", name: "Zoho Books", category: "Finance", scopes: ["invoices.read", "invoices.write"] },
  { provider: "quickbooks", name: "QuickBooks", category: "Finance", scopes: ["accounting.read"] },
  { provider: "linkedin", name: "LinkedIn", category: "HR", scopes: ["profile.read"] },
  { provider: "naukri", name: "Naukri", category: "HR", scopes: ["candidates.read"] },
  { provider: "keka", name: "Keka", category: "HR", scopes: ["employees.read"] },
  { provider: "google_analytics", name: "Google Analytics", category: "Analytics", scopes: ["analytics.read"] },
  { provider: "mixpanel", name: "Mixpanel", category: "Analytics", scopes: ["events.read"] },
];

export function findIntegration(provider: string): IntegrationCatalogEntry | undefined {
  return INTEGRATION_CATALOG.find((i) => i.provider === provider);
}
