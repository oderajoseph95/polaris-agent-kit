# Versioning and changelog policy

## The kit's own version

Semantic versioning for the CLI and the rules: `MAJOR.MINOR.PATCH`.

- MAJOR: a `check` rule is removed or its meaning is reversed, a CLI flag is removed, or `init` writes to a different path.
- MINOR: a new `check` rule, a new reference file, a new agent adapter, a new command.
- PATCH: fixes to wording, a false positive, a broken URL.
- Pre-release tags (`0.1.0-draft.1`) until the first public release. Everything is draft until then.

## Which Polaris it covers

The kit says in `docs/PROVEN-ON.md` exactly which Polaris script, which `@shopify/polaris-types` version and which React it was proven on. That is separate from the kit's own version.

- When Shopify promotes a release (for example the 2.0 candidate becoming stable at a new URL), `doctor` shows the difference and the kit gets a MINOR release that updates the matrix and every rule that cites the old URL. Until a rule is re-proven on the new version its entry in the matrix says UNPROVEN.
- The kit never claims a Polaris behaviour it did not observe. A claim is (a) proven on a named stack, (b) cited to a Shopify URL with the date fetched, or (c) labelled UNPROVEN.

## Changelog

`CHANGELOG.md` follows Keep a Changelog headings (Added, Changed, Fixed, Removed). Every release lists: rules added or changed, the proven-on matrix row it affects, and any Shopify page that changed meaning (cite the URL and the date read).

## Deprecating a rule

A rule that stops being true on the current Polaris is first marked `advice`, then removed one MINOR later, and the mistake stays in `references/mistakes.md` with a note saying which version fixed it.

## Staleness

If `docs/PROVEN-ON.md` is more than 90 days old and `doctor` shows a newer Polaris channel than the matrix lists, treat the kit's Polaris-behaviour statements as UNPROVEN until it is re-proven, and say so.
