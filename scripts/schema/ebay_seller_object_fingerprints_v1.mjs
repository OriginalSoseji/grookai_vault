// Exact object fingerprints for the independent seller release. These queries
// inspect catalog definitions and permissions, never seller credentials or rows.
export const sellerTables = ['ebay_seller_controls_v1','ebay_seller_control_events_v1',
  'ebay_seller_oauth_attempts_v1','ebay_seller_token_refreshes_v1','ebay_seller_drafts_v1',
  'ebay_seller_photos_v1','ebay_seller_operations_v1','ebay_seller_reservations_v1'];
const literal = value => "'" + value.replaceAll("'", "''") + "'";
const digest = value => `encode(sha256(convert_to((${value})::text,'UTF8')),'hex')`;
export function sellerObjectLookup(kind, identity) {
  const name = literal(identity);
  if (kind === 'function') return `(select ${digest("jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'acl',p.proacl::text)")} from pg_proc p join pg_namespace n on n.oid=p.pronamespace where format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes))=${name})`;
  if (kind === 'trigger') return `(select ${digest("jsonb_build_object('definition',pg_get_triggerdef(t.oid),'enabled',t.tgenabled)")} from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname||'.'||c.relname||'.'||t.tgname=${name} and not t.tgisinternal)`;
  if (kind === 'policy') return `(select ${digest("jsonb_build_object('command',p.polcmd,'permissive',p.polpermissive,'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid),'roles',(select jsonb_agg(case when role_id=0 then 'public' else pg_get_userbyid(role_id) end order by role_id) from unnest(p.polroles) role_id))")} from pg_policy p where p.polrelid='storage.objects'::regclass and p.polname=${name})`;
  if (kind === 'index') return `(select ${digest("jsonb_build_object('definition',pg_get_indexdef(c.oid),'owner',pg_get_userbyid(c.relowner))")} from pg_class c where c.oid=to_regclass(${name}))`;
  if (kind === 'table') return `(select ${digest(`jsonb_build_object('kind',c.relkind,'owner',pg_get_userbyid(c.relowner),'acl',c.relacl::text,'rls',c.relrowsecurity,'forced',c.relforcerowsecurity,
    'columns',(select jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'notnull',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,'collation',case when a.attcollation=0 then null else a.attcollation::regcollation::text end,'default',pg_get_expr(d.adbin,d.adrelid)) order by a.attnum) from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped),
    'constraints',(select jsonb_agg(jsonb_build_object('name',x.conname,'definition',pg_get_constraintdef(x.oid)) order by x.conname) from pg_constraint x where x.conrelid=c.oid),
    'policies',(select jsonb_agg(jsonb_build_object('name',p.polname,'command',p.polcmd,'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid)) order by p.polname) from pg_policy p where p.polrelid=c.oid))`)} from pg_class c where c.oid=to_regclass(${name}))`;
  throw Error('Unsupported seller fingerprint kind');
}
export function captureSellerObjectsSql() {
  const tables = ['ebay_accounts', ...sellerTables];
  const specifications = tables.map(name => `select 'table' kind,'public.${name}' identity`);
  specifications.push("select 'function',format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'ebay_seller_%_v1'");
  specifications.push("select 'trigger',n.nspname||'.'||c.relname||'.'||t.tgname from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where not t.tgisinternal and t.tgname like 'guard_ebay_seller_%_v1'");
  specifications.push("select 'policy',polname from pg_policy where polrelid='storage.objects'::regclass and polname like 'ebay_seller_%_v1'");
  specifications.push(`select 'index',quote_ident(n.nspname)||'.'||quote_ident(c.relname) from pg_index i join pg_class c on c.oid=i.indexrelid join pg_namespace n on n.oid=c.relnamespace join pg_class t on t.oid=i.indrelid where n.nspname='public' and t.relname in (${tables.map(literal).join(',')})`);
  const cases = ['table','function','trigger','policy','index'].map(kind => `when '${kind}' then ${sellerObjectLookup(kind, '__IDENTITY__').replaceAll("'__IDENTITY__'", 'spec.identity')}`).join('\n');
  return `select coalesce(jsonb_agg(jsonb_build_object('kind',spec.kind,'identity',spec.identity,'hash',case spec.kind ${cases} end) order by spec.kind,spec.identity),'[]') from (${specifications.join('\nunion all\n')}) spec;`;
}
export function sellerObjectGuardSql(specs, accountBaselineHash) {
  if (!Array.isArray(specs) || specs.length < 50 || !/^[a-f0-9]{64}$/.test(accountBaselineHash)) throw Error('Seller guard capture incomplete');
  const statements = specs.map(spec => {
    if (!/^[a-f0-9]{64}$/.test(spec.hash)) throw Error('Missing seller object fingerprint');
    const expected = [spec.hash, ...(spec.kind === 'table' && spec.identity === 'public.ebay_accounts' ? [accountBaselineHash] : [])];
    return `actual:=${sellerObjectLookup(spec.kind, spec.identity)}; if actual is not null and actual not in (${expected.map(literal).join(',')}) then raise exception 'ebay_seller_${spec.kind}_drift'; end if;`;
  });
  const signatures = specs.filter(s => s.kind === 'function').map(s => literal(s.identity));
  return `-- BEGIN EXACT SELLER OBJECT GUARDS\nset local search_path=pg_catalog,public,extensions;\ndo $ebay_seller_object_guards$ declare actual text; begin\nif exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'ebay_seller_%_v1' and format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes)) not in (${signatures.join(',')})) then raise exception 'ebay_seller_function_overload_drift'; end if;\n${statements.join('\n')}\nend $ebay_seller_object_guards$;\n-- END EXACT SELLER OBJECT GUARDS\n`;
}
