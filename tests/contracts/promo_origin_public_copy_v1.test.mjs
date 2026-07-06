import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const generatedCopy = JSON.parse(
  readFileSync(new URL('../../apps/web/src/lib/cards/variantOriginPublicCopy.generated.json', import.meta.url), 'utf8'),
);
const exportSummary = JSON.parse(
  readFileSync(
    new URL(
      '../../docs/audits/master_index_promo_origin_v1/master_index_promo_origin_03b_family_public_copy_export_summary_v1.json',
      import.meta.url,
    ),
    'utf8',
  ),
);
const exactExportSummary = JSON.parse(
  readFileSync(
    new URL(
      '../../docs/audits/master_index_promo_origin_v1/master_index_promo_origin_03c_exact_public_copy_export_summary_v1.json',
      import.meta.url,
    ),
    'utf8',
  ),
);

const PROMO_FAMILY_KEYS = [
  'best_of_game',
  'bw_black_star_promos',
  'dp_black_star_promos',
  'hgss_black_star_promos',
  'mega_evolution_promos',
  'nintendo_black_star_promos',
  'pop_series',
  'sm_black_star_promos',
  'sv_black_star_promos',
  'swsh_black_star_promos',
  'wizards_black_star_promos',
  'xy_black_star_promos',
];

test('promo origin family public copy adds only governed family-level rows', () => {
  assert.equal(exportSummary.metrics.added_public_copy_rows, 1523);
  assert.equal(exportSummary.metrics.added_public_copy_families, 12);
  assert.equal(exportSummary.metrics.skipped_manual_review_rows, 3);
  assert.equal(exportSummary.metrics.skipped_exact_product_origin_rows, 1);
  assert.equal(generatedCopy.summary.promo_family_public_copy_rows_added, 1523);

  const meowth = generatedCopy.by_gv_id['GV-PK-PR-10'];
  assert.equal(meowth.origin_family_key, 'wizards_black_star_promos');
  assert.equal(generatedCopy.families.wizards_black_star_promos.family_label, 'Wizards Black Star Promo');
  assert.match(generatedCopy.families.wizards_black_star_promos.grookai_rule, /does not assert exact distribution origin/i);
});

test('promo origin family copy does not expose weak source URLs as exact provenance', () => {
  for (const familyKey of PROMO_FAMILY_KEYS) {
    const family = generatedCopy.families[familyKey];
    assert.ok(family, `${familyKey} family exists`);
    assert.equal(family.variant_category.includes('promo'), true, `${familyKey} is promo-scoped`);
    assert.deepEqual(family.source_urls, [], `${familyKey} does not expose broad source URLs`);
    assert.match(family.grookai_rule, /exact|card-level|family-level/i, `${familyKey} rule states family-level limitation`);
  }
});

test('promo origin exact public copy resolves the four source-backed excluded rows', () => {
  assert.equal(exactExportSummary.metrics.exact_public_copy_rows_added, 4);
  assert.equal(exactExportSummary.metrics.exact_public_copy_families_added, 3);
  assert.equal(generatedCopy.summary.promo_exact_public_copy_rows_added, 4);

  const ancientMew = generatedCopy.by_gv_id['GV-PK-MISC-001'];
  assert.equal(ancientMew.origin_family_key, 'ancient_mew_power_of_one_movie_promo');
  assert.equal(generatedCopy.families.ancient_mew_power_of_one_movie_promo.family_label, 'Ancient Mew The Power of One Promo');
  assert.match(generatedCopy.families.ancient_mew_power_of_one_movie_promo.why_it_exists, /The Power of One/i);
  assert.ok(generatedCopy.families.ancient_mew_power_of_one_movie_promo.source_urls.length >= 1);

  const reshiram = generatedCopy.by_gv_id['GV-PK-PR-BLW-BW04'];
  const zekrom = generatedCopy.by_gv_id['GV-PK-PR-BLW-BW05'];
  assert.equal(reshiram.origin_family_key, 'new_legends_tins_bw_promo');
  assert.equal(zekrom.origin_family_key, 'new_legends_tins_bw_promo');
  assert.match(generatedCopy.families.new_legends_tins_bw_promo.why_it_exists, /Reshiram BW04 and Zekrom BW05/i);
  assert.equal(generatedCopy.families.new_legends_tins_bw_promo.source_urls.length, 2);

  const greninja = generatedCopy.by_gv_id['GV-PK-PR-SW-SWSH144'];
  assert.equal(greninja.origin_family_key, 'celebrations_elite_trainer_box_greninja_star_promo');
  assert.match(generatedCopy.families.celebrations_elite_trainer_box_greninja_star_promo.why_it_exists, /Elite Trainer Box/i);
  assert.ok(generatedCopy.families.celebrations_elite_trainer_box_greninja_star_promo.source_urls.length >= 1);
});
