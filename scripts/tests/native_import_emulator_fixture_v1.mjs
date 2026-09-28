// Local synthetic fixture/gateway only. Never uses a remote project or user.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import {randomUUID,createHash} from 'node:crypto';
import {execFileSync,spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import pg from 'pg';
import {createClient} from '@supabase/supabase-js';
import {localSupabaseStatusSecret} from '../lib/local_supabase_cli_status_v1.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
const out='C:/grookai_vault_operator_artifacts/native_import_qualification_20260927';
const fixture=out+'/full-407',project='native-import-full-407-20260927';
assert.equal(process.argv.length,3);const mode=process.argv[2];assert.ok(['prepare','prepare-retry','serve'].includes(mode));
assert.equal(JSON.parse(fs.readFileSync(fixture+'/replay-result.json')).status,'passed');
const plan=JSON.parse(fs.readFileSync(fixture+'/freeze.json'));assert.equal(plan.project,project);
for(const [name,digest] of Object.entries(plan.sourceHashes))assert.equal(createHash('sha256').update(fs.readFileSync(root+'supabase/migrations/'+name)).digest('hex'),digest);
const state=JSON.parse(execFileSync('docker',['inspect','supabase_db_'+project],{encoding:'utf8'}))[0];
assert.equal(state.State.Running,true);assert.deepEqual(Object.keys(state.NetworkSettings.Networks),[project]);
assert.equal(JSON.parse(execFileSync('docker',['network','inspect',project],{encoding:'utf8'}))[0].Internal,true);
const status=JSON.parse(execFileSync('supabase',['status','--workdir',fixture,'--output','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
assert.equal(status.API_URL,'http://127.0.0.1:57541');
const db=new pg.Client({host:'127.0.0.1',port:57540,user:'postgres',password:'postgres',database:'postgres'});await db.connect();
assert.equal((await db.query('show max_worker_processes')).rows[0].max_worker_processes,'0');
assert.deepEqual((await db.query('select version from supabase_migrations.schema_migrations order by version')).rows.map(r=>r.version),Object.keys(plan.sourceHashes).sort().map(n=>n.split('_')[0]));
if(mode==='prepare-retry'){
  assert.ok(!fs.existsSync(out+'/emulator-retry-intent.json'));
  const previous=JSON.parse(fs.readFileSync(out+'/emulator-fixture.private.json'));assert.equal(previous.project,project);
  const oldCopies=(await db.query('select * from vault_item_instances where user_id=$1 order by id',[previous.user])).rows;
  assert.equal(oldCopies.length,5);
  fs.writeFileSync(out+'/emulator-retry-intent.json',JSON.stringify({at:new Date().toISOString(),project,scope:'new synthetic account for repaired preview; preserve previous five copies',consumed:true}),{flag:'wx'});
  const admin=createClient(status.API_URL,localSupabaseStatusSecret(status),{auth:{autoRefreshToken:false,persistSession:false}});
  const email=randomUUID()+'@native-emulator.invalid',password=randomUUID();
  const created=await admin.auth.admin.createUser({email,password,email_confirm:true});assert.equal(created.error,null);
  fs.writeFileSync(out+'/emulator-fixture-attempt2.private.json',JSON.stringify({...previous,user:created.data.user.id,email,password},null,2),{flag:'wx'});
  const defines=JSON.parse(fs.readFileSync(out+'/native-test-defines.private.json'));
  fs.writeFileSync(out+'/native-test-defines-attempt2.private.json',JSON.stringify({...defines,GV_IMPORT_TEST_EMAIL:email,GV_IMPORT_TEST_PASSWORD:password},null,2),{flag:'wx'});
  assert.deepEqual((await db.query('select * from vault_item_instances where user_id=$1 order by id',[previous.user])).rows,oldCopies);
  await db.end();console.log(JSON.stringify({status:'prepared',project,previousCopiesPreserved:5,newAccount:'synthetic'}));
}else if(mode==='prepare'){
  assert.ok(!fs.existsSync(out+'/emulator-intent.json'));
  fs.writeFileSync(out+'/emulator-intent.json',JSON.stringify({at:new Date().toISOString(),project,scope:'one new synthetic account, set and two catalog cards; preserve existing data',consumed:true}),{flag:'wx'});
  const admin=createClient(status.API_URL,localSupabaseStatusSecret(status),{auth:{autoRefreshToken:false,persistSession:false}});
  const email=randomUUID()+'@native-emulator.invalid',password=randomUUID();
  const created=await admin.auth.admin.createUser({email,password,email_confirm:true});assert.equal(created.error,null);
  const user=created.data.user.id;
  const set=(await db.query("insert into public.sets(code,name,game) values($1,'Native Import Test Set','pokemon') returning id",[randomUUID()])).rows[0].id;
  const cards=[];
  for(let number=1;number<=2;number++)cards.push((await db.query("insert into public.card_prints(set_id,name,number,variant_key,gv_id,game_id) values($1,$2,$3,'normal',$4,(select id from games where code='pokemon')) returning id,gv_id,name,number",[set,'Native Test Card '+number,String(number),'GV-PK-NATIVE-EMU-'+randomUUID()])).rows[0]);
  fs.writeFileSync(out+'/emulator-fixture.private.json',JSON.stringify({user,email,password,cards,set,project},null,2),{flag:'wx'});
  const publicDefines={SUPABASE_URL:'http://10.0.2.2:57550',SUPABASE_PUBLISHABLE_KEY:status.ANON_KEY,COLLECTOR_MEMORIES_ENABLED:'true'};
  fs.writeFileSync(out+'/native-public-defines.json',JSON.stringify(publicDefines,null,2),{flag:'wx'});
  fs.writeFileSync(out+'/native-test-defines.private.json',JSON.stringify({...publicDefines,GV_IMPORT_TEST_EMAIL:email,GV_IMPORT_TEST_PASSWORD:password,GV_IMPORT_TEST_CARD_A:cards[0].id,GV_IMPORT_TEST_CARD_B:cards[1].id},null,2),{flag:'wx'});
  fs.writeFileSync(out+'/native-import.csv','Product Name,Set,Card Number,Quantity,Card Condition,Average Cost,Notes\nNative Test Card 1,Native Import Test Set,1,3,LP,4.25,Emulator fixture\nNative Test Card 2,Native Import Test Set,2,2,NM,2.50,Emulator fixture\n',{flag:'wx'});
  await db.end();console.log(JSON.stringify({status:'prepared',project,cards:cards.length,account:'synthetic',productionWrites:0}));
}else{
  const fixtureData=JSON.parse(fs.readFileSync(out+'/emulator-fixture.private.json'));assert.equal(fixtureData.project,project);
  assert.equal((await db.query('select count(*)::int n from auth.users where id=$1',[fixtureData.user])).rows[0].n,1);await db.end();
  const log=fs.openSync(out+'/emulator-edge.private.log','a');
  const child=spawn('deno',['run','--no-lock','--cached-only','--allow-env','--allow-net=127.0.0.1:57541,127.0.0.1:57450',root+'tests/integration/helpers/native_import_server.ts'],{cwd:root,env:{...process.env,SUPABASE_URL:status.API_URL,SUPABASE_SECRET_KEY:localSupabaseStatusSecret(status)},stdio:['ignore',log,log],windowsHide:true});
  let ready=false;
  for(let i=0;i<50;i++){try{if((await fetch('http://127.0.0.1:57450',{method:'OPTIONS'})).status===200){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}
  if(!ready){child.kill();throw Error('Local Edge harness unavailable');}
  let dropNext=false;
  const server=http.createServer((req,res)=>{
    if(req.url==='/__native_import_fixture_health'){res.setHeader('content-type','application/json');res.end(JSON.stringify({project,localOnly:true}));return;}
    if(req.url==='/__test/drop-next-import-response'&&req.method==='POST'){dropNext=true;res.end('armed');return;}
    const isImport=req.url?.startsWith('/functions/v1/vault-import-targets-v1');
    const upstream=http.request({hostname:'127.0.0.1',port:isImport?57450:57541,path:req.url,method:req.method,headers:req.headers},response=>{
      if(isImport&&dropNext&&response.statusCode===200){dropNext=false;response.resume();response.on('end',()=>res.destroy());return;}
      res.writeHead(response.statusCode??502,response.headers);response.pipe(res);
    });
    upstream.on('error',()=>{res.writeHead(502);res.end();});req.pipe(upstream);
  });
  server.listen(57550,'127.0.0.1',()=>console.log('Local native import gateway ready on 57550'));
  const close=()=>{server.close();child.kill();fs.closeSync(log);};process.once('SIGINT',close);process.once('SIGTERM',close);
  child.once('exit',()=>server.close());
}
