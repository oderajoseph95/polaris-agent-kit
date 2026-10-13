# Changelog

Format: Keep a Changelog. Versioning policy: [docs/VERSIONING.md](docs/VERSIONING.md).

## [0.1.1] - 2026-10-13

### Added
- `check` rules from failures seen on screen (Polaris 2.0 RC, React 18.3), 21 rules in all (10 errors, 11 advice): `slot-not-declared` (error; a slot the parent element does not declare renders nothing, needs `@shopify/polaris-types` installed), and advice `container-query-no-container`, `gid-in-id`, `table-loading-inert`. Each has a test shown red first and a row in `references/mistakes.md`.
- `doctor` says plainly that Polaris 2.0 stable is not published while `polaris-2.0.js` returns 404.
- A real install-to-result demo image, `docs/demo/install-to-result.png`: the output of `npx` `init --agent claude` and `check` from npm on Windows, 2026-10-13.
- `action.yml`: a composite step that runs `check` on a folder at a pinned version, and a workflow snippet in the README.
- `.github/workflows/release.yml`: publishes to npm on a pushed `v*` tag through npm trusted publishing (GitHub OIDC, provenance, no token in the repository).
- `CONTRIBUTING.md`, a pull request template, two issue templates and `CODEOWNERS`.

### Changed
- CI is a matrix of ubuntu, macos and windows on Node 20 and 22 (first run pending), every action pinned to a full commit SHA at current releases.
- README, `docs/PROVEN-ON.md`, `docs/RELEASING.md`, `docs/GOOD-FIRST-ISSUES.md` and `docs/VERSIONING.md` no longer say the package is unpublished or that CI is not enabled; the tested and untested table states what was run and what was not (a Claude Code plugin install was run once in an isolated configuration).
- The generated rule files pin `npx -y polaris-agent-kit@0.1.1`.

### Removed
- `docs/demo/check-demo.svg`, replaced by the real capture.

## [0.1.0] - 2026-10-13

First release, published to npm on 2026-10-13.

### Added
- Rules (`source/core.md`) and 14 on-demand references.
- `check` with 17 rules (9 errors, 8 advice: run `check --list`). Errors are settled by Shopify's docs or the installed types package; heuristics are advice.
- `init` for Claude Code, Cursor, GitHub Copilot, Codex/AGENTS.md and Windsurf, generated from one source by `build`.
- `refresh` (fetch Shopify's current component pages to a local git-ignored cache) and `doctor`.
- Claude Code plugin manifest and marketplace file (`claude plugin validate` passes; not yet installed).
- Tests (`node --test`) including a drift test and a privacy test; `prepublishOnly` refuses to publish while the package is private or any placeholder is left.

### Security hardening before publication (2026-10-13)
- `init` refuses to write through a symbolic link or junction (a cloned repository could point `.windsurf/` or `AGENTS.md` at your home folder), copies `references/` file by file, and keeps CRLF line endings in `AGENTS.md`.
- `refresh` follows redirects by hand and only inside `https://shopify.dev/docs/`; caps a page at 1 MB; accepts text only; validates `--version`, `--pages` and discovered links (no path traversal); starts every cached page with an "untrusted reference text" note; the rules tell the agent never to obey instructions inside cached pages.
- `check` and `doctor` skip files over 2 MB and say so, skip over-long lines in the gid text heuristic (it was quadratic: a 60 KB minified line took over a minute), survive pathological nesting, and strip control characters from everything they print.
- Rule files installed by `init` pin `npx -y polaris-agent-kit@<release>`.
- `prepublishOnly` also scans the exact publish set for secrets, keys, e-mail addresses and home paths, and requires CI actions pinned to commit SHAs with a read-only token.

### README and maintainer docs (2026-10-13)
- README: problem statement, three-command pinned install, a synthetic before/after with the real `check` transcripts (`docs/demo/`, kept honest by `test/demo.test.mjs`), a tested/untested list, licence and safety notes, maintainer topics.
- `docs/RELEASING.md`, `docs/GOOD-FIRST-ISSUES.md` (a draft, not shipped in the npm package).
- The publish gate also refuses a README install pin that differs from `package.json`; the npm `files` list names only the docs that ship.
- `--help` no longer calls `check` a "compliance" linter.

### Checked against the real packages (2026-10-13)
- `check` run against the real `@shopify/polaris-types@2.0.0-rc.3` and `@shopify/app-bridge-types@0.7.2`: standard HTML/React props and DOM event handlers are no longer reported as unknown props, `s-app-window` is known to come from the App Bridge types, and `s-image loading` is not treated as a boolean.
- Claims re-read against shopify.dev, react.dev and npm; quotations corrected to Shopify's exact words; claims that could not be re-read are labelled UNPROVEN.
