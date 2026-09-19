\set ON_ERROR_STOP on
begin;
set local statement_timeout='30s';
-- Exercises the two final function bodies moved by release consolidation.
do $test$
declare
  owner_id uuid:=gen_random_uuid(); other_id uuid:=gen_random_uuid();
  slug text:='release-'||owner_id::text;
  store_id uuid; product jsonb; stale_version bigint; photo text; projection jsonb;
begin
  insert into auth.users(id,aud,role) values(owner_id,'authenticated','authenticated'),(other_id,'authenticated','authenticated');
  insert into public.public_profiles(user_id,slug,display_name,public_profile_enabled,vault_sharing_enabled)
    values(owner_id,slug,'Release proof',true,true);
  insert into public.user_entitlements(user_id,tier,role,features)
    values(owner_id,'vendor','vendor','{"store_app":true,"store_web":true}');
  update public.vendor_store_rollout set app_enabled=true,web_enabled=true,custom_enabled=true;
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  perform set_config('request.jwt.claim.role','authenticated',true);
  store_id:=(public.vendor_store_save_v1(slug,'Release proof')->'store'->>'id')::uuid;
  product:=public.vendor_store_custom_mutate_v1(null,null,'save','{"title":"Synthetic collectible","description":"Synthetic release proof","asking_price_amount":12.50,"available_quantity":2,"private_sku":"PRIVATE-RELEASE-SKU"}')->'products'->0;
  photo:=store_id::text||'/products/'||(product->>'id')||'/'||gen_random_uuid()::text||'.png';
  insert into storage.objects(bucket_id,name) values('vendor-store-media',photo);
  product:=public.vendor_store_custom_mutate_v1((product->>'id')::uuid,(product->>'version')::bigint,'photos',jsonb_build_object('paths',jsonb_build_array(photo)))->'products'->0;
  if (product->>'published')::boolean then raise exception 'Draft published implicitly';end if;
  perform set_config('request.jwt.claim.sub',other_id::text,true);
  begin
    perform public.vendor_store_custom_mutate_v1((product->>'id')::uuid,(product->>'version')::bigint,'save','{"title":"Foreign edit"}');
    raise exception 'Foreign owner edit succeeded';
  exception when insufficient_privilege then null;end;
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  product:=public.vendor_store_custom_mutate_v1((product->>'id')::uuid,(product->>'version')::bigint,'publish')->'products'->0;
  perform public.vendor_store_publish_v1('app',true);
  perform public.vendor_store_publish_v1('web',true);
  projection:=public.vendor_store_read_v2(slug,'web');
  if (projection->>'total')::int<>1 or projection->'items' is distinct from public.vendor_store_read_v2(slug,'app')->'items'
    or projection::text like '%PRIVATE-RELEASE-SKU%' then raise exception 'Custom-only publication, privacy or parity failed';end if;
  stale_version:=(product->>'version')::bigint;
  product:=public.vendor_store_custom_mutate_v1((product->>'id')::uuid,stale_version,'save','{"available_quantity":3}')->'products'->0;
  begin
    perform public.vendor_store_custom_mutate_v1((product->>'id')::uuid,stale_version,'save','{"available_quantity":4}');
    raise exception 'Stale update succeeded';
  exception when sqlstate 'PT409' then null;end;
  if (select available_quantity from public.vendor_store_custom_products where id=(product->>'id')::uuid)<>3 then raise exception 'Stale edit changed quantity';end if;
  update public.user_entitlements set features='{"store_app":true}' where user_id=owner_id;
  if public.vendor_store_read_v2(slug,'web') is not null then raise exception 'Downgrade leaked web store';end if;
  update public.user_entitlements set features='{"store_app":true,"store_web":true}' where user_id=owner_id;
  if public.vendor_store_read_v2(slug,'web') is not null then raise exception 'Upgrade republished automatically';end if;
  raise notice 'PASS: final custom publisher, owner boundary, parity, PT409 and downgrade/re-upgrade';
end $test$;
rollback;
