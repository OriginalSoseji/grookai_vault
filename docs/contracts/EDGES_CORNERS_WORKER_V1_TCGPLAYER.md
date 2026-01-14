# EDGES_CORNERS_WORKER_V1 (TCGplayer-aligned cap)

**Key written:** `measurements.edges_corners_v1`  
**Purpose:** Evidence-only capture of edgewear/corner whitening with a TCGplayer-aligned “best_possible_condition” cap (not a final grade).  
**Scope:** Backend worker; no DB schema changes, no UI.

## Detection (per face)
- Normalize: resize width=900 (no enlarge), grayscale, normalize (sharp).
- Compute blur_score: mean absolute gradient (dx+dy) normalized to 0..1.
- Edgewear:
  - Border band thickness: `bandPx = round(min(w,h)*0.03)`, clamped 8..40 px.
  - For each side (top/bottom/left/right), build a whitening mask: pixels > (mean + 1.0*std) within the band.
  - Extract contiguous run lengths (px) along that side.
  - Convert to mm using card size 63mm x 88mm: mm_per_px_x = 63/width, mm_per_px_y = 88/height.
  - Keep runs >= 1mm. Store as `edgewear_instances` with side + length_mm.
  - Signals: total_mm, max_contiguous_mm, instances_count.
- Corner whitening:
  - Four corner boxes (12% width/height each); count whitening pixels (same global threshold mean+1*std).
  - Convert to area mm² via mm_per_px_x * mm_per_px_y.

## TCGplayer-aligned cap (edgewear only)
- Constants from “Understanding Card Condition Imperfections” (edgewear contiguous length):
  - Slight ≤ 20mm contiguous (allowed at NM).
  - Minor >20–80mm contiguous (caps at LP; cannot be NM).
  - >80mm contiguous → conservative MP cap for V1.
- Cap logic (overall instances combined, no grading):  
  - if any >80mm → `best_possible_condition = MP`, reason `edgewear_over_80mm_instance_present`  
  - else if any >20mm → `LP`, reason `edgewear_minor_instance_present`  
  - else if any >0mm → `NM`, reason `edgewear_slight_present`  
  - else → `NM`, reason `no_edgewear_detected`

## Output shape
```
edges_corners_v1: {
  version: 1,
  tcgplayer: { version: 1, best_possible_condition, reasons: [] },
  front/back: {
    status: ok|failed,
    confidence_0_1: 0.2,
    signals: {
      edgewear_total_mm,
      edgewear_max_contiguous_mm,
      edgewear_instances_count,
      corner_whitening_total_mm2,
      blur_score
    },
    edgewear_instances: [ { side, length_mm } ],
    debug: {}
  },
  overall: {
    status: ok|partial|failed,
    confidence_0_1: 0.2,
    notes: ['tcgplayer-aligned-edgewear-v1']
  }
}
```
- Failures: if a face decode fails → that face `failed`; overall becomes `partial` if the other face is ok else `failed`; confidence stays 0.2. `best_possible_condition` becomes `UNKNOWN` with reason `face_decode_failed`.

## CLI (dry-run)
```
node backend/condition/edges_corners_worker_v1.mjs \
  --snapshot-id <uuid> \
  --analysis-version v1_edges_corners \
  --dry-run true \
  --debug false
```
Dry-run prints JSON summary only; non-dry runs insert via `admin_condition_assist_insert_analysis_v1` with only `edges_corners_v1` in measurements and empty defects. Confidence fixed at 0.2. Notes: `['edges_corners_v1']` / `['tcgplayer-aligned-edgewear-v1']`.

## Notes
- V1 is instrumentation-first; final Grookai Grade comes later using multiple signals. No grading/NM/LP mapping performed here beyond the cap. No SQL in this doc.
