# Integration Plan — Wall Feed + Search Alignment

Goal: Align contracts across DB, Edge, and Flutter for Wall feed naming and search image field, without breaking callers.

## Scope

- SQL migrations
  - Add compatibility alias views `public.v_wall_feed` and `public.wall_feed_v` pointing to `public.wall_feed_view`.
  - Recreate `public.v_card_search` to include `image_best` and a simple `number` alias, plus optional `rarity` (best-effort).
- Flutter
  - Confirm Wall uses `public.wall_feed_view` (already aligned).
  - Keep Search selects requesting `image_best`; DB now fulfills alias.
- Edge
  - `wall_feed` already queries `public.wall_feed_view`.

## Migrations Added

- `supabase/migrations/20251105120500_wall_feed_compat_views.sql`
  - Creates legacy-compatible `v_wall_feed` and `wall_feed_v` as passthrough to `wall_feed_view`.
  - Grants SELECT to `anon` and `authenticated`.

- `supabase/migrations/20251105121200_search_view_image_best.sql`
  - Drops/recreates `v_card_search` to add `image_best`, `number` (alias), `rarity` (nullable), and preserve price join when `latest_card_prices_v` exists.
  - Grants SELECT to `anon` and `authenticated`.

## Test Checklist

1) Migrate
   - `supabase migration up` (or use repo scripts) and ensure both migrations apply cleanly.
2) Search
   - `select id, set_code, number, name, rarity, image_best from public.v_card_search limit 5;` returns rows without column errors.
3) Wall Feed
   - `select * from public.wall_feed_view limit 5;` works.
   - Legacy aliases: `select * from public.v_wall_feed limit 1;` and `select * from public.wall_feed_v limit 1;` also work.
4) Flutter on device
   - Search list loads (no missing column errors).
   - Wall grid loads and paginates.

## Rollout Notes

- Keep the alias views for at least one release to avoid breaking older clients.
- After clients are confirmed on `public.wall_feed_view`, remove the aliases in a cleanup migration.

## References

- Wall views: `supabase/migrations/20251104102500_wall_views.sql`
- Edge function: `supabase/functions/wall_feed/index.ts`
- Flutter Wall: `lib/features/wall/wall_feed_page.dart`
- Flutter Search controller: `lib/features/search/search_controller.dart`

