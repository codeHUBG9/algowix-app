import { Router } from "express";
import { authRouter } from "./modules/auth/auth.router.js";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
