# PRINT_IDENTITY_SEARCH_V1 Phase 1 Verification

Date: 2026-05-19

## Scope

This verification covers the Phase 1 print-identity search foundation:

- parent `card_prints.gv_id` search documents
- child `card_printings.printing_gv_id` search documents
- parent route resolution for child printings via query context
- web/mobile read-model support for finish-aware search results
- no public child printing card routes

## Migration Status

Applied migrations:

- `20260519190000_print_identity_search_v1.sql`
- `20260519193000_print_identity_search_v1_public_document_ids.sql`

The second migration was added after remote smoke found that the first implementation exposed UUID-bearing `search_document_id` values. The corrective migration makes document IDs public-ID based:

- parent: `parent:<parent_gv_id>`
- child: `child:<printing_gv_id>`

It also keeps the implementation routed through parent card pages for child printing matches.

`supabase db reset --local` completed successfully after replaying both migrations.

Ledger note: `supabase migration list --linked` could not complete in this shell because `SUPABASE_DB_PASSWORD` is not set and the Supabase CLI login role failed password auth. Linked `supabase db query --linked` worked and was used for read-only remote smoke verification. This is recorded as environment credential/tooling debt, not schema drift evidence.

## SQL Smoke Results

Remote read-only SQL smoke passed through `supabase db query --linked`.

Search document counts:

| Object type | Count |
| --- | ---: |
| `parent_print` | 21,839 |
| `child_printing` | 45,284 |

Exact child printing lookup:

- Query: `GV-PK-ME03-033-RH`
- Returned `object_type`: `child_printing`
- Returned `search_document_id`: `child:GV-PK-ME03-033-RH`
- Returned parent route: `/card/GV-PK-ME03-033`
- Returned route query: `printing=GV-PK-ME03-033-RH`
- Returned display discriminator: `Reverse Holo`

Exact parent lookup:

- Query: `GV-PK-ME03-033`
- Returned parent document: `parent:GV-PK-ME03-033`
- Also returned child context for `GV-PK-ME03-033-RH`

Finish term checks:

- `masterball` returns `child_printing` rows with `Master Ball` discriminator and `-MB` printing IDs.
- `pokeball` returns `child_printing` rows with `Poké Ball` discriminator and `-PB` printing IDs.
- `reverse holo espurr` returns `child_printing` rows with `Reverse Holo` discriminator and `-RH` printing IDs.

UUID exposure check:

- Raw UUID-bearing `search_document_id` count for `GV-PK-ME03-033-RH`: `0`

Public child route boundary:

- `card_prints.gv_id = 'GV-PK-ME03-033-RH'`: `0`
- `card_printings.printing_gv_id = 'GV-PK-ME03-033-RH'`: `1`

This confirms exact child printing search resolves to parent route context and does not enable `/card/<printing_gv_id>`.

## Web And Contract Verification

Passed:

- `npm run contracts:test`
  - 74 tests passed.
- `npm run contracts:runtime-health`
  - `ok: true`
  - 0 failed checks.
- `npm --prefix apps/web run typecheck`
- `npm --prefix apps/web run lint`
  - Passed with existing `WarehouseSubmissionForm.tsx` `<img>` warning.
- `npm --prefix apps/web run build`
  - Build completed successfully.
  - Same existing warehouse `<img>` warning.
- `npm run preflight`
  - `PASS_WITH_DEFERRED_DEBT`
  - 0 critical failures.
- `git diff --check`

## Mobile / Dart Status

`dart --version` completed:

- Dart SDK `3.9.0`

The following commands hung after stale Dart processes were cleared:

- `flutter --version`
  - timed out after approximately 124 seconds
- `flutter analyze lib/models/card_print.dart`
  - timed out after approximately 184 seconds
- `dart format --set-exit-if-changed lib/models/card_print.dart`
  - timed out after approximately 124 seconds

Stale `dart.exe` processes were stopped after timeout. This is classified as local Flutter/Dart toolchain debt. It does not invalidate the DB/web search verification, but it does leave targeted mobile static verification incomplete.

## Route And Identity Confirmations

- `/card/<printing_gv_id>` remains disabled.
- Child printing search results route to `/card/<parent_gv_id>?printing=<printing_gv_id>`.
- Parent `card_prints.gv_id` semantics were not changed.
- Species Dex denominator logic was not changed.
- Scanner code was not touched.
- Search RPC no longer returns raw UUID-bearing public document IDs.

## Result

`PRINT_IDENTITY_SEARCH_V1` Phase 1 is verified for DB replay, remote search behavior, web build behavior, and contract/runtime checks.

Remaining follow-up:

- Repair local Supabase CLI migration ledger auth by setting the correct `SUPABASE_DB_PASSWORD` in the operator shell.
- Repair local Flutter/Dart tooling hang before treating mobile analyzer/format checks as reliable.
