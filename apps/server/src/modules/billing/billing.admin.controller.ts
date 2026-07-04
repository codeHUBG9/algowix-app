import type { Request, Response } from "express";
import { runDunningJob } from "./dunning.service.js";
import { billingRepository } from "./billing.repository.js";
import { issueCreditSchema } from "./billing.schema.js";
import { sendSuccess } from "../../utils/respond.js";
import { ValidationError } from "../../utils/errors.js";

export const billingAdminController = {
  async runDunning(_req: Request, res: Response) {
    const result = await runDunningJob();
    sendSuccess(res, result);
  },

  async issueCredit(req: Request, res: Response) {
    const orgId = req.params.orgId;
    if (!orgId) throw new ValidationError("orgId is required");
    const input = issueCreditSchema.parse(req.body);
    const credit = await billingRepository.issueCredit(orgId, input.amount, input.reason, new Date(Date.now() + 365 * 24 * 60 * 60 * 1000));
    await billingRepository.writeAuditLog({
      organizationId: orgId,
      actorType: "PLATFORM_ADMIN",
      action: "credit.issued",
      resource: "credit",
      resourceId: credit.id,
    });
    sendSuccess(res, credit, 201);
  },
};
