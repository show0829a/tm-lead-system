---
name: ui-design-system
description: >-
  Enforces UI/UX design system tokens, 8-point grid spacing, semantic status badges,
  high-density B2B CRM table layouts, and WCAG accessibility rules synthesized from
  vercel-labs/agent-skills (web-design-guidelines) and anthropics/skills (frontend-design).
  Use when designing or building the Admin console, TM workspace, or recruitment landing pages.
---

# UI & Design System Skill (`web-design-guidelines` + `frontend-design`)

## 1. Visual Hierarchy & 8-Point Grid System
- **Spacing Scale**: Strictly use Tailwind's 4px/8px rhythm (`p-4`, `p-6`, `gap-3`, `gap-4`, `gap-6`).
- **Color Palette (Enterprise Automotive CRM Theme)**:
  - **Primary Brand**: Slate & Indigo (`bg-slate-900`, `bg-indigo-600`, `hover:bg-indigo-700`, `text-slate-900`, `text-slate-600`).
  - **Surface & Borders**: Clean crisp surfaces (`bg-white`, `bg-slate-50`, `border-slate-200`, `shadow-sm`).
- **Numeric Alignment (`tabular-nums`)**:
  - Always apply `tabular-nums` (`font-mono` or `tabular-nums` class) to **전화번호(`010-****-1234`)**, **차량번호(`123가 4568`)**, **연식/주행거리**, **예상 견적가**, **순번 번호(`1순번`, `2순번`)**, and **일시(Timestamp)** so columns align vertically without jitter.

## 2. Semantic Consultation Status Badges (`LeadStatus`)
Use consistent, high-contrast semantic badge tokens across both `/admin` and `/tm`:
- `UNASSIGNED` (미배정 대기): `bg-rose-100 text-rose-800 border-rose-300 font-semibold animate-pulse`
- `NEW` (신규배정): `bg-blue-100 text-blue-800 border-blue-200`
- `RECALL` (부재/재통화): `bg-amber-100 text-amber-800 border-amber-200`
- `PROGRESS` (상담중): `bg-indigo-100 text-indigo-800 border-indigo-200`
- `VISIT` (방문/견적진행): `bg-purple-100 text-purple-800 border-purple-200`
- `COMPLETED` (매입완료): `bg-emerald-100 text-emerald-800 border-emerald-200`
- `CANCELED` (진행불가/취소): `bg-slate-100 text-slate-600 border-slate-200`

## 3. Interactive Controls & Accessibility (`web-design-guidelines`)
- **On/Off Toggle Switches (`DB 수신`, `SMS 수신`)**:
  - Must use semantic `role="switch"` and `aria-checked={isOn}` with clear visual state (`bg-emerald-600` when ON, `bg-slate-300` when OFF) plus explicit text badge (`ON` / `OFF`) so colorblind users can immediately tell the state.
- **Next Allocation Pointer (`🎯 다음 배정 차례`)**:
  - Highlight the active pointer TM card with `ring-2 ring-indigo-600 bg-indigo-50/40` and a prominent `🎯 다음 배정 차례` pill badge.
- **Anti-Patterns Prohibited**:
  - Never use `transition-all` (use `transition-colors` or `transition-transform`).
  - Never use unlabelled icon-only buttons without `aria-label` or `title`.
  - Never hide primary actions inside nested dropdown menus when 1-click action buttons fit cleanly.
