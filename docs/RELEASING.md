# Releasing

Maintainers only. Releases are made by pushing a version tag: `.github/workflows/release.yml` runs the tests and the publish gate, checks that the tag equals the `package.json` version, and publishes to npm with provenance through npm trusted publishing (GitHub OIDC). **No npm token exists in this repository and none is needed.**

Releases so far: `0.1.0` was published to npm by hand on 2026-10-13 (the first release, before trusted publishing was set up). Whoever runs a step first fixes this file if it is wrong.

## One-time setup, owner only (npmjs.com)

Trusted publishing is configured on npm's website, by the package owner, and cannot be done from this repository. Source: https://docs.npmjs.com/trusted-publishers (read 2026-10-13). The three lines for the owner:

1. On npmjs.com open the package `polaris-agent-kit`, then Settings, then "Trusted Publisher", and choose GitHub Actions.
2. Fill in: organization or user `oderajoseph95`, repository `polaris-agent-kit`, workflow filename `release.yml` (just the file name, with `.yml`; leave "Environment" empty). All fields are case-sensitive and must be exact.
3. Save. npm does not check the values when you save, so a typo shows up only when the first release runs; the workflow then fails at the publish step and publishes nothing.

What the workflow relies on, from that page: npm CLI 11.5.1 or later and Node 22.14 or later (the workflow uses Node 24), `permissions: id-token: write` on the publishing job, a GitHub-hosted runner (self-hosted runners are not supported), and `repository.url` in `package.json` matching the GitHub repository (it does). Provenance is automatic for a public repository publishing a public package; the workflow also passes `--provenance`, which is harmless. Re-read the page before the first release: npm changes these requirements.

## Branch protection (a recommendation; the owner sets it, nothing here does)

On `main`, in the repository's Settings, Branches (or Rulesets):

- Require a pull request before merging, with at least the code owner's review (`CODEOWNERS` names `@oderajoseph95`).
- Require status checks to pass before merging, and select all six `test` jobs (`ubuntu-latest`, `macos-latest`, `windows-latest`, each on Node 20 and 22). They only appear in the list after the workflow has run once.
- Block force pushes and deletion of `main`.
- Optional: restrict who can push tags matching `v*`, because a pushed tag publishes.

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
- `claude plugin validate .` must print "Validation passed" (run by hand; CI does not install it).
- Read the `npm pack --dry-run` file list. It should be the `files` allowlist and nothing else: no `scripts/`, `test/`, `.github/`, `action.yml`, `CONTRIBUTING.md`, environment files or key files.

## 2. Version bump

Change the version in all of these, then rebuild:

1. `package.json` `"version"`.
2. `.claude-plugin/plugin.json` `"version"`.
3. `README.md`: every `polaris-agent-kit@<version>` pin must equal the new version (the gate checks this), and the workflow snippet's `uses: ...@<tag>` line.
4. `action.yml`: the `version` input's `default` (a test checks it).
5. `docs/PROVEN-ON.md`: the "Last updated" date, and any row the release re-proved.
6. Run `node bin/cli.mjs build`. The generated rule files pin `npx -y polaris-agent-kit@<version>`, so they change. Commit the result.

## 3. CHANGELOG

In `CHANGELOG.md` add `## [<version>] - <release date>` above the previous release, with Keep a Changelog headings (Added, Changed, Fixed, Removed). Commit: `Release <version>`.

## 4. Tag and push: this publishes

```bash
git tag -a v<version> -m "polaris-agent-kit <version>"
git push origin main
git push origin v<version>
```

The tag push starts `release.yml`. The tag is annotated and points at the commit being published. Do not move or reuse a tag. If the workflow fails before the publish step nothing was published; fix the cause and push a new patch version rather than moving the tag.

## 5. GitHub release notes

```bash
gh release create v<version> --title "polaris-agent-kit <version>" --notes-file release-notes.md
```

`release-notes.md` (write it in a scratch folder, not in the repository):

- First line: "UNOFFICIAL community project, not affiliated with Shopify."
- What is in this release: copy the section of `CHANGELOG.md`.
- A link to "Tested and untested" in the README, and what was and was not run.
- The install lines from the README, with the pinned version.

Repository description and topics (the text is in the README, section Maintainers): `gh repo edit --description "<the description line from the README>"` and `gh repo edit --add-topic <topic>` for each listed topic.

## 6. After publishing

1. `npx -y polaris-agent-kit@<version> --version` in an empty folder prints the version.
2. Run the three install commands from the top of the README in a throwaway project and read what they write.
3. Check the `test` workflow on `main`: six jobs green. Update the "CI" rows of `docs/PROVEN-ON.md` and the README's tested table from "pending first CI run" to what happened, with the run's date.
4. Check the package page on npmjs.com shows the provenance badge.
5. Pin the repository on your profile.

## Publishing by hand (fallback only)

Only the owner, from their own machine, with two-factor authentication: `npm whoami`, then `npm publish`. `prepublishOnly` runs the tests, `build --check` and the publish gate and aborts on any failure. Never put a token in the repository.
