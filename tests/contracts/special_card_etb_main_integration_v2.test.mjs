import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import test from 'node:test';
import {fingerprint} from '../../scripts/audits/export_special_card_etb_origins_v1.mjs';
import {applyMainProductOrigins, projectOriginalV1} from '../../scripts/audits/export_special_card_etb_origins_v2.mjs';

const root = new URL('../../', import.meta.url);
const read = file => fs.readFileSync(new URL(file, root));
const packetBytes = read('docs/audits/special_card_product_origins_v1_20261105/product_origins.json');
const packet = JSON.parse(packetBytes);
const review = JSON.parse(read('docs/audits/special_card_product_origins_main_v2_20261105/integration_review.json'));
const current = JSON.parse(read('apps/web/src/lib/cards/variantOriginPublicCopy.generated.json'));

test('frozen V1 source packet retains its committed bytes and semantic fingerprint', () => {
  assert.equal(createHash('sha256').update(packetBytes).digest('hex'), review.original_packet_sha256);
  assert.equal(review.original_packet_sha256, '501abac170ff71f17eb5857e1c5885cf4b004c3cb5ada43cdd7831945f61db25');
  assert.equal(fingerprint(packet), review.original_packet_fingerprint);
  const original = projectOriginalV1(current, packet, review);
  assert.equal(original.source_fingerprint_sha256, '619f3435b1cb481b817336363f09876259d66bf8d18e1128b554112f3c41f04c');
});

test('all current-main mobile content survives except the four reviewed row references', () => {
  const retained = structuredClone({families:current.families, by_gv_id:current.by_gv_id, by_card_print_id:current.by_card_print_id});
  for (const target of packet.targets) {
    delete retained.families[target.origin_family_key];
    retained.by_gv_id[target.gv_id] = target.prior_reference;
    retained.by_card_print_id[target.card_print_id] = target.prior_reference;
  }
  assert.equal(fingerprint(retained), review.baseline_mobile_payload_sha256);
  assert.equal(Object.keys(retained.families).length, 54);
  assert.equal(Object.keys(retained.by_gv_id).length, 3330);
});

test('the only legacy web copy changes are the 18 exact current-main brand corrections', () => {
  const original = projectOriginalV1(current, packet, review);
  const changes = [];
  for (const [familyKey, family] of Object.entries(original.families)) {
    for (const field of Object.keys(family)) {
      if (JSON.stringify(current.families[familyKey][field]) !== JSON.stringify(family[field])) changes.push([familyKey, field]);
    }
  }
  assert.deepEqual(changes.sort(), review.preserved_mobile_brand_corrections.map(c => [c.family_key, c.field]).sort());
  assert.equal(changes.length, 18);
  for (const family of Object.values(current.families)) {
    for (const value of Object.values(family)) if (typeof value === 'string') assert.doesNotMatch(value, /\bGrookai\b/);
  }
});

test('V2 output is deterministic and repeatable', () => {
  assert.deepEqual(applyMainProductOrigins(current, packet, review), current);
  assert.deepEqual(applyMainProductOrigins(projectOriginalV1(current, packet, review), packet, review), current);
});

test('brand correction cannot carry a factual copy change or unreviewed drift', () => {
  const altered = structuredClone(review);
  altered.preserved_mobile_brand_corrections[0].after += ' Altered distribution claim.';
  assert.throws(() => applyMainProductOrigins(current, packet, altered), /brand_only_correction_required/);
  const drift = structuredClone(current);
  drift.families[review.preserved_mobile_brand_corrections[0].family_key].grookai_rule = 'Unexpected text';
  assert.throws(() => applyMainProductOrigins(drift, packet, review), /current_main_brand_drift/);
});

test('a modified source packet or write proposal is rejected', () => {
  const changedPacket = structuredClone(packet);
  changedPacket.targets[0].public_copy.why_it_exists += ' Added claim.';
  assert.throws(() => applyMainProductOrigins(current, changedPacket, review), /original_packet_changed/);
  const writes = structuredClone(review);
  writes.boundaries.pricing_changes = 1;
  assert.throws(() => applyMainProductOrigins(current, packet, writes));
});
