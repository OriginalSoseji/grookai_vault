import './vendor_storefront_network_guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { boundedFooterTransform } from '../../apps/web/src/lib/stores/scanLocalAlignmentV21.mjs';
import { edgeAgreement } from '../../apps/web/src/lib/stores/scanFooterEdgesV22.mjs';
import { footerEdgesAdmit, combineCorrespondences } from '../../apps/web/src/lib/stores/scanGeometryV22.mjs';

test('local registration cannot reflect, excessively stretch, move outside or wander across the card',()=>{
  assert.equal(boundedFooterTransform([1,0,-2,0,1,-3]),true);
  for(const matrix of [[-1,0,640,0,1,0],[1.2,0,0,0,1,0],[1,0,19,0,1,0],[1,0,0,0,1,-21],[1,.1,0,0,1,0],[NaN,0,0,0,1,0],[]])assert.equal(boundedFooterTransform(matrix),false);
});
test('combined feature views cannot count the same point twice or resolve conflicting matches',()=>{
  assert.deepEqual(combineCorrespondences([[10,20,30,40]],[[10.1,20.1,30.2,40.2],[50,60,70,80]]),[[10,20,30,40],[50,60,70,80]]);
  assert.deepEqual(combineCorrespondences([[10,20,30,40]],[[10,20,100,100],[10,20,30,40]]),[]);
});
function edges(){const array=new Uint8Array(100*100);for(let y=10;y<90;y+=5)for(let x=10;x<90;x+=5)array[y*100+x]=255;return array;}
test('edge evidence allows one-pixel alignment noise but rejects a shifted unrelated pattern',()=>{
  const a=edges(),b=new Uint8Array(a.length),wrong=new Uint8Array(a.length);
  for(let y=10;y<90;y++)for(let x=10;x<90;x++)if(a[y*100+x]){b[y*100+x+1]=255;wrong[(y+2)*100+x+2]=255;}
  assert.equal(footerEdgesAdmit(edgeAgreement(a,b,100,100,[5,5,95,95])),true);
  assert.equal(footerEdgesAdmit(edgeAgreement(a,wrong,100,100,[5,5,95,95])),false);
});
test('one-sided, sparse, blank or dense noise cannot qualify as printed detail',()=>{
  const a=edges(),empty=new Uint8Array(a.length),dense=new Uint8Array(a.length).fill(255);
  assert.equal(footerEdgesAdmit(edgeAgreement(a,empty,100,100,[5,5,95,95])),false);
  assert.equal(footerEdgesAdmit(edgeAgreement(a,dense,100,100,[5,5,95,95])),false);
  assert.equal(footerEdgesAdmit({referenceEdges:100,queryEdges:100,recall:1,precision:.4,f1:.6}),false);
  assert.equal(footerEdgesAdmit({referenceEdges:10,queryEdges:10,recall:1,precision:1,f1:1}),false);
});
