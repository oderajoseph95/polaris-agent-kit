import { test } from "node:test";
import assert from "node:assert/strict";
import { check, RULES, runCheck } from "../src/commands/check.mjs";
import { project, GOOD } from "./helpers.mjs";

const rulesOf = (r) => [...r.findings, ...r.advice].map((f) => f.rule);

/** Run `check` on GOOD with `overrides` applied; return the result. */
function run(overrides, opts) {
  const p = project({ ...GOOD, ...overrides });
  try { return check(p.dir, opts); } finally { p.done(); }
}

test("the good project is clean (no finding, no advice)", () => {
  const r = run({});
  assert.deepEqual(rulesOf(r), []);
  assert.ok(r.elementsSeen > 5, "it actually looked at elements");
});

test("every error rule in RULES has a test below (a rule without a failing fixture is not a rule)", () => {
  const src = import.meta.url; // the list is checked against the names used in this file
  void src;
  const covered = ["kebab-prop", "polaris-react-import", "script-unpinned", "script-missing", "script-duplicate", "url-mismatch", "types-script-mismatch", "types-unpinned", "tsconfig-types", "raw-gid-render", "boolean-string-false", "boolean-false-expr", "click-delegate-target", "unknown-prop", "unknown-element", "table-header-listslot", "inline-style", "slot-not-declared", "container-query-no-container", "gid-in-id", "table-loading-inert"];
  assert.deepEqual(Object.keys(RULES).sort(), covered.sort());
});

test("kebab-prop: list-slot fails with file:line and the camelCase fix; aria-/data- and slot values pass", () => {
  const bad = run({ "app/a.tsx": 'export const A = () => (\n  <s-table-header list-slot="primary">x</s-table-header>\n);\n' });
  const f = bad.findings.find((x) => x.rule === "kebab-prop");
  assert.ok(f, "found");
  assert.equal(f.file, "app/a.tsx");
  assert.equal(f.line, 2);
  assert.match(f.fix, /listSlot/);
  const good = run({ "app/a.tsx": 'export const A = () => <s-button slot="primary-action" aria-label="x" data-testid="y" listSlot="primary">x</s-button>;\n' });
  assert.ok(!rulesOf(good).includes("kebab-prop"));
});

test("kebab-prop: a commented-out bad prop and kebab in a raw HTML tag do not count", () => {
  const r = run({ "app/a.tsx": '// <s-box align-items="x">\nexport const A = () => <div data-foo="1" class-name="x">{/* <s-box gap-size="1" /> */}</div>;\n' });
  assert.ok(!rulesOf(r).includes("kebab-prop"));
});

test("polaris-react-import (advice): an import and a package.json dependency are reported but do not fail the run; polaris-types is not", () => {
  const bad = run({ "app/a.tsx": 'import { Page } from "@shopify/polaris";\nexport const A = () => <Page />;\n', "package.json": { dependencies: { react: "18.3.1", "@shopify/polaris": "^13.0.0", "@shopify/polaris-types": "2.0.0-rc.3" } } });
  assert.equal(bad.advice.filter((f) => f.rule === "polaris-react-import").length, 2);
  assert.equal(bad.findings.length, 0, "mid-migration apps are not failed");
  const good = run({ "app/a.tsx": 'import type {} from "@shopify/polaris-types";\nexport const A = () => <s-page />;\n' });
  assert.ok(!rulesOf(good).includes("polaris-react-import"));
});

test("script-unpinned: the unversioned polaris.js fails; a versioned URL passes", () => {
  const bad = run({ "app/polaris.ts": 'export const U = "https://cdn.shopify.com/shopifycloud/polaris.js";\n', "package.json": { dependencies: { react: "18.3.1", "@shopify/polaris-types": "1.1.0" } } });
  assert.ok(rulesOf(bad).includes("script-unpinned"));
  const good = run({ "app/polaris.ts": 'export const U = "https://cdn.shopify.com/shopifycloud/polaris-1.js";\n', "package.json": { dependencies: { react: "18.3.1", "@shopify/polaris-types": "1.1.0" } } });
  assert.ok(!rulesOf(good).includes("script-unpinned"));
});

test("script-unpinned: AppProvider + shopifyApp left at their defaults fail; polarisUrl on both passes", () => {
  const files = (provider, server) => ({
    "app/root.tsx": `import { AppProvider } from "@shopify/shopify-app-react-router/react";\nexport default () => <AppProvider ${provider}><s-page /></AppProvider>;\n`,
    "app/shopify.server.ts": `import { shopifyApp } from "@shopify/shopify-app-react-router/server";\nexport default shopifyApp({ apiKey: "x"${server} });\n`,
    "app/polaris.ts": "",
  });
  const bad = run({ ...files("apiKey={k}", ""), "app/polaris.ts": undefined });
  assert.ok(rulesOf(bad).includes("script-unpinned"));
  const good = run({ ...files("apiKey={k} polarisUrl={POLARIS_SCRIPT_URL}", ", polarisUrl: POLARIS_SCRIPT_URL"), "app/root.tsx": `import { AppProvider } from "@shopify/shopify-app-react-router/react";\nexport default () => <AppProvider apiKey={k} polarisUrl={POLARIS_SCRIPT_URL}><s-page /></AppProvider>;\n` });
  assert.ok(!rulesOf(good).includes("script-unpinned") && !rulesOf(good).includes("url-mismatch"), rulesOf(good).join());
});

test("url-mismatch: polarisUrl on AppProvider only, or two different values, fail", () => {
  const provider = (u) => `import { AppProvider } from "@shopify/shopify-app-react-router/react";\nexport default () => <AppProvider polarisUrl=${u}><s-page /></AppProvider>;\n`;
  const server = (u) => `import { shopifyApp } from "@shopify/shopify-app-react-router/server";\nexport default shopifyApp({ polarisUrl: ${u} });\n`;
  const onlyOne = run({ "app/root.tsx": provider("{POLARIS_SCRIPT_URL}"), "app/shopify.server.ts": 'import { shopifyApp } from "@shopify/shopify-app-react-router/server";\nexport default shopifyApp({ apiKey: "x" });\n' });
  assert.ok(rulesOf(onlyOne).includes("url-mismatch"));
  const differ = run({ "app/root.tsx": provider("{A_URL}"), "app/shopify.server.ts": server("B_URL") });
  assert.ok(rulesOf(differ).includes("url-mismatch"));
  const same = run({ "app/root.tsx": provider("{A_URL}"), "app/shopify.server.ts": server("A_URL") });
  assert.ok(!rulesOf(same).includes("url-mismatch"));
});

test("script-duplicate: two different Polaris URLs fail; a hand tag beside AppProvider fails", () => {
  const two = run({ "app/other.ts": 'export const X = "https://cdn.shopify.com/shopifycloud/polaris-1.js";\n' });
  assert.ok(rulesOf(two).includes("script-duplicate"));
  const beside = run({ "app/root.tsx": 'import { AppProvider } from "@shopify/shopify-app-react-router/react";\nexport default () => <AppProvider polarisUrl={U}><script src="https://cdn.shopify.com/shopifycloud/polaris-2.0-rc.js" /><s-page /></AppProvider>;\n' });
  assert.ok(rulesOf(beside).includes("script-duplicate"));
});

test("script-missing: s-* elements and no script anywhere fail; ignoring the rule is honoured", () => {
  const files = { "app/a.tsx": "export const A = () => <s-page heading=\"x\" />;\n", "app/polaris.ts": undefined, "app/root.tsx": undefined };
  const bad = run(files);
  assert.ok(rulesOf(bad).includes("script-missing"));
  const ignored = run(files, { ignore: ["script-missing"] });
  assert.ok(!rulesOf(ignored).includes("script-missing"));
});

test("types-script-mismatch: 2.0 script with 1.x types fails; matching majors pass", () => {
  const bad = run({ "package.json": { dependencies: { react: "18.3.1", "@shopify/polaris-types": "1.1.0" } } });
  assert.ok(rulesOf(bad).includes("types-script-mismatch"));
  assert.ok(!rulesOf(run({})).includes("types-script-mismatch"));
});

test("types-unpinned (advice): a caret range is advice and does not change the exit status; an exact pin is clean", () => {
  const r = run({ "package.json": { dependencies: { react: "18.3.1", "@shopify/polaris-types": "^2.0.0-rc.0" } } });
  assert.ok(r.advice.some((f) => f.rule === "types-unpinned"));
  assert.equal(r.findings.length, 0);
  assert.ok(!rulesOf(run({})).includes("types-unpinned"));
});

test("tsconfig-types: an allowlist without polaris-types fails; app-nav needs app-bridge-types; absent types and no reference fails", () => {
  const without = run({ "tsconfig.json": '{ "compilerOptions": { "types": ["vite/client"] } }' });
  assert.ok(rulesOf(without).includes("tsconfig-types"));
  const nav = run({ "tsconfig.json": '{ "compilerOptions": { "types": ["@shopify/polaris-types"] } }', "app/nav.tsx": "export const N = () => <s-app-nav><s-link href=\"/\">x</s-link></s-app-nav>;\n" });
  assert.ok(nav.findings.some((f) => f.rule === "tsconfig-types" && /app-bridge-types/.test(f.message)));
  const none = run({ "tsconfig.json": '{ "compilerOptions": { "strict": true } }' });
  assert.ok(rulesOf(none).includes("tsconfig-types"));
  const referenced = run({ "tsconfig.json": '{ "compilerOptions": { "strict": true } }', "env.d.ts": '/// <reference types="@shopify/polaris-types" />\n' });
  assert.ok(!rulesOf(referenced).includes("tsconfig-types"));
  assert.ok(!rulesOf(run({})).includes("tsconfig-types"));
});

test("raw-gid-render: a gid in JSX text, in a label template and as a literal fails; a humanized call passes", () => {
  const bad = run({ "app/g.tsx": 'export const G = ({ row }) => (\n  <s-box>\n    {row.productGid}\n  </s-box>\n);\nexport const H = ({ gid }) => <s-text>{gid}</s-text>;\nexport const I = ({ r }) => <s-section heading={`Edit ${r.gid}`} />;\nexport const J = () => <s-text>gid://shopify/Product/1</s-text>;\n' });
  assert.equal(bad.advice.filter((f) => f.rule === "raw-gid-render").length, 4);
  const good = run({ "app/g.tsx": "export const G = ({ row }) => <s-text>{humanize(row.productGid)}</s-text>;\nexport const R = () => <s-text>{rigid}</s-text>;\nexport const K = ({ row }) => <s-link key={row.gid}>x</s-link>;\n" });
  assert.ok(!rulesOf(good).includes("raw-gid-render"), "rigid, a call and a key are not gids");
});

test("boolean-string-false and boolean-false-expr (React 18): fail; the safe forms pass; React 19 skips the expression rule", () => {
  const bad = run({ "app/b.tsx": 'export const B = () => (\n  <s-checkbox checked="false" />\n);\nexport const C = ({ rule }) => <s-checkbox checked={rule.enabled} />;\nexport const D = ({ dirty }) => <s-button disabled={dirty}>x</s-button>;\nexport const E = () => <s-table loading={false} />;\n' });
  assert.ok(bad.findings.some((f) => f.rule === "boolean-string-false" && f.line === 2));
  assert.equal(bad.findings.filter((f) => f.rule === "boolean-false-expr").length, 3);
  const safe = run({ "app/b.tsx": 'export const B = ({ on, busy }) => <s-checkbox checked={on || undefined} disabled loading={busy ? "" : undefined} {...(busy ? { paginate: true } : {})} />;\n' });
  assert.ok(!rulesOf(safe).some((r) => r.startsWith("boolean")));
  const react19 = run({ "package.json": { dependencies: { react: "^19.0.0", "@shopify/polaris-types": "2.0.0-rc.3" } }, "app/b.tsx": "export const C = ({ rule }) => <s-checkbox checked={rule.enabled} />;\n" });
  assert.ok(!rulesOf(react19).includes("boolean-false-expr"));
});

test("click-delegate-target: pointing at an s-button id fails; an s-link id passes; an id elsewhere is not judged", () => {
  const bad = run({ "app/t.tsx": 'export const T = () => (\n  <s-table-row clickDelegate="open-1"><s-table-cell><s-button id="open-1">View</s-button></s-table-cell></s-table-row>\n);\n' });
  assert.ok(bad.advice.some((f) => f.rule === "click-delegate-target" && f.line === 2));
  assert.ok(!rulesOf(run({})).includes("click-delegate-target"));
  const elsewhere = run({ "app/t.tsx": 'export const T = () => <s-table-row clickDelegate="open-9"><s-table-cell>x</s-table-cell></s-table-row>;\n' });
  assert.ok(!rulesOf(elsewhere).includes("click-delegate-target"));
});

test("unknown-prop / unknown-element: derived from the installed types package; absent package says NOT CHECKED, never ok", () => {
  const ce = { modules: [{ declarations: [
    { tagName: "s-box", members: [{ kind: "field", name: "padding" }, { kind: "field", name: "hidden", type: { text: "boolean" } }], attributes: [], events: [] },
    { tagName: "s-button", members: [{ kind: "field", name: "variant" }, { kind: "field", name: "loading", type: { text: "boolean | undefined" } }], attributes: [], events: [{ name: "click" }] },
    { tagName: "s-page", members: [{ kind: "field", name: "heading" }], attributes: [], events: [] },
  ] }] };
  const withPkg = { "app/root.tsx": undefined, "node_modules/@shopify/polaris-types/dist/custom-elements.json": JSON.stringify(ce), "app/u.tsx": 'export const U = () => (\n  <s-box paddin="base" onFoo={f} onClick={g} className="x" style={{}} hidden title="t" tabIndex={0} ref={r}>\n    <s-nope />\n    <s-button variant="primary" onClick={f} id="a" slot="x" data-x="1">x</s-button>\n  </s-box>\n);\n' };
  const r = run(withPkg);
  const props = r.findings.filter((f) => f.rule === "unknown-prop");
  assert.deepEqual(props.map((f) => f.message.match(/ (\w+)>/)?.[1]), ["paddin", "onFoo"], "a typo and a non-DOM undeclared event; standard DOM events and HTML/React props are never judged");
  assert.ok(r.findings.some((f) => f.rule === "unknown-element" && /s-nope/.test(f.message)));
  const noPkg = run({ "app/u.tsx": 'export const U = () => <s-box paddin="base" />;\n' });
  assert.ok(noPkg.notes.some((n) => /NOT checked/.test(n)));
  assert.ok(!rulesOf(noPkg).includes("unknown-prop"));
});

test("table-header-listslot and inline-style are advice: shown, exit 0, exit 1 with --strict", () => {
  const files = { "app/a.tsx": 'export const A = () => <s-table-header>Name</s-table-header>;\nexport const B = () => <s-box style={{ color: "red" }} />;\n' };
  const r = run({ "app/a.tsx": files["app/a.tsx"] + "export const C = () => <s-table-header-row><s-table-header></s-table-header><s-table-header /></s-table-header-row>;\n" });
  assert.deepEqual(r.advice.map((f) => f.rule).sort(), ["inline-style", "table-header-listslot"]);
  assert.equal(r.findings.length, 0);
  const p = project({ ...GOOD, ...files });
  const out = [];
  const io = { log: (s) => out.push(s), err: (s) => out.push(s) };
  try {
    assert.equal(runCheck([p.dir], io), 0);
    assert.equal(runCheck([p.dir, "--strict"], io), 1);
  } finally { p.done(); }
});

test("an empty folder is VACUOUS (exit 2), never ok", () => {
  const p = project({ "README.md": "hi" });
  const out = [];
  try { assert.equal(runCheck([p.dir], { log: (s) => out.push(s), err: (s) => out.push(s) }), 2); } finally { p.done(); }
  assert.ok(out.some((l) => /VACUOUS/.test(l)));
});

test("exit codes and output: a bad project exits 1 and prints file:line plus a fix; --json is parseable; unknown --ignore is refused", () => {
  const p = project({ ...GOOD, "app/bad.tsx": 'export const A = () => <s-table-header list-slot="primary" />;\n' });
  const out = [];
  const io = { log: (s) => out.push(s), err: (s) => out.push(s) };
  try {
    assert.equal(runCheck([p.dir], io), 1);
    assert.ok(out.some((l) => l.startsWith("app/bad.tsx:1  [kebab-prop]")));
    assert.ok(out.some((l) => /fix: Write listSlot/.test(l)));
    out.length = 0;
    assert.equal(runCheck([p.dir, "--json"], io), 1);
    assert.equal(JSON.parse(out[0]).findings[0].rule, "kebab-prop");
    assert.equal(runCheck([p.dir, "--ignore", "not-a-rule"], io), 2);
    assert.equal(runCheck([p.dir, "--ignore", "kebab-prop"], io), 0);
  } finally { p.done(); }
});

test("false positives a stranger would hit: protocol-relative URL, image loading enum, test fixtures, solution-style tsconfig, reference-declared types, app-bridge window", () => {
  const img = run({ "app/i.tsx": 'export const I = () => (\n  <div>\n    <s-image src="//cdn.example.com/a.png" alt="a" loading="lazy" />\n    <s-image src="https://x.example/y.png" alt="b" loading={eager ? "eager" : "lazy"} />\n  </div>\n);\n' });
  assert.deepEqual(rulesOf(img), [], "the // in a URL is not a comment, and image loading is not a boolean");
  const tests = run({ "app/polaris.test.ts": 'export const BAD = "https://cdn.shopify.com/shopifycloud/polaris.js";\n' });
  assert.deepEqual(rulesOf(tests), [], "a test file quoting a bad URL on purpose is not the app loading it");
  const solution = run({ "tsconfig.json": '{ "files": [], "references": [{ "path": "./tsconfig.app.json" }] }' });
  assert.ok(!rulesOf(solution).includes("tsconfig-types"));
  const referenced = run({ "tsconfig.json": '{ "compilerOptions": { "types": ["node"] } }', "env.d.ts": '/// <reference types="@shopify/polaris-types" />\n' });
  assert.ok(!rulesOf(referenced).includes("tsconfig-types"));
  const bridge = run({ "app/w.tsx": 'export const W = () => <s-app-window src="/x" />;\n' });
  assert.ok(!rulesOf(bridge).includes("unknown-element"));
});

// ---- 0.1.1 rules, each from a failure seen on screen on Polaris 2.0 RC / React 18.3 (references/mistakes.md rows 30 to 33) ----
const CE_SLOTS = JSON.stringify({ modules: [{ declarations: [
  { tagName: "s-section", members: [{ kind: "field", name: "heading" }], attributes: [], events: [], slots: [{ name: "" }, { name: "primary-action" }, { name: "secondary-actions" }] },
  { tagName: "s-button", members: [{ kind: "field", name: "variant" }], attributes: [], events: [{ name: "click" }], slots: [{ name: "" }] },
  { tagName: "s-page", members: [{ kind: "field", name: "heading" }], attributes: [], events: [], slots: [{ name: "" }, { name: "primary-action" }, { name: "breadcrumb-actions" }] },
  { tagName: "s-link", members: [{ kind: "field", name: "href" }], attributes: [], events: [], slots: [{ name: "" }] },
] }] });
const withTypes = (tsx) => ({ "node_modules/@shopify/polaris-types/dist/custom-elements.json": CE_SLOTS, "app/s.tsx": tsx });

test("slot-not-declared: a slot the parent element does not declare fails; declared slots, a wrapper component and an html parent pass; no types package means NOT checked", () => {
  const bad = run(withTypes('export const S = () => (\n  <s-section heading="x">\n    <s-button slot="header-actions" variant="primary">Go</s-button>\n  </s-section>\n);\n'));
  const f = bad.findings.find((x) => x.rule === "slot-not-declared");
  assert.ok(f, "found");
  assert.equal(f.line, 3);
  assert.match(f.message, /header-actions/);
  assert.match(f.message, /primary-action/, "the message lists what the parent does declare");
  const good = run(withTypes('export const S = ({ more }) => (\n  <s-page heading="x">\n    <s-button slot="primary-action" variant="primary">Go</s-button>\n    <s-link slot="breadcrumb-actions" href="/">Back</s-link>\n    {more && <s-section><s-button slot="secondary-actions">x</s-button></s-section>}\n    <s-section><Wrapper><s-button slot="whatever">x</s-button></Wrapper></s-section>\n    <s-section><div><s-button slot="whatever">x</s-button></div></s-section>\n    <s-section><s-button slot="primary-action">x</s-button><s-button slot="primary-action" /></s-section>\n  </s-page>\n);\nexport const G = () => { const [a] = useState<string>(""); return <s-section><s-button slot="primary-action">x</s-button></s-section>; };\n'));
  assert.ok(!rulesOf(good).includes("slot-not-declared"), rulesOf(good).join());
  const noTypes = run({ "app/s.tsx": 'export const S = () => <s-section><s-button slot="header-actions">Go</s-button></s-section>;\n' });
  assert.ok(!rulesOf(noTypes).includes("slot-not-declared"));
  assert.ok(noTypes.notes.some((n) => /NOT checked/.test(n)));
});

test("container-query-no-container (advice): an @container value with no s-query-container in the file is reported; with the wrapper it passes", () => {
  const bad = run({ "app/g.tsx": 'export const G = () => (\n  <s-section>\n    <s-grid gridTemplateColumns="@container (inline-size > 480px) 1fr 1fr, 1fr" />\n  </s-section>\n);\n' });
  const f = bad.advice.find((x) => x.rule === "container-query-no-container");
  assert.ok(f && f.line === 3, "reported on the line of the prop");
  assert.equal(bad.findings.length, 0);
  const good = run({ "app/g.tsx": 'export const G = () => (\n  <s-query-container>\n    <s-grid gridTemplateColumns="@container (inline-size > 480px) 1fr 1fr, 1fr" />\n  </s-query-container>\n);\n' });
  assert.ok(!rulesOf(good).includes("container-query-no-container"));
  assert.ok(!rulesOf(run({ "app/g.tsx": 'export const G = () => <s-grid gridTemplateColumns="1fr 1fr" />;\n' })).includes("container-query-no-container"));
});

test("gid-in-id (advice): a gid:// in an id or clickDelegate on an s-* element is reported; a plain row id passes", () => {
  const bad = run({ "app/t.tsx": 'export const T = ({ row }) => (\n  <s-table-row clickDelegate={`open-${row.gid}`}>\n    <s-link id={`open-${row.gid}`} href="/x">x</s-link>\n    <s-link id="gid://shopify/Product/1">y</s-link>\n  </s-table-row>\n);\n' });
  assert.equal(bad.advice.filter((f) => f.rule === "gid-in-id").length, 3);
  assert.equal(bad.findings.length, 0);
  const good = run({ "app/t.tsx": 'export const T = ({ row, i }) => (\n  <s-table-row clickDelegate={`open-${i}`}><s-link id={`open-${i}`} href="/x">x</s-link><s-link id="open-1">y</s-link></s-table-row>\n);\n' });
  assert.ok(!rulesOf(good).includes("gid-in-id"));
});

test("table-loading-inert (advice): s-table loading plus a filters slot in the same file is reported; loading without filters, and filters without loading, pass", () => {
  const files = (loading, filters) => ({ "app/t.tsx": `export const T = ({ busy }) => (\n  <s-table ${loading ? "loading={busy || undefined}" : ""}>\n    ${filters ? '<s-search-field slot="filters" label="Search" />' : ""}\n    <s-table-body />\n  </s-table>\n);\n` });
  const bad = run(files(true, true));
  assert.ok(bad.advice.some((f) => f.rule === "table-loading-inert" && f.line === 2));
  assert.equal(bad.findings.length, 0);
  assert.ok(!rulesOf(run(files(true, false))).includes("table-loading-inert"));
  assert.ok(!rulesOf(run(files(false, true))).includes("table-loading-inert"));
});
