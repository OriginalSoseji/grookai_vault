# SMP_RECLASSIFICATION_AUDIT_V1

## 1. Context

`smp` needed a dedicated contract before reclassification because it is a promo family, not a standard expansion-number lane.

`SMP_IDENTITY_CONTRACT_V1` established:

- exact printed promo code `SM##` / `SM###` is canonical
- public identity form is `GV-PK-SM-<PRINTED_NUMBER>`
- digit-only matching is not lawful as the primary identity rule

With that contract live, the unresolved `smp` surface is no longer a generic symbolic blocker and can be audited as a promo-family surface.

## 2. Why The Contract Was Required First

Before the contract, `smp` looked like an unresolved prefixed family with no safe promotion rule.

After the contract:

- the builder can deterministically derive `GV-PK-SM-SM##`
- exact promo-code matching is lawful
- unresolved rows can be measured against canonical `smp` using exact promo number plus repo/canon-aware normalized name

## 3. Unresolved Counts

Live unresolved `smp` surface:

- `total_unresolved = 84`
- `valid_promo_code_count = 84`
- `invalid_promo_code_count = 0`

All unresolved rows carry valid exact promo codes in `SM##` / `SM###` form.

## 4. Canonical SMP Target Summary

Canonical lane:

- `card_prints.set_code = 'smp'`
- `canonical_smp_total_rows = 248`
- `canonical_smp_non_null_gvid_count = 248`

Representative canonical rows:

| id | gv_id | name | number | set_code |
| --- | --- | --- | --- | --- |
| `beedc951-bf46-46b2-90c3-6372a02adeff` | `GV-PK-PR-SM-SM01` | `Rowlet` | `SM01` | `smp` |
| `17d1612c-97b7-45ec-bfc0-c79a58ee5d33` | `GV-PK-PR-SM-SM05` | `Snorlax-GX` | `SM05` | `smp` |
| `a4692df1-91b0-419d-a9a3-636f6de5ced3` | `GV-PK-PR-SM-SM100` | `Lucario-GX` | `SM100` | `smp` |

Canonical `smp` already exists as a live lane.

## 5. Collapse-Safe Subset Findings

Collapse matching used:

- exact promo code match: `printed_number = canonical number`
- repo/canon-aware normalized name using `normalizeCardNameV1`

Results:

- `collapse_candidate_count = 84`
- `distinct_old_count = 84`
- `distinct_new_count = 84`
- `multiple_match_old_count = 0`
- `reused_new_count = 0`
- `unmatched_count = 0`
- `same_promo_same_name_count = 84`
- `same_promo_different_name_count = 0`

This proves the full unresolved surface is collapse-safe.

Important contrast:

- raw DB-only whitespace normalization produced `db_same_promo_same_name_count = 0`
- raw DB-only whitespace normalization produced `db_same_promo_different_name_count = 84`

Those apparent conflicts were formatting drift, not identity drift. The dominant pattern was hyphenation, such as:

- unresolved: `Snorlax GX`
- canonical: `Snorlax-GX`

Repo/canon-aware normalization resolved that formatting drift cleanly.

Representative collapse-safe mappings:

| old_id | old_name | printed_number | new_id | new_name | gv_id |
| --- | --- | --- | --- | --- | --- |
| `3f9de029-3d04-45b2-b822-f55eef1cdceb` | `Snorlax GX` | `SM05` | `17d1612c-97b7-45ec-bfc0-c79a58ee5d33` | `Snorlax-GX` | `GV-PK-PR-SM-SM05` |
| `3f70aae1-c93b-4b47-a0fb-456f2f8080e4` | `Lycanroc GX` | `SM14` | `81565500-e069-4427-bcf7-1c7756e57e55` | `Lycanroc-GX` | `GV-PK-PR-SM-SM14` |
| `6440994e-ad1f-48dd-a4d2-ca04aa0dc3bb` | `Lucario GX` | `SM100` | `a4692df1-91b0-419d-a9a3-636f6de5ced3` | `Lucario-GX` | `GV-PK-PR-SM-SM100` |

## 6. Promotion-Safe Subset Findings

Promotion results:

- `promotion_candidate_count = 0`
- `promotion_internal_collision_count = 0`
- `promotion_live_collision_count = 0`
- `promotion_same_promo_conflict_count = 0`

No promotion-safe subset exists because every unresolved valid promo row already maps one-to-one onto a canonical `smp` row.

## 7. Blocked Conflict And Qualifier Review Findings

Results:

- `BLOCKED_CANONICAL_CONFLICT = 0`
- `BLOCKED_INVALID_PROMO_CODE = 0`
- `QUALIFIER_REVIEW = 0`

No unresolved row remained blocked after applying the promo-family contract and repo/canon-aware name normalization.

## 8. Namespace Audit Results

The namespace audit compared live canonical `smp` rows against the new builder contract:

- contract form: `GV-PK-SM-SM##`
- live canonical form: `GV-PK-PR-SM-SM##`

Results:

- `canonical_namespace_match_count = 0`
- `namespace_conflict_count = 84`
- `canonical_smp_legacy_namespace_row_count = 248`

Interpretation:

- the unresolved surface is collapse-safe
- the canonical `smp` lane still uses legacy `GV-PK-PR-SM-*`
- that legacy namespace drift is real, but it does not block collapsing unresolved null-`gv_id` alias rows onto the already-canonical parents

## 9. FK Readiness Snapshot

Collapse-safe subset FK inventory:

- `card_print_identity = 84`
- `card_print_traits = 84`
- `card_printings = 252`
- `external_mappings = 84`
- `vault_items = 0`

Promotion-safe subset FK inventory:

- all zero because no promotion-safe rows exist

## 10. Final Classification

Aggregate row classification:

- `COLLAPSE_SAFE = 84`
- `PROMOTION_SAFE = 0`
- `BLOCKED_CANONICAL_CONFLICT = 0`
- `BLOCKED_INVALID_PROMO_CODE = 0`
- `QUALIFIER_REVIEW = 0`

`smp` unresolved work is entirely a collapse-safe alias surface under the new contract.

## 11. Exact Recommended Next Phase

`SMP_ALIAS_COLLAPSE_TO_CANONICAL_SMP_V1`

Exact action:

- collapse all `84` unresolved null-`gv_id` `smp` parents onto their canonical `smp` targets
- preserve the existing canonical parents
- do not promote any new `smp` rows
- do not mint any new `gv_id`

Follow-on note:

- canonical `smp` namespace still requires a separate explicit migration / realignment review from legacy `GV-PK-PR-SM-*` to the new `GV-PK-SM-*` contract
- that namespace work is separate from the unresolved-row collapse decision proven here

## Status

AUDIT COMPLETE
