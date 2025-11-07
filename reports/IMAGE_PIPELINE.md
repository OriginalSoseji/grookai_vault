Thumbnail Spec (3:4)

- Dimensions: 720x960 (or 540x720 for low-bandwidth)
- Format: JPEG, quality 70–80
- EXIF: Strip metadata on upload
- Naming: `<id>_3x4.jpg`; store under `public/thumbnails/`

Upload → Resize Path

- Client uploads full image to storage bucket `wall` (private); edge function resizes to 3:4 and stores public thumbnail.
- Optionally use Supabase Storage with signed URLs for originals; thumbnails public.

Client Consumption

- Feed uses only thumbnails (`Image.network(..., cacheWidth: 720, cacheHeight: 960)`), with placeholder and errorBuilder.
- Detail view may prefetch original on demand.
- Avoid decoding full-size images in lists.

Refresh Strategy

- For regenerated thumbs, version URLs via query param (`?v=<ts>`) to bust caches.
- If materialized view `wall_thumbs_3x4` drives feed, refresh via `public.refresh_wall_thumbs_3x4()` post listing changes.

