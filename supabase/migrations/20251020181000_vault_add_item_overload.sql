-- Provide an overload of vault_add_item that matches legacy client usage
-- signature hinted by PostgREST error: (p_card_id, p_condition_label, p_user_id)

create or replace function public.vault_add_item(
  p_card_id text,
  p_condition_label text,
  p_user_id uuid
)
returns uuid
language plpgsql
security definer
as $$
declare v_id uuid;
begin
  insert into public.vault_items(user_id, card_id, condition_label, qty)
  values (p_user_id, p_card_id, nullif(p_condition_label, 'NM'), 1)
  returning id into v_id;
  return v_id;
end $$;

grant execute on function public.vault_add_item(text, text, uuid) to authenticated;

