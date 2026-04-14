# G1_RC_PREFIX_EXACT_TOKEN_PROMOTION_V1

## Context

- `g1` was decomposed into a completed base-variant collapse lane plus a remaining RC-prefix promotion lane.
- This artifact is bounded to the `16` unresolved RC-prefix rows only.
- The existing generic GV-ID builder is not used for this lane because it produces `GV-PK-GEN-RCRC##` for RC tokens. This runner uses a local bounded derivation and fails closed if the live RC contract differs.

## RC Contract

- printed token pattern: `RC##`
- canonical `number`: `RC##`
- canonical `number_plain`: numeric portion only
- canonical `variant_key`: `rc`
- canonical `gv_id`: `GV-PK-GEN-RC##`

## Proof

- `promotion_source_count = 16`
- `identity_key_collision_count = 0`
- `gvid_collision_count = 0`
- `duplicate_proposed_key_count = 0`
- `overlap_with_resolved_rows_count = 0`
- FK readiness snapshot:
  - `card_print_identity = 16`
  - `card_print_traits = 16`
  - `card_printings = 48`
  - `external_mappings = 16`
  - `vault_items = 0`

## Hard Gates

- source scope must be exactly `16` unresolved `g1` rows
- every source token must match `RC[0-9]+`
- identity-key collisions must remain `0`
- `gv_id` collisions must remain `0`
- duplicate proposed promotion keys must remain `0`
- overlap with the prior `13`-row collapse lane must remain `0`

## Invariants Preserved

- the previously resolved `13` `g1` rows remain untouched
- no existing canonical `gv_id` is rewritten
- no cross-set promotion occurs
- the RC lane remains distinct from the numeric base lane via `variant_key = 'rc'`

## Apply Outcome

- `promotion_count = 16`
- `remaining_unresolved_rows = 0`
- canonical `g1` row count increased from `100` to `116`
- all `16` new promoted rows have non-null `gv_id`
- FK orphan counts stayed at `0` for all audited tables
- pre-apply snapshot files were written:
  - `backups/g1_rc_prefix_exact_token_promotion_preapply_schema.sql`
  - `backups/g1_rc_prefix_exact_token_promotion_preapply_data.sql`

## Sample Promoted Rows

- `Shroomish / RC2 -> GV-PK-GEN-RC2`
- `Charmander / RC3 -> GV-PK-GEN-RC3`
- `Charizard / RC5 -> GV-PK-GEN-RC5`
- `Snorunt / RC7 -> GV-PK-GEN-RC7`
- `Froslass / RC8 -> GV-PK-GEN-RC8`

## Risks

- incorrect RC token parsing
- accidental fallback to the generic builder
- unexpected FK uniqueness pressure during repoint
- live RC contract drift from the audited lane definition
