-- Remove legacy overload and align function signature with remote schema (card_id uuid)

drop function if exists public.vault_add_item(uuid, text, text, text);

create or replace function public.vault_add_item(
  p_user_id uuid,
  p_card_id uuid,
  p_condition_label text
)
returns uuid
language plpgsql
security definer
as $$
declare v_id uuid;
begin
  insert into public.vault_items(user_id, card_id, condition_label)
  values (p_user_id, p_card_id, p_condition_label)
  returning id into v_id;
  return v_id;
end $$;

grant execute on function public.vault_add_item(uuid,uuid,text) to authenticated;

