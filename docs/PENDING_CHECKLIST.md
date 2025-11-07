# P1 — Must do next (unblock features)
- No P1 blockers detected.

# P2 — Stability & policies
- Add RLS policies for public.listings (owner write; public read for visibility='public' and status='active')
- Add a refresh strategy for wall_thumbs_3x4 (cron job or migration with REFRESH MATERIALIZED VIEW)
- Add lib/utils/search_normalizer.dart for client-side normalization as a fallback

# P3 — Nice to have / docs
- Add scripts/tools/gv_migrations_autofix.ps1 to automate local stub cleanup and repairs
- Add a docs/README.md linking MIGRATIONS_POLICY.md and MIGRATIONS_BASELINE.md
