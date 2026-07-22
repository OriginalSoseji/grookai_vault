begin;

drop function if exists public.vault_mobile_collector_rows_v1();

create or replace function public.vault_mobile_collector_rows_v1()
returns table (
  id uuid,
  vault_item_id uuid,
  card_id uuid,
  gv_id text,
  condition_label text,
  created_at timestamptz,
  name text,
  set_name text,
  set_code text,
  number text,
  photo_url text,
  image_url text,
  image_alt_url text,
  image_path text,
  image_source text,
  representative_image_url text,
  variant_key text,
  printed_identity_modifier text,
  set_identity_model text,
  owned_count integer,
  gv_vi_id text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  return query
  with active_instances as (
    select
      vii.id,
      vii.card_print_id,
      vii.gv_vi_id,
      vii.created_at,
      vii.legacy_vault_item_id,
      vii.condition_label,
      case
        when vii.image_display_mode = 'uploaded'
        then nullif(btrim(coalesce(vii.photo_url, vii.image_url)), '')
        else null
      end as photo_url
    from public.vault_item_instances vii
    where vii.user_id = v_uid
      and vii.archived_at is null
      and vii.card_print_id is not null
  ),
  latest_instance as (
    select distinct on (ai.card_print_id)
      ai.card_print_id,
      ai.gv_vi_id,
      ai.created_at,
      ai.legacy_vault_item_id,
      ai.condition_label,
      ai.photo_url
    from active_instances ai
    order by ai.card_print_id, ai.created_at desc, ai.id desc
  ),
  grouped as (
    select
      ai.card_print_id,
      count(*)::integer as owned_count,
      max(ai.created_at) as created_at
    from active_instances ai
    group by ai.card_print_id
  ),
  compatibility_bucket as (
    select distinct on (vi.card_id)
      vi.card_id,
      vi.id,
      vi.gv_id,
      vi.condition_label,
      vi.name,
      vi.set_name,
      vi.created_at
    from public.vault_items vi
    where vi.user_id = v_uid
      and vi.archived_at is null
    order by vi.card_id, vi.created_at desc, vi.id desc
  )
  select
    coalesce(cb.id, li.legacy_vault_item_id) as id,
    coalesce(cb.id, li.legacy_vault_item_id) as vault_item_id,
    g.card_print_id as card_id,
    coalesce(nullif(btrim(cp.gv_id), ''), nullif(btrim(cb.gv_id), ''), '') as gv_id,
    coalesce(
      nullif(btrim(cb.condition_label), ''),
      nullif(btrim(li.condition_label), ''),
      'Unknown'
    ) as condition_label,
    coalesce(g.created_at, cb.created_at) as created_at,
    coalesce(
      nullif(btrim(cp.name), ''),
      nullif(btrim(cb.name), ''),
      'Unknown card'
    ) as name,
    coalesce(
      nullif(btrim(s.name), ''),
      nullif(btrim(cb.set_name), ''),
      nullif(btrim(cp.set_code), ''),
      'Unknown set'
    ) as set_name,
    nullif(btrim(cp.set_code), '') as set_code,
    coalesce(nullif(btrim(cp.number), ''), '—') as number,
    li.photo_url as photo_url,
    nullif(btrim(cp.image_url), '') as image_url,
    nullif(btrim(cp.image_alt_url), '') as image_alt_url,
    nullif(btrim(cp.image_path), '') as image_path,
    nullif(btrim(cp.image_source), '') as image_source,
    nullif(btrim(cp.representative_image_url), '') as representative_image_url,
    nullif(btrim(cp.variant_key), '') as variant_key,
    nullif(btrim(cp.printed_identity_modifier), '') as printed_identity_modifier,
    coalesce(
      nullif(btrim(cp.set_identity_model), ''),
      nullif(btrim(s.identity_model), '')
    ) as set_identity_model,
    g.owned_count,
    case
      when g.owned_count = 1 then li.gv_vi_id
      else null
    end as gv_vi_id
  from grouped g
  join latest_instance li
    on li.card_print_id = g.card_print_id
  left join compatibility_bucket cb
    on cb.card_id = g.card_print_id
  left join public.card_prints cp
    on cp.id = g.card_print_id
  left join public.sets s
    on s.id = cp.set_id
  where coalesce(cb.id, li.legacy_vault_item_id) is not null
  order by
    coalesce(g.created_at, cb.created_at) desc nulls last,
    coalesce(nullif(btrim(cp.name), ''), nullif(btrim(cb.name), ''), '') asc;
end;
$$;

revoke all on function public.vault_mobile_collector_rows_v1()
from public, anon;

grant execute on function public.vault_mobile_collector_rows_v1()
to authenticated, service_role;

commit;
