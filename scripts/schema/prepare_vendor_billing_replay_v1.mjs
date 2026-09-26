// Creates one new local billing baseline. No reset, remote apply or target options.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import {createHash} from 'node:crypto';
import {execFileSync, spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../../',import.meta.url));
const workdir=path.join(root,'.local/integration/billing-replay');
const project='grookai-vendor-billing-20260919';
const relay='grookai-vendor-billing-relay-20260919';
const hash=x=>createHash('sha256').update(x).digest('hex');
const docker=(...args)=>execFileSync('docker',args,{encoding:'utf8',windowsHide:true}).trim();
assert.equal(process.argv.length,2,'No target or reset arguments');
assert.equal(fs.realpathSync(root).replaceAll('\\','/').toLowerCase(),'c:/gv_store_billing_20260919');
assert.ok(!fs.existsSync(workdir),'Existing billing baseline must be preserved');
assert.equal(docker('ps','-a','--filter',`name=${project}`,'--format','{{.Names}}'),'');
assert.equal(docker('ps','-a','--filter',`name=${relay}`,'--format','{{.Names}}'),'');
assert.equal(docker('network','ls','--filter',`name=${project}`,'--format','{{.Name}}'),'');
assert.equal(docker('volume','ls','--filter',`name=${project}`,'--format','{{.Name}}'),'');
for(const port of [17221,17222,17224,17228,17240]) {
  const server=net.createServer();
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
  await new Promise(resolve=>server.close(resolve));
}
const source=path.join(root,'supabase/migrations');
const files=fs.readdirSync(source).filter(n=>/^\d+.*\.sql$/.test(n)).sort();
assert.equal(files.length,396,'Prepare reconciled baseline before authoring billing migration');
const expected=JSON.parse(fs.readFileSync('C:/gv_store_release_20260919/.local/integration/release-replay/preparation.json'));
const hashes=Object.fromEntries(files.map(n=>[n,hash(fs.readFileSync(path.join(source,n)))]));
const reconciled={...expected.sourceHashes,
 '20260919054500_one_piece_source_product_foil_scope_v1.sql':'147d694a57228a18e644377ccf71a07feeb565117f0b180da8fed56197a23e83'};
assert.deepEqual(hashes,reconciled,'Billing base differs from proven release chain and recovered applied migration');
const pending='20260919050000_vendor_storefront_release_v1.sql';
const original=fs.readFileSync('C:/gv_store_release_20260919/.local/integration/release-replay/supabase/config.toml','utf8');
assert.equal(hash(original),'934dc76595b2bac01ee6b5c73d80e7710dc5fc9b6463e15357eb8c40a0dd4211');
const config=original.replaceAll('grookai-storefront-release-20260919',project).replaceAll('1682','1722').replaceAll('15440','17240');
assert.ok(config.includes('max_worker_processes = 0')&&/enabled = false\r?\n/.test(config));
fs.mkdirSync(path.join(workdir,'supabase/migrations'),{recursive:true});
for(const name of files.filter(n=>n!==pending))fs.copyFileSync(path.join(source,name),path.join(workdir,'supabase/migrations',name),fs.constants.COPYFILE_EXCL);
fs.writeFileSync(path.join(workdir,'supabase/config.toml'),config,{flag:'wx'});
const relaySource=`import net from 'node:net';
for(const [port,service,targetPort] of [[17222,'db',5432],[17221,'kong',8000],[17224,'inbucket',8025]]) {
 net.createServer(source=>{const target=net.connect(targetPort,'supabase_'+service+'_${project}');
 source.on('error',()=>target.destroy());target.on('error',()=>source.destroy());
 source.on('close',()=>target.destroy());target.on('close',()=>source.destroy());
 source.pipe(target).pipe(source);}).listen(port,'0.0.0.0');
}
`;
fs.writeFileSync(path.join(workdir,'relay.mjs'),relaySource,{flag:'wx'});
const plan={project,root:workdir,databasePort:17222,network:project,sourceHashes:hashes,configSha256:hash(config),relaySha256:hash(relaySource),baselineCount:395,productionWrites:0};
fs.writeFileSync(path.join(workdir,'preparation.json'),JSON.stringify(plan,null,2),{flag:'wx'});
docker('network','create','--internal',project);
docker('create','--name',relay,'--network','bridge','-p','127.0.0.1:17221:17221','-p','127.0.0.1:17222:17222','-p','127.0.0.1:17224:17224','node:22-bookworm-slim','node','/relay.mjs');
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
assert.equal(receipt,'0|0|0|0|395');
console.log(JSON.stringify({project,status:'baseline_started',receipt,productionWrites:0,sharedResets:0}));
