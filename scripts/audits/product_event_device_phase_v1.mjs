import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import pg from 'pg';
const root='C:/gv_product_event_closeout_20261008',base='C:/grookai_vault_operator_artifacts/product_event_closeout_20261008';
assert.equal(process.cwd().replaceAll('\\','/'),root);assert.equal(process.argv.length,4);
const [mode,run]=process.argv.slice(2);assert.ok(['disable','verify'].includes(mode));assert.match(run,new RegExp('^'+base+'/ui-[0-9]+$'));
const read=p=>JSON.parse(fs.readFileSync(p)),f=read(run+'/fixture.private.json');assert.equal(f.state,'prepared');assert.equal(f.project,'event-full-434-v1-20261008');
const first=read(run+'/phase-1/device-response.json');assert.equal(first.phase,'event_pending');assert.equal(first.owner,f.owner);assert.equal(first.mutations.length,10);
const pending=first.journal.pending;assert.equal(pending.operation.type,'event_close');assert.equal(pending.operation.eventId,first.eventId);assert.equal(pending.operation.reason,'Final closeout');
const container=JSON.parse(execFileSync('docker',['inspect','supabase_db_'+f.project],{encoding:'utf8',windowsHide:true}))[0];
assert.equal(container.State.Running,true);assert.deepEqual(Object.keys(container.NetworkSettings.Networks),[f.project]);
const db=new pg.Client({connectionString:'postgresql://postgres:postgres@127.0.0.1:34060/postgres',connectionTimeoutMillis:10000});await db.connect();
const q=async(sql,args=[])=>(await db.query(sql,args)).rows;
try{
 assert.equal((await q('select host(inet_server_addr()) address'))[0].address,container.NetworkSettings.Networks[f.project].IPAddress);
 const requests=await q('select request from vendor_event_requests where owner_id=$1 order by revision',[f.owner]);assert.deepEqual(requests.map(r=>r.request),first.mutations);assert.deepEqual(requests.at(-1).request,pending);
 const events=await q('select event_id as id,status from vendor_events where owner_id=$1',[f.owner]);assert.deepEqual(events,[{id:first.eventId,status:'closed'}]);
 assert.equal((await q('select count(*)::int n from vendor_event_assignments where owner_id=$1 and event_id=$2',[f.owner,first.eventId]))[0].n,4);
 if(mode==='disable'){
  assert.equal((await q('select enabled from vendor_event_control'))[0].enabled,true);
  await q('update vendor_event_control set enabled=false');
 }else{
  const second=read(run+'/phase-2/device-response.json');assert.equal(second.phase,'event_recovered');assert.equal(second.owner,f.owner);assert.equal(second.eventId,first.eventId);assert.ok(second.exactJournalRetained&&second.noSecondMutation&&second.accountClosed);
 }
 assert.equal((await q('select enabled from vendor_event_control'))[0].enabled,false);
 fs.writeFileSync(run+'/device-'+mode+'-proof.json',JSON.stringify({status:'passed',at:new Date().toISOString(),owner:f.owner,eventId:first.eventId,requests:requests.length,exactRequests:true,entryDisabled:true,productionWrites:0},null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({mode,status:'passed',requests:requests.length}));
}finally{await db.end();}
