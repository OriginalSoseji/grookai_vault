# Scanner Branch Decommission Plan

## Branches

- Source branch: `scanner-phase7-db-index`
- Extraction branch: `scanner-v4-foundation`
- Goal: preserve validated Scanner foundations and remove active experimental retrieval/dead-path clutter from the working branch.

## Keep Foundation

These systems remain active on `scanner-v4-foundation`:

- Scanner V3 production camera shell:
  - `lib/screens/scanner/condition_camera_screen.dart`
  - `lib/screens/scanner/widgets/`
- Scanner safety and state architecture:
  - `lib/services/scanner_v3/scanner_v3_live_loop_controller.dart`
  - `lib/services/scanner_v3/convergence_state_v1.dart`
  - `lib/services/scanner_v3/candidate_vote_state_v1.dart`
  - `lib/services/scanner_v3/scanner_v3_identity_pipeline_v8.dart`
  - `lib/services/scanner_v3/embedding_service_v1.dart`
  - `lib/services/scanner_v3/vector_candidate_service_v1.dart`
- Native bridge foundation:
  - `android/app/src/main/kotlin/com/example/grookai_vault/scanner/`
  - `lib/services/scanner/native_quad_detector.dart`
  - `lib/services/scanner/native_scanner_phase0_bridge.dart`
- Identity service scaffolding:
  - `backend/identity_v3/run_scanner_v3_identity_service_v1.mjs`
  - `backend/identity_v3/lib/embedding_index_v1.mjs`
  - `backend/identity_v3/lib/hash_index_v1.mjs`
- Synthetic/training prep:
  - `backend/identity_v3/run_synthetic_scanner_training_dataset_v1.mjs`
  - `backend/identity_v3/lib/synthetic_scan_augment_v1.mjs`
- Active Scanner V3 governance:
  - `docs/contracts/scanner_v3_instant_scan_contract.md`
  - `docs/contracts/SCANNER_CAMERA_SYSTEM_V1.md`
  - `docs/contracts/SCANNER_SHUTTER_GATE_CONTRACT_V1.md`
  - `docs/plans/scanner_v3_instant_scan_plan.md`
  - `docs/checkpoints/scanner/SCANNER_V3_INSTANT_SCAN_PIVOT.md`
  - `docs/checkpoints/scanner/SCANNER_V3_IDENTITY_BACKEND_LOCKED.md`
  - `docs/runbooks/SCANNER_V3_LOCAL_DEVICE_RUNBOOK.md`
  - `docs/audits/scanner_v3_camera_quality_audit.md`
  - `docs/audits/scanner_v3_e2e_completion_audit.md`

## Archive Only

These files are useful historical R&D context, but should not present as active scanner direction. Move them under `docs/archive/scanner_rnd/`:

- Scanner V2 OCR audits and contracts/plans.
- Phase 7/8 hash, embedding, and fingerprint scanner-debt audits.
- Native detector research audits.
- Scanner V3 pivot/debt audit.

## Decommission

Remove these active code paths from the clean branch:

- Backend Scanner V3 proof harnesses:
  - normalization proof harness
  - hash recognition proof harness
  - repeat capture distance harness
  - frame convergence harness
  - video convergence harness
  - helper libs used only by those harnesses
- Identity Bridge V1-V7 proof harnesses:
  - hash funnel
  - visual descriptor funnel
  - patch matching
  - reference alignment
  - embedding funnel
  - rerank proof
  - multicrop recall proof
- Descriptor helper libs used only by the removed proof harnesses.
- Generated Flutter plugin dependency churn:
  - `.flutter-plugins-dependencies`

## Rationale

The Scanner V3 R&D branch proved several foundations:

- Scanner must be detection/quality gated before identity.
- Unknown/ambiguous states are required to prevent false confidence.
- Scanner UI should be production-simple and hide raw candidates.
- Scanner-only guesses are not training-safe.
- Hash and global descriptor paths were insufficient as identity authority.
- Embedding/vector retrieval is useful as scaffolding, but current experimental loops are not the final scanner.

The failed or inconclusive fast paths should not remain active in the clean branch because they create ambiguous ownership and make the next scanner iteration harder to reason about.

## Future Direction

Scanner V4 should move toward a YOLO/detection-first ML scanner:

1. Detect a real card object before any identity work.
2. Normalize the detected card with stable geometry.
3. Gate quality and card presence strictly.
4. Produce candidate identity only after card-present confidence is high.
5. Use future GOLD/SILVER governed training data for a dedicated model.
6. Keep AI/manual confirmation as the safety boundary for uncertain identity.

## Risk Notes

- The active native detector still needs stronger empty-scene rejection before identity can be considered production-ready.
- The local identity service is scaffold only; it should not be treated as final identity authority.
- Removed harnesses remain available in git history and, where documented, in archived audit notes.
- No Supabase schema, pricing, identity-worker, or production backend behavior is modified by this extraction.
