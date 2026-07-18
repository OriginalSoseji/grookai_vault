# Card Visual Fact Graph V2 Architectural Environment Repair - 2026-07-18

## Context

After the semantic-label repair, the next gate was a fresh paid 25-card OpenAI dry-run proof using the same explicit launch-value card-print IDs, Energies excluded, with no database writes or downstream integrations.

The paid run artifact is:

`docs/audits/card_visual_fact_graph_v2_launch_value_25_after_semantic_label_repair_dry_run/2026-07-18T13-58-31-907Z_dry_run_45a7daa17908/`

## Problem

The run completed but failed lock:

- Attempted: `25`
- Structurally validated: `24`
- Failed validation: `1`
- Needs review: `20`
- Pending: `4`
- Skipped: `0`
- DB writes: `0`

The single failed row was:

- `GV-PK-JPN-M5-078` - `ムク`
- Finding: `fact_graph_semantic_fact_label_not_supported_v1:sem_fact_003`
- Unsupported label: `brick wall corridor`
- Supporting observation: `obs_background_001`
- Supporting evidence: `brick wall corridor with arches and lamps`

## Risk

The label was visually grounded and evidence-backed. Treating it as unsupported would keep producing false structural failures for architectural interiors such as corridors, walls, arches, and lamps. Broadly allowing all environment text would weaken the evidence-backed claim policy.

## Decision

Add a narrow validator vocabulary repair for evidence-backed architectural environment labels:

- `corridor`
- `hallway`
- `wall`
- `brick`
- `arch`
- `arched`
- `lamp`
- `lantern`

This is not a schema, prompt, model, or database change.

## Alternatives Rejected

- Broad environment allowlist: rejected because environment claims must still cite observations and evidence.
- Prompt rewrite: rejected because the generated fact was good; the validator vocabulary was too narrow.
- Immediate second paid run before offline replay: rejected because the failure class was deterministic and should be proven without model cost first.
- Advancing to `125` cards: rejected because the fresh paid 25-card proof failed structural validation.

## Migration Applied

No migration was added or applied.

## One-Card Apply Proof

No database apply was performed in this gate.

The historical one-card apply proof remains unchanged and this repair does not expand any database boundary.

## Current Truths

- Fact Graph V2 remains the active fact-first architecture.
- `visual_attributes.fact_graph` remains the source truth.
- `artwork_description` remains a compatibility digest only.
- Energies remain deferred.
- The latest paid proof cost `$0.2510464` and failed lock before repair.
- Offline replay after repair validated `1/1` failed payload and preserved `24/24` previously valid generated rows.
- Live lock is still not claimed.

## Invariants

- No database writes.
- No approvals.
- No embeddings.
- No semantic search integration.
- No Taste Engine integration.
- No Listing Resolver integration.
- No production apply.
- No 125-card or larger run before a fresh paid 25-card proof validates structurally.
- Claims continue to be judged by evidence, field/module, and contradictions rather than by terms alone.

## Token And Cost Result

Source paid dry-run telemetry:

- Request count: `25`
- Retry count: `0`
- Input tokens: `222756`
- Output tokens: `105967`
- Total tokens: `328723`
- Cached input tokens: `25344`
- Estimated cost: `$0.2510464`

Offline repair telemetry:

- OpenAI calls: `0`
- Model cost: `$0`
- DB writes: `0`

## Why The Visual Layer Remains Derived Intelligence

The graph records model-extracted visual facts for review. It does not become canonical identity truth, print-authentication truth, approval truth, or app-facing production data until later gates explicitly promote reviewed rows.

## What Must Never Be Broken

- Canonical card identity cannot be overwritten by model output.
- Artwork facts cannot be treated as variant-specific print-marker facts.
- Card UI observations must remain separate from artwork facts.
- Physical card surface or material claims require reliable visible evidence.
- Unsupported story, lore, personality, intoxication/substance state, or purpose claims must not be stored as facts.
- Human/person artwork must continue to use the human appearance ontology and be reviewed when routing metadata is weak or unavailable.
- Human review remains required before approval.

## Artifacts

- Source paid dry run: `docs/audits/card_visual_fact_graph_v2_launch_value_25_after_semantic_label_repair_dry_run/2026-07-18T13-58-31-907Z_dry_run_45a7daa17908/`
- Source paid dry-run hashes: `docs/audits/card_visual_fact_graph_v2_launch_value_25_after_semantic_label_repair_dry_run/2026-07-18T13-58-31-907Z_dry_run_45a7daa17908/artifact_hashes.json`
- Repair replay: `docs/audits/card_visual_fact_graph_v2_architectural_environment_repair/2026-07-18T14-28-40-039Z_deterministic_repair_1f884198/`
- Repair replay report: `docs/audits/card_visual_fact_graph_v2_architectural_environment_repair/2026-07-18T14-28-40-039Z_deterministic_repair_1f884198/ARCHITECTURAL_ENVIRONMENT_REPAIR_REPLAY.md`
- Repair summary: `docs/audits/card_visual_fact_graph_v2_architectural_environment_repair/2026-07-18T14-28-40-039Z_deterministic_repair_1f884198/summary.json`
- Repair hashes: `docs/audits/card_visual_fact_graph_v2_architectural_environment_repair/2026-07-18T14-28-40-039Z_deterministic_repair_1f884198/artifact_hashes.json`

## Tests

- `node --check backend/card_descriptions/card_visual_description_agent_v1.mjs` - passed.
- `node --test tests/contracts/card_visual_description_agent_v1.test.mjs` - passed, `44/44`.
- `git diff --check` - passed.

## Explicit Next Gate

Run one fresh paid OpenAI dry-run proof over the same 25 explicit launch-value card-print IDs, with code frozen for the duration.

Gate constraints:

- `provider=openai`
- `image-detail=high`
- Energies excluded
- no database writes
- no approvals
- no embeddings
- no semantic search
- no Taste Engine
- no Listing Resolver
- no 125-card or larger run

Passing condition: `25/25` structurally validate, with semantic cleanliness and row-status trust boundaries preserved.
