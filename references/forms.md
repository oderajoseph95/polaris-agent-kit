# Forms, save bar, toast

Element pages: https://shopify.dev/docs/api/app-home/v2.0-rc/web-components (Forms group). Save bar: https://shopify.dev/docs/api/app-home (Save bar API). Toast: Toast API on the same site.

## Inputs

`s-text-field`, `s-text-area`, `s-number-field`, `s-url-field`, `s-select`, `s-switch`, `s-choice-list`, `s-checkbox`, `s-date-field`. Rules:

- Errors appear next to the field, in the critical tone, guide to a fix, and only after interaction (Built for Shopify design requirement on forms; see built-for-shopify.md).
- A field and an action sharing a row: `s-grid gridTemplateColumns="1fr auto"`, not an inline `s-stack`.
- An `s-switch` is a setting that saves on change and confirms with a toast. It is not part of a save-bar form. Never pass it `checked={x}` with a possibly-false `x` (props-and-tsx.md).
- Labels are always present (accessibility.md). Placeholder text is not a label.

## Save bar

Either `<form data-save-bar>` (automatic: `submit` on Save, `reset` on Discard; add `data-discard-confirmation` for a confirm) OR `<ui-save-bar id>` driven by `shopify.saveBar.show/hide/toggle(id)` with `shopify.saveBar.leaveConfirmation()`. NEVER both on one form (Shopify's Save bar page carries this as a caution).

- Use it for true multi-field forms. Actions with their own result (test-send, rotate a secret, restore, export, retry) are buttons, never in the bar.
- Compute dirtiness yourself (compare to the saved value): native tracking does not clear when the user undoes an edit. Show the bar when dirty, hide it on undo, keep it up on a failed save.
- Call `leaveConfirmation()` before programmatic navigation while dirty. A dirty form should pause any live refresh.
- Seen once, UNPROVEN: a `ui-save-bar` belonging to a parent page showed behind an `s-app-window` and could not be clicked, so give a window its own form and bar.

## Toast

`shopify.toast.show(message, { isError, duration, action })`. Pair feedback: on success the bar closes AND a toast confirms; on failure an error toast AND the bar stays with the error beside the field. Toast copy says what happened in plain words and promises nothing the code did not verify ("Settings saved", not "You will now get alerts"). Never say "saved" before the read-back that proves it.

## Validate on the client AND the server

The browser form is a convenience. The route action re-validates; a merchant can send anything.
