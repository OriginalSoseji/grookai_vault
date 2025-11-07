-- Grants for pricing_health_v (created by Codex on 2025-11-03)
-- NOTE: View must exist prior to this grant. If not yet created,
-- re-run this migration after the view is present.

grant usage on schema public to anon, authenticated;
grant select on public.pricing_health_v to anon, authenticated;

