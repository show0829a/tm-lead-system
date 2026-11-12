---
name: web-design-guidelines
description: Vercel Web Interface Guidelines(web-design-guidelines) + UI/UX 레이아웃·정렬·한국어 용어 일관성·접근성 전수 점검 스킬. "UI 점검해줘", "디자인 검수해줘", "레이아웃 깨지는지 봐줘", "UX 체크" 요청 시 사용한다.
metadata:
  author: vercel-labs + custom-b2b-ux
  version: "1.1.0"
---

# Web Interface Guidelines & UI/UX Inspector Skill

이 스킬은 **Vercel Labs의 `web-design-guidelines` (`vercel-labs/web-interface-guidelines`)** 100+ 규칙과 **실무 B2B 어드민 UI/UX 정렬·조작성·한국어 일관성 규칙**을 결합해 프론트엔드 코드를 정밀 감사(Audit)합니다.

---

## 1. 레이아웃 & 수직 정렬 일관성 (Layout & Vertical Alignment — 최우선 점검)

1. **행(Row) 간 컬럼 밀림 금지 (Zero Column Shift across Rows)**:
   - 반복되는 리스트/행에서 특정 행만 버튼 텍스트가 길어지거나(`현재 배정 차례` vs `차례 지정`) 배지가 추가되어 좌측 스위치/체크박스/데이터의 가로 위치(X좌표)가 밀리는 현상을 금지합니다.
   - 반드시 `<table>` 고정 컬럼 폭(`w-24`, `w-28`, `w-44` 등) 또는 `grid-template-columns`를 사용하여 모든 행의 스위치, 상태 배지, 액션 버튼이 **수직 일직선(1px 오차 없음)**으로 정렬되어야 합니다.
2. **고정 폭 액션 버튼 & 숫자 정렬 (`tabular-nums`)**:
   - 상태에 따라 라벨이 바뀌는 버튼(`켜짐/꺼짐`, `현재 배정 차례/차례 지정`, `복사/복사 완료`)은 `w-28` 등 고정 폭이나 `min-w-[...]`를 부여해 레이아웃 흔들림(CLS)을 방지합니다.
   - 모든 숫자(카운트, 순번 `#01`, 전화번호, 시각, 금액)에는 `tabular-nums`를 적용합니다.
3. **내부 텍스트/요소 겹침 금지 (Zero Text/Thumb Collision)**:
   - 토글 스위치(`Switch`), 입력창 우측 아이콘, 배지 내부에서 글자(`ON`/`OFF`)와 핸들(Thumb)이 겹치거나 찌그러지는지 점검합니다. 스위치 상태 텍스트는 핸들 외부에 고정 폭 라벨(`켜짐`/`꺼짐`)로 분리합니다.
4. **Overflow 및 말줄임(`truncate`) 방어**:
   - 플렉스 자식 요소에는 `min-w-0`을 부여하고 긴 텍스트(도메인, 메모, 이메일)는 `truncate` 또는 줄바꿈 정책을 명시해 옆 컬럼을 밀어내지 않도록 합니다.

---

## 2. 조작성 & 일괄 제어 (Operability & Bulk UX)

1. **다중 항목 일괄 제어 (Bulk Actions)**:
   - 3개 이상의 행에 동일한 토글(수신 여부, 알림 여부, 활성 여부)이나 상태 변경이 존재할 경우, 상단 툴바에 **일괄 제어(전체 켜기/전체 끄기, 일괄 선택)** 수단을 제공합니다.
2. **클릭 영역 (Hit Target & No Dead Zones)**:
   - 스위치, 체크박스, 라디오 버튼은 텍스트 라벨과 컨트롤이 하나의 `<label>` 또는 `<button>` 영역으로 묶여 빈 공간 클릭 미스가 없어야 하며, 최소 높이는 `28px~36px` 이상을 확보합니다.
3. **즉각적인 피드백 및 로딩 잠금 (Pending Guard)**:
   - 비동기 액션 실행 중에는 버튼/스위치를 `disabled` 처리해 중복 클릭을 막고, 완료 시 인라인 피드백이나 토스트로 결과를 알립니다.

---

## 3. 한국어 UI 카피라이팅 & 용어 일관성 (Korean Copywriting Consistency)

1. **불필요한 영문 기계어/약어 남발 금지**:
   - 한국어 서비스 화면에서 `NEXT DISPATCH POINTER`, `TOTAL INGESTED LEADS`, `AES-256-GCM SECURED`, `ACTIVE (정상 배정)`, `SMS ON (발송)`처럼 영문과 한글을 어색하게 혼용하지 않습니다.
   - 자연스럽고 직관적인 한국어 운영 용어(`다음 배정 예정 상담원`, `전체 누적 DB`, `현재 배정 차례`, `켜짐` / `꺼짐`)로 통일합니다.
   - 단, `DB`, `SMS`, `TM`, `API`, `URL`, `CSV`, `IP` 등 업계 표준 약어는 허용합니다.

---

## 4. Vercel Web Interface Guidelines 핵심 규칙 (A11y, Focus, Forms)

1. **시맨틱 HTML 우선 (Semantics First)**:
   - 클릭 가능한 요소는 `<div onClick>` 대신 반드시 `<button type="button">` 또는 `<a>`를 사용합니다.
   - 토글 스위치는 `role="switch"`와 `aria-checked`를 명시합니다.
   - 모달 대화상자는 `role="dialog"`, `aria-modal="true"`, `ESC` 닫기, 배경 스크롤 잠금을 지원합니다.
2. **키보드 포커스 가시성 (`:focus-visible`)**:
   - `outline-none`을 쓸 때는 반드시 `focus-visible:ring-2` 등 대체 포커스 링을 함께 지정합니다.
3. **색상 단독 의존 금지 (Redundant Status Cues)**:
   - 초록/빨강 점(dot)만으로 상태를 표시하지 않고 반드시 `켜짐`/`꺼짐`, `배정 완료`/`미배정 대기` 등 텍스트 라벨을 함께 표기합니다.
4. **모션 및 트랜지션 절제**:
   - `transition-all` 남발을 피하고 `transition-colors`, `transition-transform` 등 필요한 속성만 지정합니다.

---

## 5. 점검 출력 포맷 (`file:line` Diagnostic Format)

UI/UX 점검을 수행할 때는 장황한 설명 대신 아래 형식으로 즉시 수정 가능한 리포트를 출력하고 곧바로 코드를 교정합니다:

- `[정렬/레이아웃]` `[파일명](file:///절대경로#L줄번호)`: 문제 현상 및 고정 폭/테이블 정렬 해결책
- `[조작성/UX]` `[파일명](file:///절대경로#L줄번호)`: 일괄 제어, 클릭 영역, 로딩 상태 개선점
- `[용어/가독성]` `[파일명](file:///절대경로#L줄번호)`: 어색한 영문/기계어 → 자연스러운 한국어 교정
- `[접근성/시맨틱]` `[파일명](file:///절대경로#L줄번호)`: ARIA, 포커스 링, 키보드 네비게이션 누락 수정

---

## 6. 화면 사족 설명 금지 & 채팅 분리 규율 (Production Screen Cleanliness)

1. **실제 이용자 화면에서 불필요한 사족/훈수 전면 제거**:
   - "마우스로 드래그하네 마네", "드래그 핸들을 끌어다 놓으면", "체크 시: ~"와 같은 개발자 편의적 설명 문구를 화면에 구구절절 노출하지 않습니다.
   - 모달 헤더의 장황한 `description`은 제거하거나 핵심 1문장으로 극도로 정제합니다.
   - 동작 방식에 대한 상세한 가이드와 팁은 **대화창(채팅)에서 사용자에게 설명**하고, 화면은 군더더기 없는 B2B CRM 형태로 유지합니다.
