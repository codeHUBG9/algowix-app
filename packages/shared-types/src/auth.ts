export interface AccessTokenPayload {
  userId: string;
  organizationId: string;
  orgSlug: string;
  email: string;
  role: string;
  plan: string;
  permissions: string[];
  sessionId: string;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
}

export interface AuthOrganization {
  id: string;
  slug: string;
  name: string;
  plan: string;
  status: string;
}

export interface LoginResponse {
  user: AuthUser;
  organization: AuthOrganization;
  expiresAt: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  organizationName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  organizationSlug?: string;
}
