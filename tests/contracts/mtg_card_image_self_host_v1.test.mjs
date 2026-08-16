import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildMtgHostedImagePointerV1,
  groupMtgImagePointersV1,
  inspectImageBytesV1,
  inspectMtgImagePlanRowV1,
  inspectMtgImageSourceUrlV1,
  mtgHostedImagePathV1,
  selectMtgImageCanaryV1,
} from '../../backend/pricing/mtg_card_image_self_host_v1.mjs';
import { downloadAndInspect } from '../../scripts/audits/mtg_card_image_storage_v1.mjs';

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

test('redirect destination must retain exact protocol, quality, face, and print identity', () => {
  const value = row();
  assert.equal(inspectMtgImageSourceUrlV1(value, 'large', value.source_urls.large).valid, true);
  for (const redirected of [
    value.source_urls.large.replace('https:', 'http:'),
    value.source_urls.large.replace('/large/front/', '/normal/front/'),
    value.source_urls.large.replace('/large/front/', '/large/back/'),
    value.source_urls.large.replace(value.scryfall_print_id,
      'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'),
    'https://cards.scryfall.io/large/front/placeholder.jpg',
  ]) {
    assert.equal(inspectMtgImageSourceUrlV1(value, 'large', redirected).valid, false);
  }
});

test('storage canary records created paths before exact readback', async () => {
  const script = await import('node:fs/promises').then(({ readFile }) => readFile(
    new URL('../../scripts/audits/mtg_card_image_storage_v1.mjs', import.meta.url), 'utf8'));
  assert.match(script,
    /if \(onCreated\) await onCreated\(pointer\);[\s\S]{0,40}await downloadAndInspect/);
  assert.match(script, /createdByPath\.set\(pointer\.image_path, pointer\)/);
  assert.match(script, /\.remove\(created\.map\(\(row\) => row\.image_path\)\)/);
});

test('storage readback retries transient failures without weakening verification', async () => {
  const bytes = Buffer.alloc(1280);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(bytes);
  bytes.writeUInt32BE(745, 16);
  bytes.writeUInt32BE(1040, 20);
  const inspected = inspectImageBytesV1(bytes, 'image/png');
  let calls = 0;
  const client = {
    storage: {
      from: () => ({
        download: async () => {
          calls += 1;
          if (calls < 3) {
            return { data: null, error: { message: 'transient' } };
          }
          return { data: new Blob([bytes]), error: null };
        },
      }),
    },
  };
  const readback = await downloadAndInspect(client, {
    image_path: 'fixture/front.png',
    content_type: 'image/png',
    image_hash: inspected.sha256,
    size_bytes: inspected.size_bytes,
    width: inspected.width,
    height: inspected.height,
  }, { retryDelayMs: 0 });
  assert.equal(calls, 3);
  assert.equal(readback.sha256, inspected.sha256);
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
