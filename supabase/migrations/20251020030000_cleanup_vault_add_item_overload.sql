-- Remove incorrect overload using text for card_id
drop function if exists public.vault_add_item(uuid, text, text);

