# Pokemon DB Remediation V1 Checkpoint - 2026-05-17

Status: checkpoint only. This document authorizes no Supabase writes, migrations, inserts, updates, deletes, route writes, card backfills, variant writes, or production data mutation.

## Complete Planning Chain

The remediation chain now has reviewable no-write artifacts for each required phase:

| Phase | Status | Primary artifacts |
| --- | --- | --- |
| Set canonicalization | Planned and dry-run audited | `set_canonicalization_plan.md`, `set_canonicalization_dry_run_20260517.md` |
| Alias dependency evidence | Planned and audited | `set_alias_dependency_audit_20260517.md`, `set_alias_prewrite_evidence_20260517.md` |
| Alias route classification | Planned, executed only for approved route fixes, verified | `set_alias_route_classification_write_plan_20260517.md`, `set_alias_route_classification_execution_20260517.md` |
| Alias metadata preservation | Planned only | `set_alias_metadata_preservation_plan_20260517.md` |
| Missing set universe | Classified only | `missing_set_universe_decision_20260517.md` |
| Number normalization | Evidence and dry-run plan only | `number_normalization_evidence_20260517.md`, `number_normalization_dry_run_implementation_plan_20260517.md` |
| Missing card checklist backfill | Evidence and dry-run plan only | `missing_cards_backfill_evidence_20260517.md`, `missing_cards_backfill_dry_run_implementation_plan_20260517.md` |
| Variant authority | V2 authority plan only | `variant_authority_model_v2_plan_20260517.md` |

## Actually Written

Only one approved DB mutation has occurred in Pokemon DB Remediation V1:

| Scope | Rows | Result |
| --- | ---: | --- |
| `set_code_classification.sv3pt5` | 1 | routed/classified to canonical `sv03.5` |
| `set_code_classification.sm35` | 1 | inserted as alias route/classification to canonical `sm3.5` |

Boundary of the executed write:

- no card rows moved
- no set rows deleted
- no alias rows deleted
- no metadata merged
- no external mappings moved
- no missing cards inserted
- no variants inserted
- no migrations

The execution is documented in `set_alias_route_classification_execution_20260517.md`.

## Remains No-Write

The following remain planning/evidence only:

- all remaining alias metadata preservation decisions
- all set-row canonicalization or alias-row structural changes
- all missing-set target creation or source-route changes
- all number normalization writes
- all missing-card checklist backfill writes
- all secret-range card decisions
- all variant authority/schema/backfill work
- all pricing, vault, scanner, and route changes outside the two executed classifications

## Blocked Hard Stops

These canonicalization groups remain blocked and must not enter any broad write scope:

| Name key | Codes | Reason |
| --- | --- | --- |
| Paldean Fates | `sv04.5` / `sv4pt5` | both sides own unique real card identities |
| Pokemon GO | `pgo` / `swsh10.5` | both sides own unique real card identities |
| Prismatic Evolutions | `sv08.5` / `sv8pt5` | both sides own unique real card identities |
| Shrouded Fable | `sv06.5` / `sv6pt5` | both sides own unique real card identities |

Number normalization also inherits these blocks for rows in the same set groups.

## Review Stops

These canonicalization groups remain review stops because both sibling sets contain overlapping duplicate card rows:

| Name key | Codes |
| --- | --- |
| Best of Game | `bog` / `bp` |
| EX Trainer Kit 2 Minun | `tk-ex-m` / `tk2b` |
| EX Trainer Kit 2 Plusle | `tk-ex-p` / `tk2a` |
| EX Trainer Kit Latias | `tk-ex-latia` / `tk1a` |
| EX Trainer Kit Latios | `tk-ex-latio` / `tk1b` |

No write plan should include these without a dedicated source-authority decision.

## Current Evidence Totals

| Area | Result |
| --- | ---: |
| Physical Pokemon set rows audited | 239 |
| PkmnCards master set/collection pages parsed | 194 |
| Master checklist rows parsed | 20,884 |
| Missing checklist rows vs PkmnCards | 617 |
| Missing secret-range cards | 30 |
| Missing master sets with no DB match | 18 |
| Duplicate physical set-name groups | 29 |
| DB variant slots | 2,901 |
| TCGdex variant signals | 21,066 |
| PokemonTCG/TCGPlayer variant signals | 32,449 |

## Next Authorized Implementation Queue

No implementation is authorized by this checkpoint. If authorization is granted later, the queue should remain narrow and evidence-gated:

1. Route/classification follow-ups: none immediate; route review queue is currently clean after `sv3pt5` and `sm35`.
2. Alias metadata: source-payload diff only before any null-only metadata copy is considered.
3. Missing set universe: target-set dry-run for TCG Classic decks and source-route proof for Shiny Vault/Rumble before card rows.
4. Number normalization: dry-run candidate pack for 504 numeric non-hard-stop rows, with duplicate/identity gates.
5. Missing cards: no direct import; start only with established-set candidate dry-runs after set and number blockers clear.
6. Variants: freeze writes until `VARIANT_AUTHORITY_MODEL_V2` is approved and a read-only source vocabulary inventory exists.
7. Hard stops: separate evidence investigations only, one group at a time.

## Release Impact

The only production-visible DB change is route/search classification for `sv3pt5` and `sm35`. That should improve alias routing without changing canonical cards, set rows, metadata, mappings, vault ownership, pricing, or variants.

All other remediation work is documentation, evidence, and dry-run planning. It should not change runtime behavior until a future explicitly authorized write plan is executed.

## Stop Condition

Stop before any further Supabase mutation. The next task may draft more evidence or SQL dry-run plans, but it must not execute writes unless explicitly authorized with a fresh preflight and a narrow transaction scope.
