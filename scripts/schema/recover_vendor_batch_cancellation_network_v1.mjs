// One new synthetic baseline; no reset, remote target or command arguments.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import {spawnSync} from 'node:child_process';
import {root,fixture,project,relay,pending,addition,hash,docker,sourceState,guard} from './vendor_batch_cancellation_runtime_v1.mjs';
assert.equal(process.argv.length,2);const source=sourceState(),plan=JSON.parse(fs.readFileSync(path.join(fixture,'preparation.json')));const prior={...source};delete prior[addition];assert.deepEqual(plan.sourceHashes,prior);assert.equal(plan.project,project);assert.equal(plan.databasePort,27622);assert.equal(hash(fs.readFileSync(path.join(fixture,'supabase/config.toml'))),plan.configSha256);assert.equal(hash(fs.readFileSync(path.join(fixture,'relay.mjs'))),plan.relaySha256);assert.ok(!fs.existsSync(path.join(fixture,'start-private.log')));assert.equal(fs.readdirSync(path.join(fixture,'supabase/migrations')).length,400);
assert.equal(docker('ps','-a','--filter','name='+project,'--format','{{.Names}}'),'');assert.equal(docker('ps','-a','--filter','name='+relay,'--format','{{.Names}}'),'');assert.equal(docker('network','ls','--filter','name='+project,'--format','{{.Name}}'),'');assert.equal(docker('volume','ls','--filter','name='+project,'--format','{{.Name}}'),'');
const networks=JSON.parse(docker('network','inspect',...docker('network','ls','-q').split(/\r?\n/)));
const ip=s=>s.split('.').reduce((n,b)=>n*256+Number(b),0);const range=s=>{const [host,prefix]=s.split('/');const size=2**(32-Number(prefix)),lo=Math.floor(ip(host)/size)*size;return [lo,lo+size-1];};const chosen=range('10.249.76.0/24');
for(const n of networks)for(const c of n.IPAM.Config??[]){if(!c.Subnet||c.Subnet.includes(':'))continue;const r=range(c.Subnet);assert.ok(chosen[1]<r[0]||chosen[0]>r[1],'New internal subnet must not overlap '+c.Subnet);}
for(const port of [27621,27622,27624,27628,27640]){const server=net.createServer();await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve)});await new Promise(resolve=>server.close(resolve));}
fs.writeFileSync(path.join(fixture,'network-recovery-intent.json'),JSON.stringify({at:new Date().toISOString(),subnet:'10.249.76.0/24',preparationSha256:hash(fs.readFileSync(path.join(fixture,'preparation.json')))}),{flag:'wx'});
docker('network','create','--internal','--subnet','10.249.76.0/24',project);
docker('create','--name',relay,'--network','bridge','-p','127.0.0.1:27621:27621','-p','127.0.0.1:27622:27622','-p','127.0.0.1:27624:27624','node:22-bookworm-slim','node','/relay.mjs');
docker('cp',path.join(fixture,'relay.mjs'),`${relay}:/relay.mjs`);docker('network','connect',project,relay);docker('start',relay);
const env={...process.env,DO_NOT_TRACK:'1'};for(const key of Object.keys(env))if(/SUPABASE|DATABASE_URL|POSTGRES_URL/.test(key))delete env[key];
const run=spawnSync('supabase',['start','--workdir',fixture,'--network-id',project,'--exclude','realtime,imgproxy,postgres-meta,studio,edge-runtime,logflare,vector,supavisor'],{env,encoding:'utf8',windowsHide:true,timeout:600000,maxBuffer:32*1024*1024});
fs.writeFileSync(path.join(fixture,'start-private.log'),(run.stdout??'')+(run.stderr??''),{flag:'wx'});
assert.equal(run.status,0,'Inspect the retained local log; do not reset on timeout');
console.log(JSON.stringify({status:'baseline_started',...guard(),productionWrites:0,sharedResets:0}));
