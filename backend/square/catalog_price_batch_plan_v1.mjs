// Offline preparation only. No database, credentials, network, stock authority
// or production execution entry point. A durable server authority must reprove
// eligibility, membership, source and lease before using any prepared request.
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {planSquareCatalog, squareManagedProjection, squareDesiredProjection, SQUARE_API_VERSION} from './catalog_plan_v1.mjs';

export const SQUARE_PRICE_BATCH_PLAN_VERSION = 'grookai-square-price-batch-plan-v1';
export const SQUARE_PRICE_BATCH_LIMIT = 25;
const maxBytes = 1048576;
const fail = code => {const error = new Error(code); error.code = code; throw error;};
function ordered(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.map(ordered);
  if (value && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, ordered(value[key])]));
  }
  fail('square_batch_invalid_snapshot');
}
const canonical = value => JSON.stringify(ordered(value));
const digest = value => createHash('sha256').update(canonical(value)).digest('hex');
const requestDigest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const bytes = value => Buffer.byteLength(JSON.stringify(value));
const requestKey = (scope,members,objects) => 'gk-square-price-batch-v1-' + digest({version:SQUARE_PRICE_BATCH_PLAN_VERSION,scope,members,objects});

/** Prepare price-only replacements of distinct existing single-variation items.
 * Full catalog completeness is inherited from planSquareCatalog, not inferred
 * from a mapped-item lookup. All other actions remain on the ordinary path.
 */
export function planSquarePriceBatches(input) {
  canonical(input); // Never hash one value and silently serialize another.
  const plan = planSquareCatalog(input);
  const offers = new Map(input.offers.map(offer => [offer.gvviId, offer]));
  const items = new Map(input.catalog.items.map(item => [item.id, item]));
  const deferred = [], unchanged = [], candidates = [];
  for (const action of plan.actions) {
    if (action.action === 'unchanged') {unchanged.push(action.gvviId); continue;}
    if (action.action !== 'update') {
      deferred.push({gvviId: action.gvviId, reason: action.reason ?? action.action}); continue;
    }
    const object = action.request.object, prior = items.get(object.id);
    const previous = squareManagedProjection(prior, prior.item_data.variations[0]);
    const projection = squareManagedProjection(object, object.item_data.variations[0]);
    const {price: oldPrice, ...oldOther} = previous;
    const {price: newPrice, ...newOther} = projection;
    if (!isDeepStrictEqual(oldOther, newOther) || isDeepStrictEqual(oldPrice, newPrice)) {
      deferred.push({gvviId: action.gvviId, reason: 'not_price_only'}); continue;
    }
    candidates.push({gvviId: action.gvviId, itemId: object.id,
      variationId: object.item_data.variations[0].id,
      itemVersion: prior.version, variationVersion: prior.item_data.variations[0].version,
      sourceSnapshot: structuredClone(offers.get(action.gvviId)), projection, object});
  }
  const parentCounts = new Map();
  for (const member of candidates) parentCounts.set(member.itemId, (parentCounts.get(member.itemId) ?? 0) + 1);
  const batches = []; let members = [];
  function prepare(group) {
    const bindings = group.map(({object, ...member}) => member);
    const objects = group.map(member => member.object);
    // One whole-request key, bound to owner/environment/merchant/location and
    // original source/membership. Never reuse a single-target operation key.
    const key = requestKey(plan.scope,bindings,objects);
    const request = ordered({idempotency_key: key, batches: [{objects}]});
    return {scope: structuredClone(plan.scope), members: bindings, request, requestHash: digest(request),
      requestBytes: bytes(request), objectCount: group.length * 2};
  }
  function flush() {if (members.length) batches.push(prepare(members)); members = [];}
  for (const member of candidates) {
    if (parentCounts.get(member.itemId) !== 1) {
      deferred.push({gvviId: member.gvviId, reason: 'shared_parent_requires_review'}); continue;
    }
    if (prepare([member]).requestBytes > maxBytes) {
      deferred.push({gvviId: member.gvviId, reason: 'complete_object_exceeds_request_limit'}); continue;
    }
    if (members.length && (members.length === SQUARE_PRICE_BATCH_LIMIT || prepare([...members, member]).requestBytes > maxBytes)) flush();
    members.push(member);
  }
  flush();
  deferred.sort((a,b) => a.gvviId.localeCompare(b.gvviId, 'en'));
  const result = {version: SQUARE_PRICE_BATCH_PLAN_VERSION, squareApiVersion: SQUARE_API_VERSION,
    executable: false, scope: plan.scope, batches, unchanged, excluded: plan.excluded, deferred};
  return {...result, planHash: digest(result)};
}

/** Validate every member of a provider receipt. No prefix/partial result is an
 * acknowledgement. This returns review data only and cannot settle DB rows.
 */
export function inspectSquarePriceBatchReceipt(batch, response) {
  // Always rebind the exact persisted request to its members before accepting a
  // response. A future durable authority must also bind this hash in its row.
  canonical(batch); canonical(response);
  const invalid = () => fail('square_batch_receipt_unconfirmed');
  if (!batch || !Array.isArray(batch.members) || batch.members.length < 1 || batch.members.length > SQUARE_PRICE_BATCH_LIMIT ||
      requestDigest(batch.request) !== batch.requestHash || bytes(batch.request) > maxBytes ||
      batch.request?.batches?.length !== 1 || batch.request.batches[0].objects?.length !== batch.members.length ||
      batch.objectCount !== batch.members.length * 2 || batch.requestBytes !== bytes(batch.request) ||
      batch.request.idempotency_key !== requestKey(batch.scope,batch.members,batch.request.batches[0].objects) ||
      (response.errors !== undefined && (!Array.isArray(response.errors) || response.errors.length !== 0)) ||
      Object.hasOwn(response,'cursor') || !Array.isArray(response.objects) || response.objects.length !== batch.members.length) invalid();
  planSquareCatalog({scope:batch.scope,offers:[],catalog:{scope:batch.scope,complete:true,items:[]}});
  const seen = new Set(), seenVariations = new Set(), results = [];
  for (let i=0;i<batch.members.length;i++) {
    const member = batch.members[i], sent = batch.request.batches[0].objects[i];
    if (sent.id !== member.itemId || sent.version !== member.itemVersion || sent.item_data?.variations?.length !== 1 ||
        sent.item_data.variations[0].id !== member.variationId || sent.item_data.variations[0].version !== member.variationVersion ||
        member.sourceSnapshot?.ownerId !== batch.scope.ownerId || member.sourceSnapshot.gvviId !== member.gvviId ||
        member.sourceSnapshot.selected !== true || member.sourceSnapshot.publicVendorOffer !== true || member.sourceSnapshot.available !== true ||
        !isDeepStrictEqual(squareDesiredProjection(member.sourceSnapshot),member.projection) ||
        !isDeepStrictEqual(squareManagedProjection(sent, sent.item_data.variations[0]), member.projection) ||
        seen.has(member.itemId) || seenVariations.has(member.variationId)) invalid();
    seen.add(member.itemId); seenVariations.add(member.variationId);
    const matches = response.objects.filter(object => object.id === member.itemId);
    if (matches.length !== 1) invalid();
    const object = matches[0], variations = object.item_data?.variations;
    if (object.type !== 'ITEM' || object.is_deleted === true || !Number.isSafeInteger(object.version) || object.version <= member.itemVersion ||
        !Array.isArray(variations) || variations.length !== 1 || variations[0].id !== member.variationId || variations[0].type !== 'ITEM_VARIATION' ||
        variations[0].is_deleted === true || variations[0].item_variation_data?.item_id !== member.itemId ||
        !Number.isSafeInteger(variations[0].version) || variations[0].version <= member.variationVersion ||
        !isDeepStrictEqual(squareManagedProjection(object, variations[0]), member.projection)) invalid();
    results.push({gvviId: member.gvviId, itemId: member.itemId, variationId: member.variationId,
      itemVersion: object.version, variationVersion: variations[0].version});
  }
  return {executable: false, requestHash: batch.requestHash, members: results};
}
