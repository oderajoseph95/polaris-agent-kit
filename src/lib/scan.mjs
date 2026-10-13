// A small, dependency-free scanner for JSX/HTML-ish source. It is NOT a parser: it finds the opening tags of
// custom elements named `s-*` and returns their attributes with line numbers. Known limit (fails loud, never silent):
// a STRING that quotes a tag (`"<s-box fooBar>"`) is read as a tag.

/**
 * Replace `//` and block comments with spaces, keeping every newline and offset. A `//` counts as a comment only at
 * the start of a line or after whitespace, so a URL (`https://x`), a protocol-relative URL (`src="//cdn.example/a.png"`)
 * and a path (`'a//b'`) inside a string are kept intact.
 */
export function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[\s;{}()])(\/\/[^\n]*)/gm, (m, pre, c) => pre + c.replace(/[^\n]/g, " "));
}

/** Index just past the string or template literal starting at `i` (which holds the opening quote). */
function skipString(src, i) {
  const q = src[i];
  i++;
  while (i < src.length) {
    const ch = src[i];
    if (ch === "\\") i += 2;
    else if (ch === q) return i + 1;
    else if (q === "`" && ch === "$" && src[i + 1] === "{") i = skipBraces(src, i + 1);
    else i++;
  }
  return i;
}

/** Index just past the `{...}` starting at `i`, honouring strings and nested braces. */
function skipBraces(src, i) {
  let depth = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === '"' || ch === "'" || ch === "`") {
      i = skipString(src, i);
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return i + 1;
    }
    i++;
  }
  return i;
}

export function lineIndex(src) {
  const starts = [0];
  for (let i = 0; i < src.length; i++) if (src[i] === "\n") starts.push(i + 1);
  return (offset) => {
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid] <= offset) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  };
}

/**
 * Every opening tag whose name starts with `s-` (or, when `tagPattern` is given, matches it).
 * Returns `{ tag, line, start, end, selfClosing, attrs: [{ name, line, value }], spread }` where `value` is
 * `null` (a bare attribute), `{ kind: "string", text }` or `{ kind: "expr", text }`.
 */
export function scanTags(src, tagPattern = /s-[a-z][a-z0-9-]*/y) {
  const out = [];
  const lineOf = lineIndex(src);
  for (let i = 0; i < src.length; i++) {
    if (src[i] !== "<") continue;
    tagPattern.lastIndex = i + 1;
    const m = tagPattern.exec(src);
    if (!m || m.index !== i + 1) continue;
    const next = src[i + 1 + m[0].length];
    if (next !== undefined && !/[\s/>]/.test(next)) continue;
    const tag = m[0];
    let j = i + 1 + tag.length;
    const attrs = [];
    let spread = false;
    let selfClosing = false;
    while (j < src.length) {
      while (j < src.length && /\s/.test(src[j])) j++;
      const ch = src[j];
      if (ch === ">") { j++; break; }
      if (ch === "/" && src[j + 1] === ">") { selfClosing = true; j += 2; break; }
      if (ch === "{") {
        const end = skipBraces(src, j);
        if (/^\{\s*\.\.\./.test(src.slice(j, end))) spread = true;
        j = end;
        continue;
      }
      const nm = /^[A-Za-z_:][\w:.-]*/.exec(src.slice(j, j + 80));
      if (!nm) { j++; continue; }
      const name = nm[0];
      const attrLine = lineOf(j);
      j += name.length;
      let k = j;
      while (k < src.length && /\s/.test(src[k])) k++;
      if (src[k] !== "=") { attrs.push({ name, line: attrLine, value: null }); continue; }
      k++;
      while (k < src.length && /\s/.test(src[k])) k++;
      if (src[k] === '"' || src[k] === "'") {
        const end = skipString(src, k);
        attrs.push({ name, line: attrLine, value: { kind: "string", text: src.slice(k + 1, end - 1) } });
        j = end;
      } else if (src[k] === "{") {
        const end = skipBraces(src, k);
        attrs.push({ name, line: attrLine, value: { kind: "expr", text: src.slice(k + 1, end - 1) } });
        j = end;
      } else {
        j = k;
      }
    }
    out.push({ tag, line: lineOf(i), start: i, end: j, selfClosing, attrs, spread });
    i = Math.max(i, j - 1);
  }
  return out;
}

const HTML_VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);
// Lowercase TypeScript type names that can follow `<` in a generic (`useState<string>`); never JSX.
const TS_TYPE_WORDS = new Set(["string", "number", "boolean", "unknown", "any", "never", "void", "object", "null", "undefined", "symbol", "bigint"]);

/**
 * For every opening tag (`s-*`, lowercase HTML or a Capitalised component) its enclosing tag name, or `null` at the top.
 * Returns `Map<start offset, parent tag>`. A heuristic nesting pass, not a parser: a `<` glued to the end of an identifier
 * (`useState<string>`) is a generic, not a tag, and an unmatched closing tag is ignored. When the nesting is unclear the
 * parent is a Capitalised component or HTML tag, which callers treat as "unknown", so the failure is a missed finding,
 * never an invented one.
 */
export function tagParents(src) {
  const events = [];
  for (const t of scanTags(src, /[A-Za-z][\w.:-]*/y)) {
    const glued = t.start > 0 && /[\w$)\]]/.test(src[t.start - 1]);
    if (glued || TS_TYPE_WORDS.has(t.tag)) continue;
    events.push({ at: t.start, open: true, tag: t.tag, selfClosing: t.selfClosing || HTML_VOID.has(t.tag) });
  }
  for (const m of src.matchAll(/<\/([A-Za-z][\w.:-]*)\s*>/g)) events.push({ at: m.index, open: false, tag: m[1] });
  events.sort((a, b) => a.at - b.at);
  const parents = new Map();
  const stack = [];
  for (const e of events) {
    if (e.open) {
      parents.set(e.at, stack.length ? stack[stack.length - 1] : null);
      if (!e.selfClosing) stack.push(e.tag);
    } else {
      const i = stack.lastIndexOf(e.tag);
      if (i >= 0) stack.length = i;
    }
  }
  return parents;
}
