import { tenantRepository } from "../tenant/tenant.repository.js";
import { invalidateTenantCache } from "../../middleware/tenantContext.js";
import { NotFoundError } from "../../utils/errors.js";
import type {
  GeneralSettingsInput,
  BrandingSettingsInput,
  SecuritySettingsInput,
  NotificationSettingsInput,
} from "./organization.schema.js";

type SettingsCategory = "branding" | "security" | "notifications";

interface SettingsBlob {
  branding?: Record<string, unknown>;
  security?: Record<string, unknown>;
  notifications?: Record<string, unknown>;
}

function parseSettings(raw: string | null): SettingsBlob {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as SettingsBlob;
  } catch {
    return {};
  }
}

async function getCategory(organizationId: string, category: SettingsCategory) {
  const org = await tenantRepository.findById(organizationId);
  if (!org) throw new NotFoundError("Organization not found");
  const settings = parseSettings(org.settings);
  return settings[category] ?? {};
}

async function updateCategory(organizationId: string, category: SettingsCategory, patch: Record<string, unknown>) {
  const org = await tenantRepository.findById(organizationId);
  if (!org) throw new NotFoundError("Organization not found");

  const settings = parseSettings(org.settings);
  settings[category] = { ...settings[category], ...patch };

  await tenantRepository.update(organizationId, { settings: JSON.stringify(settings) });
  invalidateTenantCache(organizationId);
  return settings[category];
}

export const settingsService = {
  async getGeneral(organizationId: string) {
    const org = await tenantRepository.findById(organizationId);
    if (!org) throw new NotFoundError("Organization not found");
    return {
      name: org.name,
      timezone: org.timezone,
      language: org.language,
      currency: org.currency,
      dateFormat: org.dateFormat,
    };
  },

  async updateGeneral(organizationId: string, input: GeneralSettingsInput) {
    await tenantRepository.update(organizationId, { ...input });
    invalidateTenantCache(organizationId);
    return settingsService.getGeneral(organizationId);
  },

  getBranding(organizationId: string) {
    return getCategory(organizationId, "branding");
  },

  updateBranding(organizationId: string, input: BrandingSettingsInput) {
    return updateCategory(organizationId, "branding", input);
  },

  getSecurity(organizationId: string) {
    return getCategory(organizationId, "security");
  },

  updateSecurity(organizationId: string, input: SecuritySettingsInput) {
    return updateCategory(organizationId, "security", input);
  },

  getNotifications(organizationId: string) {
    return getCategory(organizationId, "notifications");
  },

  updateNotifications(organizationId: string, input: NotificationSettingsInput) {
    return updateCategory(organizationId, "notifications", input);
  },
};
