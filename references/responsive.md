# Responsive: 1280, 390 and the 320 outer window

## Look at three widths, in the embedded admin

1. **1280.** The reading width.
2. **390.** A phone. Many Polaris layout props are responsive, so the props this bites are exactly the ones a desktop look never exercises (`listSlot`, `gridTemplateColumns`, container queries).
3. **320 OUTER.** A 390 browser window does NOT put your iframe at 390: the admin chrome takes space, so in the admin frame the app can see about 500 px. Resize the OUTER window to 320 to reach the narrow container branch. Measured on one admin with the new design: the iframe was about 1056 px in a 1280 window and equal to the window at 390 and 320, because the admin switches to its mobile layout, so confirm on your store rather than assuming either number. (UNPROVEN beyond that one measurement.)

Also drive one LONG locale (German or Finnish) at 390 on any page with badges, table headers or buttons: English is not the stress test. And after any narrow test, resize back to full width before the next check.

## Container queries

- Shopify's grid page shows a responsive `gridTemplateColumns` with container queries in an example, e.g. `"@container (inline-size > 700px) 1fr 1fr 1fr 1fr, 1fr"` inside an `s-query-container`.
- Observed, UNPROVEN against Shopify's text: with no `s-query-container` ancestor the grid picked its fallback branch at every width, and neither tsc nor a validator saw it. Wrap such a grid in one and look at it at 1280 and 390.
- Set responsive values on props, not in CSS. Each container costs layout work: do not wrap everything.
- Keep thresholds consistent across the app (one number for a metric strip, one for two-up blocks).

## Patterns

- Tables become lists through `listSlot` (tables.md). Modals become one column with a pinned header and footer. Title-bar actions collapse into the admin's own menu. Banners wrap; they never truncate.
- No information only in a tooltip or hover: a phone has no hover.
- Fixed-bottom UI honours `var(--shopify-safe-area-inset-bottom, 0px)`.
- A badge holds a word, not a sentence; a sentence in a badge gets cut mid-word at narrow widths.
- `s-button-group gap="none"` was seen dropping its first child in one app; eyeball any button group at both widths. UNPROVEN generally.
- A slot that exists but is unused (a modal footer) can hide a control at 390: click everything you added.
