# MEP Duplicate Resolution Design - 2026-05-17

Status: no-write duplicate-resolution design only. This document authorizes no Supabase writes, migrations, inserts, updates, deletes, generated GV-ID writes, card movement, set changes, identity rewrites, mapping movement, public route loosening, missing-card backfill, variant work, deploys, or production mutation.

## Purpose

Define the future cleanup shape for the 10 `mep` rows blocked by duplicate public owners and padding-convention collisions. These rows are not GV-ID backfill candidates. They are duplicate public-identity candidates where existing padded public owners already hold `GV-PK-MEP-001` through `GV-PK-MEP-010`.

## Source Evidence

- `docs/plans/pokemon_db_remediation_v1/gv_id_generation_backfill_evidence_20260517.json`
- `docs/plans/pokemon_db_remediation_v1/gv_id_mep_collision_manual_pack_20260517.md`
- `docs/plans/pokemon_db_remediation_v1/gv_id_mep_collision_manual_matrix_20260517.json`
- `live_read_only_supabase_evidence_2026-05-17`
- live read-only Supabase queries inside `begin transaction read only`

## Set Summary

| Metric | Value |
| --- | --- |
| Set code | `mep` |
| Set name | MEP Black Star Promos |
| Printed abbreviation | MEP |
| Total DB card_prints | 20 |
| Rows with gv_id | 10 |
| Rows missing gv_id | 10 |
| Distinct direct numbers | 20 |

Active mapping sources in the full `mep` set:

| Source | Mapping rows | Mapped card_prints |
| --- | --- | --- |
| tcgdex | 10 | 10 |

## Design Summary

| Metric | Count |
| --- | --- |
| Duplicate pairs audited | 10 |
| Existing public-owner survivor candidates | 10 |
| Pairs with same normalized name and number | 10 |
| Duplicate rows with gv_id | 0 |
| Duplicate rows with user/market refs | 0 |
| Survivor rows with gv_id | 10 |
| Survivor rows with user/market refs | 0 |
| Pairs requiring TCGdex mapping preservation | 10 |
| Manual hard-stop pairs | 0 |
| Future GV-ID writes recommended | 0 |
| Future deletes allowed | 0 |

## Canonical Survivor Selection Rules

The future canonical survivor candidate for each pair is the existing public owner row when all gates continue to pass:

- survivor owns padded stable public `gv_id` in the `GV-PK-MEP-00N` format;
- duplicate row has no `gv_id`;
- duplicate and survivor share normalized card name;
- duplicate unpadded number and survivor padded number normalize to the same printed identity;
- duplicate row has no user, vault, pricing, or market references;
- survivor public route identity remains active;
- no active source mapping would become active on two `card_prints` rows after preservation.

The duplicate row should not become survivor merely because it owns TCGdex source evidence. Source evidence should be preserved onto the public survivor only after a separate prewrite gate proves the mapping move is safe.

## Pair Matrix

| Card | Duplicate # | Survivor # | Public survivor | Design class | Mapping action | Dup refs | Survivor refs |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Meganium | 1 | 001 | GV-PK-MEP-001 | PUBLIC_OWNER_SURVIVOR_WITH_SOURCE_PRESERVATION | PRESERVE_BY_FUTURE_MAPPING_REASSIGNMENT_TO_SURVIVOR | 0 | 0 |
| Inteleon | 2 | 002 | GV-PK-MEP-002 | PUBLIC_OWNER_SURVIVOR_WITH_SOURCE_PRESERVATION | PRESERVE_BY_FUTURE_MAPPING_REASSIGNMENT_TO_SURVIVOR | 0 | 0 |
| Alakazam | 3 | 003 | GV-PK-MEP-003 | PUBLIC_OWNER_SURVIVOR_WITH_SOURCE_PRESERVATION | PRESERVE_BY_FUTURE_MAPPING_REASSIGNMENT_TO_SURVIVOR | 0 | 0 |
| Lunatone | 4 | 004 | GV-PK-MEP-004 | PUBLIC_OWNER_SURVIVOR_WITH_SOURCE_PRESERVATION | PRESERVE_BY_FUTURE_MAPPING_REASSIGNMENT_TO_SURVIVOR | 0 | 0 |
| Drifloon | 5 | 005 | GV-PK-MEP-005 | PUBLIC_OWNER_SURVIVOR_WITH_SOURCE_PRESERVATION | PRESERVE_BY_FUTURE_MAPPING_REASSIGNMENT_TO_SURVIVOR | 0 | 0 |
| Drifblim | 6 | 006 | GV-PK-MEP-006 | PUBLIC_OWNER_SURVIVOR_WITH_SOURCE_PRESERVATION | PRESERVE_BY_FUTURE_MAPPING_REASSIGNMENT_TO_SURVIVOR | 0 | 0 |
| Psyduck | 7 | 007 | GV-PK-MEP-007 | PUBLIC_OWNER_SURVIVOR_WITH_SOURCE_PRESERVATION | PRESERVE_BY_FUTURE_MAPPING_REASSIGNMENT_TO_SURVIVOR | 0 | 0 |
| Golduck | 8 | 008 | GV-PK-MEP-008 | PUBLIC_OWNER_SURVIVOR_WITH_SOURCE_PRESERVATION | PRESERVE_BY_FUTURE_MAPPING_REASSIGNMENT_TO_SURVIVOR | 0 | 0 |
| Alakazam | 9 | 009 | GV-PK-MEP-009 | PUBLIC_OWNER_SURVIVOR_WITH_SOURCE_PRESERVATION | PRESERVE_BY_FUTURE_MAPPING_REASSIGNMENT_TO_SURVIVOR | 0 | 0 |
| Riolu | 10 | 010 | GV-PK-MEP-010 | PUBLIC_OWNER_SURVIVOR_WITH_SOURCE_PRESERVATION | PRESERVE_BY_FUTURE_MAPPING_REASSIGNMENT_TO_SURVIVOR | 0 | 0 |

## Mapping Preservation

The duplicate side carries the source evidence that made this lane visible. Future cleanup must preserve active TCGdex mappings and any `external_ids.tcgdex` evidence. The likely future action is to reassign the active TCGdex mapping from the duplicate row to the existing public survivor row, but that is not authorized here.

Required future mapping gates:

- verify every duplicate row still owns exactly the expected active TCGdex external id;
- verify the public survivor does not already own a conflicting active TCGdex mapping;
- verify `(source, external_id)` uniqueness remains one active owner after the planned move;
- snapshot all external mappings and `external_ids` payloads for both sides;
- preserve original duplicate row ids in the execution checkpoint.

## Public/Search Surface Impact

Live read-only evidence shows the 20 `mep` rows appear in app-facing search/web views by internal row identity, while only the padded survivor rows have stable public `gv_id` values. Future cleanup must keep `/card/[gv_id]` strict and must verify search prefers or resolves to the padded public-owner rows after source preservation.

| Surface | Available | Match basis | Matched rows |
| --- | --- | --- | --- |
| card_prints_public | true |  | 0 |
| v_card_prints_web_v1 | true | card_print_id | 20 |
| v_card_search | true | id | 20 |

This is not a reason to expose duplicate rows publicly. It is a future verification requirement: no stable `gv_id`, no public card route; search should not create a second public identity for the duplicate/source-shadow row.

## Vault, Pricing, And Reference Preservation

Current evidence shows the duplicate side has no user/market references. The survivor side may own public, vault, pricing, or derived references and must remain the public owner. A future write plan must treat survivor references as authoritative and must not move them away from the padded public owner.

If any duplicate-side user, vault, pricing, or market reference appears in a fresh prewrite gate, that pair leaves the lightweight mapping-preservation lane and becomes a manual hard stop.

## Future Write-Plan Shape

A future executable plan, if separately approved, should be split into guarded phases:

1. Snapshot duplicate and survivor rows, mappings, identity rows, public view membership, and all FK references.
2. Reassign only approved active TCGdex source mappings from duplicate rows to survivor rows after uniqueness checks.
3. Preserve duplicate rows as non-public duplicate/source-shadow rows until a supported alias/quarantine marker exists.
4. Do not assign `GV-PK-MEP-1` through `GV-PK-MEP-10`.
5. Do not delete card rows.

## Rollback Strategy

Any future transaction must be reversible without deletes. Rollback must restore:

- TCGdex mapping ownership to the original duplicate row;
- any active/inactive mapping flags changed by the future transaction;
- duplicate and survivor `card_prints` fields if any approved non-public marker changes later;
- FK references to their original card_print ids if a future manual referenced-row lane ever exists;
- public route behavior for the padded survivor IDs.

## Hard Stop Gates

Stop before any future execution if:

- pair count is not exactly 10;
- any duplicate row has or gains a `gv_id`;
- any survivor loses its padded `GV-PK-MEP-00N` public ID;
- any normalized name or number pair no longer matches;
- any duplicate row has user/vault/pricing/market references;
- any survivor already owns a conflicting active TCGdex mapping;
- any future plan includes delete statements;
- any future plan loosens public web gates or exposes rows without stable `gv_id`;
- rollback snapshots are missing.

## Post-Write Audit Queries

Future post-write checks must prove:

- `GV-PK-MEP-001` through `GV-PK-MEP-010` still resolve to the same public survivor rows;
- no unpadded `GV-PK-MEP-1` through `GV-PK-MEP-10` IDs exist;
- active TCGdex mappings resolve to exactly one approved survivor row each;
- duplicate rows remain non-public and without `gv_id`;
- no card_print rows were deleted;
- no set rows changed;
- no missing-card backfill, variant work, or card movement occurred.

## No-Write Confirmation

- No Supabase writes.
- No migrations.
- No inserts.
- No updates.
- No deletes.
- No generated GV-ID backfill.
- No mapping movement.
- No public route gate loosening.
