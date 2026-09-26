import './vendor_storefront_network_guard.cjs';
import test from 'node:test';import assert from 'node:assert/strict';
import {qualifiedFooter} from '../../apps/web/src/lib/stores/scanOcrEvidenceV10.mjs';
import {printedIdentityEvidence} from '../../apps/web/src/lib/stores/scanPrintedIdentityV9.mjs';
const read=(crop,words)=>({crop,data:{blocks:[{paragraphs:[{lines:[{words:words.map(([text,confidence])=>({text,confidence}))}]}]}]}});
test('weak OCR noise neither becomes a new identity nor vetoes a clear reading',()=>{
 const text=qualifiedFooter([read('full',[['OS6/165',74]]),read('wide',[['056/165',40]]),read('strip',[['056/165',60]])]);
 assert.equal(text,'56/165');assert.equal(printedIdentityEvidence(text,'056',{total:165}).conflict,false);
 assert.equal(qualifiedFooter([read('full',[['em',36],['en',31],['S88',51]])]),'');
});
test('two threshold variants of one crop do not count as separate supporting crops',()=>{
 assert.equal(qualifiedFooter([read('strip',[['050/165',50]]),read('strip',[['050/165',60]])]),'');
 assert.equal(qualifiedFooter([read('full',[['050/165',50]]),read('strip',[['050/165',60]])]),'50/165');
});
test('all strong contradictions survive, including denominator and promo disagreements',()=>{
 const text=qualifiedFooter([read('a',[['4/72',90]]),read('b',[['4/163',95]])]);
 assert.equal(printedIdentityEvidence(text,'4',{total:72}).conflict,true);
 assert.equal(printedIdentityEvidence(qualifiedFooter([read('a',[['SWSH120',92]])]),'120').conflict,true);
 assert.equal(printedIdentityEvidence(qualifiedFooter([read('a',[['31/73',92]])]),'31',{total:78}).conflict,true);
});
test('unknown spans and separate lines cannot invent a fraction or language marker',()=>{
 assert.equal(qualifiedFooter([read('a',[['56',95],['noise',0],['/165',95]])]),'');
 const value=read('a',[]);value.data.blocks[0].paragraphs[0].lines=[{words:[{text:'PAR',confidence:90}]},{words:[{text:'EN',confidence:95}]}];
 assert.equal(qualifiedFooter([value]),'');
});
test('gallery prefixes, alternate suffixes and standalone promos survive qualification',()=>{
 for(const [token,number,total] of [['TG01/TG30','TG01',30],['105a/147','105a',147],['SWSH120','SWSH120',null]]){
  const value=qualifiedFooter([read('full',[[token,95]])]);assert.equal(printedIdentityEvidence(value,number,{total}).numberMatch,true);
 }
});
