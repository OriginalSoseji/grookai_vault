import './vendor_storefront_network_guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareReferenceRiskV20, selectUnambiguousGeometry } from '../../apps/web/src/lib/stores/scanReferenceRiskV20.mjs';

function card(digit, name, sha = 'a'.repeat(64)) {
  const descriptor = Buffer.alloc(2304);
  for (let i = 0; i < descriptor.length; i++) descriptor[i] = i % 256;
  return { id: `00000000-0000-4000-8000-${digit.repeat(12)}`, name, sha256: sha, descriptor: descriptor.toString('base64') };
}

test('different card names sharing an image cannot bypass the reference collision guard', () => {
  const one = card('1', 'One'), two = card('2', 'Entirely different card');
  const risk = prepareReferenceRiskV20([one, two]);
  assert.deepEqual(risk(one.id).conflicts, [two.id]);
  assert.deepEqual(risk(two.id).conflicts, [one.id]);
  assert.deepEqual(selectUnambiguousGeometry([{ id: one.id }], risk), { status: 'manual_review', candidates: [] });
});

test('guard retains family ambiguity even when reprint files have distinct hashes', () => {
  const one = card('1', 'Same name', '1'.repeat(64)), two = card('2', 'Same name', '2'.repeat(64));
  const risk = prepareReferenceRiskV20([one, two]);
  assert.deepEqual(risk(one.id).conflicts, [two.id]);
});

test('missing reference still fails closed and a unique detailed binding is retained', () => {
  const one = card('1', 'One'), risk = prepareReferenceRiskV20([one]);
  assert.equal(risk('missing').assessed, false);
  assert.deepEqual(selectUnambiguousGeometry([{ id: one.id }], risk), { status: 'suggestions', candidates: [{ id: one.id }] });
});
