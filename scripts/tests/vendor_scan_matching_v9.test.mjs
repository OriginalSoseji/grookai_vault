import './vendor_storefront_network_guard.cjs';
import test from 'node:test';import assert from 'node:assert/strict';
import {printedIdentityEvidence} from '../../apps/web/src/lib/stores/scanPrintedIdentityV9.mjs';
import {chooseEvidenceMatches} from '../../apps/web/src/lib/stores/scanMatchV9.mjs';
test('standalone promo conflicts block even otherwise unique artwork',()=>{
 const cards=[{id:'numeric',name:'Marnie',number:'120'},{id:'wrongPromo',name:'Marnie',number:'SWSH121'},{id:'rightPromo',name:'Marnie',number:'SWSH120'}];
 const ranked=cards.map(c=>({id:c.id,distance:.2,artDistance:.01,artGap:.5}));
 const result=chooseEvidenceMatches([{title:'Marnie',footer:'SWSH120',rotation:0,ranked}],cards);
 assert.deepEqual(result.candidates.map(c=>c.id),['rightPromo']);
 assert.equal(printedIdentityEvidence('SWSH120 SWSH121','SWSH120').conflict,true);
 assert.equal(printedIdentityEvidence('SWSH120','120').conflict,true);
 assert.equal(printedIdentityEvidence('SWSH120','XY120').conflict,true);
});
test('denominator, set and gallery boundaries remain enforced by the final reader',()=>{
 assert.equal(printedIdentityEvidence('004/072','4',{total:163}).conflict,true);
 assert.equal(printedIdentityEvidence('TG01/TG30','1',{total:30}).conflict,true);
 assert.equal(printedIdentityEvidence('SVI EN 105a/198','105a',{total:198,setCode:'PAR'}).conflict,true);
 assert.equal(printedIdentityEvidence('105a/147','105a',{total:147}).conflict,false);
 assert.equal(printedIdentityEvidence('TG01/TG30','TG01',{total:30}).conflict,false);
});
