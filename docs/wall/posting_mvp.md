# Public Wall Posting MVP

Implements listing create → photo upload → thumbnail → feed with RLS and Storage.

## Flow

1. Insert row into `public.listings` with `owner_id`.
2. Upload photo to Storage bucket `listing-photos/<uid>/<listingId>.jpg`.
3. Edge Function `thumb_maker` writes a public thumbnail `listing-photos/public/thumbs/<listingId>.jpg`.
4. Upsert `listing_photos` with `storage_path` and `thumb_url`.
5. Feed reads from `public.wall_feed_v` or RPC `public.wall_feed_list`.

## Security & RLS

- RLS enabled on `listings`, `listing_photos`.
- Owner can select/insert/update/delete. No public select on base tables.
- Public reads via `wall_feed_v` / RPC, granted to `anon`.

## Buckets & Policies

- Bucket `listing-photos` is public for objects under `public/` folder. Other paths by default require auth.
- `scripts/storage/ensure_buckets.ps1` ensures the bucket exists (idempotent) and writes diagnostics.

## Rollback

- Drop `listing_photos`, `listings`, view and RPC if needed.
- Revoke grants from `wall_feed_v` and `wall_feed_list`.

## Notes

- Edge function currently copies the original to public thumbs as a placeholder when resize libs are unavailable in the Edge runtime.

## Thumbnails 3:4 (720×960)

- Why 3:4: matches card photos (portrait) while keeping decode budget bounded. 720×960 is a good balance for modern phones (devicePixelRatio aware with cacheWidth).
- Storage layout: `listing-photos/public/thumbs/<listingId>_720x960.jpg` (publicly readable via Storage policies).
- DB: `wall_feed_v` prefers `thumb_url_720x960` when present and exposes `image_w=720`, `image_h=960`.
- Edge: `supabase/functions/thumb_maker` accepts `{ listingId, storagePath }` and (temporarily) copies the original to the public thumbs path; sets dims 720×960. TODO: swap in actual resize/center-crop when an image lib is available in the Edge runtime.
- Flutter: Render with `AspectRatio(3/4)` + `Image.network(..., fit: BoxFit.cover, cacheWidth: 720)`; consider prefetch and zoom-to-fullres flows later.
