import './vendor_storefront_network_guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { printedCoordinates, collectorToken, printedIdentityEvidence as evidence } from '../../apps/web/src/lib/stores/scanPrintedIdentityV8.mjs';
import { chooseEvidenceMatches } from '../../apps/web/src/lib/stores/scanMatchV8.mjs';

test('card denominators override sets; anthology membership is not a denominator', () => {
  assert.equal(printedCoordinates({printed_total:72},{printed_total:163}).total,72);
  assert.equal(printedCoordinates({}, {printed_total:163}).total,163);
  assert.equal(printedCoordinates({}, {printed_total:163,identity_model:'reprint_anthology'}).total,null);
  assert.equal(printedCoordinates({printed_total:72},{printed_total:163,identity_model:'reprint_anthology'}).total,72);
  assert.deepEqual(printedCoordinates({printed_total:'72',set_code:'SHF'},{}),{total:null,setCode:null});
});
test('same number in another set cannot pass a known conflicting denominator', () => {
  assert.equal(evidence('004/072','4',{total:72}).totalMatch,true);
  assert.equal(evidence('004/072','4',{total:163}).conflict,true);
  assert.equal(evidence('004/072','4',{}).totalMatch,false);
  assert.equal(evidence('004/072 004/163','4',{total:72}).conflict,true);
});
test('gallery, promo and suffix letters are retained rather than converted to numeric cards', () => {
  assert.equal(collectorToken('TG001').key,'TG1');
  assert.equal(evidence('TG01/TG30','TG1',{total:30}).totalMatch,true);
  assert.equal(evidence('TG01/TG30','1',{total:30}).conflict,true);
  assert.equal(evidence('105a/147','105a',{total:147}).numberMatch,true);
  assert.equal(evidence('105a/147','105',{total:147}).conflict,true);
  assert.equal(evidence('SWSH120','SWSH120').numberMatch,true);
  assert.equal(evidence('SWSH120','120').numberMatch,false);
  assert.equal(evidence('Copyright 2021','2021').numberMatch,false);
  assert.equal(evidence('TG01/GG70','TG1',{total:70}).numberMatch,false);
});
test('printed set codes need explicit metadata and a language-marked footer token', () => {
  assert.equal(evidence('PAR EN 134/182','134',{setCode:'PAR',total:182}).setMatch,true);
  assert.equal(evidence('PAR EN 134/182','134',{setCode:'SVI',total:182}).conflict,true);
  assert.equal(evidence('PAR EN 134/182','134',{total:182}).setKnown,false);
  assert.equal(evidence('PAR 134/182','134',{setCode:'PAR'}).setMatch,false);
});
const cards=[{id:'a',name:'Cacnea',number:'4',printedCoordinates:{total:72}},{id:'b',name:'Cacnea',number:'4',printedCoordinates:{total:163}}];
const ranked=cards.map(card=>({id:card.id,distance:.1,artDistance:.02,artGap:0}));
const run=(footer,catalog=cards)=>chooseEvidenceMatches([{title:'Cacnea',footer,rotation:0,ranked}],catalog);
test('same-art candidates split by denominator; unreadable or conflicting evidence never silently picks one', () => {
  assert.deepEqual(run('004/072').candidates.map(c=>c.id),['a']);
  assert.deepEqual(run('004/163').candidates.map(c=>c.id),['b']);
  assert.equal(run('').status,'no_match');
  assert.equal(run('004/072 004/163').status,'no_match');
  const unknown=cards.map(card=>({...card,printedCoordinates:{}}));
  assert.equal(run('004/072',unknown).status,'ambiguous');
});
test('new identity evidence cannot override mismatched names or distant artwork', () => {
  const observation={title:'Cacturne',footer:'004/072',rotation:0,ranked};
  assert.equal(chooseEvidenceMatches([observation],cards).status,'no_match');
  assert.equal(chooseEvidenceMatches([{...observation,title:'Cacnea',ranked:ranked.map(r=>({...r,distance:.8,artDistance:.6}))}],cards).status,'no_match');
});
