# 고객 DB 자동 배분 및 통합 관리 시스템 — 프로젝트 요구사항 명세 및 상세 설계서 (SPEC.md)

> **문서 목적**: 본 문서는 에이전트(AI) 및 개발자가 추가 질문 없이 시스템을 처음부터 끝까지 구현하고, 각 기능의 구현 완료 여부를 객관적으로 판별할 수 있도록 작성된 **단일 진실 공급원(Single Source of Truth)** 명세서입니다.

---

## 1. 시스템 아키텍처 및 워크스페이스 구조

본 프로젝트는 **Part 1. 도메인별 정적 배포용 고객 모집 사이트(`landing-site-template/`)**와 **Part 2. 중앙 통합 DB 관리 및 자동 배분 시스템(`admin-system/`)**의 2개 파트로 구성된다.

```text
tm-lead-system/
├── SPEC.md                            # [본 문서] 요구사항 명세 및 상세 설계서
├── TASKS.md                           # 구현 여부 판단 기준 및 자동화/분업 체크리스트
├── AGENTS.md                          # 에이전트 자동화 및 분업 실행 규칙
├── admin-system/                      # [Part 2] 중앙 통합 DB 관리 시스템 (Next.js App Router + TypeScript + Tailwind + Prisma + PostgreSQL)
│   ├── package.json
│   ├── prisma/
│   │   ├── schema.prisma              # PostgreSQL 스키마 (7개 핵심 모델)
│   │   └── seed.ts                    # 초기 관리자 1명, 샘플 TM 4명, 기본 사이트 3개(수출/내수1/내수2) 시드
│   ├── src/
│   │   ├── lib/
│   │   │   ├── db.ts                  # PrismaClient 싱글톤
│   │   │   ├── crypto.ts              # AES-256-GCM 연락처 암호화/복호화, 마스킹(010-****-1234), HMAC-SHA256 해시
│   │   │   ├── auth.ts                # HttpOnly 쿠키 기반 JWT 세션 발급/검증 및 RBAC(ADMIN / TM) 가드
│   │   │   ├── allocation-engine.ts   # 자동 배분 엔진 (Row-Lock, 통합/사이트별 순번, On/Off 스킵, 포인터 변경, 수동배정)
│   │   │   └── sms.ts                 # SMS 발송 어댑터 (Mock DB 로깅 + 외부 SMS 게이트웨이 연동 인터페이스)
│   │   ├── app/
│   │   │   ├── api/
│   │   │   │   ├── v1/leads/route.ts                  # [외부 연동] 모집 사이트 DB 수집 API (CORS + X-Site-Api-Key 인증)
│   │   │   │   ├── auth/login/route.ts                # 로그인 API
│   │   │   │   ├── auth/logout/route.ts               # 로그아웃 API
│   │   │   │   ├── auth/me/route.ts                   # 현재 로그인 세션 조회 API
│   │   │   │   ├── admin/leads/route.ts               # [관리자] 전체 DB 목록 조회 / 수동 DB 등록
│   │   │   │   ├── admin/leads/[id]/assign/route.ts   # [관리자] 특정 순번(TM) 직접 배정 (순번 차감 옵션 포함)
│   │   │   │   ├── admin/allocation/route.ts          # [관리자] 통합 배분 순번 변경 및 '다음 차례(포인터)' 강제 지정
│   │   │   │   ├── admin/tms/route.ts                 # [관리자] TM 계정 생성/목록/순번/On-Off 강제 제어
│   │   │   │   ├── admin/sites/route.ts               # [관리자] 모집 사이트 추가/수정/API키 발급/사이트별 TM 매핑 설정
│   │   │   │   ├── admin/sms-logs/route.ts            # [관리자] SMS 발송 내역 및 템플릿 관리
│   │   │   │   ├── tm/leads/route.ts                  # [TM 전용] 본인에게 배정된 DB만 격리 조회
│   │   │   │   ├── tm/leads/[id]/route.ts             # [TM 전용] 내 DB 상담 상태/견적가/차량정보 수정 및 메모 등록
│   │   │   │   ├── tm/status/route.ts                 # [TM 전용] 본인 DB 수신 On/Off 및 SMS 수신 On/Off 토글
│   │   │   │   └── leads/[id]/reveal-phone/route.ts   # [공통 보안] 마스킹된 고객 연락처 원문 열람 + 감사 로그(AuditLog) 기록
│   │   │   ├── login/page.tsx                         # 로그인 페이지
│   │   │   ├── admin/page.tsx                         # 관리자 통합 대시보드 (4개 탭)
│   │   │   └── tm/page.tsx                            # TM 전용 워크스페이스
│   └── .env.example
│
└── landing-site-template/             # [Part 1] 정적 호스팅 배포용 고객 모집 사이트 프론트엔드 (웹서버 불필요)
    ├── index.html                     # 차량/연락처 입력 반응형 폼 UI
    ├── config.js                      # 사이트별 설정 (SITE_NAME, CENTRAL_API_URL, SITE_API_KEY, THEME)
    ├── app.js                         # 입력 검증 및 POST /api/v1/leads 호출 스크립트
    └── styles.css                     # 스타일시트
```

---

## 2. PostgreSQL 데이터베이스 상세 스키마 (`prisma/schema.prisma`)

반드시 `provider = "postgresql"`을 사용하며 아래 모델과 필드를 정확히 포함해야 한다.

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum UserRole {
  ADMIN
  TM
}

enum LeadStatus {
  UNASSIGNED // 미배정 (모든 TM이 DB 수신 Off일 때 대기열 보관)
  NEW        // 신규배정
  RECALL     // 부재/재통화예정
  PROGRESS   // 상담중
  VISIT      // 방문/견적진행
  COMPLETED  // 계약/매입완료
  CANCELED   // 진행불가/취소
}

enum AssignType {
  AUTO       // 자동 배분 엔진에 의한 배정
  MANUAL     // 관리자에 의한 수동/특정순번 지정 배정
}

enum SmsStatus {
  MOCK_SENT  // 개발/테스트 모의 발송 완료
  SENT       // 실제 SMS 발송 완료
  FAILED     // 발송 실패
  SKIPPED    // TM이 SMS 수신 Off 상태여서 발송 생략됨
}

model User {
  id             String          @id @default(uuid())
  loginId        String          @unique @map("login_id")
  passwordHash   String          @map("password_hash")
  name           String
  phoneEncrypted String          @map("phone_encrypted")
  phoneMasked    String          @map("phone_masked")
  role           UserRole        @default(TM)
  globalOrder    Int?            @map("global_order") // 기본 통합 순번 (1, 2, 3...)
  isDbReceiveOn  Boolean         @default(true) @map("is_db_receive_on")
  isSmsReceiveOn Boolean         @default(true) @map("is_sms_receive_on")
  isActive       Boolean         @default(true) @map("is_active")
  createdAt      DateTime        @default(now()) @map("created_at")
  updatedAt      DateTime        @updatedAt @map("updated_at")

  siteMappings   SiteTmMapping[]
  assignedLeads  Lead[]          @relation("AssignedTm")
  consultMemos   ConsultMemo[]
  smsLogs        SmsLog[]
  auditLogs      AuditLog[]

  @@map("users")
}

model Site {
  id               String          @id @default(uuid())
  name             String          // 예: 수출 사이트, 내수매입 1 사이트, 내수매입 2 사이트
  domainUrl        String?         @map("domain_url") // 허용 CORS 도메인
  apiKey           String          @unique @map("api_key") // 외부 프론트엔드 연동용 키 (sk_site_...)
  useCustomMapping Boolean         @default(false) @map("use_custom_mapping") // false: 통합순번, true: 사이트 전용 매핑 순번
  nextTmId         String?         @map("next_tm_id") // 사이트 전용 매핑 사용 시 '다음 차례' TM ID 포인터
  smsTemplate      String?         @map("sms_template") // 사이트별 커스텀 문자 템플릿
  isActive         Boolean         @default(true) @map("is_active")
  createdAt        DateTime        @default(now()) @map("created_at")

  tmMappings       SiteTmMapping[]
  leads            Lead[]

  @@map("sites")
}

model SiteTmMapping {
  id         String   @id @default(uuid())
  siteId     String   @map("site_id")
  tmId       String   @map("tm_id")
  orderIndex Int      @map("order_index") // 해당 사이트 내 배분 순번 (1, 2, 3...)

  site       Site     @relation(fields: [siteId], references: [id], onDelete: Cascade)
  tm         User     @relation(fields: [tmId], references: [id], onDelete: Cascade)

  @@unique([siteId, tmId])
  @@index([siteId, orderIndex])
  @@map("site_tm_mappings")
}

model SystemAllocationConfig {
  id                    Int      @id @default(1)
  nextGlobalTmId        String?  @map("next_global_tm_id") // 통합 순번에서 '다음 차례' TM ID 포인터
  defaultSmsTemplate    String   @default("[{siteName}] 신규DB 배정\n고객: {customerName} ({customerPhone})\n차량: {carModel} ({carYear})\n지역: {region}") @map("default_sms_template")
  duplicateBlockMinutes Int      @default(10) @map("duplicate_block_minutes") // 동일 번호 중복 접수 차단 시간(분)
  updatedAt             DateTime @updatedAt @map("updated_at")

  @@map("system_allocation_config")
}

model Lead {
  id             String        @id @default(uuid())
  siteId         String        @map("site_id")
  assignedTmId   String?       @map("assigned_tm_id")
  customerName   String        @map("customer_name")
  phoneEncrypted String        @map("phone_encrypted") // AES-256-GCM 암호화 원문
  phoneMasked    String        @map("phone_masked")    // 010-****-1234
  phoneHash      String        @map("phone_hash")      // HMAC-SHA256 검색/중복방지 해시
  carModel       String        @map("car_model")
  carNumber      String?       @map("car_number")
  carYear        String?       @map("car_year")
  mileage        String?
  region         String?
  extraData      Json?         @default("{}") @map("extra_data")
  estimatedPrice Int?          @map("estimated_price") // 예상 견적가 (만원 단위)
  status         LeadStatus    @default(NEW)
  assignType     AssignType    @default(AUTO) @map("assign_type")
  createdAt      DateTime      @default(now()) @map("created_at")
  assignedAt     DateTime?     @map("assigned_at")
  updatedAt      DateTime      @updatedAt @map("updated_at")

  site           Site          @relation(fields: [siteId], references: [id])
  assignedTm     User?         @relation("AssignedTm", fields: [assignedTmId], references: [id])
  memos          ConsultMemo[]
  smsLogs        SmsLog[]
  auditLogs      AuditLog[]

  @@index([assignedTmId, status])
  @@index([siteId, createdAt])
  @@index([phoneHash, createdAt])
  @@map("leads")
}

model ConsultMemo {
  id        String   @id @default(uuid())
  leadId    String   @map("lead_id")
  authorId  String   @map("author_id")
  content   String
  createdAt DateTime @default(now()) @map("created_at")

  lead      Lead     @relation(fields: [leadId], references: [id], onDelete: Cascade)
  author    User     @relation(fields: [authorId], references: [id])

  @@index([leadId, createdAt])
  @@map("consult_memos")
}

model SmsLog {
  id                  String    @id @default(uuid())
  leadId              String    @map("lead_id")
  tmId                String    @map("tm_id")
  receiverPhoneMasked String    @map("receiver_phone_masked")
  message             String
  status              SmsStatus @default(MOCK_SENT)
  errorMessage        String?   @map("error_message")
  createdAt           DateTime  @default(now()) @map("created_at")

  lead                Lead      @relation(fields: [leadId], references: [id], onDelete: Cascade)
  tm                  User      @relation(fields: [tmId], references: [id])

  @@map("sms_logs")
}

model AuditLog {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  leadId    String?  @map("lead_id")
  action    String   // VIEW_FULL_PHONE, MANUAL_ASSIGN, POINTER_CHANGE, STATUS_TOGGLE
  detail    String?
  ipAddress String?  @map("ip_address")
  createdAt DateTime @default(now()) @map("created_at")

  user      User     @relation(fields: [userId], references: [id])
  lead      Lead?    @relation(fields: [leadId], references: [id], onDelete: SetNull)

  @@map("audit_logs")
}
```

---

## 3. 핵심 비즈니스 로직 명세 (구현 판별 기준)

### 3.1 개인정보 암호화 및 보안 (`src/lib/crypto.ts` & `src/lib/auth.ts`)
1. **전화번호 정규화**: 입력된 번호에서 숫자만 추출(예: `010-1234-5678` → `01012345678`).
2. **AES-256-GCM 양방향 암호화 (`encryptPhone`, `decryptPhone`)**:
   - 환경변수 `ENCRYPTION_KEY` (32바이트 키)와 랜덤 12바이트 IV, AuthTag를 결합하여 `iv:authTag:cipherText` 포맷(hex 또는 base64)으로 저장.
3. **전화번호 마스킹 (`maskPhone`)**:
   - `01012345678` → `010-****-5678` 형태로 변환. 목록 조회 API는 항상 `phoneMasked`만 반환해야 하며, 원문 번호는 `POST /api/leads/[id]/reveal-phone` 호출 시에만 복호화하여 반환하고 동시에 `AuditLog`(`action: 'VIEW_FULL_PHONE'`)를 기록한다.
4. **전화번호 해시 (`hashPhone`)**:
   - `HMAC-SHA256`으로 해시 생성하여 중복 유입 검사 및 전화번호 검색에 사용한다.
5. **역할 기반 권한 격리 (`src/lib/auth.ts`)**:
   - `HttpOnly`, `SameSite=Lax` 쿠키(`tm_session`)에 서명된 토큰 저장.
   - `TM` 권한 사용자는 `/api/admin/*` 접근 시 무조건 `403 Forbidden` 반환.
   - `TM` 권한 사용자가 `/api/tm/leads` 조회 시 서버에서 강제로 `where: { assignedTmId: session.userId }` 조건을 적용.

### 3.2 자동 DB 배분 엔진 (`src/lib/allocation-engine.ts`)
1. **동시성 잠금 (PostgreSQL Row-Level Lock)**:
   - `prisma.$transaction` 내부에서 `SELECT * FROM system_allocation_config WHERE id = 1 FOR UPDATE` (또는 전용 매핑 사용 시 `SELECT * FROM sites WHERE id = $1 FOR UPDATE`)를 실행하여 동시 요청 시 순번 꼬임을 방지한다.
2. **후보 TM 리스트 결정**:
   - 유입된 `Site.useCustomMapping === true`이고 `SiteTmMapping`이 존재하면: 해당 사이트에 매핑된 TM들을 `orderIndex ASC` 순으로 정렬. 현재 포인터는 `Site.nextTmId`.
   - 그 외(기본 통합 순번): `role = 'TM' AND isActive = true`인 사용자들을 `globalOrder ASC` 순으로 정렬. 현재 포인터는 `SystemAllocationConfig.nextGlobalTmId`.
3. **활성 TM 탐색 (Round-Robin + Skip)**:
   - 현재 포인터(`nextTmId` 또는 `nextGlobalTmId`) 위치의 TM부터 시작하여 순환 탐색.
   - 만약 해당 TM이 `isDbReceiveOn === true`이면 **당첨(배정 확정)**하고, 포인터를 **그 다음 순번 TM**으로 업데이트한다.
   - 만약 해당 TM이 `isDbReceiveOn === false`이면 건너뛰고(Skip) 다음 순번 TM을 검사한다.
   - 만약 후보 TM 전원이 `isDbReceiveOn === false`이면:
     - `assignedTmId = null`, `status = 'UNASSIGNED'`로 `Lead`를 생성하여 DB 유실을 방지한다.
4. **관리자 수동/특정 순번 직접 배정 (`assignLeadManually`)**:
   - 파라미터: `{ leadId, targetTmId, consumeTurn: boolean, adminUserId }`
   - 해당 `Lead`를 `assignedTmId = targetTmId`, `assignType = 'MANUAL'`, `status = 'NEW'`(기존 `UNASSIGNED`였던 경우)로 업데이트.
   - 만약 `consumeTurn === true` (순번 1회 소모 선택)이면, 현재 배분 대기열의 다음 포인터(`nextGlobalTmId` 또는 `Site.nextTmId`)를 `targetTmId`의 **바로 다음 순번 TM**으로 이동시킨다.
   - `consumeTurn === false` (기존 순번 유지 선택)이면, 배분 포인터를 변경하지 않는다.
5. **관리자 '다음 배정 차례(포인터)' 강제 변경 (`setNextPointer`)**:
   - 관리자가 특정 순번의 TM을 지목하면 `nextGlobalTmId`(또는 사이트의 `nextTmId`)를 즉시 해당 TM의 ID로 변경하고 `AuditLog`를 남긴다.

### 3.3 SMS 자동 발송 어댑터 (`src/lib/sms.ts`)
1. DB가 TM에게 배정(자동 또는 수동)된 직후 실행된다.
2. 배정된 TM의 `isSmsReceiveOn` 상태를 확인한다:
   - `isSmsReceiveOn === false`: 문자를 발송하지 않고 `SmsLog`에 `status = 'SKIPPED'`로 기록한다.
   - `isSmsReceiveOn === true`:
     - 템플릿 치환(`{siteName}`, `{customerName}`, `{customerPhone}`, `{carModel}`, `{carYear}`, `{region}`)을 수행하여 메시지 본문을 생성한다. (이때 `{customerPhone}`은 TM이 바로 전화를 걸 수 있도록 복호화된 실제 연락처를 넣는다.)
     - 환경변수 `SMS_PROVIDER_MODE`가 `'LIVE'`이면 실제 문자 게이트웨이 API를 호출하고 `status = 'SENT'` 기록, 기본값(`'MOCK'`)이면 `SmsLog` 테이블에 `status = 'MOCK_SENT'`로 저장하여 웹 화면에서 즉시 확인할 수 있게 한다.

---

## 4. 화면(UI) 상세 요구사항

### 4.1 관리자 대시보드 (`/admin`)
- **상단 요약 바**: 전체 유입 DB 수, 오늘 유입 수, **미배정(대기) DB 수 (클릭 시 필터링)**, 현재 통합 배분 **"다음 차례 TM"** 배지 표시.
- **탭 1: 통합 DB 관리**
  - 필터: 모집 사이트별, 담당 TM별, 상담 상태별(`UNASSIGNED`, `NEW`, `RECALL`, `PROGRESS`, `VISIT`, `COMPLETED`, `CANCELED`), 검색어(고객명/차량모델/차량번호).
  - 각 행에서:
    - 고객 연락처 마스킹 표시(`010-****-1234`) + `[번호보기]` 버튼 클릭 시 원문 표시.
    - **`[담당자 지정/변경]` 버튼**: 원하는 순번의 TM을 선택하고 **`[ ] 자동 배분 순번 1회 소모 (체크 시 다음 순번으로 포인터 이동)`** 옵션을 선택해 즉시 배정.
    - 상담 상태 변경 및 메모 내역 확인 모달.
- **탭 2: TM 배분 순번 & 상태 관리**
  - 통합 배분 대기열 카드 리스트 (`1순번: 김상담` → `2순번: 이매입 [🎯 다음 배정 차례]` → `3순번: 박수출 (DB수신 OFF)` ...).
  - 각 TM 카드에서:
    - 순번 위/아래(▲/▼) 이동 버튼
    - **`[🎯 다음 차례로 지정]`** 버튼 (클릭 즉시 해당 TM이 다음 자동 배분 대상이 됨)
    - 관리자가 직접 제어 가능한 **`DB 수신 [ON/OFF]`**, **`SMS 수신 [ON/OFF]`** 토글 스위치
  - 신규 TM 계정 추가 폼.
- **탭 3: 모집 사이트(채널) 관리 & API 연동**
  - 모집 사이트 목록 (기본 시드: `수출 사이트`, `내수매입 1 사이트`, `내수매입 2 사이트` + **`[+ 신규 모집 사이트 추가]`**).
  - 각 사이트별 고유 `API Key` 확인 및 **외부 정적 사이트(`config.js`) 설정 코드 원클릭 복사**.
  - **사이트별 TM 매핑 설정**: `[기본 통합 순번 사용]` vs `[이 사이트 전용 TM 순번 지정]` 전환 및 사이트별 TM 순서 매핑 UI.
- **탭 4: SMS 발송 내역 & DB 유입 테스트기**
  - **실시간 유입 시뮬레이터**: 사이트 선택(수출/내수1/내수2 등) 후 샘플 차량/고객 정보를 1클릭 전송하여 자동 배분 순번 이동과 SMS 발송을 즉시 테스트하는 패널.
  - **SMS 발송 로그 테이블**: 수신 TM, 발송 시각, 발송 상태(`MOCK_SENT` / `SKIPPED`), 실제 발송된 문자 메시지 원문 확인 및 기본 템플릿 수정.

### 4.2 TM 전용 워크스페이스 (`/tm`)
- **상단 개인 상태 제어 바 (고정)**:
  - 로그인한 TM 이름 및 내 순번 표시.
  - **`내 DB 배정 수신 [ON / OFF]`** 대형 스위치 (OFF 시 안내 문구: *"현재 자동 배분에서 제외됩니다"*).
  - **`내 SMS 문자 알림 [ON / OFF]`** 대형 스위치 (OFF 시 안내 문구: *"DB는 정상 배정되며 휴대폰 문자만 발송되지 않습니다"*).
- **내 상담 DB 목록 (간결한 워크스페이스)**:
  - 오직 본인(`assignedTmId === 내 ID`)에게 배정된 DB만 최신순으로 표시.
  - 상태 필터 탭 (`전체` | `신규배정` | `부재/재통화` | `상담중` | `방문/견적` | `매입완료` | `취소`).
  - 각 DB 항목에서:
    - 유입 사이트 배지, 차량모델/연식/주행거리/지역, 고객명, 연락처(`[번호 확인]` 버튼).
    - **상담 상태 드롭다운** (즉시 변경).
    - **예상 견적가(만원)** 및 **차량번호** 간단 입력/저장.
    - **간결한 한 줄 상담 메모** 입력창 및 타임라인 리스트.

### 4.3 도메인별 정적 배포용 모집 사이트 프론트엔드 (`landing-site-template/`)
- 별도의 Node.js 서버 없이 정적 파일(`index.html`, `config.js`, `app.js`, `styles.css`)만으로 동작해야 한다.
- `config.js`에서 `SITE_NAME`, `SITE_SUBTITLE`, `CENTRAL_API_URL` (`http://localhost:3000/api/v1/leads`), `SITE_API_KEY`를 설정하면 화면 타이틀과 API 헤더(`X-Site-Api-Key`)에 자동 반영된다.
- 개발/데모 편의를 위해 화면 상단에 `[데모 프리셋 전환: 수출 사이트 / 내수매입 1 / 내수매입 2]` 셀렉터를 두어 하나의 파일로도 여러 사이트 도메인 역할을 즉시 테스트할 수 있게 지원한다 (실제 배포 시에는 `config.js`에서 고정).
