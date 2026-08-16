import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildMtgHostedImagePointerV1,
  groupMtgImagePointersV1,
  inspectImageBytesV1,
  inspectMtgImagePlanRowV1,
  mtgHostedImagePathV1,
  selectMtgImageCanaryV1,
} from '../../backend/pricing/mtg_card_image_self_host_v1.mjs';

function row(index = 0, faceIndex = 0) {
  const id = `31f173fc-112c-4aec-b464-3f81e2ee21${String(index).padStart(2, '0')}`;
  const shard = id.slice(0, 2).split('').join('/');
  const face = faceIndex === 0 ? 'front' : 'back';
  return {
    plan_version: 'MTG_SELF_HOSTED_IMAGE_READINESS_V1',
    card_print_id: `2318a8af-6d6e-540f-b75d-7956fcff57${String(index).padStart(2, '0')}`,
    gv_id: `GV-MTG-${index}`,
    set_code: 'TST',
    scryfall_print_id: id,
    face_index: faceIndex,
    face_role: face,
    source_identity_status: 'exact_scryfall_print',
    source_urls: {
      png: `https://cards.scryfall.io/png/${face}/${shard}/${id}.png?1`,
      large: `https://cards.scryfall.io/large/${face}/${shard}/${id}.jpg?1`,
      normal: `https://cards.scryfall.io/normal/${face}/${shard}/${id}.jpg?1`,
    },
  };
}

test('valid exact Scryfall row passes and produces isolated large path', () => {
  const value = row();
  assert.deepEqual(inspectMtgImagePlanRowV1(value), { valid: true, findings: [] });
  assert.match(mtgHostedImagePathV1(value, 'large'),
    /card_prints\/mtg\/tst\/31f173fc-112c-4aec-b464-3f81e2ee2100\/front\/[0-9a-f]{24}\.jpg$/);
});

test('wrong host and face identity fail', () => {
  const value = row();
  value.source_urls.large = 'https://example.com/large/back/x/y/no.jpg';
  const result = inspectMtgImagePlanRowV1(value);
  assert.equal(result.valid, false);
  assert.ok(result.findings.includes('large_authority'));
  assert.ok(result.findings.includes('large_identity'));
});

test('PNG inspection and pointer retain exact face identity', () => {
  const bytes = Buffer.alloc(1280);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(bytes);
  bytes.writeUInt32BE(745, 16);
  bytes.writeUInt32BE(1040, 20);
  const inspected = inspectImageBytesV1(bytes, 'image/png');
  assert.equal(inspected.valid, true);
  const pointer = buildMtgHostedImagePointerV1(row(1, 1), inspected, 'png',
    'https://example.supabase.co/storage/v1/object/public/user-card-images');
  assert.equal(pointer.face_role, 'back');
  assert.equal(pointer.width, 745);
  assert.match(pointer.image_path, /\/back\/[0-9a-f]{24}\.png$/);
});

test('canary deterministically includes front and back faces', () => {
  const rows = Array.from({ length: 30 }, (_, index) => row(index, index < 8 ? 1 : 0));
  const first = selectMtgImageCanaryV1(rows, 20);
  const second = selectMtgImageCanaryV1(rows, 20);
  assert.deepEqual(first, second);
  assert.equal(first.length, 20);
  assert.equal(first.filter((value) => value.face_role === 'back').length, 5);
});

test('grouped pointer model keeps front and back separate', () => {
  const grouped = groupMtgImagePointersV1([
    { card_print_id: 'a', face_role: 'front' },
    { card_print_id: 'a', face_role: 'back' },
  ]);
  assert.equal(grouped.get('a').front.face_role, 'front');
  assert.equal(grouped.get('a').back.face_role, 'back');
});
