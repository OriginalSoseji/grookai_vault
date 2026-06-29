# MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1

Next implementation step:

1. Generate one safe internal batch package for the `933` policy-safe rows.
2. Do not include the `270` raw/slab candidate rows in that batch.
3. Keep all action events and dispositions non-public.
4. After apply, run the fast post-ingest review readback.
5. Later, define a separate threshold/reviewer workflow for raw/slab candidate confirmation.
