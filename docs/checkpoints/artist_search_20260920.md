# Artist search — 2026-09-20

Branch: `fix/artist-search-20260920`, based on `91e4c043f`.

## Behavior

- The shared Pokemon search path recognizes catalog-backed artist names and surnames, including `Ken Sugimori`, `ken sugimori`, and `Sugimori`.
- Explicit searches such as `artist ken sugimori` and the website Illustrator filter resolve capitalization against stored artist names.
- Normal card/set/number queries retain their existing path. Known artist names bypass the card-name scan; otherwise an empty text result can fall back to artist lookup.
- Mobile search help includes `artist Ken Sugimori`. The existing mobile Pokemon resolver uses the shared web endpoint, so the functional fix requires a web release; the help change requires a mobile release.
- Other games' native search paths are outside this change.

## Safety and performance

No database writes, migrations, worker changes, server restarts, or deployment were performed. Changes are isolated in `C:/grookai_vault_artist_search_20260920`.

The configured Supabase project matched `ycdxbpibncqcchqiihfz`. Read-only sanity checks returned 170,658 card prints, 3,399 sets, 32,903 card-print traits, and 208 vault-view rows.

The live endpoint returned cards for `artist Ken Sugimori` but none for `artist ken sugimori` or `Ken Sugimori`. Direct case-insensitive artist scans hit the public statement timeout. The fix resolves names using a checked-in snapshot of 416 distinct artists from visible canonical Pokemon rows, then performs equality reads using the ordinary public/session client. RLS remains authoritative for returned cards. Artist strings are passed as values, without wildcard or raw filter interpolation.

The existing bounded search behavior remains: up to 250 artist candidates, followed by normal ranking and response limits. Results are not a complete artist checklist.

## Verification

- `node --test tests/contracts/artist_search_v1.test.mjs tests/contracts/grookai_ai_search_boundary_v1.test.mjs tests/contracts/search_resolver_pricing_resilience.test.mjs`: 23 passed.
- Web `tsc --noEmit --incremental false`: passed.
- ESLint on the two changed TypeScript modules: passed.
- Managed pre-commit shipcheck: secret-packaging guard passed, then stopped because the isolated checkout has no `SUPABASE_DB_URL`. The local checkpoint uses the intentional `git commit --no-verify` path documented in `docs/contracts/AUTOMATED_SHIP_GUARDS_V1.md`. The full shipcheck has not passed; this is not a release-ready certification, and no push/deployment bypass was used.
- `node --check scripts/generate_pokemon_artist_names.mjs`: passed.
- Dart formatting check on `lib/main.dart`: no changes needed; the isolated checkout lacks Flutter package resolution, so no Flutter build/device test was claimed.
- Read-only public-client verification of the new lookup: lowercase exact name, full name, surname with English scope, Japanese scope, and unknown artist all behaved correctly; 272–708 ms in the measured run.
- Read-only invocation of the actual search pipeline with the public client: `Ken Sugimori` returned 64 rows in 1,512 ms; `Sugimori` returned 64 rows in 638 ms; explicit lowercase artist discovery returned 88 candidates in 2,327 ms before the API response limit. All returned rows had the expected artist. No deployed endpoint or device test of the new version has occurred.

## Refresh and release

Run `node scripts/generate_pokemon_artist_names.mjs` with the canonical environment configured after artist metadata changes, and commit the resulting `pokemonArtistNames.json`. The generator uses a read-only transaction and guards environment routing and unexpectedly small snapshots. New artists remain searchable through an explicit artist filter using their exact stored spelling before a refresh; capitalization and surname recognition for those new names require the refreshed snapshot.

Release smoke checks: search for `Ken Sugimori`, `Sugimori`, `artist ken sugimori`, and a normal card query on web and native Pokemon search. Check English/Japanese scope and ordinary result actions. Deployment is pending.

## Authorized deployment integration

The founder requested deployment. The release candidate is isolated at
`C:/grookai_vault_artist_release_20260920`, branch `release/artist-search-20260920`,
based on verified live/main `3f42d5602bd8b28b4b312f8dbecf22df85d56479`.
Only the artist-search commit is imported; the older branch's unrelated lot
changes are excluded. Conflicts were resolved by retaining main's newer bounded
set/nickname search and game-specific mobile examples. Known artists use the
existing complete Pokemon result pipeline; ordinary queries retain main's
unchanged path rather than the original candidate's empty-result fallback.

Rollback baseline: Vercel `dpl_Es17YaPvyDRUfFYmqAUMfE68a3F5`,
`grookai-vault-hg2awcfxx-sosejis-projects.vercel.app`, verified as the deployment
serving `grookaivault.com`. Deployment must be followed by direct live readback.

The full shipcheck uses verified local API `127.0.0.1:54321` and database
`127.0.0.1:54330`; inherited production credentials are removed. The Docker
management command did not respond, but independent PostgreSQL and HTTP reads
proved the existing local services healthy. No service was restarted or reset.
Private logs and receipts are under
`C:/grookai_vault_operator_artifacts/artist_search_20260920`.

The integrated candidate's complete `npm run shipcheck` passed (exit 0): 4,034
contract tests, runtime preflight/health/reports, web typecheck and full lint,
strict web build, Flutter analysis, and 728 Flutter tests. The source uses
identical-lock dependency installations. The documented intentional commit/push
hook bypass is used only to avoid repeating this completed full gate; it does
not waive a failed release check. The original candidate's missing-environment
gate is superseded by this verified local release run.
