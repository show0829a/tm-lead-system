# 에이전트 자동화 및 분업 실행 프로토콜 (AGENTS.md)

이 프로젝트(`tm-lead-system`)를 작업하는 모든 AI 에이전트(메인 오케스트레이터 및 서브에이전트)는 아래 프로토콜과 `.agents/` 내의 전용 스킬/에이전트 구성을 반드시 준수해야 합니다.

---

## 1. 프로젝트에 장착된 전문 스킬 (`.agents/skills/`)
오픈소스 에이전트 스킬 저장소(`vercel-labs/agent-skills`, `vercel-labs/web-interface-guidelines`, `heydamir/unslop`, `VoltAgent/awesome-claude-code-subagents`, `anthropics/skills`)에서 수집·최적화하여 본 프로젝트에 적용한 6대 스킬입니다. 각 작업 시작 전 해당 스킬의 `SKILL.md`를 반드시 읽으십시오:

1. **[`vercel-react-nextjs`](./.agents/skills/vercel-react-nextjs/SKILL.md)**: Next.js App Router, 병렬 데이터 패칭(`Promise.all`), RSC/Client 분리, 낙관적 UI 업데이트, 정적 랜딩페이지 최적화 규칙
2. **[`ui-design-system`](./.agents/skills/ui-design-system/SKILL.md)**: 8-point 그리드, 숫자/연락처 `tabular-nums` 정렬, 상담 상태별 시맨틱 컬러 배지, 접근성 스위치(`role="switch"`), B2B 고밀도 CRM 테이블 디자인 시스템
3. **[`unslop`](./.agents/skills/unslop/SKILL.md)**: AI 생성 UI 특유의 클리셰(이모지 남발, 보라색 그라디언트, 기계적 영문 슬로건 등)를 제거하고 실무형 프로덕트 디자인으로 교정하는 9단계 규율
4. **[`web-design-guidelines`](./.agents/skills/web-design-guidelines/SKILL.md)**: Vercel Web Interface Guidelines + B2B 어드민 수직/수평 정렬 일관성(Zero Column Shift), 텍스트/핸들 겹침 방지, 일괄 제어(Bulk UX), 자연스러운 한국어 용어 통일, 웹 접근성 전수 점검 스킬
5. **[`backend-api-security`](./.agents/skills/backend-api-security/SKILL.md)**: 고객 연락처 AES-256-GCM 암호화/마스킹(`010-****-1234`), 열람 감사 로그(`AuditLog`), `HttpOnly` 세션 기반 관리자/TM RBAC 권한 격리, 외부 사이트 웹훅(`X-Site-Api-Key` + CORS) 보안 규칙
6. **[`postgres-prisma-server`](./.agents/skills/postgres-prisma-server/SKILL.md)**: PostgreSQL `SELECT ... FOR UPDATE` 행 잠금 기반 동시성 안전 Round-Robin 자동 배분, `DB 수신 Off` 스킵 및 미배정 대기열, 다음 차례 포인터 강제 변경 및 수동 배정(`consumeTurn`) 알고리즘

---

## 2. 프로젝트 전용 서브에이전트 (`.agents/agents/` 및 `invoke_subagent`)
본 프로젝트에는 5개의 전문 서브에이전트가 정의되어 있으며, `invoke_subagent` 도구로 즉시 호출하여 분업할 수 있습니다:

| 서브에이전트 이름 (`TypeName`) | 담당 트랙 | 전담 영역 및 수정 가능 경로 |
| :--- | :--- | :--- |
| **`postgres-server-architect`** | **Track 1** (`T-101` ~ `T-103`) | Next.js 프로젝트 세팅, PostgreSQL `schema.prisma`, `src/lib/db.ts`, `prisma/seed.ts` |
| **`backend-engine-developer`** | **Track 2 & 3** (`T-201` ~ `T-304`) | 암호화/인증/SMS/배분 엔진(`src/lib/*`) 및 전체 REST API(`src/app/api/**`) |
| **`frontend-design-developer`** | **Track 4 & 5-1** (`T-401` ~ `T-501`) | 로그인/관리자/TM 웹 UI(`src/app/login`, `admin`, `tm`) 및 정적 모집 사이트(`landing-site-template/**`) |
| **`ui-ux-inspector`** | **UI/UX 전수 감사** | `web-design-guidelines` + `unslop` 기반 전 화면 수직/수평 정렬 밀림, 토글/버튼 겹침, 일괄 조작성, 한국어 용어, 접근성 전수 점검 및 즉시 수정 |
| **`qa-security-auditor`** | **Track 5-2** (`T-502`) | `TASKS.md` 전체 구현 판별 감사, E2E 배분·보안 검증(`scripts/verify-e2e.ts`), 프로덕션 빌드 검증 |

---

## 3. 작업 시작 전 상태 진단 (Self-Audit Protocol)
1. 반드시 [`SPEC.md`](./SPEC.md)와 [`TASKS.md`](./TASKS.md)를 먼저 읽습니다.
2. 단순히 `TASKS.md`의 체크 표시만 믿지 말고, **실제 파일 시스템(`admin-system/`, `landing-site-template/`)의 파일 존재 여부와 코드 내용을 확인**하여 어디까지 구현되었는지 스스로 판별합니다.
   - 이미 구현되어 있고 `SPEC.md`의 완료 기준을 만족한다면 `TASKS.md`에 `[x]`로 업데이트합니다.
   - `[x]`로 표시되어 있으나 파일이 없거나 미완성이면 즉시 `[ ]`로 되돌리고 구현을 이어갑니다.

---

## 4. UI 텍스트 & 커뮤니케이션 엄격 분리 규율 (Production Cleanliness Protocol) [필수 준수]
1. **실제 화면(UI)과 대화창(채팅) 설명의 엄격한 분리**:
   - 관리자, TM 상담원 등 **실제 이용자가 보는 웹 화면에는 개발자용 가이드나 불필요한 사족 설명(예: "마우스로 드래그하네 마네", "체크 시: 다음 차례가 어쩌고 저쩌고", 구구절절한 시스템 동작 원리 도움말)을 절대 노출하지 않습니다.**
   - 기능에 대한 부가 설명, 동작 원리, 사용 팁은 **오직 대화창(채팅)에서 사용자에게 친절히 설명**합니다.
   - 웹 화면 UI는 실제 현업에서 매일 사용하는 B2B 전문 CRM에 걸맞게 **간결하고 정제된 레이블, 직관적인 아이콘, 필수 제목만 남기고 모든 사족 텍스트를 제거**합니다.
2. **사족 텍스트 제거 원칙**:
   - 모달 헤더의 불필요한 긴 부가 설명(`description`) 제거
   - 테이블 상단/하단의 조작법 훈수("마우스로 끌어서 이동", "드래그 핸들을 끌어다 놓으면") 제거
   - 체크박스/토글 옆의 "체크 시: ~", "꺼짐 시: ~" 식의 사족 도움말 문구 제거
   - 빈 목록(Empty state) 화면의 과도한 안내 문구 축소 (`상담 내역이 없습니다` 등 간결화)
