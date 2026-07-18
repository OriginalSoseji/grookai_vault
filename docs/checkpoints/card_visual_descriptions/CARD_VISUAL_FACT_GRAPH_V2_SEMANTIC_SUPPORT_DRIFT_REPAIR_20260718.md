# CARD_VISUAL_FACT_GRAPH_V2_SEMANTIC_SUPPORT_DRIFT_REPAIR_20260718

## Context

Card Visual Fact Graph V2 is the active fact-first visual extraction system on branch `feature/card-visual-description-agent`.

The prior architectural-environment repair was followed by a fresh paid 25-card OpenAI dry run over the same explicit launch-value IDs, with Energies excluded and no database writes. That paid proof did not lock: `19/25` rows structurally validated and `6/25` failed validation.

## Problem

The failed paid proof exposed semantic-support drift, not a schema or prompt architecture failure.

The six failures were concentrated in supported labels that the validator did not yet recognize, plus one label that should be dropped rather than accepted:

- supported `scene_type` label: `stylized background pattern`
- supported action label: `pointing`
- supported action label: `clasping hands`
- supported motif label: `pink and white light streaks`
- unsupported object-only cameo label: `bomb`
- unsupported ambiguous expression text: `neutral/sad expression`

## Risk

If left unrepaired, the system would reject structurally valid evidence-backed rows and keep forcing paid reruns for vocabulary drift.

If repaired too broadly, the system could start accepting unsupported labels or weakening the scene-subject, depicted-subject, and character-representation boundary.

## Decision

Perform a narrow deterministic validator repair only.

The repair:

- allows evidence-backed `scene_type` background-pattern labels
- allows evidence-backed `pointing`
- allows evidence-backed `clasping hands`
- allows evidence-backed light-streak motifs
- drops object-only `cameo` semantic facts such as `bomb`
- normalizes ambiguous `neutral/sad expression` wording into objective facial evidence
- preserves the evidence-backed claim policy: claim plus field plus support determines validity

## Alternatives Rejected

- Another broad prompt rewrite: rejected because the failure was validator vocabulary support.
- Broad banned-word expansion: rejected because supported terms such as `pointing` and `light streaks` are valid visual facts.
- Accepting `bomb` as a cameo: rejected because cameos remain character depictions or character representations, not ordinary object facts.
- Running another paid sample before offline replay: rejected because the failed payloads were already sufficient deterministic fixtures.

## Migration Applied

No migration was applied.

The existing `card_print_visual_descriptions` table and private visual description schema remain unchanged.

## One-Card Apply Proof

No database apply was performed in this gate.

The earlier one-card apply proof remains `GV-PK-JPN-M5-113`; this gate did not insert, approve, update, or embed any rows.

## Current Truths

- Fact Graph V2 remains the active fact extraction architecture.
- `visual_attributes.fact_graph` remains the source of truth.
- `artwork_description` remains compatibility-only deterministic digest text.
- Energy cards remain deferred for this calibration path.
- No 125-card calibration, database apply, approval, embeddings, semantic search, Taste Engine, Listing Resolver, or public/app-facing integration was performed.
- The paid proof after architectural-environment repair failed live lock with `19/25` structurally valid rows.
- The deterministic repair replay recovered all six failed payloads offline and preserved all 19 previously valid rows.

## Invariants

- Every semantic visual fact must cite valid observation evidence.
- Circular evidence does not support a semantic claim.
- Scene subjects, depicted subjects, and character representations remain separate.
- Object-only facts do not become cameos.
- Actual physical card-surface claims require reliable card-surface evidence.
- Story, lore, purpose, personality, unsupported expression, and canonical metadata remain invalid as visual facts.
- Human review remains required before approval or downstream use.

## Token And Cost Result

Source paid run artifact:

`docs/audits/card_visual_fact_graph_v2_launch_value_25_after_arch_env_repair_dry_run/2026-07-18T15-55-38-238Z_dry_run_9165e0e5b12c/`

Paid run usage:

- Requests: `26`
- Retries: `1`
- Input tokens: `222756`
- Output tokens: `105621`
- Total tokens: `328377`
- Cached input tokens: `32256`
- Estimated cost: `$0.2484192`

Offline replay usage:

- OpenAI calls: `0`
- Database writes: `0`
- Estimated replay model cost: `$0`

## Repair Result

Repair artifact:

`docs/audits/card_visual_fact_graph_v2_semantic_support_drift_repair/2026-07-18T16-37-33-590Z_deterministic_repair_f2397ca2fef4/`

Replay result:

- Previous failures replayed: `6`
- Previous failures now valid: `6`
- Previous failures still failed: `0`
- Previous validated rows replayed: `19`
- Previous validated rows still valid: `19`
- Previous validated rows now failed: `0`
- Total after replay: `25/25` valid
- Replayed status mix: `17 needs_review`, `8 pending`

## Why The Visual Layer Remains Derived Intelligence

The visual fact graph is generated from images and model interpretation. It is useful for review, search, matching, recommendations, and future visual systems, but it is not canonical identity truth.

Canonical card identity remains owned by canonical card data. Visual facts may support discovery and review, but they must not override card identity, print identity, set metadata, pricing, ownership, or app-facing claims.

## What Must Never Be Broken

- Do not write generated rows as `approved`.
- Do not generate embeddings from unapproved rows.
- Do not expose private visual facts publicly.
- Do not merge artwork facts with card UI print-marker evidence.
- Do not treat inherited artwork facts as variant-specific print-marker proof.
- Do not run 125-card calibration or database apply until a fresh paid 25-card proof validates structurally.

## Artifacts

- Source paid run summary: `docs/audits/card_visual_fact_graph_v2_launch_value_25_after_arch_env_repair_dry_run/2026-07-18T15-55-38-238Z_dry_run_9165e0e5b12c/summary.json`
- Source paid run packet: `docs/audits/card_visual_fact_graph_v2_launch_value_25_after_arch_env_repair_dry_run/2026-07-18T15-55-38-238Z_dry_run_9165e0e5b12c/FACT_GRAPH_V2_REVIEW_PACKET.md`
- Source paid run failures: `docs/audits/card_visual_fact_graph_v2_launch_value_25_after_arch_env_repair_dry_run/2026-07-18T15-55-38-238Z_dry_run_9165e0e5b12c/validation_failures.jsonl`
- Source artifact hashes: `docs/audits/card_visual_fact_graph_v2_launch_value_25_after_arch_env_repair_dry_run/2026-07-18T15-55-38-238Z_dry_run_9165e0e5b12c/artifact_hashes.json`
- Repair replay summary: `docs/audits/card_visual_fact_graph_v2_semantic_support_drift_repair/2026-07-18T16-37-33-590Z_deterministic_repair_f2397ca2fef4/summary.json`
- Repair replay report: `docs/audits/card_visual_fact_graph_v2_semantic_support_drift_repair/2026-07-18T16-37-33-590Z_deterministic_repair_f2397ca2fef4/SEMANTIC_SUPPORT_DRIFT_REPAIR_REPLAY.md`
- Repair artifact hashes: `docs/audits/card_visual_fact_graph_v2_semantic_support_drift_repair/2026-07-18T16-37-33-590Z_deterministic_repair_f2397ca2fef4/artifact_hashes.json`

## Tests

- `node --check backend/card_descriptions/card_visual_description_agent_v1.mjs` passed.
- `node --test tests/contracts/card_visual_description_agent_v1.test.mjs` passed, `45/45`.
- `git diff --check` passed.

## Explicit Next Gate

Run one fresh paid OpenAI dry run over the same 25 explicit card-print IDs with this semantic-support-drift repair applied.

Constraints for that next gate:

- Energies excluded.
- Code frozen for the duration of the run.
- No database writes.
- No approvals.
- No embeddings.
- No semantic search, Taste Engine, Listing Resolver, or public integration.
- Do not run 125 cards or any database apply until the fresh paid 25-card proof validates structurally.
