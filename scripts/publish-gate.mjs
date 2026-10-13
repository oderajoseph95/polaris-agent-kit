// Run by `prepublishOnly`. Refuses to publish while the package is still marked private or any placeholder is left,
// and scans exactly the files `npm publish` would upload (the package.json `files` list plus README, LICENSE and package.json)
// for secrets, private keys, e-mail addresses and files that must never ship.
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const problems = [];
if (pkg.private) problems.push('package.json still has "private": true (remove it only when the owner decides to publish)');
if (!pkg.repository) problems.push("package.json has no repository field yet");
if (pkg.scripts && Object.keys(pkg.scripts).some((k) => /^(pre|post)?install$|^prepare$/.test(k))) problems.push("package.json has an install-time script (preinstall/install/postinstall/prepare); this kit promises none");
if (pkg.dependencies && Object.keys(pkg.dependencies).length) problems.push("package.json has runtime dependencies; this kit promises none");

const walkAll = (d, out = []) => {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === ".git") continue;
    const p = join(d, e.name);
    if (e.isDirectory()) walkAll(p, out);
    else out.push(p);
  }
  return out;
};

// 1. Placeholders anywhere in the working tree.
for (const p of walkAll(root)) {
  if (p.endsWith("publish-gate.mjs") || p.endsWith("build.test.mjs") || p.endsWith("security.test.mjs")) continue;
  if (/PLACEHOLDER|<owner>|<repo>|\.invalid\b/.test(readFileSync(p, "utf8"))) problems.push(`placeholder text in ${relative(root, p)}`);
}

// 1b. The install commands in the README are pinned (`polaris-agent-kit@<version>`); a pin that is not this release is a stale instruction.
for (const pin of new Set([...readFileSync(join(root, "README.md"), "utf8").matchAll(/polaris-agent-kit@(\d[\w.+-]*)/g)].map((m) => m[1]))) {
  if (pin !== pkg.version) problems.push(`README.md pins polaris-agent-kit@${pin} but package.json is ${pkg.version} (update the README pin, see docs/RELEASING.md step 2)`);
}

// 2. The publish set: what npm uploads.
const publish = new Set(["package.json"]);
for (const name of readdirSync(root)) if (/^(README|LICENSE|LICENCE|CHANGELOG)(\.|$)/i.test(name)) publish.add(name);
for (const f of pkg.files ?? []) {
  const abs = join(root, f);
  if (!existsSync(abs)) { problems.push(`package.json "files" names ${f}, which does not exist`); continue; }
  if (statSync(abs).isDirectory()) walkAll(abs).forEach((p) => publish.add(relative(root, p).split(sep).join("/")));
  else publish.add(f);
}
const NEVER = /(^|\/)(\.env[^/]*|\.dev\.vars|\.npmrc|\.netrc|id_rsa[^/]*|[^/]*\.(pem|key|p12|pfx|tgz|log)|\.git(\/|$)|node_modules\/)/;
const SECRET = [
  [/gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{20,}/, "a GitHub token"],
  [/npm_[A-Za-z0-9]{30,}/, "an npm token"],
  [/sh(pat|pss|pca)_[A-Fa-f0-9]{20,}/, "a Shopify token"],
  [/AKIA[0-9A-Z]{16}/, "an AWS key id"],
  [/xox[abprs]-[A-Za-z0-9-]{10,}/, "a Slack token"],
  [/sk-(ant-)?[A-Za-z0-9_-]{30,}/, "an API key"],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, "a private key"],
  [/eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\./, "a JWT"],
];
const EMAIL = /[\w.+-]+@[A-Za-z][\w-]*(?:\.[\w-]+)+/g;
const EMAIL_OK = /(noreply|@v\d+\.\d+\.\d+$|example\.(com|org)|@shopify\.|@anthropic)/i;
for (const f of publish) {
  if (NEVER.test(f)) problems.push(`${f} must never be published`);
  const text = readFileSync(join(root, f), "utf8");
  for (const [re, what] of SECRET) if (re.test(text)) problems.push(`${f} looks like it contains ${what}`);
  for (const m of text.matchAll(EMAIL)) if (!EMAIL_OK.test(m[0])) problems.push(`${f} contains an e-mail address: ${m[0]}`);
  if (/[A-Za-z]:[\\/]Users[\\/]|\/home\/[a-z]|\/Users\/[A-Za-z]/.test(text)) problems.push(`${f} contains a home-folder path`);
}

// 3. CI: every action is pinned to a full commit SHA, and the token is read-only.
const wf = join(root, ".github", "workflows");
if (existsSync(wf)) {
  for (const name of readdirSync(wf)) {
    const text = readFileSync(join(wf, name), "utf8").split("\n").filter((l) => !/^\s*#/.test(l)).join("\n"); // comments may name what is forbidden
    for (const m of text.matchAll(/^\s*-?\s*uses:\s*(\S+)/gm)) if (!/@[0-9a-f]{40}\b/.test(m[1])) problems.push(`.github/workflows/${name}: ${m[1]} is not pinned to a full commit SHA`);
    if (/pull_request_target/.test(text)) problems.push(`.github/workflows/${name} uses pull_request_target (runs fork code with secrets)`);
    if (!/permissions:\s*\n\s+contents:\s*read/.test(text)) problems.push(`.github/workflows/${name} does not set permissions: contents: read`);
  }
}

// 4. The identity every commit will publish. Printed, not judged: the owner decides.
try {
  const ids = execFileSync("git", ["log", "--format=%an <%ae> %ai"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim().split("\n");
  console.log(`publish-gate: commits will publish as:\n  ${[...new Set(ids)].join("\n  ")}`);
} catch { /* no git: nothing to print */ }

if (problems.length) {
  console.error("publish-gate: NOT publishing:\n - " + problems.join("\n - "));
  process.exit(1);
}
console.log(`publish-gate: ok (${publish.size} files in the publish set)`);
