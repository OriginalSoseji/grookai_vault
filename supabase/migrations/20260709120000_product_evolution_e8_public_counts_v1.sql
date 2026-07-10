begin;

create or replace function public.card_journey_public_counts_v1(
  p_card_print_id uuid
)
returns table (
  card_print_id uuid,
  public_owner_count integer,
  public_trade_count integer,
  public_sale_count integer,
  public_want_count integer,
  has_public_activity boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with public_copies as (
    select
      vii.user_id,
      nullif(btrim(vii.intent), '') as intent
    from public.vault_item_instances vii
    left join public.slab_certs slab
      on slab.id = vii.slab_cert_id
    join public.card_prints cp
      on cp.id = coalesce(vii.card_print_id, slab.card_print_id)
    where p_card_print_id is not null
      and cp.id = p_card_print_id
      and vii.archived_at is null
      and public.interest_graph_collector_public_v1(vii.user_id) is true
  ),
  public_wants as (
    select
      wi.user_id
    from public.wishlist_items wi
    join public.public_profiles pp
      on pp.user_id = wi.user_id
     and pp.public_profile_enabled is true
    where p_card_print_id is not null
      and wi.card_id = p_card_print_id
  ),
  counts as (
    select
      count(distinct c.user_id)::integer as owner_total,
      count(distinct c.user_id) filter (where c.intent = 'trade')::integer as trade_total,
      count(distinct c.user_id) filter (where c.intent = 'sell')::integer as sale_total,
      (select count(distinct w.user_id)::integer from public_wants w) as want_total
    from public_copies c
  )
  select
    p_card_print_id as card_print_id,
    coalesce(counts.owner_total, 0)::integer as public_owner_count,
    coalesce(counts.trade_total, 0)::integer as public_trade_count,
    coalesce(counts.sale_total, 0)::integer as public_sale_count,
    coalesce(counts.want_total, 0)::integer as public_want_count,
    (
      coalesce(counts.owner_total, 0) > 0
      or coalesce(counts.trade_total, 0) > 0
      or coalesce(counts.sale_total, 0) > 0
      or coalesce(counts.want_total, 0) > 0
    ) as has_public_activity
  from counts
  where p_card_print_id is not null;
$$;

comment on function public.card_journey_public_counts_v1(uuid) is
'E8 public card Journey counts RPC. Anon-safe aggregate counts only: public owners, trade/sale intents, and aggregate public-profile wants for an exact card_print_id. Returns no collector names, ids, slugs, locations, copy ids, or event payloads.';

revoke all on function public.card_journey_public_counts_v1(uuid) from public, anon, authenticated;
grant execute on function public.card_journey_public_counts_v1(uuid) to anon, authenticated, service_role;

commit;
