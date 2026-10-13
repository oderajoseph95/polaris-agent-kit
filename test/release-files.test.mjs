import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => readFileSync(join(ROOT, f), "utf8").replace(/\r\n/g, "\n");
const pkg = JSON.parse(read("package.json"));

test("every place docs/RELEASING.md step 2 lists carries the package version", () => {
  assert.equal(JSON.parse(read(".claude-plugin/plugin.json")).version, pkg.version);
  assert.ok(read("action.yml").includes(`default: "${pkg.version}"`), "action.yml default version");
  assert.ok(new RegExp(`^## \\[${pkg.version.replaceAll(".", "\\.")}\\] - \\d{4}-\\d{2}-\\d{2}`, "m").test(read("CHANGELOG.md")), "CHANGELOG entry");
});

test("the test workflow covers Linux, macOS and Windows on Node 20 and 22", () => {
  const wf = read(".github/workflows/test.yml");
  for (const os of ["ubuntu-latest", "macos-latest", "windows-latest"]) assert.ok(wf.includes(os), os);
  assert.match(wf, /node: \[20, 22\]/);
});

test("the release workflow publishes only from a version tag, by OIDC, with no token secret and the tag checked against package.json", () => {
  const wf = read(".github/workflows/release.yml");
  assert.match(wf, /tags: \["v\*"\]/);
  assert.match(wf, /id-token: write/);
  assert.match(wf, /npm publish --provenance/);
  assert.doesNotMatch(wf, /secrets\.|NODE_AUTH_TOKEN|NPM_TOKEN/, "no token of any kind");
  assert.match(wf, /does not equal/, "tag versus package.json check");
});

test("action.yml refuses an unpinned version and has no `latest`", () => {
  const a = read("action.yml");
  assert.doesNotMatch(a, /latest/i);
  assert.match(a, /exact version/);
});

test("the community files exist and name the owner", () => {
  for (const f of ["CONTRIBUTING.md", ".github/PULL_REQUEST_TEMPLATE.md", ".github/ISSUE_TEMPLATE/false-positive-or-missed-case.md", ".github/ISSUE_TEMPLATE/rule-proposal.md"]) assert.ok(read(f).length > 100, f);
  assert.match(read("CODEOWNERS"), /@oderajoseph95/);
});
