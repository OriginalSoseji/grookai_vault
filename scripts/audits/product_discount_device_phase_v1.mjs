import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import pg from 'pg';
const root='C:/gv_product_discount_20261008',base='C:/grookai_vault_operator_artifacts/product_discount_20261008';
assert.equal(process.cwd().replaceAll('\\','/'),root);assert.equal(process.argv.length,4);
const[mode,run]=process.argv.slice(2);assert.ok(['disable','verify'].includes(mode));assert.match(run,new RegExp('^'+base+'/ui-[0-9]+$'));
const read=p=>JSON.parse(fs.readFileSync(p)),f=read(run+'/fixture.private.json');assert.equal(f.state,'prepared');assert.equal(f.project,'discount-full-436-v1-20261008');
const first=read(run+'/phase-1/device-response.json');assert.equal(first.phase,'discount_pending');assert.equal(first.owner,f.owner);assert.equal(first.sent.length,1);
const pending=JSON.parse(first.pendingRaw);assert.deepEqual(first.sent[0],pending);assert.equal(pending.cart.version,6);assert.equal(pending.cart.discountMinor,2000);assert.equal(first.receipt.totalMinor,18100);assert.equal(first.profit.knownProfitMinor,'7500');assert.equal(first.profit.unknownSalesMinor,'4500');
const container=JSON.parse(execFileSync('docker',['inspect','supabase_db_'+f.project],{encoding:'utf8',windowsHide:true}))[0];assert.equal(container.State.Running,true);assert.deepEqual(Object.keys(container.NetworkSettings.Networks),[f.project]);
const db=new pg.Client({connectionString:'postgresql://postgres:postgres@127.0.0.1:34600/postgres',connectionTimeoutMillis:10000});await db.connect();
const q=async(sql,args=[])=>(await db.query(sql,args)).rows;
const controls=['vendor_discount_control','vendor_event_control','vendor_receipt_cloud_control','vendor_sales_cart_control','vendor_sales_payment_control','vendor_sales_trade_control','vendor_purchase_control','vendor_negotiated_trade_control'];
try{
 assert.equal((await q('select host(inet_server_addr()) address'))[0].address,container.NetworkSettings.Networks[f.project].IPAddress);
 const receipts=await q('select request_id,request,receipt from vendor_sales_cart_receipts where owner_id=$1',[f.owner]);assert.equal(receipts.length,2);const recorded=receipts.find(r=>r.request_id===pending.id);assert.deepEqual(recorded.request,pending.cart);assert.deepEqual(recorded.receipt,first.receipt);
 assert.deepEqual((await q('select sale_price_amount::text amount from vault_item_instance_dispositions where user_id=$1 order by sale_price_amount',[f.owner])).map(r=>Number(r.amount)),[45,90]);
 assert.equal((await q('select * from vendor_sales_cart_cancellations where owner_id=$1',[f.owner])).length,0);
 if(mode==='disable'){
  await q('begin');for(const t of controls){assert.equal((await q(`select enabled from ${t}`))[0].enabled,true);await q(`update ${t} set enabled=false`);}await q('update vendor_cost_evidence_control set capture_enabled=false');await q('commit');
 }else{
  const second=read(run+'/phase-2/device-response.json');assert.equal(second.phase,'discount_recovered');assert.equal(second.owner,f.owner);for(const key of ['exactPendingAndDraftRetained','noSecondCompletion','pendingClearedAfterReceipt','heldKindsRetained','accountClosed'])assert.equal(second[key],true);
 }
 for(const t of controls)assert.equal((await q(`select enabled from ${t}`))[0].enabled,false);
 fs.writeFileSync(run+'/device-'+mode+'-proof.json',JSON.stringify({status:'passed',at:new Date().toISOString(),owner:f.owner,requestId:pending.id,receiptCount:receipts.length,exactRequest:true,allEntryDisabled:true,productionWrites:0},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({mode,status:'passed',receiptCount:receipts.length}));
}finally{await db.end();}
