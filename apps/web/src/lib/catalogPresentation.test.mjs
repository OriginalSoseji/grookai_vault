import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { getCatalogSetPresentation, getCollectorCardReference } from './catalogPresentation.ts';
import { getCardPrintDisplayDiscriminator, getCardPrintingFinishLabel } from './cards/displayDiscriminator.ts';
import { normalizeCollectorPrintedSetAbbrev, resolveCollectorPrintedCoordinates } from './catalogDisplayReference.ts';

test('card detail uses stored printed code and denominator ahead of opaque set metadata', () => {
  assert.deepEqual(resolveCollectorPrintedCoordinates({ cardCode: 'M4', cardTotal: 83,
    setCode: 'PRODUCT-3090050C1BDFC5CE', setTotal: null }), { printedSetAbbrev: 'M4', printedTotal: 83 });
  const source = fs.readFileSync(new URL('./getPublicCardByGvId.ts', import.meta.url), 'utf8');
  assert.match(source, /set_code,\s*set_id,\s*printed_set_abbrev,\s*printed_total,/);
  assert.match(source, /cardCode: row\.printed_set_abbrev, cardTotal: row\.printed_total/);
  assert.match(source, /id: row\.set_id, code: row\.set_code/);
});
test('unknown product keys cannot masquerade as printed set abbreviations', () => {
  for (const value of ['PRODUCT-3090050C1BDFC5CE', 'jpn-product-3090050c1bdfc5ce', 'Japanese release', 'JPN', null])
    assert.equal(normalizeCollectorPrintedSetAbbrev(value), undefined);
  assert.deepEqual(resolveCollectorPrintedCoordinates({ cardCode: null, evidenceCode: 'M6', setCode: 'PRODUCT-93E429BD4FFD351D' }),
    { printedSetAbbrev: 'M6', printedTotal: undefined });
  assert.deepEqual(resolveCollectorPrintedCoordinates({ setCode: 'MEW', setTotal: 165 }), { printedSetAbbrev: 'MEW', printedTotal: 165 });
});

const code = 'jpn-product-3090050c1bdfc5ce';
test('Ninja Spinner uses separate English and printed Japanese names', () => {
  const result = getCatalogSetPresentation({ code, game: 'pokemon', name: 'original' });
  assert.equal(result.name, 'Ninja Spinner');
  assert.match(result.name_ja, /ニンジャスピナー/u);
  assert.equal(result.display_code, 'M4');
});
test('a Japanese reference is readable without rewriting its GV ID', () => {
  const input = { gvId: 'GV-PK-JPN-PRODUCT-3090050C1BDFC5CE-103', setCode: code, number: '103' };
  assert.equal(getCollectorCardReference(input), 'M4 | #103 | Japanese');
  assert.equal(input.gvId, 'GV-PK-JPN-PRODUCT-3090050C1BDFC5CE-103');
});
test('English GV IDs remain unchanged', () => {
  assert.equal(getCollectorCardReference({ gvId: 'GV-PK-MEW-200', setCode: 'sv03.5', number: '200' }), 'GV-PK-MEW-200');
});
test('wrong game and mismatched set UUID cannot inherit presentation evidence', () => {
  for (const extra of [{ game: 'mtg' }, { id: 'wrong-set', game: 'pokemon' }]) {
    const result = getCatalogSetPresentation({ code, name: 'original', ...extra });
    assert.equal(result.name, 'original');
    assert.equal(result.representative_cover_url, undefined);
  }
});
test('unknown product codes remain qualified, not invented official abbreviations', () => {
  const result = getCatalogSetPresentation({ code: 'jpn-product-1111111111111111', name: 'Unknown release' });
  assert.equal(result.display_code, 'Japanese release');
  assert.equal(result.name_ja, undefined);
});
test('cover evidence is exact-set bound and uses the governed image route', () => {
  const manifest = JSON.parse(fs.readFileSync(new URL('./catalogPresentation.generated.json', import.meta.url)));
  const covers = Object.entries(manifest.entries).filter(([, e]) => e.cover_card_gv_id);
  assert.ok(covers.length > 0);
  for (const [code, entry] of covers) {
    assert.equal(entry.cover_role, 'representative_card');
    assert.ok(entry.cover_image_path && entry.cover_card_print_id);
    const input = { id: entry.set_id, code, game: entry.game, name: code };
    assert.match(getCatalogSetPresentation(input).representative_cover_url, /^\/api\/canon\/cards\/[^/]+\/image$/);
    assert.equal(getCatalogSetPresentation({ ...input, id: 'different' }).representative_cover_url, undefined);
    assert.equal(getCatalogSetPresentation({ ...input, id: undefined }).representative_cover_url, undefined);
  }
});
test('missing finish evidence never asserts Standard Print', () => {
  assert.equal(getCardPrintDisplayDiscriminator({ hasDuplicateCaption: true }).label, 'Finish not confirmed');
  const source = fs.readFileSync(new URL('./getPublicCardByGvId.ts', import.meta.url), 'utf8');
  assert.match(source.split('function buildFallbackDisplayPrinting')[1], /finish_name: "Finish not confirmed"/);
});
test('verified Normal and Reverse Holo stay independent finish choices', () => {
  assert.equal(getCardPrintingFinishLabel({ finishKey: 'normal' }), 'Normal');
  assert.equal(getCardPrintingFinishLabel({ finishKey: 'reverse' }), 'Reverse Holo');
  assert.equal(getCardPrintDisplayDiscriminator({ hasDuplicateCaption: true, finishKey: 'reverse' }).label, 'Reverse Holo');
});
test('translation cannot deduplicate distinct Japanese sets', () => {
  const source = fs.readFileSync(new URL('./publicSets.ts', import.meta.url), 'utf8');
  assert.match(source, /candidate\.code\.startsWith\("jpn-"\)[\s\S]*?candidate\.code/);
});
test('every package cover is a hash-verified local asset with source provenance', () => {
  const manifest = JSON.parse(fs.readFileSync(new URL('./catalogPresentation.generated.json', import.meta.url)));
  const packages = Object.entries(manifest.entries).filter(([, e]) => e.package_cover_url);
  assert.equal(packages.length, 119);
  for (const [code, e] of packages) {
    assert.match(e.package_image_source_url, /^https:\/\/www\.pokemon-card\.com\/products\//);
    const file = new URL(`../../public${e.package_cover_url}`, import.meta.url);
    assert.equal(createHash('sha256').update(fs.readFileSync(file)).digest('hex'), e.package_image_sha256);
    assert.equal(getCatalogSetPresentation({ code, id: e.set_id, name: code, game: e.game }).package_cover_url, e.package_cover_url);
    assert.equal(getCatalogSetPresentation({ code, id: 'wrong-set', name: code, game: e.game }).package_cover_url, undefined);
  }
});
test('the large evidence manifest stays server-side and the gallery is staging-only', () => {
  const grid = fs.readFileSync(new URL('../components/PublicSetCardGrid.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(grid, /catalogPresentation|\.generated\.json/);
  const gallery = fs.readFileSync(new URL('../app/catalog-review/page.tsx', import.meta.url), 'utf8');
  assert.match(gallery, /if \(!collectorStaging\) notFound\(\)/);
});
