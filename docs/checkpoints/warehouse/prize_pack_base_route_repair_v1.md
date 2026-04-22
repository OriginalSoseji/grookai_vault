# PRIZE_PACK_BASE_ROUTE_REPAIR_V1

Generated: 2026-04-20T05:52:00Z

## Scope

Bounded repair audit for the exact 5 blocked rows from `PRIZE_PACK_READY_BATCH_V6_NONBLOCKED`.

## Inputs

- `docs/checkpoints/warehouse/prize_pack_ready_batch_v6_nonblocked.json`
- `docs/checkpoints/warehouse/prize_pack_ready_batch_v6_nonblocked.md`
- `docs/checkpoints/warehouse/prize_pack_wait_inspection_v1.json`
- `docs/checkpoints/warehouse/prize_pack_base_route_repair_v1_input.json`

## Diagnosis

1. `Radiant Tsareena | 016/195 | swsh12`
   - Diagnosis: `BASE_ROW_EXISTS_BUT_ROUTE_MISMATCH`
   - Live canon base exists as `GV-PK-SIT-16` (`0c5f5504-1619-46be-9972-c38802cb801d`).
   - The V6 batch artifact left `target_base_resolution.base_card_print_id = null`, so the precheck treated the underlying base as missing even though the route was already proven.

2. `Alolan Vulpix V | 033/195 | swsh12`
   - Diagnosis: `BASE_ROW_EXISTS_BUT_ROUTE_MISMATCH`
   - Live canon base exists as `GV-PK-SIT-33` (`43cd9975-b087-4811-98b3-2550f312a624`).
   - Same failure shape as Radiant Tsareena: route proof existed, but the repair artifact did not carry the live base row id.

3. `Alolan Vulpix VSTAR | 034/195 | swsh12`
   - Diagnosis: `BASE_ROW_EXISTS_BUT_ROUTE_MISMATCH`
   - Live canon base exists as `GV-PK-SIT-34` (`51102b36-6b19-4fc0-ba4c-b70454f180ce`).
   - Same failure shape as the other `swsh12` rows.

4. `Radiant Alakazam | 059/195 | swsh12`
   - Diagnosis: `BASE_ROW_EXISTS_BUT_ROUTE_MISMATCH`
   - Live canon base exists as `GV-PK-SIT-59` (`e3720d38-221d-40c3-a569-ef3dea35fd0f`).
   - Same failure shape as the other `swsh12` rows.

5. `Lucario | 114/198 | sv01`
   - Diagnosis: `LAWFUL_COEXISTENCE_NOT_RECOGNIZED`
   - Live slot occupants are:
     - base row: `GV-PK-SVI-114`
     - set-name stamp row: `GV-PK-SVI-114-SCARLET-AND-VIOLET-STAMP`
   - Incoming row is the generic Prize Pack variant `play_pokemon_stamp`.
   - This is a lawful coexistence shape under `VARIANT_COEXISTENCE_RULE_V1`, but the runtime allowlist did not yet include `scarlet_and_violet_stamp`.

## Runtime Surfaces Patched

- `backend/identity/variant_coexistence_rule_v1.mjs`
  - Added `scarlet_and_violet_stamp` to the explicit allowlist of coexistence-safe set-name stamp variants.

## Contract Alignment

- `docs/contracts/VARIANT_COEXISTENCE_RULE_V1.md`
  - Expanded the canonical coexistence examples to include `scarlet_and_violet_stamp`.

## Tests

Command:

```bash
node --test backend/identity/identity_slot_audit_v1.test.mjs
```

Result:

- `17 passed`
- `0 failed`

Added regressions for:

- base + `scarlet_and_violet_stamp` + `play_pokemon_stamp` coexistence
- leading-zero slot lookup using both normalized and padded number candidates

## Post-Repair Dry Run

### Four unbridged `swsh12` rows

Command:

```bash
node backend/warehouse/external_discovery_to_warehouse_bridge_v1.mjs \
  --set-id=prize-pack-series-cards-pokemon \
  --stamped-batch-file=docs/checkpoints/warehouse/prize_pack_ready_batch_v6_nonblocked.json \
  --source-candidate-id=7aa0b6ce-ecaf-4df3-b52a-a35a12f2d3e3 \
  --source-candidate-id=ed9cc818-b5f8-4bc6-8cac-d22e0119299a \
  --source-candidate-id=7de30503-67d2-45a7-9a55-22b6962ba583 \
  --source-candidate-id=053bd166-980e-4ea2-9613-fab12437641a
```

Result:

- `eligible = 4`
- `blocked = 0`
- `candidates_bridged = 4` in dry run

This proves the four `UNDERLYING_BASE_MISSING` rows were not blocked by the bridge/runtime path. They can resume cleanly once carried forward through the residue execution step.

### Lucario reclassification

Command:

```bash
node backend/warehouse/classification_worker_v1.mjs \
  --candidate-id=840883a5-eef0-4ec3-8888-8175660b9fcd \
  --reclassify-all
```

Result:

- `classification_status = CLASSIFIED_READY`
- `identity_audit_status = VARIANT_IDENTITY`
- `identity_resolution = PROMOTE_VARIANT`
- `interpreter_reason_code = VARIANT_COEXISTENCE_ALLOWED`
- `proposed_action_type = CREATE_CARD_PRINT`

## Decision

`RESUME_PRIZE_PACK_V6_RESIDUE_5`

All 5 rows now have a truthful next path:

- 4 rows: `READY_TO_BRIDGE` via bridge dry run
- 1 row: `CLASSIFIED_READY` as lawful coexistence

No canon writes, mapping writes, or image writes were performed in this repair pass.
