# Pokémon playables release candidate — November 18, 2026

## Candidate

Branch: `feat/pokemon-playables-v1-release`, originally based on main
`32ed631b5f173de26ef5f45b1dae6f849cc1c282`, advanced before release to
`8199a0feab42627bab8c548e32728a788390959d`. The isolated checkout is
`.tmp/pokemon_playables_release_checkout_20261118`. The original working branch
and its unrelated changes were left in place.

The release adds current Pokémon Standard usage, `playable` / `playables` search,
and expiring badges in grid, list, table and card detail views. It retains main's
complete search, filters, pagination, ownership boundaries and Winter theme.
Known printings with identical structured mechanics share usage support,
including artwork and rarity versions. The initial 292-member metadata cohort
is bounded coverage; this is not an exhaustive playable-card list or a separate
certification of every physical printing's tournament legality.

No schema migration, canonical writer, price writer or ownership change is part
of this candidate. Legacy helper modules are included only as the runtime import
closure for retained evidence validation. The usage path does not require
per-card manual review or tournament results.

## Existing live aggregate

The private worker publication was read back successfully before release
preparation:

- Run: `517e0072-1142-4b48-b488-2645b1cd6c9c`.
- Snapshot: `0c079415fa6f847e01ea15ab8b3c6da2dce09bb581ae1c8aff9a773e104b36a3`.
- Published at `2026-11-18T11:55:26.737Z`; expires at
  `2026-11-19T11:55:26.737Z`.
- 147 qualified printings from 68 lists across five completed physical Standard
  events dated within the rolling 30 days.
- Canonical counts: 173,837 card prints, 3,420 sets, 47,409 print traits and
  323 Vault items. No canonical data was changed by release preparation.

Both `standard-usage/current.json` and `standard-usage/refresh-seed.json` remain
private in `pokemon-playables-private`. The web server emits only the validated
projection. The metadata seed retention deadline is
`2026-11-23T05:55:26.734Z`; an expired seed requires fresh bootstrap input.

## Verification

Completed in the isolated checkout:

- 18 backend usage/refresh tests; nine web feature tests.
- 38 existing artist, collector-number and MTG search/boundary regression tests.
  Three fixture mocks were extended for the new optional playables dependency;
  existing assertions remain intact.
- Web typecheck, focused lint and strict production build with Next.js 16.4.6.
- Winter visual guard and source-artwork/brand preservation checks.
- Real local production browser readback, using the actual private aggregate:
  desktop 1365 × 900 and mobile 390 × 844 showed badges without horizontal
  overflow. The first result page contained 24 cards out of 147.
- `playables Ultra Ball` returned only `GV-PK-MEG-131`. The Academy at Night
  detail page displayed its Playable badge. No account or collection writes
  were performed; the isolated browser blocked non-read HTTP methods.
- `/api/playables` returned HTTP 200 and 147 rows with only `card_print_id`,
  `gv_id`, `lists` and `events`. Successive resolver pages returned different
  playable IDs with total 147 and correct offsets. An MTG playable request
  returned HTTP 400 with the English physical Pokémon Standard scope message.

Evidence is retained locally under `.tmp/pokemon_playables_browser_20261118`
(desktop, mobile, named-search and detail screenshots and readback scripts),
and `.tmp/pokemon_playables_release_*_20261118.txt` (test/build logs). Local
anonymous navigation returned its expected 401; the local Vercel analytics
script returned 404. Neither affected playables. Source originals and secrets
are not publication artifacts.

The full `npm run shipcheck` completed with exit code 0. It passed secret
packaging and runtime preflight, 8,758 contract tests (11 skipped), 12 seller
tests, 120 Square tests, 19 vendor-pricing tests, runtime health/report gates,
full web typecheck/lint/strict build, Flutter analysis and 2,058 Flutter tests
(two skipped). The initial attempt's test-fixture failures and successful
targeted rerun remain preserved alongside the final successful log.

The reviewed candidate was captured as immutable Git tree
`fc4da25a1a4a80c83fee545f3417670ab773416a`. The owner replied “Next step” to the
explicit publication/merge/activation request on November 18, authorizing that
release. Main's subsequent Vault and identity-search changes were brought in
before the release commit. The playables implementation is unchanged; the
normal managed commit and push hooks must verify the integrated candidate.

## Publication boundary

PR #953 review identified two supported failure cases before merge. Repository
set captures now renew every pinned set/card/license original and revalidate the
wrapper with the existing set reader. Insufficient overall decklist evidence
now produces an explanatory, uncached HTTP 503 search response instead of a
normal empty result. Regression coverage passes 19 backend tests and ten web
feature tests, including changed pinned bytes and suppressed search discovery.
The reviewed fixes must pass the normal commit/push hooks and hosted checks.
CodeQL also identified a dynamic regular expression in the project sanity
check. Static config parsing now precedes the exact canonical-project comparison;
CLI input is never compiled as a regular expression.

The twice-daily refresh workflow is prepared for 06:23 and 18:23 UTC. Canonical
repository Actions secret names `SUPABASE_URL` and `SUPABASE_SECRET_KEY` exist;
the former was configured with the canonical public URL, and the existing
secret key was not exposed or replaced. Credential validity in hosted Actions
must be demonstrated by an actual successful workflow run.

The repository is public. Publication, merge, website deployment and scheduler
activation are owner-authorized. They remain unverified until direct hosted
readback. Commit the integrated candidate through normal managed hooks, publish it,
complete hosted review/checks, merge, read
back the Vercel deployment, run and read back the refresh workflow, and verify
production search, detail badges and freshness. Preserve the previous private
publication on collection failure. Do not report a prepared workflow or local
browser readback as proof of a hosted release.
