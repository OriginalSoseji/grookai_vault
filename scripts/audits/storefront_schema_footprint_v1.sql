-- Diagnostic footprint only: catalog metadata and definition hashes, no row data.
-- Not a replacement for the governed full schema-diff/replay pre-push gate.
begin isolation level repeatable read read only;
set local statement_timeout = '30s';
set local lock_timeout = '3s';
with objects as (
  select 'relation' kind, n.nspname||'.'||c.relname key,
    jsonb_build_object('kind',c.relkind,'owner',pg_get_userbyid(c.relowner),
      'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,'options',c.reloptions,
      'acl',array(select x::text from unnest(c.relacl) x order by x::text)) value
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind in ('r','p','v','m','S','f')
  union all
  select 'column', n.nspname||'.'||c.relname||'.'||a.attname,
    jsonb_build_object('position',a.attnum,'type',format_type(a.atttypid,a.atttypmod),
      'not_null',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,
      'collation',co.collname,'default_hash',md5(pg_get_expr(d.adbin,d.adrelid)),
      'acl',array(select x::text from unnest(a.attacl) x order by x::text))
    from pg_attribute a join pg_class c on c.oid=a.attrelid
    join pg_namespace n on n.oid=c.relnamespace
    left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum
    left join pg_collation co on co.oid=a.attcollation
    where n.nspname='public' and c.relkind in ('r','p','v','m','f')
      and a.attnum>0 and not a.attisdropped
  union all
  select 'constraint',n.nspname||'.'||c.relname||'.'||k.conname,
    jsonb_build_object('definition_hash',md5(pg_get_constraintdef(k.oid)),
      'validated',k.convalidated)
    from pg_constraint k join pg_class c on c.oid=k.conrelid
    join pg_namespace n on n.oid=c.relnamespace where n.nspname='public'
  union all
  select 'index',schemaname||'.'||tablename||'.'||indexname,
    jsonb_build_object('definition_hash',md5(indexdef))
    from pg_indexes where schemaname='public'
  union all
  select 'function',n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')',
    jsonb_build_object('definition_hash',md5(pg_get_functiondef(p.oid)),
      'owner',pg_get_userbyid(p.proowner),'security_definer',p.prosecdef,
      'config',p.proconfig,'acl',array(select x::text from unnest(p.proacl) x order by x::text))
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prokind in ('f','p')
  union all
  select 'trigger',n.nspname||'.'||c.relname||'.'||t.tgname,
    jsonb_build_object('definition_hash',md5(pg_get_triggerdef(t.oid)),'enabled',t.tgenabled)
    from pg_trigger t join pg_class c on c.oid=t.tgrelid
    join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and not t.tgisinternal
  union all
  select 'policy',schemaname||'.'||tablename||'.'||policyname,
    jsonb_build_object('roles',roles,'command',cmd,'permissive',permissive,
      'using_hash',md5(qual),'check_hash',md5(with_check))
    from pg_policies where schemaname in ('public','storage')
  union all
  select 'view',schemaname||'.'||viewname,jsonb_build_object('definition_hash',md5(definition))
    from pg_views where schemaname='public'
)
select jsonb_build_object('transaction_read_only',current_setting('transaction_read_only'),
  'recorded_at',now(),'objects',jsonb_agg(jsonb_build_object('kind',kind,'key',key,'value',value)
    order by kind,key)) as receipt from objects;
rollback;
