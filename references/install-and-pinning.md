# Install and pinning

Read this before touching the script tag, `polarisUrl`, the preload header, tsconfig `types`, App Bridge, or an upgrade.

## The one-paragraph model

Polaris web components are a script served from Shopify's CDN. The admin tells the script which look to use at runtime; your app calls no API for it. Your job is to load exactly one bundle, from one URL, and to match the TypeScript types to that bundle. Source: https://shopify.dev/docs/apps/build/app-home/polaris2 ("How it works", "Step 1").

## Channels (read from Shopify's versioning page, 2026-10-13)

Source: https://shopify.dev/docs/api/app-home/v2.0-rc/web-components/versioning

| URL (under `https://cdn.shopify.com/shopifycloud/`) | What it is |
|---|---|
| `polaris-1.js` | the stable 1.x channel (Shopify recommends the stable channel for production) |
| `polaris-1.1.js` etc. | a versioned stable release; "immutable except for critical security fixes" |
| `polaris-2.0-rc.js` | the 2.0 release candidate (Shopify: "The release candidate documented in this reference"; unlike `polaris-1.1.js` it is not described as frozen) |
| `polaris-2.0.js` | Polaris 2.0 "once its release candidate is promoted". Shopify's page says "Not published yet; moving to it is a script-tag change"; it returned 404 on 2026-10-13 |
| `polaris.js` | the legacy unversioned entry point (1.1 when read on 2026-10-13). "Never serves 2.x" |

`doctor` probes these today and tells you which exist. Do not assume; run it.

## Rule 1: one constant, three consumers

Declare the URL once:

```ts
// app/lib/polaris.ts
export const POLARIS_SCRIPT_URL = "https://cdn.shopify.com/shopifycloud/polaris-2.0-rc.js";
```

Apps built from Shopify's React Router template set it in two places and the two must be identical (Shopify: "If the values differ, then the browser preloads one Polaris bundle while your app loads another."):

```tsx
// the root route that renders the provider
<AppProvider apiKey={apiKey} polarisUrl={POLARIS_SCRIPT_URL}>…</AppProvider>
```
```ts
// the server config
const shopify = shopifyApp({ /* … */ polarisUrl: POLARIS_SCRIPT_URL });
```

Both options need `@shopify/shopify-app-react-router` 2.1.0 or later and both fall back to the unversioned `polaris.js` when unset, so an app that forgets them silently stays on Polaris 1. The provider renders the script tag and the server adds a `Link` header that preloads it. Do not add a second tag. `check` rules: `script-unpinned`, `url-mismatch`, `script-duplicate`.

Apps with their own `<head>`: one `<script src={POLARIS_SCRIPT_URL}>` next to the App Bridge script, and `<meta name="shopify-api-key" …>`.

Verify the preload header with a plain `curl -sI https://your-app/app` and look for `link: …polaris…` naming the same URL as the page's single `<script>` (view-source). UNPROVEN by this kit for every host; it was observed on one deployment.

## Rule 2: the types follow the script

- `polaris-2.0-rc.js` pairs with `@shopify/polaris-types@^2.0.0-rc.0`. Shopify's guide: "A plain `^2.0` range resolves to nothing while 2.0 is still a release candidate, because npm ranges exclude prereleases."
- `polaris-1.js` pairs with the 1.x types (npm `latest` for `@shopify/polaris-types` was 1.1.0 on 2026-10-13).
- Shopify's versioning page: "Pin the exact version to keep your types on the release candidate or to get reproducible installs." `check` rule `types-unpinned` is advice; `types-script-mismatch` is an error.
- The script is a moving channel but the types are a fixed version, so the pin does not pin what renders. That risk is accepted; record the date you read the tag (`npm view @shopify/polaris-types dist-tags`).
- When 2.0 is stable: change the URL and the types pin in ONE change.

## Rule 3: tsconfig `types` is an allowlist

When `compilerOptions.types` exists, only the packages it lists contribute global declarations. Keep:

```json
{ "compilerOptions": { "types": ["vite/client", "@shopify/polaris-types", "@shopify/app-bridge-types"] } }
```

`<s-app-nav>` is declared by `@shopify/app-bridge-types`, not by the Polaris types. The symptom of a missing entry is "Property 's-app-nav' does not exist on type 'JSX.IntrinsicElements'" for exactly one element while every other `s-*` is fine, and the wrong fix is bumping the Polaris types. `check` rule `tsconfig-types`.

If `types` is absent, TypeScript only loads `@types/*`; the Polaris types must then be referenced (`/// <reference types="@shopify/polaris-types" />` in a `.d.ts`). UNPROVEN: the no-`types` case is reasoned from TypeScript's behaviour, not observed on every setup.

## Rule 4: App Bridge is not versioned with Polaris

App Bridge has its own script and types package (`@shopify/app-bridge-types`), separate from `@shopify/polaris-types`. Do not move one to "match" the other (UNPROVEN as a Shopify statement; it is how the packages are published).

## Upgrading

1. `doctor` (what is pinned vs visible). 2. `refresh --version <new>` and read the migration page. 3. Change URL + types together. 4. `check`, `tsc`, then drive every page at 1280 and 390 on a store that shows the new admin look AND one that shows the current look (Polaris 2.0 carries both and picks at runtime; during rollout stores differ). If you have no store with the old look, say NOT DRIVEN for that row rather than skipping it.

## Library notes (proven on one stack, UNPROVEN elsewhere)

- Seen on one app and UNPROVEN elsewhere: a login page that is not embedded may need the Polaris script loaded by hand; if so, it should read the same constant.
- Keep one copy of `@shopify/shopify-app-react-router` in the tree.
