# EXU_ALIAS_COLLAPSE_TO_EX10_V1

## 1. Context

`exu` was classified by the remaining identity surface audit as `ALIAS_COLLAPSE`, with the exact next execution mode `EXU_ALIAS_COLLAPSE_TO_EX10`.

Why this lane is alias-only:

- `exu` had `27` unresolved null-`gv_id` parents
- all `27` rows were non-numeric symbolic Unown tokens
- the audit already proved those `27` rows map one-to-one to canonical `ex10`
- canonical `ex10` already owned the live `GV-PK-UF-*` namespace for this surface

Why `ex10` is the target:

- canonical `ex10` contains `145` live `gv_id` rows
- the `exu` surface is a symbolic Unown subset, not a promotable standalone namespace
- no new `gv_id` is required or lawful for this collapse

Artifacts for this phase:

- [backend/identity/exu_alias_collapse_apply_v1.mjs](/C:/grookai_vault/backend/identity/exu_alias_collapse_apply_v1.mjs)
- [docs/sql/exu_alias_collapse_dry_run_v1.sql](/C:/grookai_vault/docs/sql/exu_alias_collapse_dry_run_v1.sql)
- [backups/exu_alias_collapse_preapply_schema.sql](/C:/grookai_vault/backups/exu_alias_collapse_preapply_schema.sql)
- [backups/exu_alias_collapse_preapply_data.sql](/C:/grookai_vault/backups/exu_alias_collapse_preapply_data.sql)

## 2. Problem

Unresolved alias-lane `exu` rows were still attached to null-`gv_id` parent rows in `card_prints`.

That left the Unown collection surface outside the canonical `ex10` namespace even though the live target rows already existed and already owned the route layer through canonical `gv_id`.

## 3. Decision

Collapse each unresolved `exu` parent into the already-canonical `ex10` parent using a frozen one-to-one map:

- exact printed token
- normalized printed name

Hard requirements that all passed:

- no multiple canonical matches
- no reused targets
- no unmatched rows
- no same-token different-name conflicts
- no new `gv_id`
- no target `gv_id` mutation
- no rows outside the `exu` source surface and canonical `ex10` target surface

## 4. Proof

Dry-run proof frozen before apply:

- unresolved `exu` source count = `27`
- canonical `ex10` target count = `145`
- exact token + normalized-name map count = `27`
- distinct old ids = `27`
- distinct new ids = `27`
- unmatched count = `0`
- multiple-match count = `0`
- reused target count = `0`
- same-token different-name conflict count = `0`
- scoped target identity rows before apply = `0`
- non-null old parent set-code count = `0`
- out-of-scope target count = `0`

Representative frozen samples:

- first: `Unown / !` -> canonical `GV-PK-UF-EXCL`
- middle: `Unown / M` -> canonical `GV-PK-UF-M`
- last: `Unown / Z` -> canonical `GV-PK-UF-Z`

Namespace consistency:

- canonical `ex10` row count before apply = `145`
- canonical `ex10` row count after apply = `145`
- canonical target `gv_id` drift count after apply = `0`

## 5. Risks

Primary risks:

- FK collision while repointing to canonical parents
- incorrect alias-lane map if any token/name drift appears
- stale apply surface if live counts differ from the frozen audit
- accidental mutation of the canonical `ex10` namespace

Controls used:

- fail closed on any count drift or mapping invariant failure
- pre-apply schema and data backups written before row movement
- zero-reference verification before old parents were deleted
- post-apply `gv_id` drift check on all mapped canonical targets

## 6. Verification Plan

Executed commands:

1. `node --check backend\\identity\\exu_alias_collapse_apply_v1.mjs`
2. `git diff --check -- backend\\identity\\exu_alias_collapse_apply_v1.mjs docs\\sql\\exu_alias_collapse_dry_run_v1.sql docs\\checkpoints\\EXU_ALIAS_COLLAPSE_TO_EX10_V1.md`
3. `node backend\\identity\\exu_alias_collapse_apply_v1.mjs --dry-run`
4. `git diff --check -- backend\\identity\\exu_alias_collapse_apply_v1.mjs docs\\sql\\exu_alias_collapse_dry_run_v1.sql docs\\checkpoints\\EXU_ALIAS_COLLAPSE_TO_EX10_V1.md`
5. `node backend\\identity\\exu_alias_collapse_apply_v1.mjs --apply`

Verification checks that passed:

- dry-run source `27`
- dry-run target `145`
- exact map `27`
- zero ambiguity / unmatched / reused-target rows
- zero same-token different-name conflicts
- `collapsed_count = 27`
- `remaining_unresolved_null_gvid_rows_for_exu = 0`
- canonical `ex10` row count unchanged
- zero FK references remain to old parents
- first / middle / last samples resolve through canonical `gv_id`

## 7. Post-Apply Truth

Collapsed count:

- `27`

Remaining unresolved `exu` rows:

- `0`

Old-reference inventory before apply:

- `card_print_identity = 27`
- `card_print_traits = 27`
- `card_printings = 27`
- `external_mappings = 27`
- `vault_items = 0`

Collision audit results:

- trait conflicting non-identical rows = `0`
- printing finish conflicts = `27`
- printing mergeable metadata-only rows = `27`
- printing conflicting non-identical rows = `0`
- external mapping conflict rows = `0`
- target identity rows before apply = `0`

FK movement summary:

- `updated_identity_rows = 27`
- `inserted_traits = 27`
- `deleted_old_traits = 27`
- `merged_printing_metadata_rows = 27`
- `moved_unique_printings = 0`
- `deleted_redundant_printings = 27`
- `updated_external_mappings = 27`
- `updated_vault_items = 0`
- `deleted_old_parent_rows = 27`

Post-apply truth:

- `remaining_old_parent_rows = 0`
- `remaining_unresolved_exu = 0`
- `canonical_target_count = 145`
- `target_any_identity_rows = 27`
- `target_active_identity_rows = 27`
- `target_gvid_drift_count = 0`
- `route_resolvable_target_count = 27`

Sample before / after rows:

- first: old `0588dfe9-b12f-43ea-a7ed-c410f70f8c6e` / `Unown / !` -> new `065aa0f7-6b66-4383-809f-328492ad139e` / `GV-PK-UF-EXCL`; old parent removed, active identity rows on target = `1`
- middle: old `6e2c82ff-c8e3-4fd2-a1c5-beaa104e195d` / `Unown / M` -> new `8665ed72-9bfe-46c9-b140-fd707c887175` / `GV-PK-UF-M`; old parent removed, active identity rows on target = `1`
- last: old `16f35a8a-1d54-4cf9-b010-830a155f6e29` / `Unown / Z` -> new `5c5de53e-e4fb-4eee-96d4-1b37bf260e42` / `GV-PK-UF-Z`; old parent removed, active identity rows on target = `1`

## Status

APPLY COMPLETE
