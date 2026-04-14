# PRINT_IDENTITY_KEY_SAME_NAME_MULTI_VARIANT_NUMBER_MIRROR_APPLY_V1

## Context

This apply lane follows
`PRINT_IDENTITY_KEY_VARIANT_AMBIGUITY_CONTRACT_AUDIT_V1`.

Locked live facts before apply:

- remaining blocked rows = `220`
- safe dominant family = `SAME_NUMBER_SAME_NAME_MULTI_VARIANT_COLLISION`
- safe row count = `194`
- residual blocked family = `OTHER = 26`

The user prompt described this lane as sibling mirroring. Live state is one
step earlier than that phrasing suggests:

- there are no persisted hydrated sibling rows with `print_identity_key`
- every safe row still has `number = null`
- every safe row still has `number_plain = null`
- every safe row does have authoritative numeric `tcgdex.localId`
- every safe row already has a lawful canonical `gv_id`

So the actual bounded source surface is the row's own numbered canonical
identity, not a separate reusable sibling row.

## Mirror Logic

For each safe row:

1. take canonical set identity from effective set code
2. take canonical numbered identity from numeric `tcgdex.localId`
3. take canonical printed-name identity from normalized name
4. derive:

```text
print_identity_key =
lower(concat_ws(':',
  effective_set_code,
  tcgdex_local_id,
  normalized_name_token
))
```

Why this is lawful:

- the 194-row family differs only by unresolved numbered identity surfaces
- `tcgdex.localId` already separates those repeated-name rows deterministically
- no row reuse or deletion occurs
- this completes derivation only

## Scope Proof

Bounded apply surface:

- `194` target rows updated
- `26` `OTHER` rows excluded
- collision audit result = `0`
- ambiguity audit result = `0`

No fields other than `print_identity_key` are allowed to change.

## Invariants Preserved

- no `gv_id` changes
- no canonical row count change
- no FK-bearing tables touched
- no external mappings touched
- no non-target rows touched
- no collisions introduced

## Observed Result

- `target_row_count = 194`
- `rows_updated = 194`
- `remaining_blocked_rows = 26`
- `collision_count_after = 0`
- `persisted_hydrated_sibling_source_rows = 0`
- `canonical row count unchanged = 21086`
- `gv_id checksum unchanged = bd630751c9159cbbb5b7c3035ab35673`

## Why It Matters

This removes the dominant remaining blocker family from the global
`print_identity_key` rollout. After this apply, only the true hard-edge legacy
residue remains.
