# DUPLICATE_BUCKET_COMPLETE_AUDIT_V1

## Context

The duplicate bucket has been fully executed across sixteen sets:

- `sm12`
- `sm10`
- `sm2`
- `sm3`
- `sm8`
- `sm7`
- `sm5`
- `sm6`
- `sm4`
- `sm11`
- `xy8`
- `xy2`
- `dc1`
- `pop2`
- `pop5`
- `pop8`

This audit is read-only. Its purpose is to prove closure before advancing into blocked or mixed-execution surfaces.

## Target Set List

The audit scope is exactly these `16` sets:

- `sm12`
- `sm10`
- `sm2`
- `sm3`
- `sm8`
- `sm7`
- `sm5`
- `sm6`
- `sm4`
- `sm11`
- `xy8`
- `xy2`
- `dc1`
- `pop2`
- `pop5`
- `pop8`

## Verification Results

Live verification was run on 2026-04-08.

Schema-accurate equivalents used during verification:

- set scoping was done through `card_prints.set_code`
- active identity uniqueness was checked with `card_print_identity.is_active = true`
- inactive history was checked with `card_print_identity.is_active = false`
- `vault_items` FK integrity was checked through `vault_items.card_id`

Bucket-wide results:

1. unresolved null-`gv_id` rows across the completed duplicate bucket = `0`
2. duplicate canonical parents by `set_code + number_plain` = `0`
3. active identity violations = `0`
4. unexpected fan-in history surface outside `sm4`, `xy8`, and `xy2` = `0`
5. FK orphan counts:
   - `card_print_identity = 0`
   - `card_print_traits = 0`
   - `card_printings = 0`
   - `external_mappings = 0`
   - `vault_items = 0`
6. residual normalization drift rows = `0`
7. token consistency violations by `set_code + number_plain` = `0`

Expected fan-in history summary:

- `sm4 / GV-PK-CIN-63` -> `1` active identity, `1` inactive history row
- `xy2 / GV-PK-FLF-88A` -> `1` active identity, `1` inactive history row
- `xy8 / GV-PK-BKT-146A` -> `1` active identity, `1` inactive history row

Per-set row snapshot:

- `dc1` -> `34` canonical rows, `0` null-`gv_id` rows
- `pop2` -> `17` canonical rows, `0` null-`gv_id` rows
- `pop5` -> `17` canonical rows, `0` null-`gv_id` rows
- `pop8` -> `17` canonical rows, `0` null-`gv_id` rows
- `sm10` -> `234` canonical rows, `0` null-`gv_id` rows
- `sm11` -> `258` canonical rows, `0` null-`gv_id` rows
- `sm12` -> `271` canonical rows, `0` null-`gv_id` rows
- `sm2` -> `169` canonical rows, `0` null-`gv_id` rows
- `sm3` -> `169` canonical rows, `0` null-`gv_id` rows
- `sm4` -> `124` canonical rows, `0` null-`gv_id` rows
- `sm5` -> `173` canonical rows, `0` null-`gv_id` rows
- `sm6` -> `146` canonical rows, `0` null-`gv_id` rows
- `sm7` -> `183` canonical rows, `0` null-`gv_id` rows
- `sm8` -> `236` canonical rows, `0` null-`gv_id` rows
- `xy2` -> `109` canonical rows, `0` null-`gv_id` rows
- `xy8` -> `164` canonical rows, `0` null-`gv_id` rows

Total canonical rows across the completed duplicate bucket = `2321`.

## Invariants Confirmed

- no unresolved parents remain in the completed duplicate bucket
- no duplicate canonical parents remain by printed token
- exactly one active identity exists per canonical parent
- inactive fan-in history is preserved only on the expected canonical targets
- no FK orphans remain in the checked referencing tables
- no residual punctuation, unicode, `EX`, `GX`, or dash drift remains

## Risks Checked

- hidden duplicate surfaces missed by per-set execution
- incomplete fan-in archival on previously converged targets
- orphaned dependent rows after collapse
- silent normalization drift after apply

## Result

The duplicate bucket is formally closed and safe to leave.

- all sixteen completed sets are clean and canonical
- the duplicate bucket passes every closure audit check
- the next execution class can begin from audited reality
