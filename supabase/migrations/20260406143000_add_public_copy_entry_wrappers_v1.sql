begin;

create or replace function public.public_discoverable_card_copies_v1(
  p_owner_user_ids uuid[],
  p_card_print_ids uuid[] default null
) returns table (
  owner_user_id uuid,
  card_print_id uuid,
  instance_id uuid,
  gv_vi_id text,
  legacy_vault_item_id uuid,
  intent text,
  condition_label text,
  is_graded boolean,
  grade_company text,
  grade_value text,
  grade_label text,
  cert_number text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  with requested_owners as (
    select distinct unnest(coalesce(p_owner_user_ids, array[]::uuid[])) as user_id
  ),
  requested_cards as (
    select distinct unnest(coalesce(p_card_print_ids, array[]::uuid[])) as card_print_id
  ),
  public_owners as (
    select ro.user_id
    from requested_owners ro
    join public.public_profiles pp
      on pp.user_id = ro.user_id
    where coalesce(pp.public_profile_enabled, false) = true
      and coalesce(pp.vault_sharing_enabled, false) = true
  )
  select
    vii.user_id as owner_user_id,
    coalesce(vii.card_print_id, sc.card_print_id) as card_print_id,
    vii.id as instance_id,
    nullif(btrim(vii.gv_vi_id), '') as gv_vi_id,
    vii.legacy_vault_item_id,
    coalesce(nullif(lower(btrim(vii.intent)), ''), 'hold') as intent,
    nullif(btrim(vii.condition_label), '') as condition_label,
    (vii.slab_cert_id is not null) as is_graded,
    coalesce(
      nullif(btrim(sc.grader), ''),
      nullif(btrim(vii.grade_company), '')
    ) as grade_company,
    coalesce(
      nullif(btrim(sc.grade::text), ''),
      nullif(btrim(vii.grade_value), '')
    ) as grade_value,
    nullif(btrim(vii.grade_label), '') as grade_label,
    nullif(btrim(sc.cert_number), '') as cert_number,
    vii.created_at
  from public.vault_item_instances vii
  left join public.slab_certs sc
    on sc.id = vii.slab_cert_id
  join public_owners po
    on po.user_id = vii.user_id
  where vii.archived_at is null
    and vii.legacy_vault_item_id is not null
    and coalesce(vii.card_print_id, sc.card_print_id) is not null
    and coalesce(nullif(lower(btrim(vii.intent)), ''), 'hold')
      in ('trade', 'sell', 'showcase')
    and (
      cardinality(coalesce(p_card_print_ids, array[]::uuid[])) = 0
      or coalesce(vii.card_print_id, sc.card_print_id)
        in (select rc.card_print_id from requested_cards rc)
    )
  order by vii.created_at desc, vii.id desc;
$$;

create or replace function public.public_shared_card_primary_gvvi_v1(
  p_owner_user_id uuid,
  p_card_print_ids uuid[]
) returns table (
  card_print_id uuid,
  gv_vi_id text
)
language sql
security definer
set search_path = public
as $$
  with requested_cards as (
    select distinct unnest(coalesce(p_card_print_ids, array[]::uuid[])) as card_print_id
  ),
  public_owner as (
    select pp.user_id
    from public.public_profiles pp
    where pp.user_id = p_owner_user_id
      and coalesce(pp.public_profile_enabled, false) = true
      and coalesce(pp.vault_sharing_enabled, false) = true
  ),
  ranked as (
    select distinct on (coalesce(vii.card_print_id, sc.card_print_id))
      coalesce(vii.card_print_id, sc.card_print_id) as card_print_id,
      nullif(btrim(vii.gv_vi_id), '') as gv_vi_id,
      vii.created_at,
      vii.id
    from public.vault_item_instances vii
    left join public.slab_certs sc
      on sc.id = vii.slab_cert_id
    join public_owner po
      on po.user_id = vii.user_id
    join public.shared_cards sh
      on sh.user_id = vii.user_id
     and sh.card_id = coalesce(vii.card_print_id, sc.card_print_id)
     and sh.is_shared = true
    where vii.archived_at is null
      and nullif(btrim(vii.gv_vi_id), '') is not null
      and coalesce(vii.card_print_id, sc.card_print_id)
        in (select rc.card_print_id from requested_cards rc)
    order by
      coalesce(vii.card_print_id, sc.card_print_id),
      vii.created_at desc,
      vii.id desc
  )
  select
    ranked.card_print_id,
    ranked.gv_vi_id
  from ranked;
$$;

revoke all on function public.public_discoverable_card_copies_v1(uuid[], uuid[])
from public;

grant execute on function public.public_discoverable_card_copies_v1(uuid[], uuid[])
to authenticated, anon, service_role;

revoke all on function public.public_shared_card_primary_gvvi_v1(uuid, uuid[])
from public;

grant execute on function public.public_shared_card_primary_gvvi_v1(uuid, uuid[])
to authenticated, anon, service_role;

commit;
