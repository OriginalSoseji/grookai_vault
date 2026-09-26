import './vendor_storefront_network_guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { shortlistVisualReferences } from '../../apps/web/src/lib/stores/scanShortlistV19.mjs';
import { scanDescriptor, prepareVisualIndex, VISUAL_VERSION } from '../../apps/web/src/lib/stores/visualMatchCore.mjs';
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const sharp = require('sharp');

test('visual-only retrieval rejects empty and oversized uploads before decoding', async () => {
  await assert.rejects(shortlistVisualReferences(Buffer.alloc(0), [], []), /at most 4 MB/);
  await assert.rejects(shortlistVisualReferences(Buffer.alloc(4 * 1024 * 1024 + 1), [], []), /at most 4 MB/);
});

test('unsupported or detail-free input cannot create candidate identities', async () => {
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="240" height="320"><rect width="240" height="320" fill="red"/></svg>');
  await assert.rejects(shortlistVisualReferences(svg, [], []), /JPEG, PNG or WebP/);
  const blank = await sharp({ create: { width: 240, height: 320, channels: 3, background: '#777777' } }).png().toBuffer();
  await assert.rejects(shortlistVisualReferences(blank, [], []), /too little visible card detail/);
});

test('portrait and landscape views retrieve the same bounded visual reference', async () => {
  const pixels = Buffer.alloc(300 * 400 * 3);
  for (let y = 0; y < 400; y++) for (let x = 0; x < 300; x++) {
    const i = (y * 300 + x) * 3;
    pixels[i] = x % 256; pixels[i + 1] = y % 256; pixels[i + 2] = (x + y) % 256;
  }
  const bytes = await sharp(pixels, { raw: { width: 300, height: 400, channels: 3 } }).png().toBuffer();
  const descriptor = await scanDescriptor(await sharp(bytes).resize({ width: 1000 }).png().toBuffer());
  const catalog = [{ id: '00000000-0000-4000-8000-000000000001', gv_id: 'TEST-1', name: 'Synthetic', sha256: '1'.repeat(64), descriptor }];
  const references = prepareVisualIndex({ version: VISUAL_VERSION, references: catalog });
  assert.deepEqual(await shortlistVisualReferences(bytes, references, catalog), [catalog[0].id]);
  assert.deepEqual(await shortlistVisualReferences(await sharp(bytes).rotate(90).png().toBuffer(), references, catalog), [catalog[0].id]);
});
