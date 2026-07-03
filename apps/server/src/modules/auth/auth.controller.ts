import type { Request, Response } from "express";
import { authService } from "./auth.service.js";
import { registerSchema, loginSchema, verifyEmailSchema } from "./auth.schema.js";
import { sendSuccess } from "../../utils/respond.js";
import { UnauthorizedError, ValidationError } from "../../utils/errors.js";
import { env } from "../../config/env.js";
import type { TokenPair } from "./auth.types.js";

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

function clearAuthCookies(res: Response): void {
  res.clearCookie("access_token");
  res.clearCookie("refresh_token", { path: "/api/v1/auth" });
}

function getContext(req: Request) {
  return {
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  };
}

export const authController = {
  async register(req: Request, res: Response) {
    const input = registerSchema.parse(req.body);
    const { response, tokens } = await authService.register(input, getContext(req));
    setAuthCookies(res, tokens);
    sendSuccess(res, response, 201);
  },

  async login(req: Request, res: Response) {
    const input = loginSchema.parse(req.body);
    const { response, tokens } = await authService.login(input, getContext(req));
    setAuthCookies(res, tokens);
    sendSuccess(res, response, 200);
  },

  async refresh(req: Request, res: Response) {
    const refreshToken = req.cookies?.refresh_token;
    if (!refreshToken) throw new UnauthorizedError("No refresh token provided");

    const tokens = await authService.refresh(refreshToken, getContext(req));
    setAuthCookies(res, tokens);
    sendSuccess(res, { expiresAt: tokens.expiresAt.toISOString() });
  },

  async logout(req: Request, res: Response) {
    const refreshToken = req.cookies?.refresh_token;
    if (refreshToken) await authService.logout(refreshToken);
    clearAuthCookies(res);
    sendSuccess(res, { loggedOut: true });
  },

  async verifyEmail(req: Request, res: Response) {
    const input = verifyEmailSchema.parse(req.body);
    await authService.verifyEmail(input);
    sendSuccess(res, { verified: true });
  },

  async getTestVerificationToken(req: Request, res: Response) {
    const email = req.query.email;
    if (typeof email !== "string" || !email) throw new ValidationError("email query param is required");
    const token = await authService.getTestVerificationToken(email);
    sendSuccess(res, { token });
  },

  async me(req: Request, res: Response) {
    sendSuccess(res, { auth: req.auth });
  },

  async sessions(req: Request, res: Response) {
    if (!req.auth) throw new UnauthorizedError();
    const sessions = await authService.listSessions(req.auth.userId);
    sendSuccess(
      res,
      sessions.map((s) => ({
        id: s.id,
        deviceType: s.deviceType,
        deviceName: s.deviceName,
        ipAddress: s.ipAddress,
        lastActiveAt: s.lastActiveAt,
        createdAt: s.createdAt,
      }))
    );
  },
};
