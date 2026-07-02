# AlgoWix Platform — 22 Security

**Document Version:** 1.0.0  
**Status:** Approved  
**Classification:** CONFIDENTIAL — Internal Only

---

## 1. Security Philosophy

Security is not a feature. It is a property of every component.

Every engineer is responsible for security in their code. Security reviews are required before any authentication, billing, or data handling change is deployed.

---

## 2. Threat Model

### Assets to Protect

| Asset | Sensitivity | Impact if Compromised |
|---|---|---|
| Customer data (business records) | CRITICAL | Legal liability, reputation damage |
| Payment data (card tokens) | CRITICAL | PCI compliance violation |
| JWT signing keys | CRITICAL | Platform-wide authentication bypass |
| Organization tenant data | HIGH | Data breach |
| Audit logs | HIGH | Compliance failure |
| API keys | HIGH | Unauthorized API access |
| User credentials | HIGH | Account takeover |

### Threat Actors

| Actor | Motivation | Capability |
|---|---|---|
| External hacker | Data theft, ransomware | Medium |
| Malicious insider | Data exfiltration | High (has access) |
| Competitor | Industrial espionage | Low |
| State actor | Mass surveillance | Very High (rare) |
| Automated bot | Credential stuffing, DDoS | Medium |

### Top 10 Threats (OWASP-aligned)

```
T1: Broken Authentication (weak passwords, no 2FA, session fixation)
T2: Injection (SQL injection, command injection)
T3: Broken Access Control (IDOR, privilege escalation)
T4: Security Misconfiguration (exposed debug endpoints, default passwords)
T5: Cross-Site Scripting (XSS) in the Next.js frontend
T6: Sensitive Data Exposure (logging PII, unencrypted data)
T7: SSRF (Server-Side Request Forgery) via webhook URLs
T8: Rate Limiting Bypass (brute force, API abuse)
T9: Supply Chain Attack (compromised npm packages)
T10: Cross-Tenant Data Access (missing organizationId filter)
```

---

## 3. Security Controls

### 3.1 Input Validation

```typescript
// ALL inputs validated with Zod before processing
// No raw SQL string concatenation — ever
// All user-controlled content HTML-escaped before rendering

const loginSchema = z.object({
  email: z.string().email().max(255).toLowerCase(),
  password: z.string().min(8).max(128),
});
```

### 3.2 SQL Injection Prevention

```typescript
// Prisma ORM provides parameterized queries by default
// If raw SQL is required:
await prisma.$queryRaw`SELECT * FROM Users WHERE Email = ${email}`;
// Never:
await prisma.$queryRawUnsafe(`SELECT * FROM Users WHERE Email = '${email}'`); // FORBIDDEN
```

### 3.3 SSRF Prevention (Webhooks)

```typescript
// Validate webhook URLs to prevent internal network access
const BLOCKED_HOSTS = ['localhost', '127.0.0.1', '::1', '0.0.0.0', '169.254.169.254'];
const BLOCKED_CIDRS = ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16'];

function validateWebhookUrl(url: string): void {
  const parsed = new URL(url);
  
  if (!['https:'].includes(parsed.protocol)) {
    throw new ValidationError('Webhook URL must use HTTPS');
  }
  
  if (BLOCKED_HOSTS.includes(parsed.hostname)) {
    throw new ValidationError('Webhook URL cannot point to internal hosts');
  }
  
  // IP range check via library
  if (isPrivateIP(parsed.hostname)) {
    throw new ValidationError('Webhook URL cannot point to private IP ranges');
  }
}
```

### 3.4 Security Headers (Helmet.js)

```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'nonce-{generated}'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https://cdn.algowix.com"],
      connectSrc: ["'self'", "https://api.algowix.com"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
```

---

## 4. Secrets Management

```
RULE: Zero secrets in code. Zero secrets in environment variable files committed to git.

All secrets stored in Azure Key Vault:
- Database connection strings
- Redis connection strings
- JWT RSA private keys
- Payment gateway keys
- Email service keys
- Internal shared secrets

Access via:
- Azure Managed Identity (no credential needed in App Service)
- Key Vault references in App Service config: @Microsoft.KeyVault(SecretUri=...)

Secret rotation:
- JWT keys: every 90 days (automated)
- Payment keys: manual, after any suspected compromise
- Internal shared secrets: every 6 months
```

---

## 5. Data Encryption

### In Transit
- TLS 1.2 minimum, TLS 1.3 preferred
- HSTS with preload
- Certificate: Let's Encrypt or Azure-managed

### At Rest
- Azure SQL: Transparent Data Encryption (TDE) — enabled by default
- Azure Blob: Storage Service Encryption (AES-256) — enabled by default
- Redis: Encryption at rest — enabled
- Backups: Encrypted with customer-managed keys (CMK) for Enterprise

### Sensitive Field Encryption (Application Level)

```typescript
// Fields encrypted at application layer (beyond DB encryption):
// - TOTP secrets
// - OAuth tokens
// - SAML certificates

import { encrypt, decrypt } from '../utils/crypto';

// Before saving:
const encryptedSecret = encrypt(totpSecret, process.env.APP_ENCRYPTION_KEY);

// Before using:
const plainSecret = decrypt(encryptedSecret, process.env.APP_ENCRYPTION_KEY);
```

---

## 6. Penetration Testing Schedule

| Type | Frequency | Provider |
|---|---|---|
| Automated SAST (Static Analysis) | Every PR | Snyk, SonarQube |
| Automated DAST (Dynamic) | Weekly | OWASP ZAP |
| Manual Penetration Test | Quarterly | Third-party firm |
| Bug Bounty Program | Ongoing | HackerOne |

---

## 7. Incident Response

### P0 Security Incident Playbook

```
1. DETECT: Alert fired or report received
2. CONTAIN (within 15 min):
   - Revoke compromised credentials immediately
   - Block suspicious IPs via Cloudflare
   - Enable maintenance mode if needed
3. ASSESS (within 1 hour):
   - Scope: which data, which tenants affected?
   - Timeline: when did it start?
   - Vector: how did it happen?
4. NOTIFY (within 72 hours of discovery):
   - Affected customers (if data breach)
   - Regulatory authorities (if required by law)
   - All-hands engineering call
5. REMEDIATE:
   - Deploy fix
   - Rotate all potentially compromised secrets
   - Patch vulnerability
6. POST-MORTEM (within 7 days):
   - Root cause analysis
   - Timeline reconstruction
   - Prevention measures
   - Update threat model
```

---

## 8. Compliance

| Standard | Status | Target |
|---|---|---|
| ISO 27001 | Not yet | Year 2 |
| SOC 2 Type I | Not yet | Year 2 |
| SOC 2 Type II | Not yet | Year 3 |
| GDPR | Partially compliant | Full compliance Year 1 |
| India IT Act 2000 | Compliant | Maintained |
| PCI DSS | Not applicable (no card data stored) | N/A |

---

*Next: [23-CI-CD.md — CI/CD Pipelines, Testing Strategy, Quality Gates]*

---
**Document Control**  
Owner: Security Lead + CTO  
Review: After any security incident; quarterly
