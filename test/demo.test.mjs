import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runCheck } from "../src/commands/check.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => readFileSync(join(ROOT, f), "utf8").replace(/\r\n/g, "\n").trimEnd();

/** The transcript format used in docs/demo/*.txt: command line, output, exit code. */
function transcript(dir) {
  const lines = [`$ node bin/cli.mjs check ${dir}`];
  const io = { log: (s) => lines.push(s), err: (s) => lines.push(s) };
  const code = runCheck([join(ROOT, dir)], io);
  lines.push(`[exit code ${code}]`);
  return lines.join("\n").trimEnd();
}

for (const [name, dir] of [["before", "docs/demo/before-app"], ["after", "docs/demo/after-app"]]) {
  test(`demo: docs/demo/${name}.txt is the real output of check on ${dir}, and the README shows the same text`, () => {
    const real = transcript(dir);
    assert.equal(read(`docs/demo/${name}.txt`), real, `docs/demo/${name}.txt drifted from the real output; re-run the command in docs/demo/README.md`);
    assert.ok(read("README.md").includes(real), `README.md no longer contains the ${name} transcript verbatim`);
  });
}

test("demo: the before page fails (exit 1) and names the headline mistakes; the after page is clean (exit 0)", () => {
  const before = read("docs/demo/before.txt");
  for (const rule of ["kebab-prop", "boolean-string-false", "boolean-false-expr", "types-script-mismatch", "tsconfig-types", "polaris-react-import", "script-unpinned"]) assert.match(before, new RegExp(`\\[${rule}\\]`), rule);
  assert.match(before, /\[exit code 1\]$/);
  assert.match(read("docs/demo/after.txt"), /no findings\.\n\[exit code 0\]$/);
});

test("README: every pinned install command names the same release (the publish gate then requires it to equal package.json)", () => {
  const pins = new Set([...read("README.md").matchAll(/polaris-agent-kit@(\d[\w.+-]*)/g)].map((m) => m[1]));
  assert.equal(pins.size, 1, `README pins ${[...pins].join(", ")}`);
});
