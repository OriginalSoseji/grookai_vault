begin isolation level repeatable read read only;
set local statement_timeout='90s'; set local lock_timeout='3s'; set local search_path=pg_catalog,public,extensions;
select jsonb_build_object('readOnly',current_setting('transaction_read_only'),'objects',coalesce((select jsonb_agg(row order by kind,schema,name,owner) from (
 select 'schema'::text kind,n.nspname::text schema,n.nspname::text name,pg_get_userbyid(n.nspowner) owner,
  to_jsonb(array(select x::text from unnest(n.nspacl) x order by x::text)) acl,'{}'::jsonb facts
 from pg_namespace n where n.nspname in ('public','grookai_square','grookai_inventory','grookai_vendor_pricing')
 union all
 select 'relation',n.nspname,c.relname,pg_get_userbyid(c.relowner),to_jsonb(array(select x::text from unnest(c.relacl) x order by x::text)),
  jsonb_build_object('kind',c.relkind,'rls',c.relrowsecurity,'forceRls',c.relforcerowsecurity,'options',c.reloptions,
   'columns',(select jsonb_agg(jsonb_build_object('name',a.attname,'acl',array(select x::text from unnest(a.attacl) x order by x::text)) order by a.attname) from pg_attribute a where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped))
 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','grookai_square','grookai_inventory','grookai_vendor_pricing') and c.relkind in ('r','p','v','m','S','f')
 union all
 select 'function',n.nspname,p.proname||'('||pg_get_function_identity_arguments(p.oid)||')',pg_get_userbyid(p.proowner),
  to_jsonb(array(select x::text from unnest(p.proacl) x order by x::text)),
  jsonb_build_object('definition',pg_get_functiondef(p.oid),'definer',p.prosecdef,'config',p.proconfig,'leakproof',p.proleakproof)
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','grookai_square','grookai_inventory','grookai_vendor_pricing') and p.prokind<>'a'
 union all
 select 'type',n.nspname,t.typname,pg_get_userbyid(t.typowner),to_jsonb(array(select x::text from unnest(t.typacl) x order by x::text)),jsonb_build_object('type',t.typtype)
 from pg_type t join pg_namespace n on n.oid=t.typnamespace where n.nspname in ('public','grookai_square','grookai_inventory','grookai_vendor_pricing')
 union all
 select 'default_acl',n.nspname,d.defaclobjtype::text,pg_get_userbyid(d.defaclrole),to_jsonb(array(select x::text from unnest(d.defaclacl) x order by x::text)),'{}'::jsonb
 from pg_default_acl d join pg_namespace n on n.oid=d.defaclnamespace where n.nspname in ('public','grookai_square','grookai_inventory','grookai_vendor_pricing')
) row),'[]'::jsonb),'privateExecutable',(select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('grookai_square','grookai_inventory','grookai_vendor_pricing') and
 (has_function_privilege('authenticated',p.oid,'EXECUTE') or has_function_privilege('anon',p.oid,'EXECUTE') or has_function_privilege('service_role',p.oid,'EXECUTE')))) receipt;
rollback;
