# AlgoWix Platform — 16 File Management

**Document Version:** 1.0.0  
**Status:** Approved

---

## 1. File Service Overview

The File Service provides centralized file storage for the platform and all AlgoWix products. It handles:
- Organization logo, user avatars
- Invoice PDFs
- Document uploads (contracts, receipts)
- Bulk import/export files (CSV, XLSX)
- Product-specific files proxied through platform

---

## 2. Storage Architecture

```
Azure Blob Storage
├── Container: platform-public          (CDN-backed, public read)
│   ├── avatars/{userId}/profile.jpg
│   └── org-logos/{orgId}/logo.png
│
├── Container: platform-private         (Authenticated access via SAS)
│   ├── files/{orgId}/{year}/{month}/{fileId}.{ext}
│   └── imports/{orgId}/{jobId}.csv
│
└── Container: invoices                 (Internal only)
    └── {year}/{month}/{invoiceId}.pdf
```

---

## 3. Upload Flow (Direct to Blob)

```
Client requests upload permission:
POST /api/v1/files/presigned-url
Body: { filename, mimeType, sizeBytes, folder? }

Server:
1. Validate mime type (whitelist: image/*, application/pdf, text/csv, etc.)
2. Validate file size (max 50MB default, 200MB for enterprise)
3. Virus scan pre-check: flag if size suggests executable
4. Generate SAS token (15 min expiry, write-only)
5. Create pending FileRecord in DB
6. Return: { uploadUrl, fileId, sasToken }

Client:
7. PUT file directly to Azure Blob using uploadUrl
8. Azure Blob accepts file (no server intermediary — no bandwidth cost)

Client notifies server:
POST /api/v1/files/:fileId/confirm

Server:
9. Verify file exists in blob storage
10. Validate file size matches declared
11. Queue virus scan (ClamAV / Azure Defender)
12. Update FileRecord.status = 'READY' (or 'SCANNING')
13. Return permanent CDN URL
```

---

## 4. Access Control

### Public Files (Avatars, Logos)

- Stored in `platform-public` container
- CDN URL accessible without authentication
- Cache: 1 year (versioned via hash in filename)

### Private Files

- Stored in `platform-private` container
- Download requires:
  1. Valid platform session
  2. Ownership check (file.organizationId === req.auth.organizationId)
  3. Server generates time-limited SAS URL (5 min)
  4. Client redirected to SAS URL

```typescript
// GET /api/v1/files/:id/download
async function getDownloadUrl(fileId: string, orgId: string): Promise<string> {
  const file = await fileRepo.findById(fileId);
  
  if (file.organizationId !== orgId) throw new ForbiddenError();
  
  const sasUrl = await storageService.generateSasUrl(file.blobPath, {
    permissions: 'r',         // Read only
    expiresIn: 5 * 60,        // 5 minutes
  });
  
  return sasUrl;
}
```

---

## 5. File Validation Rules

```typescript
const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/svg+xml',
  'application/pdf',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
];

const SIZE_LIMITS = {
  avatar: 5 * 1024 * 1024,           // 5MB
  logo: 2 * 1024 * 1024,             // 2MB
  document: 50 * 1024 * 1024,        // 50MB
  import: 100 * 1024 * 1024,         // 100MB
};

const BLOCKED_EXTENSIONS = ['.exe', '.bat', '.sh', '.js', '.php', '.py'];
```

---

## 6. Storage Quota Management

```typescript
// Quota by plan
const STORAGE_QUOTA = {
  STARTER: 1 * 1024,     // 1 GB
  GROWTH: 10 * 1024,     // 10 GB
  BUSINESS: 100 * 1024,  // 100 GB
  ENTERPRISE: 'unlimited',
};

// Check quota before allowing upload
async function checkStorageQuota(orgId: string, fileSize: number) {
  const used = await fileRepo.getTotalStorageUsed(orgId);
  const quota = getStorageQuota(orgId);
  
  if (used + fileSize > quota) {
    throw new BusinessError('STORAGE_QUOTA_EXCEEDED', {
      used, quota, required: fileSize
    });
  }
}
```

---

## 7. File API Reference

```
POST   /api/v1/files/presigned-url     → Get upload URL
POST   /api/v1/files/:id/confirm       → Confirm upload complete
GET    /api/v1/files                   → List files
GET    /api/v1/files/:id               → Get file metadata
GET    /api/v1/files/:id/download      → Get time-limited download URL
DELETE /api/v1/files/:id               → Soft delete file
GET    /api/v1/files/storage-usage     → Current storage usage

POST   /api/v1/files/avatar            → Upload user avatar (shortcut)
POST   /api/v1/organizations/:id/logo  → Upload org logo (shortcut)
```

---

*Next: [17-Reports.md — Report Aggregation, Dashboard Analytics, Export]*

---
**Document Control**  
Owner: Platform Architect
