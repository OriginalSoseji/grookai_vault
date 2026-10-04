// One-use additive421->422 CLI upgrade of the already populated local V23 lab.
// No new containers, reset, reseed, remote database URL, or registry edits.
import fs from 'node:fs';import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';import {execFileSync,spawnSync} from 'node:child_process';
import pg from 'pg';import {snapshotSql,compareSnapshots} from './vendor_billing_schema_v1.mjs';
const base='C:/grookai_vault_operator_artifacts/jungle_edition_pricing_20261001';
const fixture=base+'/upgrade-421-v23',out=base+'/retained-slab-upgrade-v1';
const project='jungle-edition-upgrade-421-v23-20261001',migration='20261002010000_jungle_slab_atomic_intake_v1.sql';
const sha=b=>createHash('sha256').update(b).digest('hex'),read=p=>JSON.parse(fs.readFileSync(p));
const docker=(...a)=>execFileSync('docker',a,{encoding:'utf8',windowsHide:true,timeout:20000,maxBuffer:2*1024*1024});
assert.equal(process.argv.length,2);assert.equal(fs.realpathSync('.').replaceAll('\\','/').toLowerCase(),'c:/gv_jungle_edition_20261001');
assert.ok(!fs.existsSync(out),'Consumed upgrade intent cannot be reused');
const baseline=read(base+'/jungle-slab-baseline-414-latest.json'),freeze=read(fixture+'/freeze.json');
assert.equal(baseline.status,'passed');assert.equal(baseline.migrations,414);assert.equal(baseline.candidateMigrations,422);
assert.ok(Date.now()-Date.parse(baseline.at)<6*3600000);assert.equal(read(fixture+'/upgrade-result.json').status,'passed');
assert.equal(freeze.project,project);assert.equal(sha(fs.readFileSync(fixture+'/supabase/config.toml')),freeze.configSha256);
assert.ok(!fs.existsSync(fixture+'/supabase/.temp/project-ref'));assert.ok(!fs.existsSync(fixture+'/supabase/migrations/'+migration));
for(const [name,h]of Object.entries(baseline.sourceHashes))assert.equal(sha(fs.readFileSync('supabase/migrations/'+name)),h);
for(const [name,h]of Object.entries(freeze.sourceHashes))assert.equal(sha(fs.readFileSync(fixture+'/supabase/migrations/'+name)),h);
const db=JSON.parse(docker('inspect','supabase_db_'+project))[0],relay=JSON.parse(docker('inspect',project+'-relay'))[0];
assert.equal(db.State.Running,true);assert.equal(db.Config.Image,'public.ecr.aws/supabase/postgres:17.6.1.113');
assert.deepEqual(Object.keys(db.NetworkSettings.Networks),[project]);assert.equal(JSON.parse(docker('network','inspect',project))[0].Internal,true);
const address=db.NetworkSettings.Networks[project].IPAddress;assert.match(address,/^10\.248\.16\.[2-9][0-9]*$/);
assert.equal(relay.State.Running,true);assert.equal(relay.Config.Image,'node:22-bookworm-slim');
assert.deepEqual(Object.keys(relay.NetworkSettings.Networks).sort(),['bridge',project].sort());
for(const entries of Object.values(relay.HostConfig.PortBindings))for(const entry of entries)assert.equal(entry.HostIp,'127.0.0.1');
assert.equal(docker('exec',project+'-relay','cat','/relay.mjs').trim(),fs.readFileSync(fixture+'/relay.mjs','utf8').trim());
const c=new pg.Client({host:'127.0.0.1',port:65520,user:'postgres',password:'postgres',database:'postgres',connectionTimeoutMillis:10000,statement_timeout:120000});
await c.connect();fs.mkdirSync(out);const save=(p,v)=>fs.writeFileSync(out+'/'+p,JSON.stringify(v,null,2),{flag:'wx'});
const query=async(sql,args)=>(await c.query(sql,args)).rows;
const schema=async()=>(await c.query(snapshotSql)).find(r=>r.rows?.[0]?.receipt).rows[0].receipt;
const env={...process.env,DO_NOT_TRACK:'1'};for(const k of Object.keys(env))if(/SUPABASE|DATABASE_URL|POSTGRES_URL/.test(k))delete env[k];
function cli(label){const fd=fs.openSync(out+'/'+label+'.private.log','wx');let r;
 try{r=spawnSync('supabase',['db','push','--local','--yes','--workdir',fixture,'--network-id',project],{cwd:fixture,env,windowsHide:true,timeout:180000,stdio:['ignore',fd,fd]});}finally{fs.closeSync(fd);}
 assert.ifError(r.error);assert.equal(r.status,0,label+' failed; preserve consumed intent');
}
try{
 const target=(await query("select host(inet_server_addr()) address,current_setting('max_worker_processes') workers,(select count(*)::int from supabase_migrations.schema_migrations) migrations"))[0];
 assert.deepEqual(target,{address,workers:'0',migrations:421});
 save('runtime.json',{at:new Date().toISOString(),project,target,dbId:db.Id,relayId:relay.Id,localOnly:true,newContainers:0});
 assert.equal((await query('select count(*)::int n from public.vault_item_instances'))[0].n,2);
 const tables=await query("select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' order by c.relname");
 const footprintSql=tables.map(({relname:n})=>`select '${n}' table_name,count(*)::int rows,md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by md5(to_jsonb(t)::text)),'')) digest from public."${n}" t`).join(' union all ')+' order by table_name';
 const footprints=await query(footprintSql);save('before-footprints.json',footprints);
 const before=await schema();save('before-schema.private.json',before);
 await compareSnapshots(before,read(fixture+'/upgraded.private.json'),{output:out+'/prior-parity'});
 const retainedSql="select json_build_object('copies',(select json_agg(t order by id) from vault_item_instances t),'anchors',(select json_agg(t order by id) from vault_items t),'owners',(select json_agg(t order by user_id) from vault_owners t),'cards',(select json_agg(t order by id) from card_prints t),'sets',(select json_agg(t order by id) from sets t)) receipt";
 const retained=(await query(retainedSql))[0].receipt;assert.deepEqual(retained,read(fixture+'/before-upgrade.private.json'));
 save('before-retained.private.json',retained);
 save('intent.json',{at:new Date().toISOString(),project,from:421,to:422,migration,sha256:baseline.sourceHashes[migration],consumed:true,reset:false,productionWrites:0});
 fs.copyFileSync('supabase/migrations/'+migration,fixture+'/supabase/migrations/'+migration,fs.constants.COPYFILE_EXCL);
 cli('upgrade');cli('push-noop');
 assert.deepEqual((await query('select version from supabase_migrations.schema_migrations order by version')).map(r=>r.version),Object.keys(baseline.sourceHashes).map(n=>n.split('_')[0]).sort());
 assert.deepEqual(await query(footprintSql),footprints);assert.deepEqual((await query(retainedSql))[0].receipt,retained);
 assert.equal((await query('select count(*)::int n from public.jungle_slab_intake_receipts_v1'))[0].n,0);
 const after=await schema();save('after-schema.private.json',after);save('after-footprints.json',await query(footprintSql));
 const receipt={at:new Date().toISOString(),status:'passed',project,migrations:422,retainedCopies:2,allExistingRowsUnchanged:true,protectedPublicTables:tables.length,noOpPush:true,resetsAfterPopulation:0,newContainers:0,productionWrites:0,full422ParityPending:true,migrationSha256:baseline.sourceHashes[migration],sourceSha256:sha(fs.readFileSync(new URL(import.meta.url))),out};
 save('receipt.json',receipt);console.log(JSON.stringify(receipt));
}catch(e){save('failure.json',{at:new Date().toISOString(),message:e.message,stack:e.stack});throw e;}finally{await c.end();}
