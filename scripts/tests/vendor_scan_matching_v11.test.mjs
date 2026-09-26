import './vendor_storefront_network_guard.cjs';
import test from 'node:test';import assert from 'node:assert/strict';
import {numberWordRegions} from '../../apps/web/src/lib/stores/scanNumberRegionsV11.mjs';
import {qualifiedFooter} from '../../apps/web/src/lib/stores/scanOcrEvidenceV10.mjs';
import {printedIdentityEvidence} from '../../apps/web/src/lib/stores/scanPrintedIdentityV9.mjs';
const word=(text,confidence=30,bbox={x0:10,y0:20,x1:100,y1:40})=>({text,confidence,bbox});
const data=words=>({blocks:[{paragraphs:[{lines:[{words}]}]}]});
test('uncertain number-shaped words locate bounded pixels without supplying identity',()=>{
 assert.deepEqual(numberWordRegions(data([word('0157165')]),200,100),[{left:7,top:17,width:96,height:26}]);
 assert.equal(numberWordRegions(data([word('TG01/TG30')]),200,100).length,1);
 assert.equal(numberWordRegions(data([word('©2023'),word('HP130'),word('rules')]),200,100).length,0);
 assert.equal(numberWordRegions(data([word('011/165',90)]),200,100).length,0);
});
test('invalid OCR boxes, unbounded dimensions and duplicate regions cannot add work',()=>{
 for(const bbox of [{x0:-1,y0:0,x1:20,y1:10},{x0:1,y0:1,x1:201,y1:10},{x0:1,y0:1,x1:1,y1:5},{x0:1.5,y0:1,x1:30,y1:10},{x0:1,y0:1,x1:2,y1:90}])assert.deepEqual(numberWordRegions(data([word('53/162',0,bbox)]),200,100),[]);
 assert.deepEqual(numberWordRegions(data([word('53/162')]),Infinity,100),[]);
 assert.equal(numberWordRegions(data([word('53/162'),word('53/162')]),200,100).length,1);
 assert.equal(numberWordRegions(data([0,1,2,3].map(i=>word('01/30',0,{x0:10+i*40,y0:20,x1:40+i*40,y1:30}))),200,100).length,2);
});
test('word rereads retain conflicts and never count as a new weak crop vote',()=>{
 const read=(crop,text,confidence)=>({crop,data:data([word(text,confidence)])});
 assert.equal(qualifiedFooter([read('full','011/165',40),read('full','011/165',60)]),'');
 const strong=qualifiedFooter([read('full','011/165',90),read('full','012/165',85)]);
 assert.equal(printedIdentityEvidence(strong,'011',{total:165}).conflict,true);
 assert.equal(printedIdentityEvidence(qualifiedFooter([read('full','31/73',90)]),'31',{total:78}).conflict,true);
});
