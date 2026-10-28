// Full public schema/security comparison using the existing pinned inspection queries.
// Generated difference SQL is diagnostic only and is never executed.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync,spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {assertReadOnlySql} from '../japanese_master_index_v4/read_only_guard_v1.mjs';

const root='C:/gv_intake_recovery_20261027';
const privateRoot='C:/gv_intake_recovery_private_20261027';
const audit=path.resolve(process.env.INTAKE_CATALOG_AUDIT_DIR||'docs/audits/intake_recovery_20261027');
if(process.env.INTAKE_CATALOG_AUDIT_DIR)assert.ok(audit.replaceAll('\\','/').startsWith(privateRoot+'/strict-'),'Only private, bounded strict-gate output is permitted');
const require=createRequire(root+'/package.json');
const {PostgreSQL}=require('@pgkit/schemainspect');
const {Migration}=require('@pgkit/migra');
for(const name of ['schemainspect','migra','client'])assert.equal(require(`@pgkit/${name}/package.json`).version,'0.6.1');
const {reconcileKnownTableColumnOrderV1}=await import(pathToFileURL(root+'/scripts/schema/column_order_reconciliation_v1.mjs'));
const securitySource=fs.readFileSync(root+'/scripts/schema/audit_collector_schema_baseline_v1.mjs','utf8');
const security=securitySource.match(/const securitySql = `([\s\S]*?)`;/)?.[1];assert.ok(security);
const queries=Object.fromEntries(Object.entries(new PostgreSQL({},'17.6')).filter(([key])=>key.endsWith('_QUERY')));
assert.equal(Object.keys(queries).length,15);
for(const query of [...Object.values(queries),security])assertReadOnlySql(query);
const sections=Object.entries({...queries,SECURITY:security,LEDGER:'select version from supabase_migrations.schema_migrations order by version'}).map(([key,query])=>`'${key}',(select coalesce(jsonb_agg(snapshot_row),'[]'::jsonb) from (${query.trim().replace(/;$/,'')}) snapshot_row)`);
const snapshotSql=`begin isolation level repeatable read read only;
set local statement_timeout='90s';set local lock_timeout='3s';
select jsonb_build_object('server_version',current_setting('server_version'),'read_only',current_setting('transaction_read_only'),
'sanity',jsonb_build_object('cards',(select count(*) from public.card_prints),'sets',(select count(*) from public.sets),'traits',(select count(*) from public.card_print_traits)),
${sections.join(',\n')}) receipt;rollback;`;
const sha=value=>createHash('sha256').update(value).digest('hex');
const mode=process.argv[2];assert.ok(['remote','remote-final','local','compare','local-fresh','compare-fresh','compare-fresh-final'].includes(mode));
fs.mkdirSync(privateRoot,{recursive:true});
const file=kind=>privateRoot+`/${kind}-catalog-snapshot.json`;
if(mode==='remote'||mode==='remote-final'){
  assert.equal(fs.readFileSync(root+'/supabase/.temp/project-ref','utf8').trim(),'ycdxbpibncqcchqiihfz');
  console.log('TARGET REMOTE READ ONLY https://ycdxbpibncqcchqiihfz.supabase.co');
  fs.writeFileSync(privateRoot+'/read-only-snapshot.sql',snapshotSql);
  const remoteKind=mode==='remote-final'?'remote-final':'remote';
  const envelopePath=privateRoot+'/'+remoteKind+'-catalog-envelope.json';
  const fd=fs.openSync(envelopePath,'w');let result;
  try{result=spawnSync('supabase',['db','query','--linked','--workdir',root,'--file',privateRoot+'/read-only-snapshot.sql','--output','json'],{encoding:'utf8',timeout:120000,stdio:['ignore',fd,'pipe']});}finally{fs.closeSync(fd);}
  assert.ifError(result.error);assert.equal(result.status,0,'Read-only snapshot failed');
  const text=fs.readFileSync(envelopePath,'utf8');
  const envelope=JSON.parse(text.slice(text.indexOf('{'),text.lastIndexOf('}')+1));
  const snapshot=envelope.rows?.[0]?.receipt;assert.ok(snapshot,'Missing read-only receipt');
  assert.equal(snapshot.read_only,'on');assert.ok(snapshot.sanity.cards>=40000&&snapshot.sanity.sets>=150&&snapshot.sanity.traits>=5000);
  assert.equal(snapshot.LEDGER.length,476);assert.equal(snapshot.LEDGER.at(-1).version,'20261023120000');
  fs.writeFileSync(file(remoteKind),JSON.stringify(snapshot));
  const report={observedAt:new Date().toISOString(),target:'REMOTE READ ONLY',projectRef:'ycdxbpibncqcchqiihfz',remoteWrites:0,readOnly:snapshot.read_only,sanity:snapshot.sanity,migrations:snapshot.LEDGER.length,sha256:sha(fs.readFileSync(file(remoteKind))),querySha256:sha(snapshotSql),engine:'pgkit 0.6.1'};
  fs.writeFileSync(audit+'/'+remoteKind+'-catalog-capture.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}else if(mode==='local'||mode==='local-fresh'){
  const project=mode==='local-fresh'?'intake-ready-replay-476-v5-20261027':'intake-replay-476-20261027';
  const container='supabase_db_'+project;
  const info=JSON.parse(execFileSync('docker',['inspect',container],{encoding:'utf8'}))[0];assert.deepEqual(Object.keys(info.NetworkSettings.Networks),[project]);
  assert.equal(JSON.parse(execFileSync('docker',['network','inspect',project],{encoding:'utf8'}))[0].Internal,true);
  const raw=execFileSync('docker',['exec','-i',container,'psql','-X','-qAt','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],{input:snapshotSql,encoding:'utf8',timeout:120000,maxBuffer:64_000_000});
  const snapshot=JSON.parse(raw);assert.equal(snapshot.read_only,'on');assert.equal(snapshot.LEDGER.length,477);assert.equal(snapshot.LEDGER.at(-1).version,'20261027230000');
  const proof=path.join(root,'docs/audits/intake_recovery_20261027');
  const tested=JSON.parse(fs.readFileSync(proof+'/baseline-reconciliation-tests.json'));assert.equal(tested.pass,true);
  const candidate=JSON.parse(fs.readFileSync(proof+'/baseline-reconciliation-candidate.json'));assert.equal(tested.sourceSha256,candidate.sha256);assert.equal(sha(fs.readFileSync(root+'/'+candidate.path)),candidate.sha256);
  if(mode==='local'){const previous=file('local').replace('.json','-476.json');if(!fs.existsSync(previous))fs.copyFileSync(file('local'),previous,fs.constants.COPYFILE_EXCL);}
  const target=file(mode==='local-fresh'?'local-fresh':'local');fs.writeFileSync(target,JSON.stringify(snapshot));console.log(JSON.stringify({target:'LOCAL DIAGNOSTIC ONLY',migrations:477,sha256:sha(fs.readFileSync(target))}));
}else{
  const localKind=mode.startsWith('compare-fresh')?'local-fresh':'local';
  const remoteKind=mode==='compare-fresh-final'?'remote-final':'remote';
  const from=JSON.parse(fs.readFileSync(file(localKind))),to=JSON.parse(fs.readFileSync(file(remoteKind)));
  async function inspect(snapshot){
    const byQuery=new Map(Object.entries(queries).map(([key,query])=>[query,snapshot[key]]));
    const value=await PostgreSQL.create({oneFirst:async()=>snapshot.server_version,any:async query=>{assert.equal(query.values.length,0);assert.ok(byQuery.has(query.sql));return byQuery.get(query.sql);}});
    value.one_schema('public');for(const key of ['types','domains','materialized_views','composite_types'])value[key]=Object.fromEntries(Object.entries(value[key]).filter(([,v])=>v.schema==='public'));return value;
  }
  const left=await inspect(from),right=await inspect(to);
  const diff=async()=>{const migration=await Migration.create(left,right,{schema:'public'});migration.set_safety(false);migration.add_all_changes(true);return migration.sql;};
  const raw=await diff();fs.writeFileSync(privateRoot+'/full-schema-raw-diff.sql',raw);
  const columnOrder=reconcileKnownTableColumnOrderV1(left,right);
  const reconciled=await diff();fs.writeFileSync(privateRoot+'/full-schema-reconciled-diff.sql',reconciled);
  const securitySame=isDeepStrictEqual(from.SECURITY,to.SECURITY);
  const report={observedAt:new Date().toISOString(),remoteWrites:0,sqlExecuted:false,engine:'pgkit 0.6.1',scope:'entire public schema and governed security footprint',rawBytes:Buffer.byteLength(raw),reconciledBytes:Buffer.byteLength(reconciled),securitySame,securityObjects:to.SECURITY.length,columnOrder,localSnapshotSha256:sha(fs.readFileSync(file(localKind))),remoteSnapshotSha256:sha(fs.readFileSync(file(remoteKind))),pass:reconciled.trim()===''&&securitySame};
  const reportName=mode==='compare-fresh-final'?'fresh-final-full-schema-parity.json':mode==='compare-fresh'?'fresh-full-schema-parity.json':'full-schema-parity.json';
  fs.writeFileSync(audit+'/'+reportName,JSON.stringify(report,null,2));console.log(JSON.stringify({pass:report.pass,remainingSqlBytes:report.reconciledBytes,securityObjects:report.securityObjects,securitySame:report.securitySame}));assert.ok(report.pass,'Full schema/security comparison differs; inspect private diagnostics');
}
