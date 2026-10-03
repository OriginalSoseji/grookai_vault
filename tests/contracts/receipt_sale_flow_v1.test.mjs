import test from 'node:test';
import assert from 'node:assert/strict';
import { receiptSaleId, receiptDestination, readReceiptSale } from '../../apps/web/src/lib/receipts/receiptSale.ts';
const id='12345678-1234-4234-8234-123456789abc',owner='22345678-1234-4234-8234-123456789abc';
const row={id,gv_vi_id:'GVVI-FIXTURE-000001',disposition_type:'sale',sale_price_amount:'12.34',sale_price_currency:'USD',counterparty_label:'Fixture buyer'};
function client(result,source={data:null,error:null}){const calls=[],q={};for(const method of ['select','eq'])q[method]=(...args)=>{calls.push([method,...args]);return q;};q.maybeSingle=async()=>result;return {calls,rpc:async()=>source,from(table){calls.push(['from',table]);return q;}};}

test('all copies from one cart reopen its shared receipt and failed resolution does not create a second draft',async()=>{
 const c=client({data:row,error:null},{data:owner,error:null});
 assert.equal((await readReceiptSale(c,owner,id)).sourceDispositionId,owner);
 await assert.rejects(readReceiptSale(client({data:row,error:null},{data:null,error:{code:'503'}}),owner,id),/Please retry/);
 assert.equal((await readReceiptSale(client({data:row,error:null},{data:null,error:{code:'PGRST202'}}),owner,id)).sourceDispositionId,id);
});
test('receipt destinations preserve exact sale identity and support disabled-cloud fallback',()=>{
 assert.equal(receiptDestination(true,id.toUpperCase()),'/account/store/receipts/cloud?sale='+id);
 assert.equal(receiptDestination(false,id),'/account/store/receipts?sale='+id);
 assert.equal(receiptDestination(true),'/account/store/receipts/cloud');
 for(const value of ['',null,[id],id+'&owner=other','https://other.invalid']){assert.equal(receiptSaleId(value),null);assert.throws(()=>receiptDestination(true,value),/invalid/);}
});
test('manual desk does not query a source sale; malformed requests do not query private records',async()=>{
 const c=client({});assert.equal(await readReceiptSale(c,owner,undefined),null);
 for(const value of ['',null,[id],'bad'])await assert.rejects(readReceiptSale(c,owner,value),/invalid/);
 assert.deepEqual(c.calls,[]);
});
test('prefill loads only the authenticated owner and exact recorded sale',async()=>{
 const c=client({data:row,error:null});assert.deepEqual(await readReceiptSale(c,owner,id),{description:row.gv_vi_id,price:'12.34',customerName:'Fixture buyer',sourceDispositionId:id});
 assert.deepEqual(c.calls.filter(c=>c[0]==='eq'),[['eq','id',id],['eq','user_id',owner]]);
 assert.equal(c.calls[0][1],'vault_item_instance_dispositions');
});
test('foreign, missing, and failed reads have the same unavailable response',async()=>{
 for(const result of [{data:null,error:null},{data:null,error:{message:'secret database details'}}])await assert.rejects(readReceiptSale(client(result),owner,id),/^Error: This recorded sale is unavailable for your account\.$/);
});
for(const patch of [{disposition_type:'trade'},{sale_price_currency:'EUR'},{sale_price_amount:null},{sale_price_amount:'NaN'},{sale_price_amount:'0'},{sale_price_amount:'1000000.01'}])test('unsupported source cannot create a draft: '+JSON.stringify(patch),async()=>{
 await assert.rejects(readReceiptSale(client({data:{...row,...patch},error:null}),owner,id),/completed USD sales/);
});
