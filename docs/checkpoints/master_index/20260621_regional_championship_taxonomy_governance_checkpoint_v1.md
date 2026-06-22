# Regional Championship Taxonomy Governance Checkpoint V1

Date: 2026-06-21

## Purpose

Capture the governance decision for Dragon Vault Regional Championships stamped rows after source discovery found that the remaining DV1 league-style rows are not generic league stamp rows.

This checkpoint is audit-only. It does not authorize writes.

## Scope

Rows reviewed:

- `dv1` Bagon `#6`
- `dv1` Shelgon `#7`
- `dv1` Salamence `#8`

## Decision

The explicit Regional Championships tournament wording is parent identity-bearing.

Governed parent identity:

- `variant_key`: `regional_championships_stamp`
- `printed_identity_modifier`: `regional_championships_stamp`

Crosshatch treatment:

- Crosshatch remains evidence/display metadata for this phase.
- Crosshatch is not promoted into a canonical finish key by inference.

Active child finish status:

- `blocked_pending_exact_finish_adjudication`

## Artifacts

Governance contract:

- `docs/contracts/REGIONAL_CHAMPIONSHIP_STAMP_IDENTITY_RULE_V1.md`

Governance report:

- `docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_regional_championship_taxonomy_governance_v1.json`
- `docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_regional_championship_taxonomy_governance_v1.md`

Queue reports:

- `docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_stamped_special_next_action_queue_v1.json`
- `docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_stamped_special_next_action_queue_v1.md`
- `docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_stamped_special_residual_blocker_handoff_v1.json`
- `docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_stamped_special_residual_blocker_handoff_v1.md`

## Final Counts

Regional Championship governance:

- target_rows: 3
- write_ready_now: 0
- identity_governed_finish_blocked: 3
- governed_variant_key `regional_championships_stamp`: 3
- active_finish_status `blocked_pending_exact_finish_adjudication`: 3

Stamped/special queue:

- total_rows: 304
- acquisition_or_adjudication_rows: 204
- source_needed_rows: 200
- taxonomy_governance_rows: 3
- no_write_or_governance_rows: 100
- manual_conflict_rows: 1
- write_ready_now: 0

Residual blocker handoff:

- residual_rows: 304
- evidence_blocked: 194
- no_write_governance: 91
- dependency_blocked: 15
- manual_adjudication: 4

## Fingerprints

- regional_championship_taxonomy_governance: `ea65b2aefdc4ec5e8b67578ac8a03668aee9e5f2c9ad7dfe612ff94c647526fa`
- stamped_special_next_action_queue: `2efcc5fab60f1d38ebc4616b60cd2ca00b72ce5133c6114030c23ed8705052a0`
- stamped_special_residual_blocker_handoff: `ca73623e3128002745e1d834688ed635f0fd8f4858e19cf48b9abf9929504cc2`

## Safety

- db_writes_performed: false
- durable_db_writes_performed: false
- migrations_created: false
- apply_performed: false
- cleanup_performed: false
- quarantine_performed: false
- global_apply_performed: false
- dry_run_package_prepared: false

## Next Step

Adjudicate active finish handling for Regional Championships crosshatch rows before preparing any guarded dry-run package.

Do not infer crosshatch as a finish key. Do not write these rows while active finish behavior remains blocked.
