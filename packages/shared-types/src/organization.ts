export interface Branch {
  id: string;
  name: string;
  code: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  pincode: string | null;
  phone: string | null;
  isHeadOffice: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Department {
  id: string;
  name: string;
  code: string | null;
  parentId: string | null;
  headUserId: string | null;
  headUser: { id: string; firstName: string; lastName: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
}

export type TeamRole = "LEAD" | "MEMBER" | "OBSERVER";

export interface TeamMember {
  id: string;
  role: TeamRole;
  joinedAt: string;
  user: { id: string; firstName: string; lastName: string; email: string; avatarUrl: string | null };
}

export interface Team {
  id: string;
  name: string;
  description: string | null;
  members: TeamMember[];
  createdAt: string;
  updatedAt: string;
}

export type MemberStatus = "ACTIVE" | "INVITED" | "SUSPENDED";

export interface OrgMember {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
  role: { id: string; name: string };
  status: MemberStatus;
  isPrimary: boolean;
  joinedAt: string;
  lastLoginAt: string | null;
  productAccess: string[];
}

export type InviteStatus = "PENDING" | "ACCEPTED" | "EXPIRED" | "CANCELLED";

export interface OrgInvite {
  id: string;
  email: string;
  role: { id: string; name: string };
  status: InviteStatus;
  expiresAt: string;
  createdAt: string;
}

export interface OrgRole {
  id: string;
  name: string;
  isSystem: boolean;
}

export interface InviteValidation {
  email: string;
  organizationName: string;
  organizationSlug: string;
  roleName: string;
  expiresAt: string;
  userExists: boolean;
}
