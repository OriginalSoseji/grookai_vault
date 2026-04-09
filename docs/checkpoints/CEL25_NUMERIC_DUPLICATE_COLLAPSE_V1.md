# CEL25_NUMERIC_DUPLICATE_COLLAPSE_V1

## Context

The mixed-execution audit for `cel25` proved a clean split:

- `25` rows = `DUPLICATE_COLLAPSE`
- `20` rows = `BASE_VARIANT_COLLAPSE`
- `2` rows = `BLOCKED_CONFLICT`

This artifact executes only the numeric exact-duplicate lane. No base-variant or blocked rows were allowed into scope.

## Dry-Run Proof

Live dry-run on 2026-04-08 proved:

- total unresolved `cel25` rows = `47`
- in-scope numeric duplicate rows = `25`
- out-of-scope suffix residual rows = `22`
- canonical `cel25` targets = `47`
- exact lawful matches = `25`
- exact multiple-match olds = `0`
- exact unmatched rows = `0`
- exact reused targets = `0`
- in-scope suffix rows = `0`
- out-of-scope rows entering the map = `0`
- background same-token different-name rows outside scope = `8`
- residual base-variant rows = `20`
- residual blocked rows = `2`
- residual unclassified rows = `0`

The frozen map was `25 -> 25` with one target per source and one source per target.

## FK Readiness

Pre-apply FK counts on old parents:

- `card_print_identity = 25`
- `card_print_traits = 25`
- `card_printings = 25`
- `external_mappings = 25`
- `vault_items = 0`

Collision audit:

- trait key conflicts = `0`
- trait conflicting non-identical rows = `0`
- printing finish conflicts = `22`
- printing mergeable metadata-only rows = `22`
- printing conflicting non-identical rows = `0`
- external mapping conflicts = `0`
- target identity rows before apply = `0`

## Apply Outcome

The apply runner completed successfully:

- collapsed count = `25`
- updated identity rows = `25`
- merged trait metadata rows = `0`
- inserted traits = `25`
- deleted old traits = `25`
- merged printing metadata rows = `22`
- moved unique printings = `3`
- deleted redundant printings = `22`
- updated external mappings = `25`
- updated vault items = `0`
- deleted old parent rows = `25`

## Post-Apply Truth

Post-apply verification proved:

- remaining old parent rows in scope = `0`
- remaining unresolved total rows for `cel25` = `22`
- remaining numeric duplicate rows = `0`
- remaining suffix rows = `22`
- remaining base-variant rows = `20`
- remaining blocked rows = `2`
- remaining unclassified rows = `0`
- canonical `cel25` row count unchanged = `47`
- target identity rows on moved lane = `25` total / `25` active / `0` inactive
- target `gv_id` drift count = `0`
- route-resolvable target count = `25`
- target active identity conflicts = `0`
- supported old-reference counts after repoint = `0` for `card_print_identity`, `card_print_traits`, `card_printings`, `external_mappings`, and `vault_items`

The numeric duplicate surface is closed. Residual work remains isolated to the previously audited `20` base-variant rows and `2` blocked symbol-conflict rows.

## Sample Rows

- first: `c7bb7b53-0879-449e-8279-b09b7ad67353 / Ho-Oh / 1 -> f1e209cf-0570-4cc6-a096-dbccd9991f46 / GV-PK-CEL-1`
- middle: `2bcab85c-a4b7-464f-a553-2cdeeddf27e5 / Cosmog / 13 -> b21a6998-feb5-4535-afbb-effbde5ffb49 / GV-PK-CEL-13`
- last: `e324b970-0dae-4dc1-88f2-d5b52b881a6e / Mew / 25 -> f981543f-0739-47aa-89d0-7e95d3d95ab5 / GV-PK-CEL-25`

For all three samples:

- old parent removed = `true`
- target `gv_id` unchanged = `true`
- target identity rows = `1`
- target active identity rows = `1`
- target inactive identity rows = `0`
