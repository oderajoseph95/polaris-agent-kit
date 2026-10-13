# Releasing

Maintainers only. These are the exact steps for the first release, `v0.1.0`. Steps 0.1 to 0.3 are done: the repository is github.com/oderajoseph95/polaris-agent-kit, the copyright holder and author are named, and the history carries the owner identity. The package is still marked private until the first npm publish. Whoever runs a step first fixes this file if it is wrong.

Only the owner publishes: from their own machine, with two-factor authentication on the npm account. Never put an automation token in the repository.

## 0. Before the first push, once

1. Create the repository (owner decision). Set your own git identity, then `git commit --amend --reset-author` on the single commit, so the history names you and not the neutral placeholder. Run `git log --format='%an <%ae> %ai'` and read it.
2. Fill `LICENSE`, `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` with the copyright holder / author name you want. Done: they name Odera Joseph Echendu.
3. Add `"repository"` to `package.json`, replace the owner-and-repository placeholder in the README's plugin install lines (the publish gate lists every file that still has one), and remove `"private": true`.
4. Maintainer notes: `docs/RELEASING.md` stays; nothing that names another project belongs in this repository.
5. Search the whole tree one last time, by hand, for names that must not appear: your own private projects, stores, tickets, people and e-mail addresses. The test suite checks generic patterns only. Expected remaining hit: the design-system link in `docs/PROFILE-SNIPPET.md`, if you keep it.
6. Reserve the npm name soon after: an unclaimed name can be taken by someone else before the first publish.

## 1. Publish gate green

From the kit folder:

```bash
node --test
node bin/cli.mjs build --check
node scripts/publish-gate.mjs
claude plugin validate .
npm pack --dry-run
```

- `node --test` must pass in full.
- `build --check` must say every generated file matches `source/`.
- `publish-gate.mjs` must print `publish-gate: ok`. It refuses while the package is private, has no `repository`, any placeholder remains, `README.md` pins a different version than `package.json`, a secret / e-mail / home path is in the publish set, or a workflow action is not pinned to a commit SHA.
- `claude plugin validate .` must print "Validation passed" (it is run by hand; CI does not install it).
- Read the `npm pack --dry-run` file list. It should be the `files` allowlist and nothing else: no `scripts/`, `test/`, `.github/`, environment files or key files.

## 2. Version bump

Release version `0.1.0` (the draft is `0.1.0-draft.1`). Change it in all of these, then rebuild:

1. `package.json` `"version"`.
2. `.claude-plugin/plugin.json` `"version"`.
3. `README.md`: every `polaris-agent-kit@0.1.0` pin must equal the new version (the gate checks this).
4. `docs/PROVEN-ON.md`: the "Last updated" date.
5. Run `node bin/cli.mjs build`. The generated rule files pin `npx -y polaris-agent-kit@<version>`, so they change. Commit the result.

## 3. CHANGELOG

In `CHANGELOG.md`, rename `## [0.1.0-draft.1] - 2026-10-13` to `## [0.1.0] - <release date>`, remove the line "Draft. Not published.", and add anything that changed since. Keep the Keep a Changelog headings. Commit: `Release 0.1.0`.

## 4. Tag

```bash
git tag -a v0.1.0 -m "polaris-agent-kit 0.1.0"
git push origin <your default branch>
git push origin v0.1.0
```

The tag is annotated and points at the commit you published from. Do not move or reuse a tag.

## 5. GitHub release notes

```bash
gh release create v0.1.0 --title "polaris-agent-kit 0.1.0" --notes-file release-notes.md
```

`release-notes.md` (write it in a scratch folder, not in the repository):

- First line: "UNOFFICIAL community project, not affiliated with Shopify."
- What is in this release: copy the `0.1.0` section of `CHANGELOG.md`.
- A link to "Tested and untested" in the README, and one sentence saying a real Claude Code plugin install and the Cursor, Copilot and Windsurf formats were not run.
- The install lines from the README, with the pinned version.

Then set the repository description and topics (the text is in the README, section Maintainers):

```bash
gh repo edit --description "<the description line from the README>"
gh repo edit --add-topic polaris --add-topic polaris-web-components --add-topic polaris-2 --add-topic shopify --add-topic shopify-app --add-topic shopify-embedded-app --add-topic ai-coding-agent --add-topic claude-code --add-topic claude-code-plugin --add-topic cursor --add-topic github-copilot --add-topic agent-skills --add-topic agents-md --add-topic linter
```

## 6. `npm publish`

```bash
npm whoami
npm publish
```

`prepublishOnly` runs the tests, `build --check` and the publish gate again and aborts on any failure. The package is unscoped and public; no `--access` flag is needed. If you later publish from CI, use npm provenance and a granular token, never an automation token in the repository.

## 7. After publishing

1. `npx -y polaris-agent-kit@0.1.0 --version` in an empty folder prints `0.1.0`.
2. Run the three install commands from the top of the README in a throwaway project and read what they write.
3. In Claude Code, run the two plugin lines from the top of the README (`/plugin marketplace add` with your owner and repository, then `/plugin install polaris-agent-kit@polaris-agent-kit-marketplace`). This has never been run. Record the result in `docs/PROVEN-ON.md` and the README matrix either way.
4. Enable `.github/workflows/test.yml` by pushing it (it is already in the repository) and check that Node 20 and 22 pass; update the "Node 20 and 22" row in the README matrix.
5. Pin the repository on your profile.
