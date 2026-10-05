// Read-only qualification for the exact Collectr 426 -> 427 migration.
// Existing populated replay and upgrade databases must never be reset here.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import pg from 'pg';
import {snapshotSql,compareSnapshots} from './vendor_billing_schema_v1.mjs';

export const sealedRelease = Object.freeze({
  root:'C:/gv_collectr_adventure_20261001',
  evidence:'C:/grookai_vault_operator_artifacts/collectr_sealed_save_20261005',
  target:'ycdxbpibncqcchqiihfz',
  migration:'20261005080000_collectr_sealed_import_v3.sql',
  migrationSha256:'f507d243d389db85c3430fa983c1a202f402ecce2b25beef0cd9c2c088a39f26',
});
export function validateSealedReleaseArguments(args) {
  assert.equal(args.length,1,'Use AuditLinkedSchema or PrePush only');
  assert.ok(['AuditLinkedSchema','PrePush'].includes(args[0]),'No apply operation or target override');
  return args[0];
}
export function validateSealedMigrationSources(sources,baseline) {
  assert.equal(Object.keys(sources).length,427);
  assert.equal(Object.keys(baseline).length,426);
  assert.equal(new Set(Object.keys(sources).map(n=>n.split('_')[0])).size,427,'Duplicate migration timestamp');
  for(const [name,digest] of Object.entries(baseline))assert.equal(sources[name],digest,name);
  assert.deepEqual(Object.keys(sources).filter(name=>!Object.hasOwn(baseline,name)),[sealedRelease.migration]);
  assert.equal(sources[sealedRelease.migration],sealedRelease.migrationSha256);
}
export async function verifyCollectrSealedRelease(phase) {
  validateSealedReleaseArguments([phase]);
  const {root,evidence,target,migration}=sealedRelease;
  assert.equal(fs.realpathSync('.').replaceAll('\\','/').toLowerCase(),root.toLowerCase());
  const read=p=>JSON.parse(fs.readFileSync(p));
  const hash=b=>createHash('sha256').update(b).digest('hex');
  const git=(...a)=>execFileSync('git',a,{cwd:root,encoding:'utf8',windowsHide:true}).trim();
  const sources=Object.fromEntries(fs.readdirSync(root+'/supabase/migrations').filter(n=>n.endsWith('.sql')).sort().map(n=>[n,hash(fs.readFileSync(root+'/supabase/migrations/'+n))]));
  const baseline=read('C:/grookai_vault_operator_artifacts/jungle_edition_pricing_20261001/full-426-v37/freeze.json');
  validateSealedMigrationSources(sources,baseline.sourceHashes);
  const web=read(evidence+'/WEB_CHECKPOINT.json');
  assert.equal(web.status,'WEB_INTEGRATION_LOCALLY_VERIFIED_NOT_RELEASED');
  // Documentation can record release progress; every qualified implementation
  // and test byte remains bound to the actual browser/SQL qualification.
  for(const [name,digest] of Object.entries(web.sourceHashes))if(name!=='AGENTS.md'&&!name.startsWith('docs/'))assert.equal(hash(fs.readFileSync(root+'/'+name)),digest,name);
  const browser=read(evidence+'/'+web.verification.webResult);
  assert.equal(browser.status,'passed');assert.equal(browser.checks.length,9);assert.equal(browser.priorRowsUnchanged,true);assert.equal(browser.productionWrites,0);
  const backend=read(evidence+'/CHECKPOINT.json');
  const atomic=read(evidence+'/'+backend.verification.atomicFile);
  assert.equal(backend.migrationSha256,sealedRelease.migrationSha256);
  assert.equal(backend.verification.sqlAssertions,22);assert.equal(atomic.status,'passed');assert.equal(atomic.checks.length,22);
  const full=read(evidence+'/full-427-v2/replay-result.json'),upgrade=read(evidence+'/upgrade-427-v2/upgrade-result.json');
  assert.equal(full.status,'passed');assert.equal(full.migrations,427);assert.equal(full.fullReplay,true);assert.equal(full.noOpPush,true);
  assert.equal(upgrade.status,'passed');assert.equal(upgrade.migrations,427);assert.equal(upgrade.allFixtureRowsUnchanged,true);assert.equal(upgrade.retainedCopies,2);assert.equal(upgrade.comparison.rawBytes,0);assert.equal(upgrade.comparison.securityObjects,1161);
  if(phase==='PrePush'){
    assert.equal(git('status','--porcelain'),'','Committed clean source required');
    git('merge-base','--is-ancestor','origin/main','HEAD');
    const hook=read(evidence+'/normal-hook-latest.json');
    assert.equal(hook.status,'passed');assert.equal(hook.normalHooks,true);assert.equal(hook.exitCode,0);assert.equal(hook.head,git('rev-parse','HEAD'));
    const age=Date.now()-Date.parse(hook.at);assert.ok(age>=0&&age<7200000,'Fresh normal hook receipt required');
    assert.equal(hash(fs.readFileSync(hook.log)),hook.logSha256);
  }
  const out=evidence+'/release-gate-'+phase+'-'+Date.now();fs.mkdirSync(out);
  const save=(name,value)=>fs.writeFileSync(out+'/'+name,JSON.stringify(value,null,2),{flag:'wx'});
  const docker=(...args)=>execFileSync('docker',args,{encoding:'utf8',windowsHide:true,timeout:60000,maxBuffer:96*1024*1024});
  const clean=read(evidence+'/full-427-v2/replayed.private.json');
  const canonical=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
  const sorted=rows=>(rows??[]).map(canonical).sort();
  for(const mode of ['full','upgrade']){
    const lab=evidence+'/'+mode+'-427-v2',project='collectr-sealed-'+mode+'-427-v2-20261005',container='supabase_db_'+project;
    const freeze=read(lab+'/freeze.json');assert.deepEqual(freeze.sourceHashes,sources);assert.equal(freeze.project,project);assert.equal(hash(fs.readFileSync(lab+'/supabase/config.toml')),freeze.configSha256);
    assert.ok(!fs.existsSync(lab+'/supabase/.temp/project-ref'),'Local proof must not be linked');
    const db=JSON.parse(docker('inspect',container))[0];assert.equal(db.State.Running,true);assert.deepEqual(Object.keys(db.NetworkSettings.Networks),[project]);
    const network=JSON.parse(docker('network','inspect',project))[0];assert.equal(network.Internal,true);
    assert.equal(network.IPAM.Config[0].Subnet,mode==='full'?'10.245.138.0/24':'10.245.139.0/24');
    const sql=query=>JSON.parse(execFileSync('docker',['exec','-i',container,'psql','-U','postgres','-d','postgres','-X','-qAt','-v','ON_ERROR_STOP=1'],{input:query,encoding:'utf8',windowsHide:true,timeout:180000,maxBuffer:96*1024*1024}));
    const state=sql("begin read only; select json_build_object('workers',current_setting('max_worker_processes'),'jobs',(select count(*) from cron.job_run_details));commit;");
    assert.equal(state.workers,'0');assert.equal(state.jobs,0);
    const current=sql(snapshotSql);assert.equal(current.read_only,'on');assert.deepEqual(current.LEDGER,Object.keys(sources).map(n=>({version:n.split('_')[0]})));
    save(mode+'-schema.private.json',current);await compareSnapshots(current,clean,{output:out+'/'+mode});
    const old=mode==='full'?read(evidence+'/'+web.verification.webResult.replace('result.json','after.private.json')):read(lab+'/before-upgrade.private.json');
    const tables=mode==='full'?Object.fromEntries(Object.keys(old).map(n=>[n,n])):{copies:'vault_item_instances',anchors:'vault_items',owners:'vault_owners',cards:'card_prints',sets:'sets'};
    // Match the original evidence's transport: browser fixtures were captured
    // with pg (numeric strings and Date values); upgrade fixtures used SQL JSON.
    const client=mode==='full'?new pg.Client({host:'127.0.0.1',port:58680,user:'postgres',password:'postgres',database:'postgres',options:'-c default_transaction_read_only=on -c statement_timeout=30000'}):null;
    if(client)await client.connect();
    try{
      if(client)assert.equal((await client.query('select host(inet_server_addr()) a')).rows[0].a,db.NetworkSettings.Networks[project].IPAddress);
      for(const [key,table]of Object.entries(tables)){
        assert.match(table,/^[a-z_][a-z_0-9]*$/);
        const rows=client?(await client.query('select * from public.'+table)).rows:sql('begin read only; select coalesce(json_agg(t),\'[]\'::json) from public.'+table+' t;commit;');
        assert.equal(hash(sorted(rows).join('\n')),hash(sorted(old[key]).join('\n')),mode+' retained '+table);
      }
    }finally{if(client)await client.end();}
  }
  const {query,ref}=await import('../release/storefront_production_live_common_v1.mjs');assert.equal(ref,target);
  const remote=(await query(snapshotSql))[0].receipt;assert.equal(remote.read_only,'on');save('remote.private.json',remote);
  assert.deepEqual(remote.LEDGER,Object.keys(baseline.sourceHashes).map(n=>({version:n.split('_')[0]})));
  assert.ok(remote.sanity.cards>=40000&&remote.sanity.sets>=150&&remote.sanity.traits>=5000);
  const baselineSchema=read('C:/grookai_vault_operator_artifacts/jungle_edition_pricing_20261001/full-426-v37/replayed.private.json');
  const comparison=await compareSnapshots(baselineSchema,remote,{reconcile:true,output:out+'/production'});
  const toolPaths=['scripts/schema/verify_collectr_sealed_release_v1.mjs','scripts/migration_preflight_strict.ps1','scripts/release/prepare_collectr_sealed_cli_v1.mjs'];
  const result={status:'passed',at:new Date().toISOString(),phase,target,migrations:426,candidateMigrations:427,pending:[migration.split('_')[0]],sourceHashes:sources,sourceTree:git('write-tree'),commit:git('rev-parse','HEAD'),toolHashes:Object.fromEntries(toolPaths.map(p=>[p,hash(fs.readFileSync(root+'/'+p))])),comparison,baseline:out,baselineReceiptSha256:hash(fs.readFileSync(out+'/remote.private.json')),productionWrites:0,retainedFixtureResets:0,applyAuthority:false,out};
  save('receipt.json',result);fs.writeFileSync(evidence+'/Release-'+phase+'.json',JSON.stringify(result,null,2));
  console.log(JSON.stringify({status:'passed',phase,migrations:426,candidateMigrations:427,securityObjects:comparison.securityObjects,out}));
  return result;
}
if(process.argv[1]&&fs.realpathSync(process.argv[1])===fs.realpathSync(fileURLToPath(import.meta.url)))await verifyCollectrSealedRelease(validateSealedReleaseArguments(process.argv.slice(2)));
