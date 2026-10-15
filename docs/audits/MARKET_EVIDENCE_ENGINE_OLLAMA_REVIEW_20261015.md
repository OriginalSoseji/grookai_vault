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
- Each scheduled invocation retains stdout, stderr, start time, completion, and failure state under `C:\grookai_vault_operator_artifacts\mee_ollama_scheduled_logs`. Run the same wrapper with `-DryRun` to reproduce the unattended environment without inserting review events.

## Safety boundary

The worker only talks to an unauthenticated HTTP Ollama endpoint on loopback. It reads a bounded JSON export and writes local JSONL/summary artifacts. It does not read or write Supabase, map cards, publish prices, set market truth, send customer messages, or change customer state.

The model output is advisory. A deterministic guard is applied after every call:

- Any positive warehouse exclusion count for `custom_fake`, `foreign_language`, `lot`, or `sealed` forces `reject_contamination`.
- `review_required_more_evidence` forces `needs_more_evidence`.
- `review_ready_internal_candidate` forces `route_to_human_review`; slabs use a separate reason code.

The local model cannot override these warehouse gates.

For raw-single rows, the automation can approve an internal price signal only when the deterministic bucket is `review_ready_internal_candidate`, the model returns clean identity with at least 0.95 confidence, and no contamination or outlier rule fires. This writes only `market_evidence_price_review_events`; it does not write `pricing_observations` or change any public pricing flag.

Slab rows now have a separate internal-only lane in `market_evidence_slab_review_events`. They can be rejected for deterministic contamination, deferred for insufficient evidence, or held for the slab policy queue. They cannot be approved, published, app-visible, or treated as market truth. The lane is intentionally separate so raw-single approvals cannot be accidentally applied to graded/slab inventory.

The slab queue is now reviewable through the founder-gated, read-only `get_market_evidence_slab_review_queue_v1` RPC. It returns the latest event per source rollup, orders manual holds before deferred and rejected rows, caps each request at 250 rows, and does not grant any write or pricing-publication authority.

The slab approval policy is explicit in every new automation payload as `MEE_SLAB_APPROVAL_POLICY_V1`. A slab event remains blocked until each listing has grader identity, numeric grade, same-grade rollup membership, and listing-level provenance. A bucket-level “graded” label is insufficient because it can mix PSA, CGC, different grades, signatures, and other non-comparable listings.

Listing-level identity is now available through the service-role-only `v_market_evidence_slab_listing_identity_v1` read model. It extracts the existing grader and numeric-grade evidence from each slab listing event and reports `identified`, `missing_grader`, or `missing_grade`. A bounded production readback returned both identified listings and a missing-grade example; the view remains outside all app pricing surfaces.

Future MEE-11S rollup plans now bind that identity into `rollup_payload.slab_identity`, including per-rollup pair counts and explicit statuses: `reviewable_same_grade_identity`, `blocked_mixed_grader_grade`, or `blocked_missing_listing_identity`. Even the reviewable status remains `can_auto_approve: false` until a founder policy decision exists.

The first live read-only plan with this binding scanned 198 price events and produced 175 candidate rows plus 9 internal rollups. Its two slab rollups were both blocked: one had 13/24 identified listings but eight distinct grader/grade pairs, and the other had no grader identity. No rows were applied.

The exact dynamic plan was then replayed through the guarded apply command with collision skipping enabled. Remote readback verified all 175 candidate rows and all 9 rollups already existed; 0 rows were inserted and 184 planned rows were skipped as idempotent collisions. No public flags, app-visible fields, or market-truth fields were written.

## Validation

- Contract tests: 18 passed, 0 failed.
- Full repository contract suite after reconciling current `main`: 7,918 passed, 10 skipped, 0 failed.
- Clean evidence smoke: 10/10 model calls completed; 0 model errors.
- Contamination smoke: 1/1 model call completed; deterministic guard forced `reject_contamination` from positive exclusion counts.
- Live automation pages: the original raw-single page inserted 4 raw events; the slab lane smoke page inserted 1 slab event; the next 20-rollup page inserted 10 raw events and 10 slab events. The current automation readback is 68 raw events and 11 slab events; the slab table has no approvals and remains internal-only.
- Production readback: all automation events across both lanes have zero `can_publish_price_directly`, `publishable`, `app_visible`, or `market_truth` rows. The scheduled checkpoint advanced to offset 33 after the bounded page.
- Artifacts are outside the repository under `C:\grookai_vault_operator_artifacts\ollama_evidence_review_20261015_final` and `C:\grookai_vault_operator_artifacts\ollama_evidence_review_contamination_20261015_final`.
- Vercel preview deployment completed successfully for the reconciled PR; required GitHub workflows remain queued by repository runner capacity and must pass before merge.

No production row was changed by this setup.
