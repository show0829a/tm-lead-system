---
name: ui-design-system
description: >-
  Enforces UI/UX design system tokens, 8-point grid spacing, semantic status badges,
  high-density B2B CRM table layouts, WCAG accessibility rules, and heydamir/unslop
  anti-AI-slop rules. Use when designing or building the Admin console, TM workspace,
  or recruitment landing pages.
---

# UI & Design System Skill (`unslop` + `web-design-guidelines`)

## 1. Anti-AI-Slop Mandate (`heydamir/unslop`)
- **Zero AI Indigo/Purple**: Never use `indigo-*`, `purple-*`, `#4f46e5`, or glowing mesh gradients (`bg-gradient-to-br`).
- **Zero Emoji Icons**: Never use emojis (`👑`, `👤`, `📋`, `🎯`, `🌐`, `📱`, `📊`, `⚡`, `⚠️`, `🔍`, `📭`, `📞`) in UI chrome. Use 1.5px stroke inline SVGs or monospace labels (`#01`, `NEXT`, `ADMIN`, `TM`).
- **Zero Puffy Consumer Cards**: Avoid `rounded-2xl` and heavy drop shadows (`shadow-xl`, `shadow-2xl`). Use crisp `rounded-lg` or `rounded-md` with `1px` hairline borders (`border-zinc-200`).
- **Zero Motion Slop**: Never use `animate-ping` or `animate-pulse` on status dots or badges.

## 2. Visual Hierarchy & 8-Point Grid System
- **Spacing Scale**: Strictly use Tailwind's 4px/8px rhythm (`p-4`, `p-5`, `gap-3`, `gap-4`).
- **Color Palette (Enterprise Automotive Ledger Theme)**:
  - **Surfaces & Borders**: `bg-zinc-50` (`#FAFAFA` canvas), `bg-white` (panels), `bg-zinc-950` (headers/primary controls), `border-zinc-200` (`1px` crisp hairlines).
  - **Ink Hierarchy**: `text-zinc-900` (primary), `text-zinc-600` (secondary), `text-zinc-400` (muted).
  - **Single Functional Accent**: Deep Carbon (`bg-zinc-900 hover:bg-zinc-800`) for primary actions, and **Signal Blue (`sky-600` / `#0284C7`)** strictly for active pointers (`NEXT`) and active selection indicators.
- **Numeric Alignment (`tabular-nums`)**:
  - Always apply `font-mono tabular-nums` to **전화번호(`010-****-1234`)**, **차량번호(`123가 4568`)**, **연식/주행거리**, **예상 견적가**, **순번 번호(`#01`, `#02`)**, and **일시(Timestamp)**.

## 3. Semantic Consultation Status Badges (`LeadStatus`)
Use crisp `rounded-md` rectangular tags with subtle borders (no pulsing, no indigo/purple):
- `UNASSIGNED` (미배정 대기): `bg-rose-50 text-rose-700 border-rose-200 font-semibold`
- `NEW` (신규배정): `bg-sky-50 text-sky-700 border-sky-200`
- `RECALL` (부재/재통화): `bg-amber-50 text-amber-800 border-amber-200`
- `PROGRESS` (상담중): `bg-zinc-100 text-zinc-800 border-zinc-300`
- `VISIT` (방문/견적진행): `bg-teal-50 text-teal-800 border-teal-200`
- `COMPLETED` (매입완료): `bg-emerald-50 text-emerald-800 border-emerald-200`
- `CANCELED` (진행불가/취소): `bg-zinc-50 text-zinc-500 border-zinc-200`

## 4. Interactive Controls & Accessibility
- **On/Off Toggle Switches (`DB 수신`, `SMS 수신`)**:
  - Must use semantic `role="switch"` and `aria-checked={isOn}` with clear visual state (`bg-emerald-600` when ON, `bg-zinc-300` when OFF) plus explicit text badge (`ON` / `OFF`).
- **Next Allocation Pointer (`NEXT`)**:
  - Highlight the active pointer TM row/card with `ring-1 ring-sky-600 bg-sky-50/30` and a crisp monospace `NEXT` pill badge.
