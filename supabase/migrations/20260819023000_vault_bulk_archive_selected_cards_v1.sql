begin;

create or replace function public.vault_archive_selected_cards_v1(
  p_card_print_ids uuid[]
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid := auth.uid();
  v_requested_count integer := coalesce(cardinality(p_card_print_ids), 0);
  v_distinct_count integer := 0;
  v_card_print_id uuid;
  v_result jsonb;
  v_archived_instance_count integer := 0;
  v_results jsonb := '[]'::jsonb;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if v_requested_count < 1 then
    raise exception 'card_print_ids_required' using errcode = 'P0001';
  end if;

  if v_requested_count > 500 then
    raise exception 'card_print_ids_limit_exceeded' using errcode = '22023';
  end if;

  if exists (
    select 1
    from unnest(p_card_print_ids) as requested(card_print_id)
    where requested.card_print_id is null
  ) then
    raise exception 'card_print_ids_cannot_contain_null' using errcode = '22023';
  end if;

  select count(distinct requested.card_print_id)
  into v_distinct_count
  from unnest(p_card_print_ids) as requested(card_print_id);

  if v_distinct_count <> v_requested_count then
    raise exception 'card_print_ids_must_be_unique' using errcode = '22023';
  end if;

  -- Serialize bulk Vault mutation for one owner. Every per-card archive call
  -- remains inside this transaction, so any stale or unauthorized selection
  -- rolls back the entire batch.
  perform pg_advisory_xact_lock(
    hashtextextended('vault_archive_selected_cards_v1:' || v_uid::text, 0)
  );

  foreach v_card_print_id in array p_card_print_ids
  loop
    v_result := public.vault_archive_all_instances_v1(
      p_vault_item_id => null,
      p_card_print_id => v_card_print_id
    );
    v_archived_instance_count := v_archived_instance_count
      + coalesce((v_result ->> 'archived_count')::integer, 0);
    v_results := v_results || jsonb_build_array(v_result);
  end loop;

  return jsonb_build_object(
    'requested_card_count', v_requested_count,
    'archived_card_count', v_distinct_count,
    'archived_instance_count', v_archived_instance_count,
    'results', v_results
  );
end;
$$;

revoke all on function public.vault_archive_selected_cards_v1(uuid[])
from public, anon;

grant execute on function public.vault_archive_selected_cards_v1(uuid[])
to authenticated, service_role;

notify pgrst, 'reload schema';

commit;
