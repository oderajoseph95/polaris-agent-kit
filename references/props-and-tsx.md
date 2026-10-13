# Props, slots and events in TSX

## Why this file exists

`tsc` and most validators answer "does the package declare this?", not "does the page do it?". Several real bugs lived in that gap (see mistakes.md). Treat "it type-checks" as a statement about a package and "it renders" as a statement about a page.

## Rule: camelCase props

| Raw HTML (docs examples) | JSX / TSX |
|---|---|
| `list-slot="primary"` | `listSlot="primary"` |
| `align-items="center"` | `alignItems="center"` |
| `inline-size="large"` | `inlineSize="large"` |
| `click-delegate="id"` | `clickDelegate="id"` |
| `command-for="id"` | `commandFor="id"` |
| `accessibility-label="…"` | `accessibilityLabel="…"` |

Exceptions that stay hyphenated: `aria-*`, `data-*`, and the VALUE of `slot` (`slot="primary-action"`). Why `tsc` is blind: TypeScript exempts hyphenated JSX attribute names from checking, so a kebab-case Polaris prop type-checks forever and does nothing. A camelCase name that does not exist is also ignored without a warning. `check` rules `kebab-prop` and (when the types package is installed) `unknown-prop`.

Shopify's Dev MCP validator says it plainly (output of a run on 2026-10-13): "Property 'list-slot' uses a hyphenated name which is not a valid Polaris prop. Use camelCase 'listSlot' instead."

## Rule: booleans are present or absent

A Polaris boolean attribute that is present is true, whatever its value says. React 18 (observed on 18.3; react.dev only says older versions treated unrecognized props as attributes) writes `prop={false}` on a custom element as the attribute `prop="false"`:

```tsx
<s-checkbox checked={rule.enabled} />   // enabled=false  -> checked="false" -> drawn ticked
<s-button disabled={dirty} />           // dirty=false    -> disabled="false" -> disabled
<s-table hasNextPage={more} />          // on the last page -> a live Next button
```

Safe forms: `checked={on || undefined}`, `loading={busy ? "" : undefined}`, `{...(busy ? { loading: true } : {})}`, bare `disabled`.

React 19 changed custom-element handling (https://react.dev/blog/2024/12/05/react-19): on the client, props that match a property on the element are set as properties; during server rendering a `false` is omitted. So `{false}` may behave on 19, but `"false"` (a string) is still truthy. `check` reads your React major version: `boolean-false-expr` runs only below 19; `boolean-string-false` always runs. UNPROVEN: React 19 + Polaris custom elements was not driven by this kit.

## Rule: slots are API

- A `slot` the parent element does not implement renders nothing. No error.
- A slotted node must be a DIRECT DOM child of the element that owns the slot. A `<div>` wrapper between `s-page` and its `slot="primary-action"` button breaks it. A React component may return the slotted nodes as a fragment inside the parent; it may not wrap them.
- Page and modal `primary-action` takes one `variant="primary"` button; `secondary-actions` takes buttons of `secondary` or `auto` variant. Banner `secondary-actions` takes up to two. Check each element's page for its slot list (the cached docs from `refresh`, or `custom-elements.json` inside `@shopify/polaris-types/dist`).
- `check` does not yet verify slots against the parent (NOT DONE). A slot checker must keep a real element stack and pop self-closing tags, or one element becomes everyone's parent.

## Rule: `clickDelegate` is link-shaped

`<s-table-row clickDelegate="open-1">` makes a click on any cell trigger the element with that id. Shopify's table page: "The ID of an interactive element, such as `s-link`, in the row that will be the target of the click when the row is clicked." It adds that this is the primary action for the row, and "a click-only affordance" that adds no keyboard or screen reader affordances. Observed on Polaris 1.x: only an `s-link` or `s-checkbox` target responded, and pointing it at an `s-button` failed in silence because a real mouse click lands on a descendant. Also: the id must be valid inside a CSS selector, so never interpolate a raw `gid://…` or any id containing `:` or `/` without escaping. UNPROVEN on the 2.0 RC runtime. `check` rule `click-delegate-target`.

Better default: put a real `s-link href="?open=<id>"` in the primary cell and let the URL drive the modal. A row that is only clickable with a mouse is also an accessibility defect.

## Rule: icons and strings

Icon names are typed strings; a typo is a silent missing icon. String-keyword props take strings, never `{true}`. Use `s-link` / `s-button href` for navigation, not a bare `<a>` (UNPROVEN as a hard rule; it is the documented pattern).

## Events

Events are declared per element in the types (`custom-elements.json` `events`). Standard DOM events (click, input, change, focus, ...) fire on any element, so `check` does not judge `onClick`-style handlers for them; it does flag a prop name the element does not declare when the package is installed.

## Validate

Shopify Dev MCP `validate` and the Shopify AI Toolkit check elements and props against the declared package (https://shopify.dev/docs/apps/build/ai-toolkit). When this kit was drafted the MCP validator knew Polaris App Home v1.0 and v1.1 only, so a 2.0-only prop could not be validated by it. Say so in the PR instead of claiming "validated". See validation.md.
