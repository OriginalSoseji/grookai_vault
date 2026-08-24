import assert from 'node:assert/strict';
import test from 'node:test';

import {
  cardVisibleToProxyAudienceV1,
  classifyImageResponseV1,
  resolveStorageLocationV1,
  selectDeterministicSampleV1,
  upperFailureRate95V1
} from '../../scripts/audits/production_image_delivery_sample_v1.mjs';

test('proxy cohorts respect catalog release authority', () => {
  assert.equal(cardVisibleToProxyAudienceV1({ game_code: 'pokemon', release_status: 'hidden' }), true);
  assert.equal(cardVisibleToProxyAudienceV1({ game_code: 'mtg', release_status: 'public' }), true);
  assert.equal(cardVisibleToProxyAudienceV1({ game_code: 'mtg', release_status: 'signed_in' }), false);
  assert.equal(cardVisibleToProxyAudienceV1({ game_code: 'mtg', release_status: 'signed_in' }, 'signed_in'), true);
  assert.equal(cardVisibleToProxyAudienceV1({ game_code: 'one_piece', release_status: 'hidden' }, 'signed_in'), false);
  assert.equal(cardVisibleToProxyAudienceV1({ game_code: 'pokemon' }, 'unsupported'), false);
});

test('warehouse and One Piece paths resolve to their governed buckets', () => {
  assert.deepEqual(resolveStorageLocationV1('warehouse-derived/self-hosted-images-v1/a.webp'), {
    bucket: 'user-card-images',
    path: 'warehouse-derived/self-hosted-images-v1/a.webp'
  });
  assert.deepEqual(resolveStorageLocationV1('one-piece/card-prints/official/12/0123456789abcdef0123456789abcdef.webp'), {
    bucket: 'external-card-images',
    path: 'one-piece/card-prints/official/12/0123456789abcdef0123456789abcdef.webp'
  });
  assert.equal(resolveStorageLocationV1('../escape.webp'), null);
});

test('sample selection is deterministic and preserves representative coverage', () => {
  const rows = Array.from({ length: 20 }, (_, index) => ({
    gv_id: `GV-${index}`,
    image_path: `warehouse-derived/self-hosted-images-v1/${index}.webp`,
    image_status: index < 5 ? 'representative_shared' : 'exact'
  }));
  const first = selectDeterministicSampleV1(rows, { sampleSize: 10, representativeMinimum: 4, seed: 'fixed' });
  const second = selectDeterministicSampleV1(rows, { sampleSize: 10, representativeMinimum: 4, seed: 'fixed' });
  assert.deepEqual(first, second);
  assert.equal(first.filter((row) => row.image_status.startsWith('representative')).length, 4);
});

test('valid WEBP image response passes body verification', () => {
  const body = Buffer.concat([Buffer.from('RIFF'), Buffer.from([0, 0, 0, 0]), Buffer.from('WEBP'), Buffer.alloc(20)]);
  const result = classifyImageResponseV1({ status: 200, contentType: 'image/webp', contentLength: body.length, body });
  assert.equal(result.ok, true);
  assert.equal(result.body_magic_ok, true);
});

test('HTML and missing responses fail image classification', () => {
  assert.equal(classifyImageResponseV1({ status: 200, contentType: 'text/html', contentLength: 10 }).ok, false);
  assert.equal(classifyImageResponseV1({ status: 404, contentType: 'image/webp', contentLength: 0 }).ok, false);
});

test('3000 clean probes bound the failure rate below 0.1 percent at 95 percent confidence', () => {
  assert.ok(upperFailureRate95V1(0, 3000) < 0.001);
  assert.ok(upperFailureRate95V1(1, 3000) > 0.001);
});
