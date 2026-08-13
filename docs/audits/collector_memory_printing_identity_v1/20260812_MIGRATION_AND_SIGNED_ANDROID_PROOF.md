# Collector Memory Printing Identity V1 - Migration And Signed Android Proof

Date: 2026-08-12

Status: COMPLETE

## Frozen Provenance

- Source branch: `main`
- Feature implementation commit: `8493eb3a0d1822d18617f4f8faf1d2c6e6fa20c1`
- CI stabilization and release commit: `a12e8a230e5ac6a2ebb2b71088b6cf09888d9c04`
- Migration: `20260812183000_collector_memory_printing_identity_v1.sql`
- Migration SHA-256:
  `B666D783E06A92A9D6F3DD19FFC3CCD7BA70B2AAE822DFE13009BDB93F26A529`
- Supabase project: `ycdxbpibncqcchqiihfz`

The tracked worktree was clean, and `HEAD` matched `origin/main`, before the
database apply.

## CI Proof

The release commit passed all relevant GitHub workflows:

- Flutter CI: run `31660604010`, success
- Flutter Build Signed APK: run `31660604012`, success
- CodeQL `Push on main`: run `31660603687`, success
- Guard: No Legacy Keys: run `31660604007`, success

The unrelated Dependabot `nanoid` update job `31660612680` failed inside
Dependabot update generation. It did not build, test, sign, or deploy this
release commit and is not a release-gate failure for this change.

The renderer golden gate passed on Windows after pinning Flutter `3.44.9` and
using a bounded `0.5%` raster tolerance. Exact dimensions remain mandatory;
the tolerance only absorbs host rasterization differences. The largest known
renderer drift from the failed pre-repair run was `0.36%`.

## Migration Preflight

The current release worktree was linked to the production project before
preflight. Its migration ledger contained:

- zero remote-only migrations;
- exactly one local-only migration: `20260812183000`;
- no duplicate pending migration timestamps or duplicate pending database
  objects.

`scripts/migration_preflight_strict.ps1` passed with:

```text
Phase: PrePush
Expected local-only: 20260812183000
Actual local-only: 20260812183000
Pending migration object scan: passed
Local supabase db reset/replay: passed
```

The full local replay applied the complete migration history through
`20260812183000` successfully before production was touched.

## Production Apply

The governed Supabase migration command applied exactly:

```text
Applying migration 20260812183000_collector_memory_printing_identity_v1.sql...
```

No collector row was inserted, updated, deleted, archived, approved, or
published. The migration only replaces two read RPC definitions.

Post-apply ledger readback reconciled:

```text
20260812183000 | 20260812183000 | 2026-08-12 18:30:00
```

## Schema And Security Readback

Both functions exist with their expected signatures and include:

- `card_printing_id`
- `printing_gv_id`
- `finish_key`
- `finish_label`
- `printing_identity_status`

Readback confirmed for both functions:

- `security definer`: true
- `search_path`: `public`
- `authenticated` execute: true
- `anon` execute: false
- `public` execute: false

`collector_memory_accessible_by_id_v1(uuid)` remains `stable`. The owner feed
retains its existing volatility classification.

## Authenticated Execution Proof

A real eligible Memory owner and Memory row were selected internally, without
writing identifiers to this artifact. The functions were invoked under the
`authenticated` role with that owner identity inside a read-only transaction.
The transaction was rolled back.

Results:

```json
{
  "owner_feed": {
    "rows_returned": 2,
    "rows_with_exact_printing": 1,
    "rows_unassigned": 1,
    "new_columns_present": true
  },
  "detail_route": {
    "rows_returned": 1,
    "viewer_is_owner": true,
    "printing_status_present": true
  }
}
```

This proves the deployed functions return both exact and honestly unassigned
printing identities without weakening owner access.

## Signed Android Proof

The signed artifact from GitHub run `31660604012` has:

- package: `com.grookai.vault`
- version: `1.0.0 (23)`
- APK SHA-256:
  `CE261BB15F8DAE617639A7904F29B6E892D64D342459463A582D2EB42EC31E3D`
- signer certificate SHA-256:
  `51E518EF647B2BD5C1C91D3D00D08E1FE3192AF633B2AF6741A67FDCE872E033`

The installed Samsung production package used the same signer certificate.
The candidate installed successfully with `adb install -r`, preserving app
data. The process launched and produced no fatal Android, Flutter, PostgREST,
or Memory-RPC errors in captured logcat.

The physical Samsung entered its secure Doze/bouncer state during screenshot
capture, so a black screenshot was not treated as visual UI evidence. Per the
device-fallback rule, the exact signed APK was clean-installed on the Android
emulator. It rendered the Grookai sign-in screen correctly, held foreground
focus, and produced no app runtime errors.

Exact/unassigned Memory, Sale, and Lot presentation is additionally protected
by the `19/19` Grookai Object renderer suite and the full `614/614` Flutter
suite.

## Boundaries Preserved

- No collector data mutation.
- No inferred printing assignment.
- No anonymous RPC execution.
- No application uninstall or data clear on the Samsung.
- No pricing, vault, wall, Binder, Memory publication, or social mutation.
- No iOS/TestFlight distribution was performed by this gate.

## Decision

The printing-identity engineering gate is closed. The source, migration,
security boundary, authenticated database behavior, signed artifact, physical
in-place install, and emulator rendering are all proven.

The next gate is normal store distribution of a build with a new release build
number, followed by a short signed-in acceptance check. It is a distribution
gate, not additional implementation or database repair.
