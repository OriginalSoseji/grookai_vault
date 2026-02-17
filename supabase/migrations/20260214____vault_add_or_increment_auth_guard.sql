-- Harden vault_add_or_increment: fail fast when auth.uid() is null.
-- Signature and return type are preserved.

create or replace function public.vault_add_or_increment(
  p_card_id uuid,
  p_delta_qty integer,
  p_condition_label text default 'NM'::text,
  p_notes text default null::text
) returns setof public.vault_items
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_uid uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  return query
  insert into public.vault_items (user_id, card_id, qty, condition_label, notes)
  values (v_uid, p_card_id, greatest(1, p_delta_qty), p_condition_label, nullif(p_notes, ''))
  on conflict (user_id, card_id)
  do update set
    qty = public.vault_items.qty + greatest(1, p_delta_qty),
    condition_label = coalesce(excluded.condition_label, public.vault_items.condition_label),
    notes = coalesce(nullif(excluded.notes, ''), public.vault_items.notes)
  returning *;
end;
$$;

-- Manual verification SQL:
-- 1) Confirm auth context (should be non-null in app context)
--    select auth.uid();
--
-- 2) Call function (equivalent of RPC payload)
--    select id, user_id, card_id, qty
--    from public.vault_add_or_increment(
--      '<CARD_PRINT_UUID>'::uuid,
--      1,
--      'NM',
--      null
--    );
--
-- 3) Verify persisted row for authenticated user
--    select id, user_id, card_id, qty, condition_label
--    from public.vault_items
--    where user_id = auth.uid()
--      and card_id = '<CARD_PRINT_UUID>'::uuid;
