import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseEvidenceMatches} from '../../apps/web/src/lib/stores/scanMatchV4.mjs';
const catalog=[{id:'a',name:'Staryu',number:'28'},{id:'b',name:'Staryu',number:'13'}];
const run=(title,footer,distance=.05)=>chooseEvidenceMatches([{title,footer,rotation:180,ranked:catalog.map(c=>({id:c.id,distance,artDistance:.01,artGap:1}))}],catalog);
test('same-art reprints require a legible collector number, even with perfect artwork',()=>{
 assert.equal(run('Staryu','').status,'no_match');
 assert.deepEqual(run('Staryu','028/181').candidates.map(c=>c.id),['a']);
 assert.deepEqual(run('Staryu','013/068').candidates.map(c=>c.id),['b']);
});
test('loose artwork cannot be rescued by coincidental OCR name and number',()=>{
 assert.equal(run('Staryu','028/181',.251).status,'no_match');
 assert.equal(run('Staryu','028/181',.25).candidates[0].id,'a');
 assert.equal(run('Starmie','028/181',0).status,'no_match');
});
test('conflicting readable identities remain ambiguous and require review',()=>{
 const r=run('Staryu','028/181 013/068');assert.equal(r.status,'ambiguous');assert.equal(r.candidates.length,2);
 assert.ok(r.candidates.every(c=>c.rotation===180&&!('printing' in c)));
});
