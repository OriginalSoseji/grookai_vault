-- Forward-only least-privilege repair for the exact510 discovery projection.
begin;
set local lock_timeout='3s';
set local statement_timeout='30s';
set local search_path='';
do $guard$
begin
 if pg_catalog.md5(pg_catalog.pg_get_viewdef('public.v_card_prints_set_family_discovery_v1'::regclass,false))<>'02b52c3e85b27a50f587dfaf3752be74'
   or pg_catalog.pg_relation_is_updatable('public.v_card_prints_set_family_discovery_v1'::regclass,false)<>0
   or not exists(select 1 from pg_catalog.pg_class where oid='public.v_card_prints_set_family_discovery_v1'::regclass and 'security_invoker=true'=any(reloptions))
 then raise exception 'SHROUDED_DISCOVERY_PROJECTION_DRIFT'; end if;
end;
$guard$;
revoke all on public.v_card_prints_set_family_discovery_v1 from public,anon,authenticated,service_role;
grant select on public.v_card_prints_set_family_discovery_v1 to anon,authenticated,service_role;
commit;
