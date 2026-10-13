# Performance and layout shift

Built for Shopify measures web vitals on your embedded app. Requirements and thresholds: https://shopify.dev/docs/apps/launch/built-for-shopify/requirements and https://shopify.dev/docs/apps/build/performance. Read them; numbers change.

## What matters here

- **Layout shift (CLS).** Shopify's requirement 2.1.2 says CLS is "0.1 or less" at the 75th percentile (requirements page read 2026-10-13; verify the current number). The Polaris-specific causes seen: a modal that opens before its content arrives (modals.md), a table cell that can wrap (tables.md), a line of text that changes width as the page ages, a skeleton that is a different shape from the real page, fonts that swap late.
- **Scores come from the slow case.** A discrete input's shift counts when it is more than 500 ms after the input, so one fast read hides what the 75th percentile will show. Measure at several read speeds and with the cache off, five cold loads each.
- **Measure in the real frame.** Install a `PerformanceObserver` for `layout-shift` BEFORE navigation; capture the shifting node at the shift (nodes inside shadow roots are gone by the time buffered entries are read); use `Range.getBoundingClientRect` for a `display: contents` cell. The embedded admin frame, real data and live revalidation can shift where a fixture does not: a shift a fixture cannot reproduce belongs to something the fixture lacks, so measure on the deployed page rather than reshaping the layout.
- **One bundle.** Two Polaris URLs mean a wasted download or a thrown error; the preload header must name the same URL as the tag (install-and-pinning.md).
- **Skeleton, then content, same shape.** Cheaper than any spinner and it removes a shift.
- **Do not poll without discipline.** Pause when the tab is hidden, offline, a modal is open, a form is dirty or an input has focus; keep at least a few seconds between polls; show freshness; on a failed poll keep the last rows.
- **Table size.** Paginate past roughly 50 to 100 rows; Polaris draws rows as they are parsed and re-divides columns as it goes.
- **`s-query-container` costs layout work**; use it where a grid needs it, not as a wrapper.
- **Web Vitals API.** App Bridge exposes a Web Vitals API (https://shopify.dev/docs/api/app-home/apis/device-and-platform-integration/web-vitals-api); use it to see what Shopify sees.

## UNPROVEN

This kit has not measured Polaris script weight or time to interactive; do not quote numbers from it.
