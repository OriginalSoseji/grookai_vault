import {createHash, randomBytes, randomUUID} from 'node:crypto';
import {SquareClient, SquareApiError} from './client_v1.mjs';
import {sealSquareCredential, openSquareCredential} from './credential_envelope_v1.mjs';
import {planSquareCatalog, squareQrSku, squareManagedProjection, squareDesiredProjection} from './catalog_plan_v1.mjs';
import {syncSquareArtwork} from './artwork_sync_v1.mjs';
import {loadSquareArtwork} from './artwork_source_v1.mjs';

const fail = code => {throw new SquareApiError(code);};
const uuidPattern = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/;
const uuid = value => typeof value === 'string' && uuidPattern.test(value) ? value : fail('square_invalid_request');
const capability = value => typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value) ? value : fail('square_oauth_expired');
const hash = value => createHash('sha256').update(value).digest('hex');
const sorted = value => Array.isArray(value) ? value.map(sorted) : value !== null && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, sorted(value[key])])) : value;
const same = (a, b) => JSON.stringify(sorted(a)) === JSON.stringify(sorted(b));
const errorCode = error => /^square_[a-z_]{1,80}$/.test(error?.code) ? error.code : 'square_operation_failed';
const tokenContext = connection => ({purpose: 'tokens', environment: connection.environment,
  ownerId: connection.owner_id, connectionId: connection.id, bindingId: connection.merchant_id});
const launchContext = attempt => ({purpose: 'launch', environment: attempt.environment,
  ownerId: attempt.ownerId, connectionId: attempt.id, bindingId: attempt.id});
const scopeFor = connection => ({environment: connection.environment, ownerId: connection.owner_id,
  merchantId: connection.merchant_id, locationId: connection.location_id});
const reviewHash = (connection, target, offer, item, variation) => hash(JSON.stringify([
  'square-adoption-v1', scopeFor(connection), target.id, offer, item.id, item.version,
  variation.id, variation.version, squareManagedProjection(item, variation)]));

export class SquareCatalogService {
  #rpc; #config; #client; #now; #artworkSource;
  constructor({rpc, config, clientFactory = options => new SquareClient(options), now = Date.now, artworkSource=loadSquareArtwork}) {
    if (typeof rpc !== 'function' || !config || typeof clientFactory !== 'function') fail('square_configuration_unavailable');
    this.#rpc = rpc; this.#config = config; this.#client = clientFactory; this.#now = now;this.#artworkSource=artworkSource;
  }
  #configuration(lane) {
    const config = this.#config;
    if (!['sandbox', 'production'].includes(config.environment) || !config.appId || !config.appSecret ||
        !config.encryptionKey || !config.callbackUrl || (lane && config[lane] !== true)) fail('square_configuration_unavailable');
    const callback = new URL(config.callbackUrl);
    if (callback.protocol !== 'https:' || callback.pathname !== '/api/square/oauth/callback' || callback.search || callback.hash || callback.username || callback.password) fail('square_configuration_unavailable');
    return config;
  }
  async #call(action, data) {return this.#rpc(action, data);}
  async start(ownerId, {clientReturn = 'web'} = {}) {
    if (!['web','native'].includes(clientReturn)) fail('square_invalid_request');
    uuid(ownerId); const config = this.#configuration('linkingEnabled');
    const attemptId = randomUUID(), state = randomBytes(32).toString('base64url'), launch = randomBytes(32).toString('base64url');
    const context = {id: attemptId, ownerId, environment: config.environment};
    await this.#call('oauth_start', {ownerId, environment: config.environment, attemptId,
      stateHash: hash(state), launchHash: hash(launch),
      stateCiphertext: sealSquareCredential({state}, config.encryptionKey, launchContext(context)), clientReturn});
    const launchUrl = new URL('/api/square/oauth/launch', config.callbackUrl);
    launchUrl.searchParams.set('capability', launch);
    return {launchUrl: launchUrl.toString()};
  }
  async launch(rawCapability) {
    const config = this.#configuration('linkingEnabled'), nonce = randomBytes(32).toString('base64url');
    const attempt = await this.#call('oauth_launch', {launchHash: hash(capability(rawCapability)), browserHash: hash(nonce)});
    if (attempt.environment !== config.environment) fail('square_environment_mismatch');
    const {state} = openSquareCredential(attempt.state_ciphertext, config.encryptionKey, launchContext(attempt));
    return {browserNonce: nonce, authorizationUrl: this.#client({environment: config.environment}).authorizationUrl({
      appId: config.appId, redirectUri: config.callbackUrl, state: capability(state), commerce: config.commerceEnabled === true})};
  }
  async callback({state, browserNonce, code, denied = false}) {
    const config = this.#configuration();
    const attempt = await this.#call('oauth_consume', {stateHash: hash(capability(state)), browserHash: hash(capability(browserNonce))});
    try {
      if (denied || typeof code !== 'string' || !code || code.length > 191) fail('square_authorization_denied');
      if (attempt.environment !== config.environment) fail('square_environment_mismatch');
      const tokens = await this.#client({environment: config.environment}).obtainToken({appId: config.appId,
        appSecret: config.appSecret, redirectUri: config.callbackUrl, code});
      if (!Number.isFinite(Date.parse(tokens.expiresAt)) || Date.parse(tokens.expiresAt) <= this.#now()) fail('square_token_response_invalid');
      await this.#client({environment: config.environment, accessToken: tokens.accessToken}).merchant(tokens.merchantId);
      const connection = {id: attempt.connection_id, owner_id: attempt.ownerId, environment: attempt.environment, merchant_id: tokens.merchantId};
      const result = await this.#call('oauth_finish', {attemptId: attempt.id, merchantId: tokens.merchantId,
        tokenCiphertext: sealSquareCredential(tokens, config.encryptionKey, tokenContext(connection))});
      return {...result, clientReturn: attempt.clientReturn === 'native' ? 'native' : 'web'};
    } catch (error) {
      await this.#call('oauth_fail', {attemptId: attempt.id}).catch(() => {});
      throw new SquareApiError(errorCode(error));
    }
  }
  async #leased(ownerId, connectionId, action) {
    uuid(ownerId); uuid(connectionId); const config = this.#configuration();
    const leaseToken = randomUUID();
    const connection = await this.#call('claim', {ownerId, connectionId, leaseToken});
    const context = {ownerId, connectionId, leaseToken, fence: connection.lease_fence};
    try {
      if (connection.environment !== config.environment || connection.owner_id !== ownerId || connection.id !== connectionId) fail('square_environment_mismatch');
      if (connection.retry_after && Date.parse(connection.retry_after) > this.#now()) fail('square_rate_limited');
      if (connection.refresh_status !== 'idle') fail('square_refresh_unconfirmed');
      let tokens = openSquareCredential(connection.token_ciphertext, config.encryptionKey, tokenContext(connection));
      if (tokens.merchantId !== connection.merchant_id || !Number.isFinite(Date.parse(tokens.expiresAt))) fail('square_credential_envelope_invalid');
      if (Date.parse(tokens.expiresAt) < this.#now() + 5 * 60 * 1000) {
        await this.#call('refresh_prepare', context);
        try {
          tokens = await this.#client({environment: connection.environment}).obtainToken({appId: config.appId,
            appSecret: config.appSecret, refreshToken: tokens.refreshToken});
          if (tokens.merchantId !== connection.merchant_id || !Number.isFinite(Date.parse(tokens.expiresAt)) || Date.parse(tokens.expiresAt) <= this.#now()) fail('square_merchant_mismatch');
          await this.#call('refresh_finish', {...context, tokenCiphertext: sealSquareCredential(tokens, config.encryptionKey, tokenContext(connection))});
        } catch (error) {
          await this.#call('refresh_fail', context).catch(() => {});
          throw new SquareApiError(errorCode(error));
        }
      }
      const client = this.#client({environment: connection.environment, accessToken: tokens.accessToken});
      return await action({connection, context, client});
    } catch (error) {
      if (error.code === 'square_rate_limited' && (!connection.retry_after || Date.parse(connection.retry_after) <= this.#now())) {
        await this.#call('defer', {...context, seconds: Math.max(1, Math.min(3600, error.retryAfterSeconds ?? 60))});
      } else if (error.code === 'square_authorization_required') {
        await this.#call('authorization_failed', context);
      }
      throw error;
    } finally {await this.#call('release', context).catch(() => {});}
  }
  async locations(ownerId, connectionId) {
    return this.#leased(ownerId, connectionId, async ({connection, client}) => ({locations: await client.locations(connection.merchant_id)}));
  }
  // Server-only orchestration hook. The connection is still verified, leased,
  // decrypted and refreshed by the same private path as catalog operations.
  async withConnection(ownerId, connectionId, action) {
    if(typeof action !== 'function') fail('square_invalid_request');
    return this.#leased(ownerId, connectionId, action);
  }
  async configure(ownerId, connectionId, {locationId, autoSync = false}) {
    this.#configuration('catalogEnabled');
    if (typeof autoSync !== 'boolean') fail('square_invalid_request');
    // Keep the lease until the verified location is recorded; configure verifies
    // that same claim rather than releasing between provider proof and SQL.
    return this.#leased(ownerId, connectionId, async ({connection, context, client}) => {
      const locations = await client.locations(connection.merchant_id);
      if (!locations.some(location => location.id === locationId)) fail('square_location_unavailable');
      return this.#call('configure', {...context, locationId, autoSync});
    });
  }
  async select(ownerId, connectionId, {instanceIds, confirmed}) {
    this.#configuration('catalogEnabled'); uuid(ownerId); uuid(connectionId);
    if (!Array.isArray(instanceIds) || instanceIds.length < 1 || instanceIds.length > 1000 || confirmed !== true) fail('square_invalid_selection');
    instanceIds.forEach(uuid);
    return this.#call('select', {ownerId, connectionId, instanceIds, confirmed: true});
  }
  async pause(ownerId, connectionId) {return this.#call('pause', {ownerId: uuid(ownerId), connectionId: uuid(connectionId)});}
  async disconnect(ownerId, connectionId) {return this.#call('disconnect', {ownerId: uuid(ownerId), connectionId: uuid(connectionId)});}
  async deselect(ownerId, connectionId, instanceIds) {
    if (!Array.isArray(instanceIds) || instanceIds.length < 1 || instanceIds.length > 1000) fail('square_invalid_selection');
    instanceIds.forEach(uuid);
    return this.#call('deselect', {ownerId: uuid(ownerId), connectionId: uuid(connectionId), instanceIds});
  }
  async #lookup(client, sku) {
    const items = await client.itemsForExactSku(sku);
    const matches = items.flatMap(item => (item.item_data?.variations ?? [])
      .filter(variation => variation.item_variation_data?.sku === sku).map(variation => ({item, variation})));
    if (matches.length > 1) fail('square_duplicate_sku');
    return {items, match: matches[0] ?? null};
  }
  async sync(ownerId, connectionId, targetId, requestId) {
    this.#configuration('catalogEnabled'); uuid(targetId); uuid(requestId);
    return this.#leased(ownerId, connectionId, async ({connection, context, client}) => {
      const scoped = {...context, targetId}; let operation = null; let sent = false; let accepted = false;
      try {
        const state = await this.#call('target', scoped), {target, offer} = state;
        operation = state.pendingOperation;
        if (operation && operation.target_id !== targetId) fail('square_connection_busy');
        if(operation?.payload?.artwork)return syncSquareArtwork({connection,context,client,rpc:(a,d)=>this.#call(a,d),state,requestId,loadSource:this.#artworkSource,enabled:this.#config.artworkEnabled===true});
        if (operation?.status === 'uncertain') {
          const sku = squareQrSku(operation.source_snapshot.gvviId), {match} = await this.#lookup(client, sku);
          if (match && same(squareManagedProjection(match.item, match.variation), operation.projection)) {
            await this.#call('recover_finish', {...scoped, operationId: operation.id, itemId: match.item.id,
              variationId: match.variation.id, observedProjection: operation.projection});
            return {status: 'reconciled'};
          }
          // Never create a new operation/key, or resend old publication after a
          // privacy/selection/source change. Retain unresolved evidence instead.
          if (!target.selected || !offer || !same(offer, operation.source_snapshot)) fail('square_reconciliation_required');
        }
        if (!operation) {
          if (!target.selected || !offer) fail('square_copy_ineligible');
          if (!connection.location_id) fail('square_location_required');
          const sku = squareQrSku(offer.gvviId), {items, match} = await this.#lookup(client, sku), scope = scopeFor(connection);
          const mappings = target.item_id ? [{scope, gvviId: offer.gvviId, itemId: target.item_id,
            variationId: target.variation_id, lastSyncedProjection: target.last_synced_projection}] : [];
          const plan = planSquareCatalog({scope, offers: [offer], catalog: {scope, complete: true, items}, mappings});
          const action = plan.actions[0];
          if (action.action === 'unchanged') {await this.#call('no_change', scoped); return {status: 'unchanged'};}
          if (action.action === 'adoption_required') {
            await this.#call('target_error', {...scoped, errorCode: 'square_adoption_required'});
            return {status: 'adoption_required', itemId: match.item.id, variationId: match.variation.id,
              observed: squareManagedProjection(match.item, match.variation),
              reviewHash: reviewHash(connection, target, offer, match.item, match.variation)};
          }
          if (action.action === 'conflict') fail(action.reason === 'duplicate_square_sku' ? 'square_duplicate_sku'
            : action.reason.startsWith('square_') ? action.reason : 'square_' + action.reason);
          operation = await this.#call('prepare', {...scoped, requestId, payload: action.request,
            sourceSnapshot: offer, projection: squareDesiredProjection(offer)});
        }
        operation = await this.#call('begin', {...scoped, operationId: operation.id});
        sent = true;
        const receipt = await client.upsert(operation.payload, squareQrSku(operation.source_snapshot.gvviId));
        accepted = true;
        // If receipt persistence fails, acceptance is uncertain: do not replace
        // the operation even if the HTTP response itself was successful.
        await this.#call('finish', {...scoped, operationId: operation.id, ...receipt});
        return {status: 'synced'};
      } catch (error) {
        const code = errorCode(error);
        if (operation) {
          const uncertain = accepted || operation.status === 'uncertain' || (sent && (error.uncertain !== false || code === 'square_operation_failed'));
          await this.#call('fail', {...scoped, operationId: operation.id, errorCode: code, uncertain}).catch(() => {});
        } else await this.#call('target_error', {...scoped, errorCode: code}).catch(() => {});
        const safe=new SquareApiError(code, {uncertain: error.uncertain === true, retryAfterSeconds: error.retryAfterSeconds ?? null});
        if(/^[0-9A-Z]{5}$/.test(error.databaseCode??''))safe.databaseCode=error.databaseCode;
        throw safe;
      }
    });
  }
  async syncArtwork(ownerId,connectionId,targetId,requestId){
    this.#configuration('catalogEnabled');uuid(targetId);uuid(requestId);
    return this.#leased(ownerId,connectionId,async({connection,context,client})=>{
      const state=await this.#call('target',{...context,targetId});
      return syncSquareArtwork({connection,context,client,rpc:(a,d)=>this.#call(a,d),state,requestId,loadSource:this.#artworkSource,enabled:this.#config.artworkEnabled===true});
    });
  }
  async adopt(ownerId, connectionId, targetId, {itemId, variationId, expectedReviewHash, requestId, confirmed}) {
    this.#configuration('catalogEnabled'); uuid(targetId); uuid(requestId);
    if (confirmed !== true || typeof expectedReviewHash !== 'string') fail('square_adoption_requires_review');
    return this.#leased(ownerId, connectionId, async ({connection, context, client}) => {
      const scoped = {...context, targetId}, {target, offer, pendingOperation} = await this.#call('target', scoped);
      if (!offer || !target.selected || pendingOperation) fail('square_adoption_requires_review');
      const {match} = await this.#lookup(client, squareQrSku(offer.gvviId));
      if (!match || match.item.id !== itemId || match.variation.id !== variationId ||
          reviewHash(connection, target, offer, match.item, match.variation) !== expectedReviewHash) fail('square_adoption_requires_review');
      return this.#call('adopt', {...scoped, confirmed: true, requestId, itemId, variationId,
        sourceSnapshot: offer, projection: squareManagedProjection(match.item, match.variation)});
    });
  }
}

export function squareEnvironmentConfig(env = process.env) {
  return {environment: env.SQUARE_ENVIRONMENT, appId: env.SQUARE_APP_ID, appSecret: env.SQUARE_APP_SECRET,
    encryptionKey: env.SQUARE_TOKEN_ENCRYPTION_KEY, callbackUrl: env.SQUARE_CALLBACK_URL,
    linkingEnabled: env.GROOKAI_SQUARE_LINKING_ENABLED === 'true', catalogEnabled: env.GROOKAI_SQUARE_CATALOG_ENABLED === 'true',
    commerceEnabled: env.GROOKAI_SQUARE_COMMERCE_ENABLED === 'true',artworkEnabled:env.GROOKAI_SQUARE_ARTWORK_ENABLED==='true'};
}
