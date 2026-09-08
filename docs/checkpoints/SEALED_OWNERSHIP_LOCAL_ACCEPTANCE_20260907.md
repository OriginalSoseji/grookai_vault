# Sealed Ownership Local Acceptance

Updated: 2026-09-07 America/Denver (final evidence extends into 2026-09-08 UTC).
Status: implemented and locally verified; NOT applied, deployed or activated in production.

Worktree: `C:/grookai_vault_pokemon_sealed`; branch:
`feature/sealed-owned-collectibles-v1`. Original base:
`0688a21a1d5f54c4d0c90dabfebe43927bb4e98a`.
Preserve the root and other worktrees. Do not repeat ingestion or image acquisition.

## Implemented

- Real sealed variant anchor in `vault_item_instances`, one GVVI per physical
  copy, explicit seal/package condition and acquisition currency. No fake card IDs.
- Request-bound, retry-safe addition and archive/sale/trade with cash and optional
  counterparty. Direct archival cannot bypass the lifecycle journal. Competing
  dispositions commit once. No guessed counterparty inventory or ownership transfer.
- Governed per-copy market read model and currency-separated totals. Unknown,
  damaged or opened copies remain owned but unpriced. Asking price never replaces
  market value. Cards/slabs retain their existing identity and pricing paths.
- Flutter and web Vault, management, Wall sections, exact-copy GVVI links, QR,
  printing, archive/bulk removal, history, private notes and front/back photos.
  Photo sharing is explicit and defaults private. Flutter vendor mode is wired.
- Flutter mixed card/sealed lots retain typed identity. Web sealed lots generate
  front/back PNGs with centered odd final rows and separate asking/market prices.
  Web does not introduce mixed card/sealed selection for its old card-only
  component. Flutter lot backs retain the existing itemized details format;
  personal back photos remain available on the copy landing.
- Native addition refreshes cached owned panels after confirmed readback.
  Mixed-removal errors accurately report completed sealed removals.
- Both client ownership flags and the database add control default off.

## Verified Evidence

Artifact root: `C:/grookai_vault_operator_artifacts/sealed_ownership/`.

| Evidence directory | Result |
| --- | --- |
| `2026-09-08T00-05-51-301Z_checks` | 94 Node contracts, 38 Flutter tests and 12 web tests pass; Flutter analysis, TypeScript, targeted ESLint and diff check pass |
| Same directory, `precommit-full.log` | Full repository hook passes: 3,145 contracts passed / one skipped / zero failed, 686 Flutter tests, full Flutter analysis, web lint/typecheck and production web build; read-only live runtime gate passes with known deferred debt |
| `2026-09-08T00-09-45-310Z_fixtures` | 35 PostgreSQL scenarios including actual concurrency; real local Auth/Storage uploads and exact byte readback pass |
| `2026-09-08T00-10-01-489Z_replay` | Strict four-pending-ID PrePush plus full fresh replay pass; 32 post-replay rollback scenarios pass |
| `2026-09-07T23-50-49-012Z_fixtures` | Browser mobile editor screenshot, desktop five-copy front/back lot screenshot, photo/QR DOM readback |
| `2026-09-08T00-04-43-167Z_android` | Final local x64 Android APK, native automatic 24-to-25-copy refresh, sale/history XML and screenshot |
| `2026-09-07T23-57-37-629Z_android` | Earlier build and native cross-client readback of web-saved asking price/condition |

The browser rendered two decoded five-copy lot images, 1192x1068 and 1192x1258.
The first copy used the uploaded nonpersonal test asset on both sides; absent
images on other synthetic copies were explicit, not fabricated product evidence.
Native sign-in, addition, immediate count refresh, sale withdrawal and retained
USD 25 sale history were exercised on `emulator-5554`. The web-saved USD 45.50
asking price and condition appeared in the native Vault.

The final Android APK is LOCAL EMULATOR ONLY, points to `10.0.2.2:55429`, and
contains only the disposable publishable key. The preserved binary is
`2026-09-08T00-04-43-167Z_android/sealed-local-emulator.apk`; later full-hook
`flutter clean` removes the build-directory copy. Do not distribute it or install it
over the founder's production Samsung app. Samsung was not modified. The emulator
was shut down after verification. Native print/share OS dialogs and iPhone have
not been accepted for this feature. Browser file-chooser automation failed;
authenticated Storage upload/readback and rendered front/back photos passed.

All SQL used `supabase_db_sealed-ownership-replay-20260907`, port 55430. The
concurrency/media tests deliberately committed synthetic fixtures. The final
fresh replay removed their database metadata. Final readback: zero sealed copies,
add control false, all four pending migration IDs present locally. Normal tests
roll back. Original local Supabase on port 54330 and production are untouched.
Resetting the database is NOT proof that Docker Storage files were removed.
Test-object paths are retained in the media logs.

## Reproduce Safely

`node tests/integration/sealed_verification_v1.mjs checks` captures tests/log hashes.
`fixtures` runs local concurrency and local media verification.
`android` builds only for the isolated x64 emulator.
`replay` runs strict pending-set/full replay then rollback tests; use ONLY the
isolated replay project. Never reset the populated original project.
`node tests/integration/sealed_local_web_v1.mjs` starts a loopback-only UI harness
with synthetic Auth fixtures. It never reads production configuration.

## Remaining Release Gate

Four production migrations are still unapplied:

1. `20260905120000_mtg_sealed_image_dimension_constraint_repair_v1.sql`
2. `20260907160000_production_function_source_replay_reconciliation_v1.sql`
3. `20260907180000_sealed_owned_instances_v1.sql`
4. `20260907183000_sealed_owned_read_models_v1.sql`

Generate the frozen plan from committed source with
`node scripts/schema/sealed_ownership_rollout_plan_v1.mjs <artifact-directory>`.
It records committed SQL hashes, disk hashes, source SHA and rollout boundaries.
It is NOT a writer or authorization. The earlier two-ID baseline reconciliation
does not authorize ignoring the new ownership schema footprint.

Next execution must follow the exact production migration approval boundary,
fresh ledger/hash/environment checks, bounded locks, schema and grant readback,
default-off client deployment, then one bounded authorized owner lifecycle canary.
Prove disable/restore, cross-client totals and privacy before activation. Preserve
all owned history on rollback; do not delete data or undo additive schema.

Only after production readback, signed-in client acceptance and deliberate flag
activation may this work be called live or complete. No production ownership,
schema, Storage, pricing, release pointer, catalog, deployment or flag writes
were performed. No TestFlight release was made.
