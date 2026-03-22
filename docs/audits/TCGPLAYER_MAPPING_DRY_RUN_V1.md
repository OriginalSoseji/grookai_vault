# TCGPLAYER_MAPPING_DRY_RUN_V1

## Purpose

Audit-only dry-run for deterministic TCGplayer card-level mapping from `ingest.tcgplayer_products_stage` into canonical `public.card_prints`.

This artifact does not:

- write to `external_mappings`
- write to `card_prints`
- modify schema
- apply any fixes

## Exact Join Rule Used

Strict phase-1 deterministic join only:

1. `upper(trim(stage.set_code_hint)) = upper(trim(card_prints.set_code))`
2. `upper(trim(stage.number)) = upper(trim(card_prints.number))`

Phase-1 canonical scope is restricted to:

- `card_prints.set_code is not null`
- `card_prints.number ~ '^[0-9A-Za-z]+$'`

Excluded from phase-1:

- symbolic or special collector-number rows such as `!` / `?`
- any canonical rows outside the strict alphanumeric collector-number scope

Normalization remains conservative in V1:

- trim
- uppercase
- no leading-zero rewrite
- raw and normalized forms remain visible in the SQL output

## Counts

### A. Stage Inventory Summary

- `staged_rows = 0`
- `distinct_batch_id = 0`
- `distinct_tcgplayer_id = 0`
- `null_or_blank_set_code_hint = 0`
- `null_or_blank_number = 0`
- `null_or_blank_name = 0`

### B. Safe Canonical Scope Summary

- `total_canonical_with_set_code = 22207`
- `phase1_scope_rows = 22205`
- `excluded_symbolic_or_special_rows = 2`

### C. Normalization Preview

- sample rows returned = `0`
- reason: the staging table is currently empty

### D. Exact Deterministic Join Dry-Run

- `matched_rows = 0`
- `unmatched_rows = 0`
- `ambiguous_rows = 0`
- `duplicate_tcgplayer_ids = 0`
- `duplicate_canonical_targets_hit_by_multiple_tcgplayer_ids = 0`

### E. High-Confidence Candidate Result Set

- rows returned = `0`

### F. Unmatched Result Set

- rows returned = `0`

### G. Ambiguous Result Set

- rows returned = `0`

### H. Insert-Ready Preview Only

- rows returned = `0`

## Risks Found

- No staged TCGplayer rows are present yet, so no live mapping safety decision can be made.
- The join rule is intentionally strict and will miss any rows where `set_code_hint` or `number` formatting does not already align with canonical Grookai values.
- Phase-1 excludes canonical symbolic/special collector numbers by design, so those rows remain out of scope until a later audited rule exists.

## Safety Assessment

Current stage data is not sufficient for a future apply because there is no stage data loaded to validate:

- exact match rate
- unmatched rate
- ambiguity rate
- duplicate TCGplayer ID behavior
- duplicate canonical target collisions

## Recommendation

`NO-GO`

Reason:

- the dry-run framework is ready
- the canonical target scope is proven
- but `ingest.tcgplayer_products_stage` is empty, so no mapping decision should be made until real sample stage rows are loaded and this dry-run is rerun against live data
