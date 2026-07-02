import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../services/jwt.service.js";
import { UnauthorizedError } from "../utils/errors.js";
import type { AccessTokenPayload } from "@algowix/shared-types";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AccessTokenPayload;
    }
  }
}

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const bearer = req.headers.authorization?.replace("Bearer ", "");
    const token = req.cookies?.access_token ?? bearer;

    if (!token) throw new UnauthorizedError("No authentication token");

    req.auth = await verifyAccessToken(token);
    next();
  } catch {
    next(new UnauthorizedError("Invalid or expired token"));
  }
}
