// `doctor`: what Polaris is this project pinned to, what can we see as latest, and do they differ?
// Everything remote is optional and fails soft: offline prints what is local and says what it could not see.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { stripComments } from "../lib/scan.mjs";
import { walk, readJson, majorOf, rel, isTestFile, readSource } from "../lib/project.mjs";

const CDN = "https://cdn.shopify.com/shopifycloud";
const REGISTRY = "https://registry.npmjs.org/@shopify%2fpolaris-types";

export function localState(root) {
  const pkg = readJson(join(root, "package.json"));
  const deps = { ...(pkg?.dependencies ?? {}), ...(pkg?.devDependencies ?? {}) };
  const installed = readJson(join(root, "node_modules", "@shopify", "polaris-types", "package.json"))?.version ?? null;
  const urls = [];
  for (const f of walk(root, [".tsx", ".jsx", ".ts", ".js", ".mjs", ".html"]).filter((p) => !isTestFile(rel(root, p)))) {
    const raw = readSource(f);
    if (raw == null) continue;
    const src = stripComments(raw);
    for (const m of src.matchAll(/https?:\/\/cdn\.shopify\.com\/shopifycloud\/(polaris[\w.-]*\.js)/g)) urls.push({ name: m[1], file: rel(root, f) });
  }
  return { typesRange: deps["@shopify/polaris-types"] ?? null, typesInstalled: installed, scriptUrls: urls, hasAppProvider: Boolean(deps["@shopify/shopify-app-react-router"]) };
}

async function probe(url, fetchImpl) {
  try {
    const res = await fetchImpl(url, { method: "HEAD", signal: AbortSignal.timeout(8000) });
    return res.status;
  } catch { return null; }
}

export async function remoteState(fetchImpl = fetch) {
  let tags = null;
  try {
    const res = await fetchImpl(REGISTRY, { headers: { accept: "application/vnd.npm.install-v1+json" }, signal: AbortSignal.timeout(8000) });
    if (res.ok) tags = (await res.json())["dist-tags"] ?? null;
  } catch { /* offline */ }
  const channels = {};
  for (const name of ["polaris-1.js", "polaris-2.0-rc.js", "polaris-2.0.js"]) channels[name] = await probe(`${CDN}/${name}`, fetchImpl);
  return { tags, channels };
}

/** Pure: turn local + remote state into report lines and a `differs` flag. */
export function report(local, remote) {
  const lines = [];
  let differs = false;
  const names = [...new Set(local.scriptUrls.map((u) => u.name))];
  lines.push(`Polaris script in your code : ${names.length ? names.join(", ") : "none found (a library default may be loading it)"}`);
  lines.push(`@shopify/polaris-types      : ${local.typesRange ?? "not in package.json"}${local.typesInstalled ? ` (installed ${local.typesInstalled})` : ""}`);
  if (!remote.tags && Object.values(remote.channels).every((v) => v == null)) {
    lines.push("Latest (could not reach npm or the CDN): offline, so no comparison. Local facts above are all this report knows.");
    return { lines, differs: false, offline: true };
  }
  if (remote.tags) lines.push(`npm dist-tags (polaris-types): ${Object.entries(remote.tags).map(([k, v]) => `${k}=${v}`).join(", ")}`);
  lines.push(`CDN channels seen            : ${Object.entries(remote.channels).map(([k, v]) => `${k}=${v ?? "unreachable"}`).join(", ")}`);
  const ga2 = remote.channels["polaris-2.0.js"] === 200;
  if (ga2 && !names.includes("polaris-2.0.js")) { differs = true; lines.push("DIFFERS: polaris-2.0.js now exists (2.0 is out of release candidate). Move the script URL and polaris-types together."); }
  if (!ga2 && names.includes("polaris-2.0-rc.js")) lines.push("OK: you load the 2.0 release candidate and no stable 2.0 URL exists yet. Shopify does not document the RC URL as frozen (the versioned polaris-1.1.js is), so re-check it when you upgrade.");
  const major = majorOf(local.typesRange);
  if (remote.tags && major != null) {
    const latestMajor = majorOf(remote.tags.latest);
    const nextMajor = majorOf(remote.tags.next);
    const want = names.some((n) => /2\.0/.test(n)) ? remote.tags.next : remote.tags.latest;
    if (want && local.typesInstalled && local.typesInstalled !== want) { differs = true; lines.push(`DIFFERS: installed polaris-types ${local.typesInstalled}, the matching npm tag is ${want}.`); }
    if (names.length && major !== (names.some((n) => /2\./.test(n)) ? nextMajor : latestMajor) && !local.typesInstalled) lines.push(`CHECK: types major ${major} versus script ${names.join(", ")}.`);
  }
  if (!differs) lines.push(names.length || local.typesRange ? "No difference found between what is pinned and what is visible." : "Nothing is pinned in this project to compare.");
  return { lines, differs, offline: false };
}

export async function runDoctor(argv, fetchImpl = fetch) {
  const root = argv.find((a) => !a.startsWith("--")) ?? process.cwd();
  const local = localState(root);
  const remote = argv.includes("--offline") ? { tags: null, channels: { "polaris-1.js": null, "polaris-2.0-rc.js": null, "polaris-2.0.js": null } } : await remoteState(fetchImpl);
  const r = report(local, remote);
  r.lines.forEach((l) => console.log(l));
  return r.differs && argv.includes("--fail-on-diff") ? 1 : 0;
}

