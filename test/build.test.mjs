import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { build, generate, PKG_ROOT } from "../src/commands/build.mjs";

test("DRIFT: every generated file on disk equals what source/ generates (run `build` if this fails)", () => {
  const r = build({ check: true });
  assert.deepEqual(r.drift, []);
});

test("every adapter carries the same rule text (one source), differing only in frontmatter and paths", () => {
  const files = generate();
  const ruleLines = (t) => t.split("\n").filter((l) => /^\d+\. \*\*/.test(l)).map((l) => l.replaceAll(".polaris-agent-kit/references/", "references/").replace(/npx -y polaris-agent-kit@[^ ]+/g, "CLI"));
  const base = ruleLines(files["SKILL.md"]);
  assert.equal(base.length, 14, "14 numbered rules");
  for (const [name, text] of Object.entries(files)) assert.deepEqual(ruleLines(text), base, name);
});

test("windsurf rule stays under its 12,000 character limit; cursor/copilot/windsurf frontmatter is present", () => {
  const f = generate();
  assert.ok(f["adapters/windsurf/polaris-agent-kit.md"].length < 12000);
  assert.match(f["adapters/cursor/polaris-agent-kit.mdc"], /^---\n/);
});

test("every reference named in the core rules exists on disk", () => {
  const core = readFileSync(join(PKG_ROOT, "source/core.md"), "utf8");
  const names = [...core.matchAll(/\{\{REF\}\}\/([\w-]+\.md)/g)].map((m) => m[1]);
  const have = new Set(readdirSync(join(PKG_ROOT, "references")));
  assert.ok(names.length >= 14);
  for (const n of names) assert.ok(have.has(n), `${n} is referenced by source/core.md but missing`);
});

test("PRIVACY: no ticket ids, local paths, e-mail addresses or placeholder hosts in the shipped text", () => {
  // Generic patterns only. Names of private people, stores or products are checked by the maintainer before each release, not listed here.
  const banned = [
    [/\b(?!SHA|UTF|ISO|RFC|CVE)[A-Z]{2,5}-\d{1,5}\b/, "a ticket-style id"],
    [/[A-Za-z]:[\\/]Users[\\/]/i, "a Windows home path"],
    [/\/(Users|home)\/[A-Za-z0-9._-]+\//, "a Unix home path"],
    [/[A-Za-z0-9._+-]+@(?!users\.noreply\.github\.com)[A-Za-z0-9-]+\.[A-Za-z]{2,}/, "an e-mail address"],
    [/\.invalid\b/, "a placeholder host"],
    [/\.pw-profile|\.dev\.vars|\.env\b/i, "a private config path"],
  ];
  const dirs = ["references", "source", "adapters", "docs", "src", "bin", "test", "screenshots", ".claude-plugin", ".github"];
  const files = [];
  const visit = (d) => { for (const e of readdirSync(d, { withFileTypes: true })) { const p = join(d, e.name); if (e.isDirectory()) visit(p); else files.push(p); } };
  for (const d of dirs) visit(join(PKG_ROOT, d));
  for (const f of ["README.md", "SKILL.md", "CHANGELOG.md", "package.json", "LICENSE"]) files.push(join(PKG_ROOT, f));
  const self = join(PKG_ROOT, "test", "build.test.mjs");
  for (const f of files) {
    if (f === self) continue;
    const text = readFileSync(f, "utf8");
    for (const [re, what] of banned) assert.ok(!re.test(text), `${f} contains ${what} (${re})`);
  }
});
