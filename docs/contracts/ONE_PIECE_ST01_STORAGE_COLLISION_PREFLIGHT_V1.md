# One Piece ST-01 Storage Collision Preflight V1

## Scope

Read-only Supabase Storage collision proof for exactly the 18 card/DON image
paths produced by the passing ST-01 language and image readiness gate.

The three sealed rows are excluded because the sealed domain has no governed
image-pointer contract.

## Frozen Target

- Supabase project: `ycdxbpibncqcchqiihfz`
- Storage bucket: `user-card-images`
- Assets: `18`
- Source readiness fingerprint:
  `e98d7e21fd828765165f6fde5a897c24104e8d9dabaeebe3808950a886190468`
- Source rows SHA-256:
  `6fd5b77b764bf1a8400bc02f271781499321759b6a45d108e5f18571c7555c89`

## Required Behavior

- Verify every local cached byte payload against its frozen size and SHA-256.
- Write `run_plan.json` before the first Storage request.
- Use only exact-folder Storage `list` calls and exact filename comparison.
- Treat any existing target as a collision and stop before upload planning.
- Preserve content-addressed paths and `upsert: false` / no-overwrite policy.

## Forbidden Behavior

- No Storage upload, download, remove, copy, or move.
- No database connection or write.
- No image-pointer, canonical, sealed, pricing, Vault, or publication mutation.
- No sealed asset or invented sealed path.

## Next Gate

If all 18 targets are absent, freeze a separately guarded permanent upload
writer that rechecks collisions, uploads with `upsert: false`, reads every new
object back, verifies exact hashes/sizes/dimensions, and leaves database and
pointer state unchanged.
