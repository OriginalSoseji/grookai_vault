# Card Visual Search Checkpoint Index

## Purpose

This index preserves the productionization history for Grookai Visual Search.
Visual search is an evidence-backed collector discovery system built from
derived card-artwork facts. It does not replace canonical identity search,
create canonical truth, or authorize downstream recommendation systems.

## Checkpoints

- `VISUAL_SEARCH_V1_SELECTIVE_SOURCE_MANIFEST_20260728.md` - `2026-07-28` -
  COMPLETE; SOURCE IMPORT FROZEN - Records the deterministic 61-file
  selective-import manifest pinned to source SHA `c5bbbba5`, including 35
  Lane A imports, 8 later calibration files, 6 reference-only files, 10
  superseded contracts, 2 generated portal exclusions, five production
  rebuilds, per-file blob/content/commit provenance, `8/8` focused contracts,
  unchanged no-write boundaries, and the exact next gate as hash-verified
  import and reconciliation of only the 35 Lane A files.
- `VISUAL_SEARCH_V1_PRODUCTIZATION_START_20260728.md` - `2026-07-28` -
  ACTIVE; MAIN-BASED PRODUCTIZATION STARTED - Records the clean
  `origin/main` baseline, governed source-branch provenance, existing
  `11,000`-row non-Energy corpus, `9,702` eligible printings, `9,532` artwork
  identities, deterministic projections, calibration and review state,
  target search architecture, selective-integration strategy, complete
  implementation and release gates, pricing isolation, invariants, risks,
  and the exact next gate as a source-import manifest.

## Restart Order

1. Read `VISUAL_SEARCH_V1_PRODUCTIZATION_START_20260728.md`.
2. Read `VISUAL_SEARCH_V1_SELECTIVE_SOURCE_MANIFEST_20260728.md`.
3. Confirm the current production `main` SHA and compare it with the checkpoint
   baseline.
4. Confirm pricing canary/release work remains isolated.
5. Inspect the governed source branch at the recorded SHA.
6. Resume only from the latest checkpoint's exact next gate.
