# Modals

Element reference: https://shopify.dev/docs/api/app-home/v2.0-rc/web-components/overlays/modal; Modal API: https://shopify.dev/docs/api/app-home (Modal API page).

## Anatomy

`<s-modal heading="…" size="large">` with content, plus `slot="primary-action"` (one `variant="primary"` button) and `slot="secondary-actions"` (buttons of `secondary` or `auto` variant). Content scrolls inside while the heading and footer stay pinned. Open it from a trigger with `commandFor="modal-id" command="--show"` (hide with `--hide`) or from the Modal API (`shopify.modal.show/hide`).

## Rules

1. **Use a modal for a view of one record and for a confirm, not for a place the merchant works.** Shopify's guidance: a last resort for important decisions, not for contextual tools; do not nest modals; open only from a user interaction, never on page load.
2. **One detail shell.** If more than one record type opens in a modal, build ONE shell (size, close, at most one primary action, a fixed order of parts) and use it everywhere. A second implementation is a defect; the next page copies whichever one its author opens.
3. **Buttons live in the slots.** Heading in `heading`; no button outside `primary-action` / `secondary-actions`. The Close button is a `secondary-actions` child.
4. **A modal opens when it has its content.** Do not show the modal and then fetch: the centred panel moves when the answer swaps in for a spinner (a layout shift scored per web.dev when it is more than 500 ms after an input, so a fast read hides the defect and a slow one is what is counted). Instead: the click sets the row's button to `loading`, the read runs, and the modal is shown ONCE, in the render that carries the answer, or with a failed-read banner and Try again when the read fails or passes a ceiling (pick a ceiling that suits the page). Never size a surface by a loading state that is a different size from the real one.
5. **Measure a shift at several read speeds**: fast (100 ms), past 500 ms, past 3 s, and failed; five cold opens each; keep `hadRecentInput` entries visible and never drop them.
6. **Do not ask App Bridge to `hide` a modal on mount that nobody opened**, and do not ask for `show` while the content is still being fetched. If a scrim shows with no dialog on a first open, record the sequence of `shopify.modal.show/hide` calls with timestamps before guessing. (A first-open scrim without a dialog was seen once and not reproduced; cause UNPROVEN.)
7. **A menu inside a modal can clip** (the menu page lists it as a limitation); use inline choice controls in a modal.
8. **A table inside a modal is fine when the content is genuinely tabular** (a before/after diff). At narrow container width stack it as labelled blocks, never horizontal scroll.
9. **Children of an App Bridge "max" modal can lose React events** in some setups; click-test every control in a modal. UNPROVEN generally; seen once.
10. **Destructive confirm:** the body states the consequence in the merchant's words; the button's verb names the action ("Delete 3 items"), never "Yes" or "OK".
11. **At 390:** one column, footer pinned, a long form scrolls inside with heading and footer fixed.

## Deep links

Drive the modal from a URL parameter (`?open=<id>`). Then (a) the view is shareable, (b) a missing or unknown id must be handled (write a test with an id that matches no row; a bug reachable only that way is easy to miss), (c) a saved URL must never carry a bound that makes its own label false, (d) the error boundary must render without the thing that failed (hard-coded fallback text when translations are not initialised).
