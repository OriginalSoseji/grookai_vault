# Market Evidence Engine local Ollama reviewer

Date: 2026-10-15  
Status: installed locally; advisory only

## What is installed

- Existing `grookai-card-triage:4b` remains available for the TCGPlayer identity triage worker.
- New `grookai-evidence-review:4b` was created from the existing local model layers; no external model download was required.
- Current Ollama digest: `d60e704e7c6f1e424987c5c75891c9dc9c32f5b128f6601cbf1837efa386146b`.
- Recreate with `npm run pricing:market:ollama:evidence-model:create`.
- Run with `npm run pricing:market:ollama:evidence-review -- --input=<bounded-review-json> --out-dir=<output-dir> --limit=10`.
- End-to-end automation runs with `npm run pricing:market:ollama:automation`. It pages through the warehouse, calls Ollama, and idempotently writes internal-only price review events.
- Windows Task Scheduler task `Grookai Market Evidence Ollama` is installed hourly and advances its page checkpoint in `C:\grookai_vault_operator_artifacts\mee_ollama_automation_state.json`.

## Safety boundary

The worker only talks to an unauthenticated HTTP Ollama endpoint on loopback. It reads a bounded JSON export and writes local JSONL/summary artifacts. It does not read or write Supabase, map cards, publish prices, set market truth, send customer messages, or change customer state.

The model output is advisory. A deterministic guard is applied after every call:

- Any positive warehouse exclusion count for `custom_fake`, `foreign_language`, `lot`, or `sealed` forces `reject_contamination`.
- `review_required_more_evidence` forces `needs_more_evidence`.
- `review_ready_internal_candidate` forces `route_to_human_review`; slabs use a separate reason code.

The local model cannot override these warehouse gates.

For raw-single rows, the automation can approve an internal price signal only when the deterministic bucket is `review_ready_internal_candidate`, the model returns clean identity with at least 0.95 confidence, and no contamination or outlier rule fires. This writes only `market_evidence_price_review_events`; it does not write `pricing_observations` or change any public pricing flag. Slab rows stay in their separate lane until a slab-specific policy exists.

## Validation

- Contract tests: 11 passed, 0 failed.
- Clean evidence smoke: 10/10 model calls completed; 0 model errors.
- Contamination smoke: 1/1 model call completed; deterministic guard forced `reject_contamination` from positive exclusion counts.
- Live automation page: 8 rollups reviewed, 4 raw-single events inserted (2 internal approvals, 2 manual holds), 4 slab rows held for the separate lane, and 0 public flags.
- Production readback: the four automation events have zero `can_publish_price_directly`, `publishable`, `app_visible`, or `market_truth` rows.
- Artifacts are outside the repository under `C:\grookai_vault_operator_artifacts\ollama_evidence_review_20261015_final` and `C:\grookai_vault_operator_artifacts\ollama_evidence_review_contamination_20261015_final`.

No production row was changed by this setup.
