# Collexy Stamp Taxonomy Governance Checkpoint V1

Date: 2026-06-22

This checkpoint records the governance classification created from Collexy's Black & White holofoil evidence pass.

## Scope

- Audit only.
- No DB writes.
- No migrations.
- No apply.
- No cleanup, deletes, merges, or quarantine.

## New Active Contracts

- `CHAMPIONSHIP_STAMP_IDENTITY_RULE_V1`
- `PLAY_POKEMON_PLAYER_REWARDS_STAMP_IDENTITY_RULE_V1`

These contracts were added to distinguish:

- City / State / National Championship stamps
- Championship Staff variants
- Play! Pokemon logo stamps
- Player Rewards crosshatch stamps
- generic League Stamp rows

## Input

- Collexy source report: `docs/audits/english_master_index_source_exhaustion_v1/collexy_bw_holofoil_source_acquisition_v1/collexy_bw_holofoil_source_acquisition_v1.json`
- Input fingerprint: `36a27c9521ce56c9c497f74fef4f46d2e59e2d7a13b6f5f9b2567a7b8b70d4e3`

## Output

- JSON: `docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_collexy_stamp_taxonomy_governance_v1.json`
- Markdown: `docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_collexy_stamp_taxonomy_governance_v1.md`
- Fingerprint: `2b8c3e3d2e6d225bd568fec70cbabc634b203275531b7dda0d8c1b99c98d67b8`

## Results

- Source records classified: 17
- Write-ready rows now: 0

## Governance Split

- `synonym_governed_review_candidate`: 7
- `variant_taxonomy_change_required`: 5
- `placement_identity_split_required`: 1
- `variant_synonym_or_taxonomy_review`: 2
- `queued_variant_mismatch`: 2

## Readiness Split

- `not_write_ready_second_source_delta_required`: 7
- `not_write_ready_taxonomy_change_required`: 6
- `blocked_wrong_family_for_current_queue`: 2
- `not_write_ready_governance_review_required`: 2

## Result

The Collexy pass did not create an apply package. It converted 17 review rows into governed categories.

The strongest next lane is the 7 `synonym_governed_review_candidate` rows, but they still need source-delta comparison, collision checks, rollback-only dry-run preparation, and explicit approval before any DB write.

## Verification

Commands run:

```powershell
node --check scripts\audits\english_master_index_collexy_stamp_taxonomy_governance_v1.mjs
node scripts\audits\english_master_index_collexy_stamp_taxonomy_governance_v1.mjs
node --test tests\contracts\contract_scope_v1.test.mjs
git diff --check
git status --short -- supabase\migrations
```

Status:

- DB writes performed: false
- Migrations created: false
- Cleanup performed: false
- Quarantine performed: false
