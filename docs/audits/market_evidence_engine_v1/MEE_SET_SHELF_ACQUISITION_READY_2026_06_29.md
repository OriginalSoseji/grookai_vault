# MEE Set-Shelf Acquisition Readiness

Date: 2026-06-29

## Summary

The nightly eBay active-listing acquisition planner was changed from card-first only to set-shelf first, then exact card/variant targets.

Local readiness proof:

- Daily call ceiling: `4000`
- Max results per call: `200`
- Estimated nightly listing envelope: `800000`
- Set-shelf requests in first nightly batch: `2400`
- Exact variant/card requests in first nightly batch: `1600`

## Strategy Mix

```json
{
  "set_shelf_broad": 1305,
  "set_shelf_singles": 569,
  "set_shelf_slabs": 246,
  "set_shelf_sealed": 140,
  "set_shelf_language": 140,
  "variant_finish": 1600
}
```

## Boundary

- Set-shelf requests have no direct `card_print_id`.
- Set-shelf observations are warehouse evidence only.
- Direct card candidates and internal rollups still require exact card/variant assignment.
- Strict title gates still run before rollup medians.
- No public pricing, app-visible pricing, identity, vault, or image writes are introduced.

## Morning Run Check

The 2026-06-29 03:25 UTC droplet timer fired, but `listing_ingest` failed before provider calls or DB writes. The failure was a Supabase CLI JSON parsing assumption in the dry-run target loader.

Fix included here:

- parser now accepts both Supabase CLI object and array JSON output shapes
- no provider calls or partial DB writes occurred during the failed scheduled run
