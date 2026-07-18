# CARD_VISUAL_FACT_GRAPH_V2_LAUNCH_PROOF_SEARCH_FALLBACK_REPAIR_20260718

## Context

After the semantic-support-drift repair, the next gated step was a fresh paid OpenAI dry run over the same 25 explicit launch-value card-print IDs. Energies remained excluded, code was frozen during the paid run, and no database writes or downstream integrations were allowed.

## Problem

The fresh paid proof did not lock.

The run completed operationally but produced `4` structural validation failures out of `25` attempted rows. The failures were narrow:

- evidence-only neutral/concerned expression labels remained in `semantic_visual_facts`
- evidence-backed `star sparkles` motif was not allowed by the semantic fact label policy
- one row had rich observations but no `fact_grounded_search_terms` or derived `semantic_tags`

## Risk

If unrepaired, valid fact graphs would keep failing when the model leaves search terms blank or emits neutral expression evidence as a semantic fact.

If over-repaired, the system could accept unsupported emotion labels or pad search terms with weak generic terms.

## Decision

Apply a deterministic repair only.

The repair:

- treats neutral and neutral/concerned expression semantic facts as evidence-only and drops them
- allows evidence-backed star sparkle motifs
- derives fallback search terms from salient observations when no search terms survive normalization
- recognizes underscore salience values such as `primary_subject_detail`
- prefers descriptive observation labels over generic normalized labels such as `hair`, `clothing`, `pose`, or `facial expression`

## Alternatives Rejected

- Patching the prompt: rejected because the failures were deterministic validator/normalizer drift.
- Accepting neutral expression as a semantic fact: rejected because V2 keeps facial evidence factual and avoids storing interpreted expression labels unless they are useful, supported semantic concepts.
- Broadly deriving terms from every observation: rejected because search terms should remain useful and not quota-padded.
- Running another paid sample before replay: rejected because the failed payloads were sufficient offline fixtures.

## Migration Applied

No migration was applied.

## One-Card Apply Proof

No database apply was performed in this gate.

The earlier one-card apply proof remains unchanged and no rows were inserted, updated, approved, or embedded here.

## Current Truths

- Fact Graph V2 remains active.
- `visual_attributes.fact_graph` remains source truth.
- `artwork_description` remains compatibility-only digest text.
- Energies remain deferred.
- The latest paid proof failed live lock with `21/25` structurally valid rows.
- The deterministic offline replay recovered all `4` failed payloads and preserved all `21` previously valid rows.

## Invariants

- Search terms must cite observation IDs.
- Fallback search terms are allowed only when no search terms survive normalization.
- Fallback terms must come from visible, non-card-UI observations.
- Neutral facial evidence belongs in facial evidence fields, not semantic meaning facts.
- Scene subject, depicted subject, and character representation boundaries remain unchanged.
- No database writes, approvals, embeddings, or public reads are allowed in this calibration gate.

## Token And Cost Result

Source paid run artifact:

`docs/audits/card_visual_fact_graph_v2_launch_value_25_after_semantic_support_drift_repair_dry_run/2026-07-18T19-00-39-893Z_dry_run_41f0e884059b/`

Paid run usage:

- Requests: `25`
- Retries: `0`
- Input tokens: `222756`
- Output tokens: `100668`
- Total tokens: `323424`
- Cached input tokens: `32256`
- Estimated cost: `$0.2404944`

Offline replay usage:

- OpenAI calls: `0`
- Database writes: `0`
- Estimated replay model cost: `$0`

## Repair Result

Repair artifact:

`docs/audits/card_visual_fact_graph_v2_launch_proof_search_fallback_repair/2026-07-18T19-28-51-684Z_deterministic_repair_ec3912acbd4e/`

Replay result:

- Previous failures replayed: `4`
- Previous failures now valid: `4`
- Previous failures still failed: `0`
- Previous validated rows replayed: `21`
- Previous validated rows still valid: `21`
- Previous validated rows now failed: `0`
- Total after replay: `25/25` valid
- Replayed status mix: `18 needs_review`, `7 pending`

## Why The Visual Layer Remains Derived Intelligence

The fact graph is generated from card images and deterministic validators. It is reviewable derived intelligence for future search, matching, recommendations, and visual systems, not canonical card identity or print truth.

## What Must Never Be Broken

- Do not approve generated rows automatically.
- Do not generate embeddings from unapproved rows.
- Do not expose private visual facts publicly.
- Do not merge artwork facts with card UI print-marker evidence.
- Do not treat inherited artwork facts as variant-specific print-marker proof.
- Do not run 125 cards or database apply until a fresh paid 25-card proof validates structurally.

## Artifacts

- Source paid run summary: `docs/audits/card_visual_fact_graph_v2_launch_value_25_after_semantic_support_drift_repair_dry_run/2026-07-18T19-00-39-893Z_dry_run_41f0e884059b/summary.json`
- Source paid run packet: `docs/audits/card_visual_fact_graph_v2_launch_value_25_after_semantic_support_drift_repair_dry_run/2026-07-18T19-00-39-893Z_dry_run_41f0e884059b/FACT_GRAPH_V2_REVIEW_PACKET.md`
- Source paid run failures: `docs/audits/card_visual_fact_graph_v2_launch_value_25_after_semantic_support_drift_repair_dry_run/2026-07-18T19-00-39-893Z_dry_run_41f0e884059b/validation_failures.jsonl`
- Source artifact hashes: `docs/audits/card_visual_fact_graph_v2_launch_value_25_after_semantic_support_drift_repair_dry_run/2026-07-18T19-00-39-893Z_dry_run_41f0e884059b/artifact_hashes.json`
- Repair replay summary: `docs/audits/card_visual_fact_graph_v2_launch_proof_search_fallback_repair/2026-07-18T19-28-51-684Z_deterministic_repair_ec3912acbd4e/summary.json`
- Repair replay report: `docs/audits/card_visual_fact_graph_v2_launch_proof_search_fallback_repair/2026-07-18T19-28-51-684Z_deterministic_repair_ec3912acbd4e/LAUNCH_PROOF_SEARCH_FALLBACK_REPAIR_REPLAY.md`
- Repair artifact hashes: `docs/audits/card_visual_fact_graph_v2_launch_proof_search_fallback_repair/2026-07-18T19-28-51-684Z_deterministic_repair_ec3912acbd4e/artifact_hashes.json`

## Tests

- `node --check backend/card_descriptions/card_visual_description_agent_v1.mjs` passed.
- `node --test tests/contracts/card_visual_description_agent_v1.test.mjs` passed, `46/46`.
- `git diff --check` passed.

## Explicit Next Gate

Run one fresh paid OpenAI dry run over the same 25 explicit card-print IDs with this repair applied.

Constraints:

- Energies excluded.
- Code frozen during the run.
- No database writes.
- No approvals.
- No embeddings.
- No semantic search, Taste Engine, Listing Resolver, public read, or app integration.
- Do not run 125 cards or database apply until that fresh paid 25-card proof validates structurally.
