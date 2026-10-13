# Contributing

Yes, anyone can open a pull request or an issue. You do not need to ask first for a small fix (a typo, a wrong URL, a false positive with a fixture). For a new rule or a new reference file, open an issue first so two people do not build the same thing. Only the owner merges, and the `test` workflow must be green.

This is an unofficial community kit, not affiliated with Shopify. Shopify's own documentation is the authority: where this kit and Shopify disagree, Shopify is right and the kit has a bug.

## Safety first: synthetic material only

In an issue, a fixture or a pull request, never include API keys, tokens, the contents of environment or key files, store names or admin URLs, customer or order data, screenshots of a real store, or code and internals from a private project. Reproduce with a small invented page (see [docs/demo/](docs/demo/)). A secret posted in an issue is public and stays in history: revoke it first, then tell us.

## How to add a `check` rule

Every rule traces to something seen on screen, not to a guess.

1. **Write the failing test first.** In `test/check.test.mjs`, add a test with a bad fixture (the rule must report it, with the right `file:line`) and a good fixture (the rule must stay silent). Run `node --test test/check.test.mjs` and read it FAIL before you write any rule code. Paste the red output in your pull request.
2. **Add the rule.** In `src/commands/check.mjs`: one line in `RULES` (`error` only when Shopify's docs or the installed types package settle it; a heuristic is `advice`), then the check itself, with a one-line `fix:` message that says what to write instead. The scanner helpers are in `src/lib/scan.mjs`. Add the rule's name to the `covered` list at the top of `test/check.test.mjs`.
3. **Write the reference note.** Add a row to `references/mistakes.md` (mistake, symptom, fix, which rule sees it) and, where it belongs, a line in the matching reference file. Say what you observed and on which stack, with exact versions ("observed on Polaris 2.0 RC, React 18.3"). A claim with no observation is labelled UNPROVEN. Add the row to `docs/PROVEN-ON.md` too.
4. **Build.** If you touched `source/core.md`, run `node bin/cli.mjs build` and commit the generated files. Never edit `SKILL.md` or anything in `adapters/` by hand.
5. **Publish gate and tests.** Run all three and paste the output:

   ```bash
   node --test
   node bin/cli.mjs build --check
   node scripts/publish-gate.mjs
   ```

   `publish-gate: ok` must be the last line. If you changed `check` output on the demo pages, re-run the commands in [docs/demo/README.md](docs/demo/README.md) and update the transcripts (a test fails if they drift).

## What will not be accepted

- **Copied Shopify documentation.** Link to the page; never paste it. Short quotations of a sentence that a rule depends on are fine, with the URL and the date you read it.
- **Unpinned versions.** No `latest`, no floating ranges, no `@latest` in an install line or a workflow. Every `npx -y polaris-agent-kit@<version>` names an exact release, and every GitHub Action is pinned to a full commit SHA.
- **Install scripts or dependencies.** No `preinstall`, `install`, `postinstall` or `prepare` script, and no runtime dependency. The kit promises none, and the publish gate refuses them.
- **Telemetry, accounts, or any network call** beyond what the README's "What it does on your machine" section lists.
- **Anything that names a private project:** a company, a store, a ticket number, a person, a file path from someone's machine. Describe the failure generically.
- **A claim about Polaris behaviour you did not observe or cite.**
- **Marketing claims**, including anything that implies Shopify approves the kit or that following it makes an app "Built for Shopify".

## Pull requests

Use the template. Keep one change per pull request. Commit messages say what changed and why, in plain words.
