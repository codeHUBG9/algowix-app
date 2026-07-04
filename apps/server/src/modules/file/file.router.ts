import { Router, raw } from "express";
import multer from "multer";
import { fileController } from "./file.controller.js";
import { authenticate } from "../../middleware/authenticate.js";
import { tieredRateLimiter } from "../../middleware/rateLimiter.js";
import { requirePermission } from "../../middleware/requirePermission.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { SIZE_LIMITS } from "./file.constants.js";

const avatarUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: SIZE_LIMITS.avatar } });

export const fileRouter = Router();

fileRouter.use(authenticate, tieredRateLimiter);

fileRouter.post("/presigned-url", requirePermission("files.manage"), asyncHandler(fileController.requestUpload));
// Raw binary body — the client PUTs file bytes directly here (this server's
// stand-in for "PUT directly to Azure Blob using uploadUrl", 16-Files.md §3).
fileRouter.put(
  "/:id/raw",
  requirePermission("files.manage"),
  raw({ type: "*/*", limit: `${SIZE_LIMITS.document}b` }),
  asyncHandler(fileController.writeRaw)
);
fileRouter.post("/:id/confirm", requirePermission("files.manage"), asyncHandler(fileController.confirm));
fileRouter.get("/storage-usage", requirePermission("files.read"), asyncHandler(fileController.storageUsage));
fileRouter.get("/avatar", asyncHandler(fileController.getMyAvatar));
fileRouter.post(
  "/avatar",
  avatarUpload.single("file"),
  asyncHandler(fileController.uploadAvatar)
);
fileRouter.get("/", requirePermission("files.read"), asyncHandler(fileController.list));
fileRouter.get("/:id", requirePermission("files.read"), asyncHandler(fileController.getById));
fileRouter.get("/:id/download", requirePermission("files.read"), asyncHandler(fileController.download));
fileRouter.delete("/:id", requirePermission("files.manage"), asyncHandler(fileController.remove));
