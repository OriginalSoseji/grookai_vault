// Fixed reconciliation qualification only. No production apply capability.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {splitSealedMigrationStatementsV1 as split} from '../../backend/pricing/cross_tcg_sealed_product_schema_apply_v1.mjs';

const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
const audit=path.join(root,'docs/audits/intake_recovery_20261027');
const privateRoot='C:/gv_intake_recovery_private_20261027';
const work=privateRoot+'/full-replay-476-v5';
const candidate='20261027230000_app_intake_baseline_reconciliation_v1.sql';
const candidateHash='c330b8cbc5f3b21590607862f7121be4a455422a644206ccc5ca23c442c17af2';
const manifestHash='1a9750c02e3e4ee4d71bba8fef15f94d01a6b366dc9586c26da3693cf5495da9';
const hash=value=>createHash('sha256').update(value).digest('hex');
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',timeout:60000}).trim();
const docker=(...args)=>execFileSync('docker',args,{encoding:'utf8',timeout:60000,maxBuffer:32_000_000}).trim();

export function validateInvocation(args){
  assert.equal(args.length,2,'Exactly Phase and --out-dir are required');
  const [phase,flag]=args;
  assert.ok(['AuditLinkedSchema','PrePush'].includes(phase),'Unsupported phase');
  assert.match(flag,/^--out-dir=.+/,'A new private output directory is required');
  const out=path.win32.resolve(flag.slice('--out-dir='.length)).replaceAll('\\','/');
  assert.ok(out.startsWith(privateRoot+'/strict-'),'Output must be a new private strict- directory');
  assert.equal(path.posix.dirname(out),privateRoot,'Nested or traversal output is forbidden');
  return {phase,out};
}

export function validateInventory(files,baseline){
  const names=Object.keys(baseline).sort();
  assert.equal(names.length,476,'Exactly 476 historical files are required');
  const expected=[...names,candidate].sort();
  assert.deepEqual(Object.keys(files).sort(),expected,'Unexpected migration payload');
  const versions=expected.map(name=>name.match(/^\d+/)?.[0]);
  assert.equal(new Set(versions).size,477,'Duplicate migration timestamp');
  for(const name of names)assert.equal(hash(files[name]),baseline[name],'Historical migration changed: '+name);
  assert.equal(hash(files[candidate]),candidateHash,'Candidate bytes changed');
  return versions;
}

async function main(){
  const {phase,out}=validateInvocation(process.argv.slice(2));
  assert.equal(root.replaceAll('\\','/'),'C:/gv_intake_recovery_20261027','Only the declared recovery checkout is permitted');
  assert.equal(fs.existsSync(out),false,'Never overwrite a consumed qualification');
  const manifestBytes=fs.readFileSync(audit+'/qualification-manifest.json');
  assert.equal(hash(manifestBytes),manifestHash,'Qualification manifest changed');
  const manifest=JSON.parse(manifestBytes);
  const files=Object.fromEntries(fs.readdirSync(root+'/supabase/migrations').filter(name=>name.endsWith('.sql')).map(name=>[name,fs.readFileSync(root+'/supabase/migrations/'+name)]));
  const versions=validateInventory(files,manifest.baselineSources);
  assert.equal(fs.readFileSync(root+'/supabase/.temp/project-ref','utf8').trim(),manifest.projectRef);
  assert.equal(manifest.projectRef,'ycdxbpibncqcchqiihfz');
  assert.equal(fs.existsSync(work+'/supabase/.temp/project-ref'),false,'Local lab must be unlinked');
  git('merge-base','--is-ancestor',manifest.sourceBase,'HEAD');
  if(phase==='PrePush'){
    assert.equal(git('status','--porcelain'),'','PrePush requires clean committed source');
    git('merge-base','--is-ancestor','origin/main','HEAD');
  }
  for(const [name,digest] of Object.entries(manifest.privateProofFiles))assert.equal(hash(fs.readFileSync(work+'/'+name)),digest,'Replay proof changed: '+name);
  assert.equal(hash(fs.readFileSync(audit+'/replay-v5-source-as-executed.mjs')),manifest.executedReplayDriverSha256);
  assert.equal(hash(fs.readFileSync(work+'/supabase/config.toml')),manifest.localConfigSha256);
  for(const [name,digest] of Object.entries(manifest.baselineSources))assert.equal(hash(fs.readFileSync(work+'/supabase/migrations/'+name)),digest,'Replayed source changed');
  assert.equal(hash(fs.readFileSync(work+'/supabase/migrations/'+candidate)),candidateHash);
  const reset=fs.readFileSync(work+'/'+manifest.resetLog,'utf8');
  assert.match(reset,/Finished supabase db reset/,'A real successful CLI reset is mandatory');
  for(const name of ['noop-history.log','fresh-reconciliation-noop.log'])assert.match(fs.readFileSync(work+'/'+name,'utf8'),/up to date/i,'Real CLI no-op push missing');
  const gateway=read(work+'/gateway-reset-result.json');
  assert.equal(gateway.pass,true);assert.equal(gateway.storageRestartObserved,true);assert.equal(gateway.emptyOwnedLabVerified,true);assert.equal(gateway.productionChanges,0);
  const replay=read(work+'/replay-result.json');
  assert.equal(replay.pass,true);assert.equal(replay.cliResetSucceeded,true);assert.equal(replay.allSourceBytesUnchanged,true);assert.equal(replay.aliases,647);
  const originalVersions=Object.keys(manifest.baselineSources).sort().map(name=>name.match(/^\d+/)[0]);
  assert.deepEqual(replay.state.ledger,originalVersions);
  const project=manifest.localProject,container='supabase_db_'+project;
  assert.equal(project,'intake-ready-replay-476-v5-20261027');
  const db=JSON.parse(docker('inspect',container))[0];
  assert.equal(db.State.Running,true);assert.equal(db.Image,manifest.postgresImage);
  assert.deepEqual(Object.keys(db.NetworkSettings.Networks),[project]);
  assert.equal(JSON.parse(docker('network','inspect',project))[0].Internal,true);
  for(const bindings of Object.values(db.NetworkSettings.Ports))assert.equal(bindings?.length??0,0);
  const relay=JSON.parse(docker('inspect',project+'-relay'))[0];
  for(const bindings of Object.values(relay.NetworkSettings.Ports))for(const binding of bindings)assert.equal(binding.HostIp,'127.0.0.1');
  const sql=query=>execFileSync('docker',['exec','-i',container,'psql','-X','-qAt','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],{input:query,encoding:'utf8',timeout:120000,maxBuffer:64_000_000}).trim();
  const stateSql=`begin isolation level repeatable read read only;
select json_build_object('users',(select count(*) from auth.users),'copies',(select count(*) from vault_item_instances),'workers',current_setting('max_worker_processes'),
'cards',(select count(*) from card_prints),'aliases',(select count(*) from card_print_identity_aliases),
'cardDigest',(select encode(sha256(convert_to(coalesce(jsonb_agg(to_jsonb(t) order by id)::text,'[]'),'UTF8')),'hex') from card_prints t),
'setDigest',(select encode(sha256(convert_to(coalesce(jsonb_agg(to_jsonb(t) order by id)::text,'[]'),'UTF8')),'hex') from sets t),
'aliasDigest',(select encode(sha256(convert_to(coalesce(jsonb_agg(to_jsonb(t) order by id)::text,'[]'),'UTF8')),'hex') from card_print_identity_aliases t));rollback;`;
  const state=JSON.parse(sql(stateSql));
  assert.equal(state.users,0);assert.equal(state.copies,0);assert.equal(state.workers,'0');assert.equal(state.cards,1294);assert.equal(state.aliases,647);
  const retained=read(work+'/fresh-reconciliation-intent.json').before;
  assert.equal(state.cardDigest,retained.cards);assert.equal(state.setDigest,retained.sets);assert.equal(state.aliasDigest,retained.aliases);
  fs.mkdirSync(out);
  console.log('TARGET REMOTE READ ONLY https://ycdxbpibncqcchqiihfz.supabase.co; LOCAL isolated replay; no apply capability');
  const capture=(mode)=>{
    const result=spawnSync(process.execPath,[root+'/scripts/audits/intake_recovery/catalog_snapshot.mjs',mode],{cwd:root,env:{...process.env,INTAKE_CATALOG_AUDIT_DIR:out},encoding:'utf8',timeout:180000,maxBuffer:200000});
    fs.writeFileSync(out+'/'+mode+'.log',(result.stdout??'')+(result.stderr??''));assert.ifError(result.error);assert.equal(result.status,0,'Catalog qualification failed: '+mode);
  };
  capture('remote-final');capture('local-fresh');capture('compare-fresh-final');
  const remote=read(privateRoot+'/remote-final-catalog-snapshot.json'),local=read(privateRoot+'/local-fresh-catalog-snapshot.json');
  assert.equal(remote.read_only,'on');assert.equal(local.read_only,'on');
  assert.deepEqual(remote.LEDGER.map(row=>row.version),originalVersions,'Remote ledger drifted');
  assert.deepEqual(local.LEDGER.map(row=>row.version),versions,'Local ledger drifted');
  const parity=read(out+'/fresh-final-full-schema-parity.json');
  assert.equal(parity.pass,true);assert.equal(parity.reconciledBytes,0);assert.equal(parity.securitySame,true);assert.equal(parity.securityObjects,1331);
  const snapshotSql=fs.readFileSync(privateRoot+'/read-only-snapshot.sql','utf8');
  const unchanged=()=>assert.ok(isDeepStrictEqual(JSON.parse(sql(snapshotSql)),local),'Rollback changed schema, security or ledger');
  const statements=split(files[candidate].toString('utf8'));
  assert.equal(statements[0].toLowerCase(),'begin');assert.equal(statements.at(-1).toLowerCase(),'commit');
  const body=statements.slice(1,-1).join(';\n')+';\n';
  sql('begin;'+body+'rollback;');unchanged();
  sql('begin;'+body+body+'rollback;');unchanged();
  const fn=local.FUNCTIONS_QUERY.find(row=>row.schema==='public'&&row.name==='lot_label_public_read_v1');
  const drift=fn.full_definition.replace(fn.definition,fn.definition+'\n-- synthetic guard drift\n');assert.notEqual(drift,fn.full_definition);
  const rejected=(query,code)=>{let denied=false;try{sql(query);}catch(error){denied=true;assert.match(String(error.stderr),new RegExp(code));}assert.equal(denied,true);unchanged();};
  rejected('begin;'+drift+';'+body+'rollback;','baseline_reconciliation_function_drift');
  rejected("begin;drop index public.market_listing_price_events_slab_identity_idx;create index market_listing_price_events_slab_identity_idx on public.market_listing_price_events ((event_payload->>'synthetic_wrong_key'));"+body+'rollback;','baseline_reconciliation_index_drift');
  assert.ok(isDeepStrictEqual(JSON.parse(sql(stateSql)),state),'Local retained data changed');
  const report={at:new Date().toISOString(),phase,pass:true,scope:'exact_app_intake_baseline_reconciliation_only',head:git('rev-parse','HEAD'),sourceClean:git('status','--porcelain')==='',candidateSha256:candidateHash,manifestSha256:manifestHash,historicalFiles:476,remoteVersions:476,localVersions:477,genuineCliResetPassed:true,explicitSyntheticPrerequisite:true,remainingSqlBytes:0,securityObjects:1331,securitySame:true,guardTestsPassed:4,retainedDataUnchanged:true,remoteWrites:0,productionApplied:false};
  fs.writeFileSync(out+'/qualification.json',JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report));
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)main().catch(error=>{console.error(error.message);process.exitCode=1;});
