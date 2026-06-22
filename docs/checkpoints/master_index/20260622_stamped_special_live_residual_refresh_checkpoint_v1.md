# Stamped/Special Live Residual Refresh Checkpoint V1

Date: 2026-06-22

## Purpose

Refresh the stamped/special residual queue against the live DB before continuing overnight source acquisition.

This avoids chasing rows that have already been satisfied by prior approved packages.

## Commands

```powershell
node --check scripts\audits\english_master_index_stamped_special_live_residual_queue_v1.mjs
node scripts\audits\english_master_index_stamped_special_live_residual_queue_v1.mjs
node --check scripts\audits\english_master_index_stamped_special_next_action_queue_v1.mjs
node scripts\audits\english_master_index_stamped_special_next_action_queue_v1.mjs
node --check scripts\audits\english_master_index_stamped_special_residual_blocker_handoff_v1.mjs
node scripts\audits\english_master_index_stamped_special_residual_blocker_handoff_v1.mjs
```

## Outputs

- Live residual: `docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_stamped_special_live_residual_queue_v1.json`
- Next-action queue: `docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_stamped_special_next_action_queue_v1.json`
- Blocker handoff: `docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_stamped_special_residual_blocker_handoff_v1.json`

## Live Residual Summary

| Metric | Value |
| --- | ---: |
| source_queue_rows | 567 |
| live_satisfied_rows | 290 |
| remaining_open_rows | 277 |
| remaining_write_possible_rows | 177 |
| remaining_no_write_or_blocked_rows | 100 |
| live_residual_fingerprint | `e661809e17e3de21edbcc643858760f61467ef2b0d2090331f54185271eadc38` |
| next_action_fingerprint | `31433cdd2823c0a49c3445fc70fd08bba2ce1bd1b9b0ecf9c25a8f78ee8672ad` |

## Blocker Handoff

| Group | Rows |
| --- | ---: |
| evidence_blocked | 171 |
| no_write_governance | 91 |
| dependency_blocked | 15 |
| manual_adjudication | 0 |

## Governed Variant Satisfaction Fix

The live residual matcher now recognizes rows that were governed from generic `league_stamp` into `regional_championships_stamp`. This correctly marks the 3 Dragon Vault Regional Championships rows as live-satisfied.

## Largest Remaining Lanes

- `league_finish_exact_source`: 56
- `prize_pack_second_source`: 35
- `small_custom_stamp_exact_source`: 31
- `event_staff_exact_source`: 19
- `display_metadata_no_write`: 57 no-write governance rows

## Safety

- db_writes_performed: `false`
- migrations_created: `false`
- apply_performed: `false`
- cleanup_performed: `false`
- quarantine_performed: `false`

Next step: continue source acquisition against the evidence-blocked lanes. No write package is currently ready.
