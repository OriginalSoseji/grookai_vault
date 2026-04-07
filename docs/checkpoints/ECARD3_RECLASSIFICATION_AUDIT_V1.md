# ECARD3_RECLASSIFICATION_AUDIT_V1

## 1. Context

`ecard3` required a dedicated contract before reclassification because Skyridge is a mixed-numbering family. Under `ECARD3_IDENTITY_CONTRACT_V1`, the exact printed token is canonical and the system must preserve both numeric tokens and holo `H#` tokens as separate public identities.

This audit therefore treats:

- `4` as `4`
- `H13` as `H13`
- `H03` as `H03`

and does not use digit-only matching as the primary identity rule.

## 2. Why The Contract Was Required First

Before the contract, `ecard3` looked like an unsupported family because numeric and holo numbering coexisted in one set. After the contract:

- exact token matching is lawful
- `GV-PK-SK-<PRINTED_NUMBER>` is deterministic
- `H#` tokens are preserved rather than collapsed into numeric tokens
- token-format drift can be measured diagnostically without treating it as identity truth

## 3. Unresolved Counts

Live unresolved `ecard3` surface:

- `total_unresolved = 15`
- `numeric_token_count = 4`
- `holo_token_count = 11`
- `invalid_token_count = 0`

All unresolved rows carry valid contract tokens.

## 4. Canonical ECARD3 Target Summary

Canonical lane:

- `card_prints.set_code = 'ecard3'`
- `canonical_ecard3_total_rows = 171`
- `canonical_numeric_count = 146`
- `canonical_holo_count = 25`

This proves canonical `ecard3` already contains both numeric and holo lanes.

Representative canonical numeric rows:

- `GV-PK-SK-1` `Aerodactyl`
- `GV-PK-SK-14` `Kabutops`
- `GV-PK-SK-29` `Rhydon`

Representative canonical holo rows present in the lane:

- `GV-PK-SK-H03` `Articuno`
- `GV-PK-SK-H19` `Magneton`
- `GV-PK-SK-H32` `Xatu`

## 5. Collapse-Safe Subset Findings

Exact collapse matching used:

- exact printed token match
- repo/canon-aware normalized name

Results:

- `collapse_candidate_count = 0`
- `distinct_old_count = 0`
- `distinct_new_count = 0`
- `multiple_match_old_count = 0`
- `reused_new_count = 0`
- `unmatched_count = 15`
- `same_token_same_name_count = 0`
- `same_token_different_name_count = 0`

No unresolved `ecard3` row is collapse-safe under exact-token law because no unresolved row already has a canonical target with the same token.

## 6. Promotion-Safe Subset Findings

Promotion results:

- `promotion_candidate_count = 15`
- `promotion_internal_collision_count = 0`
- `promotion_live_collision_count = 0`
- `promotion_same_token_conflict_count = 0`

All `15` unresolved rows are promotion-safe under the contract.

Promotion-safe numeric rows:

- `Articuno / 4 -> GV-PK-SK-4`
- `Crobat / 6 -> GV-PK-SK-6`
- `Flareon / 8 -> GV-PK-SK-8`
- `Forretress / 9 -> GV-PK-SK-9`

Promotion-safe holo rows:

- `Kabutops / H13 -> GV-PK-SK-H13`
- `Ledian / H14 -> GV-PK-SK-H14`
- `Magcargo / H16 -> GV-PK-SK-H16`
- `Magcargo / H17 -> GV-PK-SK-H17`
- `Magneton / H18 -> GV-PK-SK-H18`
- `Piloswine / H22 -> GV-PK-SK-H22`
- `Politoed / H23 -> GV-PK-SK-H23`
- `Poliwrath / H24 -> GV-PK-SK-H24`
- `Rhydon / H27 -> GV-PK-SK-H27`
- `Umbreon / H30 -> GV-PK-SK-H30`
- `Vaporeon / H31 -> GV-PK-SK-H31`

## 7. Format-Drift Findings

Read-only format-drift diagnostics checked for same-lane token-only differences such as:

- `03` vs `3`
- `H03` vs `H3`

Results:

- `format_drift_candidate_count = 0`

None of the unresolved rows are blocked only by token formatting. This means the unresolved surface is not waiting on a token-normalization contract.

## 8. Blocked Conflict And Qualifier Review Findings

Results:

- `BLOCKED_CANONICAL_CONFLICT = 0`
- `BLOCKED_INVALID_TOKEN = 0`
- `QUALIFIER_REVIEW = 0`

No row is blocked by exact-token canonical conflict, malformed tokens, or qualifier evidence.

## 9. Namespace Audit Results

The namespace audit verified builder-derived public identities for all valid unresolved rows.

Results:

- `canonical_namespace_match_count = 0`
- `namespace_conflict_count = 0`

Interpretation:

- no unresolved row already has an exact canonical target to inherit
- no proposed `GV-PK-SK-*` promotion id collides with live `card_prints.gv_id`

## 10. FK Readiness Snapshot

Collapse-safe subset FK inventory:

- `card_print_identity = 0`
- `card_print_traits = 0`
- `card_printings = 0`
- `external_mappings = 0`
- `vault_items = 0`

Promotion-safe subset FK inventory:

- `card_print_identity = 15`
- `card_print_traits = 15`
- `card_printings = 19`
- `external_mappings = 15`
- `vault_items = 0`

## 11. Final Classification

Aggregate row classification:

- `COLLAPSE_SAFE = 0`
- `PROMOTION_SAFE = 15`
- `BLOCKED_CANONICAL_CONFLICT = 0`
- `BLOCKED_INVALID_TOKEN = 0`
- `FORMAT_DRIFT_REVIEW = 0`
- `QUALIFIER_REVIEW = 0`

Under `ECARD3_IDENTITY_CONTRACT_V1`, the unresolved `ecard3` surface is a pure exact-token promotion surface.

## 12. Exact Recommended Next Phase

`ECARD3_EXACT_TOKEN_PROMOTION_V1`

Exact action:

- promote all `15` unresolved `ecard3` parent rows in place
- mint `GV-PK-SK-<PRINTED_NUMBER>` on those existing parents
- do not collapse any row
- do not normalize or rewrite tokens during promotion

## Status

AUDIT COMPLETE
