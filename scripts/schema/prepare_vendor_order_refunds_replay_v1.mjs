// One new synthetic baseline; no reset, remote target or command arguments.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import {spawnSync} from 'node:child_process';
import {root,fixture,project,relay,pending,addition,hash,docker,sourceState,guard} from './vendor_order_refunds_runtime_v1.mjs';
assert.equal(process.argv.length,2);const source=sourceState();delete source[addition];assert.equal(Object.keys(source).length,407);
assert.ok(!fs.existsSync(fixture),'Preserve an existing project');
for(const kind of ['ps','network','volume']) {
  const args=kind==='ps'?['ps','-a']: [kind,'ls'];
  assert.equal(docker(...args,'--filter',`name=${project}`,'--format',kind==='ps'?'{{.Names}}':'{{.Name}}'),'');
}
assert.equal(docker('ps','-a','--filter',`name=${relay}`,'--format','{{.Names}}'),'');
for(const port of [22821,22822,22824,22828,22840]) {
  const server=net.createServer();await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});await new Promise(resolve=>server.close(resolve));
}
const original=fs.readFileSync('C:/gv_store_index_reconcile_20260919/.local/integration/index-replay/supabase/config.toml','utf8');
assert.equal(hash(original),'00f2f93f4ce4a861d131aee69f6527232a8664f28d2c6a3f0cb2f0fd0de7c14d');
const config=original.replaceAll('grookai-store-index-reconcile-20260919',project).replaceAll('180','228');
assert.ok(config.includes('max_worker_processes = 0'));
fs.mkdirSync(path.join(fixture,'supabase/migrations'),{recursive:true});
for(const name of Object.keys(source).filter(n=>![...pending,addition].includes(n)))fs.copyFileSync(path.join(root,'supabase/migrations',name),path.join(fixture,'supabase/migrations',name),fs.constants.COPYFILE_EXCL);
fs.writeFileSync(path.join(fixture,'supabase/config.toml'),config,{flag:'wx'});
fs.mkdirSync(path.join(fixture,'supabase/.temp'));fs.writeFileSync(path.join(fixture,'supabase/.temp/postgres-version'),'17.6.1.113',{flag:'wx'});
const bridge=`import net from 'node:net';
for(const [port,service,targetPort] of [[22822,'db',5432],[22821,'kong',8000],[22824,'inbucket',8025]]) {
 net.createServer(source=>{const target=net.connect(targetPort,'supabase_'+service+'_${project}');
 source.on('error',()=>target.destroy());target.on('error',()=>source.destroy());
 source.on('close',()=>target.destroy());target.on('close',()=>source.destroy());
 source.pipe(target).pipe(source);}).listen(port,'0.0.0.0');
}`;
fs.writeFileSync(path.join(fixture,'relay.mjs'),bridge,{flag:'wx'});
fs.writeFileSync(path.join(fixture,'preparation.json'),JSON.stringify({project,databasePort:22822,sourceHashes:source,configSha256:hash(config),relaySha256:hash(bridge)},null,2),{flag:'wx'});
docker('network','create','--internal',project);
docker('create','--name',relay,'--network','bridge','-p','127.0.0.1:22821:22821','-p','127.0.0.1:22822:22822','-p','127.0.0.1:22824:22824','node:22-bookworm-slim','node','/relay.mjs');
docker('cp',path.join(fixture,'relay.mjs'),`${relay}:/relay.mjs`);docker('network','connect',project,relay);docker('start',relay);
const env={...process.env};for(const key of Object.keys(env))if(/SUPABASE|DATABASE_URL|POSTGRES_URL/.test(key))delete env[key];
const run=spawnSync('supabase',['start','--workdir',fixture,'--network-id',project,'--exclude','realtime,imgproxy,postgres-meta,studio,edge-runtime,logflare,vector,supavisor'],{env,encoding:'utf8',windowsHide:true,timeout:600000,maxBuffer:32*1024*1024});
fs.writeFileSync(path.join(fixture,'start-private.log'),(run.stdout??'')+(run.stderr??''),{flag:'wx'});
assert.equal(run.status,0,'Inspect the retained local log; do not reset on timeout');
console.log(JSON.stringify({status:'baseline_started',...guard(),productionWrites:0,sharedResets:0}));
