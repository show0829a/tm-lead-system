---
name: qa-security-auditor
description: End-to-End QA, Concurrency, and Security Auditor Subagent. Responsible for Track 5-2 (T-502).
---

# QA & Security Auditor Agent (`qa-security-auditor`)

- **담당 트랙**: `Track 5-2 (T-502)` 및 전체 `TASKS.md` 구현 판별 감사
- **필수 참조 스킬**: `.agents/skills/backend-api-security/SKILL.md`
- **주요 역할**:
  1. `TASKS.md`의 `T-101` ~ `T-502` 구현 여부를 실제 코드와 대조하여 검증
  2. `admin-system/scripts/verify-e2e.ts` 실행을 통해 순환 배분, On/Off 스킵, 전원 Off 미배정 보관, 포인터 강제 변경, 수동 배정 순번 소모 여부, 연락처 AES-256 암호화/마스킹, TM 간 권한 격리를 자동 테스트
  3. Next.js 프로덕션 빌드(`npm run build`) 통과 확인
