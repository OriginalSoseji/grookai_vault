import test from 'node:test';
import assert from 'node:assert/strict';
import {recordOwnerDisposition} from '../../apps/web/src/lib/vault/vaultDisposition.ts';

const owner='11111111-1111-4111-8111-111111111111';
const id='22222222-2222-4222-8222-222222222222';
const parent='33333333-3333-4333-8333-333333333333';
const sale={instanceId:id,type:'sale',salePrice:'12.25',counterparty:'Buyer',tradeReceived:'',cashDirection:'none',cashAmount:''};
function fixture({foreign=false,authenticated=true,lost=false,denied=false}={}) {
  let archived=false, receipt=null;
  const calls=[];
  const proofClient={from(table){assert.equal(table,'vault_item_instances');const filters={};return {
    select(){return this;},eq(k,v){filters[k]=v;return this;},async maybeSingle(){
      assert.deepEqual(filters,{id,user_id:owner});
      return {error:null,data:foreign?null:{id,gv_vi_id:'GVVI-SALE-1',card_print_id:parent,archived_at:archived?'2026-09-27T00:00:00Z':null}};
    },
  };}};
  const client={auth:{getUser:async()=>({data:{user:authenticated?{id:owner}:null},error:null})},
    from(table){assert.equal(table,'vault_item_instance_dispositions');const filters={};return {
      select(){return this;},eq(k,v){filters[k]=v;return this;},async maybeSingle(){assert.deepEqual(filters,{user_id:owner,vault_item_instance_id:id});return {data:receipt,error:null};},
    };},
    async rpc(name,params){assert.equal(name,'vault_record_exact_instance_disposition_v2');calls.push(params);
      if(denied)return {data:null,error:{code:'42501'}};
      archived=true;receipt={id:'receipt-1',vault_item_instance_id:id,gv_vi_id:'GVVI-SALE-1',disposition_type:'sale',sale_price_amount:12.25,sale_price_currency:'USD',counterparty_label:'Buyer',trade_received_description:null,trade_cash_direction:null,trade_cash_amount:null,trade_cash_currency:null,created_at:'2026-09-27T00:00:00Z'};
      return {error:lost?{code:'transport'}:null,data:lost?null:{archived_instance_id:id,gv_vi_id:'GVVI-SALE-1',card_print_id:parent,disposition_id:'receipt-1',disposition_type:'sale'}};
    },
  };
  return {client,proofClient,calls};
}
test('store sale uses authenticated disposition authority and returns confirmed actual price',async()=>{
  const f=fixture(),r=await recordOwnerDisposition(f.client,owner,sale,f.proofClient);
  assert.equal(r.salePrice,12.25);assert.equal(r.instanceId,id);assert.equal(f.calls.length,1);
});
test('lost sale response and identical retry resolve the existing receipt without another write',async()=>{
  const f=fixture({lost:true});
  const first=await recordOwnerDisposition(f.client,owner,sale,f.proofClient);
  assert.deepEqual(await recordOwnerDisposition(f.client,owner,sale,f.proofClient),first);
  assert.equal(f.calls.length,1);
});
test('a changed retry cannot replace the previously recorded sale',async()=>{
  const f=fixture();await recordOwnerDisposition(f.client,owner,sale,f.proofClient);
  await assert.rejects(recordOwnerDisposition(f.client,owner,{...sale,salePrice:'20'},f.proofClient));
  assert.equal(f.calls.length,1);
});
for(const options of [{foreign:true},{authenticated:false}])test(`unavailable owner copy never reaches the sale writer ${JSON.stringify(options)}`,async()=>{
  const f=fixture(options);await assert.rejects(recordOwnerDisposition(f.client,owner,sale,f.proofClient));assert.equal(f.calls.length,0);
});
test('RPC denial does not become a success receipt',async()=>{
  const f=fixture({denied:true});await assert.rejects(recordOwnerDisposition(f.client,owner,sale,f.proofClient));assert.equal(f.calls.length,1);
});
