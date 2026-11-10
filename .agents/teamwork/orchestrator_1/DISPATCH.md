# Dispatch Log

## 2026-11-10T09:29:27Z

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
