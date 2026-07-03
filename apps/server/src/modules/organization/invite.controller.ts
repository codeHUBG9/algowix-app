import type { Request, Response } from "express";
import { inviteService } from "./invite.service.js";
import { inviteMemberSchema, bulkInviteRowSchema, type BulkInviteRow } from "./organization.schema.js";
import { sendSuccess } from "../../utils/respond.js";
import { UnauthorizedError, ValidationError } from "../../utils/errors.js";

function inviterFromRequest(req: Request) {
  if (!req.auth) throw new UnauthorizedError();
  return { userId: req.auth.userId, email: req.auth.email };
}

/** Minimal CSV parser for the fixed `email,firstName,lastName,role` shape — no quoted-field support needed for this form. */
function parseCsv(text: string): Record<string, string>[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length < 2) return [];

  const headers = (lines[0] ?? "").split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(",").map((c) => c.trim());
    return Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? ""]));
  });
}

export const inviteController = {
  async list(req: Request, res: Response) {
    const invites = await inviteService.list(req.params.id!);
    sendSuccess(res, invites);
  },

  async create(req: Request, res: Response) {
    const input = inviteMemberSchema.parse(req.body);
    const result = await inviteService.create(req.params.id!, input, inviterFromRequest(req));
    sendSuccess(res, result, 201);
  },

  async cancel(req: Request, res: Response) {
    await inviteService.cancel(req.params.id!, req.params.inviteId!, inviterFromRequest(req));
    sendSuccess(res, { cancelled: true });
  },

  async bulkCreate(req: Request, res: Response) {
    if (!req.file) throw new ValidationError("CSV file is required (multipart field name: file)");

    const rows: BulkInviteRow[] = [];
    for (const row of parseCsv(req.file.buffer.toString("utf-8"))) {
      const parsed = bulkInviteRowSchema.safeParse(row);
      if (parsed.success) rows.push(parsed.data);
    }

    if (rows.length === 0) throw new ValidationError("No valid rows found in CSV (expected: email,firstName,lastName,role)");

    const results = await inviteService.bulkCreate(req.params.id!, rows, inviterFromRequest(req));
    sendSuccess(res, { results }, 201);
  },
};
