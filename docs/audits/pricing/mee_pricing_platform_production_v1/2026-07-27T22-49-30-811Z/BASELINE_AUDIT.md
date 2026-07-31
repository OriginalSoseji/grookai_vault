# MEE Pricing Platform Production V1 Baseline Audit

- Audit version: `MEE_PRICING_PRODUCT_V1_BASELINE_AUDIT_V1`
- Recorded at: `2026-07-27T22:49:30.811Z`
- Commit: `31b0615e676a0f2a8444ce0f5860e0a28f344adf`
- Branch: `pricing/mee-productization-v1`
- Target project: `ycdxbpibncqcchqiihfz`
- Original workspace changed by this audit: `false`

## Migration Gate

- Linked migration command: `pass`
- Local-only migrations: `20260727120000`
- Remote-only migrations: `none`
- Linked schema diff: `nonempty`
- Linked schema diff bytes: `258416`
- Linked schema diff SHA-256: `7811e561e604bfcbbffc55ad42fdc8239f561225dfb1e1327b01f68a3f2b3e55`

The production migration gate remains closed while the linked schema diff is nonempty.

## Production Truth

| Metric | Value |
|---|---:|
| card_prints | 53436 |
| card_printings | 70045 |
| tcgcsv_source_sync_runs | 287 |
| market_pricing_pipeline_phase_events | 110 |
| tcgcsv_price_observations_estimate | 97004264 |

## Operational Findings

- **BLOCKING:** Linked schema diff is nonempty (258416 bytes); remote migration apply remains blocked pending reconciliation.
- **HIGH:** 29 source sync runs remain in running status more than six hours after start.
- **HIGH:** 28 failed or warning MEE phase events were recorded in the last 14 days.
- **HIGH:** The repository MEE nightly service has no systemd OnFailure route.
- **EXPECTED:** Production does not yet contain the governed qualification/publication tables or shared read views.
- **BOUNDARY:** The original pricing/full-tcgcsv-warehouse worktree was audited read-only and not modified.

## Repository Scheduling

| File | Calendar | OnFailure |
|---|---|---|
| `deploy/systemd/grookai-mee-nightly.service` | `n/a` | `none` |
| `deploy/systemd/grookai-mee-nightly.timer` | `*-*-* 03:15:00` | `none` |
| `deploy/systemd/grookai-mee-reference-refresh.service.candidate` | `n/a` | `none` |
| `deploy/systemd/grookai-mee-reference-refresh.timer.candidate` | `*-*-* 02:45:00` | `none` |
| `deploy/systemd/grookai-tcgcsv-historical-backfill.service` | `n/a` | `none` |
| `deploy/systemd/grookai-tcgcsv-warehouse.service` | `n/a` | `none` |
| `deploy/systemd/grookai-tcgcsv-warehouse.timer` | `*-*-* 08:15:00` | `none` |

## Boundaries

- This audit used read-only production queries.
- It made no database writes, migration applies, publication writes, client deploys, or scheduler changes.
- Environment values and systemd command bodies are not included in the Markdown summary.
