import type { Response } from "express";
import type { ApiResponse, ApiSuccess } from "@algowix/shared-types";

export function sendSuccess<T>(res: Response, data: T, statusCode = 200): void {
  const requestId = res.req.headers["x-request-id"] as string;
  const body: ApiResponse<T> = { success: true, data, requestId };
  res.status(statusCode).json(body);
}

export function sendPaginated<T>(res: Response, data: T, meta: ApiSuccess<T>["meta"], statusCode = 200): void {
  const requestId = res.req.headers["x-request-id"] as string;
  const body: ApiResponse<T> = { success: true, data, meta, requestId };
  res.status(statusCode).json(body);
}
