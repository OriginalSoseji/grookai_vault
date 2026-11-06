// Catalog-only expressions shared by the draft capture and generated SQL guards.
export const intakeTables=[
  'collector_intake_controls_v1','collector_intake_control_events_v1',
  'vault_intake_operations_v1','purchase_lots','vault_intake_batches',
  'vault_intake_items','vault_intake_allocation_events','vault_intake_sales_v1',
  'vault_intake_commit_receipts_v1',
];
export const intakeFunctions=[
  'guard_vault_intake_origin_v1()',
  'collector_intake_can_write_v1()',
  'collector_intake_set_control_v1(bigint, boolean, uuid[])',
  'vault_intake_execute_v1(uuid, text, jsonb)',
  'vault_intake_request_v1(uuid, text, jsonb)',
];
export const intakePolicies=['select','insert','update','delete'].map(x=>'vault_intake_private_'+x);
const literal=s=>"'"+s.replaceAll("'","''")+"'";
const digest=expression=>`encode(sha256(convert_to((${expression})::text,'UTF8')),'hex')`;
export function objectLookup(kind,identity){
  const name=literal(identity);
  if(kind==='function')return `(select ${digest("jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'acl',p.proacl::text)")} from pg_proc p where p.oid=to_regprocedure(${name}))`;
  if(kind==='index')return `(select ${digest("jsonb_build_object('definition',pg_get_indexdef(c.oid),'owner',pg_get_userbyid(c.relowner))")} from pg_class c where c.oid=to_regclass(${name}))`;
  if(kind==='trigger')return `(select ${digest("jsonb_build_object('definition',pg_get_triggerdef(t.oid),'enabled',t.tgenabled)")} from pg_trigger t where t.tgrelid='public.vault_item_instances'::regclass and t.tgname=${name} and not t.tgisinternal)`;
  if(kind==='policy')return `(select ${digest("jsonb_build_object('command',p.polcmd,'permissive',p.polpermissive,'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid),'roles',(select jsonb_agg(case when role_id=0 then 'public' else pg_get_userbyid(role_id) end order by role_id) from unnest(p.polroles) role_id))")} from pg_policy p where p.polrelid='storage.objects'::regclass and p.polname=${name})`;
  if(kind==='table')return `(select ${digest(`jsonb_build_object('kind',c.relkind,'owner',pg_get_userbyid(c.relowner),'acl',c.relacl::text,'rls',c.relrowsecurity,'forced',c.relforcerowsecurity,
    'columns',(select jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'notnull',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,'collation',case when a.attcollation=0 then null else a.attcollation::regcollation::text end,'default',pg_get_expr(d.adbin,d.adrelid)) order by a.attnum) from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped),
    'constraints',(select jsonb_agg(jsonb_build_object('name',x.conname,'definition',pg_get_constraintdef(x.oid)) order by x.conname) from pg_constraint x where x.conrelid=c.oid),
    'policies',(select jsonb_agg(jsonb_build_object('name',p.polname,'command',p.polcmd,'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid)) order by p.polname) from pg_policy p where p.polrelid=c.oid))`)} from pg_class c where c.oid=to_regclass(${name}))`;
  throw Error('Unsupported fingerprint kind');
}
export function captureObjectsSql(){
  const specs=[...intakeTables.map(n=>['table','public.'+n]),...intakeFunctions.map(n=>['function','public.'+n]),...intakePolicies.map(n=>['policy',n]),['trigger','guard_vault_intake_origin_v1']];
  const rows=specs.map(([kind,identity])=>`select ${literal(kind)} kind,${literal(identity)} identity,${objectLookup(kind,identity)} hash`);
  rows.push(`select 'index' kind,quote_ident(n.nspname)||'.'||quote_ident(c.relname) identity,${digest("jsonb_build_object('definition',pg_get_indexdef(c.oid),'owner',pg_get_userbyid(c.relowner))")} hash from pg_index i join pg_class c on c.oid=i.indexrelid join pg_namespace n on n.oid=c.relnamespace join pg_class t on t.oid=i.indrelid where n.nspname='public' and (t.relname in (${intakeTables.map(literal).join(',')}) or c.relname in ('vault_instances_purchase_lot_idx','vault_instances_acquired_idx','vault_instances_intake_tags_idx'))`);
  return `select jsonb_agg(to_jsonb(objects) order by kind,identity) from (${rows.join('\nunion all\n')}) objects;`;
}
export function guardObjectsSql(specs){
  const statements=specs.map(spec=>{
    const lookup=objectLookup(spec.kind,spec.identity);
    return `actual:=${lookup}; if actual is not null and actual is distinct from ${literal(spec.hash)} then raise exception 'reviewed_intake_${spec.kind}_drift'; end if;`;
  });
  const functions=specs.filter(x=>x.kind==='function');
  const identities=functions.map(x=>literal(x.identity)).join(',');
  const names=functions.map(x=>literal(x.identity.split('.')[1].split('(')[0])).join(',');
  const overloadGuard=`if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in (${names}) and format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes)) not in (${identities})) then raise exception 'reviewed_intake_function_overload_drift'; end if;`;
  return `do $reviewed_intake_object_guards$ declare actual text; begin\n${overloadGuard}\n${statements.join('\n')}\nend $reviewed_intake_object_guards$;\n`;
}
