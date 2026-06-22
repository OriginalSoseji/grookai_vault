# Regional Championship Active Finish Adjudication Checkpoint V1

Date: 2026-06-21

## Purpose

Capture the audit-only active-finish adjudication for the three Dragon Vault Regional Championships rows after Regional Championships identity governance.

This checkpoint does not authorize writes.

## Scope

Rows adjudicated:

- `dv1` Bagon `#6`
- `dv1` Shelgon `#7`
- `dv1` Salamence `#8`

## Decision

Parent identity:

- `variant_key`: `regional_championships_stamp`
- `printed_identity_modifier`: `regional_championships_stamp`

Active child finish candidate:

- `holo`

Crosshatch handling:

- Crosshatch is preserved as evidence/display metadata.
- Crosshatch is not promoted to a canonical `finish_key`.
- Alternate source labels such as reverse/crosshatch language remain source taxonomy labels unless finish taxonomy explicitly promotes them later.

## Result

The three rows are ready for a future guarded rollback-only dry-run package.

They are not ready for real apply.

## Artifacts

Active finish adjudication:

- `docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_regional_championship_active_finish_adjudication_v1.json`
- `docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_regional_championship_active_finish_adjudication_v1.md`

Updated queue reports:

- `docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_stamped_special_next_action_queue_v1.json`
- `docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_stamped_special_next_action_queue_v1.md`
- `docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_stamped_special_residual_blocker_handoff_v1.json`
- `docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_stamped_special_residual_blocker_handoff_v1.md`

## Final Counts

Active finish adjudication:

- target_rows: 3
- future_dry_run_candidates: 3
- target_child_finish_key `holo`: 3
- write_ready_now: 0

Stamped/special next action queue:

- total_rows: 304
- source_needed_rows: 200
- taxonomy_governance_rows: 0
- regional_championship_future_dry_run_candidates: 3
- no_write_or_governance_rows: 100
- manual_conflict_rows: 1
- write_ready_now: 0

Residual blocker handoff:

- residual_rows: 304
- evidence_blocked: 194
- future_dry_run_ready: 3
- manual_adjudication: 1
- dependency_blocked: 15
- no_write_governance: 91

## Fingerprints

- regional_championship_active_finish_adjudication: `b79c620d260893ede2e542b0fbb3417a182ad850f8551cb49c37dbd0c2b65743`
- stamped_special_next_action_queue: `5b8cdadb132b1b4f4219a2326baa80a29c73513aece6ee4fc67e0e9ac9b5d4d1`
- stamped_special_residual_blocker_handoff: `e3164434de4eb104548edd28670a33df7341264a858339d564836881c88f4c37`

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

Prepare a separate guarded rollback-only dry-run package for the 3 Regional Championships rows only.

No real apply without explicit approval.
