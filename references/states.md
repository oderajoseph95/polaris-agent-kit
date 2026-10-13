# States: loading, empty, error, partial

Elements: `s-spinner`, `s-progress`, `s-empty-state`, `s-banner`, and the Loading API (`shopify.loading(true|false)`). Pages: https://shopify.dev/docs/api/app-home/v2.0-rc/web-components (Feedback and status indicators).

## The principle

"I found nothing" and "nothing happened" are different statements. Any list or metric backed by data that can be incomplete, still loading, or unreachable must say which. A false "No results" or a `0` over an unread source is the most trust-damaging bug a dashboard can have, and no linter can see it.

## The states (give each its own picture and sentence)

| State | Means | Says | Element |
|---|---|---|---|
| loading | the first read is in flight | nothing yet; a skeleton shaped like the populated page | skeleton (Polaris ships none: build one, `aria-hidden`, one status label) |
| healthy | complete, rows render | the rows | the table or metrics |
| partial / building | data is still being gathered | "still reading; counts are not final" | `s-banner` info + `s-empty-state` in an empty table; metrics as a dash |
| failed | a background job failed | what failed, what to do | `s-banner` critical with an action |
| unreachable | the READ failed right now | "we could not read this now; that is about reaching it, not about your data" | `s-banner` warning INSIDE the section, keep the last good rows with a stale marker |
| empty | complete AND nothing in range | "Nothing in this range", only when the source says complete | `s-empty-state`: say why, then what to do |
| filtered to zero | rows exist, the filter excludes them | "your data has not changed, this view of it has" | `s-empty-state` AFTER the table so the filters survive; action: Clear filters |

Precedence: filtered, then unreachable, then failed, then building, then empty. Keep this in ONE component; pages must not branch on emptiness themselves. A loader returns `null` for a failed read, never fabricated zeros. The empty state is the first screen every new user sees and the one your own populated test store stops showing after day one: force and screenshot each state.

## Loading rules

1. Skeletons shaped like the populated page, so nothing reflows (CLS is a Built for Shopify number).
2. `s-spinner` only inside a section, after about 500 ms, with `accessibilityLabel`; never a full-page spinner.
3. `shopify.loading(true|false)` lights the admin's top progress bar for navigations and foreground loads. A background poll must never light it.
4. `s-progress` (`value`, `max`) for measurable work; it renders no text, so add adjacent text.
5. A silent background refresh keeps the last rows with a stale marker on failure; it never replaces them with the error boundary.

## Banners

`s-banner heading tone dismissible`; slot `secondary-actions` (up to two buttons); tones info, success, warning, critical (auto exists).

- Shopify's banner page: "Multiple banners stack vertically without built-in prioritization or queueing" and "You must implement banner queueing logic yourself to show one at a time"; Built for Shopify 4.3.4 rejects two or more banners "in close proximity to one another". Build ONE banner slot per page that lists every true condition inside it, picks the tone by precedence (critical over warning over info), and never hides a fact because a worse one is also true.
- A page-wide banner goes in `s-page slot="supplemental-start"`; a contextual one inside its section.
- Every non-success banner has a next step as one `secondary-actions` button.
- Do not make a banner dismissible while the condition it reports still holds. `dismissible` is for info or success, with a persistence plan (the dismissed state does not survive a load by itself).
- Tone is for the live situation: critical = a failure the merchant must act on now; info = settled history, even when the history is a failure (red on settled history reads as an active problem).
- Never a success banner before the verifying read.

## Errors

A route that throws must render without the thing that failed (no dependency on translations that did not load; a hard-coded English fallback). Do not replace the template's `boundary.error()` / `boundary.headers()` handling in the app route: Shopify's auth flow relies on thrown responses, and a hand-written boundary can swallow them (observed on one app; verify with a deliberately thrown response).
