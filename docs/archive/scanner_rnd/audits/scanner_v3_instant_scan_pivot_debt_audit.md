# Scanner V3 Instant Scan Pivot Debt Audit

## Scope

This audit classifies scanner runtime and research debt created by the Phase 7 hash, Phase 8 embedding, and Scanner V2 OCR fast-path attempts. It does not change production behavior.

Locked direction:

1. Capture quality gate
2. Scan-normalized card image
3. Stable normalized full-card and artwork crops
4. Hash or visual matching only on normalized scan-quality artifacts
5. Verifier and AI fallback when instant confidence is insufficient

OCR is no longer the fast-path authority. Embeddings alone are no longer the fast-path authority. Hash may only be revisited after scan normalization controls capture quality.

## Current Active Scanner Runtime Paths

| Area | Current role | Classification | Notes |
| --- | --- | --- | --- |
| Production scanner UI and native scanner files | Existing user-facing scan path | KEEP | Do not change during this cleanup. Any Scanner V3 production change needs a proof harness first. |
| AI identity path and backend identity worker | Source-of-truth fallback | KEEP | Must remain available when instant confidence is insufficient. |
| `backend/ai_border_service/app.py` AI border and warp routes | Border detection, quad warp, OCR, AI helper service | KEEP / CONVERT / REMOVE LATER | Border and warp behavior is useful for Scanner V3. Scanner V2 fast OCR and OCR debug writers should not remain active fast-path authority. |
| `backend/scanner_v2/run_scanner_engine_v2_phase1_harness.mjs` | Experimental V2 harness | QUARANTINE / CONVERT | Contains bounded OCR input prep, warp-first OCR, dual-read OCR, embedding lookup, and verifier fallback experiments. Useful as evidence and for selected harness patterns only. |
| `backend/scanner_v2/scanner_engine_v2_phase1_verifier.mjs` | Deterministic verifier experiment | CONVERT | The fail-closed verifier boundary is useful. Its current OCR and embedding assumptions should not define Scanner V3. |
| `supabase/functions/fingerprint_lookup_v1/*` | Phase 7 fingerprint lookup function | QUARANTINE / REMOVE LATER | Prior audit identifies scanner-lane hash lookup as unsafe until normalized capture exists. |
| `backend/embeddings/*` | Phase 8 embedding services and tests | QUARANTINE | Embedding lookup failed as an authority path and should remain research-only. |

## Failed Experiment Inventory

### Phase 7 Hash Fast Path

Evidence source:

- `docs/audits/phase7_hash_debt_cleanup_audit.md`
- `docs/audits/phase7_fingerprint_match_failure_root_cause.md`
- `docs/audits/phase7_fingerprint_index_l2_audit.md`
- `docs/contracts/phase7_fingerprint_index_contract_v1.md`
- `docs/contracts/phase7b_scanner_fingerprint_lane_contract_v1.md`
- `backend/_quarantine/phase7_hash/*`
- `supabase/functions/fingerprint_lookup_v1/*`
- `supabase/migrations/20260427090000_phase7_fingerprint_index_v1.sql`
- `supabase/migrations/20260427110000_scanner_fingerprint_index_v1.sql`

Finding:

The hash attempt failed because matching was attempted against uncontrolled scanner captures and synthetic scanner-lane variants. The same-card signal was not stable enough to be a fast-path identity authority. Hash remains worth retesting only after the input is a controlled, scan-normalized artifact.

Classification:

| Artifact | Classification | Action |
| --- | --- | --- |
| Phase 7 audit and contract docs | KEEP | Historical evidence and constraints. Mark superseded by Scanner V3 where referenced. |
| `backend/_quarantine/phase7_hash/*` | QUARANTINE | Keep only as research until V3 hash retest proves a replacement. |
| `supabase/functions/fingerprint_lookup_v1/*` | REMOVE LATER | Runtime lookup path should not stay active before normalized capture proof. |
| Phase 7 migrations | QUARANTINE / KEEP AS MIGRATION HISTORY | Do not edit applied migrations. Use forward-only cleanup later if schema exists remotely. |
| Any package scripts that run Phase 7 indexing or lookup | REMOVE LATER | Remove only in cleanup phase, after runtime callers are confirmed inactive. |

### Phase 8 Embedding Fast Path

Evidence source:

- `docs/audits/phase8_embedding_debt_cleanup_audit.md`
- `backend/embeddings/image_embedding_service_v1.mjs`
- `backend/embeddings/card_embedding_index_worker_v1.mjs`
- `backend/embeddings/embedding_lookup_test_v1.mjs`
- `supabase/migrations/20260428234000_phase8_embedding_lookup_foundation_v1.sql`
- `supabase/migrations/20260429002000_embedding_lookup_v1_pgvector_rpc.sql`

Finding:

The embedding harness did not establish a safe identity path. Prior Phase 8 evidence showed 0 pass and 15 fail on the test set. Embeddings can remain candidate-generation research, but cannot define identity and cannot be the Scanner V3 fast-path authority.

Classification:

| Artifact | Classification | Action |
| --- | --- | --- |
| `backend/embeddings/image_embedding_service_v1.mjs` | QUARANTINE | Research-only. Do not invoke from scanner runtime. |
| `backend/embeddings/card_embedding_index_worker_v1.mjs` | QUARANTINE | Write-capable indexer. Keep inactive. |
| `backend/embeddings/embedding_lookup_test_v1.mjs` | KEEP AS RESEARCH | Useful only for offline measurement. |
| Phase 8 migrations | KEEP AS MIGRATION HISTORY / CLEAN FORWARD LATER | Do not edit applied migrations. Use forward migration cleanup if needed. |
| Embedding package dependencies and scripts | REMOVE LATER | Remove during cleanup after confirming no non-scanner dependency. |

### Scanner V2 OCR Fast Path

Evidence source:

- `docs/audits/scanner_v2_harness_ocr_timeout_audit.md`
- `docs/audits/scanner_v2_ocr_service_post_timeout_audit.md`
- `docs/audits/scanner_engine_v2_phase1_ocr_verifier_reuse_audit.md`
- `backend/ai_border_service/app.py`
- `backend/scanner_v2/run_scanner_engine_v2_phase1_harness.mjs`
- `.tmp/ocr_debug/`
- `.tmp/scanner_v2_ocr_inputs/`
- `.tmp/scanner_v2_normalized/`

Finding:

OCR work fixed transport and runtime failures, but the recognition path remained too fragile to be a fast path. The V2 harness originally sent oversized normalized PNG payloads to `/ocr-card-signals`; later patches added bounded JPEG input, OCR preflight, Tesseract availability, fast mode, crop variants, full bottom-band OCR, candidate reconciliation, warp-first input, and dual-read warp-vs-crop comparison. The best measured outcome remained 4 valid collector-number reads out of 15, with 0 verifier accepts and 15 fallbacks. Warp was not consistently better; dual-read measurements showed crop winning over warp in the test set.

Classification:

| Artifact | Classification | Action |
| --- | --- | --- |
| `scanner_v2_fast` mode in `backend/ai_border_service/app.py` | REMOVE LATER / KEEP AS RESEARCH | Should not remain a scanner fast-path authority. May stay temporarily behind explicit research mode until cleanup. |
| OCR debug artifact writers in `backend/ai_border_service/app.py` | REMOVE LATER | Debug output should not remain active runtime behavior unless explicitly gated for research. |
| Dual-read and warp-first OCR logic in `backend/scanner_v2/run_scanner_engine_v2_phase1_harness.mjs` | QUARANTINE | Useful as evidence that OCR should not be expanded. Do not convert into production. |
| Bounded JPEG helper patterns in harness | CONVERT | Payload bounding and artifact size checks are useful for Scanner V3 normalized artifacts. |
| `/detect-card-border` and `/warp-card-quad` route usage | CONVERT | Border detection and warping are core to Scanner V3 scan normalization. |
| OCR audits and debug outputs | KEEP AS EVIDENCE / REMOVE TEMP LATER | Preserve docs. Delete temp artifacts only after evidence is copied. |

### Temporary Local Wrapper Assumptions

During OCR verification, local-only wrappers and direct POST probes were used to exercise the service. These are audit tools, not runtime contracts.

Classification:

| Artifact | Classification | Action |
| --- | --- | --- |
| Local direct POST probes | KEEP AS EVIDENCE ONLY | Do not convert into runtime clients. |
| Temporary wrapper assumptions around local services | REMOVE LATER | Scanner V3 must use explicit service contracts and proof harnesses. |

## Temp And Debug Directories

| Path | Classification | Action |
| --- | --- | --- |
| `.tmp/ocr_debug/` | REMOVE LATER | OCR visibility artifacts. Delete after final evidence is copied into docs if needed. |
| `.tmp/scanner_v2_ocr_inputs/` | REMOVE LATER | OCR harness input artifacts. Delete after cleanup checkpoint. |
| `.tmp/scanner_v2_normalized/` | REMOVE LATER / CONVERT SHAPE | Directory shape may inform V3 artifacts, but current contents are temporary. |
| `.tmp/embedding_test_images/` | KEEP TEMPORARILY / REMOVE LATER | Useful for offline reproduction until V3 test corpus replaces it. |
| `.tmp/scanner_manual_test/` | KEEP TEMPORARILY | Manual scanner evidence only. |
| `.tmp/hf-transformers-cache/` | REMOVE LATER | Embedding dependency cache. |

## What Is Safe To Keep

- Production scanner flow, AI identity fallback, and backend identity worker.
- AI border service routes required for card border detection and card warping.
- Historical audits, contracts, checkpoints, and measurement outputs.
- Fail-closed verifier ideas that prevent uncertain instant matches.
- Bounded JPEG and artifact metadata patterns, converted into Scanner V3 only after a new contract exists.

## What Must Be Isolated

- Phase 7 fingerprint lookup runtime and any scanner caller using it.
- Phase 8 embedding workers, RPC lookups, package scripts, and dependency assumptions.
- Scanner V2 OCR fast mode, OCR debug writers, and dual-read OCR harness behavior.
- Temp wrappers and test-only local assumptions.

## What Must Not Be Used Going Forward

- OCR number or set extraction as the fast-path identity authority.
- Embedding nearest-neighbor results as the identity authority.
- dHash or visual hash on raw camera frames.
- Synthetic scanner-lane hash variants as a production proof.
- A production scanner change without a Scanner V3 proof harness.
- Any failed runtime debt unless it is explicitly converted under the Scanner V3 contract.

## Exact Cleanup Order

1. Preserve this pivot audit, Scanner V3 plan, Scanner V3 contract, and checkpoint.
2. Freeze Scanner V2 OCR, Phase 7 hash, and Phase 8 embedding work as research-only.
3. Confirm active production scanner callers. Disable any Phase 7 fingerprint runtime caller before deleting code or schema.
4. Quarantine Scanner V2 harness OCR/embedding paths and remove package scripts that invoke failed experiments.
5. Keep AI identity fallback and border/warp service behavior intact.
6. Remove or gate OCR fast mode and OCR debug writers after Scanner V3 proof harness exists or after confirming no caller depends on them.
7. Quarantine embedding services and remove embedding runtime dependencies/scripts if no other feature uses them.
8. Clean temporary directories after evidence is copied or no longer needed.
9. Handle migrations and remote schema only through forward-only cleanup migrations if they were applied.
10. Start Scanner V3 implementation with a harness that produces scan-normalized artifacts before any production scanner change.

## Scanner V3 Conversion Targets

| Source | Convert into Scanner V3 |
| --- | --- |
| AI border detection and quad warp | Scan-normalized full-card artifact generation |
| Bounded JPEG payload helper | Normalized artifact size and quality bounds |
| Fail-closed verifier behavior | Instant match confidence gate and fallback boundary |
| Phase 7 hash research | Retest only on normalized full-card and artwork crops |
| Phase 8 visual research | Candidate generation only, never identity authority |
| OCR debug lessons | Avoid text authority; use only diagnostics if needed |
