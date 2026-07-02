import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/errors.js";
import type { ApiError } from "@algowix/shared-types";

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  const requestId = (req.headers["x-request-id"] as string) ?? "unknown";

  if (err instanceof ZodError) {
    const body: ApiError = {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Input validation failed",
        details: err.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      },
      requestId,
    };
    res.status(422).json(body);
    return;
  }

  if (err instanceof AppError) {
    const body: ApiError = {
      success: false,
      error: { code: err.code, message: err.message, details: err.details },
      requestId,
    };
    res.status(err.statusCode).json(body);
    return;
  }

  console.error(`[${requestId}] Unhandled error:`, err);
  const body: ApiError = {
    success: false,
    error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" },
    requestId,
  };
  res.status(500).json(body);
}
