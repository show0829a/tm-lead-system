# 구현 상태 추적 및 분업 자동화 체크리스트 (TASKS.md)

> **자동화 에이전트 작동 규칙**:
> 1. 작업을 시작하거나 이어받을 때 가장 먼저 이 파일(`TASKS.md`)과 실제 파일 시스템을 대조하여 **이미 구현된 항목**과 **미구현 항목**을 판별한다.
> 2. 각 태스크의 **[구현 완료 판단 기준]**을 실제로 만족하는지 파일 존재 여부 및 타입체크/테스트 명령어로 검증한 뒤에만 `[ ]`를 `[x]`로 변경한다.
> 3. 병렬 분업(Multi-Agent) 시에는 아래 **Track 1 ~ Track 5** 단위로 역할을 나누어 충돌 없이 작업한다.

---

## Track 1: 프로젝트 기반 & PostgreSQL 데이터베이스 스키마 (기반 인프라)
> **선행 조건**: 없음 (가장 먼저 실행되어야 함)

- [x] **T-101: Next.js 프로젝트 초기화 및 필수 패키지 구성**
  - **대상 경로**: `admin-system/package.json`, `admin-system/tsconfig.json`, `admin-system/.env`
  - **상세 내용**: `admin-system/` 내 Next.js (App Router, TypeScript, Tailwind CSS) 및 `@prisma/client`, `prisma` 구성. 로컬에 외부 PostgreSQL 데몬이 없을 때도 100% 실제 PostgreSQL 엔진으로 즉시 구동되도록 `@electric-sql/pglite` 또는 로컬 PostgreSQL 서버 연동 설정 지원.
  - **구현 완료 판단 기준**: `admin-system/package.json`이 존재하고 `node_modules`가 설치되어 있음.

- [x] **T-102: PostgreSQL Prisma 스키마(`schema.prisma`) 작성 및 DB 반영**
  - **대상 경로**: `admin-system/prisma/schema.prisma`, `admin-system/src/lib/db.ts`
  - **상세 내용**: `SPEC.md` 2절에 정의된 7개 모델(`User`, `Site`, `SiteTmMapping`, `SystemAllocationConfig`, `Lead`, `ConsultMemo`, `SmsLog`, `AuditLog`)과 Enum들을 정확히 구현하고 `prisma generate` 및 스키마 푸시 완료.
  - **구현 완료 판단 기준**: `npx prisma validate`가 에러 없이 통과하고 `src/lib/db.ts`에서 `prisma` 인스턴스를 export함.

- [x] **T-103: 초기 시드 데이터(`prisma/seed.ts`) 작성 및 실행**
  - **대상 경로**: `admin-system/prisma/seed.ts`
  - **상세 내용**:
    - 관리자 계정 1개 (`admin` / `admin1234`)
    - 상담 직원(TM) 계정 4개 (`tm1` ~ `tm4` / `tm1234`, 순번 1~4번)
    - 기본 모집 사이트 3개 (`수출 사이트`, `내수매입 1 사이트`, `내수매입 2 사이트` — 각각의 고정 `apiKey`: `sk_site_export_01`, `sk_site_dom1_02`, `sk_site_dom2_03`)
    - `SystemAllocationConfig` 기본 행 (`id = 1`, `nextGlobalTmId = tm1.id`)
  - **구현 완료 판단 기준**: 시드 스크립트 실행 시 DB에 `User` 5명(ADMIN 1, TM 4)과 `Site` 3개가 정상 생성됨.

---

## Track 2: 개인정보 보안 모듈 & 자동 DB 배분 엔진 (코어 비즈니스 로직)
> **선행 조건**: Track 1 완료 (`src/lib/db.ts` 사용)

- [x] **T-201: 고객 연락처 AES-256-GCM 암호화·마스킹·해시 모듈 구현**
  - **대상 경로**: `admin-system/src/lib/crypto.ts`
  - **상세 내용**:
    - `normalizePhone(raw: string): string`
    - `encryptPhone(phone: string): string` (AES-256-GCM)
    - `decryptPhone(encrypted: string): string`
    - `maskPhone(phone: string): string` (`010-****-5678` 형식)
    - `hashPhone(phone: string): string` (HMAC-SHA256)
  - **구현 완료 판단 기준**: `encryptPhone` 후 `decryptPhone` 호출 시 원문과 100% 일치하고, `maskPhone("01012345678")`이 `"010-****-5678"`을 반환함.

- [x] **T-202: 세션 인증(HttpOnly 쿠키) 및 권한 격리(RBAC) 가드 구현**
  - **대상 경로**: `admin-system/src/lib/auth.ts`
  - **상세 내용**:
    - 비밀번호 해싱/검증 함수
    - `createSessionCookie`, `getSessionUser`, `requireAdmin`, `requireTmOrAdmin` 구현
  - **구현 완료 판단 기준**: 비로그인 시 `401`, TM 계정이 `requireAdmin` 호출 시 `403` 에러를 반환함.

- [x] **T-203: SMS 자동 발송 어댑터 구현**
  - **대상 경로**: `admin-system/src/lib/sms.ts`
  - **상세 내용**:
    - `sendAllocationSms({ leadId, tmId })` 함수 구현
    - TM의 `isSmsReceiveOn === false`이면 `SmsLog`에 `SKIPPED` 상태로 기록하고 발송 생략
    - `isSmsReceiveOn === true`이면 템플릿 변수(`{siteName}`, `{customerName}`, `{customerPhone}`, `{carModel}`, `{carYear}`, `{region}`)를 치환하여 `SmsLog`에 `MOCK_SENT`(또는 실발송 `SENT`) 기록
  - **구현 완료 판단 기준**: 배정 시 `sms_logs` 테이블에 치환된 문자 전문과 상태가 정확히 저장됨.

- [x] **T-204: 자동 DB 배분 엔진 및 수동/포인터 제어 로직 구현**
  - **대상 경로**: `admin-system/src/lib/allocation-engine.ts`
  - **상세 내용**:
    1. `ingestAndAllocateLead(input)`: 외부 사이트 유입 시 중복 접수 차단 확인 → PostgreSQL 트랜잭션 락 → 통합 순번 또는 사이트별 매핑 순번 조회 → `isDbReceiveOn === true`인 다음 TM 탐색 (`false`인 TM은 자동 스킵, 전원 `false`이면 `UNASSIGNED` 저장) → 포인터를 다음 순번으로 이동 → SMS 자동 발송 호출.
    2. `assignLeadManually({ leadId, targetTmId, consumeTurn, adminUserId })`: 관리자가 특정 순번(TM)에 DB 직접 배정 시 `consumeTurn` 여부에 따라 포인터 이동 또는 유지.
    3. `setNextAllocationPointer({ targetTmId, siteId, adminUserId })`: 관리자가 '다음 배정 차례' 포인터를 특정 TM으로 강제 변경.
  - **구현 완료 판단 기준**:
    - 연속 4건 유입 시 `TM 1 → TM 2 → TM 3 → TM 4` 순서대로 배정됨.
    - `TM 2`가 `isDbReceiveOn = false`일 때 `TM 1 → TM 3`으로 건너뛰어 배정됨.
    - 전원 `isDbReceiveOn = false`일 때 `status = 'UNASSIGNED'`로 저장됨.

---

## Track 3: 백엔드 REST API 엔드포인트 구현
> **선행 조건**: Track 2 완료

- [x] **T-301: 외부 모집 사이트용 DB 수집 API (`POST /api/v1/leads` & `OPTIONS` CORS)**
  - **대상 경로**: `admin-system/src/app/api/v1/leads/route.ts`
  - **상세 내용**:
    - `OPTIONS` 프리플라이트 및 `Access-Control-Allow-Origin` 헤더 처리 (외부 정적 랜딩 사이트에서 호출 가능하도록 허용)
    - `X-Site-Api-Key` 헤더(또는 body의 `apiKey`)로 `Site` 식별 및 `isActive` 확인
    - `ingestAndAllocateLead` 호출 후 결과 반환
  - **구현 완료 판단 기준**: 유효한 `apiKey`로 `POST /api/v1/leads` 호출 시 `201 Created`와 함께 자동 배정된 결과가 생성됨.

- [x] **T-302: 인증 API (`/api/auth/login`, `/api/auth/logout`, `/api/auth/me`)**
  - **대상 경로**: `admin-system/src/app/api/auth/login/route.ts`, `logout/route.ts`, `me/route.ts`
  - **구현 완료 판단 기준**: 로그인 성공 시 `HttpOnly` 세션 쿠키가 설정되고 `/api/auth/me`에서 현재 사용자 정보(`role`, `isDbReceiveOn`, `isSmsReceiveOn` 등)를 반환함.

- [x] **T-303: 관리자 전용 API (`/api/admin/*`)**
  - **대상 경로**:
    - `admin-system/src/app/api/admin/leads/route.ts` (전체 DB 조회/필터링 및 관리자 수동 DB 등록)
    - `admin-system/src/app/api/admin/leads/[id]/assign/route.ts` (특정 순번/TM 직접 배정 + 순번 소모 옵션)
    - `admin-system/src/app/api/admin/allocation/route.ts` (통합 순번 변경 및 다음 차례 포인터 강제 지정)
    - `admin-system/src/app/api/admin/tms/route.ts` (TM 추가, 순번 조정, On/Off 강제 변경)
    - `admin-system/src/app/api/admin/sites/route.ts` (모집 사이트 추가, API키 재발급, 사이트별 TM 매핑 설정)
    - `admin-system/src/app/api/admin/sms-logs/route.ts` (SMS 발송 로그 조회 및 기본 템플릿 수정)
  - **구현 완료 판단 기준**: 관리자 세션에서 모든 API가 정상 동작하고, TM 세션으로 호출 시 `403`으로 차단됨.

- [x] **T-304: TM 전용 API (`/api/tm/*`) 및 연락처 원문 열람 보안 API**
  - **대상 경로**:
    - `admin-system/src/app/api/tm/leads/route.ts` (`assignedTmId === session.userId`인 DB만 반환)
    - `admin-system/src/app/api/tm/leads/[id]/route.ts` (본인 배정 DB의 상담 상태/견적가/차량번호 수정 및 상담 메모 추가)
    - `admin-system/src/app/api/tm/status/route.ts` (본인의 `isDbReceiveOn`, `isSmsReceiveOn` 실시간 토글)
    - `admin-system/src/app/api/leads/[id]/reveal-phone/route.ts` (권한 확인 후 암호화된 전화번호 복호화 반환 + `AuditLog` 기록)
  - **구현 완료 판단 기준**: TM은 타 TM의 DB를 절대 조회/수정할 수 없으며, 연락처 열람 시 `audit_logs` 테이블에 기록이 남음.

---

## Track 4: 프론트엔드 웹 UI 구현 (관리자 콘솔 & TM 워크스페이스)
> **선행 조건**: Track 3 완료 (또는 API 규격에 맞춰 병렬 개발 가능)

- [x] **T-401: 로그인 화면 (`/login`) 및 루트 리다이렉션 (`/`)**
  - **대상 경로**: `admin-system/src/app/login/page.tsx`, `admin-system/src/app/page.tsx`
  - **상세 내용**: 아이디/비밀번호 로그인 폼 + 테스트 편의를 위한 `[빠른 로그인: 👑 관리자 | 👤 TM 1 | 👤 TM 2 | 👤 TM 3 | 👤 TM 4]` 원클릭 데모 버튼 제공. 로그인 시 `ADMIN`은 `/admin`, `TM`은 `/tm`으로 자동 이동.
  - **구현 완료 판단 기준**: `/login`에서 관리자 및 각 TM 계정으로 즉시 로그인 및 전환 가능.

- [x] **T-402: 관리자 통합 대시보드 (`/admin`) 구현**
  - **대상 경로**: `admin-system/src/app/admin/page.tsx`
  - **상세 내용**: `SPEC.md` 4.1절의 4개 탭 완비:
    1. **통합 DB 관리 탭**: 필터, 마스킹 연락처 열람, 특정 순번(TM) 직접 배정 모달(`자동 순번 1회 소모` 체크박스 포함), 상담 메모/상태 수정.
    2. **TM 배분 순번 & 상태 관리 탭**: 순번 위/아래 조정, **`[🎯 다음 차례로 지정]`** 버튼, TM별 `DB 수신 On/Off` · `SMS 수신 On/Off` 스위치, 신규 TM 등록.
    3. **모집 사이트(채널) & 매핑 관리 탭**: 사이트 무제한 추가, 사이트별 `API Key` 및 `config.js` 연동 코드 복사, **사이트별 전용 TM 배분 순번 매핑 설정**.
    4. **SMS 발송 내역 & 유입 시뮬레이터 탭**: 사이트별 가상 DB 1클릭 유입 테스트기 + 실시간 SMS 발송 내역(문자 원문) 뷰어.
  - **구현 완료 판단 기준**: 4개 탭의 모든 조회·생성·배정·포인터 변경 기능이 새로고침 없이 반영됨.

- [x] **T-403: TM 전용 워크스페이스 (`/tm`) 구현**
  - **대상 경로**: `admin-system/src/app/tm/page.tsx`
  - **상세 내용**: `SPEC.md` 4.2절 반영:
    - 상단 고정 바에 **`DB 배정 수신 [ON/OFF]`**와 **`SMS 문자 알림 [ON/OFF]`** 스위치 분리 배치.
    - 본인에게 배정된 DB만 깔끔한 리스트/카드로 표시, 상태 필터, 원클릭 상담 상태 변경, 예상 견적가 저장, 한 줄 상담 메모 추가, 연락처 원문 보기 버튼.
  - **구현 완료 판단 기준**: TM 로그인 시 본인 DB만 보이며, 상단에서 DB 수신을 OFF하면 이후 유입되는 DB가 해당 TM을 건너뛰고 다음 TM에게 배정됨.

---

## Track 5: 정적 배포용 모집 사이트 프론트엔드 템플릿 & 통합 검증
> **선행 조건**: Track 3 완료 (`POST /api/v1/leads` 연동)

- [x] **T-501: 도메인별 정적 배포용 고객 모집 사이트 템플릿 (`landing-site-template/`) 구현**
  - **대상 경로**: `landing-site-template/index.html`, `landing-site-template/config.js`, `landing-site-template/app.js`, `landing-site-template/styles.css`
  - **상세 내용**:
    - 백엔드 서버 없이 정적 파일만으로 동작하는 중고차 수출/내수매입 상담 신청 랜딩페이지.
    - 상단 데모 바에서 `[수출 사이트 | 내수매입 1 사이트 | 내수매입 2 사이트]` 프리셋을 바꾸거나 `config.js`를 수정해 즉시 각 사이트의 `API Key`로 중앙 서버(`POST /api/v1/leads`)에 고객 DB를 전송.
  - **구현 완료 판단 기준**: `landing-site-template/index.html`에서 차량/연락처 입력 후 제출 시 중앙 DB에 저장되고 순번대로 TM에게 자동 배정 및 SMS 기록이 생성됨.

- [x] **T-502: End-to-End 자동 검증 테스트 스크립트 실행 및 빌드 검증**
  - **대상 경로**: `admin-system/scripts/verify-e2e.ts`
  - **상세 내용**:
    - 시나리오 1: 수출/내수1/내수2 사이트에서 연속 DB 유입 시 `TM 1 → TM 2 → TM 3 → TM 4` 순환 배정 검증
    - 시나리오 2: `TM 2`의 `DB 수신 Off` 설정 시 `TM 2` 스킵 검증 및 `SMS 수신 Off` 시 문자 생략(`SKIPPED`) 검증
    - 시나리오 3: 관리자의 '다음 차례 포인터 강제 변경' 및 '특정 순번 직접 배정(순번 소모 ON/OFF)' 검증
    - 시나리오 4: 연락처 암호화/마스킹 및 TM 간 DB 접근 격리 검증
  - **구현 완료 판단 기준**: 검증 스크립트 및 `npm run build`가 에러 없이 100% 통과함.

---

## Track 6: 엔터프라이즈 레이아웃 개편 (좌측 사이드바) & 모바일 퍼스트 반응형 카드/드로어 아키텍처
> **선행 조건**: Track 4~5 완료

- [x] **T-601: 관리자(`/admin`) 좌측 고정 사이드바 + 모바일 슬라이드 드로어 & 메뉴별 독립 화면 위계 분리**
  - **대상 경로**: `admin-system/src/components/admin/AdminHeader.tsx`, `admin-system/src/app/admin/page.tsx`
  - **상세 내용**:
    - 데스크톱(`lg:` 이상)에서는 좌측 고정 사이드바(`w-64`, `bg-zinc-950`)에 시스템 로고, 4대 메뉴(`01 전체 상담 관리`, `02 상담원(TM) 순번 및 배정 관리`, `03 접수 사이트 및 전담 설정`, `04 가상 접수 테스트 및 문자 내역`), 하단 `상담원(TM) 화면 바로가기`, 관리자 프로필 및 `로그아웃`을 고정 배치.
    - 모바일/태블릿(`lg:` 미만)에서는 상단 컴팩트 바(`h-14`) + 좌측 슬라이드 드로어(오버레이 메뉴)로 반응형 전환.
    - 4단 요약 카드(`SummaryCards.tsx`)는 `01 전체 상담 관리` 메뉴에서만 노출하고, `02`, `03`, `04` 메뉴 진입 시에는 해당 메뉴 전용 상단 타이틀 바와 본문만 독립적으로 표시하여 시각적 위계를 명확히 분리.
  - **구현 완료 판단 기준**: `/admin`에서 데스크톱 좌측 사이드바 및 모바일 드로어가 작동하며, 각 탭 전환 시 우측 본문 영역이 독립된 메뉴 화면으로 명확히 구분됨.

- [x] **T-602: 관리자 상담 목록(`LeadsTab.tsx`) 데스크톱 테이블 & 모바일 터치형 카드 Dual-View 구현**
  - **대상 경로**: `admin-system/src/components/admin/LeadsTab.tsx`
  - **상세 내용**:
    - 데스크톱(`hidden md:block`)에서는 고정 컬럼 테이블 유지.
    - 모바일(`md:hidden`)에서는 가로 스크롤 없이 한 손으로 확인·조작할 수 있는 모바일 카드 뷰(고객명·지역·사이트 배지·차종/차량번호·연락처 `[번호보기/통화]`·담당 상담원·진행 상태 드롭다운·`[배정]`·`[상세]` 버튼) 제공.
  - **구현 완료 판단 기준**: 모바일 뷰포트에서 가로 스크롤바 없이 모든 상담 조회·번호 열람·상태 변경·수동 배정·상세 메모 모달 기능이 작동함.

- [x] **T-603: 상담원(`/tm`) 단일 워크스페이스 모바일 최적화 & 모바일 현장 카드 뷰 구현**
  - **대상 경로**: `admin-system/src/components/tm/TmHeader.tsx`, `admin-system/src/components/tm/TmLeadsView.tsx`
  - **상세 내용**:
    - 사이드바 없는 단일 집중형 워크스페이스 구조 유지.
    - `TmHeader.tsx`: 모바일 화면에서 `신규 상담 배정 받기`와 `휴대폰 문자 알림` 스위치가 2열 그리드로 깔끔하게 정렬되도록 반응형 개선.
    - `TmLeadsView.tsx`: 데스크톱(`hidden md:block`)에서는 고정 컬럼 테이블, 모바일(`md:hidden`)에서는 외근 중인 상담원이 즉시 `[번호보기]` → `tel:` 원터치 통화 → 상태 변경 → `[메모/수정]` 서랍 확장을 수행할 수 있는 모바일 전용 카드 리스트 제공.
  - **구현 완료 판단 기준**: 모바일 뷰포트에서 `/tm` 접속 시 가로 스크롤 없이 번호 열람·통화 연결·상태 변경·차량번호/견적가 저장·상담 메모 입력이 100% 작동함.

- [x] **T-604: 배지·버튼 줄바꿈 깨짐 전수 교정(`SimulatorTab.tsx` 등) 및 통합 빌드·E2E 검증**
  - **대상 경로**: `admin-system/src/components/admin/SimulatorTab.tsx`, `AllocationTab.tsx`, `SitesTab.tsx` 등 전체 컴포넌트
  - **상세 내용**:
    - `SimulatorTab.tsx`의 `자동 배정 테스트` 배지가 두 줄(`자동 배정 테스 / 트`)로 깨지는 현상 등을 방지하기 위해 모든 배지·버튼에 `whitespace-nowrap shrink-0` 적용.
    - TypeScript 컴파일 체크(`tsc --noEmit`), 프로덕션 빌드(`npm run build`), E2E 검증(`scripts/verify-e2e.ts`) 실행 및 통과 확인 후 `TASKS.md`의 `T-601` ~ `T-604`를 모두 `[x]`로 마킹.
  - **구현 완료 판단 기준**: `tsc --noEmit` 에러 0건, `npm run build` 성공, `verify-e2e.ts` 100% 통과.
