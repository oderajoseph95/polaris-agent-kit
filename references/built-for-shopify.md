# The Built for Shopify design bar

Authority: https://shopify.dev/docs/apps/launch/built-for-shopify/requirements (this kit paraphrases section numbers and thresholds as read from that page on 2026-10-13; the page changes, so run `refresh` or open it). The badge itself is Shopify's to grant: the page also lists install, review and rating minimums (1.2.1 to 1.2.3) that no code can satisfy. NEVER claim "Built for Shopify" in your app or listing before you hold it, and never say that following this kit makes an app compliant or approved. Treat these requirements as a design and performance bar to build toward, in your own reading of them.

## Requirements this kit's rules map to

| Requirement (Shopify numbering) | In practice | Reference |
|---|---|---|
| 2.1.1 LCP 2.5 s or less; 2.1.2 CLS 0.1 or less; 2.1.3 INP 200 ms or less (75th percentile; each needs 100+ calls over 28 days to be assessed) | skeleton shaped like the page, no late swaps, no cell that can wrap, modals that open with content | performance.md, tables.md, modals.md |
| 4.1.1 Follow UX best practices | most logical action visually dominant; sensible primary action | page-anatomy.md |
| 4.1.2 Mobile-friendly | tables as lists at 390, no horizontal scroll | tables.md, responsive.md |
| 4.1.4 Use the nav menu | read Shopify's page; this kit only notes that `s-app-nav` is declared by the App Bridge types | install-and-pinning.md |
| 4.1.5 Use the contextual save bar | form inputs saved through the save bar | forms.md |
| 4.1.6 Use modals appropriately | heading in `heading`, buttons in the slots (not-on-load and not-nested are on Shopify's modal page) | modals.md |
| 4.2.1 Spelling, grammar, phrasing | plain words, clear labels with units | accessibility.md |
| 4.2.2 Helpful onboarding; 4.2.3 helpful homepage | a first screen that says what to do | states.md |
| 4.2.4 Helpful error messages | red, guide to a fix, beside the field when possible | forms.md, states.md |
| 4.2.5 Guide merchants to logical actions | one obvious next step per banner | states.md |
| 4.3.1 Don't make false claims | a screen must not claim more than the data proves | states.md |
| 4.3.4 Don't overwhelm merchants | no two banners close together; this kit's approach is one banner slot per page | states.md |
| 4.3.6 Dismissible ads | promotional content must be dismissible | states.md |

(Section numbers and titles are Shopify's, read 2026-10-13. The "In practice" column is this kit's reading, not Shopify's text. If they have been renumbered, trust the page.)

## Guidance beyond the checklist

Shopify's app design guide: https://shopify.dev/docs/apps/design (structure, layout, navigation, forms, alerts, onboarding, content voice and tone). The design guide and the web-component pages are the sources; Polaris-specific judgment is in this kit's other references.
