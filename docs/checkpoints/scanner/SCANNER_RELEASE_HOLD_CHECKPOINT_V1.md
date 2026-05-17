# Scanner Release Hold Checkpoint V1

Date: 2026-05-16
Branch: `scanner-v4-card-present-gate`
Starting HEAD: `7c63925`
Status: Release hold / scanner parked

## Decision

Scanner identity is no longer a release blocker.

The current scanner work is preserved as a checkpoint, but it is not accepted as
a production-grade card identity feature. The app release should proceed without
continuing scanner tuning in this branch.

Wrong card identity remains worse than no identity. The scanner must stay
fail-closed when evidence is weak.

## Current User-Visible Scanner State

- The normal app Scan route is wired to `FixedSlotCaptureScreen`.
- The route uses fixed-slot still capture and the ANN endpoint after shutter.
- OCR is not used as scanner identity authority.
- Fixed-slot manifests identify the path as:
  - `scanner_surface=fixed_slot_capture_v1`
  - `identity_mode=still_capture_ann`
  - `ocr=false`
  - `live_identity_loop=false`
- Real-world testing is still inconsistent. The latest manual test reported no
  confident matches on cards that previously worked.
- This means the current scanner is a preserved experimental scanner baseline,
  not a feature that should hold the app release.

## What Was Built

### Scanner V4 card-present gate

- Identity startup was gated behind real card-present evidence.
- Empty/background scenes were proved to block identity:
  - `card_present=0`
  - `identity_allowed=0`
  - `identity_started=0`
- Real card-in-view detection was proved separately:
  - `REAL_CARD: PASS`
  - `total=15 native=15 card_present=11 identity_allowed=11 identity_started=11`

Evidence remains in `.tmp/scanner_v4_real_device_reports/` and is not committed.

### Native camera and prewarm foundation

- Android scanner-owned CameraX prewarm was added for scanner surfaces.
- Native analysis resolution was raised to `1920x1080`.
- Continuous AF/AE/AWB options were added to scanner native camera analysis and
  preview paths.
- A slot-centered focus loop exists in the native scanner controller.
- The fixed-slot screen now asks Flutter camera to focus and meter on the slot
  center before still capture.

This foundation is scanner-only. It does not make identity production-ready by
itself.

### Fixed-slot scanner reset

- `FIXED_SLOT_CAPTURE_SCANNER_V1` became the production scanner direction.
- Fixed slot owns crop authority.
- Shutter still capture owns identity frame authority.
- Detector rectangles are advisory only and no longer own identity crop
  authority for the fixed-slot path.
- Legacy live scanner routes remain quarantined for debug/developer access.

Key docs:

- `docs/contracts/FIXED_SLOT_CAPTURE_SCANNER_V1.md`
- `docs/checkpoints/FIXED_SLOT_SCANNER_RESET_V1.md`
- `docs/audits/scanner_authority_conflict_audit_v1.md`
- `docs/audits/scanner_route_authority_audit_v1.md`

### Full ANN scanner identity backend

- A compact full-db ANN artifact was built from canonical Grookai data.
- The compact artifact is not a full brute-force JSON index.
- Local full candidate artifact:
  - `.tmp/scanner_v3_ann_index_v1/full_candidate_compact_v1`
- Full artifact counts:
  - references: `24,715`
  - reference views: `173,005`
  - PAL / `sv02`: `295`
  - shards: `7`
  - storage: `compact_f32_shards_v1`
- OCR is disabled by `SCANNER_NO_OCR_IDENTITY_AUTHORITY_CONTRACT_V1`.

Key docs:

- `docs/audits/scanner_ann_compact_artifact_v1.md`
- `docs/audits/scanner_full_db_index_recovery_scale_gate_report_v1.md`
- `docs/contracts/SCANNER_FULL_DB_IDENTITY_INDEX_CONTRACT_V1.md`
- `docs/playbooks/SCANNER_ANN_INDEX_OPERATIONS_PLAYBOOK_V1.md`

### Droplet side-by-side stage

The full ANN artifact was staged side-by-side on the droplet without switching
public traffic.

Staged service documented facts:

- service: `scanner-v3-ann-stage.service`
- bind: `127.0.0.1:8790`
- artifact: `/opt/grookai-scanner-identity-ann-stage/data/full_candidate_compact_v1`
- references: `24,715`
- reference views: `173,005`
- PAL / `sv02`: `295`
- OCR disabled
- public Nginx route unchanged

Live production remains on the old partial service. No public promotion was
performed.

Key doc:

- `docs/audits/scanner_ann_side_by_side_droplet_stage_v1.md`

### No-OCR and no-wrong-ID contracts

- OCR was explicitly removed as scanner identity authority.
- A no-wrong-ID shutter authority contract was added:
  - `docs/contracts/SCANNER_SHUTTER_AUTHORITY_NO_WRONG_ID_CONTRACT_V1.md`
- The contract says plausible visual neighbors must fail closed rather than be
  shown as exact identity.
- Legacy vote state now has strict shutter authority support so background
  evidence can be buffered without automatically becoming the final ID.

### Fixed-slot debug and regression tooling

- Fixed-slot capture writes inspectable artifacts:
  - full still
  - initial slot crop
  - edge-refined crop when available
  - normalized card image
  - ANN/debug crops
  - manifest with endpoint, geometry, quality, and decision fields
- A regression harness was added:
  - `backend/identity_v3/run_fixed_slot_artifact_regression_v1.mjs`
  - `backend/identity_v3/fixtures/fixed_slot_artifact_regression_cases_v1.json`
- Latest artifact regression report:
  - `.tmp/scanner_fixed_slot_regression_v1/fixed_slot_artifact_regression_20260516T234512Z.json`
  - 3/3 cases passed by harness criteria
  - Talonflame confirmed as `GV-PK-ME03-014`
  - Vivillon confirmed as `GV-PK-ME03-009`
  - previous wrong-Sylveon Vivillon case failed closed as intended

This harness is useful, but it is not a substitute for reliable real-world
phone behavior.

## Current Runtime Facts

### Public production scanner endpoint

Health checked on 2026-05-16:

```text
https://scanner-identity.grookaivault.com/health
```

Current public production health:

- ok: `true`
- service: `scanner_v3_identity_service_v1`
- model: `Xenova/clip-vit-base-patch32`
- index source:
  `/opt/grookai-scanner-identity/data/scanner_v3_embedding_index_v7_plus_me_sets_plus_sv10_5w_title_v1.json`
- reference count: `1,138`
- reference view count: `7,005`
- resolve path: `/scanner-v3/resolve-crops`

Conclusion: public production is still the partial/old index. It is not the full
ANN artifact.

### Current local full ANN service

Health checked on 2026-05-16 at:

```text
http://127.0.0.1:8794/health
```

Current local full ANN health:

- service: `scanner_v3_ann_identity_service_v1`
- artifact dir: `.tmp/scanner_v3_ann_index_v1/full_candidate_compact_v1`
- reference count: `24,715`
- reference view count: `173,005`
- PAL / `sv02`: `295`
- fixed-slot visual confirmation: enabled
- fixed-slot confirmation max candidates: `260`
- OCR disabled
- RSS observed: about `1.19 GiB`

This local service is useful for development and artifact tests. It does not
mean the phone scanner is production-ready.

### Current staged droplet ANN service

Health checked on 2026-05-16 through the current local stage access path:

```text
http://127.0.0.1:8790/health
```

Current stage health:

- service: `scanner_v3_ann_identity_service_v1`
- artifact dir:
  `/opt/grookai-scanner-identity-ann-stage/data/full_candidate_compact_v1`
- reference count: `24,715`
- reference view count: `173,005`
- PAL / `sv02`: `295`
- OCR disabled
- RSS observed: about `1.10 GiB`

The staged droplet service is not publicly promoted.

## What Is Not Finished

- Real-world fixed-slot phone identification is not reliable enough.
- Cold start to correct identity is not proven under 2 seconds end to end on the
  phone.
- The public production scanner endpoint still serves only `1,138` references.
- Full ANN public promotion has not happened.
- Multi-card mode is not built.
- Vault add/write flow is not built for this fixed-slot scanner.
- Scanner identity should not be marketed or treated as production-ready in the
  release.

## Release Recommendation

Proceed with app release work and stop scanner iteration on this branch.

For release, the scanner should be treated as one of:

- hidden
- disabled
- internal/experimental
- non-blocking beta surface

This checkpoint does not change release UI visibility. It records that scanner
correctness is not part of the release definition from this point.

## Boundaries To Preserve

- Do not reintroduce OCR as scanner identity authority.
- Do not tune detector thresholds to compensate for identity problems.
- Do not continue patching visual vote state as the main architecture.
- Do not promote the full ANN droplet stage without a separate rollout gate.
- Do not overwrite rollback artifacts.
- Do not touch Supabase schema, pricing, vault, auth, public web, ingestion, or
  unrelated backend workers as part of scanner work.

## Known Safe Rollback Points

- `3285c9c` - stable scanner foundation checkpoint.
- `4dd191f` - stable native scanner foundation checkpoint.
- `a93bbaf` - fixed-slot architecture reset.
- `b72044e` - first fixed-slot one-card ANN vertical slice.
- `1ffecb0` - fixed-slot still normalization work.
- `7c63925` - production scan route wired to fixed-slot capture.

This checkpoint preserves the current scanner state after those commits and the
current uncommitted scanner-only work.

## Verification For This Checkpoint

Run on 2026-05-16 before committing:

```text
PASS git diff --check
PASS flutter analyze lib/screens/scanner lib/services/scanner lib/services/scanner_v3 lib/services/scanner_v4 --no-pub
PASS flutter test test/scanner/candidate_vote_state_v1_test.dart --no-pub
PASS node --check backend/identity_v3/run_scanner_v3_ann_identity_service_v1.mjs
PASS node --check backend/identity_v3/run_fixed_slot_artifact_regression_v1.mjs
PASS node --check backend/identity_v3/run_scanner_v3_identity_latency_harness_v1.mjs
```

Also keep this staged-file guard:

- Commit scanner-only files.
- Exclude generated `.flutter-plugins-dependencies`.
- Exclude unrelated `docs/audits/pokemon_master_set_audit_v1/`.
- Exclude unrelated `scripts/audits/`.

## Final Principle

The scanner is parked, documented, and preserved. It should not continue to
consume release time until the app release work is unblocked.
