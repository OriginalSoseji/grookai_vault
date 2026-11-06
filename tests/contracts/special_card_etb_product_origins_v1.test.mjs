import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import test from 'node:test';
import vm from 'node:vm';
import {applyProductOrigins, fingerprint, TARGETS} from '../../scripts/audits/export_special_card_etb_origins_v1.mjs';
import {projectOriginalV1} from '../../scripts/audits/export_special_card_etb_origins_v2.mjs';

const root = new URL('../../', import.meta.url);
const read = file => fs.readFileSync(new URL(file, root), 'utf8');
const packet = JSON.parse(read('docs/audits/special_card_product_origins_v1_20261105/product_origins.json'));
const actualGenerated = JSON.parse(read('apps/web/src/lib/cards/variantOriginPublicCopy.generated.json'));
const review = JSON.parse(read('docs/audits/special_card_product_origins_main_v2_20261105/integration_review.json'));
const generated = projectOriginalV1(actualGenerated, packet, review);
const clone = value => structuredClone(value);

function baseline() {
  const data = clone(generated);
  for (const row of packet.targets) {
    delete data.families[row.origin_family_key];
    data.by_gv_id[row.gv_id] = clone(row.prior_reference);
    data.by_card_print_id[row.card_print_id] = clone(row.prior_reference);
  }
  data.source_version = data.source_version.replace('+' + packet.version, '');
  return data;
}

test('only the four exact row references and four private families change', () => {
  const original = baseline();
  assert.equal(fingerprint({families:original.families, by_gv_id:original.by_gv_id, by_card_print_id:original.by_card_print_id}), packet.baseline_payload_sha256);
  const output = applyProductOrigins(original, packet);
  assert.deepEqual(output, generated);
  for (const [key, value] of Object.entries(original.families)) assert.deepEqual(output.families[key], value);
  for (const [gv, ref] of Object.entries(original.by_gv_id)) if (!TARGETS[gv]) assert.deepEqual(output.by_gv_id[gv], ref);
  assert.equal(Object.keys(output.by_gv_id).length, Object.keys(original.by_gv_id).length);
  assert.equal(Object.keys(output.by_card_print_id).length, Object.keys(original.by_card_print_id).length);
  assert.equal(output.summary.public_copy_safe_families, Object.keys(output.families).length);
});

test('export is byte-stable on repetition', () => {
  assert.equal(JSON.stringify(applyProductOrigins(generated, packet)), JSON.stringify(generated));
});

test('UUID drift, wrong index ownership and cohort expansion reject', () => {
  const wrongPacket = clone(packet);
  wrongPacket.targets[0].card_print_id = '11111111-1111-4111-8111-111111111111';
  assert.throws(() => applyProductOrigins(baseline(), wrongPacket), /canonical_uuid_mismatch/);
  const wrongIndex = baseline();
  wrongIndex.by_card_print_id[packet.targets[0].card_print_id].gv_id = packet.targets[1].gv_id;
  assert.throws(() => applyProductOrigins(wrongIndex, packet), /uuid_reference_drift/);
  const expanded = clone(packet);
  expanded.targets.push(clone(expanded.targets[0]));
  assert.throws(() => applyProductOrigins(baseline(), expanded), /exact_four_card_cohort_required/);
});

test('unreviewed family drift and family-key collisions reject', () => {
  const changed = baseline();
  changed.families.sv_black_star_promos.why_it_exists = 'Changed outside this review';
  assert.throws(() => applyProductOrigins(changed, packet), /unreviewed_baseline_copy_drift/);
  const collision = baseline();
  collision.families[packet.targets[0].origin_family_key] = {};
  assert.throws(() => applyProductOrigins(collision, packet), /family_key_collision/);
});

test('weak sources, logo mismatch and database-write proposals reject', () => {
  const weak = clone(packet);
  weak.source_documents[0].url = 'https://example.com/unreviewed';
  assert.throws(() => applyProductOrigins(baseline(), weak), /official_product_source_required/);
  const wrongLogo = clone(packet);
  wrongLogo.targets[0].image_review.pokemon_center_logo = 'present';
  assert.throws(() => applyProductOrigins(baseline(), wrongLogo));
  const writes = clone(packet);
  writes.boundaries.image_changes = 1;
  assert.throws(() => applyProductOrigins(baseline(), writes), /content_only_boundaries/);
});

test('web resolver and card explanation expose the exact product copy by UUID and GV-ID', () => {
  const requireWeb = createRequire(new URL('apps/web/package.json', root));
  const ts = requireWeb('typescript');
  function load(file, modules = {}) {
    const exports = {};
    const js = ts.transpileModule(read(file), {compilerOptions:{module:ts.ModuleKind.CommonJS, esModuleInterop:true}}).outputText;
    vm.runInNewContext(js, {exports, require:name => {
      if (name === 'server-only') return {};
      assert.ok(Object.hasOwn(modules, name), 'unexpected runtime import:' + name);
      return modules[name];
    }});
    return exports;
  }
  const resolver = load('apps/web/src/lib/cards/variantOriginPublicCopy.ts', {'./variantOriginPublicCopy.generated.json':actualGenerated});
  const builder = load('apps/web/src/lib/ai/grookaiVariantExplanationBuilder.ts');
  for (const row of packet.targets) {
    const byId = resolver.getVariantOriginPublicCopy({cardPrintId:row.card_print_id});
    const byGv = resolver.getVariantOriginPublicCopy({gvId:row.gv_id.toLowerCase()});
    assert.equal(byId.why_it_exists, row.public_copy.why_it_exists);
    assert.equal(byGv.why_it_exists, byId.why_it_exists);
    const view = builder.buildGrookaiVariantExplanationFromPublicCopy({card:{name:row.name}, variantOrigin:byId});
    assert.equal(view.status, 'ready');
    assert.equal(view.why_it_exists, row.public_copy.why_it_exists);
    assert.match(view.why_it_exists, row.name === 'Eevee' ? /Prismatic Evolutions/ : /151/);
    assert.ok(view.source_urls.length > 0);
    assert.match(view.how_to_identify, row.variant_key ? /the Pokémon Center logo/ : /absence of the Pokémon Center logo/);
  }
  assert.equal(resolver.getVariantOriginPublicCopy({gvId:'GV-PK-PR-10'}).origin_family_key, 'wizards_black_star_promos');
  assert.equal(resolver.getVariantOriginPublicCopy({gvId:'GV-PK-BASE1-58'}), null);
});

test('generated mobile payload exactly matches web for every family and row', () => {
  const dart = read('lib/services/identity/variant_origin_public_copy_generated.dart');
  const chunks = dart.split(/\r?\n/).filter(line => /^  ".*",$/.test(line))
    .map(line => JSON.parse(line.trim().slice(0, -1).replace(/\\\$/g, '$')));
  const mobile = JSON.parse(chunks.join(''));
  assert.deepEqual(mobile, {families:actualGenerated.families, by_gv_id:actualGenerated.by_gv_id, by_card_print_id:actualGenerated.by_card_print_id});
});
