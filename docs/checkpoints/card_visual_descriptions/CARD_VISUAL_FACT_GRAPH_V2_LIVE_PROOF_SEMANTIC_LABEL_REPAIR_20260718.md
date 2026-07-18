# Card Visual Fact Graph V2 Live Proof Semantic Label Repair - 2026-07-18

## Context

Fact Graph V2 had already passed the evidence-backed offline repair gate, so the next gated action was a fresh paid 25-card OpenAI dry run with Energies excluded. The run was dry-run only and wrote artifacts under:

`docs/audits/card_visual_fact_graph_v2_launch_value_25_live_proof_dry_run/2026-07-18T13-12-33-464Z_dry_run_45feb5f3f1e7/`

The run completed, but the live lock did not pass.

## Problem

The paid proof produced `25` attempted cards, `21` structurally validated cards, and `4` validation failures. The failures were not schema-shape failures. They were semantic-label support failures:

- `GV-PK-JPN-M5-112` - `Mega Zeraora ex` - `electricity` motif label was not accepted despite electric sparks/lightning evidence.
- `GV-PK-JPN-M5-096` - `Mega Zeraora ex` - `alert expression` state label was not accepted despite visible attention/upright-orientation evidence.
- `GV-PK-JPN-M5-063` - `メガドリュウズex` - `alert expression` expression label was not accepted despite forward-looking-eye evidence.
- `GV-PK-JPN-M5-110` - `Rust Syndicate Grunt` - `hands on hips` action label was not accepted despite visible pose evidence.

## Risk

If fixed with broad term allowlists, the validator could start approving unsupported states and weaken the evidence-backed policy. If left unfixed, supported visual claims would keep failing structural validation and block the launch-value sample even when the row was review-safe.

## Decision

Implement a narrow deterministic repair:

- Allow `electricity` as a semantic visual motif when supported by electric/lightning observations or derived controlled concepts.
- Allow `alert expression` and `alert` state labels only when backed by non-circular visible attention evidence such as open eyes, looking forward, upright posture, or upright orientation.
- Continue to reject/drop unsupported circular alert labels when the only evidence is another `alert expression` phrase.
- Allow `hands on hips` as an action label when visible pose/body-language evidence supports it.

## Alternatives Rejected

- Broadly accepting all expression/state labels: rejected because it would allow unsupported emotion/personality drift.
- Returning to blanket banned terms: rejected because the user explicitly confirmed supported visual claims such as `happy`, `annoyed`, and `ghostly` should pass when evidence backs them.
- Running another paid proof immediately before offline replay: rejected because the failure class was deterministic and should be proven without additional model cost first.
- Advancing to `125` cards: rejected because the fresh 25-card live proof failed structural validation.

## Migration Applied

No migration was added or applied for this gate.

The existing private visual-description table remains the storage target for later gates. This repair changed validation and tests only.

## One-Card Apply Proof

No database apply was performed in this gate.

The historical one-card apply proof for `GV-PK-JPN-M5-113` remains the database boundary proof. It is not expanded by this repair.

## Current Truths

- Visual Fact Graph V2 architecture remains active.
- `visual_attributes.fact_graph` remains source truth.
- `artwork_description` remains deterministic compatibility digest text only.
- Energy cards remain deferred for this phase.
- The latest paid 25-card proof cost `$0.2540672` and failed lock before repair.
- The offline repair replay validated all `4/4` failed payloads and preserved all `21/21` previously valid generated rows.
- Live lock is not claimed until one fresh paid proof validates structurally after this repair.

## Invariants

- No database writes.
- No approvals.
- No embeddings.
- No semantic search integration.
- No Taste Engine integration.
- No Listing Resolver integration.
- No production apply.
- No 125-card or larger batch before a fresh paid 25-card proof passes.
- Claims are judged by `claim + field/module + supporting observations + evidence strength + contradictions`, not by term alone.

## Token And Cost Result

Source paid dry-run telemetry:

- Request count: `26`
- Retry count: `1`
- Input tokens: `222756`
- Output tokens: `105119`
- Total tokens: `327875`
- Cached input tokens: `10752`
- Estimated cost: `$0.2540672`

Offline repair telemetry:

- OpenAI calls: `0`
- Model cost: `$0`
- DB writes: `0`

## Why The Visual Layer Remains Derived Intelligence

The graph records model-extracted observable facts for review and future search. It does not become canonical identity truth, print-authentication truth, approval truth, or app-facing production data until later gates explicitly promote reviewed rows.

## What Must Never Be Broken

- Canonical card identity cannot be overwritten by model output.
- Artwork facts cannot be treated as variant-specific print-marker facts.
- Card UI observations must remain separate from artwork modules.
- Physical card surface or material claims require reliable visible evidence.
- Unsupported story, lore, personality, intoxication/substance state, or purpose claims must not be stored as facts.
- Search aliases may map to evidence-backed concepts, but colloquial labels must not become factual claims.
- Human review remains required before approval.

## Artifacts

- Source paid dry run: `docs/audits/card_visual_fact_graph_v2_launch_value_25_live_proof_dry_run/2026-07-18T13-12-33-464Z_dry_run_45feb5f3f1e7/`
- Source paid dry-run hashes: `docs/audits/card_visual_fact_graph_v2_launch_value_25_live_proof_dry_run/2026-07-18T13-12-33-464Z_dry_run_45feb5f3f1e7/artifact_hashes.json`
- Repair replay: `docs/audits/card_visual_fact_graph_v2_live_proof_semantic_label_repair/2026-07-18T13-50-54-188Z_deterministic_repair_45c1a318/`
- Repair replay report: `docs/audits/card_visual_fact_graph_v2_live_proof_semantic_label_repair/2026-07-18T13-50-54-188Z_deterministic_repair_45c1a318/LIVE_PROOF_SEMANTIC_LABEL_REPAIR_REPLAY.md`
- Repair summary: `docs/audits/card_visual_fact_graph_v2_live_proof_semantic_label_repair/2026-07-18T13-50-54-188Z_deterministic_repair_45c1a318/summary.json`
- Repair hashes: `docs/audits/card_visual_fact_graph_v2_live_proof_semantic_label_repair/2026-07-18T13-50-54-188Z_deterministic_repair_45c1a318/artifact_hashes.json`

## Tests

- `node --check backend/card_descriptions/card_visual_description_agent_v1.mjs` - passed.
- `node --test tests/contracts/card_visual_description_agent_v1.test.mjs` - passed, `43/43`.
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

Passing condition: all `25/25` cards structurally validate, with semantic cleanliness preserved at the row-status trust boundary.
