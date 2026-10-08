import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {discountRelease,discountReleaseSources} from '../../scripts/schema/product_discount_release_scope_v1.mjs';
import {eventRelease} from '../../scripts/schema/product_event_release_scope_v1.mjs';
import {dealRelease} from '../../scripts/schema/product_deal_release_scope_v1.mjs';
const dir=new URL('../../supabase/migrations/',import.meta.url);
const sources=Object.fromEntries(fs.readdirSync(dir).filter(n=>n.endsWith('.sql')&&n.split('_')[0]<='20261008170000').sort().map(n=>[n,createHash('sha256').update(fs.readFileSync(new URL(n,dir))).digest('hex')]));
const baseline=Object.fromEntries(Object.entries(sources).filter(([n])=>!Object.hasOwn(discountRelease.migrations,n)&&n!==eventRelease.migration&&n!==dealRelease.deferred&&!Object.hasOwn(dealRelease.added,n)));
test('discount release retains429 plus exact six additions and defers delivery',()=>{
 const result=discountReleaseSources(sources,baseline);assert.equal(Object.keys(result).length,435);assert.equal(result[discountRelease.deferred],undefined);
 for(const[n,h]of Object.entries({...baseline,...discountRelease.migrations}))assert.equal(result[n],h);
});
test('either changed or missing discount/cancellation and inherited release bytes refuse',()=>{
 for(const name of [...Object.keys(discountRelease.migrations),eventRelease.migration,discountRelease.deferred,...Object.keys(dealRelease.added),Object.keys(baseline)[0]]){
  assert.throws(()=>discountReleaseSources({...sources,[name]:'0'.repeat(64)},baseline));
  const missing={...sources};delete missing[name];assert.throws(()=>discountReleaseSources(missing,baseline));
 }
});
test('unexpected or duplicate version cannot replace qualified history',()=>{
 for(const name of ['20991008170000_unexpected.sql','20261008170000_duplicate.sql']){
  const changed={...sources};delete changed[Object.keys(baseline)[0]];changed[name]='0'.repeat(64);assert.throws(()=>discountReleaseSources(changed,baseline));
 }
});
