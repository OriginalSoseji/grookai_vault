import test from 'node:test';import assert from 'node:assert/strict';
import { copyPhotoType, COPY_PHOTO_MAX_BYTES } from '../../apps/web/src/lib/stores/storeCopyPhoto.ts';
test('copy-photo uploads detect accepted raster types from bytes',()=>{
 assert.equal(copyPhotoType(Uint8Array.from([137,80,78,71,13,10,26,10,0,0,0,0])),'image/png');
 assert.equal(copyPhotoType(Uint8Array.from([255,216,255,224,0,0,0,0,0,0,0,0])),'image/jpeg');
 assert.equal(copyPhotoType(new TextEncoder().encode('RIFF0000WEBP')),'image/webp');
});
test('HTML, SVG and empty/truncated uploads cannot become copy photos',()=>{
 for(const text of ['', '<svg onload="alert(1)"/>', '<html>not a photo</html>', 'GIF89a00000000', 'RIFF0000WAVE'])assert.equal(copyPhotoType(new TextEncoder().encode(text)),null);
});
test('oversized content is rejected even with a valid image signature',()=>{
 const bytes=new Uint8Array(COPY_PHOTO_MAX_BYTES+1);bytes.set([255,216,255]);assert.equal(copyPhotoType(bytes),null);
});
