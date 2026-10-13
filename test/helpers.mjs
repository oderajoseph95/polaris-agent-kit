import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

/** Make a throw-away project folder from `{ "path": "text" }`. Returns `{ dir, done }`. */
export function project(files) {
  const dir = mkdtempSync(join(tmpdir(), "pak-"));
  for (const [rel, text] of Object.entries(files)) {
    if (text === undefined) continue; // an override of `undefined` deletes a file from the base project
    const p = join(dir, rel);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, typeof text === "string" ? text : JSON.stringify(text, null, 2));
  }
  return { dir, done: () => rmSync(dir, { recursive: true, force: true }) };
}

/** A minimal, fully compliant app: one pinned script, types listed, camelCase props. */
export const GOOD = {
  "package.json": { dependencies: { react: "^18.3.1", "@shopify/polaris-types": "2.0.0-rc.3" } },
  "tsconfig.json": '{\n  // jsonc is allowed\n  "compilerOptions": { "types": ["vite/client", "@shopify/polaris-types", "@shopify/app-bridge-types"], },\n}\n',
  "app/polaris.ts": 'export const POLARIS_SCRIPT_URL = "https://cdn.shopify.com/shopifycloud/polaris-2.0-rc.js";\n',
  "app/root.tsx": `import { POLARIS_SCRIPT_URL } from "./polaris";
export default function Root() {
  return (
    <html>
      <head>
        <script src={POLARIS_SCRIPT_URL}></script>
      </head>
      <body>
        <s-page heading="Changes" inlineSize="large">
          <s-section padding="none">
            <s-table loading={busy || undefined} paginate hasNextPage={more || undefined}>
              <s-table-header-row>
                <s-table-header listSlot="primary">Name</s-table-header>
                <s-table-header listSlot="labeled" aria-label="when">When</s-table-header>
              </s-table-header-row>
              <s-table-body>
                <s-table-row clickDelegate="open-1">
                  <s-table-cell><s-link id="open-1" href="?open=1">{row.title}</s-link></s-table-cell>
                  <s-table-cell>{when}</s-table-cell>
                </s-table-row>
              </s-table-body>
            </s-table>
          </s-section>
          <s-button slot="primary-action" variant="primary" disabled>Save</s-button>
        </s-page>
      </body>
    </html>
  );
}
`,
};
