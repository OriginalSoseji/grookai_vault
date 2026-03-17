begin;

create or replace function public.vault_owned_counts_v1(
  p_card_print_ids uuid[] default null
) returns table (
  card_print_id uuid,
  owned_count integer
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
  select
    vii.card_print_id,
    count(*)::integer as owned_count
  from public.vault_item_instances vii
  where vii.user_id = v_uid
    and vii.archived_at is null
    and vii.card_print_id is not null
    and (
      p_card_print_ids is null
      or coalesce(array_length(p_card_print_ids, 1), 0) = 0
      or vii.card_print_id = any (p_card_print_ids)
    )
  group by vii.card_print_id
  order by vii.card_print_id;
end;
$$;

revoke all on function public.vault_owned_counts_v1(uuid[])
from public, anon;

grant execute on function public.vault_owned_counts_v1(uuid[])
to authenticated, service_role;

commit;
