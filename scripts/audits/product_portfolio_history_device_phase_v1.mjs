import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import pg from 'pg';
const root='C:/gv_product_portfolio_history_20261008',base='C:/grookai_vault_operator_artifacts/product_portfolio_history_20261008';
assert.equal(process.cwd().replaceAll('\\','/'),root);assert.equal(process.argv.length,4);const[mode,run]=process.argv.slice(2);assert.ok(['disable','verify'].includes(mode));assert.match(run,new RegExp('^'+base+'/ui-[0-9]+$'));
const read=p=>JSON.parse(fs.readFileSync(p)),f=read(run+'/fixture.private.json');assert.equal(f.state,'prepared');assert.equal(f.project,'portfolio-full-438-v2-20261008');
const first=read(run+'/phase-1/device-response.json');assert.equal(first.phase,'portfolio_history_pending');assert.equal(first.owner,f.owner);assert.equal(first.sent.length,1);assert.deepEqual(first.journal.pending,first.sent[0]);assert.equal(first.result.status,'captured');assert.deepEqual(first.result.request,first.journal.pending);assert.equal(first.result.summary.totals.USD.exact,'12.34');assert.equal(first.completeExportCopies,2);assert.equal(first.loadedObservations,41);
const container=JSON.parse(execFileSync('docker',['inspect','supabase_db_'+f.project],{encoding:'utf8',windowsHide:true}))[0];assert.equal(container.State.Running,true);assert.deepEqual(Object.keys(container.NetworkSettings.Networks),[f.project]);
const db=new pg.Client({connectionString:'postgresql://postgres:postgres@127.0.0.1:35520/postgres',connectionTimeoutMillis:10000});await db.connect();
const q=async(sql,args=[])=>(await db.query(sql,args)).rows;
try{
 assert.equal((await q('select host(inet_server_addr()) address'))[0].address,container.NetworkSettings.Networks[f.project].IPAddress);
 const rows=await q('select request,status,point_id from portfolio_history_requests where owner_id=$1',[f.owner]);assert.equal(rows.length,1);assert.deepEqual(rows[0].request,first.sent[0]);assert.equal(rows[0].status,'captured');assert.equal(rows[0].point_id,first.result.pointId);
 const points=await q('select summary from portfolio_history_points where owner_id=$1 and sequence=41',[f.owner]);assert.equal(points.length,1);assert.deepEqual(points[0].summary,first.result.summary);
 if(mode==='disable'){assert.equal((await q('select enabled from portfolio_history_control'))[0].enabled,true);await q('update portfolio_history_control set enabled=false');}
 else{const second=read(run+'/phase-2/device-response.json');assert.equal(second.phase,'portfolio_history_recovered');assert.equal(second.owner,f.owner);for(const key of ['exactJournalRetained','pendingCleared','noSecondCapture','accountClosed'])assert.equal(second[key],true);assert.notEqual(second.processId,first.processId);}
 assert.equal((await q('select enabled from portfolio_history_control'))[0].enabled,false);
 fs.writeFileSync(run+'/device-'+mode+'-proof.json',JSON.stringify({status:'passed',at:new Date().toISOString(),captures:1,points:41,exactRequest:true,entryOff:true,productionWrites:0},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({mode,status:'passed',captures:1}));
}finally{await db.end();}
