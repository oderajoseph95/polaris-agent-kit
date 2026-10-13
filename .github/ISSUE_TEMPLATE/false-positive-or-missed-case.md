---
name: A false positive or a missed case in `check`
about: `check` flagged something that is fine, or stayed silent on something that is broken
title: "check: "
labels: ["check"]
---

**Which one?** (delete one) `check` reported a problem that is not a problem / `check` said nothing about a real problem

**Rule name** (from the `[rule]` in the output, or `none`):

**Version:** (`npx -y polaris-agent-kit@<version> --version`)

**A small invented page that shows it.** Not your real code: shrink it to the smallest `.tsx` that reproduces the output, and rename everything.

```tsx

```

**What `check` printed** (paste the lines, `file:line  [rule] message`):

```text

```

**What you expected:**

**Your stack** (React version, `@shopify/polaris-types` version, the Polaris script URL you load):

**Do not paste** keys, tokens, environment files, store names or URLs, customer data, or code from a private project. If you did by mistake, revoke the secret first.
