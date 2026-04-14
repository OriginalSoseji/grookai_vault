# PRINT_IDENTITY_KEY_PROMO_COLLISION_CONTRACT_AUDIT_V1

## Context

`PRINT_IDENTITY_KEY_NUMBERLESS_PROMO_BACKFILL_APPLY_V1` failed closed with one live collision on:

- `svp:085:pikachu-with-grey-felt-hat`

This is not a derivation failure. The collision comes from duplicate promo rows already present in canon for the same printed identity.

## Conflict Explanation

The blocking surface is a three-row same-identity cluster in `svp` for `Pikachu with Grey Felt Hat`:

1. `50386954-ded6-4909-8d17-6b391aeb53e4`
   - `gv_id = GV-PK-PR-SV-085`
   - active `tcgdex` mapping present
   - active identity, traits, and printings present
   - `number` / `number_plain` missing
   - `print_identity_key` missing

2. `5557ba0d-6aa7-451f-8195-2a300235394e`
   - `gv_id = GV-PK-PR-SV-85`
   - `number = 85`
   - `number_plain = 85`
   - printings and vault rows present
   - no active external mapping

3. `a48b4ff3-64c4-4a63-8c6d-434cebbf32e4`
   - `gv_id = GV-PK-SVP-85`
   - active `justtcg` mapping present
   - `number = 085`
   - `number_plain = 085`
   - `print_identity_key = svp:085:pikachu-with-grey-felt-hat`

The live collision occurs because the backfill would derive `svp:085:pikachu-with-grey-felt-hat` for row `50386954-ded6-4909-8d17-6b391aeb53e4`, while row `a48b4ff3-64c4-4a63-8c6d-434cebbf32e4` already owns that exact key.

## Identity Comparison

The cluster is deterministic and identity-equivalent:

- same `set_code = svp`
- same normalized printed name
- same promo number after normalization (`085` vs `85` is padding drift only)
- blank `variant_key` on all rows
- blank `printed_identity_modifier` on all rows
- no stamp, event, language, or print-distinction evidence was found

TCGdex upstream confirms the authoritative promo identity:

- source card: `svp-085`
- local promo number: `085`
- name: `Pikachu with Grey Felt Hat`

The `svp` GV-ID namespace also shows the lawful live pattern:

- `GV-PK-PR-SV-*` is the dominant namespace in `svp`
- `GV-PK-SVP-85` is an outlier legacy shape

## Classification

- `conflict_count = 1`
- `classification = PROMO_IDENTITY_DUPLICATE`

This surface is not:

- `PROMO_VARIANT_UNMODELED`
- `INGESTION_DUPLICATE` in the narrow delete-only sense

The rows carry distinct dependent data across identity, printings, external mappings, and vault usage. A delete-only action would discard lawful linkage. The correct resolution is canonical reuse realignment with dependency merge.

## Resolution Rule

Formal contract for this collision family:

1. If promo rows share:
   - same `set_code`
   - same normalized printed name
   - same normalized promo number
   - same blank or equivalent variant/modifier surface

2. And no print-distinguishing evidence exists:
   - no stamp distinction
   - no event distinction
   - no language distinction
   - no print distinction

3. Then they represent one printed promo identity and must not coexist as separate canonical rows.

Required resolution:

- `safe_resolution_type = REUSE_CANONICAL`

That means:

- select one lawful canonical keeper
- repoint and merge FK-bearing dependent rows
- delete duplicate promo identity rows
- only after reuse realignment rerun the promo `print_identity_key` backfill

## Why Backfill Is Still Blocked

Backfill cannot proceed yet because the collision is pre-existing in canonical rows. Re-running the 181-row promo backfill before resolving this duplicate cluster would fail on the same hard gate again.

- `can_proceed_with_backfill = no`

## Next Execution Recommendation

- `next_execution_unit = PRINT_IDENTITY_KEY_PROMO_COLLISION_REUSE_REALIGNMENT_V1`

Why this is the safest deterministic next step:

- the duplicate family is fully isolated to one printed promo identity
- the conflict is canonical reuse work, not derivation logic
- fixing the duplicate cluster removes the only blocker observed in the promo backfill lane
- it preserves canonical truth while keeping promo derivation rules unchanged
