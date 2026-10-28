// Read-only baseline qualification. No candidate or production apply capability.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync,spawnSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {validateInventory} from './verify_app_intake_reconciliation_v1.mjs';
import {reconcileKnownTableColumnOrderV1} from './column_order_reconciliation_v1.mjs';

const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
const privateRoot='C:/gv_intake_recovery_private_20261027';
const replay=privateRoot+'/full-replay-476-v5';
const project='intake-ready-replay-476-v5-20261027';
const sha=b=>createHash('sha256').update(b).digest('hex');
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();

export function validateReviewedBaselineArgs(args){
  assert.equal(args.length,1,'One new private output directory is required');
  const out=path.win32.resolve(args[0]).replaceAll('\\','/');
  assert.ok(out.startsWith(privateRoot+'/baseline-intake-'),'Bounded private output required');
  assert.equal(path.posix.dirname(out),privateRoot,'No nested/traversal output');
  return out;
}

async function main(){
  const out=validateReviewedBaselineArgs(process.argv.slice(2));
  assert.equal(fs.existsSync(out),false,'Never overwrite a consumed baseline audit');
  assert.equal(root.replaceAll('\\','/'),'C:/gv_intake_release_20261028');
  assert.equal(git('rev-parse','HEAD'),'aae9893f828b9d81c136ea154a0086e1bf0072d7','This baseline is bound to merged PR 824');
  assert.equal(fs.readFileSync(root+'/supabase/.temp/project-ref','utf8').trim(),'ycdxbpibncqcchqiihfz');
  const manifestBytes=fs.readFileSync(root+'/docs/audits/intake_recovery_20261027/qualification-manifest.json');
  // Pin the committed LF representation; the original operator receipt retained
  // CRLF JSON bytes. All fields are identical, and function text is not normalized.
  assert.equal(sha(manifestBytes),'723fdcf4e8cb7219e8cefd072489116f249ab1fe34d08eb2ec8bc73e47664b64');
  const manifest=JSON.parse(manifestBytes);
  const files=Object.fromEntries(fs.readdirSync(root+'/supabase/migrations').filter(n=>n.endsWith('.sql')).map(n=>[n,fs.readFileSync(root+'/supabase/migrations/'+n)]));
  const expected=validateInventory(files,manifest.baselineSources);
  for(const [name,digest] of Object.entries(manifest.privateProofFiles))assert.equal(sha(fs.readFileSync(replay+'/'+name)),digest,'Original replay proof changed');
  assert.equal(fs.existsSync(replay+'/supabase/.temp/project-ref'),false);
  assert.equal(sha(fs.readFileSync(replay+'/supabase/config.toml')),manifest.localConfigSha256);
  const docker=(...args)=>execFileSync('docker',args,{encoding:'utf8',timeout:60000,maxBuffer:64_000_000});
  const info=JSON.parse(docker('inspect','supabase_db_'+project))[0];
  assert.equal(info.State.Running,true);assert.equal(info.Image,manifest.postgresImage);
  assert.deepEqual(Object.keys(info.NetworkSettings.Networks),[project]);
  assert.equal(JSON.parse(docker('network','inspect',project))[0].Internal,true);
  for(const bindings of Object.values(info.NetworkSettings.Ports))assert.equal(bindings?.length??0,0);
  const sql=query=>execFileSync('docker',['exec','-i','supabase_db_'+project,'psql','-X','-qAt','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],{input:query,encoding:'utf8',timeout:120000,maxBuffer:64_000_000});
  const state=JSON.parse(sql("begin isolation level repeatable read read only;select json_build_object('users',(select count(*) from auth.users),'copies',(select count(*) from vault_item_instances),'workers',current_setting('max_worker_processes'),'aliases',(select count(*) from card_print_identity_aliases));rollback;"));
  assert.deepEqual(state,{users:0,copies:0,workers:'0',aliases:647});
  const queryFile=root+'/scripts/schema/reviewed_intake_public_catalog_v1.sql';
  const query=fs.readFileSync(queryFile,'utf8');assert.equal(sha(query),'a5dda9364406ff20238b63268805b9251de9676ad2ac543c561b6f4bdea28ad4');
  const require=createRequire('C:/gv_intake_recovery_20261027/package.json');
  for(const name of ['schemainspect','migra','client'])assert.equal(require(`@pgkit/${name}/package.json`).version,'0.6.1');
  const {PostgreSQL}=require('@pgkit/schemainspect'),{Migration}=require('@pgkit/migra');
  const queries=Object.fromEntries(Object.entries(new PostgreSQL({},'17.6')).filter(([key])=>key.endsWith('_QUERY')));assert.equal(Object.keys(queries).length,15);
  fs.mkdirSync(out);console.log('TARGET REMOTE READ ONLY https://ycdxbpibncqcchqiihfz.supabase.co; baseline 477 only; no apply');
  const fd=fs.openSync(out+'/remote-envelope.json','wx');let result;
  try{result=spawnSync('supabase',['db','query','--linked','--workdir',root,'--file',queryFile,'--output','json'],{stdio:['ignore',fd,'pipe'],encoding:'utf8',timeout:180000});}finally{fs.closeSync(fd);}
  fs.writeFileSync(out+'/remote-stderr.log',result.stderr??'');assert.ifError(result.error);assert.equal(result.status,0);
  const raw=fs.readFileSync(out+'/remote-envelope.json','utf8');
  const remote=JSON.parse(raw.slice(raw.indexOf('{'),raw.lastIndexOf('}')+1)).rows?.[0]?.receipt;
  const local=JSON.parse(sql(query));
  for(const snapshot of [local,remote]){assert.equal(snapshot.read_only,'on');assert.deepEqual(snapshot.LEDGER.map(x=>x.version),expected);}
  assert.ok(remote.sanity.cards>=40000&&remote.sanity.sets>=150&&remote.sanity.traits>=5000);
  fs.writeFileSync(out+'/remote-snapshot.json',JSON.stringify(remote));fs.writeFileSync(out+'/local-snapshot.json',JSON.stringify(local));
  async function inspect(snapshot){
    const map=new Map(Object.entries(queries).map(([key,q])=>[q,snapshot[key]]));
    const model=await PostgreSQL.create({oneFirst:async()=>snapshot.server_version,any:async q=>{assert.equal(q.values.length,0);assert.ok(map.has(q.sql));return map.get(q.sql);}});
    model.one_schema('public');for(const key of ['types','domains','materialized_views','composite_types'])model[key]=Object.fromEntries(Object.entries(model[key]).filter(([,x])=>x.schema==='public'));return model;
  }
  const left=await inspect(local),right=await inspect(remote);
  const columnOrder=reconcileKnownTableColumnOrderV1(left,right);
  const diff=await Migration.create(left,right,{schema:'public'});diff.set_safety(false);diff.add_all_changes(true);
  fs.writeFileSync(out+'/diagnostic-diff-never-executed.sql',diff.sql);assert.equal(diff.sql.trim(),'');
  assert.ok(isDeepStrictEqual(local.SECURITY,remote.SECURITY));assert.equal(remote.SECURITY.length,1331);
  const report={at:new Date().toISOString(),pass:true,scope:'reviewed_intake_read_only_baseline_477_only',head:git('rev-parse','HEAD'),remoteVersions:477,localVersions:477,historicalSourceFiles:477,remainingSqlBytes:0,securityObjects:1331,securitySame:true,genuineHistoricalCliResetProofPreserved:true,canonicalCounts:remote.sanity,columnOrder,querySha256:sha(query),remoteSnapshotSha256:sha(fs.readFileSync(out+'/remote-snapshot.json')),localSnapshotSha256:sha(fs.readFileSync(out+'/local-snapshot.json')),remoteWrites:0,candidateQualified:false,productionApplyAuthorized:false};
  fs.writeFileSync(out+'/baseline.json',JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({pass:true,versions:477,remainingSqlBytes:0,securityObjects:1331,remoteWrites:0,candidateQualified:false}));
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)main().catch(e=>{console.error(e.message);process.exitCode=1;});
