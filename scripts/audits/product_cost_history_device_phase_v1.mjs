import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import pg from 'pg';
const root='C:/gv_product_cost_history_20261008',base='C:/grookai_vault_operator_artifacts/product_cost_history_20261008';
assert.equal(process.cwd().replaceAll('\\','/'),root);assert.equal(process.argv.length,4);
const[mode,run]=process.argv.slice(2);assert.ok(['disable','verify'].includes(mode));assert.match(run,new RegExp('^'+base+'/ui-[0-9]+$'));
const read=p=>JSON.parse(fs.readFileSync(p)),f=read(run+'/fixture.private.json');assert.equal(f.state,'prepared');assert.equal(f.project,'costhist-full-437-v1-20261008');
const first=read(run+'/phase-1/device-response.json');assert.equal(first.phase,'cost_history_pending');assert.equal(first.owner,f.owner);assert.equal(first.sent.length,4);assert.deepEqual(first.journal.pending,first.sent[3]);assert.equal(first.result.status,'applied');assert.deepEqual(first.result.request,first.journal.pending);
const container=JSON.parse(execFileSync('docker',['inspect','supabase_db_'+f.project],{encoding:'utf8',windowsHide:true}))[0];assert.equal(container.State.Running,true);assert.deepEqual(Object.keys(container.NetworkSettings.Networks),[f.project]);
const db=new pg.Client({connectionString:'postgresql://postgres:postgres@127.0.0.1:35000/postgres',connectionTimeoutMillis:10000});await db.connect();
const q=async(sql,args=[])=>(await db.query(sql,args)).rows;
try{
 assert.equal((await q('select host(inet_server_addr()) address'))[0].address,container.NetworkSettings.Networks[f.project].IPAddress);
 const rows=await q('select request,status,revision::text from vendor_sale_cost_correction_requests where owner_id=$1 order by revision',[f.owner]);assert.equal(rows.length,4);
 for(let i=0;i<4;i++){assert.deepEqual(rows[i].request,first.sent[i]);assert.equal(rows[i].status,'applied');assert.equal(rows[i].revision,String(i+1));assert.equal(first.sent[i].receipt.id,f.receipts.unknown.id);assert.deepEqual(first.sent[i].receipt,f.receipts.unknown);assert.equal(first.sent[i].expectedRevision,String(i));}
 assert.equal(first.sent[0].cost.minor,'2000');assert.equal(first.sent[1].action,'restore');assert.equal(first.sent[1].cost,null);assert.equal(first.sent[2].cost.minor,'0');assert.equal(first.sent[3].cost.minor,'2500');
 if(mode==='disable'){assert.equal((await q('select enabled from vendor_sale_cost_correction_control'))[0].enabled,true);await q('update vendor_sale_cost_correction_control set enabled=false');}
 else {const second=read(run+'/phase-2/device-response.json');assert.equal(second.phase,'cost_history_recovered');assert.equal(second.owner,f.owner);for(const key of ['exactJournalRetained','pendingCleared','noSecondApply','accountClosed'])assert.equal(second[key],true);}
 assert.equal((await q('select enabled from vendor_sale_cost_correction_control'))[0].enabled,false);
 fs.writeFileSync(run+'/device-'+mode+'-proof.json',JSON.stringify({status:'passed',at:new Date().toISOString(),corrections:4,exactRequests:true,entryOff:true,productionWrites:0},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({mode,status:'passed',corrections:4}));
}finally{await db.end();}
