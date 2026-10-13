import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { init, AGENTS } from "../src/commands/init.mjs";
import { BEGIN, END, PLUGIN_CLI, PKG_ROOT } from "../src/commands/build.mjs";
import { project } from "./helpers.mjs";

const quiet = () => {};
const read = (dir, p) => readFileSync(join(dir, p), "utf8");

test("init --agent claude: skill + references, the plugin variable becomes npx, .gitignore gets the cache dir", () => {
  const p = project({ "package.json": "{}" });
  try {
    init({ dir: p.dir, agents: ["claude"], log: quiet });
    const skill = read(p.dir, ".claude/skills/polaris-agent-kit/SKILL.md");
    assert.match(skill, /^---\nname: polaris-agent-kit\n/);
    assert.ok(!skill.includes("CLAUDE_PLUGIN_ROOT"), "the plugin-only variable must not leak into a project copy");
    assert.match(skill, /npx -y polaris-agent-kit@[\w.-]+ check/);
    assert.ok(existsSync(join(p.dir, ".claude/skills/polaris-agent-kit/references/mistakes.md")));
    assert.match(read(p.dir, ".gitignore"), /^\.polaris-agent-kit-cache\/$/m);
  } finally { p.done(); }
});

test("init each other agent writes the right file at the right path, from the generated source", () => {
  const p = project({});
  try {
    init({ dir: p.dir, agents: ["cursor", "copilot", "windsurf", "codex"], log: quiet });
    assert.match(read(p.dir, ".cursor/rules/polaris-agent-kit.mdc"), /^---\ndescription: .*\nglobs: \*\*\/\*\.tsx,\*\*\/\*\.jsx\nalwaysApply: false\n---/s);
    assert.match(read(p.dir, ".github/instructions/polaris-agent-kit.instructions.md"), /^---\napplyTo: "\*\*\/\*\.tsx,\*\*\/\*\.jsx"\n---/);
    assert.match(read(p.dir, ".windsurf/rules/polaris-agent-kit.md"), /^---\ntrigger: glob\n/);
    assert.ok(read(p.dir, "AGENTS.md").includes(BEGIN));
    assert.ok(existsSync(join(p.dir, ".polaris-agent-kit/references/tables.md")), "non-skill agents get the references beside the rules");
    assert.ok(read(p.dir, ".cursor/rules/polaris-agent-kit.mdc").includes(".polaris-agent-kit/references/tables.md"), "the rule points at where the files went");
  } finally { p.done(); }
});

test("init is idempotent, and the AGENTS.md block is replaced between markers while the user's text survives", () => {
  const p = project({ "AGENTS.md": "# Mine\n\nKeep this.\n" });
  try {
    init({ dir: p.dir, agents: ["codex"], log: quiet });
    const once = read(p.dir, "AGENTS.md");
    init({ dir: p.dir, agents: ["codex"], log: quiet });
    assert.equal(read(p.dir, "AGENTS.md"), once, "second run changes nothing");
    assert.ok(once.startsWith("# Mine\n\nKeep this."));
    // a stale block is updated in place
    writeFileSync(join(p.dir, "AGENTS.md"), once.replace(/Polaris/, "STALE"));
    init({ dir: p.dir, agents: ["codex"], log: quiet });
    assert.equal((read(p.dir, "AGENTS.md").match(new RegExp(BEGIN.replace(/[()]/g, "\\$&"), "g")) ?? []).length, 1, "exactly one block");
    assert.ok(!read(p.dir, "AGENTS.md").includes("STALE"));
    assert.ok(read(p.dir, "AGENTS.md").includes(END));
    assert.equal((read(p.dir, ".gitignore").match(/\.polaris-agent-kit-cache\//g) ?? []).length, 1, ".gitignore line added once");
  } finally { p.done(); }
});

test("init refuses to overwrite a file it did not generate (and --force does); --dry-run writes nothing", () => {
  const p = project({ ".cursor/rules/polaris-agent-kit.mdc": "my own rule\n" });
  try {
    const logs = [];
    init({ dir: p.dir, agents: ["cursor"], log: (s) => logs.push(s) });
    assert.equal(read(p.dir, ".cursor/rules/polaris-agent-kit.mdc"), "my own rule\n");
    assert.ok(logs.some((l) => /SKIPPED/.test(l)));
    init({ dir: p.dir, agents: ["cursor"], force: true, log: quiet });
    assert.notEqual(read(p.dir, ".cursor/rules/polaris-agent-kit.mdc"), "my own rule\n");
  } finally { p.done(); }
  const q = project({});
  try {
    init({ dir: q.dir, agents: ["all"], dry: true, log: quiet });
    assert.ok(!existsSync(join(q.dir, "AGENTS.md")) && !existsSync(join(q.dir, ".gitignore")) && !existsSync(join(q.dir, ".polaris-agent-kit")));
  } finally { q.done(); }
});

test("init --agent all covers every agent", () => {
  const p = project({});
  try {
    const r = init({ dir: p.dir, agents: ["all"], log: quiet });
    assert.deepEqual(r.agents, AGENTS);
  } finally { p.done(); }
});

test("the CLI: unknown agent exits 2, no --agent without a terminal exits 2, a good run exits 0", () => {
  const p = project({});
  try {
    const run = (...a) => spawnSync(process.execPath, [join(PKG_ROOT, "bin/cli.mjs"), "init", "--dir", p.dir, ...a], { encoding: "utf8", input: "" });
    assert.equal(run("--agent", "vim").status, 2);
    assert.equal(run().status, 2);
    const ok = run("--agent", "codex");
    assert.equal(ok.status, 0, ok.stderr);
    assert.match(ok.stdout, /Next:/);
  } finally { p.done(); }
});

test("PLUGIN_CLI is the exact string SKILL.md contains (so init can rewrite it)", () => {
  assert.ok(readFileSync(join(PKG_ROOT, "SKILL.md"), "utf8").includes(PLUGIN_CLI));
});
