# Demo: before and after

Everything in this folder is synthetic. `before-app/` is a small invented page written the way an unassisted coding agent often writes Polaris; `after-app/` is the same page after the kit's rules. They are not a real app and carry no real data.

`before.txt` and `after.txt` are the unedited output of:

```bash
node bin/cli.mjs check docs/demo/before-app
node bin/cli.mjs check docs/demo/after-app
```

each preceded by the command line and followed by `[exit code N]`. `test/demo.test.mjs` re-runs both and fails if the files, or the copies in the top-level README, no longer match. When a rule changes, re-run the two commands, rewrite the two `.txt` files, and paste the same text into the README.

What a clean run proves: none of the kit's `check` patterns were found. It does not prove the page type-checks or renders correctly. The demo folders do not install `@shopify/polaris-types`, so `unknown-prop` and `unknown-element` are not run here (the transcripts say so).
