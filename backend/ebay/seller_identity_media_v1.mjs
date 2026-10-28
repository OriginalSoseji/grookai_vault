import { EbaySellerApiError } from './seller_client_v1.mjs';
import { prepareSellerPhoto } from './seller_photo_v1.mjs';

const mediaOrigin = 'https://apim.ebay.com';
const imageRoute = '/commerce/media/v1_beta/image/';
const fail = (code, uncertain = false) => {
  throw new EbaySellerApiError(code, { uncertain });
};
const opaqueId = value => typeof value === 'string' && value.length > 0
  && value.length <= 512 && !/[\x00-\x20\x7f/\\]/.test(value)
  && value !== '.' && value !== '..';

function imageIdFromLocation(value) {
  try {
    const url = new URL(value);
    if (!['https://api.ebay.com', mediaOrigin].includes(url.origin)
        || url.username || url.password || url.search || url.hash
        || !url.pathname.startsWith(imageRoute)) throw Error();
    const id = decodeURIComponent(url.pathname.slice(imageRoute.length));
    if (!opaqueId(id)) throw Error();
    return id;
  } catch { fail('provider_result_uncertain', true); }
}

function imageReceipt(data) {
  try {
    const url = new URL(data.imageUrl);
    if (url.origin !== 'https://i.ebayimg.com' || url.username || url.password
        || url.search || url.hash || !url.pathname.startsWith('/images/')) throw Error();
    if (typeof data.expirationDate !== 'string'
        || !Number.isFinite(Date.parse(data.expirationDate))) throw Error();
    return { imageUrl: url.href, expiresAt: data.expirationDate };
  } catch { fail('provider_response_invalid'); }
}

async function boundedJson(response) {
  const chunks = [];
  let size = 0;
  const reader = response.body?.getReader();
  if (reader) for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 131072) { await reader.cancel(); throw Error(); }
    chunks.push(value);
  }
  if (!size) return null;
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder('utf8', { fatal: true }).decode(bytes));
}

export class EbaySellerIdentityMediaClient {
  #token; #fetch;
  constructor({ environment, accessToken, fetchImpl = globalThis.fetch }) {
    // Only the production origins are pinned in the qualified specifications.
    // Sandbox support requires its own verified provider configuration.
    if (environment !== 'production' || typeof accessToken !== 'string'
        || accessToken.length < 20 || accessToken.length > 32768
        || /[\r\n\0]/.test(accessToken) || typeof fetchImpl !== 'function') {
      fail('seller_configuration_unavailable');
    }
    this.#token = accessToken;
    this.#fetch = fetchImpl;
  }

  async #request(url, { method = 'GET', body } = {}) {
    const mutation = method !== 'GET';
    let response;
    try {
      response = await this.#fetch(url, {
        method, body, redirect: 'error', signal: AbortSignal.timeout(15000),
        headers: { Authorization: 'Bearer ' + this.#token, Accept: 'application/json' },
      });
    } catch {
      fail(mutation ? 'provider_result_uncertain' : 'provider_unavailable', mutation);
    }
    let data;
    try { data = await boundedJson(response); }
    catch {
      if (response.ok) {
        fail(mutation ? 'provider_result_uncertain' : 'provider_response_invalid', mutation);
      }
    }
    if (!response.ok) {
      const code = [401, 403].includes(response.status) ? 'seller_authorization_required'
        : response.status === 429 ? 'provider_rate_limited'
        : response.status >= 500 ? (mutation ? 'provider_result_uncertain' : 'provider_unavailable')
        : 'provider_request_rejected';
      throw new EbaySellerApiError(code, {
        status: response.status, uncertain: mutation && response.status >= 500,
      });
    }
    return { data, response };
  }

  async getSellerIdentity() {
    const { data } = await this.#request('https://apiz.ebay.com/commerce/identity/v1/user/');
    if (!data || !opaqueId(data.userId) || typeof data.username !== 'string'
        || !data.username.trim() || data.username.length > 128) {
      fail('provider_response_invalid');
    }
    // Do not retain account contact/address containers even if returned.
    return { sellerId: data.userId, username: data.username };
  }

  async uploadCopyPhoto(bytes) {
    const photo = await prepareSellerPhoto(bytes);
    const form = new FormData();
    form.set('image', new Blob([photo.bytes], { type: photo.mime }), 'copy.jpg');
    const { data, response } = await this.#request(
      mediaOrigin + imageRoute + 'create_image_from_file', { method: 'POST', body: form },
    );
    if (response.status !== 201) fail('provider_result_uncertain', true);
    const imageId = imageIdFromLocation(response.headers.get('location'));
    // Persist this imageId receipt before any later GET or listing mutation.
    let image = null;
    if (data) {
      try { image = imageReceipt(data); }
      catch { fail('provider_result_uncertain', true); }
    }
    return { imageId, image, sourceSha256: photo.sha256 };
  }

  async getImage(imageId) {
    if (!opaqueId(imageId)) fail('invalid_provider_identifier');
    const { data } = await this.#request(mediaOrigin + imageRoute + encodeURIComponent(imageId));
    return { imageId, ...imageReceipt(data) };
  }
}
