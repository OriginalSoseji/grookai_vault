import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import{prepareVisualIndex}from'../../apps/web/src/lib/stores/visualMatchCore.mjs';
import{evidenceVisualScores as oldScores,chooseEvidenceMatches as oldChoose}from'../../apps/web/src/lib/stores/scanMatchV2.mjs';
import{evidenceVisualScores as newScores,chooseEvidenceMatches as newChoose}from'../../apps/web/src/lib/stores/scanMatchV3.mjs';
const artifact=JSON.parse(fs.readFileSync(new URL('../../apps/web/src/lib/stores/visualMatchIndex.json',import.meta.url)));const refs=prepareVisualIndex(artifact),catalog=artifact.references;
test('indexed scoring preserves every distance, artwork gap and tie order from V2',()=>{for(const n of[0,Math.floor(refs.length/2),refs.length-1])assert.deepEqual(newScores(refs[n].descriptor,refs),oldScores(refs[n].descriptor,refs));});
test('indexed identity evidence preserves V2 selections and abstention',()=>{for(const n of[0,11,80]){const ranked=oldScores(refs[n].descriptor,refs);for(const [title,footer]of[[refs[n].name,refs[n].number+'/165'],['',''],['Unrelated card','999/165']]){const observations=[{rotation:180,ranked,title,footer}],old=oldChoose(observations,catalog),next=newChoose(observations,catalog);assert.deepEqual({...next,version:old.version},old);}}});
test('one eligible reference has an infinite alternative gap instead of throwing',()=>{const single=[refs[0]],scored=newScores(refs[0].descriptor,single);assert.equal(scored.length,1);assert.equal(scored[0].distance,0);assert.equal(scored[0].artGap,Infinity);});
