# CARD_VISUAL_FACT_GRAPH_V2_LIVE_LOCK_EVIDENCE_REPAIR_20260718

Date: 2026-07-18

## Context

After the evidence-backed claim policy repair, the next gate was a paid OpenAI dry run over the same explicit 25 launch-value card-print IDs, with Energies deferred and no database writes, approvals, embeddings, semantic search, Taste Engine, Listing Resolver, Grookai Signature, or story generation.

## Problem

The first attempt skipped all 25 cards because local TLS certificate verification blocked image fetches from the remote image hosts. It made 0 OpenAI calls and cost $0.

The retry used `NODE_TLS_REJECT_UNAUTHORIZED=0`, matched the prior successful run boundary, and made 25 OpenAI calls. The paid run still failed the structural lock because only 21 of 25 payloads validated under the then-current validator.

## Risk

Do not claim live lock from an offline replay alone. The repair replay proves the generated payloads are recoverable by deterministic normalization and validation, but the live paid run artifact still records 4 validation failures.

## Decision

Implemented a narrow deterministic repair for the four live failure classes:

- supported focused/determined expression semantic labels are allowed only with visible facial evidence;
- smile/happy search terms may be supported directly by cited facial observations or human appearance evidence;
- obvious clothing observation ID typos such as `obs_clothes_N` repair to existing `obs_clothing_N` references;
- count semantic labels may validate against matching exact count rows with shared supporting observations.

Live lock is not claimed until one fresh paid 25-card proof validates structurally with the repaired code.

## Alternatives Rejected

- Treating the 21/25 paid run as good enough: rejected because the structural target was 25/25.
- Broad banned-word changes: rejected because expression and atmosphere terms are valid when evidence-backed.
- Claiming approvals or downstream readiness from this dry run: rejected because there were no database writes and no human review decisions.

## Migration Applied

No migration was applied.

## One-Card Apply Proof

No database apply occurred in this gate. The prior one-card apply proof remains unchanged.

## Current Truths

- Branch: `feature/card-visual-description-agent`
- Base commit before this gate: `b9a27d3925ffdb408ae7c42723eac0a3886a9b07`
- Paid retry run: `docs/audits/card_visual_fact_graph_v2_launch_value_25_evidence_policy_retry_dry_run/2026-07-18T06-22-38-454Z_dry_run_81281d9cbc31/`
- Paid retry result: 25 attempted, 21 structurally validated, 4 validation failures, 0 skipped.
- Validated paid rows: 13 `needs_review`, 8 `pending`.
- Offline repair replay: `docs/audits/card_visual_fact_graph_v2_live_lock_evidence_repair/2026-07-18T07-02-00-000Z_deterministic_repair/`
- Offline repair replay result: 4/4 failed payloads now valid; 21/21 previously valid rows remain valid.
- Contract tests after repair: 42/42 passing.
- No database writes occurred.

## Invariants

- `visual_attributes.fact_graph` remains the source truth.
- Every meaningful reusable fact must trace to observation evidence.
- Expression, atmosphere, material appearance, time, weather, setting, and search labels are judged by evidence, not blanket term bans.
- Circular evidence does not prove a semantic claim.
- `scene_subject`, `depicted_subject`, and `character_representation` remain separate.
- Card UI and print-marker evidence remain separate from artwork facts.
- Physical card-surface claims require reliable visible evidence or abstention.
- `artwork_description` remains deterministic compatibility digest text only.

## Token And Cost Result

Paid retry run:

- Request count: 25
- Retry count: 0
- Input tokens: 222,756
- Output tokens: 113,182
- Total tokens: 335,938
- Cached input tokens: 64,128
- Estimated cost: $0.2509552
- Average estimated cost per validated paid row: $0.01195025

Offline repair replay:

- OpenAI calls: 0
- Estimated cost: $0

## Why The Visual Layer Remains Derived Intelligence

The fact graph records evidence-backed observations and derived search concepts. It does not change canonical identity, variant identity, app-facing reads, pricing, or human approval state.

## What Must Never Be Broken

- Do not store unsupported story, lore, personality, or physical card-surface claims as accepted facts.
- Do not merge card UI/print-marker evidence into artwork modules.
- Do not treat a text-only or offline replay result as image-confirmed human approval.
- Do not process Energies in launch-value calibration until that deferred branch is explicitly reopened.

## Artifact Hashes

Paid retry run:

| Artifact | SHA-256 |
|---|---|
| `summary.json` | `2a04b3b42d9a145d737a5de5d1079f02fdf6b670e1dbfff9ef02c94c630ff7f0` |
| `validation_failures.jsonl` | `9597fe2e4615b3d53200de958782e071b620ee77bd6a34f5389f18e5dbd1f0ab` |
| `generated_outputs.jsonl` | `b178ffd968e78f4a22df0b5c1f83386f188a9cd3e3e4e100e330656a6135b10f` |
| `FACT_GRAPH_V2_REVIEW_PACKET.md` | `779943ffb7107c14689ea1e41d1ae4c7d25b65824fe8e190ea4e43debf39efd1` |

Offline repair replay:

| Artifact | SHA-256 |
|---|---|
| `summary.json` | `392c5dcd0f97cb64758bd4d641019120d61a0c1dd75c337469ba1eb58b40c6fb` |
| `replay_results.jsonl` | `090184709c4309ccde888fc95214d198ffc65ea377875a6df302ebd0968b1dae` |
| `LIVE_LOCK_EVIDENCE_REPAIR_REPLAY.md` | `7588be98a638d42ae5131b8d4c536ff9d62af724e9e69c2bc8e8171df9dc1c66` |

## Explicit Next Gate

Run one fresh paid OpenAI dry run over the same 25 explicit card-print IDs, with code frozen for the duration, Energies excluded, no database writes, no approvals, no embeddings, and no downstream integration.

Do not run 125 cards or apply database rows until that fresh paid run validates structurally.
