import type { Request, Response } from "express";
import { inviteService } from "./invite.service.js";
import { acceptInviteSchema } from "./organization.schema.js";
import { sendSuccess } from "../../utils/respond.js";
import { ValidationError } from "../../utils/errors.js";
import { env } from "../../config/env.js";
import type { TokenPair } from "../auth/auth.types.js";

const REFRESH_TOKEN_TTL_MS = env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;
const isProduction = env.NODE_ENV === "production";

function setAuthCookies(res: Response, tokens: TokenPair): void {
  res.cookie("access_token", tokens.accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: 15 * 60 * 1000,
  });
  res.cookie("refresh_token", tokens.refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: REFRESH_TOKEN_TTL_MS,
    path: "/api/v1/auth",
  });
}

export const inviteAcceptController = {
  async getTestToken(req: Request, res: Response) {
    const email = req.query.email;
    if (typeof email !== "string" || !email) throw new ValidationError("email query param is required");
    const token = await inviteService.getTestInviteToken(email);
    sendSuccess(res, { token });
  },

  async validate(req: Request, res: Response) {
    const token = req.params.token;
    if (!token) throw new ValidationError("Token is required");
    const info = await inviteService.validateInvite(token);
    sendSuccess(res, info);
  },

  async accept(req: Request, res: Response) {
    const token = req.params.token;
    if (!token) throw new ValidationError("Token is required");
    const input = acceptInviteSchema.parse(req.body);

    const authenticatedUser = req.auth ? { userId: req.auth.userId, email: req.auth.email } : undefined;
    const { tokens, organization } = await inviteService.accept(token, input, authenticatedUser, {
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    setAuthCookies(res, tokens);
    sendSuccess(res, {
      organization: { id: organization.id, slug: organization.slug, name: organization.name },
      expiresAt: tokens.expiresAt.toISOString(),
      redirectTo: "/dashboard",
    });
  },
};
