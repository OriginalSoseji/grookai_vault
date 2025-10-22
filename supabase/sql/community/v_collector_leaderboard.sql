-- Prototype leaderboard: unique prints added in last 30 days
-- Requires vault_items or scan_events; prefer vault_items for definitive adds
create or replace view public.v_collector_leaderboard as
select vi.user_id,
       count(distinct vi.card_id) as unique_prints,
       min(vi.created_at) as first_add,
       max(vi.created_at) as last_add
from public.vault_items vi
where vi.created_at >= now() - interval '30 days'
group by vi.user_id
order by unique_prints desc;

