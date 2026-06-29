# MEE-CORE-QUALITY-FLAG-TAXONOMY-V1

Next step:

1. Build a quality scoring read model that emits one row per candidate evidence item.
2. Treat `low_match_confidence` and `lane_mismatch_raw_vs_slab` separately.
3. Exclude hard flags from rollup eligibility.
4. Keep `foreign_language` as manual policy until language/region handling exists.
5. Recompute card-level threshold scores from quality-scored evidence.
