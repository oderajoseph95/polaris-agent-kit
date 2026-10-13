# Good first issues

Five starting points, each with what done looks like and the file to touch. None needs private context; all work with synthetic fixtures only (see the safety note in the README). Open an issue with the title below before you start, so two people do not do the same one. Run `node --test` before and after.

## 1. Scan JSX in `.js` files

- **Title:** `check` skips JSX written in `.js` files
- **Today:** `check` reads `.tsx` and `.jsx` for JSX, so a project that keeps JSX in `.js` files is not scanned for `s-*` problems. Known gap.
- **Done looks like:** a `.js` file containing `<s-table-header list-slot="primary">` is reported as `kebab-prop`; a `.js` file with no JSX produces no finding and no crash; a test with a bad and a good fixture in `test/check.test.mjs` (show the bad one red first); the README matrix no longer lists it. Mind the existing guards: files over 2 MB and lines over 2000 characters are skipped on purpose.
- **Touch:** `src/commands/check.mjs` (the `walk(root, [".tsx", ".jsx"])` call in `check()`), `test/check.test.mjs`.

## 2. GitHub Actions annotations: `check --format github`

- **Title:** Add a `--format github` output to `check`
- **Today:** findings print as `file:line  [rule] message` plus a `fix:` line.
- **Done looks like:** `check --format github` prints one `::error file=...,line=...::[rule] message` line per error and `::warning ...` per advice item, so a pull request shows annotations; control characters and newlines in a message cannot break the annotation (the existing `printable()` helper in `src/lib/project.mjs` already strips them; add `%`, `\r` and `\n` escaping as GitHub documents it); exit codes unchanged; the default output unchanged; the option listed in `check --help` text in `bin/cli.mjs` and in the README's Commands table; tests.
- **Touch:** `src/commands/check.mjs` (`runCheck`), `bin/cli.mjs`, `README.md`, `test/check.test.mjs`.

## 3. Prove the link guard on Linux and macOS

- **Title:** Test `init`'s symbolic-link guard with real symlinks on POSIX
- **Today:** `init` refuses to write through a link. It was proven with Windows junctions only; creating file symlinks failed on the test machine. The CI matrix (`.github/workflows/test.yml`) runs the whole suite on Linux and macOS, but its first run is pending and the link tests there have not been written.
- **Done looks like:** on Linux or macOS, tests that make a real directory symlink (`.windsurf` pointing outside the project) and a real file symlink (`AGENTS.md`, `.gitignore`) and show that `init` throws and writes nothing outside the project; each test shows red first with the guard removed; on a machine that cannot create symlinks the test is skipped with a stated reason, not passed; the "Linux and macOS" row of the README matrix is updated with the result and the OS version.
- **Touch:** `test/security.test.mjs` (the existing link tests start near the `symlinkSync` helper), `README.md` matrix.

## 4. Run `check` on public Shopify template apps and report false positives

- **Title:** False-positive survey of `check` on public Shopify app templates
- **Today:** `check` ran on one template-shaped app and one large app. The false-positive rate on other people's code is unknown.
- **Done looks like:** pick three or more public Shopify app templates or example apps (name each with its commit); run `node bin/cli.mjs check` on each; for each finding decide real or false positive with a one-line reason; for each false positive, add the smallest invented fixture that reproduces it to `test/check.test.mjs` (red first), and open an issue or fix it. Report the totals in the pull request. Do not copy the other project's code into this repository: invent a small page that triggers the same pattern.
- **Touch:** `test/check.test.mjs`; the rule in `src/commands/check.mjs` if you fix one.

## 5. Drive `clickDelegate` on the Polaris 2.0 release candidate

- **Title:** Confirm or correct the `clickDelegate` rule on Polaris 2.0 RC
- **Today:** the advice rule `click-delegate-target` says only an `s-link` or `s-checkbox` target responded on Polaris 1.x; Shopify's page gives `s-link` as the example. Behaviour on the 2.0 release candidate is UNPROVEN.
- **Done looks like:** on a development store with a test embedded app on the `polaris-2.0-rc.js` script, a table whose row `clickDelegate` points at (a) an `s-link`, (b) an `s-button`, (c) an `s-checkbox`, with what happened for each; the result, the exact script URL and types version, and the date written into `docs/PROVEN-ON.md` and the matching row of `references/mistakes.md`; if the behaviour differs from the rule, the rule's wording (and severity) changed in `src/commands/check.mjs` and `source/core.md`, then `node bin/cli.mjs build`. Use an invented store and invented data; do not paste store URLs or screenshots of real data. Needs a Shopify development store, so this one is not a five-minute task.
- **Touch:** `docs/PROVEN-ON.md`, `references/mistakes.md`, `src/commands/check.mjs`, `source/core.md`.
