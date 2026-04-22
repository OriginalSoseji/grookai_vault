# Prize Pack Backlog Decision Tree V1

Use this decision tree after rebuilding current Prize Pack state from `docs/checkpoints/warehouse/prize_pack_backlog_final_state_v1.json`.

## 1. Start With The Row State

For each target row, inspect:

- `current_blocker_class`
- final backlog bucket
- evidence signal
- source external id
- base route fields
- whether a READY candidate file already exists

Do not choose a worker before the row's lane is clear.

## 2. BASE_ROUTE_AMBIGUOUS

If blocker = `BASE_ROUTE_AMBIGUOUS`:

- Use `prize_pack_base_route_repair_family.README.md`.
- Select one structural ambiguity cluster.
- Ask one route question.
- Output `ROUTE_RESOLVED_WAIT`, `ROUTE_RESOLVED_DO_NOT_CANON`, `ROUTE_RESOLVED_READY`, or `STILL_ROUTE_AMBIGUOUS`.

Do not run evidence slicing until the route is deterministic.

## 3. NO_SERIES_CONFIRMATION

If blocker = `NO_SERIES_CONFIRMATION` and the row is not acquisition-blocked:

- Use `prize_pack_evidence_family.README.md`.
- Select one small coherent evidence slice.
- Use Series 1-2 local JSON, Series 3-8 fixtures, and reachable Bulbapedia raw pages.
- Classify exact single-series as READY.
- Classify exact multi-series as DO_NOT_CANON.
- Keep no-hit or near-hit-only rows in WAIT.

If final state says `WAIT_REMAINING_EXACT_ACCESSIBLE_HIT = 0`, do not keep slicing unless a genuinely new authoritative source appears.

## 4. ACQUISITION_BLOCKED

If bucket = `ACQUISITION_BLOCKED`:

- Use `PRIZE_PACK_SOURCE_ACQUISITION_GUIDE_V1.md`.
- Acquire only official or official-equivalent source material.
- Normalize to local JSON.
- Validate with `prize_pack_evidence_source_upgrade_v1.mjs` or a scoped successor.

Do not use a wiki, marketplace page, curated list, or guessed entry as Tier 1.

## 5. READY

If row = `READY_FOR_WAREHOUSE`:

- Use `prize_pack_ready_batch_family.README.md`.
- Execute only from an exact candidate JSON.
- Run live pre-intake audit.
- Bridge/resume exact rows.
- Classify, stage, approve, dry-run, apply, map, and image-close only those rows.

If any row is not in the candidate file, it is out of scope.

## 6. ERROR_SOURCE_DUPLICATE

If bucket = `ERROR_SOURCE_DUPLICATE`:

- Use `ERROR_SOURCE_CLEANUP_REVIEW`.
- Treat it as source-staging cleanup only.
- Do not create a canon row.
- Do not merge it into a READY batch.

Example final-state row:

- `Cynthia's Gible | 102/182 | sv10 | pokemon-prize-pack-series-cards-cynthia-s-gible-error-common`

## 7. SPECIAL_FAMILY

If bucket = `SPECIAL_CASE_UNRESOLVED` or blocker = `SPECIAL_IDENTITY_FAMILY_COLLISION`:

- Use the special-family repair path.
- Start from `docs/checkpoints/warehouse/prize_pack_special_identity_family_repair_v1.json`.
- Do not promote unless exact Prize Pack series evidence exists.

Example final-state row:

- `Team Rocket's Mewtwo ex | 079/217`

## 8. No Accessible Evidence Remains

If:

- no exact accessible hit remains
- only no-hit or near-hit-only rows remain
- acquisition-blocked rows require stronger source material

Then choose `FINALIZE_PRIZE_PACK_BACKLOG_STATE` or `PRIZE_PACK_BACKLOG_FREEZE`.

Do not force another evidence slice.

## 9. Next-Step Tokens

Use only one of these next-step families:

- `PRIZE_PACK_READY_BATCH_*`
- `PRIZE_PACK_FAMILY_ONLY_EVIDENCE_STRATEGY_*`
- `PRIZE_PACK_BASE_ROUTE_REPAIR_*`
- `SERIES_2_OR_OTHER_OFFICIAL_SOURCE_ACQUISITION`
- `NONBLOCKED_RESEARCH_REOPEN`
- `ERROR_SOURCE_CLEANUP_REVIEW`
- `PRIZE_PACK_SPECIAL_IDENTITY_FAMILY_REPAIR_*`
- `FINALIZE_PRIZE_PACK_BACKLOG_STATE`
- `PRIZE_PACK_BACKLOG_FREEZE`
