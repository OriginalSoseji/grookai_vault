import test from 'node:test';
import assert from 'node:assert/strict';
import { parseOfficialJapaneseCardDetail, buildOfficialJapaneseCardAssertion } from '../../scripts/audits/japanese_master_index_v4/card_source_adapters/official_jp_v1.mjs';

const html = (label, author = '') => `<h1 class="Heading1">Energy</h1>
<img class="fit" src="/assets/images/card_images/large/SGG/card.jpg">
<div class="subtext Text-fjalla"><img class="img-regulation" alt="SGG">&nbsp;${label}&nbsp;</div>
<div class="author">${author}</div>
<li class="List_item"><a href="/products/s/sg.html">Deck Product</a></li>`;

test('Official Energy labels remain explicit unnumbered evidence, not invented ordinal numbers', () => {
  for(const label of ['DAR','WAT']) {
    const parsed = parseOfficialJapaneseCardDetail(html(label), '39558');
    assert.equal(parsed.card_number_raw, null);
    assert.equal(parsed.card_number_numerator, null);
    assert.equal(parsed.card_number_denominator, null);
    assert.equal(parsed.unnumbered_label, label);
    assert.equal(parsed.source_fields.printed_unnumbered_label_raw, label);
    assert.equal(parsed.illustrator, null);
  }
});

test('Empty or absent illustrator cannot consume a following product link', () => {
  assert.equal(parseOfficialJapaneseCardDetail(html('DAR'), '39558').illustrator, null);
  assert.equal(parseOfficialJapaneseCardDetail(html('DAR').replace('<div class="author"></div>', ''), '39558').illustrator, null);
  assert.equal(parseOfficialJapaneseCardDetail(html('001/019', '<a href="/artist">Artist Name</a>'), '39558').illustrator, 'Artist Name');
});

test('Numeric fractions and promo series are not Energy labels', () => {
  for(const value of ['001/019','001/SV-P','unknown label','', '123']) {
    assert.equal(parseOfficialJapaneseCardDetail(html(value), '39558').unnumbered_label, null);
  }
  assert.equal(parseOfficialJapaneseCardDetail(html('001/019'), '39558').card_number_denominator, 19);
});

test('Official assertion carries label and source bytes without promoting a finish', () => {
  const detail = parseOfficialJapaneseCardDetail(html('DAR'), '39558');
  const result = buildOfficialJapaneseCardAssertion({detail, cardBrief:{card_id:'39558'},
    product:{product_id:'734',product_name:'Deck Product'}, workItem:{registry_key:'jpn-sgg'},
    snapshotMetadata:{fetched_at:'2026-09-19T00:00:00Z',body_sha256:'a'.repeat(64)},
    rawSnapshotRef:'raw/39558.html',detailStatus:'captured'});
  assert.equal(result.unnumbered_label, 'DAR');
  assert.equal(result.card_number_raw, null);
  assert.equal(result.illustrator, null);
  assert.deepEqual(result.finish_labels, []);
  assert.equal(result.source_product_name, 'Deck Product');
});
