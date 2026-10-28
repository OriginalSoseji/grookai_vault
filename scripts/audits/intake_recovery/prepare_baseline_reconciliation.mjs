// Prepare a source-only forward reconciliation of captured, existing live truth.
// Does not connect to production, change permissions, or qualify intake itself.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';

const root='C:/gv_intake_recovery_20261027';
const privateRoot='C:/gv_intake_recovery_private_20261027';
const audit='docs/audits/intake_recovery_20261027';
const name='20261027230000_app_intake_baseline_reconciliation_v1.sql';
const target=root+'/supabase/migrations/'+name;
assert.equal(fs.existsSync(target),false,'Never overwrite a frozen reconciliation');
const local=JSON.parse(fs.readFileSync(privateRoot+'/local-catalog-snapshot.json'));
const live=JSON.parse(fs.readFileSync(privateRoot+'/remote-catalog-snapshot.json'));
assert.equal(live.LEDGER.length,476);assert.equal(live.LEDGER.at(-1).version,'20261023120000');
assert.ok(isDeepStrictEqual(local.SECURITY,live.SECURITY),'Unexpected permission/owner/RLS drift');
const classification=JSON.parse(fs.readFileSync(audit+'/function-drift-classification.json'));
assert.equal(classification.functionDifferences.length,10);
assert.ok(classification.functionDifferences.every(r=>r.lineEndingOnly));
const hash=value=>createHash('sha256').update(value).digest('hex');
const quote=value=>"'"+String(value).replaceAll("'","''")+"'";
const key=row=>row.schema+'|'+row.name+'|'+row.identity_arguments;
const old=new Map(local.FUNCTIONS_QUERY.map(row=>[key(row),row]));
const next=new Map(live.FUNCTIONS_QUERY.map(row=>[key(row),row]));
const functions=classification.functionDifferences.map(item=>{
  const before=old.get(item.identity),after=next.get(item.identity);assert.ok(before&&after);
  assert.equal(before.definition.replaceAll('\r\n','\n'),after.definition.replaceAll('\r\n','\n'));
  const security=live.SECURITY.find(row=>row.kind==='function'&&row.name===`${after.name}(${after.identity_arguments})`);assert.ok(security);
  return {identity:item.identity,name:after.name,arguments:after.identity_arguments,beforeSha256:hash(before.full_definition),liveSha256:hash(after.full_definition),owner:security.owner,acl:security.acl,definition:after.full_definition};
});
const index=live.INDEXES_QUERY.find(row=>row.schema==='public'&&row.name==='market_listing_price_events_slab_identity_idx');
assert.ok(index);assert.equal(local.INDEXES_QUERY.some(row=>row.schema==='public'&&row.name===index.name),false);
assert.equal(index.table_name,'market_listing_price_events');assert.equal(index.algorithm,'btree');assert.equal(index.is_unique,false);
let sql=`begin;
-- APP_INTAKE_BASELINE_RECONCILIATION_V1
-- Reconcile the 476-version source replay with already-deployed public metadata.
-- Preserve exact captured function text, including CRLF inside function bodies.
-- No function text is normalized in the qualification comparison.
-- No new grants, ownership, RLS, table/data/identity/pricing writes are included.
set local search_path=pg_catalog,public,extensions;
do $guard$
declare v record; v_acl jsonb;
begin
`;
for(const fn of functions){
  sql+=`  select p.oid,p.proacl,pg_get_userbyid(p.proowner) as owner,encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex') as definition_hash
    into v from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname=${quote(fn.name)} and pg_get_function_identity_arguments(p.oid)=${quote(fn.arguments)};
  if not found then raise exception 'baseline_reconciliation_function_missing'; end if;
  select coalesce(jsonb_agg(value order by value),'[]'::jsonb) into v_acl from (select a::text value from unnest(v.proacl) a) q;
  if v.definition_hash not in (${quote(fn.beforeSha256)},${quote(fn.liveSha256)}) or v.owner<>${quote(fn.owner)} or v_acl is distinct from ${quote(JSON.stringify(fn.acl))}::jsonb then
    raise exception 'baseline_reconciliation_function_drift';
  end if;
`;
}
sql+=`  if to_regclass('public.${index.name}') is not null and pg_get_indexdef(to_regclass('public.${index.name}'))<>${quote(index.definition)} then
    raise exception 'baseline_reconciliation_index_drift';
  end if;
end;
$guard$;
${index.definition.replace(/^CREATE INDEX /,'CREATE INDEX IF NOT EXISTS ')};

`;
for(const fn of functions)sql+=fn.definition.trimEnd()+';\n\n';
sql+='commit;\n';
fs.writeFileSync(target,sql,{flag:'wx'});
const attributes=root+'/.gitattributes';
fs.appendFileSync(attributes,`\n# Byte-preserving live function bodies for the qualified intake baseline only.\nsupabase/migrations/${name} -text\n`);
const manifest={preparedAt:new Date().toISOString(),mode:'source_only_forward_reconciliation',remoteWrites:0,path:'supabase/migrations/'+name,sha256:hash(sql),liveSnapshotSha256:hash(fs.readFileSync(privateRoot+'/remote-catalog-snapshot.json')),functions:functions.map(({definition,...rest})=>rest),index:{name:index.name,table:index.table_name,definition:index.definition},changesGrants:false,changesData:false,qualified:false};
fs.writeFileSync(audit+'/baseline-reconciliation-candidate.json',JSON.stringify(manifest,null,2));
console.log(JSON.stringify({prepared:true,remoteWrites:0,functions:functions.length,indexes:1,sha256:hash(sql)}));
