# Market Evidence Engine local Ollama reviewer

Date: 2026-10-15  
Status: installed locally; advisory only

## What is installed

- Existing `grookai-card-triage:4b` remains available for the TCGPlayer identity triage worker.
- New `grookai-evidence-review:4b` was created from the existing local model layers; no external model download was required.
- Current Ollama digest: `d60e704e7c6f1e424987c5c75891c9dc9c32f5b128f6601cbf1837efa386146b`.
- Recreate with `npm run pricing:market:ollama:evidence-model:create`.
- Run with `npm run pricing:market:ollama:evidence-review -- --input=<bounded-review-json> --out-dir=<output-dir> --limit=10`.

## Safety boundary

The worker only talks to an unauthenticated HTTP Ollama endpoint on loopback. It reads a bounded JSON export and writes local JSONL/summary artifacts. It does not read or write Supabase, map cards, publish prices, set market truth, send customer messages, or change customer state.

The model output is advisory. A deterministic guard is applied after every call:

- Any positive warehouse exclusion count for `custom_fake`, `foreign_language`, `lot`, or `sealed` forces `reject_contamination`.
- `review_required_more_evidence` forces `needs_more_evidence`.
- `review_ready_internal_candidate` forces `route_to_human_review`; slabs use a separate reason code.

The local model cannot override these warehouse gates.

## Validation

- Contract tests: 11 passed, 0 failed.
- Clean evidence smoke: 10/10 model calls completed; 0 model errors.
- Contamination smoke: 1/1 model call completed; deterministic guard forced `reject_contamination` from positive exclusion counts.
- Artifacts are outside the repository under `C:\grookai_vault_operator_artifacts\ollama_evidence_review_20261015_final` and `C:\grookai_vault_operator_artifacts\ollama_evidence_review_contamination_20261015_final`.

No production row was changed by this setup.
