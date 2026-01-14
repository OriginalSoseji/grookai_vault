# Centering Measurement Contract V2 (DRAFT)

## Foundation
- Builds on `CONDITION_MEASUREMENT_CONTRACT_V1.md` (LOCKED).
- Measurements-only: no grades/bands; append-only via `admin_condition_assist_insert_analysis_v1`.
- Deterministic analysis key: `sha256(snapshot_id | analysis_version | manifestJson)`.

## Output Schema
- `analysis_version`: `v2_centering`.
- `measurements.version = 2`.
- `measurements.centering = {`
  - `front_lr_ratio`, `front_tb_ratio`, `back_lr_ratio`, `back_tb_ratio` (0..1 ratios).
  - `unit: "ratio"`.
  - `raw: { front_left_px, front_right_px, front_top_px, front_bottom_px, back_left_px, back_right_px, back_top_px, back_bottom_px, normalized_size: { width_px, height_px } }`
  - `evidence: {`
    - `front_outer_bbox`, `front_inner_bbox`, `back_outer_bbox`, `back_inner_bbox` (normalized 0..1 bboxes),
    - `method: "centering_v2_rectangles"`,
    - `notes: []`
  - `}`
- `scan_quality.version = 1` (may be minimal but must exist).
- `defects.version = 1` with `items: []` allowed.
- `confidence`: measurement reliability only (not grade).
- `analysis_status ∈ { ok, partial, failed }`.
- `failure_reason ∈ { missing_images, download_failed, edge_detect_failed, quad_not_found, warp_perspective_failed, inner_frame_not_found, low_resolution, glare, blur, crop, unknown }`.

## Behavioral Rules
- Determinism: same inputs → same outputs and `analysis_key`.
- Fingerprint compatibility: condition measurements may inform fingerprint confidence; they must never create or split fingerprints.
- No overwriting/merging of snapshots; append-only analyses.
- Failure is valid; confidence must still be populated (low) on failures.

## Runbook (worker)
- Dry-run (no DB writes):
```bash
node backend/condition/centering_measurement_worker_v2.mjs --snapshot-id <uuid> --dry-run true
```
- Apply (writes via RPC):
```bash
node backend/condition/centering_measurement_worker_v2.mjs --snapshot-id <uuid> --dry-run false
```

**Status: DRAFT**
