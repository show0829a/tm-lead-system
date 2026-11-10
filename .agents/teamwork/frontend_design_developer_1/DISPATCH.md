## 2026-11-10T10:15:58Z
You are acting as the Frontend & Design System Agent (`frontend-design-developer`).
Your assigned role specification is at:
/Users/kimseunghwan/.gemini/antigravity/scratch/tm-lead-system/.agents/agents/frontend-design-developer.md

Your working directory: /Users/kimseunghwan/.gemini/antigravity/scratch/tm-lead-system/.agents/teamwork/frontend_design_developer_1/
Project root: /Users/kimseunghwan/.gemini/antigravity/scratch/tm-lead-system

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A qa-security-auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY REFERENCE FILES - READ FIRST:
1. /Users/kimseunghwan/.gemini/antigravity/scratch/tm-lead-system/.agents/teamwork/ORIGINAL_REQUEST.md
2. /Users/kimseunghwan/.gemini/antigravity/scratch/tm-lead-system/SPEC.md (Sections 4.2, 4.3, 4.4, 5, 6)
3. /Users/kimseunghwan/.gemini/antigravity/scratch/tm-lead-system/TASKS.md (Track 4: T-401~T-403, Track 5-1: T-501)
4. /Users/kimseunghwan/.gemini/antigravity/scratch/tm-lead-system/AGENTS.md
5. /Users/kimseunghwan/.gemini/antigravity/scratch/tm-lead-system/.agents/skills/ui-design-system/SKILL.md
6. /Users/kimseunghwan/.gemini/antigravity/scratch/tm-lead-system/.agents/skills/vercel-react-nextjs/SKILL.md
7. /Users/kimseunghwan/.gemini/antigravity/scratch/tm-lead-system/.agents/teamwork/postgres_server_architect_1/handoff.md

EXCLUSIVE FILE OWNERSHIP:
You own and write ONLY to:
- `admin-system/src/app/login/**`
- `admin-system/src/app/admin/**`
- `admin-system/src/app/tm/**`
- `admin-system/src/app/page.tsx`
- `admin-system/src/components/**`
- `landing-site-template/**` (`index.html`, `config.js`, `app.js`, `styles.css`)
DO NOT modify `admin-system/src/lib/*` or `admin-system/src/app/api/**` (owned by backend-engine-developer).

YOUR ASSIGNED TASKS:
1. T-401 (`/login` & root redirect):
   - Implement `admin-system/src/app/login/page.tsx`.
   - Modern, high-conversion login UI per `ui-design-system/SKILL.md`.
   - Includes **원클릭 데모 계정 전환 바** (Quick-login buttons for: `최고 관리자 (admin/admin1234)`, `상담원 1 (tm1/tm1234)`, `상담원 2 (tm2/tm1234)`, `상담원 3 (tm3/tm1234)`, `상담원 4 (tm4/tm1234)`).
   - Upon login success: redirects `ADMIN` to `/admin`, `TM` to `/tm`.
   - Update `admin-system/src/app/page.tsx` to automatically redirect authenticated users or provide navigation to `/login`.
2. T-402 (`/admin` 통합 관리자 대시보드 - 4개 탭):
   - Implement `admin-system/src/app/admin/page.tsx` (and subcomponents in `admin-system/src/components/admin/`).
   - Header with current user badge, logout button.
   - Tab 1: **통합 DB 관리 (Leads)**:
     - CRM table with 8-point grid, `tabular-nums` for dates/prices/phones.
     - Search input (customerName, carModel, etc.), filter by status, site, and TM.
     - Semantic status badges (신규: blue, 부재: amber, 상담진행: indigo, 가망: emerald, 성약: green, 거절/취소: red).
     - Phone masking display with **[번호 열람]** button: calls `POST /api/leads/[id]/reveal-phone` and reveals full number inline upon success.
     - Manual Assignment dialog: selects TM with checkbox `[x] 다음 차례 순번 소모 (consumeTurn)`. Calls `POST /api/admin/leads/assign`.
   - Tab 2: **TM 순번 & 배분 관리 (TMs & Allocation)**:
     - Displays TM list in order with current '다음 차례' pointer highlighted with an active badge.
     - **[다음 차례로 지정]** button to manually set next TM pointer.
     - Interactive toggle switches (`role="switch"`) for `DB 수신 [ON/OFF]` and `SMS 수신 [ON/OFF]`.
   - Tab 3: **모집 사이트 관리 (Sites)**:
     - Displays site list, domain URLs, and API keys with a copy button.
     - Site edit modal: toggle `useCustomMapping`, manage dedicated TM order, edit custom SMS template.
   - Tab 4: **SMS 발송 내역 & 유입 시뮬레이터 (SMS Logs & Simulator)**:
     - Real-time SMS dispatch logs list (lead, receiver phone masked, message, status MOCK_SENT/SKIPPED, sent time).
     - **유입 시뮬레이터 (Lead Simulator)**: UI form to submit a mock lead directly to `POST /api/v1/leads` with site selection, customer name, phone, car model, and inspect the immediate allocation result and pointer advancement!
3. T-403 (`/tm` 전담 TM 워크스페이스):
   - Implement `admin-system/src/app/tm/page.tsx` (and subcomponents in `admin-system/src/components/tm/`).
   - Sticky top bar:
     - Current TM name & status
     - `DB 수신 [ON/OFF]` switch toggle (`role="switch"`, green when ON, gray when OFF)
     - `SMS 수신 [ON/OFF]` switch toggle
     - Logout button
   - Assigned DB list (cards or dense table) for this TM only:
     - Customer name, masked phone with **[번호 열람]** button (calls `reveal-phone` API).
     - Car model, car number, car year, mileage, region, created date (`tabular-nums`).
     - Status selector to change lead status directly.
   - Consultation memo drawer / section:
     - View previous memos with timestamp.
     - Textarea to add new consultation memo, saving with `POST /api/tm/leads/[id]/memos`.
4. T-501 (`landing-site-template/` 정적 고객 모집 사이트):
   - Implement standalone files in `/Users/kimseunghwan/.gemini/antigravity/scratch/tm-lead-system/landing-site-template/`:
     - `index.html`: Responsive HTML5 landing page with hero banner, vehicle trade-in valuation lead form (고객명, 연락처, 차종, 차량번호, 연식, 주행거리, 지역), personal data collection consent checkbox with modal terms, CTA button.
     - `config.js`: exports `window.LANDING_CONFIG = { API_BASE_URL: 'http://localhost:3000', SITE_API_KEY: 'sk_site_export_01' };`.
     - `styles.css`: Modern, clean mobile-first CSS styling (no Tailwind build required for this static template, clean standalone CSS).
     - `app.js`: Form submission handler with phone normalization, personal data agreement check, fetch `POST ${API_BASE_URL}/api/v1/leads` with headers `Content-Type: application/json` and `X-Site-Api-Key: SITE_API_KEY`. Handles 201 success (shows confirmation popup), 409 duplicate lead (shows friendly duplicate message), and errors gracefully.
