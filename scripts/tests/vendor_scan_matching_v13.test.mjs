import './vendor_storefront_network_guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { enclosedInk } from '../../apps/web/src/lib/stores/scanOutlineV13.mjs';
import { acceptStructuralIdentity } from '../../apps/web/src/lib/stores/scanMatchV12.mjs';
import { qualifiedFooter } from '../../apps/web/src/lib/stores/scanOcrEvidenceV10.mjs';

test('outlined ink preserves enclosed marks and removes edge-connected background without changing input', () => {
  const gray = Uint8Array.from([0,255,255,255,255, 0,255,0,255,255, 0,255,255,255,255]);
  const result = enclosedInk(gray,5,3,90);
  assert.equal(result[7],0);
  for (const i of [0,5,10]) { assert.equal(result[i],255); assert.equal(gray[i],0); }
  assert.throws(()=>enclosedInk(gray,6,3,90));
});

test('gallery identity keeps prefix, name, denominator and disagreement checks', () => {
  const card={name:'Roserade',number:'TG02',printedCoordinates:{total:30,setCode:'LOR'}};
  assert.equal(acceptStructuralIdentity('Roserade','TG02/TG30',card),true);
  for(const footer of ['GG02/GG70','02/30','TG02/TG39','TG03/TG30','TG02/TG30 TG02/TG39','TG02/TG30 ASR EN']) assert.equal(acceptStructuralIdentity('Roserade',footer,card),false,footer);
  assert.equal(acceptStructuralIdentity('Flapple','TG02/TG30',card),false);
});

test('contrast passes on one crop do not invent independent gallery evidence', () => {
  const data=text=>({blocks:[{paragraphs:[{lines:[{words:[{text,confidence:50}]}]}]}]});
  const first={crop:'strip-left',data:data('TG02/TG30')};
  assert.equal(qualifiedFooter([first,first]),'');
  assert.equal(qualifiedFooter([first,{crop:'left-wide',data:data('TG02/TG30')}]),'TG2/TG30');
});
