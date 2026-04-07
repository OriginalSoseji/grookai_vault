# SWSH12_IDENTITY_AUDIT_V1

## 1. Context

`swsh12` was the next unresolved null-`gv_id` identity surface after the proven mixed-collapse executions for `swsh9` and `swsh10`.

This phase began as audit-only, with auto-apply allowed only if `swsh12` matched the same lawful pattern exactly:

- numeric unresolved rows must be zero-padded duplicate parents of canonical base-lane `swsh12`
- TG unresolved rows must already be represented canonically in `swsh12tg`
- no multiple matches, namespace conflicts, or different-name anomalies may exist

Artifacts for this phase:

- `backend/identity/swsh12_identity_audit_v1.mjs`
- `docs/sql/swsh12_identity_audit_v1.sql`
- `docs/checkpoints/swsh12_identity_audit_v1.json`

## 2. Problem

The unresolved `swsh12` null-parent surface was expected to be mixed:

- base/main rows
- TG-family rows

The audit had to determine whether those rows were:

- duplicate canonical rows
- missing canonical rows
- TG-family rows already represented elsewhere
- or a mixed surface requiring different lawful execution modes per subset

## 3. Audited Counts

The starting unresolved truth matched the prior inventory exactly:

- `total_unresolved = 115`
- `numeric_unresolved = 85`
- `non_numeric_unresolved = 30`

The non-numeric subset is exactly the expected TG lane:

- `TG01` through `TG30`

## 4. Numeric-Lane Findings

Exact overlap against canonical `swsh12` using `card_prints.number = printed_number`:

- `numeric_with_canonical_match_count = 0`
- `numeric_without_canonical_match_count = 85`
- `numeric_same_name_same_number_overlap_count = 0`

Normalized-digit plus normalized-name proof changed the classification:

- `numeric_normalized_digit_match_count = 85`
- `numeric_normalized_digit_same_name_overlap_count = 85`
- `numeric_duplicate_collapse_ready_count = 85`
- `numeric_normalized_digit_multiple_match_count = 0`

Interpretation:

- all `85` numeric unresolved rows are one-to-one duplicate parents of canonical `swsh12` base rows
- the mismatch is zero padding, not card identity
- representative mapping: unresolved `002 / Venomoth` mapped one-to-one to canonical `2 / Venomoth` with `GV-PK-SIT-2`

## 5. Non-Numeric / TG Findings

Exact overlap against canonical `swsh12`:

- `tg_with_swsh12_canonical_match_count = 0`
- `tg_without_swsh12_canonical_match_count = 30`
- `tg_same_name_same_number_overlap_count = 0`

Canonical `swsh12` is base-lane only:

- `canonical_swsh12_numeric_rows = 215`
- `canonical_swsh12_non_numeric_rows = 0`

Family-lane overlap against canonical `swsh12tg`:

- `tg_with_swsh12tg_canonical_match_count = 30`
- `tg_without_swsh12tg_canonical_match_count = 0`
- `tg_with_swsh12tg_strict_same_name_same_number_overlap_count = 30`
- `tg_with_swsh12tg_multiple_match_count = 0`

Interpretation:

- the unresolved TG subset is not missing canon
- it is already canonically represented under `swsh12tg`
- the family lane already owns the public TG namespace

## 6. Canonical Overlap Findings

Canonical snapshots:

- `canonical_swsh12_total_rows = 215`
- `canonical_swsh12_numeric_rows = 215`
- `canonical_swsh12_non_numeric_rows = 0`
- `canonical_swsh12tg_total_rows = 30`

Representative canonical `swsh12` rows:

| card_prints.id | gv_id | name | number | set_code |
| --- | --- | --- | --- | --- |
| `01010229-1529-4068-ae7b-fb9987909e6f` | `GV-PK-SIT-001` | `Venonat` | `001` | `swsh12` |
| `32dd8072-a690-4cd9-ad6c-cd824eea4407` | `GV-PK-SIT-2` | `Venomoth` | `2` | `swsh12` |
| `5ad75a58-e88e-4472-a832-cfe342c1cfe1` | `GV-PK-SIT-3` | `Spinarak` | `3` | `swsh12` |
| `e5ef553c-a952-4bcf-aa74-14b7d948d19e` | `GV-PK-SIT-4` | `Ariados` | `4` | `swsh12` |
| `8adf1b10-946d-4df1-abfa-0c86fe7ab01c` | `GV-PK-SIT-5` | `Sunkern` | `5` | `swsh12` |

Canonical `swsh12` non-numeric rows:

- none

Representative canonical `swsh12tg` rows:

| card_prints.id | gv_id | name | number | set_code |
| --- | --- | --- | --- | --- |
| `08649ce2-4cfe-47a2-a7a6-a57f9f80bfeb` | `GV-PK-SIT-TG01` | `Braixen` | `TG01` | `swsh12tg` |
| `90498d40-3694-4255-a2af-f6f3abbadc30` | `GV-PK-SIT-TG02` | `Milotic` | `TG02` | `swsh12tg` |
| `6f9318cb-ac06-488b-a5ab-95278d8b88c8` | `GV-PK-SIT-TG03` | `Flaaffy` | `TG03` | `swsh12tg` |
| `25e3f169-6c31-4474-bd02-8eb0579200df` | `GV-PK-SIT-TG04` | `Jynx` | `TG04` | `swsh12tg` |
| `fd6034fd-34a9-4c4c-a620-6e48ad9bab4a` | `GV-PK-SIT-TG05` | `Gardevoir` | `TG05` | `swsh12tg` |

The full first-25 sample lists are preserved in `docs/checkpoints/swsh12_identity_audit_v1.json`.

## 7. Strict Same-Name Same-Number Findings

Inside canonical `swsh12`, strict same-name same-number overlap is zero for the exact lane:

- `strict_numeric_overlap_count = 0`
- `multiple_canonical_match_row_count = 0`
- `zero_canonical_match_row_count = 115`
- `canonical_match_but_different_name_row_count = 0`

Against canonical `swsh12tg`, strict TG family overlap is complete:

- `strict_tg_family_overlap_count = 30`
- `tg_with_swsh12tg_multiple_match_count = 0`
- `family_different_name_row_count = 0`

Consequence:

- the numeric subset is not promotion work
- the TG subset is not missing canon
- both subsets are deterministic collapse targets

## 8. Raw / Family Evidence

Raw-family evidence was complete and strong:

- `tcgdex_active_external_mapping_count = 30`
- `tcgdex_raw_link_count = 30`
- `all_non_numeric_rows_have_tcgdex_mapping = true`
- `all_non_numeric_rows_have_tcgdex_raw_link = true`

Representative raw linkage:

- `Braixen / TG01` -> external id `swsh12-TG01`, raw local id `TG01`, raw set id `swsh12`
- `Milotic / TG02` -> external id `swsh12-TG02`, raw local id `TG02`, raw set id `swsh12`
- `Flaaffy / TG03` -> external id `swsh12-TG03`, raw local id `TG03`, raw set id `swsh12`

Family target occupancy was also clean:

- `canonical_swsh12tg_with_active_identity_count = 0`

## 9. Final Classification

### OUTCOME D — MIXED EXECUTION

`swsh12` matched the exact mixed-collapse pattern already proven for `swsh9` and `swsh10`:

- `85` numeric rows are duplicate canonical base rows and require normalized-digit duplicate collapse onto canonical `swsh12`
- `30` TG rows are TG-family rows already canonically present under `swsh12tg` and require family-targeted collapse onto that lane

## 10. Exact Recommended Next Phase For `swsh12`

Exact next lawful execution mode:

- `NUMERIC_DUPLICATE_COLLAPSE_BY_NORMALIZED_DIGITS + TG_FAMILY_REALIGNMENT_COLLAPSE_TO_SWSH12TG`

Autofix gate result:

- exact pattern match = `true`
- no gate failures

Because every required gate matched exactly, the audit runner proceeded directly into `SWSH12_MIXED_COLLAPSE_V1` in the same execution.

## Status

AUDIT COMPLETE
AUTOFIX GATE PASSED
