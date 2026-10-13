// `check`: a static linter for Polaris web components in React/TSX. Every rule is mechanical and traces to a defect seen
// in a real embedded app (references/mistakes.md). A green run means "none of these patterns found", never "the UI is
// right" and never "compliant" or "Built for Shopify": only a browser at 1280 and 390 shows the UI, and only Shopify
// grants the badge. Errors are things Shopify's docs or the installed types package settle; heuristics are advice.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { scanTags, stripComments, lineIndex, tagParents } from "../lib/scan.mjs";
import { walk, rel, readJson, readJsonc, majorOf, isExactVersion, isTestFile, readSource, printable, MAX_LINE_CHARS } from "../lib/project.mjs";

export const RULES = {
  "kebab-prop": ["error", "A hyphenated attribute on an s-* element in JSX/TSX is silently dead (TypeScript exempts hyphenated JSX names)."],
  "polaris-react-import": ["advice", "@shopify/polaris (the React package) is deprecated by Shopify; this kit targets the web components. Both can coexist while you migrate."],
  "script-unpinned": ["advice", "Polaris is loaded from the legacy unversioned polaris.js (or left to a library default). It tracks 1.x and never serves 2.x; Shopify recommends a versioned channel."],
  "script-missing": ["advice", "s-* elements are used but no code that loads the Polaris script was found (a template, a tag in another file type or a platform layer may load it)."],
  "script-duplicate": ["error", "More than one Polaris bundle is loaded; Shopify's guide says loading two scripts causes the app to throw an error."],
  "url-mismatch": ["error", "The preload header and the script tag name different Polaris URLs (or only one is set)."],
  "types-script-mismatch": ["error", "@shopify/polaris-types major differs from the major of the Polaris script the app loads."],
  "types-unpinned": ["advice", "@shopify/polaris-types is a range, not an exact version; Shopify's versioning page says to pin the exact version for reproducible installs."],
  "tsconfig-types": ["error", "tsconfig `types` is an allowlist and does not name the Polaris (or App Bridge) types, so s-* elements do not type-check."],
  "raw-gid-render": ["advice", "A gid:// identifier looks to be rendered as visible text (heuristic: identifiers named like fooGid). Merchants rarely want to read one."],
  "boolean-string-false": ["error", 'A boolean prop on an s-* element is given the string "false", which is present, so it is true.'],
  "boolean-false-expr": ["error", "A boolean prop can be handed `false`; React 18 was observed writing it as the attribute \"false\", which Polaris reads as true."],
  "click-delegate-target": ["advice", "clickDelegate names an element that is not an s-link or s-checkbox. Shopify's docs give s-link as the example; on Polaris 1.x only those responded, and this is not confirmed on 2.0 RC."],
  "unknown-prop": ["error", "A prop that the installed @shopify/polaris-types does not declare on that element (needs the package installed). Standard HTML/React props and DOM event handlers are not judged."],
  "unknown-element": ["error", "An s-* element that the installed @shopify/polaris-types does not declare (needs the package installed)."],
  "table-header-listslot": ["advice", "An s-table-header without listSlot gets Shopify's default, 'labeled', so no column is the row's title in the phone (list) layout."],
  "slot-not-declared": ["error", "An element names a slot its parent s-* element does not declare in the installed @shopify/polaris-types, so it is assigned to no slot and renders nothing, without an error (needs the package installed)."],
  "container-query-no-container": ["advice", "A prop value uses an @container query but this file has no s-query-container; without a container the grid showed its fallback branch (observed once, Polaris 2.0 RC). A wrapper in another file may supply it."],
  "gid-in-id": ["advice", "A gid:// identifier is used in an id or clickDelegate. A gid contains ':' and '/', which are not valid in an unescaped CSS selector; use a plain row key."],
  "table-loading-inert": ["advice", "An s-table with a loading prop also holds a filters slot in this file. Shopify says a loading table 'might be in an inert state that prevents user interaction', which may include the filters inside it."],
  "inline-style": ["advice", "A style attribute on an s-* element; prefer the element's own props where one exists, so styling follows Polaris if its look changes."],
};

// Declared by @shopify/app-bridge-types (0.7.2, read 2026-10-13), not by @shopify/polaris-types.
const APP_BRIDGE_ELEMENTS = new Set(["s-app-nav", "s-app-window"]);
// React and HTML props every element takes; they are not Polaris props and `unknown-prop` does not judge them.
const GLOBAL_ATTRS = new Set([
  "key", "ref", "children", "slot", "id", "className", "style", "hidden", "title", "tabIndex", "role", "lang", "dir", "part", "is",
  "draggable", "translate", "inert", "autoFocus", "spellCheck", "contentEditable", "nonce", "suppressHydrationWarning",
  "suppressContentEditableWarning", "dangerouslySetInnerHTML",
]);
// Standard DOM events fire on every element, so a React `onXxx` handler for one of them is never an "unknown prop".
const DOM_EVENTS = new Set([
  "click", "dblclick", "auxclick", "contextmenu", "focus", "blur", "focusin", "focusout", "input", "change", "beforeinput", "invalid", "reset", "submit", "select",
  "keydown", "keyup", "keypress", "mousedown", "mouseup", "mouseenter", "mouseleave", "mouseover", "mouseout", "mousemove",
  "pointerdown", "pointerup", "pointermove", "pointerenter", "pointerleave", "pointerover", "pointerout", "pointercancel",
  "touchstart", "touchend", "touchmove", "touchcancel", "scroll", "wheel", "drag", "dragstart", "dragend", "dragenter", "dragleave", "dragover", "drop",
  "copy", "cut", "paste", "load", "error", "toggle", "animationstart", "animationend", "transitionend",
]);
// Only s-link and s-checkbox are named: Shopify's docs give s-link as the example and publish nothing more.
const SAFE_CLICK_TARGETS = new Set(["s-link", "s-checkbox"]);
// Used only when @shopify/polaris-types is not installed to derive the real list. (s-image `loading` is "eager" | "lazy".)
const FALLBACK_BOOLEANS = new Set(["checked", "disabled", "loading", "hasNextPage", "hasPreviousPage", "paginate", "dismissible", "removable"]);
const FALLBACK_NOT_BOOLEAN = new Set(["s-image:loading"]);
const POLARIS_URL = /https?:\/\/cdn\.shopify\.com\/shopifycloud\/(polaris[\w.-]*\.js)/g;
const LABEL_ATTRS = new Set(["heading", "label", "title", "placeholder", "accessibilityLabel", "description", "subheading"]);

/** `Map<tag, { props, events, booleans }>` derived from the installed types package, or null when absent. */
export function loadElements(root) {
  const file = join(root, "node_modules", "@shopify", "polaris-types", "dist", "custom-elements.json");
  if (!existsSync(file)) return null;
  const doc = readJson(file);
  if (!doc) return null;
  const out = new Map();
  for (const mod of doc.modules ?? []) {
    for (const decl of mod.declarations ?? []) {
      if (!decl.tagName) continue;
      const fields = (decl.members ?? []).filter((m) => m.kind === "field");
      out.set(decl.tagName, {
        props: new Set([...fields.map((m) => m.name), ...(decl.attributes ?? []).map((a) => a.fieldName).filter(Boolean)]),
        events: new Set((decl.events ?? []).map((e) => String(e.name).toLowerCase())),
        slots: new Set((decl.slots ?? []).map((sl) => String(sl.name))),
        booleans: new Set(fields.filter((m) => m.type && /^boolean(\s*\|\s*undefined)?$/.test(m.type.text ?? "")).map((m) => m.name)),
      });
    }
  }
  return out;
}

const camel = (s) => s.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());

/** Why an expression can be `false`, or null when it is one of the safe forms. */
export function judgeBooleanExpression(expr) {
  const e = expr.trim();
  if (e === "true" || e === '""' || e === "''") return null;
  if (e === "false") return "a literal `false`";
  if (/(\|\||\?\?)\s*undefined$/.test(e)) return null;
  if (/\?\s*undefined\s*:/.test(e) || /:\s*undefined$/.test(e)) return null;
  return "an expression that can be `false`";
}

const lastIdent = (expr) => /([A-Za-z_$][\w$]*)\s*$/.exec(expr)?.[1] ?? "";
const isGidIdentifier = (name) => name === "gid" || name === "GID" || /^[a-z][\w$]*Gid$/.test(name) || /^[A-Z][A-Z0-9_]*_GID$/.test(name);

function finding(rule, file, line, message, fix) {
  return { rule, severity: RULES[rule][0], file: printable(file), line, message: printable(message).slice(0, 300), fix: printable(fix) };
}

function checkJsxFile(src, file, ctx, out) {
  const clean = stripComments(src);
  const tags = scanTags(clean);
  ctx.elementsSeen += tags.length;
  if (tags.length) ctx.usesElements = true;
  const lineOf = lineIndex(clean);
  const needsLookup = /clickDelegate/.test(clean);
  const parents = ctx.elements && /\bslot\s*=/.test(clean) ? tagParents(clean) : null;
  const hasQueryContainer = /<s-query-container\b/.test(clean);
  const hasFiltersSlot = /\bslot\s*=\s*["']filters["']/.test(clean);
  const byId = new Map();
  if (needsLookup) {
    for (const t of scanTags(clean, /[a-z][a-z0-9-]*/y)) {
      const id = t.attrs.find((a) => a.name === "id" && a.value?.kind === "string");
      if (id) byId.set(id.value.text, t.tag);
    }
  }
  for (const t of tags) {
    const known = ctx.elements?.get(t.tag);
    if (ctx.elements && !known && !APP_BRIDGE_ELEMENTS.has(t.tag)) {
      out.push(finding("unknown-element", file, t.line, `<${t.tag}> is not declared by the installed @shopify/polaris-types.`, "Check the spelling against the component list, or update the types package to the release your app loads."));
    }
    if (t.spread) ctx.spreads.push(`${file}:${t.line} <${t.tag}>`);
    const emptyHeader = t.selfClosing || /^\s*<\/s-table-header>/.test(clean.slice(t.end));
    if (t.tag === "s-table-header" && !t.spread && !emptyHeader && !t.attrs.some((a) => a.name === "listSlot")) {
      out.push(finding("table-header-listslot", file, t.line, "<s-table-header> has no listSlot.", 'Add listSlot: "primary" (the row\'s title), "labeled" (the default), "inline", "secondary" or "kicker" (the five values on Shopify\'s table page).'));
    }
    if (t.tag === "s-table" && hasFiltersSlot && t.attrs.some((a) => a.name === "loading" && a.value && !(a.value.kind === "string" && a.value.text.trim() === "false") && !(a.value.kind === "expr" && a.value.text.trim() === "false"))) {
      out.push(finding("table-loading-inert", file, t.line, "<s-table loading> and a filters slot are in the same file.", "Show a skeleton on first paint and a spinner outside the table on a refetch, so the filters stay usable (Shopify's table page: a loading table may be inert)."));
    }
    for (const a of t.attrs) {
      if (/^(aria|data)-/.test(a.name)) continue;
      if (a.name.includes("-")) {
        out.push(finding("kebab-prop", file, a.line, `<${t.tag} ${a.name}> is a hyphenated attribute; JSX needs the camelCase prop name.`, `Write ${camel(a.name)}=… (tsc cannot catch this).`));
        continue;
      }
      if (parents && a.name === "slot" && a.value?.kind === "string" && (t.tag.startsWith("s-") || /^[a-z]/.test(t.tag))) {
        const parent = ctx.elements.get(parents.get(t.start));
        if (parent && parent.slots.size && !parent.slots.has(a.value.text.trim())) {
          out.push(finding("slot-not-declared", file, a.line, `<${t.tag} slot="${a.value.text.trim()}"> sits in <${parents.get(t.start)}>, which declares only: ${[...parent.slots].map((x) => x || "(default)").join(", ")}.`, "Use one of the parent's slots, or move the element to the parent that has the slot. An unknown slot name renders nothing and raises no error."));
        }
      }
      if (a.value && /@container\b/.test(a.value.text) && !hasQueryContainer) {
        out.push(finding("container-query-no-container", file, a.line, `<${t.tag} ${a.name}> uses an @container query and no <s-query-container> is in this file.`, "Wrap the grid in <s-query-container> (or confirm a parent component does) and look at it at 1280 and 390."));
      }
      if (a.value && (a.name === "id" || a.name === "clickDelegate") && (/gid:\/\/shopify\//.test(a.value.text) || (a.value.kind === "expr" && /\$\{[^}]*(?:\.gid|[a-z]Gid|\bgid)\s*\}/.test(a.value.text)))) {
        out.push(finding("gid-in-id", file, a.line, `<${t.tag} ${a.name}> is built from a gid.`, "Use a plain row key (an index or a numeric id) for the id and for clickDelegate."));
      }
      if (a.name === "style") out.push(finding("inline-style", file, a.line, `<${t.tag}> carries a style attribute.`, "Use the element's props (gap, padding, inlineSize…) instead of inline CSS."));
      if (known && !APP_BRIDGE_ELEMENTS.has(t.tag) && !GLOBAL_ATTRS.has(a.name)) {
        const isEvent = /^on[A-Z]/.test(a.name);
        const evName = a.name.slice(2).toLowerCase();
        const ok = isEvent ? known.events.has(evName) || DOM_EVENTS.has(evName) : known.props.has(a.name);
        if (!ok) out.push(finding("unknown-prop", file, a.line, `<${t.tag} ${a.name}> is not declared on that element.`, "Check the component's reference page; an unknown prop is ignored without a warning."));
      }
      const booleans = known ? known.booleans : FALLBACK_BOOLEANS;
      if (booleans.has(a.name) && a.value && (known || !FALLBACK_NOT_BOOLEAN.has(`${t.tag}:${a.name}`))) {
        if (a.value.kind === "string" && a.value.text.trim().toLowerCase() === "false") {
          out.push(finding("boolean-string-false", file, a.line, `<${t.tag} ${a.name}="false"> is present, so it is true.`, "Omit the prop, or write it as {cond || undefined}."));
        } else if (a.value.kind === "expr" && ctx.reactMajor !== null && ctx.reactMajor < 19) {
          const e = a.value.text.trim();
          if (/^["'`]false["'`]$/.test(e)) {
            out.push(finding("boolean-string-false", file, a.line, `<${t.tag} ${a.name}={${e}}> is the string "false", which is present, so it is true.`, "Omit the prop, or write it as {cond || undefined}."));
          } else {
            const why = judgeBooleanExpression(e);
            if (why) out.push(finding("boolean-false-expr", file, a.line, `<${t.tag} ${a.name}={${e.replace(/\s+/g, " ").slice(0, 60)}}> is ${why}.`, `Write ${a.name}={${e.length < 40 && !/[?:]/.test(e) ? `${e} || undefined` : "cond ? true : undefined"}}, or spread {...(cond ? { ${a.name}: true } : {})}.`));
          }
        }
      }
      if (t.tag === "s-table-row" && a.name === "clickDelegate" && a.value) {
        const lit = a.value.kind === "string" ? a.value.text : /^["']([^"'`${}]+)["']$/.exec(a.value.text.trim())?.[1];
        const target = lit != null ? byId.get(lit) : null;
        if (target && !SAFE_CLICK_TARGETS.has(target)) {
          out.push(finding("click-delegate-target", file, a.line, `clickDelegate="${lit}" points at a <${target}>.`, "Point it at an s-link (Shopify's example) or s-checkbox inside the row and open the record with a real link; a button target was seen to do nothing on Polaris 1.x."));
        }
      }
      if (a.value && LABEL_ATTRS.has(a.name)) {
        const text = a.value.text;
        if (/gid:\/\/shopify\//.test(text) && a.value.kind === "string") {
          out.push(finding("raw-gid-render", file, a.line, `<${t.tag} ${a.name}> holds a literal gid:// string.`, "Show a human name (resource type + number, or the title)."));
        } else if (a.value.kind === "expr" && /\$\{[^}]*(?:\.gid|[a-z]Gid|\bgid)\s*\}/.test(text)) {
          out.push(finding("raw-gid-render", file, a.line, `<${t.tag} ${a.name}> interpolates a gid into visible text.`, "Show a readable name instead of the raw id."));
        }
      }
    }
  }
  // JSX text: `>{row.gid}` or a line that is only `{productGid}`, and a literal gid:// between tags.
  clean.split("\n").forEach((raw, i) => {
    const line = raw.trim();
    if (!line) return;
    if (line.length > MAX_LINE_CHARS) { ctx.longLines++; return; } // minified code: the backtracking heuristics below are only safe on sane lines
    const re = /(^|>)\s*\{([^{}]*)\}/g;
    let m;
    while ((m = re.exec(line))) {
      const expr = m[2].trim();
      if (/^[\w$.?\[\]]+$/.test(expr) && isGidIdentifier(lastIdent(expr))) {
        out.push(finding("raw-gid-render", file, i + 1, `{${expr}} puts a gid into visible text.`, "Show a readable name (resource type + number, or the title) instead of the raw id."));
      }
    }
    if (line.includes("gid://shopify/") && />[^<{]*gid:\/\/shopify\/[^<{]*</.test(line)) {
      out.push(finding("raw-gid-render", file, i + 1, "A literal gid:// string sits in JSX text.", "Show a human name instead."));
    }
  });
  void lineOf;
}

function checkProject(root, files, ctx, out) {
  const pkg = readJson(join(root, "package.json"));
  const deps = { ...(pkg?.dependencies ?? {}), ...(pkg?.devDependencies ?? {}), ...(pkg?.peerDependencies ?? {}) };
  ctx.reactMajor = majorOf(deps.react);
  if (deps["@shopify/polaris"]) {
    out.push(finding("polaris-react-import", "package.json", 1, "package.json declares @shopify/polaris, which npm marks as deprecated by Shopify.", "Plan to remove it and keep only @shopify/polaris-types; web components need no import. Both can coexist while you migrate (silence with --ignore polaris-react-import)."));
  }
  return { pkg, deps };
}

function checkScripts(root, codeFiles, ctx, pkgInfo, out) {
  const urls = [];
  let providerImport = false;
  let providerFile = null;
  let providerHasUrl = false;
  let shopifyAppFile = null;
  let shopifyAppUrl = null;
  let providerUrl = null;
  let handTag = 0;
  const handTagFiles = new Set();
  for (const f of codeFiles) {
    const raw = readSource(f.path, ctx.skipped);
    if (raw == null) continue;
    try { scanScriptFile(f, stripComments(raw)); } catch { ctx.unscannable.push(f.rel); }
  }
  function scanScriptFile(f, src) {
    const lineOf = lineIndex(src);
    for (const m of src.matchAll(POLARIS_URL)) urls.push({ file: f.rel, line: lineOf(m.index), name: m[1] });
    if (/from\s+["']@shopify\/shopify-app-(react-router|remix)(\/[\w-]+)?["']/.test(src) && /\bAppProvider\b/.test(src)) { providerImport = true; providerFile = f.rel; }
    for (const t of scanTags(src, /AppProvider/y)) {
      const a = t.attrs.find((x) => x.name === "polarisUrl");
      if (a) { providerHasUrl = true; providerUrl = a.value?.kind === "string" ? a.value.text : a.value?.text?.trim() ?? null; }
    }
    const call = /\bshopifyApp\s*\(/.exec(src);
    if (call) {
      shopifyAppFile = f.rel;
      const body = src.slice(call.index, call.index + 4000);
      const m = /polarisUrl\s*:\s*([^,}\n]+)/.exec(body);
      if (m) shopifyAppUrl = m[1].trim().replace(/^["'`]|["'`]$/g, "");
    }
    for (const t of scanTags(src, /script/y)) {
      const s = t.attrs.find((x) => x.name === "src");
      if (s && /polaris/i.test(s.value?.text ?? "")) { handTag++; handTagFiles.add(f.rel); }
    }
    if (providerImport && providerFile === f.rel) {
      for (const t of scanTags(src, /script/y)) {
        const s = t.attrs.find((x) => x.name === "src");
        if (s && /polaris/i.test(s.value?.text ?? "")) {
          out.push(finding("script-duplicate", f.rel, t.line, "A hand-written Polaris <script> sits beside <AppProvider>, which already renders the tag.", "Remove your tag and set polarisUrl on AppProvider and on shopifyApp()."));
        }
      }
    }
  }
  for (const u of urls) {
    if (u.name === "polaris.js") {
      out.push(finding("script-unpinned", u.file, u.line, "polaris.js is the legacy unversioned entry point; it never serves 2.x.", "Use a versioned URL (polaris-1.js, or the 2.0 release-candidate URL) from ONE constant; see references/install-and-pinning.md."));
    }
  }
  const distinct = [...new Set(urls.map((u) => u.name))];
  if (distinct.length > 1) {
    const second = urls.find((u) => u.name !== urls[0].name);
    out.push(finding("script-duplicate", second.file, second.line, `Polaris URLs differ across the project (${distinct.join(", ")}).`, "Keep one exported constant and use it in the tag, in AppProvider and in shopifyApp()."));
  }
  if (providerImport && !providerHasUrl && !shopifyAppUrl) {
    out.push(finding("script-unpinned", providerFile, 1, "<AppProvider> and shopifyApp() are left to their default, which is the unversioned polaris.js (never 2.x).", "Set the same polarisUrl on both (needs @shopify/shopify-app-react-router 2.1.0 or later)."));
  } else if (providerImport && (providerHasUrl !== Boolean(shopifyAppUrl) || (providerUrl && shopifyAppUrl && providerUrl !== shopifyAppUrl))) {
    out.push(finding("url-mismatch", shopifyAppFile ?? providerFile, 1, "polarisUrl is not set identically on <AppProvider> and shopifyApp(); the browser would preload one bundle and run another.", "Pass the same constant to both."));
  }
  if (ctx.usesElements && !urls.length && !providerImport && !providerHasUrl && !handTag) {
    out.push(finding("script-missing", "(project)", 1, "s-* elements are used but no code that loads the Polaris script was found.", "Load the script once (references/install-and-pinning.md); skip this rule with --ignore script-missing if a platform layer outside this folder does it."));
  }
  // types vs script
  const typesRange = pkgInfo.deps["@shopify/polaris-types"];
  const scriptMajors = [...new Set(urls.map((u) => (u.name === "polaris.js" ? 1 : majorOf(u.name.replace(/^polaris-/, "")))).filter((n) => n != null))];
  const typesMajor = majorOf(typesRange);
  if (typesMajor != null && scriptMajors.length === 1 && scriptMajors[0] !== typesMajor) {
    out.push(finding("types-script-mismatch", "package.json", 1, `@shopify/polaris-types is ${typesRange} (major ${typesMajor}) but the script loaded is major ${scriptMajors[0]}.`, "Move the script URL and the types package together; see references/install-and-pinning.md."));
  }
  if (typesRange && !isExactVersion(typesRange)) {
    out.push(finding("types-unpinned", "package.json", 1, `@shopify/polaris-types is "${typesRange}", a range.`, "Pin the exact version. (For the 2.0 release candidate, Shopify's guide installs @shopify/polaris-types@^2.0.0-rc.0 and says to pin the exact version for reproducible installs.)"));
  }
  // tsconfig
  const ts = readJsonc(join(root, "tsconfig.json"));
  // A solution-style tsconfig (only `references`, no compilerOptions) delegates to files this check does not read.
  const solutionStyle = ts && !ts.compilerOptions && Array.isArray(ts.references);
  if (ts && ctx.usesElements && !solutionStyle) {
    const types = ts.compilerOptions?.types;
    if (Array.isArray(types) && ctx.hasTypeReference) {
      // `types` is an allowlist, but a /// <reference types="..."> or a side-effect import also declares the package.
    } else if (Array.isArray(types)) {
      if (!types.includes("@shopify/polaris-types")) out.push(finding("tsconfig-types", "tsconfig.json", 1, "compilerOptions.types is set (an allowlist) and does not name @shopify/polaris-types.", 'Add "@shopify/polaris-types" to types.'));
      if (ctx.usesAppNav && !types.includes("@shopify/app-bridge-types")) out.push(finding("tsconfig-types", "tsconfig.json", 1, "<s-app-nav> is used but @shopify/app-bridge-types is not in compilerOptions.types (that package declares it, not the Polaris one).", 'Add "@shopify/app-bridge-types" to types. Bumping the Polaris types does not fix this.'));
    } else if (!ts.extends && !ctx.hasTypeReference) {
      out.push(finding("tsconfig-types", "tsconfig.json", 1, "No compilerOptions.types and no reference to @shopify/polaris-types was found, so the s-* elements are not declared.", 'Add "types": ["@shopify/polaris-types"] (plus "@shopify/app-bridge-types").'));
    }
  }
}

/** Run every rule over `root`. Returns `{ findings, advice, notes, files, elementsSeen }`. */
export function check(root, opts = {}) {
  const ignore = new Set(opts.ignore ?? []);
  const ctx = { elementsSeen: 0, usesElements: false, usesAppNav: false, hasTypeReference: false, spreads: [], elements: null, reactMajor: null, skipped: [], unscannable: [], longLines: 0, scanned: 0 };
  const out = [];
  const jsxPaths = walk(root, [".tsx", ".jsx"]);
  const codePaths = walk(root, [".tsx", ".jsx", ".ts", ".js", ".mjs", ".cjs", ".html"]);
  const notes = [];
  const pkgInfo = checkProject(root, jsxPaths, ctx, out);
  ctx.elements = loadElements(root);
  if (!ctx.elements) notes.push("@shopify/polaris-types is not installed here, so unknown-prop and unknown-element were NOT checked and boolean props use a short built-in list.");
  for (const p of walk(root, [".ts", ".tsx", ".mts"], { dts: true })) {
    const text = readSource(p, ctx.skipped);
    if (text != null && /@shopify\/polaris-types/.test(text) && /reference\s+types|^\s*import\s+["']@shopify\/polaris-types/m.test(text)) ctx.hasTypeReference = true;
  }
  for (const p of jsxPaths) {
    const src = readSource(p, ctx.skipped);
    if (src == null) continue;
    try { scanJsxFile(p, src); ctx.scanned++; } catch { ctx.unscannable.push(rel(root, p)); }
  }
  function scanJsxFile(p, src) {
    if (/from\s+["']@shopify\/polaris(?!-types)["']|require\(\s*["']@shopify\/polaris(?!-types)["']\s*\)/.test(stripComments(src))) {
      const m = /from\s+["']@shopify\/polaris["']/.exec(stripComments(src));
      out.push(finding("polaris-react-import", rel(root, p), lineIndex(src)(m?.index ?? 0), "Imports @shopify/polaris, the React package that npm marks as deprecated by Shopify.", "Move to the web components (s-page, s-table…); they need no import. Both can coexist while you migrate."));
    }
    if (/<s-app-nav\b/.test(src)) ctx.usesAppNav = true;
    checkJsxFile(src, rel(root, p), ctx, out);
  }
  checkScripts(root, codePaths.map((p) => ({ path: p, rel: rel(root, p) })).filter((f) => !isTestFile(f.rel)), ctx, pkgInfo, out);
  const uniq = (a) => [...new Set(a)];
  if (ctx.skipped.length) notes.push(`${uniq(ctx.skipped).length} file(s) skipped, so nothing in them was checked: ${uniq(ctx.skipped).slice(0, 3).map((s) => rel(root, s.slice(0, s.lastIndexOf(" ("))) + s.slice(s.lastIndexOf(" ("))).join("; ")}${uniq(ctx.skipped).length > 3 ? "…" : ""}`);
  if (ctx.unscannable.length) notes.push(`${uniq(ctx.unscannable).length} file(s) could not be scanned (hostile or malformed nesting), so nothing in them was checked: ${uniq(ctx.unscannable).slice(0, 3).join("; ")}`);
  if (ctx.longLines) notes.push(`${ctx.longLines} very long line(s) (over 2000 characters, minified code) were skipped by the gid text heuristic.`);
  if (ctx.spreads.length) notes.push(`${ctx.spreads.length} s-* element(s) use {...spread}, so their props were not checked: ${ctx.spreads.slice(0, 3).join("; ")}${ctx.spreads.length > 3 ? "…" : ""}`);
  const kept = out.filter((f) => !ignore.has(f.rule));
  return {
    findings: kept.filter((f) => f.severity === "error"),
    advice: kept.filter((f) => f.severity === "advice"),
    notes: notes.map(printable),
    files: ctx.scanned,
    elementsSeen: ctx.elementsSeen,
  };
}

export function runCheck(argv, io = { log: console.log, err: console.error }) {
  const args = { root: process.cwd(), json: false, strict: false, ignore: [], list: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") args.json = true;
    else if (a === "--strict") args.strict = true;
    else if (a === "--list") args.list = true;
    else if (a === "--ignore") args.ignore = String(argv[++i] ?? "").split(",").filter(Boolean);
    else if (!a.startsWith("--")) args.root = a;
    else { io.err(`check: unknown option ${a}`); return 2; }
  }
  if (args.list) {
    for (const [id, [sev, text]] of Object.entries(RULES)) io.log(`${id.padEnd(24)} ${sev.padEnd(7)} ${text}`);
    return 0;
  }
  const bad = args.ignore.filter((r) => !RULES[r]);
  if (bad.length) { io.err(`check: unknown rule(s) in --ignore: ${bad.join(", ")} (see --list)`); return 2; }
  const r = check(args.root, { ignore: args.ignore });
  if (args.json) { io.log(JSON.stringify(r, null, 2)); }
  else {
    const show = (f) => { io.log(`${f.file}:${f.line}  [${f.rule}] ${f.message}`); io.log(`    fix: ${f.fix}`); };
    r.findings.forEach(show);
    if (r.advice.length) { io.log(`\nADVICE (${args.strict ? "counted because of --strict" : "does not change the exit code"}):`); r.advice.forEach(show); }
    r.notes.forEach((n) => io.log(`note: ${n}`));
  }
  if (r.files === 0) { io.err("check: VACUOUS: no .tsx or .jsx files found under " + args.root + ". A check that looked at nothing must not say ok."); return 2; }
  const count = r.findings.length + (args.strict ? r.advice.length : 0);
  if (!args.json) io.log(count ? `\n${count} finding(s) in ${r.files} file(s).` : `\nok: ${r.files} file(s), ${r.elementsSeen} s-* element(s) scanned, no findings.`);
  return count ? 1 : 0;
}
