# Pokemon Post Lane A 247 Audit - 2026-05-17

Status: read-only post-execution audit. This pass reran the core Pokemon audit stack after commit `67f3f32` and the approved Lane A 247 number-normalization execution. It performed no additional Supabase writes, migrations, inserts, updates, deletes, card backfills, variant writes, scanner work, deploys, or production data mutation.

## Execution Verified

| Check | Result |
| --- | --- |
| Executed rows | 247 |
| Post-write exact matches during execution | 247 |
| Fresh read-only exact matches | 247 |
| Fresh read-only mismatches | 0 |
| Non-number target column changes | 0 |
| Related object hash changes | 0 |

## Before / After Delta

| Metric | Before | After | Delta |
| --- | --- | --- | --- |
| Missing checklist rows vs PkmnCards | 617 | 613 | -4 |
| Missing secret-range rows | 30 | 30 | 0 |
| Missing direct/source-recoverable number rows | 997 | 750 | -247 |
| Lane A numeric non-hard-stop candidates | 504 | 257 | -247 |
| Clean future write-plan candidates | 248 | 1 | -247 |
| Collision-blocked Lane A rows | 256 | 256 | 0 |
| Hard-stop blocked rows | 374 | 374 | 0 |
| Missing master sets | 18 | 18 | 0 |

## What Improved

- The 247 approved rows are now directly numbered and still verify exactly against the execution matrix.
- Source-recoverable missing-number rows dropped from 997 to 750.
- Lane A numeric non-hard-stop candidates dropped from 504 to 257.
- Clean future write-plan candidates dropped from 248 to 1; the remaining clean row is the separately isolated Grey Felt Hat manual row.
- PkmnCards missing checklist pressure dropped from 617 to 613. The reduction is modest because most executed rows are in source lanes not currently matched as PkmnCards canonical set pages; the directly matched Skyridge rows account for the visible checklist delta.

## What Did Not Change

- Missing secret-range rows remain 30.
- Missing master sets remain 18.
- Duplicate physical set-name groups remain 29.
- Collision-blocked Lane A rows remain 256.
- Hard-stop rows remain blocked.
- Missing-card backfill and variant work remain untouched.

## Top Missing Groups After Execution

| Set | DB codes | Missing | Secret missing |
| --- | --- | --- | --- |
| Shiny Vault |  | 94 | 0 |
| Mega Evolution Promos | mep | 39 | 16 |
| Pokémon Trading Card Game Classic—Blastoise |  | 34 | 0 |
| Pokémon Trading Card Game Classic—Charizard |  | 34 | 0 |
| Pokémon Trading Card Game Classic—Venusaur |  | 34 | 0 |
| Guardians Rising | sm2 | 25 | 1 |
| Burning Shadows | sm3 | 23 | 0 |
| Legendary Treasures | bw11 | 20 | 0 |
| Forbidden Light | sm6 | 19 | 0 |
| Ultra Prism | sm5 | 18 | 0 |
| Celestial Storm | sm7 | 17 | 0 |
| Rumble |  | 16 | 0 |
| McDonald’s Match Battle 2023 |  | 15 | 0 |
| Box Topper |  | 12 | 0 |
| Arceus | pl4 | 12 | 0 |

## Public Website Verification

Public display audit status: `PASS_WITH_MISMATCHES_DOCUMENTED`.

Alias route checks: 5/5 pass.

Card sample checks: 8/24 pass.

Set-level checks: 0/5 pass.

Detailed evidence is in `grookaivault_public_display_audit_20260517.md` and `grookaivault_public_display_matrix_20260517.json`.

## Remaining Blocked Lanes

| Lane | Status |
| --- | --- |
| 256 collision rows | blocked; ownership/integrity work, not number-normalization bulk write |
| 83 me01 duplicate rows | blocked; duplicate resolution design only |
| Grey Felt Hat Pikachu | manual referenced row remains isolated |
| Hard-stop sets | blocked |
| Review-stop sets | blocked |
| Missing-card backfill | blocked until set/number/identity decisions clear |
| Variants | blocked until VARIANT_AUTHORITY_MODEL_V2 |
