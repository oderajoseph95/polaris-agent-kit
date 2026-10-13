// `build`: the ONE place the agent-specific files are produced. They are all derived from source/core.md and
// source/meta.json, so the Claude skill, the AGENTS.md block, Cursor, Copilot and Windsurf rules cannot drift.
// `build --check` regenerates in memory and fails if any committed file differs (the drift test runs it).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const BEGIN = "<!-- BEGIN polaris-agent-kit (generated; re-run init to update; do not edit between the markers) -->";
export const END = "<!-- END polaris-agent-kit -->";
export const GENERATED = "GENERATED from source/core.md by `build`. Do not edit by hand.";
export const PLUGIN_CLI = 'node "${CLAUDE_PLUGIN_ROOT}/bin/cli.mjs"';
const WINDSURF_LIMIT = 12000; // characters per rule file (https://docs.devin.ai/desktop/cascade/memories)

function load() {
  const meta = JSON.parse(readFileSync(join(PKG_ROOT, "source", "meta.json"), "utf8"));
  const pkg = JSON.parse(readFileSync(join(PKG_ROOT, "package.json"), "utf8"));
  const core = readFileSync(join(PKG_ROOT, "source", "core.md"), "utf8").replace(/\r\n/g, "\n");
  return { meta, pkg, core };
}

function fill(core, meta, vars) {
  return core
    .replaceAll("{{REF}}", vars.ref)
    .replaceAll("{{CLI}}", vars.cli)
    .replaceAll("{{CACHE}}", meta.cacheDir)
    .replaceAll("{{PROVEN}}", meta.proven);
}

/** Map of repo-relative path -> content for every generated file. */
export function generate() {
  const { meta, pkg, core } = load();
  // Pinned to this release: a rule installed into someone's project must not start running a different (or hijacked) later version.
  const npx = `npx -y ${pkg.name}@${pkg.version}`;
  const skillBody = fill(core, meta, { ref: "references", cli: PLUGIN_CLI });
  const adapterBody = fill(core, meta, { ref: `${meta.kitDir}/references`, cli: npx });
  const globs = meta.globs.join(",");
  const oneLine = meta.description;
  const out = {};
  out["SKILL.md"] = `---\nname: ${meta.skillName}\ndescription: ${JSON.stringify(oneLine)}\n---\n<!-- ${GENERATED} -->\n\n${skillBody}`;
  out["adapters/AGENTS.block.md"] = `${BEGIN}\n${adapterBody}${END}\n`;
  out["adapters/cursor/polaris-agent-kit.mdc"] = `---\ndescription: ${JSON.stringify(oneLine)}\nglobs: ${globs}\nalwaysApply: false\n---\n<!-- ${GENERATED} -->\n\n${adapterBody}`;
  out["adapters/copilot/polaris-agent-kit.instructions.md"] = `---\napplyTo: ${JSON.stringify(globs)}\n---\n<!-- ${GENERATED} -->\n\n${adapterBody}`;
  out["adapters/windsurf/polaris-agent-kit.md"] = `---\ntrigger: glob\nglobs: ${globs}\n---\n<!-- ${GENERATED} -->\n\n${adapterBody}`;
  out["adapters/generic/RULES.md"] = `<!-- ${GENERATED} -->\n\n${adapterBody}`;
  for (const [file, text] of Object.entries(out)) {
    if (file.includes("windsurf") && text.length > WINDSURF_LIMIT) {
      throw new Error(`${file} is ${text.length} characters; Windsurf allows ${WINDSURF_LIMIT} per rule file. Shorten source/core.md.`);
    }
  }
  return out;
}

export function build({ check = false, root = PKG_ROOT } = {}) {
  const files = generate();
  const drift = [];
  for (const [file, text] of Object.entries(files)) {
    const path = join(root, file);
    const current = existsSync(path) ? readFileSync(path, "utf8").replace(/\r\n/g, "\n") : null;
    if (current !== text) {
      drift.push(file);
      if (!check) {
        mkdirSync(dirname(path), { recursive: true });
        writeFileSync(path, text);
      }
    }
  }
  return { files: Object.keys(files), drift };
}

export function runBuild(argv) {
  const check = argv.includes("--check");
  const r = build({ check });
  if (check) {
    if (r.drift.length) { console.error(`build --check: ${r.drift.length} generated file(s) differ from source/: ${r.drift.join(", ")}. Run \`build\` and commit.`); return 1; }
    console.log(`build --check: ${r.files.length} generated files match source/core.md.`);
    return 0;
  }
  console.log(r.drift.length ? `build: wrote ${r.drift.join(", ")}` : "build: nothing changed.");
  return 0;
}
