// Dedicated synthetic production-integration lab. Never resets or targets remote DBs.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import {createHash} from 'node:crypto';
import {execFileSync, spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

export const root=fileURLToPath(new URL('../../',import.meta.url));
export const project='grookai-store-team-20260927';
export const fixture=path.join(root,'.local/integration/store-team-lab-v1');
export const container=`supabase_db_${project}`;
export const relay=`${project}-relay`;
export const hash=x=>createHash('sha256').update(x).digest('hex');
export const docker=(...args)=>execFileSync('docker',args,{encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe']}).trim();
export const sql=input=>execFileSync('docker',['exec','-i',container,'psql','-U','postgres','-d','postgres','-X','-qAt','-v','ON_ERROR_STOP=1'],{input,encoding:'utf8',windowsHide:true,timeout:180000,maxBuffer:64*1024*1024}).trim();
export const hashes=dir=>Object.fromEntries(fs.readdirSync(dir).filter(n=>/^\d+.*\.sql$/.test(n)).sort().map(n=>[n,hash(fs.readFileSync(path.join(dir,n)))]));
export function guard(){
  assert.equal(fs.realpathSync(root).replaceAll('\\','/').toLowerCase(),'c:/gv_store_production_20260926');
  const plan=JSON.parse(fs.readFileSync(path.join(fixture,'preparation.json')));
  assert.equal(plan.project,project);assert.ok(!fs.existsSync(path.join(fixture,'supabase/.temp/project-ref')));
  assert.equal(hash(fs.readFileSync(path.join(fixture,'supabase/config.toml'))),plan.configSha256);
  const expected=plan.sourceHashes;assert.equal(Object.keys(expected).length,403);
  assert.deepEqual(hashes(path.join(fixture,'supabase/migrations')),expected);
  const state=JSON.parse(docker('inspect',container))[0];
  assert.equal(state.State.Running,true);
  assert.equal(state.Config.Image,'public.ecr.aws/supabase/postgres:17.6.1.113');
  assert.equal(state.Image,'sha256:4c39816ce8d9303a3aba1161c842929c73a40c7109a9ef1b644582478e31832e');
  assert.deepEqual(Object.keys(state.NetworkSettings.Networks),[project]);
  assert.equal(JSON.parse(docker('network','inspect',project))[0].Internal,true);
  const bridge=JSON.parse(docker('inspect',relay))[0];
  assert.equal(bridge.State.Running,true);
  for(const port of [29421,29422,29424]) assert.deepEqual(bridge.NetworkSettings.Ports[`${port}/tcp`],[{HostIp:'127.0.0.1',HostPort:String(port)}]);
  const versions=sql('select version from supabase_migrations.schema_migrations order by version;').split(/\r?\n/);
  assert.deepEqual(versions,Object.keys(expected).map(n=>n.split('_')[0]).sort());
  assert.equal(sql("select current_setting('max_worker_processes')||'|'||(select count(*) from auth.users)||'|'||(select count(*) from public.card_prints)||'|'||(select count(*) from public.sealed_product_variants)||'|'||(select count(*) from cron.job_run_details);"),'0|0|0|0|0');
  return {project,migrations:versions.length,workers:0,users:0,cards:0,productionWrites:0};
}

if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  assert.equal(process.argv.length,3);assert.ok(['prepare','start-prepared','inspect'].includes(process.argv[2]));
  if(process.argv[2]==='inspect') console.log(JSON.stringify(guard()));
  else {
    assert.equal(fs.realpathSync(root).replaceAll('\\','/').toLowerCase(),'c:/gv_store_production_20260926');
    const resume=process.argv[2]==='start-prepared';
    if(!resume)assert.ok(!fs.existsSync(fixture),'Existing lab must be preserved');
    const source=hashes(path.join(root,'supabase/migrations'));assert.equal(Object.keys(source).length,403);
    const disk=fs.statfsSync(root);assert.ok(disk.bavail*disk.bsize>4_000_000_000);
    for(const kind of ['ps','network','volume'])assert.equal(docker(...(kind==='ps'?['ps','-a']:[kind,'ls']),'--filter',`name=${project}`,'--format',kind==='ps'?'{{.Names}}':'{{.Name}}'),'');
    for(const port of [29421,29422,29424,29428,29440]){const server=net.createServer();await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});await new Promise(resolve=>server.close(resolve));}
    const original=fs.readFileSync('C:/gv_store_index_reconcile_20260919/.local/integration/index-replay/supabase/config.toml','utf8');
    assert.equal(hash(original),'00f2f93f4ce4a861d131aee69f6527232a8664f28d2c6a3f0cb2f0fd0de7c14d');
    const config=original.replaceAll('grookai-store-index-reconcile-20260919',project).replaceAll('180','294');
    assert.ok(config.includes('max_worker_processes = 0'));
    if(!resume){
    fs.mkdirSync(path.join(fixture,'supabase/migrations'),{recursive:true});
    for(const name of Object.keys(source))fs.copyFileSync(path.join(root,'supabase/migrations',name),path.join(fixture,'supabase/migrations',name),fs.constants.COPYFILE_EXCL);
    fs.writeFileSync(path.join(fixture,'supabase/config.toml'),config,{flag:'wx'});
    fs.mkdirSync(path.join(fixture,'supabase/.temp'));fs.writeFileSync(path.join(fixture,'supabase/.temp/postgres-version'),'17.6.1.113',{flag:'wx'});
    }
    const bridge=`import net from 'node:net';
for(const [port,service,targetPort] of [[29422,'db',5432],[29421,'kong',8000],[29424,'inbucket',8025]]) {
 net.createServer(source=>{const target=net.connect(targetPort,'supabase_'+service+'_${project}');
 source.on('error',()=>target.destroy());target.on('error',()=>source.destroy());
 source.on('close',()=>target.destroy());target.on('close',()=>source.destroy());
 source.pipe(target).pipe(source);}).listen(port,'0.0.0.0');
}`;
    const plan={project,databasePort:29422,sourceHashes:source,configSha256:hash(config),relaySha256:hash(bridge)};
    if(resume){
      assert.deepEqual(JSON.parse(fs.readFileSync(path.join(fixture,'preparation.json'))),plan);
      assert.deepEqual(hashes(path.join(fixture,'supabase/migrations')),source);
      assert.equal(hash(fs.readFileSync(path.join(fixture,'supabase/config.toml'))),hash(config));
      assert.equal(hash(fs.readFileSync(path.join(fixture,'relay.mjs'))),hash(bridge));
      assert.ok(!fs.existsSync(path.join(fixture,'start-private.log')));
      assert.ok(!fs.existsSync(path.join(fixture,'supabase/.temp/project-ref')));
    }else{
      fs.writeFileSync(path.join(fixture,'relay.mjs'),bridge,{flag:'wx'});
      fs.writeFileSync(path.join(fixture,'preparation.json'),JSON.stringify(plan,null,2),{flag:'wx'});
    }
    // Default address pools are exhausted by retained labs. This unused /24 was
    // checked against Docker IPAM and host routes; no existing network is changed.
    const networks=JSON.parse(docker('network','inspect',...docker('network','ls','-q').split(/\s+/)));for(const network of networks)for(const ipam of network.IPAM.Config??[])assert.ok(ipam.Subnet!=='10.249.94.0/24','Subnet already in use');
    docker('network','create','--internal','--subnet','10.249.94.0/24',project);
    docker('create','--name',relay,'--network','bridge','-p','127.0.0.1:29421:29421','-p','127.0.0.1:29422:29422','-p','127.0.0.1:29424:29424','node:22-bookworm-slim','node','/relay.mjs');
    docker('cp',path.join(fixture,'relay.mjs'),`${relay}:/relay.mjs`);docker('network','connect',project,relay);docker('start',relay);
    const env={...process.env,DO_NOT_TRACK:'1'};for(const key of Object.keys(env))if(/SUPABASE|DATABASE_URL|POSTGRES_URL/.test(key))delete env[key];
    const run=spawnSync('supabase',['start','--workdir',fixture,'--network-id',project,'--exclude','realtime,imgproxy,postgres-meta,studio,edge-runtime,logflare,vector,supavisor'],{env,encoding:'utf8',windowsHide:true,timeout:600000,maxBuffer:32*1024*1024});
    fs.writeFileSync(path.join(fixture,'start-private.log'),(run.stdout??'')+(run.stderr??''),{flag:'wx'});
    assert.equal(run.status,0,'Inspect retained log; never reset automatically');
    console.log(JSON.stringify({status:'baseline_started',...guard()}));
  }
}
