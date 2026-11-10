# Original User Request

## Initial Request — 2026-11-10T09:28:31Z

[자동 판별 및 4대 에이전트 분업 지침]
1. **구현 여부 사전 판별**: 먼저 `TASKS.md`(`T-101` ~ `T-502`)와 실제 파일들을 대조해 이미 완료된 태스크와 미완료 태스크를 판별한다.
2. **Step 1 — DB 및 서버 기반 구축 (`postgres-server-architect` 호출)**:
   - `Track 1 (T-101 ~ T-103)`이 미완료 상태라면 `postgres-server-architect` 서브에이전트를 호출해 Next.js + PostgreSQL Prisma 스키마(`schema.prisma`)와 시드 데이터(`seed.ts`)를 구축하고 `TASKS.md`에 `[x]` 표시한다.
3. **Step 2 — 백엔드 엔진 & 프론트엔드/랜딩 병렬 분업 (동시 호출)**:
   - Track 1이 완료되면 아래 두 전문 서브에이전트를 **동시에 병렬 호출(`invoke_subagent`)**해서 파일 충돌 없이 분업한다:
     - **`backend-engine-developer`**: `backend-api-security` 및 `postgres-prisma-server` 스킬을 준수하여 `Track 2 (T-201~T-204)`와 `Track 3 (T-301~T-304)` 구현 (`src/lib/*`, `src/app/api/**` 전담)
     - **`frontend-design-developer`**: `ui-design-system` 및 `vercel-react-nextjs` 스킬을 준수하여 `Track 4 (T-401~T-403: /login, /admin 4개 탭, /tm 워크스페이스)`와 `Track 5-1 (T-501: landing-site-template 정적 사이트)` 구현
4. **Step 3 — 통합 E2E 검증 및 보안 감사 (`qa-security-auditor` 호출)**:
   - 백엔드와 프론트엔드 구현이 끝나면 `qa-security-auditor` 서브에이전트를 호출해 `T-502 (scripts/verify-e2e.ts 및 npm run build)`를 실행하고, `TASKS.md`의 모든 항목(`T-101` ~ `T-502`)이 `[x]`로 완수되었는지 최종 보고한다.

/Users/kimseunghwan/.gemini/antigravity/scratch/tm-lead-system의 `AGENTS.md`, `SPEC.md`, `TASKS.md`와 `.agents/skills/`의 4대 스킬을 기반으로 실제 상용 운영이 가능한 수준(Production readiness)으로 전체 시스템을 끝까지 구현하고 검증한다.

Working directory: /Users/kimseunghwan/.gemini/antigravity/scratch/tm-lead-system
Integrity mode: development

## Requirements

### R1. 데이터베이스 및 인프라 기반 구축 (Track 1)
admin-system/ 내 Next.js (App Router, TypeScript, Tailwind CSS) 프로젝트를 구성하고, 로컬 Mac 환경에 외부 PostgreSQL 데몬이나 Docker가 없는 상태에서도 즉시 구동 가능하도록 `@electric-sql/pglite` / `@prisma/adapter-pglite` 또는 로컬 PGlite 서버 연동을 설정한다. `SPEC.md` 2절에 명세된 7개 모델(`User`, `Site`, `SiteTmMapping`, `SystemAllocationConfig`, `Lead`, `ConsultMemo`, `SmsLog`, `AuditLog`)과 Enum을 포함하는 Prisma 스키마(`schema.prisma`)를 작성하고, 관리자 계정, TM 계정 4개, 기본 사이트 3개, 배분 설정이 포함된 초기 시드 데이터(`prisma/seed.ts`)를 DB에 반영한다.

### R2. 보안 모듈 및 자동 리드 배분 백엔드 API (Track 2 & Track 3)
고객 연락처 AES-256-GCM 암호화·마스킹·SHA-256 해시 모듈(`src/lib/crypto.ts`)과 감사 로그 자동 기록 헬퍼(`src/lib/audit.ts`)를 구축한다. 사이트별 전담 TM 배분 우선 및 글로벌 라운드로빈 롤오버 엔진(`src/lib/allocator.ts`), JWT 인증 및 RBAC 인가 미들웨어(`src/lib/auth.ts`)를 구현하고, 외부 리드 수집 API(`POST /api/leads`), 관리자용 API(리드 조회/필터링/상태변경/재배분, TM 관리, 사이트 관리, 감사 로그 조회), TM용 워크스페이스 API(자신에게 배분된 리드 목록, 상담 메모 등록, SMS 발송 기록) 엔드포인트를 구현한다.

### R3. 프론트엔드 워크스페이스 및 고객 모집 랜딩 사이트 템플릿 (Track 4 & Track 5-1)
Next.js App Router 기반으로 로그인 페이지(`/login`), 4개 탭(`/admin/leads`, `/admin/tms`, `/admin/sites`, `/admin/audit-logs`)으로 구성된 관리자 대시보드, TM 전담 워크스페이스(`/tm`)를 반응형 및 직관적인 UI로 구현한다. 또한 `landing-site-template/` 디렉터리에 별도 웹서버나 빌드 도구 없이 도메인별 정적 호스팅이 가능한 고객 모집 랜딩 사이트(`index.html`, `config.js`, `app.js`, `styles.css`)를 구현하여 API 연동 리드 접수 및 개인정보 수집 동의 UI를 제공한다.

### R4. 로컬 환경 호환성 및 제로 외부 의존성
로컬 Mac 환경에 외부 psql 또는 Docker 데몬이 없으므로, 별도 외부 설치 없이도 PostgreSQL 엔진, E2E 검증(`scripts/verify-e2e.ts`), `npm run build`가 100% 동작하도록 완전한 무설치 호환 구성을 보장한다.

## Acceptance Criteria

### Task Completion & Build
- [ ] TASKS.md의 T-101부터 T-502까지 모든 체크리스트 항목이 구현 완료 기준을 충족하고 [x]로 표시됨
- [ ] admin-system/에서 `npm run build`가 타입 오류 및 린트 오류 없이 성공함

### Automated E2E Verification
- [ ] `scripts/verify-e2e.ts` 실행 시 초기 시드 데이터 확인, 리드 접수(정상/중복/유효성검증), 연락처 암호화 및 해시, 라운드로빈 및 사이트 매핑 배분, RBAC 권한별 API 접근 제어, 감사 로그 검증이 모두 성공함
- [ ] landing-site-template 정적 사이트에서 리드 제출 테스트가 정상 동작함
