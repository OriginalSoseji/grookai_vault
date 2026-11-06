import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { prepareSellerPhoto } from '../seller_photo_v1.mjs';
import { EbaySellerIdentityMediaClient } from '../seller_identity_media_v1.mjs';

const token = 'fixture-provider-token-never-log';
const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), {
  status, headers: { 'content-type': 'application/json', ...headers },
});
const client = fetchImpl => new EbaySellerIdentityMediaClient({
  environment: 'production', accessToken: token, fetchImpl,
});
const photo = () => sharp({
  create: { width: 600, height: 840, channels: 3, background: '#556644' },
}).jpeg().toBuffer();
const epsImage = {
  imageUrl: 'https://i.ebayimg.com/images/g/fixture/s-l1600.jpg',
  expirationDate: '2027-01-01T00:00:00.000Z',
};
const location = 'https://apim.ebay.com/commerce/media/v1_beta/image/provider_image_123';

test('physical photo normalization removes metadata and retains usable dimensions', async () => {
  const input = await sharp(await photo()).withMetadata({
    orientation: 6, exif: { IFD0: { Artist: 'private-owner-name' } },
  }).toBuffer();
  const normalized = await prepareSellerPhoto(input);
  const metadata = await sharp(normalized.bytes).metadata();
  assert.equal(normalized.mime, 'image/jpeg');
  assert.equal(normalized.width, 840);
  assert.equal(normalized.height, 600);
  assert.equal(metadata.exif, undefined);
  assert.equal(metadata.xmp, undefined);
  assert.equal(metadata.orientation, undefined);
  assert.match(normalized.sha256, /^[a-f0-9]{64}$/);
  assert.equal(normalized.bytes.includes(Buffer.from('private-owner-name')), false);
});

test('photo bytes cannot select a URL, path or unsupported vector decoder', async () => {
  for (const input of ['https://private.test/photo', '/private/photo.jpg',
    Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="840"/>'),
    Buffer.from('not a photograph'), new Uint8Array(),
    new Uint8Array(16 * 1024 * 1024 + 1)]) {
    await assert.rejects(prepareSellerPhoto(input), error => /^seller_photo_/.test(error.code));
  }
});

test('small images are rejected instead of upscaled into an apparent high quality photo', async () => {
  const input = await sharp({ create: {
    width: 100, height: 140, channels: 3, background: '#556644',
  } }).png().toBuffer();
  await assert.rejects(prepareSellerPhoto(input), error => error.code === 'seller_photo_too_small');
});

test('seller identity uses the official origin and drops private account fields', async () => {
  let captured;
  const api = client(async (url, options) => {
    captured = { url, options };
    return json({ userId: 'immutable-seller-1', username: 'collector',
      individualAccount: { email: 'private@example.test', primaryAddress: 'private' },
      businessAccount: { phone: 'private' } });
  });
  assert.deepEqual(await api.getSellerIdentity(), { sellerId: 'immutable-seller-1', username: 'collector' });
  assert.equal(captured.url, 'https://apiz.ebay.com/commerce/identity/v1/user/');
  assert.equal(captured.options.redirect, 'error');
  assert.equal(JSON.stringify(api), '{}');
});

test('missing immutable provider identity cannot be replaced by mutable username', async () => {
  await assert.rejects(client(async () => json({ username: 'collector' })).getSellerIdentity(),
    error => error.code === 'provider_response_invalid');
});

test('photo upload uses multipart bytes and returns a receipt without publishing', async () => {
  const calls = [];
  const api = client(async (url, options) => {
    calls.push({ url, options });
    const image = options.body.get('image');
    assert.equal(image.type, 'image/jpeg');
    assert.equal(image.name, 'copy.jpg');
    assert.equal((await sharp(Buffer.from(await image.arrayBuffer())).metadata()).exif, undefined);
    assert.equal(options.headers['Content-Type'], undefined);
    return json(epsImage, 201, { location });
  });
  const result = await api.uploadCopyPhoto(await photo());
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://apim.ebay.com/commerce/media/v1_beta/image/create_image_from_file');
  assert.equal(calls[0].options.redirect, 'error');
  assert.equal(result.imageId, 'provider_image_123');
  assert.deepEqual(result.image, { imageUrl: epsImage.imageUrl, expiresAt: epsImage.expirationDate });
});

test('empty upload body retains provider image ID for a separate durable read', async () => {
  let calls = 0;
  const api = client(async () => { calls++; return new Response(null, { status: 201, headers: { location } }); });
  const result = await api.uploadCopyPhoto(await photo());
  assert.equal(result.imageId, 'provider_image_123');
  assert.equal(result.image, null);
  assert.equal(calls, 1);
});

test('foreign, traversing or credential-bearing Location never becomes a provider request', async () => {
  for (const value of [
    'https://evil.test/commerce/media/v1_beta/image/image_1',
    'https://apim.ebay.com/commerce/media/v1_beta/image/../token',
    'https://user:password@apim.ebay.com/commerce/media/v1_beta/image/image_1',
    location + '?private=secret', location + '/another',
  ]) {
    let calls = 0;
    const api = client(async () => { calls++; return json(epsImage, 201, { location: value }); });
    await assert.rejects(api.uploadCopyPhoto(await photo()),
      error => error.code === 'provider_result_uncertain' && error.uncertain);
    assert.equal(calls, 1);
  }
});

test('unknown EPS image host is rejected and upload uncertainty is retained', async () => {
  const api = client(async () => json({ ...epsImage, imageUrl: 'https://private.test/photo' }, 201, { location }));
  await assert.rejects(api.uploadCopyPhoto(await photo()),
    error => error.code === 'provider_result_uncertain' && error.uncertain);
});

test('upload timeout is never retried or exposed as provider response text', async () => {
  let calls = 0;
  const api = client(async () => { calls++; throw Error(token); });
  await assert.rejects(api.uploadCopyPhoto(await photo()), error =>
    error.uncertain && error.code === 'provider_result_uncertain' && !JSON.stringify(error).includes(token));
  assert.equal(calls, 1);
});

test('image lookup never accepts another endpoint or a private URL', async () => {
  const api = client(async url => {
    assert.equal(url, 'https://apim.ebay.com/commerce/media/v1_beta/image/provider_image_123');
    return json(epsImage);
  });
  assert.equal((await api.getImage('provider_image_123')).imageUrl, epsImage.imageUrl);
  for (const value of ['../token', 'https://evil.test', '/', null]) {
    await assert.rejects(api.getImage(value), error => error.code === 'invalid_provider_identifier');
  }
});

test('unqualified environment and oversized provider response fail closed', async () => {
  assert.throws(() => new EbaySellerIdentityMediaClient({ environment: 'sandbox', accessToken: token }));
  await assert.rejects(client(async () => new Response(new Uint8Array(131073))).getSellerIdentity(),
    error => error.code === 'provider_response_invalid');
});
