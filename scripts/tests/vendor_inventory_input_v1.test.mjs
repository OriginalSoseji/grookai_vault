import test from 'node:test';
import assert from 'node:assert/strict';
import { inventorySettings, inventoryId } from '../../apps/web/src/lib/stores/storeInventoryInput.ts';
const section='12345678-1234-4234-8234-123456789abc';
const valid={condition:'NM',intent:'sell',mode:'asking',amount:'12.50',currency:'usd',selected:true,sections:[section]};
test('exact-copy settings normalize prices and deduplicate explicit sections',()=>{
 assert.deepEqual(inventorySettings({...valid,sections:[section,section]}),{...valid,amount:12.5,currency:'USD'});
});
test('private, trade and showcase copies can be saved without a listing or asking price',()=>{
 for(const intent of ['hold','trade','showcase'])assert.equal(inventorySettings({...valid,intent,mode:'market',amount:'',selected:false}).amount,null);
});
test('listing requires explicit sale intent and positive asking price',()=>{
 for(const patch of [{intent:'hold'},{intent:'trade'},{mode:'market'},{amount:0},{selected:'true'}])assert.throws(()=>inventorySettings({...valid,...patch}));
});
test('malformed, negative, excessive or fractional-cent asking prices are rejected',()=>{
 for(const amount of ['',null,undefined,true,[],{},-1,Infinity,'NaN',100000000,'1.001'])assert.throws(()=>inventorySettings({...valid,amount}));
});
test('IDs, conditions, currencies and sections are validated before writing',()=>{
 assert.equal(inventoryId(section),section);
 for(const bad of ['',null,{},'not-a-uuid'])assert.throws(()=>inventoryId(bad));
 for(const patch of [{condition:'perfect'},{intent:'sold'},{mode:'free'},{currency:'$'},{sections:[null]},{sections:Array(51).fill(section)}])assert.throws(()=>inventorySettings({...valid,...patch}));
});
