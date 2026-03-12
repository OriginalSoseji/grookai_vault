BEGIN;

CREATE OR REPLACE FUNCTION public.vault_inc_qty(item_id uuid, inc integer)
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
declare
  v_uid uuid;
  v_qty integer;
begin
  v_uid := auth.uid();

  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if inc = 0 then
    return;
  end if;

  select qty
    into v_qty
  from public.vault_items
  where id = item_id
    and user_id = v_uid
  for update;

  if not found then
    raise exception 'vault_item_not_found_or_not_owned' using errcode = 'P0001';
  end if;

  if v_qty + inc <= 0 then
    delete from public.vault_items
    where id = item_id
      and user_id = v_uid;

    return;
  end if;

  update public.vault_items
  set qty = v_qty + inc
  where id = item_id
    and user_id = v_uid;
end;
$function$;

COMMIT;
