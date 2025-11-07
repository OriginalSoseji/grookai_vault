Summary

- Local DB was down, so checks are based on SQL sources only. No destructive edits performed.

Ordering & Dependencies

- Ensure base tables before dependent views/RPCs.
- Create views with `CREATE OR REPLACE VIEW` to keep idempotency during re-runs.
- For materialized views, prefer `CREATE MATERIALIZED VIEW IF NOT EXISTS` and use `REFRESH MATERIALIZED VIEW CONCURRENTLY` where applicable.

Hotspots to Review

- Wall feed: definitions for `public.wall_feed_view` and `public.wall_thumbs_3x4` must exist prior to grants; confirm they’re in earlier migrations than grants.
- RPC `public.search_cards`: must depend only on objects already created; pin `search_path`.
- Encoding: verify migrations are UTF-8 without BOM; avoid smart quotes.

Actions

- Run `supabase db lint` (already attempted; will re-run once local stack is up).
- Re-run `supabase db reset --local --no-seed --yes` and verify all migrations apply cleanly.
- If hosted drift: `supabase migration list` then `repair` as needed; avoid staging changes until local passes.

