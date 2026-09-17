\set ON_ERROR_STOP on
begin;
set local statement_timeout='30s';

-- Synthetic local-only ownership proof; the entire fixture rolls back.
do $test$
declare
  owner_id uuid := gen_random_uuid();
  set_id uuid := gen_random_uuid();
  parent_id uuid := gen_random_uuid();
  child_id uuid := gen_random_uuid();
  result jsonb;
  copy public.vault_item_instances%rowtype;
begin
  insert into auth.users(id, aud, role) values(owner_id, 'authenticated', 'authenticated');
  insert into public.sets(id, game, code, name)
    values(set_id, 'pokemon', 'local-vault-unassigned-test', 'Local ownership test');
  insert into public.card_prints(id, game_id, set_id, name, number, gv_id)
    values(parent_id, (select id from public.games where code='pokemon'),
      set_id, 'Local parent with no printing', '1', 'GV-PK-LOCAL-VAULT-001');
  perform set_config('request.jwt.claim.role', 'service_role', true);
  result := public.vault_add_card_instance_service_v1(
    p_actor_user_id => owner_id, p_card_print_id => parent_id, p_quantity => 1);
  select * into strict copy from public.vault_item_instances
    where gv_vi_id=result->>'gv_vi_id';
  if copy.user_id <> owner_id or copy.card_print_id <> parent_id
    or copy.card_printing_id is not null or copy.market_price is not null
    or (result->>'created_count')::int <> 1 then
    raise exception 'Unassigned copy identity/value mismatch';
  end if;
  if exists(select 1 from public.card_printings where card_print_id=parent_id) then
    raise exception 'Ownership created canonical printing';
  end if;
  if not exists(select 1 from public.vault_items where id=copy.legacy_vault_item_id
    and user_id=owner_id and archived_at is null) then
    raise exception 'Ownership anchor missing';
  end if;

  insert into public.card_printings(id,card_print_id,finish_key,printing_gv_id)
    values(child_id,parent_id,'normal','GV-PK-LOCAL-VAULT-001-NORMAL');
  perform set_config('request.jwt.claim.role', 'service_role', true);
  result := public.vault_add_card_instance_service_v1(
    p_actor_user_id => owner_id, p_card_print_id => parent_id,
    p_card_printing_id => child_id, p_quantity => 1);
  if not exists(select 1 from public.vault_item_instances
    where gv_vi_id=result->>'gv_vi_id' and card_printing_id=child_id
      and user_id=owner_id and card_print_id=parent_id) then
    raise exception 'Existing exact-printing add regressed';
  end if;
  if (select count(*) from public.vault_item_instances where user_id=owner_id) <> 2 then
    raise exception 'Unexpected ownership count';
  end if;
  raise notice 'PASS: unassigned copy retained null printing and price; exact copy retained child identity';
end $test$;
rollback;
