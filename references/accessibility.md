# Accessibility

Polaris components carry a lot of this for you. This file is what you still own. Shopify's requirement pages (Built for Shopify) are the authority; this is a working list.

- **Every control has an accessible name.** Icon-only buttons take `accessibilityLabel`. Placeholder text is not a label. A spinner takes `accessibilityLabel`.
- **Keyboard and screen reader first-class paths.** A row opens through a real `s-link` (a mouse-only row click is not accessible). A link that does not navigate is the wrong element; use a button for an action and a link for navigation.
- **Never hide evidence in a tooltip.** Anything a user needs to understand a status must be in text, because hover does not exist on a phone and a tooltip is not reachable for everyone.
- **State is not colour alone.** A tone (critical, warning, success) comes with a word. Unknown or "we cannot tell" is a state with a word, not a greyed-out or red absence.
- **Announce changes that happen without focus.** A new sort order, a toast, a filter result count: put it in text (for assistive-only text use an `s-text` with `accessibilityVisibility="exclusive"`: Shopify's text page says it is "visually hidden but announced by screen readers").
- **Skeletons are hidden from assistive tech** (`aria-hidden`) with ONE status label for the whole region, so a screen reader does not read forty empty blocks.
- **Decorative graphics** go in the `graphic` slot of sections and empty states (UNPROVEN that assistive tech skips it; `accessibilityVisibility="hidden"` is the documented way to hide decorative content from screen readers).
- **Focus after a modal closes** should return to the trigger; test it (UNPROVEN here what Polaris does by default) and prefer a Polaris modal to a hand-built overlay.
- **Headings** stay in order; do not use `s-heading` just for size (use `fontSize`).
- **Copy:** sentence case, specific verbs, past tense for status. Plain words; no internal ids (`gid://`), no raw enums.
- **Test with the keyboard once per page**: tab through, open and close every modal, submit every form.
