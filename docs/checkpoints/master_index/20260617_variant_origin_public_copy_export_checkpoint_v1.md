# Variant Origin Public Copy Export Checkpoint V1

Date: 2026-06-17

This checkpoint records the read-only Variant Origin Index pass that turns source-backed special parent variants into website-ready educational copy.

```text
db_writes_performed: false
migrations_created: false
cleanup_performed: false
quarantine_performed: false
```

## Purpose

Grookai now has many special parent identity lanes: stamps, recognized errors, print-run variants, subset identities, campaign cards, retailer promos, and product-exclusive variants.

The goal of this checkpoint is to preserve the explanation layer for those variants:

- why the variant exists
- why collectors care
- how to identify it
- how Grookai models it
- which sources support the public explanation

This is not a DB mutation checkpoint. It is a public-copy and governance checkpoint.

## Generated Artifacts

Primary report directory:

```text
docs/audits/variant_origin_index_v1/
```

Generated files:

```text
variant_origin_index_v1.md
variant_origin_index_v1.json
variant_origin_family_coverage_v1.md
variant_origin_family_coverage_v1.json
variant_origin_source_gaps_v1.md
variant_origin_source_gaps_v1.json
variant_origin_source_acquisition_queue_v1.md
variant_origin_source_acquisition_queue_v1.json
variant_origin_printed_identity_scope_governance_v1.md
variant_origin_printed_identity_scope_governance_v1.json
variant_origin_public_copy_export_v1.md
variant_origin_public_copy_export_v1.json
```

## Final Counts

```text
parent_variant_rows_audited: 1876
origin_families: 41
public_copy_safe_families: 39
source_gap_families: 2
public_copy_safe_parent_rows: 1803
source_gap_parent_rows: 73
```

Website-ready export:

```text
public_copy_safe_parent_rows: 1803
public_copy_safe_families: 39
blocked_parent_rows_excluded: 73
source_urls_preserved: 67
```

Source acquisition queue:

```text
gap_rows_queued: 73
queue_groups: 33
priority_1_groups: 0
priority_2_groups: 0
scope_decision_groups: 32
```

Printed-identity governance:

```text
rows_reviewed: 73
not_origin_copy_rows: 59
blocked_rows: 14
manual_review_rows: 0
```

## Public Copy Contract

The website may use `variant_origin_public_copy_export_v1.json` for public educational copy.

Allowed public fields:

```text
why_it_exists
why_collectors_care
how_to_identify
grookai_rule
source_urls
```

Use only rows where:

```text
public_copy_safe: true
```

Do not infer public copy for rows absent from the export.

## Blocked Rows

The 73 excluded rows are not failures. They are intentionally blocked or routed elsewhere:

- printed number suffixes
- printed character identities
- trainer-subject disambiguators
- promo namespace labels
- alternate-art treatment rows that need exact art-treatment source governance

These should be handled by printed identity documentation or artwork intelligence, not by variant-origin copy.

## Source Families Closed In This Pass

This checkpoint includes source-backed treatment for:

- Toys R Us Ponyta
- Burger King stamped promos
- Detective Pikachu movie stamps
- JR East Stamp Rally
- Prismatic Evolutions product stamps
- Asia Gym Stamp / Radiant Greninja

These were promoted into public-copy-safe explanation families only after exact public references were preserved.

## Safety Notes

This pass did not:

- write to Supabase
- create migrations
- create canonical rows
- delete rows
- quarantine rows
- change public website behavior

The export is an audit artifact and a future integration input only.

## Verification

Commands run:

```powershell
node --check scripts/audits/variant_origin_index_v1.mjs
node --check scripts/audits/variant_origin_source_acquisition_queue_v1.mjs
node --check scripts/audits/variant_origin_printed_identity_scope_governance_v1.mjs
node scripts/audits/variant_origin_index_v1.mjs
node scripts/audits/variant_origin_source_acquisition_queue_v1.mjs
node scripts/audits/variant_origin_printed_identity_scope_governance_v1.mjs
node --test tests/contracts/contract_scope_v1.test.mjs
git diff --check
npm run preflight
git status --short -- supabase/migrations
```

Verification result:

```text
contract_scope_v1: pass
git_diff_check: pass
preflight: PASS_WITH_DEFERRED_DEBT
critical_failures: 0
supabase_migrations_status: clean
```

## Next Safe Step

The next safe step is website integration planning:

1. decide where card detail should show variant education
2. map export rows by `card_print_id` or `gv_id`
3. show only public-copy-safe rows
4. keep blocked/governance rows hidden from public origin copy
5. preserve source URLs for future citation/detail views

No DB write is required for the next step.
