// Owned 479 acquisition-date replay. Never reset after fixture/data population.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import {createHash} from 'node:crypto';
import {execFileSync,spawnSync,spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {v5 as uuid} from 'uuid';

const source='C:/gv_intake_release_20261028';
const evidence=path.resolve('docs/audits/reviewed_intake_date_release_20261028');
const work='C:/gv_intake_recovery_private_20261027/reviewed-intake-release-v1/local-date-fresh-479';
const project='reviewed-intake-date-fresh-479-20261028',container='supabase_db_'+project,relay=project+'-relay';
const subnet='10.253.34.0/24',port=60600,cutoff='20261009190000';
const phase=process.argv[2];assert.ok(['prepare','reset-prefix','complete','verify'].includes(phase));
const sha=x=>createHash('sha256').update(x).digest('hex');
const save=(name,value)=>fs.writeFileSync(work+'/'+name,JSON.stringify(value,null,2),{flag:'wx'});
const docker=(...args)=>execFileSync('docker',args,{encoding:'utf8',timeout:60000,maxBuffer:16_000_000}).trim();
const sql=query=>execFileSync('docker',['exec','-i',container,'psql','-X','-qAt','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],{input:query,encoding:'utf8',timeout:60000,maxBuffer:16_000_000}).trim();
const files=fs.readdirSync(source+'/supabase/migrations').filter(n=>/^\d+.*\.sql$/.test(n)).sort();
assert.equal(files.length,479);
const frozen=JSON.parse(fs.readFileSync('C:/gv_intake_recovery_private_20261027/reviewed-intake-release-v1/candidate-frozen.json'));assert.equal(sha(fs.readFileSync(source+'/supabase/migrations/'+frozen.migration)),frozen.sha256);
const dateFrozen=JSON.parse(fs.readFileSync('C:/gv_intake_recovery_private_20261027/reviewed-intake-release-v1/candidate-frozen-date-v1.json'));assert.equal(sha(fs.readFileSync(source+'/supabase/migrations/'+dateFrozen.file)),dateFrozen.sha256);
const sources=Object.fromEntries(files.map(name=>[name,sha(fs.readFileSync(source+'/supabase/migrations/'+name))]));
const prefix=files.filter(n=>n.match(/^\d+/)[0]<=cutoff);
assert.equal(JSON.parse(fs.readFileSync(source+'/docs/audits/intake_recovery_20261027/missing-migration-parity.json')).pass,true);
assert.equal(sources['20261023120000_lot_label_sales_v1.sql'],'03aa6bf13897a0d0d1fe20df33ef0d894821d0a617e91aeb99521be4fe112578');
const env={...process.env,DO_NOT_TRACK:'1'};
for(const key of Object.keys(env))if(/SUPABASE|DATABASE_URL|POSTGRES_URL/.test(key))delete env[key];
function cli(args,label){
  const fd=fs.openSync(work+'/'+label+'.log','wx');let result;
  try{result=spawnSync('supabase',[...args,'--workdir',work,'--network-id',project],{cwd:work,env,windowsHide:true,timeout:600000,stdio:['ignore',fd,fd]});}finally{fs.closeSync(fd);}
  assert.ifError(result.error);assert.equal(result.status,0,label+' failed; retain and inspect this lab');
}
function guard(expectedCount,{empty=false}={}){
  const plan=JSON.parse(fs.readFileSync(work+'/freeze.json'));
  assert.deepEqual(plan.sources,sources);assert.equal(plan.configSha256,sha(fs.readFileSync(work+'/supabase/config.toml')));
  assert.equal(fs.existsSync(work+'/supabase/.temp/project-ref'),false,'A diagnostic lab must never be linked');
  const db=JSON.parse(docker('inspect',container))[0];assert.equal(db.State.Running,true);
  assert.equal(db.Image,'sha256:4c39816ce8d9303a3aba1161c842929c73a40c7109a9ef1b644582478e31832e');
  assert.deepEqual(Object.keys(db.NetworkSettings.Networks),[project]);
  assert.equal(JSON.parse(docker('network','inspect',project))[0].Internal,true);
  for(const bindings of Object.values(JSON.parse(docker('inspect',relay))[0].NetworkSettings.Ports))for(const binding of bindings)assert.equal(binding.HostIp,'127.0.0.1');
  const state=JSON.parse(sql("select json_build_object('users',(select count(*) from auth.users),'cards',(select count(*) from public.card_prints),'copies',(select count(*) from public.vault_item_instances),'workers',current_setting('max_worker_processes'),'ledger',(select json_agg(version order by version) from supabase_migrations.schema_migrations))"));
  assert.equal(state.workers,'0');assert.equal(state.users,0);assert.equal(state.copies,0);
  if(empty)assert.equal(state.cards,0);
  assert.deepEqual(state.ledger,(expectedCount===479?files:prefix).map(n=>n.match(/^\d+/)[0]).sort());
  return state;
}
if(phase==='prepare'){
  assert.equal(fs.existsSync(work),false,'Never overwrite a consumed preparation');
  assert.equal(docker('ps','-a','--filter','name='+project,'--format','{{.Names}}'),'');
  assert.equal(docker('volume','ls','--filter','name='+project,'--format','{{.Name}}'),'');
  for(const p of [port,port+1,port+4,port+8])await new Promise((resolve,reject)=>{const server=net.createServer();server.once('error',reject);server.listen(p,'127.0.0.1',()=>server.close(resolve));});
  for(const network of JSON.parse(docker('network','inspect',...docker('network','ls','-q').split(/\s+/))))for(const config of network.IPAM.Config??[])assert.notEqual(config.Subnet,subnet);
  fs.mkdirSync(work+'/supabase/migrations',{recursive:true});fs.mkdirSync(work+'/supabase/.temp');
  const config=fs.readFileSync('C:/grookai_vault_operator_artifacts/audit_vault_write_pause_20260927/replay-411/supabase/config.toml','utf8').replaceAll('audit-vault-pause-411-20260927',project).replace(/5704([0-9])/g,(_,n)=>String(port+Number(n)));
  fs.writeFileSync(work+'/supabase/config.toml',config,{flag:'wx'});fs.writeFileSync(work+'/supabase/.temp/postgres-version','17.6.1.113',{flag:'wx'});
  for(const name of prefix)fs.copyFileSync(source+'/supabase/migrations/'+name,work+'/supabase/migrations/'+name,fs.constants.COPYFILE_EXCL);
  save('freeze.json',{at:new Date().toISOString(),sourceHead:execFileSync('git',['-C',source,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),sources,configSha256:sha(config),project,subnet,port,cutoff,diagnosticOnly:true,scriptSha256:sha(fs.readFileSync(new URL(import.meta.url)))});
  const code=fs.readFileSync(new URL('./reviewed_intake_date_fresh_relay_v1.mjs',import.meta.url),'utf8').replaceAll('__PROJECT__',project).replaceAll('__DB_PORT__',String(port));
  fs.writeFileSync(work+'/relay.mjs',code,{flag:'wx'});save('relay-manifest.json',{sha256:sha(code),onlyIdempotentStorageReadinessGETRetried:true,fakeResponses:false});
  save('start-intent.json',{at:new Date().toISOString(),project,consumed:true});
  docker('network','create','--internal','--subnet',subnet,project);
  docker('create','--name',relay,'--network','bridge',...[port,port+1,port+4].flatMap(p=>['-p',`127.0.0.1:${p}:${p}`]),'node:22-bookworm-slim','node','/relay.mjs');
  docker('cp',work+'/relay.mjs',relay+':/relay.mjs');docker('network','connect',project,relay);docker('start',relay);
  cli(['start','--exclude','realtime,imgproxy,postgres-meta,studio,edge-runtime,logflare,vector,supavisor'],'start');
  save('prepared.json',guard(prefix.length,{empty:true}));
}else if(phase==='reset-prefix'){
  const before=guard(prefix.length,{empty:true});
  for(const name of files.filter(n=>!prefix.includes(n)))fs.copyFileSync(source+'/supabase/migrations/'+name,work+'/supabase/migrations/'+name,fs.constants.COPYFILE_EXCL);
  save('reset-intent.json',{at:new Date().toISOString(),before,consumed:true});
  const fd=fs.openSync(work+'/gateway-monitor.log','wx');
  const monitor=spawn(process.execPath,[fileURLToPath(new URL('./reviewed_intake_date_fresh_gateway_monitor_v1.mjs',import.meta.url)),project],{windowsHide:true,stdio:['ignore',fd,fd]});fs.closeSync(fd);
  for(let n=0;n<1000&&!fs.existsSync(work+'/gateway-monitor-ready.json');n++)await new Promise(resolve=>setTimeout(resolve,50));
  assert.ok(fs.existsSync(work+'/gateway-monitor-ready.json'),'Gateway monitor did not become ready');
  cli(['db','reset','--local','--version',cutoff,'--no-seed','--yes'],'reset-prefix');
  assert.equal(JSON.parse(fs.readFileSync(work+'/gateway-reset-result.json')).pass,true,'Gateway resynchronization did not pass');

  save('reset-prefix-result.json',guard(prefix.length,{empty:true}));
}else if(phase==='complete'){
  guard(prefix.length,{empty:true});assert.equal(fs.existsSync(work+'/seed-intent.json'),false);
  assert.ok(fs.existsSync(work+'/reset-prefix-result.json'));
  const families=[['2021swsh','mcd21',25],['swsh10.5','pgo',88],['sv04.5','sv4pt5',245],['sv06.5','sv6pt5',99],['sv08.5','sv8pt5',180],['tk-ex-latio','tk1b',10]];
  const id=name=>uuid('grookai-local-alias-replay:'+name,uuid.URL);
  const rows=[];let fixture='begin;\n';
  for(const [legacy,canonical,count] of families)for(const code of [legacy,canonical]){
    fixture+=`insert into public.sets(id,code,name,game) values('${id('set:'+code)}','${code}','LOCAL REPLAY ${code}','pokemon');\n`;
    for(let n=1;n<=count;n++){
      const row=id('card:'+code+':'+n);rows.push({id:row,code,n});
      fixture+=`insert into public.card_prints(id,set_id,game_id,name,number,set_code,gv_id) values('${row}','${id('set:'+code)}',(select id from public.games where code='pokemon'),'LOCAL REPLAY ${legacy} ${n}','${n}','${code}','GV-PK-REPLAY-${row.toUpperCase()}');\n`;
    }
  }
  fixture+='commit;';fs.writeFileSync(work+'/synthetic-prerequisite.sql',fixture,{flag:'wx'});
  save('seed-intent.json',{at:new Date().toISOString(),kind:'synthetic historical data prerequisite only',cards:1294,pairs:647,sourceAliasMigrationSha256:sources['20261012010000_card_print_identity_aliases_v1.sql'],fixtureSha256:sha(fixture),consumed:true});
  sql(fixture);assert.equal(JSON.parse(sql("select json_build_object('cards',(select count(*) from card_prints),'copies',(select count(*) from vault_item_instances))")).cards,1294);
  cli(['db','push','--local','--yes'],'complete-history');
  const state=guard(479);assert.equal(sql('select count(*) from public.card_print_identity_aliases'),'647');
  cli(['db','push','--local','--yes'],'noop-history');
  const result={at:new Date().toISOString(),pass:true,diagnosticFullSourceReplay:true,zeroStateWithExplicitPrerequisite:true,cliResetSucceeded:true,strictDefaultGateWaived:false,remoteWrites:0,allSourceBytesUnchanged:true,aliases:647,state};
  save('replay-result.json',result);fs.writeFileSync(evidence+'/fresh-full-source-replay.json',JSON.stringify(result,null,2));
}else{
  assert.ok(fs.existsSync(work+'/replay-result.json'));guard(479);
}
console.log(JSON.stringify({phase,project,pass:true,remoteWrites:0}));
