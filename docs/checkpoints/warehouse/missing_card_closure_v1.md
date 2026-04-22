## Missing Card Closure V1

### Context

First bounded missing-card closure test for `me02` using the audited 2-card batch:

- Charcadet 022
- Ghastly 054/094

Intended goal: prove the canonical expansion pipeline can promote source-present, canon-missing singles through warehouse classification, founder approval, staging, executor apply, and downstream surfacing.

### Pipeline Path Used

1. `external_discovery_to_warehouse_bridge_v1.mjs` had already staged both `me02` candidates into `canon_warehouse_candidates` as `RAW`.
2. `classification_worker_v1.mjs --candidate-id=... --apply`
3. Founder review against the candidate payloads and latest warehouse packages
4. Founder approval mutation to `APPROVED_BY_FOUNDER`
5. `promotion_stage_worker_v1.mjs --candidate-id=... --apply`
6. `promotion_executor_v1.mjs --staging-id=...`
7. `promotion_executor_v1.mjs --staging-id=... --apply`

### Verification Before Executor Apply

Both candidates classified cleanly:

- `state = REVIEW_READY`
- `proposed_action_type = CREATE_CARD_PRINT`
- `interpreter_reason_code = NO_EXISTING_CANON_MATCH_CREATE_ROW`
- no ambiguity flags
- no matched canonical row in the warehouse resolver package

Both candidates staged cleanly:

- Charcadet staging id: `92a18c69-eb44-40f8-97b9-c0f62adc2aa9`
- Ghastly staging id: `ff8cd603-30d6-4d9c-b81e-56254f293f9f`

Executor dry-run also passed for both staging rows.

### Exact Blocker Found

Executor apply failed for both staging rows:

- Charcadet: `card_print_insert_conflict:me02:022`
- Ghastly: `card_print_insert_conflict:me02:054`

Live canon evidence shows those identities are already occupied in `me02`:

- `me02 / 022` already exists as `Dewgong`
- `me02 / 054` already exists as `Gastly`

Those existing canon rows also already carry active `justtcg` mappings:

- `pokemon-me02-phantasmal-flames-dewgong-022-094-common`
- `pokemon-me02-phantasmal-flames-gastly-common`

This means the audited batch was not actually "canon-missing" at execution time.

### Why Classification Missed It

The current warehouse classification path can classify a documented source-backed candidate as `CREATE_CARD_PRINT` when resolver search does not return an existing canonical row:

- classification resolves existing rows through `public.search_card_prints_v1(...)`
- if nothing is resolved, it falls through to `NO_EXISTING_CANON_MATCH_CREATE_ROW`

The executor then performs the harder identity occupancy check against `card_prints` by set + number + variant and correctly refuses to insert over an occupied slot.

Additional storage mismatch observed on the occupied canon rows:

- existing `card_prints.variant_key = ''` instead of `null`
- existing `card_prints.number_plain` is zero-padded (`022`, `054`)

That mismatch contributes to the executor surfacing a generic insert conflict instead of a cleaner existing-row/name-conflict message, but it is not the only issue:

- `Ghastly` vs `Gastly` is an alias/spelling disagreement
- `Charcadet 022` vs existing `Dewgong 022` is a direct occupied-slot collision

### Outcome

This batch must STOP here.

It is not safe to promote either candidate as a new canonical row because:

- the `me02` number slots are already occupied in canon
- one candidate appears to be an alias/routing problem
- the other is a direct identity collision

### Invariants Preserved

- no new `card_prints` rows were inserted
- no candidate reached `PROMOTED`
- no external mappings were rewritten
- no image enrichment ran against new canon rows
- the warehouse executor refused to write through an occupied canonical identity

### Current State Snapshot

- candidates remain `STAGED_FOR_PROMOTION`
- staging rows are `FAILED`
- `promotion_result_type` is still null for both candidates

### Required Follow-Up

Run a bounded identity/canon audit for these two `me02` slots before any further missing-card closure attempt:

1. determine whether `Ghastly` should resolve to existing `Gastly`
2. determine why upstream/source claims `Charcadet 022` while canon already holds `Dewgong 022`
3. normalize or repair the occupancy/resolution rule before selecting the next missing-card test batch

