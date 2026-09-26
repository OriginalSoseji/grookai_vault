import './vendor_storefront_network_guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareReferenceRisk, selectUnambiguousGeometry } from '../../apps/web/src/lib/stores/scanReferenceRiskV18.mjs';

const id = digit => `00000000-0000-4000-8000-${digit.repeat(12)}`;
function reference(digit, name = 'Example', descriptor) {
  const bytes = Buffer.alloc(24 * 32 * 3);
  for (let i = 0; i < bytes.length; i++) bytes[i] = (i * 37) % 256;
  return { id: id(digit), name, sha256: digit.repeat(64), descriptor: descriptor ?? bytes.toString('base64') };
}

test('same-art reprint omitted by scan retrieval still forces manual review', () => {
  const first = reference('1'), second = reference('2');
  const risk = prepareReferenceRisk([first, second]);
  assert.deepEqual(risk(first.id).conflicts, [second.id]);
  assert.deepEqual(selectUnambiguousGeometry([{ id: first.id, inliers: 900 }], risk), { status: 'manual_review', candidates: [] });
});

test('display qualifiers and case do not hide same-name reprints', () => {
  const risk = prepareReferenceRisk([reference('1', 'Example'), reference('2', 'EXAMPLE · Trainer Gallery')]);
  assert.equal(risk(id('1')).conflicts.length, 1);
});

test('two passing identities remain unresolved regardless of score', () => {
  const risk = prepareReferenceRisk([reference('1', 'One'), reference('2', 'Two')]);
  assert.equal(selectUnambiguousGeometry([{ id: id('1'), distance: 0 }, { id: id('2'), distance: .2 }], risk).status, 'manual_review');
});

test('missing reference and low-detail family fail closed', () => {
  const blank = reference('2', 'Example', Buffer.alloc(2304, 120).toString('base64'));
  const risk = prepareReferenceRisk([reference('1'), blank]);
  assert.equal(risk(id('3')).assessed, false);
  assert.equal(risk(id('1')).assessed, false);
  assert.equal(risk(id('2')).assessed, false);
  assert.equal(selectUnambiguousGeometry([{ id: id('3') }], risk).status, 'manual_review');
});

test('unique detailed reference can remain a human-reviewed suggestion', () => {
  const candidate = { id: id('1'), rotation: 180 };
  const risk = prepareReferenceRisk([reference('1')]);
  assert.deepEqual(selectUnambiguousGeometry([candidate], risk), { status: 'suggestions', candidates: [candidate] });
  assert.deepEqual(selectUnambiguousGeometry([], risk), { status: 'no_match', candidates: [] });
});

test('invalid or duplicate catalog metadata cannot silently reduce ambiguity coverage', () => {
  assert.throws(() => prepareReferenceRisk([]));
  assert.throws(() => prepareReferenceRisk([reference('1'), reference('1')]));
  assert.throws(() => prepareReferenceRisk([{ ...reference('1'), descriptor: 'bad' }]));
  assert.throws(() => prepareReferenceRisk([{ ...reference('1'), sha256: 'bad' }]));
});
