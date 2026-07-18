# CARD_VISUAL_FACT_GRAPH_V2_LAUNCH_VALUE_25_LIVE_LOCK_FAILED_20260717

Date: 2026-07-17

## Context

Fact Graph V2 had passed deterministic offline replay for the prior launch-value 25-card payloads. The next gate was a fresh paid OpenAI dry run over the same explicit 25 card IDs, with Energies deferred and code frozen for the duration of the run.

## Problem

The first live-lock attempt exposed an operational gap: the OpenAI `fetch()` call had retry handling after failures but no bounded per-request abort. A stuck provider request could hold the run indefinitely before producing any artifact.

After adding a bounded request timeout and progress logging, the completed live-lock dry run still failed the lock criteria because only 18 of 25 cards structurally validated.

## Risk

Do not run larger batches while structural validation can fail on predictable fact-graph shapes. Bigger batches would produce expensive failure volume instead of production-ready private rows.

## Decision

Live lock is not claimed.

Do not proceed to:

- 125-card dry run
- database apply
- approvals
- embeddings
- public reads
- semantic search
- Taste Engine
- Listing Resolver
- Grookai Signature
- story generation

## Alternatives Rejected

- Treating 18 validated rows as enough for a larger batch: rejected because the stated lock threshold requires structural validation across the sample.
- Patching during the paid run: rejected. The completed run was allowed to finish unchanged after the timeout/logging reliability repair.
- Treating pending rows as approvable from text artifacts: rejected. Pending rows remain private generated candidates only.
- Ignoring object-ID failures as model variance: rejected because they break the observation-backbone invariant.

## Migration Applied

No migration was applied in this gate.

Existing storage target remains `card_print_visual_descriptions`, with `visual_attributes.fact_graph` as the Fact Graph V2 source truth.

## One-Card Apply Proof

No database apply occurred in this gate.

The prior one-card apply proof remains the existing proof for the private table and is not extended by this run.

## Current Truths

- Branch: `feature/card-visual-description-agent`
- Base repair commit before this turn: `f4e4857a97987b31b664fb218caabd708d0536c2`
- This gate added operational timeout/progress instrumentation before the completed run.
- Completed live-lock run: `docs/audits/card_visual_fact_graph_v2_launch_value_25_live_lock_dry_run/2026-07-17T23-38-05-345Z_dry_run_441470da849a/`
- Result: 25 attempted, 18 structurally validated, 7 structural failures, 0 skipped.
- Validated rows: 14 `needs_review`, 4 `pending`.
- One timeout retry occurred and then validated on retry.
- No database writes occurred.
- Energies remained deferred.

## Invariants

- `visual_attributes.fact_graph` is source truth.
- Every reusable fact must trace to the observation backbone.
- `scene_subject`, `depicted_subject`, and `character_representation` remain separate concepts.
- Card UI and print-marker evidence remain separate from artwork facts.
- Interpreted expression and personality labels are not accepted as facts.
- Physical card-surface claims require reliable evidence or abstention.
- `artwork_description` remains compatibility-only digest text.

## Token And Cost Result

Completed live-lock run:

- OpenAI requests: 26
- Retries: 1
- Input tokens: 220006
- Output tokens: 104332
- Total tokens: 324338
- Cached input tokens: 51840
- Estimated cost: `$0.2393816`
- Average estimated cost per structurally validated card: `$0.01329898`
- 500-card projection from validated average: `$6.64949`
- 1000-card projection from validated average: `$13.29898`

Timeout probe:

- One card
- 15s timeout
- 1 request
- 0 tokens
- 0 cost
- Result: bounded `generation_exception`, proving timeout artifacts are written.

## Why The Visual Layer Remains Derived Intelligence

The run demonstrates that model output can still violate graph invariants even when the architecture is correct. These rows are generated private intelligence, not canonical identity, print truth, or approved user-facing data. Human review and deterministic validators remain required boundaries.

## What Must Never Be Broken

- Never allow semantic facts that lack observation-backed support.
- Never let objects create IDs outside the observation backbone.
- Never accept environment, setting, weather, or time-of-day claims without evidence or explicit uncertainty.
- Never store interpreted expressions such as `annoyed expression` as facts.
- Never copy artwork facts into variant-specific print-marker truth without variant image evidence.
- Never generate embeddings or downstream search/Taste integrations from unapproved/unlocked fact graphs.

## Exact Failure Classes

1. Environment claim without support:
   - GV-PK-JPN-M5-113 `Mega Chandelure ex`
   - Claimed `indoor` with empty `supporting_observation_ids`.

2. Unsupported semantic fact labels:
   - GV-PK-JPN-M5-118 `Mega Darkrai ex`: `mouth not visible`
   - GV-PK-JPN-M5-097 `Mega Chandelure ex`: `haunted or ghostly environment`
   - GV-PK-JPN-M5-063 `メガドリュウズex`: `annoyed expression`
   - GV-PK-JPN-M5-110 `Rust Syndicate Grunt`: `two green palms`
   - GV-PK-JPN-TCGCOLLECTOR11526-019 `Magnetic Storm`: `night`

3. Object/module IDs outside observation backbone:
   - GV-PK-JPN-TCGCOLLECTOR11525-019 `High Pressure System`
   - Missing IDs: `obj_palm_trees_left_001`, `obj_palm_trees_right_001`, `obj_stone_steps_001`, `obj_stone_wall_001`

## Artifacts

- Failure report: `docs/audits/card_visual_fact_graph_v2_launch_value_25_live_lock_dry_run/2026-07-17T23-38-05-345Z_dry_run_441470da849a/LIVE_LOCK_FAILURE_REPORT.md`
- Review packet: `docs/audits/card_visual_fact_graph_v2_launch_value_25_live_lock_dry_run/2026-07-17T23-38-05-345Z_dry_run_441470da849a/FACT_GRAPH_V2_REVIEW_PACKET.md`
- Summary: `docs/audits/card_visual_fact_graph_v2_launch_value_25_live_lock_dry_run/2026-07-17T23-38-05-345Z_dry_run_441470da849a/summary.json`
- Generated rows: `docs/audits/card_visual_fact_graph_v2_launch_value_25_live_lock_dry_run/2026-07-17T23-38-05-345Z_dry_run_441470da849a/generated_outputs.jsonl`
- Validation failures: `docs/audits/card_visual_fact_graph_v2_launch_value_25_live_lock_dry_run/2026-07-17T23-38-05-345Z_dry_run_441470da849a/validation_failures.jsonl`
- Run plan: `docs/audits/card_visual_fact_graph_v2_launch_value_25_live_lock_dry_run/2026-07-17T23-38-05-345Z_dry_run_441470da849a/run_plan.json`
- Live run logs: `docs/audits/card_visual_fact_graph_v2_launch_value_25_live_lock_dry_run/_run_logs_live_lock_timeout_logged_explicit_ids_2026-07-17T17-38-05-237Z/`
- Timeout probe: `docs/audits/card_visual_fact_graph_v2_launch_value_25_live_lock_timeout_probe/2026-07-17T23-36-33-532Z_dry_run_7af3da5bea1a/`

## Artifact Hashes

- `summary.json`: `bd3b5de52f8bc503f2632b5d9443bc394d6d553d9232b4f07ef9d1a679e2dd72`
- `run_plan.json`: `a0161a55d96bf7da1d8511a5bd0a63f13862cc6584a2633b286214f87401ef21`
- `generated_outputs.jsonl`: `986357eb959739e1fbb7c3c6cad4fa2eab84112555517512ef2d24dd40ab7d08`
- `validation_failures.jsonl`: `9dc6f10635c7ae94d425ecd714eabf5dc04eff878647bae34435e877ae15269a`
- `FACT_GRAPH_V2_REVIEW_PACKET.md`: `a7b4d2c9561a718dfc7b4ca7979177297bbf1f85d5f32b85609da066529b9f02`
- Live-lock stderr log: `caae2878cf25bad7ace19ed52604231d5c74a791c23d752ba60950defb0eb121`
- Timeout probe `summary.json`: `1e7f41c2aa8104a762bd8ab7e91afbb6728705a67804d76c73242acb68b879a5`
- Timeout probe `validation_failures.jsonl`: `1eab45ee8b8836adb2a857fdb131fb814fe08dda54c63838dd5929962e5d1b45`

## Tests Run

- `node --check backend\card_descriptions\card_visual_description_agent_v1.mjs`
- `node --test tests\contracts\card_visual_description_agent_v1.test.mjs`
- `git diff --check`

Result before the completed paid run: all passed, `40/40` targeted contract tests.

## Explicit Next Gate

Perform deterministic repair for the seven live-lock failure payloads, then:

1. Add targeted contract coverage for each failure class.
2. Replay the seven failed payloads offline.
3. Replay the 18 previously validated payloads offline and verify no regressions.
4. Do not make OpenAI calls during this repair gate.
5. Only after offline replay passes, run one fresh paid launch-value 25-card live-lock dry run with code frozen.

