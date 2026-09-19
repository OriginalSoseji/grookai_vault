\set ON_ERROR_STOP on
begin;
set local statement_timeout='30s';

-- Combined PR #473/storefront boundary. Synthetic fixtures always roll back.
do $test$
declare
  owner_id uuid := gen_random_uuid();
  set_id uuid := gen_random_uuid();
  parent_id uuid := gen_random_uuid();
  child_id uuid := gen_random_uuid();
  unassigned_id uuid;
  assigned_id uuid;
  store_slug text := 'combined-' || owner_id::text;
  result jsonb;
  projection jsonb;
begin
  insert into auth.users(id,aud,role) values(owner_id,'authenticated','authenticated');
  insert into public.public_profiles(user_id,slug,display_name,public_profile_enabled,vault_sharing_enabled)
    values(owner_id,store_slug,'Combined proof',true,true);
  insert into public.user_entitlements(user_id,tier,role,features)
    values(owner_id,'vendor','vendor','{"store_app":true,"store_web":true}');
  update public.vendor_store_rollout set app_enabled=true,web_enabled=true;
  insert into public.sets(id,game,code,name)
    values(set_id,'pokemon','combined-local-proof','Combined local proof');
  insert into public.card_prints(id,game_id,set_id,name,number,gv_id)
    values(parent_id,(select id from public.games where code='pokemon'),set_id,
      'Combined local parent','1','GV-PK-COMBINED-001');
  perform set_config('request.jwt.claim.role','service_role',true);
  result := public.vault_add_card_instance_service_v1(
    p_actor_user_id=>owner_id,p_card_print_id=>parent_id,p_quantity=>1);
  select id into strict unassigned_id from public.vault_item_instances
    where gv_vi_id=result->>'gv_vi_id';
  update public.vault_item_instances set intent='sell',pricing_mode='asking',
    asking_price_amount=25,asking_price_currency='USD' where id=unassigned_id;
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  perform set_config('request.jwt.claim.role','authenticated',true);
  perform public.vendor_store_save_v1(store_slug,'Combined local store');
  if public.vendor_store_copy_reason_v1(owner_id,unassigned_id) is distinct from 'Printing unassigned' then
    raise exception 'Unassigned ownership lacks the expected management reason';
  end if;
  begin
    perform public.vendor_store_select_item_v1(unassigned_id,true);
    raise exception 'Unassigned selection unexpectedly succeeded';
  exception when invalid_parameter_value then
    if sqlerrm <> 'Printing unassigned' then raise; end if;
  end;
  projection := public.vendor_store_read_v2(store_slug,'manage',p_kind=>'catalog');
  if jsonb_array_length(projection->'items') is distinct from 1
    or projection->'items'->0->>'ineligible_reason' is distinct from 'Printing unassigned' then
    raise exception 'Owner cannot inspect the unassigned copy';
  end if;
  begin
    perform public.vendor_store_publish_v1('app',true);
    raise exception 'Unassigned-only store unexpectedly published';
  exception when invalid_parameter_value then
    if sqlerrm <> 'Select eligible sale inventory before publishing' then raise; end if;
  end;
  if public.vendor_store_read_v2(store_slug,'web',p_kind=>'catalog') is not null
    or (public.vendor_store_read_v2(store_slug,'preview',p_kind=>'catalog')->>'total')::int is distinct from 0 then
    raise exception 'Unassigned copy leaked into public store or preview';
  end if;
  insert into public.card_printings(id,card_print_id,finish_key,printing_gv_id)
    values(child_id,parent_id,'normal','GV-PK-COMBINED-001-NORMAL');
  if exists(select 1 from public.vault_item_instances where id=unassigned_id
    and (card_printing_id is not null or market_price is not null)) then
    raise exception 'New printing implicitly assigned/value-enriched existing ownership';
  end if;
  perform set_config('request.jwt.claim.role','service_role',true);
  result := public.vault_add_card_instance_service_v1(
    p_actor_user_id=>owner_id,p_card_print_id=>parent_id,
    p_card_printing_id=>child_id,p_quantity=>1);
  select id into strict assigned_id from public.vault_item_instances
    where gv_vi_id=result->>'gv_vi_id';
  update public.vault_item_instances set intent='sell',pricing_mode='asking',
    asking_price_amount=30,asking_price_currency='USD' where id=assigned_id;
  perform set_config('request.jwt.claim.role','authenticated',true);
  if (public.vendor_store_read_v2(store_slug,'preview',p_kind=>'catalog')->>'total')::int is distinct from 0 then
    raise exception 'Exact add or ordinary price change implicitly selected a copy';
  end if;
  perform public.vendor_store_select_item_v1(assigned_id,true);
  perform public.vendor_store_publish_v1('app',true);
  perform public.vendor_store_publish_v1('web',true);
  projection := public.vendor_store_read_v2(store_slug,'web',p_kind=>'catalog');
  if (projection->>'total')::int is distinct from 1
    or projection->'items'->0->>'id' is distinct from assigned_id::text
    or projection->'items'->0->>'card_printing_id' is distinct from child_id::text then
    raise exception 'Explicit eligible selection lost exact-copy/printing identity';
  end if;
  if projection->'items' is distinct from
    public.vendor_store_read_v2(store_slug,'app',p_kind=>'catalog')->'items' then
    raise exception 'Combined app/web projection mismatch';
  end if;
  if (select count(*) from public.vault_item_instances where user_id=owner_id) <> 2 then
    raise exception 'Store operations changed ownership';
  end if;
  raise notice 'PASS: unassigned add remains inspectable but unpublishable; exact add requires explicit selection; app/web identities agree';
end $test$;
rollback;
