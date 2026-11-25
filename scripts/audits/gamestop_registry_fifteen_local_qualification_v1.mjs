// Real PostgreSQL qualification only. Requires the separately prepared, owned local fixture.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
import {TARGETS,QUALIFICATION_DATABASE,readGameStopRegistryState,classifyGameStopRegistryState,qualifyGameStopRegistryTransaction} from '../../backend/catalog/gamestop_registry_fifteen_v1.mjs';
const args=Object.fromEntries(process.argv.slice(2).map(a=>{const i=a.indexOf('=');assert.ok(i>2);return[a.slice(2,i),a.slice(i+1)];}));
assert.deepEqual(Object.keys(args).sort(),['fixture','out']);
const fixture=path.resolve(args.fixture),out=path.resolve(args.out);assert.ok(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const plan=JSON.parse(fs.readFileSync(path.join(fixture,'plan.json'))),expectedOwned=JSON.parse(fs.readFileSync(path.join(fixture,'owned-before.json'))),unrelated=JSON.parse(fs.readFileSync(path.join(fixture,'unrelated-fixture.json')));
const req=createRequire(process.env.GV_QUALIFICATION_DEPENDENCY_MANIFEST??new URL('../../package.json',import.meta.url));
const c=new(req('pg').Client)({host:'127.0.0.1',port:5432,user:'postgres',password:'postgres',database:QUALIFICATION_DATABASE,connectionTimeoutMillis:10000,statement_timeout:45000,query_timeout:50000,application_name:'gamestop_registry_local_qualification_v1'});
const save=(name,v)=>fs.writeFileSync(path.join(out,name),JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const report={version:'GAMESTOP_REGISTRY_FIFTEEN_LOCAL_QUALIFICATION_V1',startedAt:new Date().toISOString(),pass:false,database:QUALIFICATION_DATABASE,productionWrites:0,realAccountsOrSessions:false,planFingerprint:plan.fingerprint,negativeCases:[],phases:[]};
const copies=async()=>(await c.query('select to_jsonb(t)::text row_json from public.vault_item_instances t where id=any($1::uuid[]) order by id',[expectedOwned.map(r=>JSON.parse(r).id)])).rows.map(r=>r.row_json);
const sequences=async()=>(await c.query("select schemaname,sequencename,last_value::text from pg_sequences where schemaname in('public','auth','grookai_square','grookai_inventory','grookai_vendor_pricing') order by 1,2")).rows;
const run=(mode,extra={})=>qualifyGameStopRegistryTransaction({client:c,plan,mode,...extra});
try{
 await c.connect();assert.equal((await c.query('select current_database() name')).rows[0].name,QUALIFICATION_DATABASE);
 assert.equal((await c.query('select count(*)::int n from auth.users')).rows[0].n,1);assert.equal((await c.query('select count(*)::int n from auth.sessions')).rows[0].n,0);
 assert.deepEqual(await copies(),expectedOwned);assert.equal(classifyGameStopRegistryState(plan,await readGameStopRegistryState(c,plan.schema)),'before');const sequenceBefore=await sequences();
 const preflight=await run('preflight');assert.equal(preflight.inserts,0);report.phases.push(preflight);save('preflight.json',preflight);
 const first=TARGETS[0];
 const cases=[
  ['duplicate_active_identity_constraint',async()=>{const i={...first.identity,id:'00000000-0000-4000-a000-00000000bad1'};const keys=Object.keys(i).join(',');await c.query(`insert into public.card_print_identity(${keys}) select ${keys} from jsonb_populate_record(null::public.card_print_identity,$1::jsonb)`,[JSON.stringify(i)]);},/duplicate key value violates unique constraint/],
  ['unrelated_existing_identity_preserved',async()=>{await c.query("update public.card_print_identity set normalized_printed_name='Synthetic unexpected change' where id=$1",[unrelated.identityId]);},/Protected drift: globalRetainedIdentities/],
  ['existing_printing_image_preserved',async()=>{await c.query("update public.card_printings set image_note='Synthetic unexpected image change' where id=$1",[JSON.parse(first.childRow).id]);},/Exact retained printing drift/],
  ['new_identity_timestamps_bound',async()=>{await c.query("update public.card_print_identity set created_at=created_at-interval '1 hour',updated_at=created_at-interval '1 hour' where id=$1",[first.identity.id]);},/New identity metadata changed|Exact identity row mismatch|strictly equal/],
  ['assigned_owner_update_stock_guard',async()=>{const id=JSON.parse(expectedOwned.find(row=>JSON.parse(row).card_printing_id!==null)).id;await c.query('update public.vault_item_instances set card_printing_id=null where id=$1',[id]);},/stock_requires_read_committed/],
  ['unassigned_owner_update_stock_guard',async()=>{const row=JSON.parse(expectedOwned.find(row=>JSON.parse(row).card_printing_id===null));const target=TARGETS.find(t=>t.parentId===row.card_print_id);await c.query('update public.vault_item_instances set card_printing_id=$2 where id=$1',[row.id,JSON.parse(target.childRow).id]);},/stock_requires_read_committed/],
 ];
 for(const [name,callback,pattern] of cases){
  let caught;try{await run('apply',{beforeCommit:callback});}catch(error){caught=error;}assert.ok(caught,'Negative transaction unexpectedly committed: '+name);assert.match(caught.message,pattern,name);assert.equal(caught.commitUncertain,false);assert.equal(caught.rollbackUncertain,false);
  assert.equal(classifyGameStopRegistryState(plan,await readGameStopRegistryState(c,plan.schema)),'before');assert.deepEqual(await copies(),expectedOwned);assert.deepEqual(await sequences(),sequenceBefore);
  const evidence={name,rejected:true,code:caught.code,message:caught.message,commitUncertain:false,exactIndependentRollbackReadback:true,ownedCopiesExact:true,sequencesExact:true};report.negativeCases.push(evidence);save('negative-'+name+'.json',evidence);
 }
 const rollback=await run('rollback');assert.equal(rollback.rollbackProven,true);assert.equal(rollback.inserts,15);assert.equal(rollback.committed,false);report.phases.push(rollback);save('rollback.json',rollback);
 const apply=await run('apply');assert.equal(apply.committed,true);assert.equal(apply.inserts,15);assert.equal(apply.identityRows.length,15);report.phases.push(apply);save('apply.json',apply);
 const receipt={committedIdentityRows:apply.identityRows};
 const readback=await run('readback',receipt);assert.equal(readback.exactReadback,true);assert.equal(readback.inserts,0);report.phases.push(readback);save('readback.json',readback);
 const replay=await run('apply',receipt);assert.equal(replay.committed,true);assert.equal(replay.inserts,0);report.phases.push(replay);save('replay.json',replay);
 await assert.rejects(run('readback'),/Exact committed identity receipt required/);
 await c.query('begin');await c.query('set local role anon');const options=(await c.query('select id,card_print_id,finish_key,printing_gv_id,finish_is_active from public.get_public_card_printing_options_v1($1::uuid[],1000,0) order by id',[TARGETS.map(t=>t.parentId)])).rows;assert.deepEqual(options,plan.before.options);await c.query('rollback');
 await c.query('begin');await c.query('set local role anon');let denied;try{await c.query('insert into public.card_print_identity(id,card_print_id) values($1,$2)',['00000000-0000-4000-a000-00000000bad2',first.parentId]);}catch(error){denied=error;}finally{await c.query('rollback');}assert.equal(denied?.code,'42501');report.anonymousSql={actualPostgresRole:true,publicOptions:15,exactOptionsPreserved:true,directIdentityInsertDenied:'42501',httpSecurityClaimed:false};
 const acknowledgementClient={connectionParameters:c.connectionParameters,query:async(...q)=>{const result=await c.query(...q);if(q[0]==='commit')throw new Error('Synthetic acknowledgement loss after actual zero-write replay commit');return result;}};
 let uncertain;try{await qualifyGameStopRegistryTransaction({client:acknowledgementClient,plan,mode:'apply',...receipt});}catch(error){uncertain=error;}assert.ok(uncertain);assert.equal(uncertain.commitUncertain,true);report.zeroWriteCommitAcknowledgementLoss={flagged:true,newFifteenRowCommitLossClaimed:false,automaticRetry:false};
 const finalReadback=await run('readback',receipt);assert.equal(finalReadback.exactReadback,true);assert.deepEqual(await copies(),expectedOwned);assert.deepEqual(await sequences(),sequenceBefore);
 report.assignedCopiesPreserved=15;report.unassignedCopiesPreserved=15;report.sequencesExact=true;report.globalUnrelatedIdentityExact=true;report.pass=true;
}catch(error){await c.query('rollback').catch(()=>{});report.error={code:error.code,message:error.message,stack:error.stack};process.exitCode=1;}
finally{await c.end().catch(()=>{});report.finishedAt=new Date().toISOString();save('result.json',report);console.log(JSON.stringify({pass:report.pass,negativeCases:report.negativeCases.length,phases:report.phases.map(p=>({mode:p.mode,inserts:p.inserts,committed:p.committed})),ownedCopiesPreserved:(report.assignedCopiesPreserved??0)+(report.unassignedCopiesPreserved??0),error:report.error}));}
