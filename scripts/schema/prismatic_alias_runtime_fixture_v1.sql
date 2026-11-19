-- Explicitly synthetic, unlinked local-lab fixture only. Never production input.
begin;
do $$begin
  if current_setting('max_worker_processes') <> '0'
    or (select count(*) from public.card_prints) <> 1294
    or (select count(*) from auth.users) <> 0
    or exists(select 1 from public.card_prints where name not like 'LOCAL REPLAY %')
  then raise exception 'PRISMATIC_LOCAL_FIXTURE_PRECONDITION'; end if;
end$$;

update public.card_prints set identity_domain='pokemon_eng_standard'
where set_code in ('sv08.5','sv8pt5');

insert into public.finish_keys(key,label,sort_order,meta)
values('pokeball','Local fixture Poke Ball',80,'{"local_fixture":true}'),
 ('masterball','Local fixture Master Ball',81,'{"local_fixture":true}');

insert into public.card_prints(id,game_id,set_id,set_code,name,number,variant_key,gv_id,identity_domain)
select gen_random_uuid(),p.game_id,p.set_id,p.set_code,p.name,p.number,
  case when n<=10 then 'play_pokemon_stamp' when n=11 then 'prismatic_evolution_stamp' else 'prismatic_evolutions_stamp' end,
  'GV-PK-LOCAL-PRISMATIC-STAMP-'||lpad(n::text,3,'0'),'pokemon_eng_standard'
from generate_series(1,14) n join public.card_prints p
  on p.set_code='sv8pt5' and p.number=n::text and coalesce(p.variant_key,'')='';

insert into public.card_printings(card_print_id,finish_key,created_by)
select p.id,f.finish,'local_prismatic_fixture'
from public.card_prints p cross join (values('normal'),('reverse'),('pokeball'),('masterball')) f(finish)
where p.set_code='sv8pt5' and p.number='1' and coalesce(p.variant_key,'')='';
insert into public.card_printings(card_print_id,finish_key,created_by)
select p.id,f.finish,'local_prismatic_fixture'
from public.card_prints p cross join (values('normal'),('holo'),('reverse')) f(finish)
where p.set_code='sv08.5' and p.number='1';

insert into auth.users(id,instance_id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values('10000000-0000-0000-0000-000000000016','00000000-0000-0000-0000-000000000000',
 'authenticated','authenticated','prismatic-local-fixture@fixture.invalid','{"provider":"email","providers":["email"]}','{}',now(),now());

insert into public.vault_items(id,user_id,card_id,name,gv_id,qty)
select '10000000-0000-0000-0000-000000000017','10000000-0000-0000-0000-000000000016',p.id,p.name,p.gv_id,3
from public.card_prints p where p.set_code='sv08.5' and p.number='1';
insert into public.vault_item_instances(id,user_id,card_print_id,card_printing_id,legacy_vault_item_id,gv_vi_id)
select gen_random_uuid(),'10000000-0000-0000-0000-000000000016',p.id,
 case when n<=2 then printing.id else null end,'10000000-0000-0000-0000-000000000017',
 'GVVI-LOCAL-PRISMATIC-'||n::text
from generate_series(1,3) n cross join public.card_prints p
join public.card_printings printing on printing.card_print_id=p.id and printing.finish_key='normal'
where p.set_code='sv08.5' and p.number='1';

create schema prismatic_fixture;
revoke all on schema prismatic_fixture from public,anon,authenticated,service_role;
create function prismatic_fixture.fingerprints() returns jsonb
language plpgsql set search_path=pg_catalog as $$
declare r record; v jsonb; result jsonb:='{}'::jsonb;
begin
  for r in select n.nspname,c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname in ('public','grookai_square','grookai_inventory','grookai_vendor_pricing','auth')
      and c.relkind='r' order by n.nspname,c.relname loop
    execute format($query$select jsonb_build_object('count',count(*),'sha',md5(coalesce(string_agg(digest,'|' order by digest),''))) from (select md5(to_jsonb(t)::text) digest from %I.%I t) rows$query$,r.nspname,r.relname) into v;
    result:=result||jsonb_build_object(r.nspname||'.'||r.relname,v);
  end loop;
  return result;
end$$;
revoke all on function prismatic_fixture.fingerprints() from public,anon,authenticated,service_role;
commit;
