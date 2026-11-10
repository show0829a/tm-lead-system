# 에이전트 자동화 및 분업 실행 프로토콜 (AGENTS.md)

이 프로젝트(`tm-lead-system`)를 작업하는 모든 AI 에이전트(메인 에이전트 및 서브에이전트)는 아래 프로토콜을 반드시 준수해야 합니다.

## 1. 작업 시작 전 상태 진단 (Self-Audit Protocol)
1. 반드시 [`SPEC.md`](./SPEC.md)와 [`TASKS.md`](./TASKS.md)를 먼저 읽습니다.
2. 단순히 `TASKS.md`의 체크 표시만 믿지 말고, **실제 파일 시스템(`admin-system/`, `landing-site-template/`)의 파일 존재 여부와 코드 내용을 확인**하여 어디까지 구현되었는지 스스로 판별합니다.
   - 만약 파일이 이미 구현되어 있고 `SPEC.md`의 완료 기준을 만족한다면 `TASKS.md`에 `[x]`로 업데이트합니다.
   - 만약 `[x]`로 표시되어 있으나 파일이 없거나 미완성이면 즉시 `[ ]`로 되돌리고 구현을 이어갑니다.

## 2. 단계별/분업 개발 규칙 (Track Isolation)
- **순차 자동화 모드 (`/goal` 또는 단일 에이전트)**:
  - `Track 1 → Track 2 → Track 3 → Track 4 → Track 5` 순서로 미완료(`- [ ]`) 태스크를 하나씩 구현하고, 매 태스크가 끝날 때마다 동작 검증 후 `TASKS.md`의 해당 항목을 `- [x]`로 갱신합니다.
- **멀티 에이전트 분업 모드 (`/teamwork` 또는 서브에이전트 병렬 실행)**:
  - **Track 1 (DB & 기반 설정)** 완료 후, 아래 트랙을 서로 다른 서브에이전트에게 할당하여 파일 충돌 없이 병렬로 작업할 수 있습니다:
    - **Agent A (Core & Backend)**: `Track 2` (`src/lib/*`) + `Track 3` (`src/app/api/*`) 전담
    - **Agent B (Frontend UI)**: `Track 4` (`src/app/login`, `src/app/admin`, `src/app/tm`) 전담
    - **Agent C (Landing & QA)**: `Track 5` (`landing-site-template/*` 및 `scripts/verify-e2e.ts`) 전담
  - 각 에이전트는 자신이 맡은 경로의 파일만 수정하여 Git/파일 충돌을 방지합니다.

## 3. 필수 기술 및 보안 준수 사항
1. **PostgreSQL 스키마 준수**: `SPEC.md` 2절의 Prisma 스키마 모델/필드명을 임의로 변경하지 마십시오 (`API`와 `UI` 에이전트 간 인터페이스 일치를 위해 필수).
2. **개인정보 보호**: 고객 연락처는 절대 평문으로 `leads` 목록 API에 노출하지 마십시오. 목록에서는 항상 `phoneMasked`(`010-****-1234`)를 반환하고, 원문 열람은 `/api/leads/[id]/reveal-phone`을 통해서만 복호화 및 `AuditLog` 기록과 함께 수행하십시오.
3. **TM 권한 격리**: `/api/tm/*` 하위 모든 라우트는 반드시 세션의 `userId`와 `assignedTmId`가 일치하는지 서버에서 강제 검증해야 합니다.
