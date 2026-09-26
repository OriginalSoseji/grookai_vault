// Creates the isolated 180xx baseline for the recovered applied index. No reset, remote apply or target options.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import {createHash} from 'node:crypto';
import {execFileSync, spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../../',import.meta.url));
const workdir=path.join(root,'.local/integration/index-replay');
const project='grookai-store-index-reconcile-20260919';
const relay='grookai-store-index-relay-20260919';
const hash=x=>createHash('sha256').update(x).digest('hex');
const docker=(...args)=>execFileSync('docker',args,{encoding:'utf8',windowsHide:true}).trim();
assert.equal(process.argv.length,2,'No target or reset arguments');
assert.equal(fs.realpathSync(root).replaceAll('\\','/').toLowerCase(),'c:/gv_store_index_reconcile_20260919');
assert.ok(!fs.existsSync(workdir),'Existing billing baseline must be preserved');
assert.equal(docker('ps','-a','--filter',`name=${project}`,'--format','{{.Names}}'),'');
assert.equal(docker('ps','-a','--filter',`name=${relay}`,'--format','{{.Names}}'),'');
assert.equal(docker('network','ls','--filter',`name=${project}`,'--format','{{.Name}}'),'');
assert.equal(docker('volume','ls','--filter',`name=${project}`,'--format','{{.Name}}'),'');
for(const port of [18021,18022,18024,18028,18040]) {
  const server=net.createServer();
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
  await new Promise(resolve=>server.close(resolve));
}
const source=path.join(root,'supabase/migrations');
const files=fs.readdirSync(source).filter(n=>/^\d+.*\.sql$/.test(n)).sort();
assert.equal(files.length,398,'Only the exact recovered index may extend the combined candidate');
const expected=JSON.parse(fs.readFileSync('C:/gv_store_billing_20260919/.local/integration/billing-runtime/patched-preparation.json'));
const hashes=Object.fromEntries(files.map(n=>[n,hash(fs.readFileSync(path.join(source,n)))]));
const recovered='20260919100500_market_price_pipeline_candidate_card_reference_index_v1.sql';
assert.deepEqual(hashes,{...expected.sourceHashes,[recovered]:'68d9710cf2b78cda2f7cbaadf419ed89f31b0ec9a61b109dcada0cc2b457ebc0'});
const pending=['20260919050000_vendor_storefront_release_v1.sql','20260919080000_vendor_stripe_billing_v1.sql'];
const original=fs.readFileSync('C:/gv_store_billing_20260919/.local/integration/billing-replay/supabase/config.toml','utf8');
assert.equal(hash(original),'8624ef18a63b95faf3d9bd910c711436e17894e0318577abd0005dd365094ab8');
const config=original.replaceAll('grookai-vendor-billing-20260919',project).replaceAll('172','180');
assert.ok(config.includes('max_worker_processes = 0')&&/enabled = false\r?\n/.test(config));
fs.mkdirSync(path.join(workdir,'supabase/migrations'),{recursive:true});
for(const name of files.filter(n=>!pending.includes(n)))fs.copyFileSync(path.join(source,name),path.join(workdir,'supabase/migrations',name),fs.constants.COPYFILE_EXCL);
fs.writeFileSync(path.join(workdir,'supabase/config.toml'),config,{flag:'wx'});
fs.mkdirSync(path.join(workdir,'supabase/.temp'),{recursive:true});
fs.writeFileSync(path.join(workdir,'supabase/.temp/postgres-version'),'17.6.1.113',{flag:'wx'});
const relaySource=`import net from 'node:net';
for(const [port,service,targetPort] of [[18022,'db',5432],[18021,'kong',8000],[18024,'inbucket',8025]]) {
 net.createServer(source=>{const target=net.connect(targetPort,'supabase_'+service+'_${project}');
 source.on('error',()=>target.destroy());target.on('error',()=>source.destroy());
 source.on('close',()=>target.destroy());target.on('close',()=>source.destroy());
 source.pipe(target).pipe(source);}).listen(port,'0.0.0.0');
}
`;
fs.writeFileSync(path.join(workdir,'relay.mjs'),relaySource,{flag:'wx'});
const plan={project,root:workdir,databasePort:18022,network:project,sourceHashes:hashes,configSha256:hash(config),relaySha256:hash(relaySource),baselineCount:396,productionWrites:0};
fs.writeFileSync(path.join(workdir,'preparation.json'),JSON.stringify(plan,null,2),{flag:'wx'});
docker('network','create','--internal',project);
docker('create','--name',relay,'--network','bridge','-p','127.0.0.1:18021:18021','-p','127.0.0.1:18022:18022','-p','127.0.0.1:18024:18024','node:22-bookworm-slim','node','/relay.mjs');
docker('cp',path.join(workdir,'relay.mjs'),`${relay}:/relay.mjs`);
docker('network','connect',project,relay);docker('start',relay);
const env={...process.env};for(const key of Object.keys(env))if(/SUPABASE|DATABASE_URL|POSTGRES_URL/.test(key))delete env[key];
const run=spawnSync('supabase',['start','--workdir',workdir,'--network-id',project,'--exclude','realtime,imgproxy,postgres-meta,studio,edge-runtime,logflare,vector,supavisor'],{env,encoding:'utf8',windowsHide:true,timeout:600000,maxBuffer:32*1024*1024});
fs.writeFileSync(path.join(workdir,'start-private.log'),(run.stdout??'')+(run.stderr??''),{flag:'wx'});
assert.equal(run.status,0,'Local start failed; inspect private log without resetting');
const state=JSON.parse(docker('inspect',`supabase_db_${project}`))[0];
assert.equal(state.State.Running,true);assert.deepEqual(Object.keys(state.NetworkSettings.Networks),[project]);
const sql="select current_setting('max_worker_processes')||'|'||(select count(*) from auth.users)||'|'||(select count(*) from public.card_prints)||'|'||(select count(*) from cron.job_run_details)||'|'||(select count(*) from supabase_migrations.schema_migrations);";
const receipt=execFileSync('docker',['exec','-i',`supabase_db_${project}`,'psql','-U','postgres','-d','postgres','-X','-qAt','-v','ON_ERROR_STOP=1'],{input:sql,encoding:'utf8',windowsHide:true}).trim();
assert.equal(receipt,'0|0|0|0|396');
console.log(JSON.stringify({project,status:'baseline_started',receipt,productionWrites:0,sharedResets:0}));
