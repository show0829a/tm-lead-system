---
name: postgres-prisma-server
description: >-
  Enforces PostgreSQL schema design, row-level locking for concurrency-safe Round-Robin
  DB allocation, Prisma transaction patterns, and local/cloud PostgreSQL server operation
  synthesized from VoltAgent postgres-pro and database-optimizer subagents.
  Use when working on prisma/schema.prisma, src/lib/db.ts, or src/lib/allocation-engine.ts.
---

# PostgreSQL & Server Architecture Skill (`postgres-pro`)

## 1. Concurrency-Safe Round-Robin Allocation Engine
When multiple external recruitment sites (`수출`, `내수1`, `내수2`...) submit leads simultaneously, naive read-then-write pointers cause race conditions (two leads assigned to the same TM).
- **Mandatory Transaction & Locking**:
  - Execute the entire allocation decision + pointer advancement inside a single interactive transaction: `await prisma.$transaction(async (tx) => { ... })`.
  - Acquire a row lock on the allocation config row (`SELECT id, next_global_tm_id FROM system_allocation_config WHERE id = 1 FOR UPDATE`) or site row (`SELECT id, next_tm_id FROM sites WHERE id = $1 FOR UPDATE`) via `tx.$queryRaw`.

## 2. Deterministic Pointer Traversal Algorithm
Given an ordered array of candidate TMs `candidates = [tm1, tm2, tm3, tm4]` (sorted by `globalOrder ASC` or `SiteTmMapping.orderIndex ASC`):
1. Find the starting index `startIdx` where `candidates[i].id === currentNextTmId`. If `currentNextTmId` is null or not found in `candidates`, set `startIdx = 0`.
2. Loop ` offset` from `0` to `candidates.length - 1`:
   - `idx = (startIdx + offset) % candidates.length`
   - `candidate = candidates[idx]`
   - If `candidate.isDbReceiveOn === true && candidate.isActive === true`:
     - Select `candidate` as `assignedTm`.
     - Compute next pointer: `nextIdx = (idx + 1) % candidates.length`, `newNextTmId = candidates[nextIdx].id`.
     - Update pointer (`nextGlobalTmId = newNextTmId` or `site.nextTmId = newNextTmId`).
     - Break and create `Lead` with `assignedTmId = candidate.id`, `status = 'NEW'`, `assignType = 'AUTO'`.
3. **All TMs Off Fallback**:
   - If the loop finishes with no eligible TM (`all isDbReceiveOn === false`), create `Lead` with `assignedTmId = null`, `status = 'UNASSIGNED'`, `assignType = 'AUTO'` so zero customer leads are ever lost.

## 3. Manual Assignment & Pointer Control Rules
- **Set Next Pointer (`setNextPointer`)**:
  - Admin explicitly sets `nextGlobalTmId = targetTmId` (or `site.nextTmId = targetTmId`). The very next auto-allocated lead will start evaluating from `targetTmId`.
- **Manual Lead Assignment (`assignLeadManually`)**:
  - When `consumeTurn === true`: In addition to assigning the lead to `targetTmId`, advance the pointer to the TM immediately following `targetTmId` in the ordered candidate list (`nextIdx = (targetIdx + 1) % candidates.length`).
  - When `consumeTurn === false`: Assign the lead to `targetTmId` without modifying `nextGlobalTmId` or `site.nextTmId`.
