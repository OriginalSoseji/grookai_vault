# Collexy BW Holofoil Source Acquisition Checkpoint V1

Date: 2026-06-22

This checkpoint records an audit-only source acquisition pass against Collexy's Black & White era holofoil overview.

## Scope

- Audit only.
- No DB writes.
- No migrations.
- No apply.
- No cleanup, deletes, merges, or quarantine.

## Input

- Source-acquisition packet: `docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_stamped_special_evidence_acquisition_packet_v1.json`
- Input fingerprint: `683daa70a40d0c680833483c2ac7644d4e7ae07b0f5001e3ce5b8ee889c258a1`

## Output

- JSON: `docs/audits/english_master_index_source_exhaustion_v1/collexy_bw_holofoil_source_acquisition_v1/collexy_bw_holofoil_source_acquisition_v1.json`
- Markdown: `docs/audits/english_master_index_source_exhaustion_v1/collexy_bw_holofoil_source_acquisition_v1/collexy_bw_holofoil_source_acquisition_v1.md`
- Fingerprint: `36a27c9521ce56c9c497f74fef4f46d2e59e2d7a13b6f5f9b2567a7b8b70d4e3`

## Results

- Target rows checked: 171
- Collexy source sentences parsed: 57
- Matched current rows: 17
- Candidate records: 17
- Promotable rows: 0
- Candidate finish: reverse = 17

## Classification

- `finish_bound_variant_synonym_review`: 7
- `finish_bound_league_family_synonym_review`: 2
- `finish_bound_card_match_variant_mismatch`: 8

## Governance Result

Collexy provides useful card-level reverse-finish evidence for several Black & White era special variants, but it does not directly authorize writes.

Key reason:

- Some queued rows are generic `league_stamp`, while Collexy identifies more specific Championship, Staff, Play Pokemon, or Player Rewards stamp language.

Before any guarded dry-run package can be prepared, these candidates need stamp-label synonym or taxonomy governance:

- synonym review for Play Pokemon / Player Rewards / Pokemon League wording
- mismatch review where queued `League Stamp` appears to really be City, Regional, State, or National Championships

## Verification

Commands run:

```powershell
node --check scripts\audits\english_master_index_collexy_bw_holofoil_source_acquisition_v1.mjs
node scripts\audits\english_master_index_collexy_bw_holofoil_source_acquisition_v1.mjs
```

Status:

- DB writes performed: false
- Migrations created: false
- Cleanup performed: false
- Quarantine performed: false
