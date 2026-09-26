import './vendor_storefront_network_guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { alignedUpperRegions } from '../../apps/web/src/lib/stores/scanRegionAlignmentV23.mjs';
import { footerEdgesAdmit } from '../../apps/web/src/lib/stores/scanGeometryV23.mjs';
function reference(){let seed=123456789;return Uint8Array.from({length:640*880},()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed>>>24;});}
function shiftRegion(source,target,[x1,y1,x2,y2],dx){for(let y=y1;y<y2;y++)for(let x=x1;x<x2;x++)target[y*640+x+dx]=source[y*640+x];}
test('one shared pixel offset corrects raster alignment without changing thresholds',()=>{
  const a=reference(),b=new Uint8Array(a.length);shiftRegion(a,b,[2,2,637,878],1);
  const result=alignedUpperRegions(a,b);assert.deepEqual(result.offset,{x:1,y:0});assert.ok(result.title>.99&&result.art>.99);
});
test('title and artwork cannot obtain separate convenient alignments',()=>{
  const a=reference(),b=new Uint8Array(a.length);
  shiftRegion(a,b,[30,20,610,143],1);shiftRegion(a,b,[38,148,602,517],-1);
  assert.equal(alignedUpperRegions(a,b),null);
});
test('blank, undersized and larger alignment errors fail closed',()=>{
  const a=reference(),b=new Uint8Array(a.length);shiftRegion(a,b,[3,3,636,877],2);
  assert.equal(alignedUpperRegions(a,b),null);
  assert.equal(alignedUpperRegions(new Uint8Array(a.length),new Uint8Array(a.length)),null);
  assert.equal(alignedUpperRegions(a,new Uint8Array(4)),null);
});
test('nonfinite or out-of-range edge scores cannot qualify',()=>{
  const base={referenceEdges:100,queryEdges:100,recall:.9,precision:.9,f1:.9};
  assert.equal(footerEdgesAdmit(base),true);
  for(const value of [NaN,Infinity,-1,1.01])assert.equal(footerEdgesAdmit({...base,recall:value}),false);
  assert.equal(footerEdgesAdmit({...base,referenceEdges:Infinity}),false);
});
