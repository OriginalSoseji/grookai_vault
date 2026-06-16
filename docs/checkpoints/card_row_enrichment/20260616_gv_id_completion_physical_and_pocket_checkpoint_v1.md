# GV-ID Completion Physical And Pocket Checkpoint V1

Date: 2026-06-16

## Purpose

Record the completion of Grookai GV-ID coverage for both English physical cards and TCG Pocket rows.

This checkpoint separates the two namespaces:

- English physical cards use `GV-PK-*`
- TCG Pocket rows use `GV-TCGP-*`

Pocket rows remain in the `tcg_pocket_excluded` domain. Assigning Pocket GV-IDs does not promote Pocket rows into English physical canon.

## Final State

| Metric | Value |
| --- | ---: |
| English physical parent `gv_id` missing | 0 |
| English physical child `printing_gv_id` missing | 0 |
| Pocket parent `gv_id` missing | 0 |
| Pocket child `printing_gv_id` missing | 0 |
| Pocket duplicate parent groups | 0 |
| Pocket parent rows after cleanup | 2,012 |
| Pocket child printing rows after cleanup | 6,036 |
| Preflight `card_prints_missing_gv_id` row count | 0 |

## Pocket Apply

Package:

```text
POCKET-GVID-01-SOURCE-ALIAS-CLEANUP-AND-GVID-BACKFILL
```

Approved fingerprint:

```text
75e99091084a71d1e8780136d20eeafb4660ef9af3390fbf601191bf6c7902f7
```

Dry-run proof:

```text
89f59875340da2133a55675c5dcc7efac976a86df3643f30f4e6594dbcf883fc
```

Applied scope:

- 1,138 Pocket source-alias duplicate parent cleanups
- 1,138 Pocket TCGdex mapping transfers
- 3,414 duplicate Pocket child rows deleted
- 2,012 surviving Pocket parent GV-ID updates
- 6,036 Pocket child printing GV-ID updates

Forbidden scope stayed closed:

- no English physical rows targeted
- no migrations
- no image writes
- no global apply

## Contract And Reports

Contract:

- `docs/contracts/POCKET_GV_ID_NAMESPACE_CONTRACT_V1.md`

Reports:

- `docs/audits/card_row_enrichment_v1/pocket_gv_id_real_apply_v1.md`
- `docs/audits/card_row_enrichment_v1/pocket_gv_id_readiness_v1.md`
- `docs/audits/card_row_enrichment_v1/pocket_gv_id_duplicate_governance_v1.md`
- `docs/audits/card_row_enrichment_v1/card_row_enrichment_cleanup_plan_v1.md`

## Verification

Commands run:

```powershell
node --test backend\warehouse\buildCardPrintGvIdV1.test.mjs
node --test backend\warehouse\buildPocketGvIdV1.test.mjs
node --test tests\contracts\contract_scope_v1.test.mjs
git diff --check
git status --short -- supabase\migrations
npm run preflight
```

Results:

- targeted GV-ID tests passed
- contract scope test passed
- `git diff --check` passed
- Supabase migrations status clean
- `npm run preflight` returned `PASS_WITH_DEFERRED_DEBT`
- critical failures: 0
- `card_prints_missing_gv_id`: 0

## Remaining Non-GV-ID Debt

GV-ID work is complete. Remaining enrichment work is separate:

- `external_mappings_source_card_duplicates`: 195
- external mapping gaps: 675
- no-child-printing parent rows: 1,083
- trait gaps: 831
- species gaps: 3,740
- catalog metadata gaps: 139

Next recommended lane:

```text
Read-only triage of external_mappings_source_card_duplicates.
```

