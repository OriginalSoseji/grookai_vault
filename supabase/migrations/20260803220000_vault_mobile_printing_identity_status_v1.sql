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
  gv_vi_id text,
  printing_identity_status text,
  assigned_printing_count integer,
  unassigned_printing_count integer,
  distinct_printing_count integer,
  card_printing_id uuid,
  printing_gv_id text,
  finish_key text,
  finish_label text
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
      vii.card_printing_id,
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
      count(ai.card_printing_id)::integer as assigned_printing_count,
      count(*) filter (where ai.card_printing_id is null)::integer
        as unassigned_printing_count,
      count(distinct ai.card_printing_id)::integer as distinct_printing_count,
      case
        when count(ai.card_printing_id) = count(*)
          and count(distinct ai.card_printing_id) = 1
        then min(ai.card_printing_id::text)::uuid
        else null
      end as exact_card_printing_id,
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
    case when g.owned_count = 1 then li.gv_vi_id else null end as gv_vi_id,
    case
      when g.assigned_printing_count = 0 then 'unassigned'
      when g.unassigned_printing_count > 0 then 'partially_unassigned'
      when g.distinct_printing_count = 1 then 'exact'
      else 'mixed'
    end as printing_identity_status,
    g.assigned_printing_count,
    g.unassigned_printing_count,
    g.distinct_printing_count,
    g.exact_card_printing_id as card_printing_id,
    case
      when g.exact_card_printing_id is not null
      then nullif(btrim(cpn.printing_gv_id), '')
      else null
    end as printing_gv_id,
    case
      when g.exact_card_printing_id is not null
      then nullif(btrim(cpn.finish_key), '')
      else null
    end as finish_key,
    case
      when g.exact_card_printing_id is not null
      then nullif(btrim(fk.label), '')
      else null
    end as finish_label
  from grouped g
  join latest_instance li on li.card_print_id = g.card_print_id
  left join compatibility_bucket cb on cb.card_id = g.card_print_id
  left join public.card_prints cp on cp.id = g.card_print_id
  left join public.sets s on s.id = cp.set_id
  left join public.card_printings cpn
    on cpn.id = g.exact_card_printing_id
   and cpn.card_print_id = g.card_print_id
  left join public.finish_keys fk on fk.key = cpn.finish_key
  where coalesce(cb.id, li.legacy_vault_item_id) is not null
  order by
    coalesce(g.created_at, cb.created_at) desc nulls last,
    coalesce(nullif(btrim(cp.name), ''), nullif(btrim(cb.name), ''), '') asc;
end;
$$;

comment on function public.vault_mobile_collector_rows_v1() is
  'Owner-scoped parent collector rows with explicit exact, mixed, partial, or unassigned printing identity status.';

revoke all on function public.vault_mobile_collector_rows_v1()
from public, anon;

grant execute on function public.vault_mobile_collector_rows_v1()
to authenticated, service_role;

commit;
