// One-use browser/device fixture. All historical dates below are explicit synthetic data.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import pg from 'pg';
import {summarizePortfolioObservationV1} from '../../backend/vault/portfolio_history_v1.mjs';
const root='C:/gv_product_portfolio_history_20261008',base='C:/grookai_vault_operator_artifacts/product_portfolio_history_20261008',lab=base+'/full-438-v2',project='portfolio-full-438-v2-20261008';
assert.equal(process.cwd().replaceAll('\\','/'),root);const[mode,provided]=process.argv.slice(2);assert.ok(['prepare','verify','restore'].includes(mode));assert.equal(process.argv.length,mode==='prepare'?3:4);
const run=mode==='prepare'?base+'/ui-'+Date.now():provided;assert.match(run,new RegExp('^'+base+'/ui-[0-9]+$'));
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex'),command=(n,args)=>execFileSync(n,args,{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe'],timeout:180000,maxBuffer:64*1024*1024});
assert.equal(read(base+'/shadow-438-v1/receipt.json').status,'passed');assert.equal(read(base+'/reapply-1791498072822/result.json').status,'passed');assert.equal(read(base+'/extended-rpc-1791498021085/retention.json').status,'passed');
const freeze=read(lab+'/freeze.json');assert.equal(freeze.project,project);for(const[name,digest]of Object.entries(freeze.sourceHashes))assert.equal(sha(root+'/supabase/migrations/'+name),digest,name);
const cfg=JSON.parse(command('supabase',['status','-o','json','--workdir',lab]));assert.equal(cfg.API_URL,'http://127.0.0.1:35521');
const container=JSON.parse(command('docker',['inspect','supabase_db_'+project]))[0];assert.equal(container.State.Running,true);assert.deepEqual(Object.keys(container.NetworkSettings.Networks),[project]);assert.equal(JSON.parse(command('docker',['network','inspect',project]))[0].Internal,true);
const db=new pg.Client({connectionString:'postgresql://postgres:postgres@127.0.0.1:35520/postgres',connectionTimeoutMillis:10000});await db.connect();const q=async(sql,args=[])=>(await db.query(sql,args)).rows;
const save=(name,value,exclusive=true)=>fs.writeFileSync(run+'/'+name,JSON.stringify(value,null,2)+'\n',exclusive?{flag:'wx'}:{});
async function verify(f){
 assert.equal(f.project,project);assert.ok(f.email.endsWith('@offer-market.invalid'));
 for(const[name,digest]of Object.entries(read(run+'/source-binding.json').hashes))assert.equal(sha(root+'/'+name),digest,name);
 assert.deepEqual(await q('select to_jsonb(t) row from vault_item_instances t where user_id=$1 order by id',[f.owner]),f.copies);
 const points=await q('select observation,evidence,summary from portfolio_history_points where owner_id=$1 and sequence<=40 order by sequence',[f.owner]);assert.deepEqual(points,f.points);
 return {points:points.length,copies:f.copies.length};
}
async function restore(f){
 await q('rollback').catch(()=>{});
 if(read(f.marketRun+'/fixture.private.json').state!=='restored')fs.writeFileSync(run+'/market-restore.private.log',command(process.execPath,['scripts/audits/product_portfolio_history_price_fixture_v2.mjs','restore',f.marketRun]),{flag:'wx'});
 assert.equal(read(f.marketRun+'/retention.json').status,'passed');
 const kept=f.points?await verify(f):null;save('retention.json',{status:'passed',at:new Date().toISOString(),priorTables:41,controlsRestored:true,publicationPointerRestored:true,fixtureRowsRetained:kept,productionWrites:0});f.state='restored';save('fixture.private.json',f,false);
}
try{
 const state=(await q("select host(inet_server_addr()) address,current_setting('max_worker_processes') workers,(select count(*)::int from supabase_migrations.schema_migrations) migrations"))[0];assert.equal(state.address,container.NetworkSettings.Networks[project].IPAddress);assert.equal(state.workers,'0');assert.equal(state.migrations,438);
 if(mode!=='prepare'){
  const f=read(run+'/fixture.private.json');assert.notEqual(f.state,'restored');if(mode==='restore')await restore(f);else save('verification-'+Date.now()+'.json',{status:'passed',retained:await verify(f)});console.log(JSON.stringify({run,status:'passed',mode}));
 }else{
  assert.ok(!fs.existsSync(run));fs.mkdirSync(run);
  const preparedLog=command(process.execPath,['scripts/audits/product_portfolio_history_price_fixture_v2.mjs','prepare']);fs.writeFileSync(run+'/market-prepare.private.log',preparedLog,{flag:'wx'});
  const prepared=JSON.parse(preparedLog.trim().split(/\r?\n/).at(-1));assert.equal(prepared.state,'prepared');const market=read(prepared.run+'/fixture.private.json');
  const f={project,state:'preparing',at:new Date().toISOString(),marketRun:prepared.run,owner:market.owner,email:market.email,password:market.password,syntheticHistoricalPoints:true};save('fixture.private.json',f);
  const files=command('git',['ls-files','-co','--exclude-standard','lib','integration_test','apps/web/src','apps/web/next.config.mjs','android/app/build.gradle.kts','scripts/audits/product_portfolio_history_ui_fixture_v1.mjs','scripts/audits/product_portfolio_history_web_runtime_v1.mjs','scripts/audits/product_portfolio_history_web_runtime_v2.mjs']).trim().split(/\r?\n/);
  save('source-binding.json',{at:new Date().toISOString(),head:command('git',['rev-parse','HEAD']).trim(),migrations:438,hashes:Object.fromEntries([...new Set(files)].filter(p=>p&&fs.existsSync(root+'/'+p)).map(p=>[p,sha(root+'/'+p)]))});
  try{
   await q('begin');
   for(const printing of [market.printing,market.missingPrinting])await q("select admin_vault_instance_create_v1(p_user_id=>$1,p_card_print_id=>$2,p_card_printing_id=>$3,p_condition_label=>'NM')",[f.owner,market.card,printing]);
   await q("select set_config('request.jwt.claim.role','authenticated',true),set_config('request.jwt.claim.sub',$1,true)",[f.owner]);
   const observed=(await q('select portfolio_history_observe_v1($1,$2,41) data',[f.owner,randomUUID()]))[0].data;assert.equal(observed.pricingAvailable,true);assert.equal(observed.observation.ownedCount,2);assert.equal(summarizePortfolioObservationV1(observed.observation).totals.USD.exact,'12.34');
   f.day=observed.observation.capturedAt.slice(0,10);f.pricedCopy=observed.observation.copies.find(c=>c.reference).copyId;
   await q('insert into portfolio_history_owners(owner_id,next_sequence) values($1,41)',[f.owner]);f.pointIds=[];
   for(let seq=1;seq<=40;seq++){
    const date=new Date(f.day+'T12:00:00.000Z');date.setUTCDate(date.getUTCDate()-(41-seq)*2);const stamp=date.toISOString();
    const observation=structuredClone(observed.observation);Object.assign(observation,{snapshotId:randomUUID(),sequence:String(seq),capturedAt:stamp});
    const priced=observation.copies.find(c=>c.reference);
    if(seq===10){priced.reference=null;priced.unpricedReason='no_qualified_price';}
    else{priced.reference={...priced.reference,amount:seq===3?'25':String(10+seq/10),currency:seq===3?'CAD':'USD',provenanceId:randomUUID(),observedAt:stamp,publishedAt:stamp};}
    const summary=summarizePortfolioObservationV1(observation),evidence=observed.evidence.map(e=>({...e,syntheticFixture:true,source:{syntheticHistoricalObservation:true}}));
    await q('insert into portfolio_history_points(owner_id,id,sequence,captured_day,captured_at,observation,evidence,summary) values($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8::jsonb)',[f.owner,observation.snapshotId,seq,stamp.slice(0,10),stamp,JSON.stringify(observation),JSON.stringify(evidence),JSON.stringify(summary)]);f.pointIds.push(observation.snapshotId);
   }await q('commit');
   f.points=await q('select observation,evidence,summary from portfolio_history_points where owner_id=$1 order by sequence',[f.owner]);f.copies=await q('select to_jsonb(t) row from vault_item_instances t where user_id=$1 order by id',[f.owner]);
   save('defines.private.json',{SUPABASE_URL:cfg.API_URL,SUPABASE_PUBLISHABLE_KEY:cfg.PUBLISHABLE_KEY,PORTFOLIO_TEST_EMAIL:f.email,PORTFOLIO_TEST_PASSWORD:f.password,PORTFOLIO_TEST_POINT_BEFORE:f.pointIds[39],GV_PORTFOLIO_HISTORY_V1:'true'});
   await verify(f);f.state='prepared';save('fixture.private.json',f,false);save('prepared.json',{status:'passed',owner:f.owner,syntheticDatedPoints:40,currentCopies:2,governedCurrentReference:'USD12.34',productionWrites:0});console.log(JSON.stringify({run,state:'prepared'}));
  }catch(error){save('failure.json',{message:error.message,stack:error.stack});await restore(f);throw error;}
 }
}finally{await db.end();}
