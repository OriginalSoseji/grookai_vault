import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {eventRelease,eventReleaseSources} from '../../scripts/schema/product_event_release_scope_v1.mjs';
import {dealRelease} from '../../scripts/schema/product_deal_release_scope_v1.mjs';
const dir=new URL('../../supabase/migrations/',import.meta.url);
const sources=Object.fromEntries(fs.readdirSync(dir).filter(n=>n.endsWith('.sql')&&n.split('_')[0]<='20261008130000').sort().map(n=>[n,createHash('sha256').update(fs.readFileSync(new URL(n,dir))).digest('hex')]));
const baseline=Object.fromEntries(Object.entries(sources).filter(([n])=>n!==eventRelease.migration&&n!==dealRelease.deferred&&!Object.hasOwn(dealRelease.added,n)));
test('event package preserves429 baseline and four exact additions while deferring delivery',()=>{
 const result=eventReleaseSources(sources,baseline);assert.equal(Object.keys(result).length,433);assert.equal(result[eventRelease.deferred],undefined);assert.equal(result[eventRelease.migration],eventRelease.sha256);
 for(const [n,h]of Object.entries(baseline))assert.equal(result[n],h);
});
test('changed or missing event, deal, delivery or historical bytes refuse',()=>{
 for(const name of [eventRelease.migration,eventRelease.deferred,...Object.keys(dealRelease.added),Object.keys(baseline)[0]]){
  assert.throws(()=>eventReleaseSources({...sources,[name]:'0'.repeat(64)},baseline));
  const missing={...sources};delete missing[name];assert.throws(()=>eventReleaseSources(missing,baseline));
 }
});
test('unexpected additions and duplicate versions cannot replace qualified history',()=>{
 for(const name of ['20991008130000_unexpected.sql','20261008130000_duplicate.sql']){
  const changed={...sources};delete changed[Object.keys(baseline)[0]];changed[name]='0'.repeat(64);assert.throws(()=>eventReleaseSources(changed,baseline));
 }
});
