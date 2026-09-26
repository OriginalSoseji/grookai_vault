import test from 'node:test';
import assert from 'node:assert/strict';
import {preorderTerms,preorderCents,preorderId} from '../../apps/web/src/lib/stores/storePreorderInput.ts';
const valid={title:' Upcoming box ',description:'',expected_date:'2026-12-01',price_cents:10000,allocation_limit:10,payment_mode:'reservation',deposit_cents:null,terms:'Allocation subject to confirmation.'};
test('each preorder can choose reservation, full payment or a bounded deposit',()=>{
 for(const payment_mode of ['reservation','full','deposit'])assert.equal(preorderTerms({...valid,payment_mode,deposit_cents:payment_mode==='deposit'?2500:null}).payment_mode,payment_mode);
 assert.equal(preorderTerms(valid).title,'Upcoming box');
});
test('invalid dates, fractional stock and unbounded amounts fail before persistence',()=>{
 for(const patch of [{expected_date:'2026-02-30'},{expected_date:'tomorrow'},{title:' '},{terms:''},{allocation_limit:0},{allocation_limit:1.5},{allocation_limit:100001},{price_cents:1.1},{price_cents:0},{price_cents:Infinity},{price_cents:100000001},{payment_mode:'subscription'}])assert.throws(()=>preorderTerms({...valid,...patch}));
});
test('deposits must be integer cents strictly between zero and total, with no deposit in other modes',()=>{
 for(const deposit_cents of [null,0,-1,10000,10001,1.5,'100'])assert.throws(()=>preorderTerms({...valid,payment_mode:'deposit',deposit_cents}));
 assert.throws(()=>preorderTerms({...valid,deposit_cents:100}));
});
test('decimal amounts and stable request IDs cannot silently lose precision',()=>{
 assert.equal(preorderCents('12.34'),1234);assert.equal(preorderCents('0.29'),29);
 for(const v of ['', '1.999','1e3','-1','NaN'])assert.throws(()=>preorderCents(v));
 assert.equal(preorderId('12345678-1234-4234-8234-123456789abc'),'12345678-1234-4234-8234-123456789abc');
 for(const v of ['',null,[],{}])assert.throws(()=>preorderId(v));
});
