# DV1 Regional Championship Real Apply Checkpoint V1

Date: 2026-06-21

## Scope

Approved package:

`DV1-REGIONAL-CHAMPIONSHIP-STAMP-PARENT-INSERTS`

Fingerprint:

`a180ffd8639a2bbd6dddf99b7b93bff28f7a58ac514e7f25971a83d9aaf0b8d9`

Dry-run proof:

`528940cd7593173f30eeea82bc443061e8a9780c9d413a3dde9b90d7566802a9`

Real apply proof:

`504840ba11d2e9de0d6825d843cae090a04ad5a89e30ba2528f6fa9367ccd159`

## Applied Rows

- Parent `card_prints` inserted: 3
- Active `card_print_identity` rows inserted: 3
- Child `card_printings` inserted: 3
- Set: `dv1` / Dragon Vault
- Cards: Bagon #6, Shelgon #7, Salamence #8
- Variant: `regional_championships_stamp`
- Active child finish: `holo`

Crosshatch remains evidence/display metadata and was not created as a finish key.

## Safety

- No global apply
- No migrations
- No deletes
- No merges
- No unsupported cleanup
- No quarantine

## Post-Apply Verification

The real apply artifact verified:

- Target rows: 3
- Inserted parent rows: 3
- Inserted identity rows: 3
- Inserted child rows: 3
- Target finish counts: `holo=3`
- Target variant counts: `regional_championships_stamp=3`

Post-apply direct readback confirmed one active identity and one `holo` child row for each target.

Forbidden finish keys remained absent:

- `stamped=0`
- `crosshatch=0`
- `crosshatch_holo=0`

## Residual Queue Note

After apply, the stamped/special residual queue still contains 304 open rows.

This is intentional. The three Dragon Vault rows still visible in the residual queue are `league_stamp` rows, not the newly applied `regional_championships_stamp` identities.

The next-action classifier was tightened after this apply so Regional Championship active-finish adjudication only marks rows ready when the governed variant key matches the queue variant. This prevents same-card/same-number evidence from being misapplied across different stamped lanes.

Current refreshed queue state:

- Remaining open rows: 304
- `regional_championship_future_dry_run_candidates`: 0
- `write_ready_now`: 0
- Taxonomy/manual adjudication rows: 4
- Evidence-blocked rows: 194
- No-write governance rows: 91
- Dependency-blocked rows: 15

## Artifacts

- `docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_regional_championship_active_finish_adjudication_v1.json`
- `docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_dv1_regional_championship_guarded_dry_run_v1.json`
- `docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_dv1_regional_championship_real_apply_v1.json`
- `docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_stamped_special_next_action_queue_v1.json`
- `docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_stamped_special_residual_blocker_handoff_v1.json`

## Next Safe Lane

Continue source acquisition for the remaining stamped/special queue.

Do not treat the remaining Dragon Vault `league_stamp` rows as satisfied by this Regional Championships package. They need their own exact variant/finish governance.
