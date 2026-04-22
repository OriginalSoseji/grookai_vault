# Prize Pack Backlog Execution Playbook V1

## Purpose

This playbook is the operational source of truth for future Prize Pack backlog work. It captures the method that closed the Prize Pack milestone through evidence slicing, route repair, source acquisition, READY batch execution, and final-state checkpointing.

Use this playbook when a future chat needs to resume Prize Pack work from repo state instead of chat memory. The required starting checkpoint is `docs/checkpoints/warehouse/prize_pack_backlog_final_state_v1.json`.

## Scope

This playbook governs only Prize Pack family rows from `prize-pack-series-cards-pokemon` and their source-backed warehouse path.

Allowed work:

- Rebuild current Prize Pack state from checkpoint artifacts.
- Select one exact slice or exact batch at a time.
- Run the correct worker family for the active lane.
- Create new checkpoint artifacts for evidence, route repair, source acquisition, or READY batch closure.
- Promote only rows that are in an explicit READY candidate file and pass live audit.

Forbidden work:

- Guessing a Prize Pack series appearance.
- Promoting from no-hit or near-hit-only evidence.
- Creating synthetic series-based identities for generic Play! Pokemon stamps.
- Mutating base rows to make stamped rows fit.
- Mapping or image closure outside the exact promoted batch.
- Reopening closed checkpoints unless a new source or explicit defect proves the checkpoint is stale.

## System Invariants

- Base printed identity remains unchanged.
- Generic Play! Pokemon stamp identity uses `variant_key = play_pokemon_stamp`.
- `GENERIC_PLAY_POKEMON_STAMP_IDENTITY_RULE_V1` forbids series splitting for generic Play! Pokemon stamps.
- A row can become READY only when a lawful base route exists and exact evidence supports one Prize Pack stamped identity.
- A multi-series exact match with no printed distinction is `DO_NOT_CANON`, not another canon row.
- Exact image fields remain exact-only. Representative fallback is allowed only under `REPRESENTATIVE_IMAGE_FALLBACK_RULE_V1`.
- Every batch must be bounded by an input JSON artifact, not by a free-form query.
- Every final unresolved row must stay in one final bucket until stronger evidence appears.

Primary contracts:

- `STAMPED_IDENTITY_RULE_V1`
- `GENERIC_PLAY_POKEMON_STAMP_IDENTITY_RULE_V1`
- `EVIDENCE_TIER_V1`
- `WAREHOUSE_SOURCE_IDENTITY_CONTRACT_V1`
- `REPRESENTATIVE_IMAGE_CONTRACT_V1`
- `REPRESENTATIVE_IMAGE_FALLBACK_RULE_V1`
- `SOURCE_IMAGE_ENRICHMENT_V1`
- `SET_CLOSURE_PLAYBOOK_V1`
- `PRINTED_IDENTITY_VS_VARIANT_KEY_RULE_V1`

## Lane Definitions

### Route

The route lane resolves whether a Prize Pack source row has exactly one lawful underlying base printed identity. Route work is structural and must use current canon plus existing artifacts. It must not depend on new series evidence.

Use route repair when:

- `current_blocker_class = BASE_ROUTE_AMBIGUOUS`
- the row has multiple candidate base owners
- printed-number, name, set-token, annotation, alt-art, or special-family structure blocks the base route

Expected outputs:

- `ROUTE_RESOLVED_WAIT` when route ambiguity is closed but series evidence is still missing
- `ROUTE_RESOLVED_DO_NOT_CANON` when the route proves a non-canon or duplicate outcome
- `ROUTE_RESOLVED_READY` only when evidence was already sufficient
- `STILL_ROUTE_AMBIGUOUS` when no deterministic route exists

### Evidence

The evidence lane asks whether accessible sources prove exact Prize Pack series appearance. It never chooses a base route by guesswork.

Use evidence work when:

- route is valid
- blocker is `NO_SERIES_CONFIRMATION` or evidence insufficiency
- current sources can answer a single shared question for a bounded slice

Accepted evidence sources from the milestone:

- local official Series 1 JSON
- local official Series 2 JSON
- official Series 7 and 8 PDFs
- repo Series 3-8 fixture artifacts
- reachable Bulbapedia raw pages as lower-tier corroboration
- JustInBasil fixture rows already captured in repo artifacts

Evidence decisions:

- exact single-series corroboration -> `READY_FOR_WAREHOUSE`
- exact multi-series corroboration -> `DO_NOT_CANON`
- no exact corroboration -> `WAIT`
- near hit only -> `WAIT`

### Source Acquisition

The source acquisition lane imports official or official-equivalent checklists into local JSON. It exists because the system must not promote rows whose only missing proof is an inaccessible official source.

Use source acquisition when:

- rows are explicitly acquisition-blocked
- the missing source is official checklist coverage
- an official, CDN, first-party, or archived official PDF can be obtained

Never use community-maintained lists as Tier 1.

### Cleanup

Cleanup is a source-staging lane, not a canon lane. It exists for duplicate/error source rows that should not be confused with independent unresolved Prize Pack candidates.

Use cleanup review when:

- final bucket is `ERROR_SOURCE_DUPLICATE`
- the row has a same name-number-set companion row
- the issue is source surface hygiene, not canon identity

Cleanup must not promote, map, image-close, or mutate canon.

### Ready Batch Closure

Ready batch closure executes a candidate file produced by evidence or source-upgrade work. It is the only lane that promotes rows.

Use ready batch closure only when:

- an explicit `prize_pack_ready_batch_*_candidate.json` exists
- exact row count is reproducible
- every row is `READY_FOR_WAREHOUSE`
- every row has `variant_key = play_pokemon_stamp`
- live pre-intake audit shows no unexpected conflicts

Closure phases:

- bridge or resume exact rows
- classify exact rows
- stage exact rows
- founder approve exact rows
- dry-run executor
- apply executor
- map exact rows
- image-close exact rows with representative fallback
- write batch closure checkpoint

## End-to-End Execution Phases

### Phase 0 Rebuild Current State

Read the latest final or live checkpoint chain. For the current milestone, start with:

- `docs/checkpoints/warehouse/prize_pack_backlog_final_state_v1.json`
- latest evidence checkpoint if reopening research
- latest source acquisition checkpoint if importing new source data
- latest ready batch checkpoint if closing a candidate batch

Required reconstructed counts:

- promoted total
- `DO_NOT_CANON`
- total unresolved `WAIT`
- acquisition-blocked unresolved rows
- nonblocked no-hit rows
- nonblocked near-hit-only rows
- special-family rows
- duplicate/error source rows

Stop if counts cannot be reproduced.

### Phase 1 Classify Lane

Choose the lane from the row's blocker and available evidence:

- route ambiguity -> route repair family
- no series confirmation -> evidence family
- missing official source -> source acquisition guide and source-upgrade worker
- READY candidate file -> ready batch family
- error/duplicate source row -> cleanup review
- special family -> special-family repair path
- no exact or near evidence remaining -> final backlog state or freeze

Do not cross lanes in one pass.

### Phase 2 Select Exact Slice

Select one bounded set only:

- same blocker class
- same set family or tight set cluster
- same evidence or route question
- answerable from current sources
- no manual acquisition unless the pass is a source acquisition pass

For endgame evidence work, one row is acceptable. Do not widen artificially.

### Phase 3 Define One Question

Write one shared question into the checkpoint before enriching:

- Evidence example: "Across accessible Series 1-8 sources, does this printed identity appear in exactly one corroborated series, multiple series, or none?"
- Route example: "Does exact name plus printed number resolve to exactly one lawful canon owner?"
- Source example: "Does this official imported checklist provide exact Tier 1 evidence for the blocked rows?"

If one question cannot cover the slice, re-slice.

### Phase 4 Execute Correct Worker Family

Use only the worker family for the lane:

- route: `prize_pack_base_route_repair_v*.mjs`
- evidence: `prize_pack_evidence_v*_nonblocked.mjs`
- source acquisition: source acquisition guide plus `prize_pack_evidence_source_upgrade_v1.mjs`
- READY batch: `prize_pack_ready_batch_*`
- finalization: `prize_pack_backlog_final_state_v1.mjs`

Do not run global mapping or image jobs for Prize Pack work.

### Phase 5 Checkpoint Output

Every pass writes JSON and markdown. Required checkpoint contents:

- source artifacts
- target slice or target cluster
- shared question
- evidence or route proof used
- row-by-row final decisions
- counts
- exact next step

No checkpoint may hide unresolved rows.

### Phase 6 Close READY Batch Only From Candidate File

If READY rows are produced, create a candidate JSON containing only those newly unlocked rows. Then close exactly that candidate file through the ready batch family.

Do not:

- merge candidate batches
- substitute rows
- bridge rows from a query
- approve rows outside the exact candidate file

### Phase 7 Recompute Backlog State

After every batch or final evidence pass, recompute:

- promoted total
- `DO_NOT_CANON`
- remaining `WAIT`
- acquisition-blocked rows
- nonblocked rows
- special-family rows
- next legal action

Write the recomputed state into the checkpoint. If exact accessible evidence is exhausted, run finalization rather than more evidence slicing.

## Stop Rules

Stop immediately if:

- the current state cannot be reconstructed deterministically
- the slice is not coherent
- a route decision would require guesswork
- the pass depends on a blocked official source outside a source acquisition pass
- evidence is only near-hit but the row would be promoted
- an input file includes rows outside scope
- live audit finds unexpected conflicts
- mapping or image closure cannot remain bounded

On stop:

- preserve any partial checkpoint
- name the exact blocker
- propose the smallest bounded next slice or repair

## Anti-Drift Rules

- Use artifact files as authority, not chat memory.
- Never promote from a row list typed in a prompt.
- Never infer a checklist row that is not in the source.
- Never use community-maintained lists as Tier 1.
- Never let a series number create identity for generic Play! Pokemon stamps.
- Never write `image_url` from representative fallback.
- Never mutate base rows while creating stamped rows.
- Never reopen a closed batch to add rows.
- Always write the next step as one exact token.

## Final Unresolved Bucket Rules

The final backlog state defines the only unresolved buckets:

- `ACQUISITION_BLOCKED`: official-source confirmation is missing from the validated local source pack.
- `NONBLOCKED_NEAR_HIT_ONLY`: accessible sources show only wrong-number, wrong-token, or otherwise non-exact signal.
- `NONBLOCKED_NO_HIT`: accessible sources show no exact or usable near evidence.
- `ERROR_SOURCE_DUPLICATE`: source row is labelled error/duplicate and must not become an independent canon candidate.
- `SPECIAL_CASE_UNRESOLVED`: special-family or edge-case row remains unresolved without exact series evidence.

Rows in these buckets must remain unpromoted until stronger evidence appears.

## Resume Prompt For Future Chats

Use this prompt to resume safely:

```md
ROLE: Senior Engineer
OBJECTIVE: Resume Prize Pack backlog work from repo artifacts only.

Start from:
- docs/playbooks/PRIZE_PACK_BACKLOG_EXECUTION_PLAYBOOK_V1.md
- docs/playbooks/PRIZE_PACK_BACKLOG_DECISION_TREE_V1.md
- docs/playbooks/PRIZE_PACK_WORKER_INDEX_V1.json
- docs/checkpoints/warehouse/prize_pack_backlog_final_state_v1.json

Rules:
- Rebuild counts from artifacts.
- Choose one lane only.
- Use one exact slice or exact candidate file.
- Do not promote from no-hit or near-hit-only evidence.
- Do not modify canon unless closing a READY candidate batch through the warehouse flow.
- Write a JSON and markdown checkpoint for any new pass.
```
