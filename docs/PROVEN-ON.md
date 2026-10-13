# Proven-on matrix

Last updated: 2026-10-13 (draft). A row says where a statement was OBSERVED, not where it is believed to hold.

## Environment

| Item | Value |
|---|---|
| Polaris script | `https://cdn.shopify.com/shopifycloud/polaris-2.0-rc.js` (release candidate); `polaris-1.js` exists (200); `polaris-2.0.js` returned 404 on 2026-10-12/13 |
| `@shopify/polaris-types` | `2.0.0-rc.3` (npm `next` on 2026-10-13); npm `latest` was `1.1.0` |
| React | 18.3.1 |
| App framework | Shopify React Router app template, library `@shopify/shopify-app-react-router` 3.x |
| Admin | a store with the new admin design; an old-design store was NOT available |
| Locales checked | English plus a long locale; not all |

## Rule by rule

| Rule / statement | Proven how | Stack | Status |
|---|---|---|---|
| kebab-case prop is dead; `tsc` cannot see it | Shopify's validator message; typecheck green with 9 bad headers; phone layout lost | 1.x types, later 2.0 RC | proven |
| A container-query grid with no `s-query-container` shows its fallback branch | page rendered without the effect | 2.0 RC | observed once; not checked against Shopify's text |
| A prop declared by the types but ignored by the runtime | seen once on an earlier release | n/a | UNPROVEN: not reproducible from the published 1.1.0 or 2.0.0-rc.3 types |
| `@shopify/polaris` deprecated | npm deprecation notice read 2026-10-13: "Polaris React is deprecated and no longer maintained."; the GitHub repository reported `archived: true` the same day | n/a | proven (cited) |
| tsconfig `types` allowlist drops `s-app-nav` unless `@shopify/app-bridge-types` is listed | typecheck error and fix | 1.x types | proven |
| Boolean `{false}` renders `"false"` and is true | rendered a ticked switch, disabled button | React 18.3 + Polaris 1.x/2.0 RC | proven; React 19 UNPROVEN |
| `clickDelegate` responds only to an s-link / s-checkbox target | row click did nothing on a button; Shopify's docs say only "such as `s-link`" | 1.x | observed on 1.x; 2.0 RC UNPROVEN |
| Table unmounted with its `filters` slot on empty results | page behaviour | 1.x | proven |
| Server-HTML table: stacked-layout header label lost; client-created table works | measured (8 of 8 rows empty vs present) | 2.0 RC | proven on RC only |
| Modal opened before content causes a content-dependent layout shift | PerformanceObserver on 5 cold opens at several read speeds | 2.0 RC | proven |
| Table cells that can wrap cause a late row growth | measured with a squeeze fixture; the live occurrence was not reproduced on realistic data | 2.0 RC | proven by fixture only |
| `secondary` listSlot prints unlabelled/clipped in the phone layout | screenshot at 390 | 2.0 RC | proven |
| Iframe is ~1056 px in a 1280 window and equals the window at 390/320 | measured once | one admin, new design | one measurement |
| React 19 handles custom-element props as properties | cited from react.dev (2026-10-13) | n/a | cited, not driven |
| Cursor `.mdc` rules, Copilot `.instructions.md`, Windsurf rules, AGENTS.md paths | cited from vendor docs fetched 2026-10-13 | n/a | cited, not driven in each agent |
| Claude Code plugin layout (`.claude-plugin/plugin.json`, root `SKILL.md`, `marketplace.json`) | cited from code.claude.com (2026-10-13); `claude plugin validate .` printed "Validation passed" on 2026-10-13; an install into Claude Code was not run | n/a | validated, not installed |
| Built for Shopify thresholds (LCP 2.5 s, CLS 0.1, INP 200 ms, 75th percentile) | read from Shopify's requirements page (fetched 2026-10-13) | n/a | cited; re-read before relying |
| `s-app-nav` and `s-app-window` come from `@shopify/app-bridge-types`, not `@shopify/polaris-types` | both type packages downloaded and searched 2026-10-13 (app-bridge-types 0.7.2) | n/a | proven |
| `unknown-prop` / `unknown-element` parse the real `custom-elements.json` | `check` run against the real `@shopify/polaris-types@2.0.0-rc.3` (62 elements) 2026-10-13 | 2.0 RC | proven on that file |

## How to add a row

State the observation, the stack with exact versions, and the date. A statement without these is UNPROVEN.
