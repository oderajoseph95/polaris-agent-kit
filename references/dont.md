# What NOT to do

1. **Do not install or import `@shopify/polaris` (the React package).** Shopify deprecated it ("Polaris React is deprecated and no longer maintained" is the npm deprecation notice, read 2026-10-13). Shopify's migration guide moves apps from it to web components: https://shopify.dev/docs/apps/build/app-home/migrate-from-polaris-react. Polaris React and web components can coexist DURING a migration; the end state is web components only. An app that keeps rendering React components keeps the old look even under Polaris 2.
2. **Do not apply Polaris 1 patterns to 2.0.** Hand-built section header workarounds, CSS that copies token values (Shopify's Polaris 2 guide lists "Custom CSS that reads Polaris custom properties, or that hardcodes values copied out of `@shopify/polaris-tokens`" among what to find, because those rules stay on the old palette), font loading added only to support Polaris, a house type scale or spacing scale. Check the cached 2.0 page for a prop first.
3. **Do not add a second Polaris script tag or a second URL.** One constant (install-and-pinning.md).
4. **Do not use the unversioned `polaris.js`** (never serves 2.x) and do not leave `polarisUrl` unset.
5. **Do not write kebab-case props in JSX** and do not cite `tsc` as proof a Polaris prop works.
6. **Do not rebuild Polaris.** A hand-rolled card, tab strip, menu out of a popover, or badge around a data value will look wrong next to restyled Polaris. (Kit opinion: a badge is for a status the app asserts about itself; use a chip for a passive label on data.)
7. **Do not invent props.** Read the element's page. Do not invent asks either: if Polaris has no element for something (a chart, a skeleton), say so and build the smallest honest thing with Polaris tokens.
8. **Do not hard-code colours, px sizes, fonts or inline `style` on Polaris elements** where a prop exists.
9. **Do not open modals on load, nest modals, or fetch after showing one.**
10. **Do not show internal ids, raw enums or raw ISO dates.**
11. **Do not render a number you did not read** (zero for unread; a trend over an incomplete source).
12. **Do not put actions in a save bar**, or use `data-save-bar` and `shopify.saveBar` on the same form.
13. **Do not self-host or edit the Polaris script, or pin it with a subresource-integrity hash.** The URL names a channel that Shopify updates; a hash would break the app the day it moves. UNPROVEN as a Shopify requirement here; check Shopify's current rule before relying on it.
14. **Do not replace the template's error boundary** (`boundary.error()`, `boundary.headers()`).
15. **Do not trust this kit over Shopify.** When a cached Shopify page disagrees with a line here, the page wins and this kit has a bug: open an issue.
16. **Do not claim "Built for Shopify".** That badge is Shopify's to grant (installs, reviews and requirements); nothing you ship may claim it before you hold it. See built-for-shopify.md.
