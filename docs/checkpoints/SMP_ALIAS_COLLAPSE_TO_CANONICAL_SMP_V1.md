# SMP_ALIAS_COLLAPSE_TO_CANONICAL_SMP_V1

## 1. Context

`SMP_IDENTITY_CONTRACT_V1` and `SMP_RECLASSIFICATION_AUDIT_V1` proved that the unresolved `smp` surface is an alias-lane collapse problem, not a promotion problem.

Locked truths entering this phase:

- unresolved `smp` rows = `84`
- canonical `smp` rows with non-null `gv_id` = `248`
- matching rule = exact promo code `SM##` / `SM###` plus repo/canon-aware normalized name
- canonical namespace remains legacy `GV-PK-PR-SM-*`
- this phase does not mint or rewrite any `gv_id`

## 2. Proof

Dry-run proof:

- `source_count = 84`
- `canonical_target_count = 248`
- `map_count = 84`
- `distinct_old_count = 84`
- `distinct_new_count = 84`
- `same_promo_same_name_count = 84`
- `multiple_match_old_count = 0`
- `reused_new_count = 0`
- `unmatched_count = 0`
- `same_promo_different_name_count = 0`

Canonical target occupancy before apply:

- `target_any_identity_rows = 0`
- `target_active_identity_rows = 0`

## 3. Matching Notes

The live runner uses repo/canon-aware normalization via `normalizeCardNameV1`, because raw DB-only normalization is not sufficient for `smp` formatting drift such as:

- `Snorlax GX` -> `Snorlax-GX`
- `Zekrom GX` -> `Zekrom-GX`
- `Eevee GX` -> `Eevee-GX`

## 4. FK Readiness

- `card_print_identity = 84`
- `card_print_traits = 84`
- `card_printings = 252`
- `external_mappings = 84`
- `vault_items = 0`

Collision audit at dry-run:

- trait conflicting non-identical rows = `0`
- external mapping conflicts = `0`
- printing conflicting non-identical rows = `0`
- printing metadata-only merges = `252`

## 5. Risks And Mitigation

- Risk: stale live surface.
  Mitigation: hard-gate exact `84 -> 84` proof at runtime before any write.

- Risk: non-deterministic collision on child rows.
  Mitigation: fail closed unless traits, mappings, and printings are safely mergeable.

- Risk: namespace drift.
  Mitigation: this phase does not change canonical `gv_id`; it only repoints alias rows.

## 6. Sample Collapse Anchors

Requested anchors `SM01`, `SM22`, and `SM153` were not present in the unresolved 84-row apply surface, so live anchors were taken from actual mapped rows:

- `SM05`
- `SM138`
- `SM242`

## 7. Post-Apply Truth

Apply completed successfully.

Results:

- `collapsed_count = 84`
- `deleted_old_parent_rows = 84`
- `remaining_unresolved_smp = 0`
- canonical `smp` row count unchanged at `248`
- canonical `gv_id` drift count = `0`
- route-resolvable applied target rows = `84`
- zero FK references remain to old parents

FK movement summary:

- `card_print_identity = 84` repointed
- `card_print_traits = 84` inserted onto targets and `84` old trait rows removed
- `card_printings = 252` metadata-merged and `252` redundant old printing rows removed
- `external_mappings = 84` repointed
- `vault_items = 0`

Backup artifacts created:

- `backups/smp_alias_collapse_preapply_schema.sql`
- `backups/smp_alias_collapse_preapply_data.sql`

Sample before/after rows:

- `SM05`: `Snorlax GX` old parent `3f9de029-3d04-45b2-b822-f55eef1cdceb` collapsed into canonical `17d1612c-97b7-45ec-bfc0-c79a58ee5d33` / `GV-PK-PR-SM-SM05`
- `SM138`: `Zekrom GX` old parent `ba2f531f-2b69-4a50-8c3a-fbf6f27da8a1` collapsed into canonical `7b2bb3c9-a02d-4364-9ebd-26ec0fd876c3` / `GV-PK-PR-SM-SM138`
- `SM242`: `Eevee GX` old parent `fcd57a2d-bd2e-4a5e-8130-7bf919e11023` collapsed into canonical `0f5596d1-c615-4a90-bace-0cbe31820e87` / `GV-PK-PR-SM-SM242`
