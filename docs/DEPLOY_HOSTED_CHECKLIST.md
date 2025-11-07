# Hosted/Prod Deployment Checklist

Pre-push
- Snapshot/backup remote DB (per your org practice).
- supabase migration list

Push
- supabase db push

Materialized View Refresh (one-time after first deploy)
- psql "postgres://..." -c "REFRESH MATERIALIZED VIEW public.wall_thumbs_3x4;" OR call RPC if configured.

Edge Functions
- No rename needed for wall_feed; redeploy if desired:
  - supabase functions deploy wall_feed

REST Smokes (counts only)
- listings: GET /rest/v1/listings?select=id&limit=1 (Prefer: count=exact)
- wall_feed_view: GET /rest/v1/wall_feed_view?select=listing_id&limit=1

App Flow Sanity
- Add to vault: insert with qty, condition_label, grade_label → succeeds.
- Unified search: v_card_search returns image_best column.

Rollback Notes
- supabase migration repair --status reverted <version>
- Restore DB snapshot
- For Edge, redeploy previous function revision if needed
