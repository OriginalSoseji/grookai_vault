-- Validate public.vault_add_item without persisting changes
begin;
select public.vault_add_item(
  ''00000000-0000-0000-0000-000000000000''::uuid,
  ''00000000-0000-0000-0000-000000000000''::uuid,
  ''NM''
) as new_id;
rollback;