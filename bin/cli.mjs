#!/usr/bin/env node
// Entry point: `npx <package> <command>`. Zero runtime dependencies; Node 20+.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

const HELP = `${pkg.name} ${pkg.version}  (UNOFFICIAL community kit; not affiliated with Shopify)

Usage: ${pkg.name} <command> [options]

  init     --agent claude|cursor|copilot|codex|windsurf|all   copy the rules into this codebase  [--dir D] [--force] [--dry-run]
  check    [dir] [--json] [--strict] [--ignore rule,rule] [--list]   static linter; exit 1 on an error finding
  refresh  [--version latest|v2.0-rc|...] [--all] [--pages a,b]    cache Shopify's current component pages locally (git-ignored)
  doctor   [dir] [--offline] [--fail-on-diff]                       pinned Polaris versus what is visible now
  build    [--check]                                                regenerate the agent files from source/ (maintainers)
`;

const [cmd, ...rest] = process.argv.slice(2);
let code = 0;
try {
  if (!cmd || cmd === "--help" || cmd === "-h" || cmd === "help") { console.log(HELP); }
  else if (cmd === "--version" || cmd === "-v") { console.log(pkg.version); }
  else if (cmd === "init") code = await (await import("../src/commands/init.mjs")).runInit(rest);
  else if (cmd === "check") code = (await import("../src/commands/check.mjs")).runCheck(rest);
  else if (cmd === "refresh") code = await (await import("../src/commands/refresh.mjs")).runRefresh(rest);
  else if (cmd === "doctor") code = await (await import("../src/commands/doctor.mjs")).runDoctor(rest);
  else if (cmd === "build") code = (await import("../src/commands/build.mjs")).runBuild(rest);
  else { console.error(`unknown command "${cmd}"\n\n${HELP}`); code = 2; }
} catch (e) {
  console.error(`${pkg.name}: ${e.message}`);
  code = 2;
}
process.exitCode = code;
