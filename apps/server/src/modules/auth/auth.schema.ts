import * as sharedTypes from "@algowix/shared-types";

export const registerSchema = sharedTypes.registerSchema;
export const loginSchema = sharedTypes.loginSchema;
export const verifyEmailSchema = sharedTypes.verifyEmailSchema;

export type RegisterInput = sharedTypes.RegisterFormInput;
export type LoginInput = sharedTypes.LoginFormInput;
export type VerifyEmailInput = sharedTypes.VerifyEmailFormInput;
