import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { planSquareCatalog, squareQrSku, squareUsdCents, squareNewItemsCsv } from '../catalog_plan_v1.mjs';

const scope = {ownerId: 'owner-fixture', merchantId: 'merchant-fixture', locationId: 'location-fixture', environment: 'sandbox'};
const gvvi = 'GVVI-DEMO0000-000001';
const offer = (changes = {}) => ({ownerId: scope.ownerId, gvviId: gvvi, selected: true,
  publicVendorOffer: true, available: true, name: 'Aerodactyl · Fossil #1',
  variationName: 'Holo · NM', askingPriceAmount: '20.00', currency: 'USD', ...changes});
const request = (changes = {}) => ({scope, offers: [offer()], catalog: {scope, complete: true, items: []}, ...changes});
const projected = () => ({name: offer().name, variationName: offer().variationName, sku: squareQrSku(gvvi),
  pricingType: 'FIXED_PRICING', price: {amount: 2000, currency: 'USD'}});
function existing(changes = {}) {
  const object = structuredClone(planSquareCatalog(request()).actions[0].request.object);
  object.id = 'square-item'; object.version = 100;
  Object.assign(object.item_data.variations[0], {id: 'square-variation', version: 100});
  object.item_data.variations[0].item_variation_data.item_id = object.id;
  Object.assign(object, changes);
  return object;
}
const mapping = (changes = {}) => ({scope, gvviId: gvvi, itemId: 'square-item', variationId: 'square-variation',
  lastSyncedProjection: projected(), ...changes});
const withExisting = (item, changes = {}) => request({catalog: {scope, complete: true, items: [item]}, mappings: [mapping()], ...changes});
const errorIs = code => error => error.code === code;

test('one grookai QR URL becomes the exact Square SKU; catalog creation has no stock allocation', () => {
  const plan = planSquareCatalog(request());
  const action = plan.actions[0];
  const object = action.request.object;
  assert.equal(plan.executable, false);
  assert.equal(action.action, 'create');
  assert.equal(action.sku, 'https://grookaivault.com/q/GVVI-DEMO0000-000001');
  assert.equal(object.item_data.variations[0].item_variation_data.sku, action.sku);
  assert.equal(object.item_data.variations[0].item_variation_data.track_inventory, true);
  assert.equal(JSON.stringify(object).includes('quantity'), false);
  assert.deepEqual(object.present_at_location_ids, ['location-fixture']);
  assert.equal(object.present_at_all_locations, false);
});

test('money conversion is exact, positive USD only; no rounding or inferred values', () => {
  for (const [amount, expected] of [['0.01', 1], ['20', 2000], [19.99, 1999], ['9999999999.99', 999999999999]]) {
    assert.equal(squareUsdCents(amount, 'USD'), expected);
  }
  for (const amount of ['0', '1.001', '01.00', '-1', '1e3', '', null, NaN, Infinity, true]) {
    assert.throws(() => squareUsdCents(amount, 'USD'), errorIs('invalid_price'));
  }
  assert.throws(() => squareUsdCents('20', 'CAD'), errorIs('unsupported_currency'));
});

test('deterministic plan/key across record/key order; distinct copies keep distinct SKUs', () => {
  const second = offer({gvviId: 'GVVI-DEMO0000-000002'});
  const a = planSquareCatalog(request({offers: [offer(), second]}));
  const b = planSquareCatalog(request({offers: [second, offer()]}));
  assert.deepEqual(a, b);
  assert.notEqual(a.actions[0].sku, a.actions[1].sku);
  assert.notEqual(a.actions[0].request.idempotency_key, a.actions[1].request.idempotency_key);
  const changed = planSquareCatalog(request({offers: [offer({askingPriceAmount: '21'})]}));
  assert.notEqual(a.actions[0].request.idempotency_key, changed.actions[0].request.idempotency_key);
  assert.equal(a.actions[0].request.object.id, changed.actions[0].request.object.id);
});

test('private, unselected and unavailable copies never become create/update requests', () => {
  for (const change of [{selected: false}, {publicVendorOffer: false}, {available: false}, {selected: 'true'}]) {
    const plan = planSquareCatalog(request({offers: [offer(change)]}));
    assert.equal(plan.actions.length, 0); assert.equal(plan.excluded.length, 1);
  }
});

test('reject cross-owner, environment, location and merchant snapshots/mappings', () => {
  assert.throws(() => planSquareCatalog(request({offers: [offer({ownerId: 'other-owner'})]})), errorIs('wrong_offer_owner'));
  for (const field of ['ownerId', 'merchantId', 'locationId', 'environment']) {
    const other = {...scope, [field]: field === 'environment' ? 'production' : 'other'};
    assert.throws(() => planSquareCatalog(request({catalog: {scope: other, complete: true, items: []}})));
    assert.throws(() => planSquareCatalog(request({mappings: [mapping({scope: other})]})));
  }
});

test('a partial provider read cannot authorize creation; duplicate selections fail', () => {
  assert.throws(() => planSquareCatalog(request({catalog: {scope, complete: false, items: []}})));
  assert.throws(() => planSquareCatalog(request({offers: [offer(), offer()]})), errorIs('invalid_or_duplicate_offer'));
});

test('existing pilot URL requires explicit adoption instead of a duplicate item', () => {
  const plan = planSquareCatalog(withExisting(existing(), {mappings: []}));
  assert.equal(plan.actions[0].action, 'adoption_required');
  assert.equal(plan.actions[0].variationId, 'square-variation');
  assert.equal(plan.actions[0].request, undefined);
  assert.equal(squareNewItemsCsv(plan).split('\r\n').length, 2);
});

test('ambiguous Square SKUs are conflicts even for already mapped stock', () => {
  const item = existing(); const other = existing({id: 'second-item'});
  other.item_data.variations[0].id = 'second-variation';
  other.item_data.variations[0].item_variation_data.item_id = other.id;
  const plan = planSquareCatalog(request({catalog: {scope, complete: true, items: [item, other]}}));
  assert.equal(plan.actions[0].reason, 'duplicate_square_sku');
});

test('mapped identical items need no provider request', () => {
  assert.equal(planSquareCatalog(withExisting(existing())).actions[0].action, 'unchanged');
});

test('price update retains complete Square taxes/modifiers/stock settings and version', () => {
  const item = existing();
  item.item_data.tax_ids = ['tax-id']; item.item_data.modifier_list_info = [{modifier_list_id: 'modifier-id', enabled: true}];
  item.item_data.variations[0].item_variation_data.location_overrides = [{location_id: scope.locationId, track_inventory: true}];
  const before = structuredClone(item);
  const plan = planSquareCatalog(withExisting(item, {offers: [offer({askingPriceAmount: '22.50'})]}));
  const update = plan.actions[0].request.object;
  assert.equal(plan.actions[0].action, 'update');
  assert.equal(update.id, item.id); assert.equal(update.version, 100);
  assert.deepEqual(update.item_data.tax_ids, item.item_data.tax_ids);
  assert.deepEqual(update.item_data.modifier_list_info, item.item_data.modifier_list_info);
  assert.deepEqual(update.item_data.variations[0].item_variation_data.location_overrides,
    item.item_data.variations[0].item_variation_data.location_overrides);
  assert.equal(update.item_data.variations[0].item_variation_data.price_money.amount, 2250);
  assert.deepEqual(item, before);
});

test('Square-side edits, broken mappings and shared items are held for review', () => {
  const edited = existing(); edited.item_data.variations[0].item_variation_data.price_money.amount = 1700;
  assert.equal(planSquareCatalog(withExisting(edited)).actions[0].reason, 'square_managed_fields_changed');
  assert.equal(planSquareCatalog(request({mappings: [mapping()]})).actions[0].reason, 'mapping_target_missing_or_changed');
  const multi = existing(); const sibling = structuredClone(multi.item_data.variations[0]);
  sibling.id = 'sibling'; sibling.item_variation_data.sku = 'another-sku';
  multi.item_data.variations.push(sibling);
  assert.equal(planSquareCatalog(withExisting(multi, {offers: [offer({name: 'Changed name'})]})).actions[0].reason,
    'shared_square_item_requires_review');
});

test('missing update versions and nonunique mappings fail closed', () => {
  const item = existing(); delete item.version;
  assert.throws(() => planSquareCatalog(withExisting(item, {offers: [offer({askingPriceAmount: '21'})]})), errorIs('missing_catalog_version'));
  assert.throws(() => planSquareCatalog(request({mappings: [mapping(), mapping()]})), errorIs('duplicate_mapping'));
});

test('CSV emits only new items, exact full URLs, quoted commas/quotes, cents and safe formula cells', () => {
  const plan = planSquareCatalog(request({offers: [offer({name: '=UNTRUSTED("a,b")'})]}));
  const csv = squareNewItemsCsv(plan, {locationName: 'Main shop'});
  assert.ok(csv.startsWith('\uFEFF"Token","Item Name"'));
  assert.ok(csv.includes('"Enabled Main shop"'));
  assert.ok(csv.includes('"\'=UNTRUSTED(""a,b"")"'));
  assert.ok(csv.includes(`"${squareQrSku(gvvi)}","20.00","Y"`));
  assert.equal(csv.includes('New Quantity'), false);
  assert.equal(csv.includes(scope.ownerId), false);
});

test('unexpected scope properties never leak into prepared output', () => {
  const plan = planSquareCatalog(request({scope: {...scope, unrecognizedPrivateField: 'must-not-export'}}));
  assert.equal(JSON.stringify(plan).includes('must-not-export'), false);
});

test('offline CLI persists preparation/failure receipts and refuses replacing a run', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'grookai-square-plan-'));
  const input = path.join(root, 'input.json');
  const out = path.join(root, 'prepared');
  const script = fileURLToPath(new URL('../prepare_catalog_plan_v1.mjs', import.meta.url));
  await fs.writeFile(input, JSON.stringify(request()));
  const run = output => spawnSync(process.execPath, [script, '--input', input, '--out-dir', output], {encoding: 'utf8', windowsHide: true});
  const first = run(out); assert.equal(first.status, 0, first.stderr);
  const result = JSON.parse(await fs.readFile(path.join(out, 'result.json'), 'utf8'));
  assert.equal(result.counts.create, 1); assert.equal(result.providerWrites, 0);
  const saved = await fs.readFile(path.join(out, 'plan.private.json'), 'utf8');
  assert.equal(run(out).status, 1);
  assert.equal(await fs.readFile(path.join(out, 'plan.private.json'), 'utf8'), saved);
  await fs.writeFile(input, '{invalid');
  const failed = path.join(root, 'failed'); assert.equal(run(failed).status, 1);
  assert.equal(JSON.parse(await fs.readFile(path.join(failed, 'failure.json'), 'utf8')).status, 'failed');
  // Retain uniquely named test artifacts; never reset/delete shared fixtures.
});
