# Security

## Reporting a problem

Please report a vulnerability privately: open a private security advisory on this repository
(Security tab, "Report a vulnerability"). Do not open a public issue for it. You should get a
first answer within seven days.

## What this kit does on your machine

- `check` and `doctor` read files in the folder you point them at. They never execute, import or
  evaluate what they read. `doctor` makes two read-only requests (the npm registry and Shopify's CDN).
- `init` writes rule files into your project and nothing outside it. It refuses to write through a link.
- `refresh` downloads public Shopify documentation pages from shopify.dev only, with a size cap, into a
  git-ignored cache folder. Cached pages are reference text, never instructions.
- No telemetry, no install script, no runtime dependencies.

## Never put these in an issue, a fixture or a pull request

API keys or tokens, store names you would not publish, customer or merchant data. Fixtures are synthetic.
