// Official CLI only; upgrade the two newly owned513 clones without resetting any lab.
import fs from'node:fs';
import assert from'node:assert/strict';
import{createHash}from'node:crypto';
import{createRequire}from'node:module';
import{fileURLToPath}from'node:url';
import{execFileSync,spawnSync}from'node:child_process';
import{gzipSync}from'node:zlib';
const root=fileURLToPath(new URL('../../',import.meta.url));
const art='C:/grookai_vault_operator_artifacts/best_of_game_discovery_perf_20261120',prior='C:/grookai_vault_operator_artifacts/best_of_game_discovery_v2_20261120',project='bog-discovery-513-20261120';
const[profile,...extra]=process.argv.slice(2);assert.equal(extra.length,0);assert.ok(['fresh','retained'].includes(profile));
const database=profile==='fresh'?'bog_perf_fresh_513_v3':'bog_perf_retained_513_v3',out=art+'/'+profile+'-upgrade-v5',packet=art+'/local-cli-packet-v5';
assert.equal(fs.existsSync(out),false);fs.mkdirSync(out);
const sha=b=>createHash('sha256').update(b).digest('hex'),read=f=>JSON.parse(fs.readFileSync(f,'utf8').replace(/^\uFEFF/,''));
const binding=read(root+'/scripts/schema/best_of_game_discovery_candidate_v6.json'),sources={...binding.history,...binding.candidates};
assert.equal(Object.keys(sources).length,516);
for(const[f,h]of Object.entries(sources))assert.equal(sha(fs.readFileSync(root+'/supabase/migrations/'+f)),h);
for(const f of ['clones-v3-r1/result.json','actual-catalog-function-smoke-v1/result.json','rollback-v8-r1/result.json','writer-guards-v6/result.json','fullsize-v7-r1/result.json','catalog-fullsize-v7-r1/result.json'])assert.equal(read(art+'/'+f).pass,true,f);
assert.equal(read(art+'/fullsize-v7-r1/result.json').candidateSha256,binding.candidateBundleSha256);
assert.equal(read(art+'/catalog-fullsize-v7-r1/result.json').candidateSha256,binding.candidateBundleSha256);
assert.equal(read(prior+'/fresh-513/replay-proof.json').cliPrefixResetSucceeded,true);
assert.equal(read(prior+'/fresh-upgrade-v2/result.json').pass,true);assert.equal(read(prior+'/retained-upgrade-v2/result.json').pass,true);
const info=JSON.parse(execFileSync('docker',['inspect','supabase_db_'+project],{encoding:'utf8',windowsHide:true}))[0];
assert.equal(info.State.Running,true);assert.deepEqual(Object.keys(info.NetworkSettings.Networks),[project]);
assert.equal(JSON.parse(execFileSync('docker',['network','inspect',project],{encoding:'utf8',windowsHide:true}))[0].Internal,true);
if(!fs.existsSync(packet)){
 fs.mkdirSync(packet);fs.mkdirSync(packet+'/supabase');fs.mkdirSync(packet+'/supabase/migrations');
 fs.copyFileSync(prior+'/fresh-513/supabase/config.toml',packet+'/supabase/config.toml',fs.constants.COPYFILE_EXCL);
 for(const f of Object.keys(sources))fs.copyFileSync(root+'/supabase/migrations/'+f,packet+'/supabase/migrations/'+f,fs.constants.COPYFILE_EXCL);
 fs.writeFileSync(packet+'/source-packet.json',JSON.stringify({version:'BEST_OF_GAME_LOCAL_513_TO_516_V5',sources,candidateBundleSha256:binding.candidateBundleSha256,project,productionLinked:false},null,2)+'\n',{flag:'wx'});
}
assert.equal(fs.existsSync(packet+'/supabase/.temp/project-ref'),false);
assert.deepEqual(fs.readdirSync(packet+'/supabase/migrations').sort(),Object.keys(sources).sort());
for(const[f,h]of Object.entries(sources))assert.equal(sha(fs.readFileSync(packet+'/supabase/migrations/'+f)),h);
assert.equal(execFileSync('supabase',['--version'],{encoding:'utf8',stdio:['ignore','pipe','ignore'],windowsHide:true}).trim(),'2.90.0');
const r=createRequire(root+'/package.json'),c=new(r('pg').Client)({host:'127.0.0.1',port:55040,user:'postgres',password:'postgres',database,connectionTimeoutMillis:15000,application_name:'bog-local-516-cli-upgrade-'+profile});
const save=(n,v)=>fs.writeFileSync(out+'/'+n+'.private.json.gz',gzipSync(Buffer.from(JSON.stringify(v))),{flag:'wx'});
const fingerprint=async()=>(await c.query('select prismatic_fixture.fingerprints() value')).rows[0].value;
const ledger=async()=>(await c.query('select version from supabase_migrations.schema_migrations order by version')).rows.map(x=>x.version);
const versions=o=>Object.keys(o).sort().map(f=>f.match(/^\d+/)[0]);
const report={pass:false,productionWrites:0,sourceReset:false,startedAt:new Date().toISOString(),profile,database,candidateSha256:binding.candidateBundleSha256,replayLineageExplicit:true,newEmpty516ResetClaimed:false};
function cli(label,dry=false){
 const env={...process.env,DO_NOT_TRACK:'1'};for(const k of Object.keys(env))if(/SUPABASE|DATABASE_URL|POSTGRES_URL|^PG/.test(k))delete env[k];
 const fd=fs.openSync(out+'/'+label+'.log','wx');let result;
 try{result=spawnSync('supabase',['db','push','--db-url','postgresql://postgres:postgres@127.0.0.1:55040/'+database,'--yes',...(dry?['--dry-run']:[]),'--workdir',packet,'--network-id',project],{cwd:packet,env,windowsHide:true,timeout:180000,stdio:['ignore',fd,fd]});}finally{fs.closeSync(fd);}
 assert.ifError(result.error);assert.equal(result.status,0,label+' failed; retain intent and inspect exact ledger before any continuation');
 const names=[...new Set(fs.readFileSync(out+'/'+label+'.log','utf8').match(/\b\d{14}_[a-z0-9_]+\.sql\b/g)??[])].sort();
 assert.deepEqual(names,label==='noop-516'?[]:Object.keys(binding.candidates).sort());
}
try{
 await c.connect();assert.equal((await c.query("select current_setting('max_worker_processes') n")).rows[0].n,'0');assert.deepEqual(await ledger(),versions(binding.history));
 const before=await fingerprint();save('before-fingerprints',before);
 const aliases=(await c.query('select to_jsonb(a) value from public.card_print_identity_aliases a order by id')).rows.map(x=>x.value);assert.equal(aliases.length,656);save('before-aliases',aliases);
 for(const[name,file]of[['catalog','reviewed_intake_public_catalog_v1.sql'],['security','vendor_pricing_security_snapshot_v1.sql']])save('before-'+name,(await c.query(fs.readFileSync(root+'/scripts/schema/'+file,'utf8'))).find(x=>x.rows?.[0]?.receipt).rows[0].receipt);
 report.stage='official_cli_dry_run';cli('dry-run-516',true);assert.deepEqual(await ledger(),versions(binding.history));
 fs.writeFileSync(out+'/upgrade-intent.json',JSON.stringify({...report,consumed:true,exactLocalTarget:true,sources},null,2)+'\n',{flag:'wx'});
 report.stage='official_cli_upgrade';cli('push-516');assert.deepEqual(await ledger(),versions(sources));
 const after=await fingerprint();save('after-fingerprints',after);assert.deepEqual(after,before);
 assert.deepEqual((await c.query('select to_jsonb(a) value from public.card_print_identity_aliases a order by id')).rows.map(x=>x.value),aliases);
 report.stage='official_cli_noop';cli('noop-516');assert.deepEqual(await fingerprint(),before);
 for(const[name,file]of[['catalog','reviewed_intake_public_catalog_v1.sql'],['security','vendor_pricing_security_snapshot_v1.sql']])save(name,(await c.query(fs.readFileSync(root+'/scripts/schema/'+file,'utf8'))).find(x=>x.rows?.[0]?.receipt).rows[0].receipt);
 Object.assign(report,{pass:true,ledger:516,officialCliDryRun:true,officialCliUpgrade:true,officialCliNoop:true,protectedTables:Object.keys(before).length,changedDataTables:[],retainedAll656AliasesExact:true,all516SourceBytesExact:true});
}catch(e){report.error=e.message;process.exitCode=1;}finally{await c.end().catch(()=>{});report.finishedAt=new Date().toISOString();fs.writeFileSync(out+'/result.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));}
