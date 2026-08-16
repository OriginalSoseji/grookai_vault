import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import zlib from 'node:zlib';

import {
  buildFullOfflinePlan,
  faceRoleForIndex,
  findPathCollisions,
  inspectScryfallImageUrl,
  planImageMapping,
  PROPOSED_STORAGE_BUCKET,
  proposeSelfHostedPath,
  sha256,
  SOURCE_QUALITY_ORDER,
  stableJson,
} from '../../scripts/audits/mtg_self_hosted_image_readiness_v1.mjs';

const PRINT_ID = '2c6d26ec-bf56-480b-9801-79c5f88961ba';
const CARD_PRINT_ID = '24f5137b-5a57-53eb-8471-4b6cfafe857d';

function image(faceIndex, face = faceIndex === 0 ? 'front' : 'back') {
  const shard = '2/c';
  return {
    face_index: faceIndex,
    normal: `https://cards.scryfall.io/normal/${face}/${shard}/${PRINT_ID}.jpg?1`,
    large: `https://cards.scryfall.io/large/${face}/${shard}/${PRINT_ID}.jpg?1`,
    png: `https://cards.scryfall.io/png/${face}/${shard}/${PRINT_ID}.png?1`,
  };
}

function fixture(sourceImages = [image(0)]) {
  const parent = {
    id: CARD_PRINT_ID,
    gv_id: 'GV-MTG-SF-2C6D26EC-BF56-480B-9801-79C5F88961BA',
    name: 'Example // Example Back',
    number: '16',
    external_ids: { scryfall: PRINT_ID },
  };
  return {
    batch: { ordinal: 1, code: 'tst', name: 'Test Set' },
    payload: {
      rows: {
        card_prints: [parent],
        card_print_identity: [{
          card_print_id: CARD_PRINT_ID,
          identity_payload: { scryfall_print_id: PRINT_ID },
        }],
      },
    },
    mapping: {
      card_print_id: CARD_PRINT_ID,
      source: 'scryfall',
      external_id: PRINT_ID,
      meta: { oracle_id: 'oracle-1', source_images: sourceImages },
    },
  };
}

test('face roles preserve front, back, and future additional faces', () => {
  assert.equal(faceRoleForIndex(0), 'front');
  assert.equal(faceRoleForIndex(1), 'back');
  assert.equal(faceRoleForIndex(2), 'additional_2');
  assert.throws(() => faceRoleForIndex(-1), /Invalid face index/);
});

test('trusted Scryfall URL requires exact print, quality, face, and extension', () => {
  const valid = inspectScryfallImageUrl(image(0).png, {
    scryfallPrintId: PRINT_ID,
    faceIndex: 0,
    quality: 'png',
  });
  assert.equal(valid.valid, true);
  assert.equal(valid.trusted, true);

  const wrongIdentity = inspectScryfallImageUrl(
    image(0).png.replace(PRINT_ID, '00000000-0000-0000-0000-000000000000'),
    { scryfallPrintId: PRINT_ID, faceIndex: 0, quality: 'png' },
  );
  assert.equal(wrongIdentity.valid, false);
  assert.ok(wrongIdentity.findings.includes('scryfall_print_identity_mismatch'));

  const untrusted = inspectScryfallImageUrl(
    image(0).png.replace('cards.scryfall.io', 'example.invalid'),
    { scryfallPrintId: PRINT_ID, faceIndex: 0, quality: 'png' },
  );
  assert.equal(untrusted.trusted, false);
  assert.ok(untrusted.findings.includes('untrusted_host'));
});

test('double-faced mapping emits independent exact face rows and paths', () => {
  const planned = planImageMapping(fixture([image(0), image(1)]));
  assert.equal(planned.issues.length, 0);
  assert.equal(planned.gaps.length, 0);
  assert.equal(planned.assets.length, 2);
  assert.deepEqual(planned.assets.map((row) => row.face_role), ['front', 'back']);
  assert.equal(new Set(planned.assets.map((row) => row.proposed_storage_path)).size, 2);
  assert.equal(planned.assets.every((row) => row.card_print_id === CARD_PRINT_ID), true);
  assert.equal(planned.assets.every((row) => row.scryfall_print_id === PRINT_ID), true);
  assert.equal(planned.assets.every((row) => row.selected_source_quality === 'png'), true);
  assert.equal(
    planned.assets.every((row) => row.proposed_storage_bucket === 'user-card-images'),
    true,
  );
  assert.equal(planned.assets.every((row) => row.content_hash_sha256 === null), true);
  assert.equal(planned.assets.every((row) => row.cross_print_dedupe_allowed === false), true);
});

test('bucket and source order match existing tooling without claiming format economics', () => {
  assert.equal(PROPOSED_STORAGE_BUCKET, 'user-card-images');
  assert.deepEqual(SOURCE_QUALITY_ORDER, ['png', 'large', 'normal']);
  const contract = fs.readFileSync(
    'docs/contracts/MTG_SELF_HOSTED_IMAGE_READINESS_V1.md',
    'utf8',
  );
  assert.match(contract, /CANON_IMAGE_RESOLUTION_CONTRACT_V1/);
  assert.match(contract, /SELF_HOSTED_IMAGES_STORAGE_BUCKET/);
  assert.match(contract, /bounded download canary/i);
  assert.match(contract, /PNG and large JPEG/i);
});

test('missing source images become explicit gaps without invented assets', () => {
  const planned = planImageMapping(fixture([]));
  assert.equal(planned.assets.length, 0);
  assert.equal(planned.gaps.length, 1);
  assert.equal(planned.gaps[0].gap_code, 'missing_source_images');
});

test('untrusted face sources are blocked and preserved as issues', () => {
  const bad = image(0);
  for (const key of ['normal', 'large', 'png']) {
    bad[key] = bad[key].replace('cards.scryfall.io', 'images.example.invalid');
  }
  const planned = planImageMapping(fixture([bad]));
  assert.equal(planned.assets.length, 0);
  assert.equal(planned.gaps[0].gap_code, 'no_trusted_valid_source_url');
  assert.equal(planned.issues.filter((row) => row.code === 'untrusted_host').length, 3);
});

test('distinct print identities always receive distinct path namespaces', () => {
  const common = {
    setCode: 'tst',
    faceIndex: 0,
    selectedSourceUrl: image(0).png,
    selectedQuality: 'png',
  };
  const first = proposeSelfHostedPath({ ...common, scryfallPrintId: PRINT_ID });
  const second = proposeSelfHostedPath({
    ...common,
    scryfallPrintId: '11111111-1111-1111-1111-111111111111',
  });
  assert.notEqual(first, second);
});

test('path collision detector blocks different exact face owners', () => {
  const base = {
    proposed_storage_path: 'warehouse-derived/self-hosted-images-v1/card_prints/mtg/x/a/front/a.png',
    scryfall_print_id: PRINT_ID,
    face_index: 0,
  };
  assert.equal(findPathCollisions([
    { ...base, card_print_id: CARD_PRINT_ID },
    { ...base, card_print_id: '11111111-1111-1111-1111-111111111111' },
  ]).length, 1);
});

test('stable JSON is deterministic across object insertion order', () => {
  assert.equal(stableJson({ b: 2, a: 1 }), stableJson({ a: 1, b: 2 }));
});

test('planner source has no database, Storage, or network client', () => {
  const source = fs.readFileSync(
    'scripts/audits/mtg_self_hosted_image_readiness_v1.mjs',
    'utf8',
  );
  assert.doesNotMatch(source, /from ['"]pg['"]|from ['"]@supabase\/supabase-js['"]/);
  assert.doesNotMatch(source, /createClient\s*\(|\.storage\s*\.|new\s+Client\s*\(/);
  assert.doesNotMatch(source, /\bfetch\s*\(|https?\.request\s*\(/);
  assert.match(source, /database_reads:\s*0/);
  assert.match(source, /storage_writes:\s*0/);
  assert.match(source, /network_reads:\s*0/);
});

test('full offline planner verifies payloads and writes deterministic hashed artifacts', async () => {
  const root = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'mtg-image-readiness-v1-'));
  const payloadDir = path.join(root, 'payloads');
  const firstOut = path.join(root, 'first');
  const secondOut = path.join(root, 'second');
  await fsPromises.mkdir(payloadDir, { recursive: true });
  try {
    const { batch, payload, mapping } = fixture([image(0), image(1)]);
    payload.plan_version = 'MTG_CANONICAL_CATALOG_SET_BATCH_V1';
    payload.selected_set = { source_set_id: 'source-set-1', code: batch.code };
    payload.writer_payload_fingerprint = 'a'.repeat(64);
    payload.rows.external_mappings = [mapping];
    const payloadBody = `${JSON.stringify(payload, null, 2)}\n`;
    const payloadName = 'tst__source-set-1.json';
    await fsPromises.writeFile(path.join(payloadDir, payloadName), payloadBody, 'utf8');
    const manifest = {
      version: 'MTG_CANONICAL_CATALOG_BATCH_MANIFEST_V1',
      status: 'full_catalog_batches_frozen',
      recorded_at: '2026-08-13T00:00:00.000Z',
      batches: [{
        ...batch,
        source_set_id: 'source-set-1',
        set_type: 'expansion',
        released_at: '2026-01-01',
        payload_file: `.tmp/${payloadName}`,
        payload_file_sha256: sha256(payloadBody),
        writer_payload_fingerprint: payload.writer_payload_fingerprint,
      }],
    };
    const manifestPath = path.join(root, 'manifest.json');
    await fsPromises.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

    const first = await buildFullOfflinePlan({ manifestPath, payloadDir, outDir: firstOut });
    const second = await buildFullOfflinePlan({ manifestPath, payloadDir, outDir: secondOut });
    assert.equal(first.status, 'offline_readiness_plan_complete');
    assert.equal(first.coverage.card_prints, 1);
    assert.equal(first.coverage.planned_face_assets, 2);
    assert.deepEqual(first.coverage.faces_by_role, { back: 1, front: 1 });
    assert.equal(first.target.storage_bucket, 'user-card-images');
    assert.deepEqual(first.source_format_policy.current_preference_order, [
      'png',
      'large',
      'normal',
    ]);
    assert.equal(first.plan_fingerprint_sha256, second.plan_fingerprint_sha256);
    assert.equal(
      first.datasets.image_assets.logical_sha256,
      second.datasets.image_assets.logical_sha256,
    );
    const assetBody = zlib.gunzipSync(
      await fsPromises.readFile(path.join(firstOut, 'image_assets.jsonl.gz')),
    ).toString('utf8');
    assert.equal(assetBody.trim().split('\n').length, 2);
    assert.equal(sha256(assetBody), first.datasets.image_assets.logical_sha256);
    const hashes = JSON.parse(
      await fsPromises.readFile(path.join(firstOut, 'artifact_hashes.json'), 'utf8'),
    );
    assert.equal(hashes.files.length, 8);
  } finally {
    await fsPromises.rm(root, { recursive: true, force: true });
  }
});
