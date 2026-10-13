# Validation: what each check proves, and what it cannot

| Check | Proves | Cannot see |
|---|---|---|
| `tsc` | types of what the package declares | hyphenated JSX props (skipped by TypeScript), props the runtime ignores, slots, layout |
| `npx <this-kit> check` | the mechanical patterns in `check --list` are absent | pixels, wrapping, dead controls, container collapse, whether an element renders at all |
| Shopify Dev MCP `validate` / Shopify AI Toolkit | elements and props against the declared package for the versions it knows | a 2.0-only prop when it knows only 1.x; runtime behaviour; the page |
| `refresh` + reading the cached component page | what Shopify says TODAY | whether your app does it |
| YOUR OWN drive of the page at 1280, 390, 320 outer | what a merchant sees | anything you did not open or click |

A green check is a floor. Say what you could not prove (UNPROVEN) in the PR.

## Shopify's own tooling

- Shopify Dev MCP: connects an AI tool to Shopify's developer resources; Shopify says it runs locally and needs no authentication. Command on Shopify's page: `npx -y @shopify/dev-mcp@latest` (https://shopify.dev/docs/apps/build/devmcp).
- Shopify AI Toolkit: https://shopify.dev/docs/apps/build/ai-toolkit (Shopify describes it as including code validation).
- When this kit was drafted, the validator knew Polaris App Home 1.0 and 1.1 only; it answered that 2.0-rc was unsupported and defaulted to the latest it knew. A 2.0-only prop is therefore outside its reach. Validate against the nearest version and write that sentence in the PR. (Observed 2026-10-13: the tool offered versions v1.0 and v1.1 only; it may have moved.)
- Rule of precedence when sources disagree: live introspection of the API, then Shopify's published page, then the validator's output. The validator is never proof alone.

## Drive recipe (every page you change)

1. Open the SIBLING page of the same pattern and screenshot it first.
2. Open your page in the embedded admin, same session; list the differences before you code.
3. Build; run `check`, `tsc`.
4. After deploy, reload the DEPLOYED page and screenshot at 1280, 390, 320 outer, one long locale, on a store with the new admin look and one with the current look.
5. Click every control you added. A dead control looks identical in a screenshot.
6. Force each state (empty, filtered, partial, failed, unreachable) and screenshot it.
7. Open each shot. Do not accept a proof screenshot because the fix is already confirmed in source.

Drive the app inside the admin (it renders in an iframe there), not its bare hostname.

## Keeping the kit fresh

`refresh` caches Shopify's current pages with their fetch date and source URL; `doctor` compares your pinned version with what npm and the CDN show now. If either shows a difference from this kit's "proven on" line (docs/PROVEN-ON.md), trust the page and report the gap.
