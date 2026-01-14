# SCRATCHES_SURFACE_WORKER_V1 — Instrumentation-Only Worker

**Purpose:** Collect simple surface/scratches signals (no grading) for front/back images. Outputs `measurements.scratches_v1` only.

**Output key:** `measurements.scratches_v1`

Structure:
```
version: 1
front/back: {
  status: ok|partial|failed
  confidence_0_1: 0.2
  signals: {
    high_freq_energy: <number>
    specular_variance: <number>
  }
  regions: []
  debug: {}
}
overall: {
  status: ok|partial|failed
  confidence_0_1: 0.2
  notes: ['instrumentation-only']
}
```

Signals (per face, deterministic):
- `high_freq_energy`: mean absolute gradient (dx+dy) after resize 900px, grayscale, normalize
- `specular_variance`: intensity variance after the same processing

Failures:
- If an image cannot be decoded/downloaded, that face is `failed`; overall is `partial` if the other face succeeds else `failed`.
- Confidence remains capped at 0.2.

CLI (dry-run):
```
node backend/condition/scratches_surface_worker_v1.mjs \
  --snapshot-id <uuid> \
  --analysis-version v1_scratches \
  --dry-run true \
  --debug false
```

Dry-run prints a JSON summary (no DB write). Non-dry runs insert via `admin_condition_assist_insert_analysis_v1` with only `scratches_v1` in measurements and empty defects.
