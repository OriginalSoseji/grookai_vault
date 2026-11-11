import {isDeepStrictEqual} from 'node:util';
import {SQUARE_API_VERSION, squareManagedProjection} from './catalog_plan_v1.mjs';
const origins = Object.freeze({production: 'https://connect.squareup.com', sandbox: 'https://connect.squareupsandbox.com'});
const identifier = /^[A-Za-z0-9_-]{1,100}$/;
export class SquareApiError extends Error {
  constructor(code, {status = null, uncertain = false, retryAfterSeconds = null} = {}) {
    super(code); this.name = 'SquareApiError'; Object.assign(this, {code, status, uncertain, retryAfterSeconds});
  }
}
const fail = code => {throw new SquareApiError(code);};
const id = value => typeof value === 'string' && identifier.test(value) ? value : fail('square_invalid_identifier');
const secret = value => typeof value === 'string' && value.length >= 2 && value.length <= 32768 && !/[\x00-\x20\x7f]/.test(value) ? value : fail('square_configuration_unavailable');

export class SquareClient {
  #origin; #fetch; #timeout; #token;
  constructor({environment, accessToken = null, fetchImpl = globalThis.fetch, timeoutMs = 15000}) {
    if (!Object.hasOwn(origins, environment) || typeof fetchImpl !== 'function' || !Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30000) fail('square_configuration_unavailable');
    this.#origin = origins[environment]; this.#fetch = fetchImpl; this.#timeout = timeoutMs;
    this.#token = accessToken === null ? null : secret(accessToken);
  }
  authorizationUrl({appId, redirectUri, state, commerce = false}) {
    secret(appId); secret(state);
    const redirect = new URL(redirectUri);
    if (redirect.protocol !== 'https:' || redirect.username || redirect.password || redirect.search || redirect.hash || redirect.pathname !== '/api/square/oauth/callback') fail('square_configuration_unavailable');
    const url = new URL('/oauth2/authorize', this.#origin);
    for (const [key, value] of Object.entries({client_id: appId, redirect_uri: redirect.toString(), state,
      scope: 'ITEMS_READ ITEMS_WRITE MERCHANT_PROFILE_READ' + (commerce ? ' INVENTORY_READ INVENTORY_WRITE ORDERS_READ PAYMENTS_READ' : ''), session: 'false'})) url.searchParams.set(key, value);
    return url.toString();
  }
  async #request(method, route, payload, {mutation = false, oauth = false} = {}) {
    if (!oauth && this.#token === null) fail('square_authorization_required');
    const encoded = payload === undefined ? undefined : JSON.stringify(payload);
    if (encoded && Buffer.byteLength(encoded) > 1048576) fail('square_payload_too_large');
    let response;
    try {
      response = await this.#fetch(new URL(route, this.#origin), {method, body: encoded, redirect: 'error',
        signal: AbortSignal.timeout(this.#timeout), headers: {'Square-Version': SQUARE_API_VERSION,
          Accept: 'application/json', ...(encoded ? {'Content-Type': 'application/json'} : {}),
          ...(oauth ? {} : {Authorization: 'Bearer ' + this.#token})}});
    } catch {throw new SquareApiError('square_provider_unavailable', {uncertain: mutation});}
    let data;
    try {
      const chunks = []; let bytes = 0; const reader = response.body?.getReader();
      if (!reader) throw Error();
      for (;;) {const {done, value} = await reader.read(); if (done) break;
        bytes += value.byteLength; if (bytes > 2 * 1024 * 1024) {await reader.cancel(); throw Error();} chunks.push(value);}
      data = JSON.parse(new TextDecoder('utf8', {fatal: true}).decode(Buffer.concat(chunks)));
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw Error();
    } catch {throw new SquareApiError('square_response_invalid', {status: response.status, uncertain: mutation});}
    if (!response.ok || data.errors?.length) {
      const status = response.status;
      const retry = Number(response.headers.get('retry-after'));
      const code = [401,403].includes(status) ? 'square_authorization_required' : status === 404 ? 'square_resource_missing'
        : status === 429 ? 'square_rate_limited' : status >= 500 ? 'square_provider_unavailable' : 'square_request_rejected';
      throw new SquareApiError(code, {status, uncertain: mutation && (status >= 500 || status < 400),
        retryAfterSeconds: status === 429 && Number.isFinite(retry) ? Math.min(3600, Math.max(0, Math.ceil(retry))) : null});
    }
    return data;
  }
  async obtainToken({appId, appSecret, redirectUri, code, refreshToken}) {
    secret(appId); secret(appSecret);
    if ((typeof code === 'string') === (typeof refreshToken === 'string')) fail('square_invalid_grant');
    const payload = {client_id: appId, client_secret: appSecret,
      grant_type: code ? 'authorization_code' : 'refresh_token'};
    if (code) {secret(code); payload.code = code; payload.redirect_uri = new URL(redirectUri).toString();}
    else payload.refresh_token = secret(refreshToken);
    const data = await this.#request('POST', '/oauth2/token', payload, {oauth: true, mutation: true});
    if (data.token_type?.toLowerCase() !== 'bearer' || !identifier.test(data.merchant_id) ||
        !Number.isFinite(Date.parse(data.expires_at))) throw new SquareApiError('square_token_response_invalid', {uncertain: true});
    return {accessToken: secret(data.access_token), refreshToken: secret(data.refresh_token), merchantId: data.merchant_id,
      expiresAt: new Date(data.expires_at).toISOString()};
  }
  async currentMerchant() {
    const data = await this.#request('GET', '/v2/merchants');
    if (data.cursor || !Array.isArray(data.merchant) || data.merchant.length !== 1 ||
        data.merchant[0].status !== 'ACTIVE') fail('square_merchant_unconfirmed');
    return {id: id(data.merchant[0].id)};
  }
  async merchant(merchantId) {
    const data = await this.#request('GET', '/v2/merchants/' + id(merchantId));
    if (data.merchant?.id !== merchantId) fail('square_merchant_mismatch');
    return {id: data.merchant.id};
  }
  async locations(merchantId) {
    id(merchantId); const data = await this.#request('GET', '/v2/locations');
    if (!Array.isArray(data.locations) || data.locations.length > 1000) fail('square_locations_incomplete');
    return data.locations.filter(row => row.status === 'ACTIVE' && row.merchant_id === merchantId && row.currency === 'USD')
      .map(row => ({id: id(row.id), name: typeof row.name === 'string' ? row.name.slice(0, 255) : row.id, currency: 'USD'}));
  }
  async item(itemId) {
    const data = await this.#request('GET', '/v2/catalog/object/' + id(itemId));
    if (data.object?.id !== itemId || data.object.type !== 'ITEM' || data.object.is_deleted === true) fail('square_resource_missing');
    return data.object;
  }
  async itemsForExactSku(sku) {
    if (typeof sku !== 'string' || !/^https:\/\/grookaivault\.com\/q\/GVVI-[A-Z0-9]+-[0-9]{6}$/.test(sku)) fail('square_invalid_sku');
    let cursor; const seen = new Set(), ids = new Set();
    for (let page = 0; page < 5; page++) {
      const data = await this.#request('POST', '/v2/catalog/search', {object_types: ['ITEM_VARIATION'],
        include_deleted_objects: false, limit: 100, query: {exact_query: {attribute_name: 'sku', attribute_value: sku}}, ...(cursor ? {cursor} : {})});
      if (data.objects !== undefined && !Array.isArray(data.objects)) fail('square_catalog_incomplete');
      for (const row of data.objects ?? []) {
        if (row.type !== 'ITEM_VARIATION' || row.item_variation_data?.sku !== sku || row.is_deleted === true) fail('square_catalog_incomplete');
        ids.add(id(row.item_variation_data.item_id));
      }
      if (ids.size > 10) fail('square_duplicate_sku');
      if (!data.cursor) {
        const items = [];
        for (const itemId of ids) items.push(await this.item(itemId));
        return items;
      }
      if (typeof data.cursor !== 'string' || data.cursor.length > 4096 || seen.has(data.cursor)) fail('square_catalog_incomplete');
      seen.add(data.cursor); cursor = data.cursor;
    }
    fail('square_catalog_incomplete');
  }
  async upsert(request, sku) {
    if (!request || typeof request.idempotency_key !== 'string' || request.idempotency_key.length > 128 || request.object?.type !== 'ITEM') fail('square_invalid_upsert');
    const expected = request.object.item_data?.variations?.filter(row => row.item_variation_data?.sku === sku);
    if (!Array.isArray(expected) || expected.length !== 1) fail('square_invalid_upsert');
    const data = await this.#request('POST', '/v2/catalog/object', request, {mutation: true});
    const item = data.catalog_object;
    const matches = item?.item_data?.variations?.filter(row => row.item_variation_data?.sku === sku);
    if (item?.type !== 'ITEM' || !identifier.test(item.id) || !Array.isArray(matches) || matches.length !== 1 || !identifier.test(matches[0].id) ||
        !isDeepStrictEqual(squareManagedProjection(item, matches[0]), squareManagedProjection(request.object, expected[0]))) {
      throw new SquareApiError('square_receipt_unconfirmed', {uncertain: true});
    }
    return {itemId: item.id, variationId: matches[0].id};
  }
  async inventoryQuantity(variationId, locationId) {
    id(variationId); id(locationId);
    const data = await this.#request('POST','/v2/inventory/counts/batch-retrieve',{
      catalog_object_ids:[variationId],location_ids:[locationId],states:['IN_STOCK'],limit:100});
    if (data.cursor || (data.counts !== undefined && !Array.isArray(data.counts))) fail('square_inventory_incomplete');
    const counts=data.counts??[];
    if(counts.length>1 || counts.some(row=>row.catalog_object_id!==variationId||row.location_id!==locationId||row.state!=='IN_STOCK'||!/^\d+$/.test(row.quantity))) fail('square_inventory_unconfirmed');
    const quantity=counts.length?Number(counts[0].quantity):0;
    if(!Number.isSafeInteger(quantity)||quantity<0)fail('square_inventory_unconfirmed');
    return quantity;
  }
  async changeInventory(request) {
    if(!request?.idempotency_key||request.changes?.length!==1||request.changes[0].type!=='PHYSICAL_COUNT')fail('square_invalid_stock_request');
    await this.#request('POST','/v2/inventory/changes/batch-create',request,{mutation:true});
    return {accepted:true};
  }
  async order(orderId) {
    const data=await this.#request('GET','/v2/orders/'+id(orderId));
    if(data.order?.id!==orderId)fail('square_order_unconfirmed');return data.order;
  }
  async payment(paymentId) {
    const data=await this.#request('GET','/v2/payments/'+id(paymentId));
    if(data.payment?.id!==paymentId)fail('square_payment_unconfirmed');return data.payment;
  }
  async refund(refundId) {
    const data=await this.#request('GET','/v2/refunds/'+id(refundId));
    if(data.refund?.id!==refundId)fail('square_refund_unconfirmed');return data.refund;
  }
  async recentOrders(locationId, since, until) {
    id(locationId);if(!Number.isFinite(Date.parse(since)))fail('square_invalid_request');
    const orders=[],seen=new Set();let cursor;
    for(let page=0;page<25;page++){
      const data=await this.#request('POST','/v2/orders/search',{location_ids:[locationId],limit:100,
        query:{filter:{date_time_filter:{updated_at:{start_at:since,...(until?{end_at:until}:{})}}},sort:{sort_field:'UPDATED_AT',sort_order:'ASC'}},...(cursor?{cursor}:{})});
      if(data.orders!==undefined&&!Array.isArray(data.orders))fail('square_orders_incomplete');
      for(const order of data.orders??[]){id(order.id);if(order.location_id!==locationId)fail('square_order_unconfirmed');orders.push(order);}
      if(!data.cursor)return orders;
      if(typeof data.cursor!=='string'||data.cursor.length>4096||seen.has(data.cursor))fail('square_orders_incomplete');
      seen.add(data.cursor);cursor=data.cursor;
    }
    fail('square_orders_incomplete');
  }
  async recentRefunds(locationId,since,until,connectionCreatedAt){
    id(locationId);for(const value of [since,until,connectionCreatedAt])if(!Number.isFinite(Date.parse(value)))fail('square_invalid_request');
    const refunds=[],seen=new Set();let cursor;
    for(let page=0;page<25;page++){
      const query=new URLSearchParams({location_id:locationId,begin_time:connectionCreatedAt,end_time:until,
        updated_at_begin_time:since,updated_at_end_time:until,sort_field:'UPDATED_AT',sort_order:'ASC',limit:'100',...(cursor?{cursor}:{})});
      const data=await this.#request('GET','/v2/refunds?'+query);
      if(data.refunds!==undefined&&!Array.isArray(data.refunds))fail('square_refunds_incomplete');
      for(const refund of data.refunds??[]){id(refund.id);if(refund.location_id!==locationId)fail('square_refund_unconfirmed');refunds.push(refund);}
      if(!data.cursor)return refunds;
      if(typeof data.cursor!=='string'||data.cursor.length>4096||seen.has(data.cursor))fail('square_refunds_incomplete');
      seen.add(data.cursor);cursor=data.cursor;
    }
    fail('square_refunds_incomplete');
  }
  // Operator qualification only. Production always rejects before IO. There is
  // no user-facing payment/refund-create route or production write permission.
  async sandboxTestMutation(kind,payload){
    if(this.#origin!==origins.sandbox)fail('square_sandbox_required');
    const routes={order:'/v2/orders',payment:'/v2/payments',refund:'/v2/refunds'};
    if(!Object.hasOwn(routes,kind)||!payload?.idempotency_key)fail('square_invalid_request');
    if(kind==='payment'&&payload.source_id!=='cnon:card-nonce-ok')fail('square_sandbox_test_source_required');
    return this.#request('POST',routes[kind],payload,{mutation:true});
  }
}
