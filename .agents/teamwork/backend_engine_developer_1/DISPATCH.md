## 2026-11-10T10:15:56Z
You are acting as the Backend & Security Engine Agent (`backend-engine-developer`).
Your assigned role specification is at:
/Users/kimseunghwan/.gemini/antigravity/scratch/tm-lead-system/.agents/agents/backend-engine-developer.md

Your working directory: /Users/kimseunghwan/.gemini/antigravity/scratch/tm-lead-system/.agents/teamwork/backend_engine_developer_1/
Project root: /Users/kimseunghwan/.gemini/antigravity/scratch/tm-lead-system

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A qa-security-auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY REFERENCE FILES - READ FIRST:
1. /Users/kimseunghwan/.gemini/antigravity/scratch/tm-lead-system/.agents/teamwork/ORIGINAL_REQUEST.md
2. /Users/kimseunghwan/.gemini/antigravity/scratch/tm-lead-system/SPEC.md (Sections 2, 3.1, 3.2, 3.3, 3.4, 4.1)
3. /Users/kimseunghwan/.gemini/antigravity/scratch/tm-lead-system/TASKS.md (Track 2: T-201~T-204, Track 3: T-301~T-304)
4. /Users/kimseunghwan/.gemini/antigravity/scratch/tm-lead-system/AGENTS.md
5. /Users/kimseunghwan/.gemini/antigravity/scratch/tm-lead-system/.agents/skills/backend-api-security/SKILL.md
6. /Users/kimseunghwan/.gemini/antigravity/scratch/tm-lead-system/.agents/skills/postgres-prisma-server/SKILL.md
7. /Users/kimseunghwan/.gemini/antigravity/scratch/tm-lead-system/.agents/teamwork/postgres_server_architect_1/handoff.md

EXCLUSIVE FILE OWNERSHIP:
You own and write ONLY to:
- `admin-system/src/lib/*` (`crypto.ts`, `auth.ts`, `sms.ts`, `allocation-engine.ts`, `audit.ts`)
- `admin-system/src/app/api/**` (all REST API route handlers)
DO NOT modify `src/app/login`, `src/app/admin`, `src/app/tm`, `src/app/page.tsx`, or `landing-site-template/**` (owned by frontend-design-developer).

YOUR ASSIGNED TASKS:
1. T-201 (`src/lib/crypto.ts`):
   - `normalizePhone(raw: string): string` (digits only, e.g. 01012345678)
   - `encryptPhone(phone: string): string` (AES-256-GCM, returns iv:authTag:cipherText in hex)
   - `decryptPhone(encrypted: string): string` (AES-256-GCM decrypt)
   - `maskPhone(phone: string): string` (returns e.g. 010-****-5678)
   - `hashPhone(phone: string): string` (HMAC-SHA256 with ENCRYPTION_KEY or SHA-256 hash)
2. T-202 (`src/lib/auth.ts`):
   - bcryptjs password hash and compare
   - jsonwebtoken sign and verify for session tokens
   - `createSessionCookie(user)` (sets HttpOnly, SameSite=Lax cookie 'tm_session')
   - `getSessionUser(request)` (reads cookie or Authorization header, returns user or null)
   - `requireAdmin(request)` (throws or returns 401 if unauthenticated, 403 if not ADMIN)
   - `requireTmOrAdmin(request)` (allows TM or ADMIN, returns user)
3. T-203 (`src/lib/sms.ts`):
   - `sendAllocationSms({ leadId, tmId, siteId })`:
     - Checks TM's `isSmsReceiveOn`: if false, creates `SmsLog` with status `SKIPPED` and skips sending.
     - If true: substitutes template variables (`{siteName}`, `{customerName}`, `{customerPhone}`, `{carModel}`, `{carYear}`, `{region}`) from site's custom template or system default template, and creates `SmsLog` with status `MOCK_SENT`.
4. T-204 (`src/lib/allocation-engine.ts` & `src/lib/audit.ts`):
   - Concurrency-safe Round-Robin allocation engine per `postgres-prisma-server/SKILL.md`:
     - Interactive transaction with row lock (`SELECT ... FOR UPDATE` via `tx.$queryRaw` or transactional update).
     - Checks site: if `useCustomMapping === true`, uses `SiteTmMapping` order; else uses global TM `globalOrder`.
     - Deterministic pointer traversal: checks starting index at current pointer (`nextGlobalTmId` or site `nextTmId`), loops candidate TMs. If `candidate.isDbReceiveOn === true && candidate.isActive === true`, assigns to that TM, advances pointer to next TM in cycle.
     - Fallback: if all eligible TMs have `isDbReceiveOn === false`, creates Lead with `assignedTmId = null`, status `UNASSIGNED`, assignType `AUTO`.
     - Manual assignment (`assignLeadManually(leadId, targetTmId, consumeTurn)`): if consumeTurn is true, advances pointer; else leaves pointer unchanged.
     - Pointer control: `setNextPointer(targetTmId, siteId?)`.
   - `recordAuditLog({ userId, leadId, action, detail, ipAddress })` in `src/lib/audit.ts`.
5. T-301 (`src/app/api/v1/leads/route.ts`):
   - External recruitment webhook `POST /api/v1/leads` with CORS (`OPTIONS` and headers `Access-Control-Allow-Origin: *`, `Access-Control-Allow-Headers: Content-Type, X-Site-Api-Key`).
   - Validates `X-Site-Api-Key` header against `Site.apiKey`.
   - Validates required fields: customerName, customerPhone, carModel.
   - Checks duplicate phone submissions within `duplicateBlockMinutes` (using phoneHash): returns `409` `{ error: 'DUPLICATE_LEAD' }`.
   - Encrypts, masks, and hashes phone number.
   - Executes allocation via `allocation-engine.ts`.
   - Triggers SMS notification via `sms.ts`.
   - Returns `201` `{ success: true, leadId: lead.id, status: lead.status }`.
6. T-302 (`src/app/api/auth/**`):
   - `POST /api/auth/login`: loginId & password verification, sets session cookie, returns user profile.
   - `POST /api/auth/logout`: clears session cookie.
   - `GET /api/auth/me`: returns current user profile or 401.
7. T-303 (`src/app/api/admin/**`):
   - `GET /api/admin/leads`: search & filter (by search term, siteId, tmId, status, date range), pagination. Returns masked phone.
   - `POST /api/admin/leads/assign`: manual assignment (leadId, tmId, consumeTurn boolean), records `MANUAL_ASSIGN` audit log.
   - `GET /admin/allocation`: gets current pointer and TM list with receive status.
   - `POST /api/admin/allocation/pointer`: updates nextGlobalTmId or site nextTmId, records `POINTER_CHANGE` audit log.
   - `GET /api/admin/tms` & `PATCH /api/admin/tms/[id]`: toggles `isDbReceiveOn`, `isSmsReceiveOn`, updates order.
   - `GET /api/admin/sites`, `POST /api/admin/sites`, `PATCH /api/admin/sites/[id]`: manages sites and siteTmMapping.
   - `GET /api/admin/sms-logs`: lists SMS logs with filters.
   - `GET /api/admin/audit-logs`: lists audit logs.
8. T-304 (`src/app/api/tm/**` & `src/app/api/leads/[id]/reveal-phone/route.ts`):
   - `GET /api/tm/leads`: returns only leads assigned to current session TM, with consultMemos and site details.
   - `POST /api/tm/leads/[id]/memos`: adds consultation memo and optionally updates `leadStatus`.
   - `PATCH /api/tm/status`: toggles own `isDbReceiveOn` and `isSmsReceiveOn`.
   - `POST /api/leads/[id]/reveal-phone`: security endpoint. Checks that user is ADMIN or assigned TM. Decrypts phoneEncrypted using `decryptPhone`. Records `VIEW_FULL_PHONE` audit log in `audit_logs` table. Returns `{ fullPhone: decryptedPhone }`.

VERIFICATION:
Create and run a comprehensive verification script (e.g. `admin-system/scripts/verify-backend.ts`) using `node -r ./scripts/register-ts.js scripts/verify-backend.ts` that tests:
- Crypto module (encrypt, decrypt, mask, hash)
- Auth module (login, logout, RBAC guards)
- Allocation engine (round robin, skip off TMs, pointer change, manual assign with/without consumeTurn, duplicate block)
- Reveal phone and audit log creation
Mark `T-201`, `T-202`, `T-203`, `T-204`, `T-301`, `T-302`, `T-303`, `T-304` as `[x]` in `TASKS.md`.
Write your handoff report to:
/Users/kimseunghwan/.gemini/antigravity/scratch/tm-lead-system/.agents/teamwork/backend_engine_developer_1/handoff.md

When done, send a message to caller (orchestrator).
