# Tables

Element reference: https://shopify.dev/docs/api/app-home/v2.0-rc/web-components/layout-and-structure/table (and the Index table composition under /patterns/compositions/index-table). Read the cached copy after `refresh`.

## Anatomy

```tsx
<s-section padding="none">
  <s-table paginate hasNextPage={more || undefined} hasPreviousPage={prev || undefined} loading={busy || undefined}>
    <s-grid slot="filters" gridTemplateColumns="1fr auto"> …search field, sort… </s-grid>
    <s-table-header-row>                      {/* header row FIRST */}
      <s-table-header listSlot="primary">Name</s-table-header>
      <s-table-header listSlot="inline">Status</s-table-header>
      <s-table-header listSlot="labeled">Updated</s-table-header>
    </s-table-header-row>
    <s-table-body> … <s-table-row> <s-table-cell> … </s-table-body>
  </s-table>
</s-section>
```

## Rules

1. **Every `s-table-header` declares `listSlot`.** On a phone the table renders as a list and `listSlot` (`primary`, `secondary`, `kicker`, `inline` or `labeled`; the default is `labeled`) decides each column's role. A missing or hyphenated `listSlot` falls back to the default, so no column is the row's title, while desktop looks perfect, which is why a human desktop check passes it. (`check`: `kebab-prop`, advice `table-header-listslot`.)
2. **Only the row's title is `primary`.** Every other column is `labeled`, unless it is a short badge (`inline`). `secondary` is for a short second line, never a sentence: in the stacked layout a `secondary` cell sits unlabelled beside the field name and does not wrap, so a sentence prints clipped with no label.
3. **A row is a one-liner by construction, not by how short today's data is.** Polaris draws rows as it parses them and re-divides the columns each time a later row brings a wider cell, so any cell that CAN wrap wraps the moment its column narrows, and the rows below jump (a layout shift). Therefore: size a date cell to its own text (a one-track `s-grid` with `gridTemplateColumns="max-content"`), cut names to a fixed length with an ellipsis you control, and put two inline things (a name and a badge) in a `max-content` grid, never an inline stack. Cutting characters limits width; only a track that cannot break forbids a wrap.
4. **No built-in sorting, search or sticky header.** Shopify's table page says "The component doesn't include built-in sorting or search functionality" and points to the `filters` slot. Implement sort and search yourself: state in the URL, work in the server query, never a client-side sort of one page of a larger set (a 50-row page of a 40,000-row table is a false order). Announce the current order in text for assistive tech (no `aria-sort` prop is documented on the header).
5. **Filters live INSIDE the table, in `slot="filters"`.** A search field in a sibling above the table looks identical on desktop and is not part of the table's responsive contract. Filter chips, sort, search: all in the slot.
6. **Never unmount the table when a filter matches nothing.** An early `if (rows.length === 0) return <Empty/>` removes the `filters` slot with it and leaves the merchant one sentence and no way out except clearing every filter. Keep the table, put the empty message AFTER it, and add a "Clear filters" action. Distinguish "empty" from "filtered to zero".
7. **Row open.** Put a real `s-link` in the primary cell and set `clickDelegate` to ITS id (see props-and-tsx.md). Open a modal for the record, driven by a URL parameter so the view is shareable (see modals.md). A tertiary `s-button` renders as plain text with no border; do not use it as the only way into a record.
8. **Pagination.** `paginate` with `hasNextPage` / `hasPreviousPage` from a server cursor (Shopify's table page: "Use pagination for datasets with more than 50-100 rows"). A "Showing 25 of 1,204" count comes from the same query, never counted client-side. Omit `hasNextPage` when false (booleans rule), or the last page shows a live Next.
9. **Loading.** Shopify: with `loading` true the table "might be in an inert state that prevents user interaction", which may include the filters you put inside it. For first paint use a skeleton shaped like the table; for a refetch, consider a spinner in the section header (a design call).
10. **Cells show humans' words.** Dates through one formatter, never raw ISO. Enums translated, never a raw database value such as `PARTIALLY_FULFILLED`. Ids humanized, never `gid://` (`check`: `raw-gid-render`).
11. **Server-rendered tables behave differently from client-rendered ones.** Polaris 2.0 RC reads each header's text once; a table parsed from server HTML can hand it the LAST header with empty text so a stacked-layout label never prints, while the same table created in the browser works. Test the table the way your server serves it (server HTML, then hydrate), and consider creating tables that sit in closed modals after hydration. Observed on 2.0 RC; UNPROVEN on other versions.

## Mobile reading test

At 390: one column, each row a card, labels present on every `labeled` field, no horizontal scroll, no cut text. At the 320 outer window too (responsive.md).
