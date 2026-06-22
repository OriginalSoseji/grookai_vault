# Collexy Governed Source Delta Checkpoint V1

Date: 2026-06-22

This checkpoint records the source-delta result for the seven Collexy-governed review candidates.

## Scope

- Audit only.
- No DB writes.
- No migrations.
- No apply.
- No cleanup, deletes, merges, or quarantine.

## Inputs

- Governance report: `docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_collexy_stamp_taxonomy_governance_v1.json`
- Governance fingerprint: `2b8c3e3d2e6d225bd568fec70cbabc634b203275531b7dda0d8c1b99c98d67b8`

## Fixture

- Fixture: `docs/audits/verified_master_set_index_v1/source_fixtures/generated_collexy_governed_stamp_finish_v1/collexy_governed_stamp_finish_v1.json`
- Fixture report: `docs/audits/english_master_index_source_exhaustion_v1/collexy_governed_stamp_finish_v1/collexy_governed_stamp_finish_v1.json`
- Fixture report fingerprint: `5b7352942b467985e5f171bb21041943221dfcd302e72814abb7677b1e34b1e9`

## Source Delta Result

- Report: `docs/audits/english_master_index_source_exhaustion_v1/source_delta_audit_v1/collexy_governed_stamp_finish_source_delta_audit_v1.json`
- Candidate records loaded: 7
- Matched current gap facts: 0
- Useful candidate matches: 0
- Already in current index: 5
- Unmatched candidate records: 2

## Decision

Do not run a global rebuild for this source lane.

The seven governed Collexy rows do not close current Master Index gaps:

- five are already master-verified in the current index
- two are not in remaining gaps or current index under the generated fact keys

## Verification

Commands run:

```powershell
node --check scripts\audits\english_master_index_collexy_governed_fixture_v1.mjs
node scripts\audits\english_master_index_collexy_governed_fixture_v1.mjs
node --check scripts\audits\english_master_index_source_delta_audit_v1.mjs
node scripts\audits\english_master_index_source_delta_audit_v1.mjs --source-key collexy_governed_stamp_finish --source-kind collector_reference --fixture-dir docs\audits\verified_master_set_index_v1\source_fixtures\generated_collexy_governed_stamp_finish_v1
```

Status:

- DB writes performed: false
- Migrations created: false
- Cleanup performed: false
- Quarantine performed: false
