# CARD_VISUAL_FACT_GRAPH_V2_EVIDENCE_BACKED_CLAIM_REPAIR_20260718

## Context

After the launch-proof search fallback repair, the next gated step was one fresh paid OpenAI dry run over the same 25 explicit launch-value card-print IDs. Energies remained excluded, code was frozen during the paid run, and the run was artifact-only.

The paid proof completed operationally, but it did not lock. A narrow deterministic repair was then applied and replayed offline against the exact paid payloads.

## Problem

The fresh paid proof produced `8` structural validation failures out of `25` attempted rows.

The failures were not broad ontology failures. They were concentrated in field-aware evidence handling:

- evidence-backed literal object, environment, and motif labels were rejected when the supporting observations directly named the visible fact
- unsupported physical `foil` wording needed to be normalized out of semantic labels/search terms instead of accepted as a surface fact
- circular expression evidence such as `angry expression` needed to be stripped from non-semantic facial evidence fields
- missing module reviews needed conservative derived reviews instead of hard failure when coverage data and module content allowed deterministic recovery

## Risk

If unrepaired, valid fact graphs would continue failing on supported visible labels such as `bomb`, `grassy field with scattered leaves`, `sun near horizon`, and `gold sun emblem`.

If over-repaired, the validator could accept unsupported emotion, style, metadata, or physical-card-surface claims. That would weaken the fact graph boundary and pollute search-facing derived concepts.

## Decision

Apply a deterministic evidence-backed claim policy repair.

The repair:

- allows object, environment, and motif semantic labels only when the cited observations directly support the claim
- keeps generic or nonvisual style labels such as `dark fantasy style pokemon` out of semantic facts
- normalizes unsupported `gold foil` style wording into visual highlight language and prevents physical foil language from remaining in artwork search terms
- strips circular expression labels from facial evidence fields while preserving objective evidence such as eyes, mouth, eyebrows, and face position
- derives missing module reviews conservatively as `uncertain` for populated modules or explicit empty reviews for empty covered modules
- preserves the professional substance-cue policy: colloquial terms such as `stoner`, `high`, and `under the influence` remain search aliases only; the graph stores visible cues such as red eyes, half-closed eyes, drooping eyelids, smoke, haze, vapor, and smoking-object-like cues

## Alternatives Rejected

- Rewriting the extraction prompt: rejected because the failures were deterministic normalization and validation drift.
- Reintroducing blanket banned terms: rejected because terms such as `happy`, `annoyed`, `ghostly`, `night`, and `metallic-looking` can be valid when backed by visible evidence.
- Accepting circular evidence: rejected because a claim cannot be supported only by another copy of the same unsupported label.
- Treating missing module reviews as always fatal: rejected because conservative derived reviews preserve completeness risk without losing otherwise valid payloads.
- Running another paid sample before replay: rejected because the failed payloads were sufficient offline fixtures.

## Migration Applied

No migration was applied.

## One-Card Apply Proof

No database apply was performed in this gate.

The earlier one-card apply proof remains unchanged. This gate inserted no rows, updated no rows, approved no rows, and generated no embeddings.

## Current Truths

- Fact Graph V2 remains active.
- `visual_attributes.fact_graph` remains source truth.
- `artwork_description` remains compatibility-only digest text.
- Energies remain deferred.
- The latest paid proof failed live lock with `17/25` structurally valid rows.
- The deterministic offline replay recovered all `8` failed payloads and preserved all `17` previously valid rows.
- Offline replay success is not a live lock.

## Invariants

- Every typed fact must cite valid observations.
- Every search term must cite observation-backed facts.
- Every module must have a completeness review, either model-authored or conservatively derived.
- Scene subjects, depicted subjects, and character representations remain separate.
- Facial fields store visible evidence, not unsupported interpreted expression labels.
- Actual physical card-surface claims require reliable card evidence.
- Substance-state labels are not stored as facts; only concrete visible cue evidence is stored.
- No database writes, approvals, embeddings, public reads, or downstream integrations are allowed in this calibration gate.

## Token And Cost Result

Source paid run artifact:

`docs/audits/card_visual_fact_graph_v2_launch_value_25_after_search_fallback_repair_dry_run/2026-07-18T19-37-53-735Z_dry_run_48aa5c767f3b/`

Paid run usage:

- Requests: `25`
- Retries: `0`
- Input tokens: `222756`
- Output tokens: `111999`
- Total tokens: `334755`
- Cached input tokens: `48640`
- Estimated cost: `$0.2537088`
- Average estimated cost per structurally validated description: `$0.01492405`

Offline replay usage:

- OpenAI calls: `0`
- Database writes: `0`
- Estimated replay model cost: `$0`

## Repair Result

Repair artifact:

`docs/audits/card_visual_fact_graph_v2_launch_proof_evidence_backed_claim_repair/2026-07-18T20-19-17-513Z_deterministic_repair_ec9291bedbbe/`

Replay result:

- Previous failures replayed: `8`
- Previous failures now valid: `8`
- Previous failures still failed: `0`
- Previously valid rows replayed: `17`
- Previously valid rows still valid: `17`
- Previously valid rows now failed: `0`
- Total after replay: `25/25` valid
- Replayed status mix: `21 needs_review`, `4 pending`

## Why The Visual Layer Remains Derived Intelligence

The fact graph is generated from card images and deterministic validators. It is reviewable derived intelligence for future search, matching, recommendations, Grookai Signature, cameo discovery, and visual systems.

It is not canonical card identity truth, print-variant truth, pricing truth, human approval, or app-facing public data.

## What Must Never Be Broken

- Do not approve generated rows automatically.
- Do not generate embeddings from unapproved rows.
- Do not expose private visual facts publicly.
- Do not merge artwork facts with card UI print-marker evidence.
- Do not copy variant-specific print marker claims across shared artwork variants without direct variant image evidence.
- Do not store story, lore, personality, or unsupported substance-state claims as facts.
- Do not run 125 cards or database apply until a fresh paid 25-card proof validates structurally.

## Artifacts

- Source paid run summary: `docs/audits/card_visual_fact_graph_v2_launch_value_25_after_search_fallback_repair_dry_run/2026-07-18T19-37-53-735Z_dry_run_48aa5c767f3b/summary.json`
- Source paid run packet: `docs/audits/card_visual_fact_graph_v2_launch_value_25_after_search_fallback_repair_dry_run/2026-07-18T19-37-53-735Z_dry_run_48aa5c767f3b/FACT_GRAPH_V2_REVIEW_PACKET.md`
- Source paid run failures: `docs/audits/card_visual_fact_graph_v2_launch_value_25_after_search_fallback_repair_dry_run/2026-07-18T19-37-53-735Z_dry_run_48aa5c767f3b/validation_failures.jsonl`
- Source artifact hashes: `docs/audits/card_visual_fact_graph_v2_launch_value_25_after_search_fallback_repair_dry_run/2026-07-18T19-37-53-735Z_dry_run_48aa5c767f3b/artifact_hashes.json`
- Repair replay summary: `docs/audits/card_visual_fact_graph_v2_launch_proof_evidence_backed_claim_repair/2026-07-18T20-19-17-513Z_deterministic_repair_ec9291bedbbe/replay_summary.json`
- Repair replay report: `docs/audits/card_visual_fact_graph_v2_launch_proof_evidence_backed_claim_repair/2026-07-18T20-19-17-513Z_deterministic_repair_ec9291bedbbe/REPAIR_REPLAY_REPORT.md`
- Repair replay results: `docs/audits/card_visual_fact_graph_v2_launch_proof_evidence_backed_claim_repair/2026-07-18T20-19-17-513Z_deterministic_repair_ec9291bedbbe/replay_results.jsonl`
- Repair artifact hashes: `docs/audits/card_visual_fact_graph_v2_launch_proof_evidence_backed_claim_repair/2026-07-18T20-19-17-513Z_deterministic_repair_ec9291bedbbe/artifact_hashes.json`

## Tests

- `node --check backend/card_descriptions/card_visual_description_agent_v1.mjs` passed.
- `node --test tests/contracts/card_visual_description_agent_v1.test.mjs` passed, `48/48`.
- `git diff --check` passed.

## Explicit Next Gate

Run one fresh paid OpenAI dry run over the same 25 explicit card-print IDs with this repair applied.

Constraints:

- Energies excluded.
- Code frozen during the run.
- Maximum run cost: `$0.35`.
- No database writes.
- No approvals.
- No embeddings.
- No semantic search, Taste Engine, Listing Resolver, public read, or app integration.
- Do not run 125 cards or database apply until that fresh paid 25-card proof validates structurally.
