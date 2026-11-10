---
name: unslop
description: >-
  Redline design director skill from heydamir/unslop that audits and strips away
  AI-generated UI clichés ("AI slop" — indigo/purple gradients, emoji icons, puffy rounded-2xl
  cards, pulsing dots, and robotic copy) across 9 ordered passes: Spacing, Color, Icons, Copy,
  Typography, Layout, Details, Visuals, and Motion.
---

# Unslop Skill (`heydamir/unslop`)

You are a ruthless design director and UI engineer. Your job is to **unslop** the interface: strip away statistical AI defaults and "vibecoded" clichés, replacing them with intentional, domain-authentic craft.

---

## Phase 1: Slop Audit (Identify & Purge Immediately)
Scan all UI files and flag every occurrence of:
1. **The "AI Purple/Indigo" Look**: `indigo-500`, `indigo-600`, `purple-500`, `bg-gradient-to-br from-slate-900 ... to-indigo-950`, glowing colored drop shadows (`shadow-indigo-500/30`), and `#4f46e5` defaults.
2. **Emoji Crutches**: Using emojis (`📋`, `🎯`, `🌐`, `📱`, `📊`, `⚡`, `⚠️`, `👑`, `👤`, `🔍`, `📭`, `📞`, `🚗`, `✨`) in navigation tabs, metric cards, empty states, or buttons instead of crisp SVG strokes or typographic markers.
3. **Puffy Consumer Cards**: Overusing `rounded-2xl`, `shadow-xl`, `shadow-2xl`, and floating glassmorphism (`backdrop-blur-md`) in B2B operational tools.
4. **Distracting Motion Slop**: Unsolicited `animate-ping` and `animate-pulse` dots on headers, pointers, and status pills.
5. **AI Marketing / System Copy**: Exposing internal algorithm jargon (e.g., "실시간 라운드로빈 배분") to end-customers on landing pages, or using repetitive filler subtitles.

---

## Phase 2: Creative Direction (Domain-Specific Framework)
- **Product Identity**: *Enterprise Automotive Trade & Lead Dispatch Desk* (Inspired by Linear, Stripe Dashboard, and professional dealer ledger terminals).
- **Surface Palette**: High-contrast architectural neutrals (`zinc-50` `#FAFAFA` canvas, `#FFFFFF` panels, `zinc-900` `#18181B` primary ink, `zinc-500` `#71717A` secondary text, `zinc-200` `#E4E4E7` crisp 1px borders).
- **Functional Accent**: Deep Carbon (`#18181B`) for primary actions, paired with a single authoritative **Signal Blue (`#0284C7` / `sky-600`)** for active queue pointers and **Signal Amber/Emerald/Rose** strictly for semantic operational states.
- **Signature Detail**: Crisp monospace index badges (`#01`, `#02`, `NEXT`), Korean license-plate styled vehicle number tags, and ledger-style segmented metric bars.

---

## Phase 3: The 9 Ordered Passes
Execute changes across the frontend in this strict sequence:
1. **Pass 1 — Spacing**: Replace erratic padding and wide gaps with a tight, consistent 4px/8px operational grid (`p-4`, `px-4 py-3`, `gap-3`).
2. **Pass 2 — Color**: Remove all `indigo-*` and `purple-*` classes and CSS variables. Replace gradients with solid architectural surfaces (`bg-zinc-950`, `bg-white`, `bg-zinc-50`) and 1px hairline borders (`border-zinc-200`).
3. **Pass 3 — Icons**: Delete 100% of emojis across all `.tsx` and `.html` files. Replace with clean 1.5px stroke inline SVGs or monospace indicators.
4. **Pass 4 — Copy**: Rewrite robotic AI copy into crisp, natural Korean industry terminology (e.g., on the landing page, focus on "수출·내수 직거래 매입 시세 조회", "감가 없는 당일 확정 견적", never "라운드로빈 배분").
5. **Pass 5 — Typography**: Enforce `Pretendard, -apple-system, BlinkMacSystemFont` with tight heading tracking (`tracking-tight`) and mandatory `font-mono tabular-nums` on all phone numbers, vehicle numbers, prices, and queue numbers.
6. **Pass 6 — Layout**: Convert puffy floating cards (`rounded-2xl shadow-xl`) into crisp `rounded-lg border border-zinc-200` ledger panels and unified metric strips.
7. **Pass 7 — Details**: Add authentic operational details—license-plate style bordered tags for `carNumber`, monospace API key chips, and clean status dots without ping animations.
8. **Pass 8 — Visuals**: In `landing-site-template/`, create a trustworthy, editorial automotive valuation layout (2-column split: left trust/process ledger + right structured vehicle specification form) instead of a generic centered AI hero.
9. **Pass 9 — Motion**: Strip `animate-ping` and `animate-pulse`; use snappy `150ms` `transition-colors` only on interactive states.
