# Approved combined-search release

The user approved deploying the shared search service and delivering iOS 1.0.0
(327) through the existing TestFlight audience. This supersedes the preparation
documents' pending-deployment status. No catalog mutation, migration or public
App Store submission is included.

PR #510 merged as `2f8c225ff389826347a931e92c7fbec08d02244d`. Its production
candidate was built separately while automatic custom-domain assignment was
paused. The live rollback target remained `dpl_8pGjGm9tHyk9i6i3gxJ9hpaiFyhF`.
The preview build's activation-guard failure is distinct from the successful
production-configured build. Core Flutter/contracts and the visual/accessibility
PR checks passed; CodeQL reported neutral aggregate status.

## Original-spelling follow-up

Staged live-catalog checks found that correction undo converted an artist filter
into unqualified quoted text, causing a catalog-wide text lookup. On production
data that path hit the database statement timeout and correctly returned a visible
503. It was not an empty result or a passing acceptance case.

The follow-up keeps the artist criterion while restoring its literal spelling.
The generated query uses `artist: "Yuka Morri"`, retaining Wurmple and the finish.
The parser resolves that explicit literal before interpreting other words, uses
the existing equality-based artist read, and does not correct it again. Ordinary
unqualified quoted text retains its prior literal-text meaning. The artist filter
remains removable. No client rebuild, privilege change or schema change is needed;
build 327 already consumes the service-provided correction-undo query.

A regression verifies the complete correction/undo parse round trip, residual
card text, finish and artist-filter removal. The original failed candidate and
read-only diagnostics remain private evidence. A broad staged 5ban any-holo query
returned 1,700 recorded printings in 8.45 seconds; complete pagination and live
promotion checks follow the repair.

The follow-up full shipcheck passed: 4,051 contracts, four documented skips,
736 Flutter tests, web typecheck/lint/strict build and Flutter analysis. Local API
readback returns 200 with zero matches for the restored misspelled artist and
retains both Wurmple and reverse-holo constraints. Native source is unchanged.

Private evidence: `combined_search_20260922/release-plan.json`, `merge.json`,
`candidate.json`, `staged-query-diagnostic.json`, `parent-*-diagnostic.json`,
`staged-scale-diagnostic.json`, and `literal-artist-shipcheck*`.
