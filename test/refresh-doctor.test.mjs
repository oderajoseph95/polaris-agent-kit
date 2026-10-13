import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { refresh, discoverPages, indexUrl } from "../src/commands/refresh.mjs";
import { report, localState } from "../src/commands/doctor.mjs";
import { project } from "./helpers.mjs";

const INDEX = `
[Page](https://shopify.dev/docs/api/app-home/v2.0-rc/web-components/layout-and-structure/page)
[Table](https://shopify.dev/docs/api/app-home/v2.0-rc/web-components/layout-and-structure/table)
[other](https://shopify.dev/docs/api/app-home/v2.0-rc/apis/x) [out](https://example.com/web-components/z)`;

function fakeFetch(map, calls = []) {
  return async (url) => {
    calls.push(url);
    if (!(url in map)) return { ok: false, status: 404, text: async () => "" };
    return { ok: true, status: 200, text: async () => map[url], json: async () => JSON.parse(map[url]) };
  };
}

test("discoverPages reads the page list out of the index (nothing typed), same version only", () => {
  assert.deepEqual(discoverPages(INDEX, "v2.0-rc"), [
    "https://shopify.dev/docs/api/app-home/v2.0-rc/web-components/layout-and-structure/page",
    "https://shopify.dev/docs/api/app-home/v2.0-rc/web-components/layout-and-structure/table",
  ]);
  assert.equal(indexUrl("latest"), "https://shopify.dev/docs/api/app-home/web-components.md");
});

test("refresh caches pages with the fetch date and source URL, in a git-ignored cache, and reports what changed", async () => {
  const p = project({});
  try {
    const base = "https://shopify.dev/docs/api/app-home/v2.0-rc/web-components";
    const map = { [`${base}.md`]: INDEX, [`${base}/layout-and-structure/page.md`]: "# Page v1", [`${base}/layout-and-structure/table.md`]: "# Table v1" };
    const logs = [];
    const now = () => new Date("2026-10-13T10:00:00Z");
    const r = await refresh({ root: p.dir, version: "v2.0-rc", all: true, delayMs: 0, fetch: fakeFetch(map), now, log: (s) => logs.push(s) });
    assert.equal(r.written, 2);
    const manifest = JSON.parse(readFileSync(join(p.dir, ".polaris-agent-kit-cache/docs/v2.0-rc/MANIFEST.json"), "utf8"));
    assert.equal(manifest.fetchedAt, "2026-10-13T10:00:00.000Z");
    const entry = Object.values(manifest.pages)[0];
    assert.match(entry.source, /^https:\/\/shopify\.dev\/.*\.md$/);
    assert.match(entry.sha256, /^[0-9a-f]{64}$/);
    const page = readFileSync(join(p.dir, ".polaris-agent-kit-cache/docs/v2.0-rc/v2.0-rc__web-components__layout-and-structure__page.md"), "utf8");
    assert.match(page, /^<!-- cached from https:\/\/shopify\.dev.* on 2026-10-13T10:00:00\.000Z sha256:/);
    // second run with one page changed
    map[`${base}/layout-and-structure/table.md`] = "# Table v2";
    const r2 = await refresh({ root: p.dir, version: "v2.0-rc", all: true, delayMs: 0, fetch: fakeFetch(map), now, log: () => {} });
    assert.equal(r2.changed, 1);
  } finally { p.done(); }
});

test("refresh fails SOFT offline: exit-0 result, a plain message, and nothing written", async () => {
  const p = project({});
  try {
    const logs = [];
    const offline = async () => { throw new Error("getaddrinfo ENOTFOUND shopify.dev"); };
    const r = await refresh({ root: p.dir, fetch: offline, delayMs: 0, log: (s) => logs.push(s) });
    assert.equal(r.offline, true);
    assert.equal(r.failed, 0);
    assert.ok(logs[0].includes("could not reach shopify.dev") && logs[0].includes("Nothing was written"));
    assert.ok(!existsSync(join(p.dir, ".polaris-agent-kit-cache")));
  } finally { p.done(); }
});

test("refresh default fetches the short core list, not the whole site", async () => {
  const p = project({});
  try {
    const calls = [];
    const base = "https://shopify.dev/docs/api/app-home/web-components";
    await refresh({ root: p.dir, delayMs: 0, fetch: fakeFetch({ [`${base}.md`]: "idx" }, calls), log: () => {} });
    assert.equal(calls.length, 1 + 10);
    assert.ok(calls.includes(`${base}/layout-and-structure/table.md`));
  } finally { p.done(); }
});

test("doctor reads the pinned script and types from the project", () => {
  const p = project({ "package.json": { devDependencies: { "@shopify/polaris-types": "2.0.0-rc.3" } }, "node_modules/@shopify/polaris-types/package.json": { version: "2.0.0-rc.3" }, "app/p.ts": 'export const U = "https://cdn.shopify.com/shopifycloud/polaris-2.0-rc.js";\n' });
  try {
    const l = localState(p.dir);
    assert.equal(l.typesRange, "2.0.0-rc.3");
    assert.equal(l.typesInstalled, "2.0.0-rc.3");
    assert.deepEqual(l.scriptUrls.map((u) => u.name), ["polaris-2.0-rc.js"]);
  } finally { p.done(); }
});

test("doctor.report: offline says so; a new stable 2.0 URL is flagged DIFFERS; rc with no stable is OK", () => {
  const local = { typesRange: "2.0.0-rc.3", typesInstalled: "2.0.0-rc.3", scriptUrls: [{ name: "polaris-2.0-rc.js" }] };
  const none = { tags: null, channels: { "polaris-1.js": null, "polaris-2.0-rc.js": null, "polaris-2.0.js": null } };
  assert.equal(report(local, none).offline, true);
  const rc = { tags: { latest: "1.1.0", next: "2.0.0-rc.3" }, channels: { "polaris-1.js": 200, "polaris-2.0-rc.js": 200, "polaris-2.0.js": 404 } };
  const ok = report(local, rc);
  assert.equal(ok.differs, false);
  assert.ok(ok.lines.some((l) => /release candidate/.test(l)));
  const ga = { tags: { latest: "2.0.0", next: "2.0.0" }, channels: { "polaris-1.js": 200, "polaris-2.0-rc.js": 200, "polaris-2.0.js": 200 } };
  const d = report(local, ga);
  assert.equal(d.differs, true);
  assert.ok(d.lines.some((l) => /DIFFERS: polaris-2\.0\.js now exists/.test(l)));
  const moved = report(local, { tags: { latest: "1.1.0", next: "2.0.0-rc.4" }, channels: rc.channels });
  assert.equal(moved.differs, true);
});
