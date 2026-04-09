# HGSSP_ALIAS_COLLAPSE_V1

## 1. Context

`hgssp` was classified by the remaining identity surface audit as `ALIAS_COLLAPSE`.

This surface is alias-only rather than promotion or namespace creation because:

- unresolved `hgssp` parents were all null-`gv_id`
- the surface consisted of `25` symbolic promo tokens (`HGSS01` through `HGSS25`)
- no lawful new namespace was required
- one canonical live namespace could absorb the full surface without ambiguity

Canonical target discovery was done from live data, not memory:

- all live `gv_id` rows were scanned as candidate targets
- candidate target namespaces were ranked by exact printed token + normalized-name coverage
- only one namespace fully covered the unresolved `hgssp` surface
- the winning target namespace was `hsp`

Artifacts for this phase:

- [backend/identity/hgssp_alias_collapse_apply_v1.mjs](/C:/grookai_vault/backend/identity/hgssp_alias_collapse_apply_v1.mjs)
- [docs/sql/hgssp_alias_target_audit_and_dry_run_v1.sql](/C:/grookai_vault/docs/sql/hgssp_alias_target_audit_and_dry_run_v1.sql)
- [backups/hgssp_alias_collapse_preapply_schema.sql](/C:/grookai_vault/backups/hgssp_alias_collapse_preapply_schema.sql)
- [backups/hgssp_alias_collapse_preapply_data.sql](/C:/grookai_vault/backups/hgssp_alias_collapse_preapply_data.sql)

## 2. Problem

Unresolved alias-lane `hgssp` rows were still attached to null-`gv_id` parents in `card_prints`.

That left the HGSS promo surface outside the canonical namespace even though the live canonical promo rows already existed and already carried the route-layer `gv_id` values.

## 3. Decision

Collapse unresolved `hgssp` parents into the proven canonical target namespace `hsp` using a frozen one-to-one map:

- exact printed token
- normalized printed name

Hard gates that passed:

- source surface restricted to `card_print_identity.set_code_identity = 'hgssp'`
- source parents restricted to `card_prints.gv_id is null`
- canonical target discovered from live data as one namespace only: `hsp`
- no multiple canonical matches
- no reused target rows
- no unmatched rows
- no same-token different-name conflicts
- no new `gv_id`
- no target `gv_id` mutation
- no row outside `hgssp` and canonical `hsp` entered scope

## 4. Proof

Target discovery proof:

- unresolved `hgssp` source count = `25`
- candidate target namespaces with full exact-token + normalized-name coverage = `1`
- winning target set code = `hsp`
- winning target row count = `25`

Frozen map proof:

- exact token + normalized-name map count = `25`
- distinct old ids = `25`
- distinct new ids = `25`
- unmatched count = `0`
- multiple-match count = `0`
- reused target count = `0`
- same-token different-name conflict count = `0`
- non-null old parent set-code count = `0`
- out-of-scope target count = `0`
- target identity rows before apply = `0`

Representative frozen samples:

- first: `Ho-Oh / HGSS01` -> canonical `GV-PK-PR-HS-HGSS01`
- middle: `Smoochum / HGSS13` -> canonical `GV-PK-PR-HS-HGSS13`
- last: `Hitmonlee / HGSS25` -> canonical `GV-PK-PR-HS-HGSS25`

Namespace consistency:

- canonical target set code = `hsp`
- canonical `hsp` live row count before apply = `25`
- canonical `hsp` live row count after apply = `25`
- canonical target `gv_id` drift count after apply = `0`

## 5. Risks

Primary risks:

- wrong target discovery
- FK collision during repoint
- stale apply surface if live counts drifted from the audit expectation
- false alias classification

Controls used:

- runner discovers the target namespace from live data before any apply work
- hard stop if zero or multiple full-surface target namespaces appear
- hard stop on unmatched rows, reused targets, multiple matches, or same-token different-name conflicts
- pre-apply schema and data backups written before movement
- zero-reference verification before deleting old parents
- post-apply `gv_id` drift checks on canonical targets

## 6. Verification Plan

Executed commands:

1. `node --check backend\\identity\\hgssp_alias_collapse_apply_v1.mjs`
2. `git diff --check -- backend\\identity\\hgssp_alias_collapse_apply_v1.mjs docs\\sql\\hgssp_alias_target_audit_and_dry_run_v1.sql docs\\checkpoints\\HGSSP_ALIAS_COLLAPSE_V1.md`
3. `node backend\\identity\\hgssp_alias_collapse_apply_v1.mjs --dry-run`
4. `git diff --check -- backend\\identity\\hgssp_alias_collapse_apply_v1.mjs docs\\sql\\hgssp_alias_target_audit_and_dry_run_v1.sql docs\\checkpoints\\HGSSP_ALIAS_COLLAPSE_V1.md`
5. `node backend\\identity\\hgssp_alias_collapse_apply_v1.mjs --apply`

Verification checks that passed:

- discovered target namespace = `hsp`
- source count = `25`
- target count = `25`
- exact map = `25`
- zero ambiguity / unmatched / reused-target rows
- zero same-token different-name conflicts
- `collapsed_count = 25`
- `remaining_unresolved_null_gvid_rows_for_hgssp = 0`
- canonical `hsp` row count unchanged
- zero FK references remain to old parents
- first / middle / last samples resolve through canonical `gv_id`

## 7. Post-Apply Truth

Collapsed count:

- `25`

Remaining unresolved `hgssp` rows:

- `0`

Target set code:

- `hsp`

Old-reference inventory before apply:

- `card_print_identity = 25`
- `card_print_traits = 25`
- `card_printings = 25`
- `external_mappings = 25`
- `vault_items = 0`

Collision audit results:

- trait conflicting non-identical rows = `0`
- printing finish conflicts = `25`
- printing mergeable metadata-only rows = `25`
- printing conflicting non-identical rows = `0`
- external mapping conflict rows = `0`
- target identity rows before apply = `0`

FK movement summary:

- `updated_identity_rows = 25`
- `inserted_traits = 25`
- `deleted_old_traits = 25`
- `merged_printing_metadata_rows = 25`
- `moved_unique_printings = 0`
- `deleted_redundant_printings = 25`
- `updated_external_mappings = 25`
- `updated_vault_items = 0`
- `deleted_old_parent_rows = 25`

Post-apply truth:

- `remaining_old_parent_rows = 0`
- `remaining_unresolved_hgssp = 0`
- `canonical_target_count = 25`
- `target_any_identity_rows = 25`
- `target_active_identity_rows = 25`
- `target_gvid_drift_count = 0`
- `route_resolvable_target_count = 25`

Sample before / after rows:

- first: old `b4064fda-3d84-436d-ae96-04d614689e7a` / `Ho-Oh / HGSS01` -> new `dd605037-f2bf-42b9-838a-a1bfe7217f08` / `GV-PK-PR-HS-HGSS01`; old parent removed, active identity rows on target = `1`
- middle: old `da963e26-cb9e-497f-990d-26b907ea4430` / `Smoochum / HGSS13` -> new `cbf4e790-a00b-4a6b-8994-4ff6f94402fd` / `GV-PK-PR-HS-HGSS13`; old parent removed, active identity rows on target = `1`
- last: old `3f19486b-766f-4a68-8470-433793506e7b` / `Hitmonlee / HGSS25` -> new `03cdb9dc-39a6-4375-b9e6-c97beac1c7ff` / `GV-PK-PR-HS-HGSS25`; old parent removed, active identity rows on target = `1`

## Status

APPLY COMPLETE
