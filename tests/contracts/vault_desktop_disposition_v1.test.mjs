import test from 'node:test';
import assert from 'node:assert/strict';
import {dispositionParams} from '../../apps/web/src/lib/vault/vaultDisposition.ts';
const sale={instanceId:'12345678-1234-1234-1234-123456789abc',type:'sale',salePrice:'12.34',counterparty:'  Buyer  ',tradeReceived:'',cashDirection:'none',cashAmount:''};
test('sale records actual USD amount and trimmed private context without trade fields',()=>{
 assert.deepEqual(dispositionParams(sale),{p_instance_id:sale.instanceId,p_disposition_type:'sale',p_sale_price_amount:12.34,p_sale_price_currency:'USD',p_counterparty_label:'Buyer',p_trade_received_description:null,p_trade_cash_direction:null,p_trade_cash_amount:null,p_trade_cash_currency:null});
});
for(const [name,patch] of [
 ['zero',{salePrice:'0'}],['negative',{salePrice:'-1'}],['nonfinite',{salePrice:'Infinity'}],['exponent',{salePrice:'1e3'}],['fractional cent',{salePrice:'2.001'}],['empty price',{salePrice:''}],['inexact large cents',{salePrice:'90071992547409.91'}],
 ['wrong copy',{instanceId:'not-a-copy'}],['forged owner',{ownerId:'other'}],['forged currency',{currency:'EUR'}],['sale with trade context',{tradeReceived:'card'}],
 ['sale with trade cash',{cashDirection:'paid',cashAmount:'1'}],['long context',{counterparty:'x'.repeat(121)}],['unknown type',{type:'paid'}],
]) test(`reject ${name}`,()=>assert.throws(()=>dispositionParams({...sale,...patch})));
for(const direction of ['none','paid','received']) test(`trade keeps ${direction} cash distinct from sale price`,()=>{
 const p=dispositionParams({...sale,type:'trade',salePrice:'',counterparty:'',tradeReceived:'Two cards',cashDirection:direction,cashAmount:direction==='none'?'':'3.25'});
 assert.equal(p.p_sale_price_amount,null);assert.equal(p.p_sale_price_currency,null);assert.equal(p.p_counterparty_label,null);
 assert.equal(p.p_trade_cash_direction,direction==='none'?null:direction);assert.equal(p.p_trade_cash_amount,direction==='none'?null:3.25);
});
for(const patch of [{salePrice:'5'},{tradeReceived:'  '},{cashDirection:'none',cashAmount:'5'},{cashDirection:'received',cashAmount:''}]) test(`incomplete/ambiguous trade rejected ${JSON.stringify(patch)}`,()=>assert.throws(()=>dispositionParams({...sale,type:'trade',salePrice:'',tradeReceived:'A card',...patch})));
