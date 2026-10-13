## What this changes

<!-- One or two sentences. Link the issue if there is one. -->

## Checklist

- [ ] The change has a test, and I ran it red before the fix (paste the red output below).
- [ ] `node --test` passes.
- [ ] `node bin/cli.mjs build --check` passes (I ran `node bin/cli.mjs build` if I changed `source/`).
- [ ] `node scripts/publish-gate.mjs` prints `publish-gate: ok`.
- [ ] A new `check` rule has a bad fixture, a good fixture, a `RULES` line, and a row in `references/mistakes.md` and `docs/PROVEN-ON.md` naming the stack it was observed on (or UNPROVEN).
- [ ] Synthetic material only: no keys, tokens, store names, customer data, or private-project details anywhere in this pull request.
- [ ] No copied Shopify documentation, no unpinned version, no install script, no new dependency.

## Proof

<!-- Red output first, then green. -->

## What I did not test

<!-- Be plain: another OS, another React version, a real store. -->
