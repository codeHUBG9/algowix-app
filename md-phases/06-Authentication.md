# AlgoWix Platform — 06 Authentication

**Document Version:** 1.0.0  
**Status:** Approved

---

## Table of Contents

1. [Authentication Overview](#1-authentication-overview)
2. [JWT Architecture](#2-jwt-architecture)
3. [Login Flow — Email/Password](#3-login-flow--emailpassword)
4. [Registration Flow](#4-registration-flow)
5. [Refresh Token Strategy](#5-refresh-token-strategy)
6. [OAuth 2.0 — Social Login](#6-oauth-20--social-login)
7. [SAML 2.0 — Enterprise SSO](#7-saml-20--enterprise-sso)
8. [Two-Factor Authentication](#8-two-factor-authentication)
9. [Magic Link Authentication](#9-magic-link-authentication)
10. [Session Management](#10-session-management)
11. [Product SSO Token (Cross-Product Launch)](#11-product-sso-token-cross-product-launch)
12. [Password Security](#12-password-security)
13. [Account Security Policies](#13-account-security-policies)
14. [Implementation Code](#14-implementation-code)

---

## 1. Authentication Overview

### 1.1 Auth Methods Supported

| Method | Target | Status |
|---|---|---|
| Email + Password | All users | V1 |
| Magic Link (Passwordless) | All users | V1 |
| Google OAuth 2.0 | SMB users | V1 |
| Microsoft OAuth 2.0 | Corporate users | V1 |
| SAML 2.0 | Enterprise (Okta, Azure AD) | V2 |
| SMS OTP | 2FA only | V1 |
| TOTP (Authenticator App) | 2FA only | V1 |

### 1.2 Token Architecture

```
Platform Issues:
├── Access Token (JWT RS256)    → Short-lived (15 min), used for all API calls
├── Refresh Token               → Long-lived (30 days), used to get new access token
└── Product Launch Token (JWT)  → Very short-lived (5 min), used for cross-product SSO
```

---

## 2. JWT Architecture

### 2.1 Key Pair

**Algorithm:** RS256 (RSA Signature with SHA-256)  
**Key Size:** 4096-bit RSA key pair  
**Storage:** Azure Key Vault (never in code or environment variables directly)  
**Rotation:** Every 90 days (zero-downtime rotation with 2-key overlap period)

Why RSA over HMAC (HS256)?
- Products (CRM, Inventory) can verify tokens using the public key only
- No shared secret required between platform and products
- Compromise of one product does not expose the signing key

### 2.2 Access Token Structure

```json
{
  "header": {
    "alg": "RS256",
    "typ": "JWT",
    "kid": "key-2025-01"
  },
  "payload": {
    "iss": "https://app.algowix.com",
    "sub": "user-uuid",
    "aud": "algowix-platform",
    "exp": 1735689600,
    "iat": 1735688700,
    "jti": "unique-token-id",

    // Platform claims
    "userId": "uuid",
    "organizationId": "uuid",
    "orgSlug": "acme-corp",
    "email": "user@acme.com",
    "role": "Admin",
    "plan": "BUSINESS",
    "permissions": ["users.read", "billing.read"],
    "sessionId": "session-uuid"
  }
}
```

### 2.3 Product Launch Token

A separate, scoped JWT issued only when a user launches a product:

```json
{
  "payload": {
    "iss": "https://app.algowix.com",
    "aud": "crm.algowix.com",
    "sub": "user-uuid",
    "exp": "iat + 5 minutes",
    "jti": "one-time-use-id",

    // Product-specific claims
    "userId": "uuid",
    "organizationId": "uuid",
    "productSlug": "crm",
    "tenantId": "crm-tenant-uuid",
    "productPermissions": ["contacts.read", "deals.manage"],
    "userDetails": {
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@acme.com",
      "avatarUrl": "..."
    }
  }
}
```

---

## 3. Login Flow — Email/Password

### 3.1 Happy Path

```
POST /api/v1/auth/login
Body: { email, password, organizationSlug? }

1. Validate input (Zod)
2. Find user by email (case-insensitive)
3. Check user exists → 401 if not (do not reveal "user not found")
4. Check user status = ACTIVE → 401/403 if locked/suspended
5. Verify password against bcrypt hash (argon2id preferred)
6. Check if login attempt is suspicious (new IP, new device)
7. If 2FA enabled → return { requiresTwoFactor: true, tempToken }
8. Generate session record in DB
9. Generate access token (JWT, 15 min)
10. Generate refresh token (opaque random string, 30 days)
11. Store refresh token hash in session record
12. Set httpOnly cookies: access_token, refresh_token
13. Update lastLoginAt, lastLoginIp
14. Emit user.logged_in event (for audit log)
15. Return 200: { user, organization, expiresAt }
```

### 3.2 Account Lockout

```
Failed attempt 1-4: Normal error "Invalid credentials"
Failed attempt 5: "5 failed attempts. Account will lock after 10."
Failed attempt 10: Account locked for 30 minutes
After 30 minutes: Account auto-unlocks
Admin can manually unlock via Users management
```

---

## 4. Registration Flow

```
POST /api/v1/auth/register
Body: { firstName, lastName, email, password, organizationName }

1. Validate all fields (Zod)
2. Check email not already registered
3. Check password strength (min 8 chars, complexity)
4. Hash password with argon2id (cost factor 3, parallelism 1)
5. Begin database transaction:
   a. Create User record
   b. Create Organization record (slug auto-generated from name)
   c. Create Owner OrgMembership
   d. Assign 'Owner' system role
   e. Create Subscription (Starter/Trial for default product)
6. Commit transaction
7. Generate email verification token (crypto.randomBytes(32))
8. Store verification token (expires 24 hours)
9. Send verification email (async via queue)
10. Auto-login: create session + tokens
11. Return 201: { user, organization, tokens }
```

---

## 5. Refresh Token Strategy

### 5.1 Refresh Flow

```
Access token expires (every 15 min):
Next API call → 401 → Client automatically calls:

POST /api/v1/auth/refresh
Cookie: refresh_token=xxx

Server:
1. Extract refresh token from httpOnly cookie
2. Hash the token
3. Find matching session in DB
4. Check session not revoked
5. Check session not expired (30 days)
6. Issue new access token (JWT, 15 min)
7. Rotate refresh token (issue new, invalidate old)
8. Return new tokens in httpOnly cookies
```

### 5.2 Refresh Token Rotation

Every refresh issues a brand new refresh token and invalidates the old one. This means:
- Stolen refresh tokens are detected (old token reuse attempt → immediate session revocation)
- Implements "Refresh Token Reuse Detection" pattern

```typescript
// If old refresh token is used after rotation → it's stolen
// Immediately revoke ALL sessions for that user (nuclear option for security)
if (refreshToken.wasAlreadyUsed) {
  await sessionService.revokeAllUserSessions(userId);
  throw new SecurityError('REFRESH_TOKEN_REUSE_DETECTED');
}
```

---

## 6. OAuth 2.0 — Social Login

### 6.1 Supported Providers

| Provider | Use Case | Client Registration |
|---|---|---|
| Google | SMB users with Gmail/Workspace | Google Cloud Console |
| Microsoft | Enterprise users with Office 365 | Azure App Registration |

### 6.2 OAuth Flow

```
GET /api/v1/auth/oauth/google
→ Generate state parameter (CSRF protection)
→ Store state in session
→ Redirect to Google OAuth URL

Google authenticates user
→ Redirects to /api/v1/auth/oauth/google/callback?code=xxx&state=xxx

Server:
1. Validate state parameter (CSRF check)
2. Exchange code for access + id_token
3. Verify id_token with Google public keys
4. Extract: email, name, picture, sub (Google user ID)
5. Find or create user:
   a. OAuthAccount exists? → Find linked user
   b. Email exists? → Link to existing user (with consent)
   c. New user? → Create user + org
6. Create session
7. Redirect to /dashboard
```

---

## 7. SAML 2.0 — Enterprise SSO

### 7.1 SAML Configuration

Enterprise customers configure SAML via Settings → Security → Enterprise SSO:

```
Required configuration:
- Identity Provider (IdP) Entity ID (Issuer)
- IdP SSO URL (Entry Point)
- X.509 Certificate (for signature verification)

AlgoWix provides:
- Service Provider (SP) Entity ID: https://app.algowix.com
- ACS URL: https://app.algowix.com/api/v1/auth/saml/{orgSlug}/callback
- Metadata URL: https://app.algowix.com/api/v1/auth/saml/{orgSlug}/metadata
```

### 7.2 SAML Flow

```
1. User navigates to https://app.algowix.com/login
2. Enters work email → platform detects org has SAML
3. Platform generates SAMLRequest
4. Browser redirects to IdP (Okta/Azure AD)
5. IdP authenticates user (org's internal credentials)
6. IdP posts SAMLResponse to ACS URL
7. Platform validates:
   a. Signature (using stored certificate)
   b. Conditions (NotBefore, NotOnOrAfter)
   c. Recipient URL matches ACS URL
8. Platform extracts NameID (email), attributes
9. JIT Provisioning: find or create user
10. Create platform session
11. Redirect to dashboard
```

### 7.3 Just-In-Time (JIT) Provisioning

When SAML is enabled, users are auto-created on first login:
- Email and name extracted from SAML attributes
- Role assigned based on SAML group attribute (configurable)
- Organization membership auto-assigned

---

## 8. Two-Factor Authentication

### 8.1 TOTP (Authenticator App)

**Supported apps:** Google Authenticator, Authy, Microsoft Authenticator, 1Password

```typescript
// Setup flow
POST /api/v1/auth/2fa/enable
1. Generate TOTP secret (speakeasy.generateSecret())
2. Return QR code URL + secret for user to scan
3. User scans QR code in authenticator app
4. User confirms with first 6-digit code

POST /api/v1/auth/2fa/verify-setup  { token: "123456" }
1. Verify TOTP token
2. Store secret (encrypted) in DB
3. Generate 8 backup codes (store hashes)
4. Return backup codes to user (shown once)
5. Enable 2FA on account
```

### 8.2 Login with 2FA

```
1. User submits email + password → Server validates
2. Server returns: { requiresTwoFactor: true, tempToken }
3. Client shows 2FA input form
4. User enters 6-digit code

POST /api/v1/auth/2fa/verify { tempToken, code }
1. Validate temp token (1 min expiry)
2. Verify TOTP code (allow ±1 step for clock drift)
3. Complete login: issue access + refresh tokens
4. Invalidate temp token
```

### 8.3 Backup Codes

- 8 single-use backup codes generated at 2FA setup
- Each code shown once and stored as bcrypt hash
- Can be used instead of TOTP if phone lost
- Used codes marked as consumed (cannot be reused)
- Can regenerate all backup codes (invalidates previous set)

---

## 9. Magic Link Authentication

```
POST /api/v1/auth/magic-link  { email }
1. Check user exists
2. Generate secure token (crypto.randomBytes(32).toString('hex'))
3. Store token hash (expires 15 min)
4. Send email with magic link: https://app.algowix.com/auth/magic?token=xxx
5. Return: { message: "Check your email" }

GET /api/v1/auth/magic  ?token=xxx
1. Hash the incoming token
2. Find matching record in DB
3. Check not expired
4. Check not already used → mark as used
5. Complete login flow
6. Return session tokens
```

---

## 10. Session Management

### 10.1 Session Metadata Captured

```typescript
interface Session {
  id: string;
  userId: string;
  organizationId: string;
  ipAddress: string;           // For security display
  userAgent: string;           // Browser/app info
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'api';
  deviceName: string;          // "Chrome on Windows", "iPhone 15"
  location?: string;           // Approximate: "Mumbai, India"
  lastActiveAt: Date;
  expiresAt: Date;
  createdAt: Date;
}
```

### 10.2 Session Listing

Users can view all active sessions:

```
GET /api/v1/auth/sessions
Returns: [
  {
    id: "...",
    current: true,
    device: "Chrome on MacOS",
    ip: "103.21.xxx.xxx",
    location: "Mumbai, India",
    lastActiveAt: "2025-01-01T10:00:00Z"
  },
  ...
]
```

### 10.3 Session Revocation

```
DELETE /api/v1/auth/sessions/:sessionId   → Revoke specific session
DELETE /api/v1/auth/sessions              → Revoke all other sessions
```

---

## 11. Product SSO Token (Cross-Product Launch)

### 11.1 Launch Flow

```
User clicks "Open CRM" button in platform:

GET /api/v1/products/crm/launch

1. Verify user's platform session
2. Fetch user's CRM subscription → must be ACTIVE
3. Check user has permission to access CRM
4. Generate product-specific JWT (RS256):
   - audience: "crm.algowix.com"
   - expiry: 5 minutes
   - jti: one-time UUID (prevent reuse)
   - payload: userId, orgId, tenantId, permissions
5. Store jti in Redis (expires in 6 min)
6. Return: { launchUrl: "https://crm.algowix.com/auth/platform?token=xxx" }
7. Frontend redirects to launchUrl
```

### 11.2 Product-Side Token Validation

Each product (CRM, Inventory) must implement this endpoint:

```typescript
// crm.algowix.com/auth/platform
GET /auth/platform?token=xxx

Product validates:
1. Decode JWT header → get kid (key ID)
2. Fetch AlgoWix public key: GET https://app.algowix.com/.well-known/jwks.json
3. Cache public key (refresh every 24 hours)
4. Verify JWT signature with public key
5. Check aud === "crm.algowix.com"
6. Check exp not passed
7. Check jti not already used → mark as used in Redis
8. Extract userId, orgId, tenantId
9. Create local product session
10. Redirect to CRM dashboard
```

### 11.3 JWKS Endpoint

```
GET https://app.algowix.com/.well-known/jwks.json
Response:
{
  "keys": [
    {
      "kty": "RSA",
      "use": "sig",
      "kid": "key-2025-01",
      "alg": "RS256",
      "n": "...",
      "e": "AQAB"
    }
  ]
}
```

---

## 12. Password Security

### 12.1 Hashing

```typescript
// Algorithm: argon2id (preferred over bcrypt for new implementations)
import argon2 from 'argon2';

const hash = await argon2.hash(password, {
  type: argon2.argon2id,
  memoryCost: 65536,    // 64 MB
  timeCost: 3,          // 3 iterations
  parallelism: 4,       // 4 threads
});
```

### 12.2 Password Requirements

```
Minimum length: 8 characters
Maximum length: 128 characters (prevent DoS via long password hashing)
Must contain: at least one uppercase, one lowercase, one number
Recommended: one special character
Prohibited: common passwords (checked against Have I Been Pwned API)
Prohibited: email address as password
Prohibited: organization name as password
```

### 12.3 Password Reset

```
POST /api/v1/auth/forgot-password  { email }
1. Find user (always return 200 — do not reveal if email exists)
2. If user exists:
   a. Generate reset token (32 bytes hex)
   b. Store token hash (expires 1 hour)
   c. Send password reset email
3. Rate limit: max 3 reset emails per hour per IP

GET /api/v1/auth/reset-password?token=xxx  → validate token
POST /api/v1/auth/reset-password  { token, newPassword }
1. Find token, check not expired, not used
2. Validate new password strength
3. Hash new password
4. Update user password
5. Mark token as used
6. Revoke ALL existing sessions (security measure)
7. Send "password changed" security notification email
```

---

## 13. Account Security Policies

### 13.1 Organization Security Policies

Organization admins can configure:

```typescript
interface SecurityPolicy {
  enforceStrongPasswords: boolean;
  minimumPasswordLength: number;          // 8-20
  requireTwoFactor: boolean;              // Force 2FA for all users
  sessionTimeoutMinutes: number;          // 30, 60, 240, 480, 1440
  allowedIpRanges: string[];             // CIDR notation
  allowSocialLogin: boolean;
  allowMagicLink: boolean;
  maxActiveSessions: number;              // 1-10
  singleSessionMode: boolean;             // Only one active session at a time
}
```

### 13.2 Suspicious Activity Detection

```
Triggers:
- Login from new country
- Login from new device type
- Login at unusual time (3am when user typically logs in at 9am)
- Multiple failed 2FA attempts
- Bulk data export attempt

Actions:
- Send security alert email
- Require additional verification
- Log to audit as CRITICAL severity
- Notify organization admin
```

---

## 14. Implementation Code

### 14.1 Auth Middleware

```typescript
// middleware/authenticate.ts
import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../services/jwt.service';
import { SessionRepository } from '../modules/auth/auth.repository';

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies['access_token'] || req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) throw new UnauthorizedError('No authentication token');
    
    const payload = await verifyAccessToken(token);
    
    // Attach to request context
    req.auth = {
      userId: payload.userId,
      organizationId: payload.organizationId,
      orgSlug: payload.orgSlug,
      role: payload.role,
      permissions: payload.permissions,
      sessionId: payload.sessionId,
    };
    
    next();
  } catch (error) {
    next(new UnauthorizedError('Invalid or expired token'));
  }
}
```

### 14.2 JWT Service

```typescript
// services/jwt.service.ts
import { SignJWT, jwtVerify, importPKCS8, importSPKI } from 'jose';
import { getSecret } from './vault.service';

const ISSUER = 'https://app.algowix.com';
const ACCESS_TOKEN_EXPIRY = '15m';
const PRODUCT_TOKEN_EXPIRY = '5m';

export async function generateAccessToken(payload: AccessTokenPayload): Promise<string> {
  const privateKey = await getPrivateKey();
  
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'RS256', kid: getCurrentKeyId() })
    .setIssuer(ISSUER)
    .setAudience('algowix-platform')
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .setJti(crypto.randomUUID())
    .sign(privateKey);
}

export async function generateProductLaunchToken(
  payload: ProductTokenPayload,
  productAudience: string
): Promise<string> {
  const privateKey = await getPrivateKey();
  
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'RS256', kid: getCurrentKeyId() })
    .setIssuer(ISSUER)
    .setAudience(productAudience)
    .setIssuedAt()
    .setExpirationTime(PRODUCT_TOKEN_EXPIRY)
    .setJti(crypto.randomUUID())
    .sign(privateKey);
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  const publicKey = await getPublicKey();
  const { payload } = await jwtVerify(token, publicKey, {
    issuer: ISSUER,
    audience: 'algowix-platform',
  });
  return payload as AccessTokenPayload;
}
```

---

*Next: [07-Tenant-Management.md — Multi-tenancy Architecture, Tenant Provisioning & Isolation]*

---
**Document Control**  
Owner: Security Lead + Platform Architect  
Review: Before any auth system change; after any security incident
