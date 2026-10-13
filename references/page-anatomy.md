# Page anatomy

Source of truth for every element: its page under https://shopify.dev/docs/api/app-home/v2.0-rc/web-components (cached locally by `refresh`). This file is the short judgment layer on top.

## The page

```tsx
<s-page heading="Orders" inlineSize="large">
  <s-button slot="primary-action" variant="primary">Create order</s-button>
  <s-button slot="secondary-actions">Export</s-button>
  <s-link slot="breadcrumb-actions" href="/app">Home</s-link>
  <s-section heading="Recent"> … </s-section>
</s-page>
```

- `s-page` has a `heading` and slots `primary-action`, `secondary-actions`, `breadcrumb-actions`, `aside` (only drawn at `inlineSize="base"`) and `supplemental-start` (Shopify: "content that comes before the main content, such as an `s-banner`"). Its types declare no subtitle prop.
- The title bar is drawn by the admin OUTSIDE your iframe. Your heading and actions appear there. Do not rebuild a second header in the body.
- Actions: at most one primary and a few secondary, relevant to the whole page, never at the bottom, none that act on one row. A secondary action that does not fit goes in an `s-menu` opened with `commandFor`; menu items are verb + noun ("Export as CSV"), never "More".

## Width is a decision per page

`inlineSize` is `small`, `base` (the default) or `large` ("full width with whitespace"). The `aside` slot is only rendered at `base`. Choosing `large` for a wide table or metric strip and `base` for forms is this kit's judgment, not a Shopify rule; write the decision in a comment. A wide table inside a default-width page cuts its last column and no linter sees it; the right edge in your screenshot shows it. A shared component that looks different on two pages is a property of the PAGE (its width), not of the component.

## Sections, cards, grids

- `s-section` takes `heading`, `subheading`, `padding` and header slots in 2.0 (`primary-action`, `secondary-actions`, `accessory`, `supplemental`, `graphic`). Check the cached page; these are 2.0 additions (UNPROVEN on 1.x).
- Put a list straight into a section with an `s-divider` between rows, not a box around each row. Use `s-box` (bordered tiles) only for items that stand on their own in a grid. (Pattern: https://shopify.dev/docs/api/app-home/v2.0-rc/patterns/templates/homepage)
- Lay out with `s-grid` and `s-stack`. A field in an inline `s-stack` fills the row and pushes siblings down; put a field and an action that share a row in `s-grid gridTemplateColumns="1fr auto"`.
- A line of text that changes width as the page ages ("updated 3 minutes ago") sits in a track sized to its longest common form, or the row re-wraps.

## Numbers and type

- Use `s-heading` / `s-text` / `s-number` props rather than CSS. Shopify's `s-text` page marks `fontVariantNumeric` as deprecated: "Use `Number` for inline numeric values instead."
- Do not load a font just to support Polaris elements; they style their own text. Text outside Polaris elements uses your document font (seen once: a missing document font showed only there; UNPROVEN generally).
- A number is never a claim the data cannot back: if the value was not read, show a dash and the reason, not `0` and not a trend.

## The safe area

Shopify's Polaris 2 guide (https://shopify.dev/docs/apps/build/app-home/polaris2): "App Bridge reports the height of that overlay as the `--shopify-safe-area-inset-bottom` CSS custom property" and "Position them with `var(--shopify-safe-area-inset-bottom, 0px)`". It applies to anything you position over the bottom of the viewport; most pages need nothing.
