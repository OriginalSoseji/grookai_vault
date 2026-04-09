# CEL25_MIXED_EXECUTION_AUDIT_V1

## Context

The duplicate bucket is closed and verified. `cel25` is the first mixed-execution target and therefore must be decomposed from live data before any apply work begins.

This checkpoint is read-only. No mutation was performed.

## Audited Surfaces

The audit covered:

- unresolved null-`gv_id` parents referenced by active `card_print_identity` rows with `set_code_identity = 'cel25'`
- canonical in-set `cel25` parents with live `gv_id`
- exact token plus exact-name candidate matches
- normalized-name plus base-number candidate matches
- cross-lane name/number echoes outside `cel25`
- promotion surface
- fan-in surface
- blocked conflict surface

Live schema-accurate audit notes:

- unresolved `cel25` parents currently live on null-`gv_id` parent rows whose own `set_code` / `number` fields are null
- the authoritative unresolved lane is therefore `card_print_identity.set_code_identity = 'cel25'`
- active identity semantics use `card_print_identity.is_active`

## Classification Summary

Live verification on 2026-04-08 produced:

- unresolved parent count = `47`
- unresolved identity row count = `47`
- canonical in-set `cel25` parent count = `47`

Execution-class counts:

- `DUPLICATE_COLLAPSE = 25`
- `BASE_VARIANT_COLLAPSE = 20`
- `ALIAS_COLLAPSE = 0`
- `PROMOTION_REQUIRED = 0`
- `ACTIVE_IDENTITY_FANIN = 0`
- `BLOCKED_CONFLICT = 2`
- `UNCLASSIFIED = 0`

Exact-token audit:

- exact lawful matches = `25`
- same-token different-name conflict rows = `8`
- exact-unmatched rows = `22`
- reused canonical targets under exact matching = `0`

Normalized residual audit on the exact-unmatched subset:

- normalized-name matches = `20`
- suffix-route matches = `20`
- reused canonical targets after normalization = `0`
- invalid groups = `2`
- ambiguous groups = `0`

Fan-in audit:

- fan-in group count = `0`

Promotion audit:

- promotion candidate count = `0`

Cross-lane / alias audit:

- raw unresolved rows with cross-lane echoes = `21`
- raw cross-lane candidate rows = `28`
- target set codes involved = `24`
- target set codes involved:
  `base1`, `base4`, `base5`, `basep`, `bw1`, `bw11`, `bw4`, `dp3`, `ex12`, `ex4`, `ex5.5`, `ex7`, `hgss1`, `mcd14`, `mcd17`, `neo1`, `neo3`, `pl1`, `pl2`, `pl3`, `pop5`, `sm2`, `xy1`, `xy6`
- lawful alias-collapse rows = `0`
- alias status = `BLOCKED_NON_LAWFUL_ECHO_ONLY`

The raw cross-lane echoes do not create a lawful alias lane because every non-blocked row already has a proven in-set `cel25` canonical target, and several cross-lane surfaces are multi-set echoes rather than deterministic namespace owners.

Blocked conflict surface:

- blocked conflict count = `2`

## Proof Examples

`DUPLICATE_COLLAPSE`

- `c7bb7b53-0879-449e-8279-b09b7ad67353 / Ho-Oh / 1 -> f1e209cf-0570-4cc6-a096-dbccd9991f46 / GV-PK-CEL-1`
- proof: exact printed token plus exact normalized name uniquely matches canonical `cel25`

`BASE_VARIANT_COLLAPSE`

- `229bfaf2-22e7-470d-981e-d41c762e030b / Blastoise / 2A -> bdbf4197-537b-4fa7-9cac-304006b170aa / GV-PK-CEL-2CC`
- proof: suffix-marked source routes by base number plus normalized name to a unique canonical `cel25` target

`BLOCKED_CONFLICT`

- `c2bdbb6f-10de-4a93-abcf-ed3b8837908b / Umbreon Star / 17A`
- blocked against same-base `cel25` canonicals including `c9c1a789-a686-4541-99b7-ac7d4de7be30 / Umbreon ★ / GV-PK-CEL-17CC`
- reason: symbolic star notation falls outside the current stable normalization contract

- `f7c22698-daa3-4412-84ef-436fb1fe130f / Gardevoir ex / 93A`
- blocked against `b4a42612-945d-419f-a4f4-c64ae5c26d6b / Gardevoir ex δ / GV-PK-CEL-93CC`
- reason: delta-species symbol drift falls outside the current stable normalization contract

## Hard Findings

`cel25` is truly mixed.

- the main numeric lane (`1` through `25`) is a lawful exact duplicate-collapse surface
- most `A`-suffix classic-collection rows are a lawful in-set base-variant surface
- two symbol-bearing rows remain blocked because the current stable normalization contract does not cover star-symbol or delta-species identity drift
- no lawful alias lane exists
- no promotion lane is needed
- no fan-in handling is required

Apply work must therefore be split into multiple execution artifacts rather than treated as a single set-wide runner.

## Next Execution Recommendation

Exact next lawful execution unit:

- `CEL25_NUMERIC_DUPLICATE_COLLAPSE`

Reason:

- `25` rows are immediately executable under the proven exact-token duplicate-collapse pattern
- they do not depend on symbolic review
- they do not require alias or promotion logic
- they do not trigger fan-in

Residual post-numeric plan from the audited decomposition:

- `20` rows remain for a dedicated `BASE_VARIANT_COLLAPSE` artifact
- `2` rows remain in `BLOCKED_CONFLICT` pending a symbol-aware normalization contract
