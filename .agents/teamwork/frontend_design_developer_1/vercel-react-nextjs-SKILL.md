---
name: vercel-react-nextjs
description: >-
  Enforces React 19 and Next.js App Router engineering standards synthesized from
  vercel-labs/agent-skills (vercel-react-best-practices). Use when building or reviewing
  Next.js pages, client/server components, data fetching, state mutations, or static landing pages.
---

# Next.js & React Best Practices Skill (from `vercel-labs/agent-skills`)

## 1. Eliminating Data Waterfalls (Critical)
- **Parallel Fetching**: Never chain independent `await` calls sequentially in Server Components, Route Handlers, or Client effects. Always group independent queries with `Promise.all([fetchLeads(), fetchTms(), fetchSites()])`.
- **Single-Roundtrip Dashboard Payload**: When loading `/admin` or `/tm`, fetch the initial state in parallel and avoid cascading `useEffect` chains.

## 2. Server vs. Client Component Boundaries
- **Server by Default**: Keep route layouts and static shells as Server Components.
- **Scoped `'use client'`**: Add `'use client'` at the interactive boundary (e.g., interactive Admin tabs, TM workspace status toggles, modals).
- **Minimal Serialization**: Never pass raw encrypted strings (`phoneEncrypted`, `passwordHash`) from Server to Client props. Strip sensitive fields on the server and pass only `phoneMasked`.

## 3. Re-render & State Management Optimization
- **Derived State During Render**: Filter leads by status/site/TM or compute summary counts (`total`, `unassigned`, `today`) directly during render (`useMemo` or inline derivation)—never synchronize derived state inside `useEffect`.
- **Optimistic UI for Toggles**: When a TM toggles `DB 수신 [ON/OFF]` or `SMS 수신 [ON/OFF]`, or when an Admin changes the `다음 배정 차례(Pointer)`, update UI state optimistically and rollback on error for instant responsiveness.

## 4. Static Landing Page (`landing-site-template/`) Standards
- **Zero-Server Dependency**: Must work as pure static HTML/CSS/JS deployable to Vercel, Cloudflare Pages, or Netlify without a Node.js runtime.
- **Resilient Fetch**: Include timeout handling, double-submit prevention (`disabled` button while submitting), phone number auto-formatting (`010-XXXX-XXXX`), and clear user feedback on `201 Created` vs `429 Duplicate`.
