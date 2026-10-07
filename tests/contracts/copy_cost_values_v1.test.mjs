import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCopyCost,validateCostRequest,confirmedCostResult,costStatusLabel} from '../../apps/web/src/lib/vault/copyCost.mjs';
const ownerId='11111111-1111-4111-8111-111111111111',instanceId='22222222-2222-4222-8222-222222222222',requestId='33333333-3333-4333-8333-333333333333';
const request={ownerId,instanceId,requestId,expectedAmount:'12.3400',expectedCurrency:null,amount:'12.34',currency:'USD'};
for(const [input,currency,amount,minor]of [['0','USD','0.00','0'],['12.3400','usd','12.34','1234'],['.50','CAD','0.50','50'],['9999999999.99','USD','9999999999.99','999999999999'],['','',null,null]]){
 test('cost retains exact value '+JSON.stringify([input,currency]),()=>assert.deepEqual(parseCopyCost(input,currency),{amount,currency:currency?currency.toUpperCase():null,minor}));
}
for(const input of ['-1','1.001','10000000000','NaN','Infinity','1e2','1,234.00','$5.00'])test('cost rejects ambiguous or unsupported amount '+input,()=>assert.throws(()=>parseCopyCost(input,'USD')));
test('cost never assumes currency or changes a missing amount into zero',()=>{
 assert.throws(()=>parseCopyCost('0',''));assert.throws(()=>parseCopyCost('','USD'));
 assert.notDeepEqual(parseCopyCost('0','USD'),parseCopyCost('',''));
 assert.equal(costStatusLabel({amount:'12.34',currency:null,minor:null,status:'missing_currency'}),'Cost currency needed');
});
test('request preserves the exact old pair while normalizing only the new confirmed cost',()=>{
 assert.deepEqual(validateCostRequest(request),request);
 assert.equal(validateCostRequest({...request,expectedAmount:'-12.00'}).expectedAmount,'-12.00');
 for(const bad of [{...request,amount:12.34},{...request,currency:'usd'},{...request,amount:'12.3400'},{...request,ownerId:'other'},{...request,extra:true}])assert.throws(()=>validateCostRequest(bad));
});
test('recovery checks owner, copy, request and exact cost before confirming a save',()=>{
 const result={ownerId,instanceId,requestId,cost:{amount:'12.34',currency:'USD',minor:'1234',status:'known'}};
 assert.equal(confirmedCostResult(result,request),true);
 assert.equal(confirmedCostResult({...result,cost:{...result.cost,amount:'18.00'}},request),false);
 for(const bad of [{...result,ownerId:instanceId},{...result,instanceId:ownerId},{...result,requestId:ownerId},{...result,cost:{...result.cost,minor:'1235'}},{...result,cost:{...result.cost,currency:'CAD'}}])assert.equal(confirmedCostResult(bad,request),false);
 const cleared={...request,amount:null,currency:null};
 assert.equal(confirmedCostResult({...result,cost:{amount:null,currency:null,minor:null,status:'missing_amount'}},cleared),true);
 assert.equal(confirmedCostResult(result,cleared),false);
});
