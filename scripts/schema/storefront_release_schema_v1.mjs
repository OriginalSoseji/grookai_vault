// Read-only snapshots using the pinned inspection engine. Generated diff SQL is never executed.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {sha256, reconcileKnownTableColumnOrderV1} from './column_order_reconciliation_v1.mjs';

export const root=fileURLToPath(new URL('../../',import.meta.url));
export const project='grookai-storefront-release-20260919';
export const workdir=path.join(root,'.local/integration/release-replay');
export const pending='20260919050000_vendor_storefront_release_v1.sql';
export const container=`supabase_db_${project}`;
const require=createRequire(import.meta.url);
const {PostgreSQL}=require('@pgkit/schemainspect');
const {Migration}=require('@pgkit/migra');
for(const name of ['schemainspect','migra','client']) {
  assert.equal(JSON.parse(fs.readFileSync(path.join(root,'node_modules/@pgkit',name,'package.json'))).version,'0.6.1');
}
// Reuse the governed supplementary ACL/owner/forced-RLS query exactly.
const existing=fs.readFileSync(path.join(root,'scripts/schema/audit_collector_schema_baseline_v1.mjs'),'utf8');
const security=existing.match(/const securitySql = `([\s\S]*?)`;/)?.[1];
assert.ok(security,'security query missing');
const template=new PostgreSQL({},'17.6');
const queries=Object.fromEntries(Object.entries(template).filter(([k])=>k.endsWith('_QUERY')));
assert.equal(Object.keys(queries).length,15);
const stripped=q=>q.trim().replace(/;$/,'');
const parts=Object.entries({...queries,SECURITY:security,LEDGER:'select version from supabase_migrations.schema_migrations order by version'}).map(([key,q])=>`'${key}',(select coalesce(jsonb_agg(snapshot_row),'[]'::jsonb) from (${stripped(q)}) snapshot_row)`);
export const snapshotSql=`begin isolation level repeatable read read only;
set local statement_timeout='90s';
set local lock_timeout='3s';
select jsonb_build_object('server_version',current_setting('server_version'),'read_only',current_setting('transaction_read_only'),
'sanity',jsonb_build_object('cards',(select count(*) from public.card_prints),'sets',(select count(*) from public.sets),'traits',(select count(*) from public.card_print_traits)),
${parts.join(',\n')}) as receipt;
rollback;`;
export function localSql(sql,target=container){
  assert.ok([container,'supabase_db_grookai-storefront-verification-20260918'].includes(target));
  return execFileSync('docker',['exec','-i',target,'psql','-U','postgres','-d','postgres','-X','-qAt','-v','ON_ERROR_STOP=1'],{input:sql,encoding:'utf8',windowsHide:true,maxBuffer:48*1024*1024,timeout:180000}).trim();
}
export function localSnapshot(target=container){return JSON.parse(localSql(snapshotSql,target));}
export function remoteSnapshot(){
  // CLI authentication keeps secrets out of command arguments and source files.
  assert.equal(fs.readFileSync(path.join(root,'supabase/.temp/project-ref'),'utf8').trim(),'ycdxbpibncqcchqiihfz');
  const sqlFile=path.join(workdir,'read-only-engine-snapshot.sql');fs.writeFileSync(sqlFile,snapshotSql);
  const raw=execFileSync('supabase',['db','query','--linked','--workdir',root,'--file',sqlFile,'--output','json'],{encoding:'utf8',windowsHide:true,maxBuffer:48*1024*1024,timeout:180000});
  const envelope=JSON.parse(raw.slice(raw.indexOf('{'),raw.lastIndexOf('}')+1));
  const receipt=envelope.rows?.[0]?.receipt;assert.ok(receipt,'missing remote snapshot');return receipt;
}
async function inspect(snapshot){
  assert.equal(snapshot.read_only,'on');assert.match(snapshot.server_version,/^17\./);
  const byQuery=new Map(Object.entries(queries).map(([key,q])=>[q,snapshot[key]]));
  const inspector=await PostgreSQL.create({oneFirst:async()=>snapshot.server_version,any:async q=>{
    assert.equal(q.values.length,0);assert.ok(byQuery.has(q.sql),'unrecognized engine query');return byQuery.get(q.sql);
  }});
  inspector.one_schema('public');
  for(const field of ['types','domains','materialized_views','composite_types']) inspector[field]=Object.fromEntries(Object.entries(inspector[field]).filter(([,v])=>v.schema==='public'));
  return inspector;
}
async function diff(a,b){const m=await Migration.create(a,b,{schema:'public'});m.set_safety(false);m.add_all_changes(true);return m.sql;}
export async function compareSnapshots(a,b,{reconcile=false,output}={}){
  const x=await inspect(a),y=await inspect(b);
  const raw=await diff(x,y);
  const columnOrder=reconcile?reconcileKnownTableColumnOrderV1(x,y):[];
  const normalized=await diff(x,y);
  if(output){fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'raw.sql'),raw);fs.writeFileSync(path.join(output,'normalized.sql'),normalized);}
  assert.deepEqual(a.SECURITY,b.SECURITY,'owner, ACL, RLS or function configuration differs');
  assert.equal(normalized.trim(),'','schema SQL differs; inspect private diagnostic');
  return {engine:'pgkit 0.6.1',scope:'public',rawBytes:Buffer.byteLength(raw),rawSha256:sha256(raw),normalizedBytes:Buffer.byteLength(normalized),securityObjects:a.SECURITY.length,columnOrder};
}
