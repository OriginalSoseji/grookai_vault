# Phase 8 Embedding Debt Cleanup Audit

Date: 2026-04-29

Source of truth:

- Phase 8 real-image test result: NOT_READY, 0 PASS / 15 FAIL.
- Existing Phase 8 embedding files and migrations.
- Current repo and remote read-only state.

No code, schema, data, deploy, migration, or indexing changes were performed during this audit. This report file is the only intended audit artifact.

## 1. Executive Summary

Final verdict: CLEANUP REQUIRED BEFORE NEXT PHASE

Phase 8 embedding fast path is not ready to sit beside the scanner work. The real-image test failed all 15 attempted Android scanner captures. Ten images failed before lookup because `image_embedding_service_v1` could not normalize the downloaded Android JPEGs (`VipsJpeg: Invalid SOS parameters for sequential JPEG`). Five images reached `embedding_lookup_v1`; none returned the expected card in the top 5.

The embedding implementation is not wired into the scanner UI, app code, Edge Functions, or the identity backend worker. Runtime scanner risk is therefore low today. The debt is operational and repository-level: write-capable experimental code sits under active `backend/`, package scripts advertise embedding commands, heavy model dependencies were added to root package files, and the remote database now has an externally callable embedding lookup RPC plus 613 narrow ME-series embedding rows.

Recommended posture:

- Do not integrate embeddings into scanner fast path.
- Remove or quarantine active-code embedding surfaces before returning to scanner quality/backend latency.
- Preserve the failed test evidence and the migration-ledger audit.
- Do not drop schema or delete remote rows until a separate, explicit schema/data cleanup change is approved.

## 2. File Classification Table

| Artifact | Current state | Classification | Reason |
| --- | --- | --- | --- |
| `backend/embeddings/image_embedding_service_v1.mjs` | Untracked experimental service; uses `Xenova/clip-vit-base-patch32`, `@huggingface/transformers`, and `sharp` | QUARANTINE | Useful research code, but failed most real Android scanner JPEGs and should not remain in active backend runtime paths. |
| `backend/embeddings/card_embedding_index_worker_v1.mjs` | Untracked worker; can write to `card_embeddings` when run with `--apply` | QUARANTINE | Write-capable experimental worker. The default package script is dry-run, but the file is still an operational footgun while Phase 8 is NOT_READY. |
| `backend/embeddings/embedding_lookup_test_v1.mjs` | Untracked test helper; embeds images and calls `embedding_lookup_v1` | KEEP_AS_RESEARCH | Useful for reproducing the failed test result, but should be moved out of active backend or clearly marked research-only. |
| `supabase/migrations/20260428234000_phase8_embedding_lookup_foundation_v1.sql` | Untracked local migration; remote ledger now repaired as applied | KEEP | Keep to preserve migration history alignment. Do not remove an applied migration file casually. |
| `supabase/migrations/20260429002000_embedding_lookup_v1_pgvector_rpc.sql` | Untracked local migration; remote ledger now repaired as applied | KEEP | Keep to preserve migration history alignment. Future cleanup should be forward-only if schema removal is approved. |
| `package.json` dependency `@huggingface/transformers` | Added root dependency | REVERT | Embedding-only heavy dependency. No active app/scanner/backend path should require it after Phase 8 is parked. |
| `package.json` dependency `pg` | Added root dependency; many non-embedding scripts also import `pg` | KEEP | Not embedding-specific in current repo. Do not remove as Phase 8 cleanup without a separate dependency audit. |
| `package.json` dependency `sharp` | Added root dependency; active identity/condition/warehouse code imports `sharp` | KEEP | Not embedding-specific in current repo. Removing it may break non-embedding backend workers. |
| `package.json` script `embedding:index:me` | Added root script | REVERT | Exposes an experimental indexing workflow in the main package script list. |
| `package.json` script `embedding:test` | Added root script | REVERT | Exposes experimental embedding tests in the main package script list; keep only in research notes if needed. |
| `package-lock.json` additions for `@huggingface/transformers`, ONNX runtime, tokenizers, HF Jinja, and transitive embedding deps | About 1106 inserted lines | REVERT | Embedding-only lockfile debt and install weight. |
| `package-lock.json` additions for `pg` and `sharp` | Added in the same package-lock change | KEEP | These are used outside Phase 8 in current repo; verify separately before removing. |
| `.tmp/hf-transformers-cache/` | Local model cache, about 89 MB, includes `Xenova/clip-vit-base-patch32/onnx/vision_model_quantized.onnx` | REMOVE | Local generated cache. Not source, not evidence needed after results are preserved. |
| `.tmp/embedding_test_images/*.jpg` | 15 downloaded real scanner captures | REMOVE | Temporary copies of real scanner images. Keep only if explicitly needed for private reproduction; otherwise remove after report review. |
| `.tmp/embedding_test_images/results.json` | First test run output | KEEP_AS_RESEARCH | Reproduction evidence for NOT_READY result. |
| `.tmp/embedding_test_images/results_extended.json` | Extended test output with top-5 details | KEEP_AS_RESEARCH | Primary evidence for 0 PASS / 15 FAIL and five RPC misses. |
| `docs/audits/phase8_remote_migration_ledger_drift_audit.md` | Existing audit report | KEEP | Documents schema match and ledger repair rationale. |
| `docs/audits/phase8_embedding_debt_cleanup_audit.md` | This report | KEEP | Cleanup decision record. |

## 3. Active Runtime Risk

Scanner path using embeddings: No.

Evidence: repo search found no embedding references in `lib/screens/scanner`, scanner services, Android scanner code, or scanner Edge Functions. The native scanner and identity scanner paths still use capture/upload/identity worker/OCR-resolver style flows, not `embedding_lookup_v1`.

Backend worker using embeddings: No active worker path found.

The only embedding worker is `backend/embeddings/card_embedding_index_worker_v1.mjs`, and it is not referenced by the identity scanner worker, condition workers, ingestion workers, or scheduling code found in this audit. It is only exposed by a root package script and direct manual invocation.

App path calling embedding lookup: No.

Search found calls to `embedding_lookup_v1` only in `backend/embeddings/embedding_lookup_test_v1.mjs` and the temporary test harness output, not in app code or Edge Functions.

Current state: embeddings are inactive research/data, with one caveat. The public database RPC exists in `public` and can be invoked if a caller has API access and execute privilege. That is not a scanner runtime dependency, but it is an unnecessary live DB surface while the feature is NOT_READY.

## 4. Schema/Data Debt

### `public.card_embeddings`

Remote read-only state:

- Row count: 613.
- Model: all rows use `clip_vit_base_patch32_transformersjs_v1`.
- Set distribution:
  - `me02.5`: 295 rows.
  - `me01`: 188 rows.
  - `me02`: 130 rows.

Classification: KEEP for now, but mark as inactive data debt.

Reason:

- The table predates Phase 8 in baseline/history and is referenced in schema contracts and older checkpoints.
- Dropping or truncating it is not safe as a casual cleanup step.
- The current rows are too narrow and skew lookup results toward ME-series cards.

### `public.embedding_lookup_v1`

Remote read-only state:

- Signature: `embedding_lookup_v1(double precision[],text,integer)`.
- Result: `TABLE(card_print_id uuid, model text, distance double precision)`.
- Security: `SECURITY DEFINER`.
- Search path: `public, extensions`.

Classification: QUARANTINE as live DB surface; future cleanup candidate.

Reason:

- No active code path uses it.
- The real-image test showed it is not reliable enough for fast path.
- The RPC is a live public-schema function and should not remain as a quiet production surface unless kept deliberately for research.

### `vector` extension

Remote read-only state:

- Extension: `vector`.
- Version: `0.8.0`.
- Schema: `extensions`.

Classification: KEEP until dependency impact is checked.

Reason:

- Extension alone is low risk.
- Removing extensions can affect future or unrelated work and should only happen in a dedicated schema cleanup migration.

### Remote ME embedding rows

Classification: QUARANTINE / future DELETE candidate.

Reason:

- They bias lookup candidates toward `me01`, `me02`, and `me02.5`.
- The real-image test had only 2 of 15 expected prior top candidates with embedding rows, and both still missed top 5.
- Do not delete during this audit. If cleanup is approved, handle with explicit data cleanup and a backup/export decision.

## 5. Code Debt

Main code debt:

- Experimental embedding code is under `backend/embeddings`, which makes it look like active backend code.
- The indexing worker can write to production data with `--apply`.
- Root package scripts advertise embedding commands even though the final decision is NOT_READY.
- The embedding service depends on a local HF model cache and failed most real Android scanner JPEGs before lookup.
- The root package-lock gained large embedding dependency churn.

Dependency notes:

- `@huggingface/transformers` is embedding-only and should be reverted from active package files.
- `pg` and `sharp` are used elsewhere in current backend code. They should not be removed as part of Phase 8 cleanup without a separate dependency audit.
- The local HF cache is generated runtime material, not source.

## 6. Documentation To Preserve

Preserve:

- `docs/audits/phase8_remote_migration_ledger_drift_audit.md`
- `docs/audits/phase8_embedding_debt_cleanup_audit.md`
- `.tmp/embedding_test_images/results_extended.json` until its findings are copied into a stable audit/checkpoint location or the team explicitly accepts this report as sufficient.

Do not preserve long term:

- Local copies of real scanner images under `.tmp/embedding_test_images/*.jpg`, unless needed for a private reproduction set.
- `.tmp/hf-transformers-cache/`, because it is generated model cache.

## 7. Recommended Cleanup Plan

1. Quarantine or remove `backend/embeddings/card_embedding_index_worker_v1.mjs` from active backend paths. Preserve only if moved to a clearly research-only location.
2. Revert the root `embedding:index:me` and `embedding:test` package scripts.
3. Revert `@huggingface/transformers` and its lockfile transitive dependency tree from active package files.
4. Remove generated local artifacts after evidence is preserved: `.tmp/hf-transformers-cache/` and `.tmp/embedding_test_images/*.jpg`.
5. Leave the two Phase 8 migration files in place to preserve repaired migration history; if schema cleanup is desired, create a separate forward-only migration later.
6. Decide explicitly whether to keep or drop `embedding_lookup_v1`. Recommended future path is a forward-only cleanup migration that drops or revokes the RPC if no research caller remains.
7. Decide explicitly whether to retain, export, or delete the 613 ME embedding rows. Do not delete them as incidental cleanup.
8. Return scanner focus to capture quality, border/warp quality, backend latency, and resolver/OCR improvements before revisiting embeddings.

## 8. Stop Conditions

Stop cleanup and escalate if any of these are true:

- A scanner, app, Edge Function, or production backend path is found calling `embedding_lookup_v1`.
- Any non-embedding production workflow depends on `@huggingface/transformers`.
- A future cleanup attempts to delete `card_embeddings` rows without an explicit data-retention decision.
- A future cleanup attempts to drop `card_embeddings` despite its baseline/history presence.
- A future cleanup removes `pg` or `sharp` without checking non-embedding backend imports.
- Any rollback/reapply plan is proposed for applied migration history instead of a forward-only cleanup.

## 9. Final Verdict

CLEANUP REQUIRED BEFORE NEXT PHASE

Reason: embeddings are inactive in scanner runtime, but the repository and database now carry experimental code, package scripts, heavy dependency additions, a live RPC, and skewed research rows after a failed real-image test. Cleaning or quarantining those surfaces first will reduce accidental indexing, accidental dependency drag, and distraction while scanner quality/backend latency work resumes.
