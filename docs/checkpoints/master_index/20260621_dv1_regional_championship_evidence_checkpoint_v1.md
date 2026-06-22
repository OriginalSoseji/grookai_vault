# DV1 Regional Championship Evidence Checkpoint V1

Date: 2026-06-21

## Scope

Audit-only source evidence capture for the three remaining Dragon Vault league-stamp queue rows:

- `dv1` Bagon #6
- `dv1` Shelgon #7
- `dv1` Salamence #8

No DB writes were performed. No migrations, deletes, merges, cleanup, quarantine, or global apply were performed.

## Finding

The rows should not be treated as generic `league_stamp` evidence work anymore.

External sources agree these are better modeled as Regional Championships crosshatch promo lanes:

- observed_variant_key: `regional_championships_stamp`
- observed_finish_family: `crosshatch_holo`
- current status: `source_agreed_taxonomy_blocked`

These rows are not write-ready because the active finish strategy must be governed first.

## Generated Artifacts

- `docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_dv1_regional_championship_source_evidence_v1.json`
- `docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_dv1_regional_championship_source_evidence_v1.md`
- `docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_stamped_special_next_action_queue_v1.json`
- `docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_stamped_special_residual_blocker_handoff_v1.json`

## Queue Impact

- total residual rows: 304
- source_needed_rows: 200
- taxonomy_governance_rows: 3
- write_ready_now: 0
- `league_finish_exact_source`: 58
- `regional_championship_taxonomy_governance`: 3

## Fingerprints

- DV1 evidence packet: `ad89f65dbaa2e602c437557c1e4750c322521b94a8bc5c48c700544f672b6691`
- next action queue: `60d3f4d357670d93a0c1fc87498caec210560cc829ab5947943b3ec4a49a595c`
- blocker handoff: `541522cb7d036747a1d8772e6babd9d9d6d6b6453005e5cfacb0674c69988883`

## Required Governance Before Write

1. Decide whether `regional_championships_stamp` should replace the generic `league_stamp` lane for these rows.
2. Decide whether `crosshatch_holo` maps to an existing active finish key, remains display metadata, or needs a future finish taxonomy rule.
3. Keep Staff Regional Championships separate from non-Staff Regional Championships.

## Verification

Commands run:

```powershell
node --check scripts\audits\english_master_index_dv1_regional_championship_source_evidence_v1.mjs
node scripts\audits\english_master_index_dv1_regional_championship_source_evidence_v1.mjs
node --check scripts\audits\english_master_index_stamped_special_next_action_queue_v1.mjs
node scripts\audits\english_master_index_stamped_special_next_action_queue_v1.mjs
node --check scripts\audits\english_master_index_stamped_special_residual_blocker_handoff_v1.mjs
node scripts\audits\english_master_index_stamped_special_residual_blocker_handoff_v1.mjs
```

## Safety

- db_writes_performed: false
- migrations_created: false
- apply_performed: false
- cleanup_performed: false
- quarantine_performed: false
