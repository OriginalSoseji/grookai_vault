// Actual COMMIT and simultaneous-client qualification, fixed fresh fixture only.
import fs from 'node:fs';import assert from 'node:assert/strict';import pg from 'pg';import {createHash} from 'node:crypto';
import {freezeJungleRelease,executeJungleRelease,assertJungleReleaseTarget} from '../../backend/catalog/jungle_edition_catalog_release_v2.mjs';
import {inspectJungleFullSourceV30} from './inspect_jungle_full_source_v30.mjs';
export async function qualifyJungleCatalogDurableV30({client:c,manifest,artifacts,out}){
 assert.equal(c.connectionParameters.host,'127.0.0.1');assert.equal(Number(c.connectionParameters.port),53400);await assertJungleReleaseTarget(c,'local_rehearsal');
 const attestation=inspectJungleFullSourceV30();assert.equal((await c.query('select host(inet_server_addr()) a')).rows[0].a,attestation.address);
 const save=(n,v)=>fs.writeFileSync(out+'/catalog-'+n+'.json',JSON.stringify(v,null,2),{flag:'wx'});
 const before=(await c.query('select to_jsonb(t) value from vault_item_instances t order by id')).rows;assert.equal(before.length,5);
 const plan=await freezeJungleRelease({client:c,manifest,artifacts,target:'local_rehearsal'});save('plan.private',plan);
 const base={plan,manifest,artifacts,expectedFingerprint:plan.fingerprint};
 const rollback=await executeJungleRelease({...base,client:c,mode:'rollback'});assert.equal(rollback.rollbackProven,true);assert.equal(Object.values(rollback.writes).reduce((a,b)=>a+b),639);save('rollback',rollback);
 const second=new pg.Client({host:'127.0.0.1',port:53400,user:'postgres',password:'postgres',database:'postgres',connectionTimeoutMillis:5000,statement_timeout:120000});await second.connect();
 let concurrent,blocked=false,concurrentResult;const secondPid=(await second.query('select pg_backend_pid() p')).rows[0].p,firstPid=(await c.query('select pg_backend_pid() p')).rows[0].p;save('backend-pids',{firstPid,secondPid});
 try{
  const applied=await executeJungleRelease({...base,client:c,mode:'apply',onPhase:async phase=>{
   if(phase!=='before_commit')return;
   concurrent=executeJungleRelease({...base,client:second,mode:'apply'}).then(value=>({status:'fulfilled',value}),error=>({status:'rejected',code:error.code,message:error.message,stack:error.stack,commitUncertain:error.commitUncertain,rollbackUncertain:error.rollbackUncertain??false})).then(result=>{concurrentResult=result;return result;});
   for(let i=0;i<100;i++){
    const blockers=(await c.query('select pg_blocking_pids($1) p',[secondPid])).rows[0].p;
    if(blockers.includes(firstPid)){blocked=true;break;}
    if(concurrentResult)break;
    await new Promise(r=>setTimeout(r,20));
   }
   assert.equal(blocked,true,'Second client must actually wait behind the first transaction');
  }});
  assert.equal(applied.committed,true);assert.equal(Object.values(applied.writes).reduce((a,b)=>a+b),639);save('committed',applied);
  const simultaneous=await concurrent;save('simultaneous',simultaneous);
  if(simultaneous.status==='fulfilled')assert.ok(Object.values(simultaneous.value.writes).every(n=>n===0));
  else {assert.ok(['40001','55P03'].includes(simultaneous.code),simultaneous.message);assert.equal(simultaneous.commitUncertain,false);assert.equal(simultaneous.rollbackUncertain,false);}
  const retry=await executeJungleRelease({...base,client:second,mode:'apply'});assert.equal(retry.committed,true);assert.ok(Object.values(retry.writes).every(n=>n===0));save('retry',retry);
  const readback=await executeJungleRelease({...base,client:second,mode:'readback'});assert.equal(readback.after,'exact');save('readback',readback);
  assert.deepEqual((await second.query('select to_jsonb(t) value from vault_item_instances t order by id')).rows,before);
  assert.equal((await second.query("select count(*)::int n from jungle_edition_identity_links_v1 where state='staged'")).rows[0].n,128);
  for(const t of ['tcgplayer_jungle_edition_bindings_v1','market_price_current_publication'])assert.equal((await second.query('select count(*)::int n from '+t)).rows[0].n,0);
  const result={at:new Date().toISOString(),status:'passed',project:attestation.project,plannedRows:639,actualCommit:true,independentConnectionReadback:true,actualConcurrentLockWait:blocked,concurrentResult:simultaneous.status,concurrentCode:simultaneous.code??null,retryInserts:0,copiesPreserved:5,stagedLinks:128,productionWrites:0,activation:false,sourceSha256:createHash('sha256').update(fs.readFileSync(new URL('../../backend/catalog/jungle_edition_catalog_release_v2.mjs',import.meta.url))).digest('hex')};save('receipt',result);return result;
 }finally{if(concurrent)save('concurrent-final',await concurrent);await second.end();}
}
