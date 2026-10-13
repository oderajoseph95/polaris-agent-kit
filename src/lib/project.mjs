import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

export const SKIP_DIRS = new Set([
  "node_modules", ".git", "build", "dist", "out", ".next", ".react-router", ".remix", ".wrangler", ".shopify",
  "coverage", ".turbo", ".cache", ".polaris-agent-kit-cache", ".polaris-agent-kit", "vendor",
]);

/** Git-ignored cache that `refresh` writes and `init` git-ignores. One constant so the commands agree. */
export const CACHE_DIR = ".polaris-agent-kit-cache";
/** Committed folder where `init` puts the reference files for agents that have no skill folder. */
export const KIT_DIR = ".polaris-agent-kit";

export function walk(root, exts, { dts = false } = {}) {
  const out = [];
  const visit = (dir) => {
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.name.startsWith(".") && e.isDirectory() && e.name !== ".github") continue;
      const full = join(dir, e.name);
      if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) visit(full); }
      else if (e.isFile() && exts.some((x) => e.name.endsWith(x)) && (dts || !/\.d\.ts$/.test(e.name))) out.push(full);
    }
  };
  visit(root);
  return out;
}

/** A source file bigger than this is skipped and reported, never read whole (memory, and the scanners are linear only on sane input). */
export const MAX_FILE_BYTES = 2 * 1024 * 1024;
/** The line-oriented text heuristics skip a line longer than this (minified code) and say so. */
export const MAX_LINE_CHARS = 2000;

/** Read a source file as text, or null (and remember it in `skipped`) when it is too large or unreadable. */
export function readSource(file, skipped) {
  try {
    if (statSync(file).size > MAX_FILE_BYTES) { skipped?.push(`${file} (over ${MAX_FILE_BYTES / 1024 / 1024} MB)`); return null; }
    return readFileSync(file, "utf8");
  } catch { skipped?.push(`${file} (unreadable)`); return null; }
}

/** Text from a scanned codebase is untrusted: control characters (terminal escapes, bidi marks) never reach the output. */
export const printable = (s) => String(s).replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, "?");

export const rel = (root, f) => relative(root, f).split(sep).join("/");

export function readJson(file) {
  try { return JSON.parse(readFileSync(file, "utf8")); } catch { return null; }
}

/** tsconfig.json is JSONC: strip comments and trailing commas, then parse. Returns null when absent or unreadable. */
export function readJsonc(file) {
  if (!existsSync(file)) return null;
  try {
    const text = readFileSync(file, "utf8")
      .replace(/("(?:[^"\\]|\\.)*")|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, (m, str) => str ?? "")
      .replace(/,(\s*[}\]])/g, "$1");
    return JSON.parse(text);
  } catch { return null; }
}

export function isDir(p) {
  try { return statSync(p).isDirectory(); } catch { return false; }
}

/** The leading major number of a version or range such as `^2.0.0-rc.3`, `~1.1.0`, `2.0.0-rc.3`. null when none. */
export function majorOf(range) {
  const m = /(\d+)\.\d+/.exec(String(range ?? ""));
  return m ? Number(m[1]) : null;
}

export const isExactVersion = (range) => /^\d+\.\d+\.\d+([-+][\w.]+)?$/.test(String(range ?? "").trim());

/** Test files and fixtures often quote bad URLs on purpose; they must not count as the app loading a script. */
export const isTestFile = (relPath) => /(^|\/)(__tests__|__fixtures__|fixtures?|tests?|e2e)\//.test(relPath) || /\.(test|spec)\.[cm]?[jt]sx?$/.test(relPath);
