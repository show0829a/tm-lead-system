---
name: backend-api-security
description: >-
  Enforces backend API architecture, webhook CORS & API key verification, AES-256-GCM
  personal information encryption, phone masking, and HttpOnly session RBAC isolation
  synthesized from VoltAgent backend-developer and security-auditor subagents.
  Use when implementing src/lib/crypto.ts, src/lib/auth.ts, or src/app/api/** routes.
---

# Backend API & Personal Information Security Skill

## 1. Customer PII (Phone Number) Protection Protocol
1. **Never Store Plaintext Phone Numbers in `leads`**:
   - Normalize input: strip non-digits (`010-1234-5678` -> `01012345678`).
   - `phoneEncrypted`: Encrypt with **AES-256-GCM** using a 32-byte key derived from `process.env.ENCRYPTION_KEY`, random 12-byte IV, and 16-byte AuthTag (`ivHex:authTagHex:cipherHex`).
   - `phoneMasked`: Format as `010-****-5678`.
   - `phoneHash`: Compute `HMAC-SHA256(normalizedPhone, ENCRYPTION_KEY)` for fast indexed lookup and duplicate submission blocking.
2. **Audit-Logged Phone Reveal (`POST /api/leads/[id]/reveal-phone`)**:
   - List APIs (`GET /api/admin/leads`, `GET /api/tm/leads`) MUST NEVER return `phoneEncrypted` or decrypted phone numbers.
   - Only when an authorized user clicks `[번호 확인]` and calls `POST /api/leads/[id]/reveal-phone`:
     - Verify user is `ADMIN` OR (`TM` and `lead.assignedTmId === session.userId`).
     - Write an `AuditLog` entry (`action: 'VIEW_FULL_PHONE'`, `userId`, `leadId`).
     - Return `{ phone: decryptPhone(lead.phoneEncrypted) }`.

## 2. Zero-Trust Role-Based Access Control (RBAC)
- **Session Cookie**: Store signed token in `HttpOnly`, `SameSite=Lax`, `Path=/` cookie named `tm_session`.
- **Admin Guard (`requireAdmin`)**: Every route under `/api/admin/**` must call `requireAdmin()`. If `session.role !== 'ADMIN'`, immediately return `403 Forbidden`.
- **TM Isolation Guard (`requireTmOrAdmin`)**:
  - In `/api/tm/leads`, force the Prisma query filter `where: { assignedTmId: session.userId }`. Never trust a client-supplied `tmId` query parameter on TM endpoints.
  - In `/api/tm/leads/[id]`, verify the target lead's `assignedTmId === session.userId` before updating status, estimatedPrice, or adding a memo.

## 3. External Recruitment Site Webhook (`POST /api/v1/leads`)
- **CORS Support**: Implement `OPTIONS` handler and include `Access-Control-Allow-Origin: *` (or matched `site.domainUrl`), `Access-Control-Allow-Methods: POST, OPTIONS`, `Access-Control-Allow-Headers: Content-Type, X-Site-Api-Key`.
- **Site Authentication**: Extract API key from `request.headers.get('x-site-api-key')` or body `apiKey`. Reject with `401` if invalid or `!site.isActive`.
- **Duplicate Guard**: Query `Lead` where `phoneHash === hashPhone(phone)` and `createdAt >= NOW() - duplicateBlockMinutes`. If found, return `429 Too Many Requests` without consuming a TM turn or sending duplicate SMS.
