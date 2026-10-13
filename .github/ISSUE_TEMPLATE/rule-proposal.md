---
name: A rule proposal
about: Propose a new `check` rule or rule for agents, with what you saw on screen
title: "rule: "
labels: ["rule-proposal"]
---

**The mistake**, in one sentence:

**The on-screen evidence.** What did you see, in which browser and at which width, that was wrong? A short description or a screenshot of an invented page. No real store, no customer data.

**The stack it was observed on, with exact versions:**

- Polaris script URL:
- `@shopify/polaris-types`:
- React:
- Browser and width:

**Is there a Shopify page that says it?** Give the URL and the date you read it. If not, say "observed only", and the rule will be `advice`, not `error`.

**A small invented page that triggers it** (the smallest `.tsx`), and one that does not:

```tsx

```

**What `check` should print as the one-line fix:**

**Can `tsc` or Shopify's validator already catch it?** (If yes, the rule may not be needed.)
