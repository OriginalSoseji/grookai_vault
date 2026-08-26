import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  parseCardHarvestArgs,
  runArtOfPkmJaCardHarvest,
  runBulbapediaJaCardHarvest,
  runLimitlessJaCardHarvest,
  runOfficialJaCardHarvest,
  runPokeGuardianJaCardHarvest,
  runSerebiiJaCardHarvest,
  runTcgdexJaCardHarvest,
} from '../../scripts/audits/japanese_master_index_v4/card_acquisition_harvest_v1.mjs';
import {
  artOfPkmContainerHealth,
  buildArtOfPkmJapaneseCardAssertion,
  parseArtOfPkmJapaneseCardChecklist,
} from '../../scripts/audits/japanese_master_index_v4/card_source_adapters/artofpkm_jp_v1.mjs';
import {
  buildLimitlessJapaneseCardAssertion,
  limitlessContainerHealth,
  parseLimitlessJapaneseCardChecklist,
} from '../../scripts/audits/japanese_master_index_v4/card_source_adapters/limitless_jp_v1.mjs';
import {
  buildTcgdexJapaneseCardAssertion,
  parseTcgdexJapaneseCardPayload,
  parseTcgdexJapaneseSetPayload,
  tcgdexContainerHealth,
} from '../../scripts/audits/japanese_master_index_v4/card_source_adapters/tcgdex_ja_v1.mjs';
import {
  buildSerebiiJapaneseCardAssertion,
  parseSerebiiJapaneseCardChecklist,
  serebiiContainerHealth,
} from '../../scripts/audits/japanese_master_index_v4/card_source_adapters/serebii_jp_v1.mjs';
import {
  buildOfficialJapaneseCardAssertion,
  officialContainerHealth,
  parseOfficialJapaneseCardDetail,
  parseOfficialJapaneseCardSearchPage,
} from '../../scripts/audits/japanese_master_index_v4/card_source_adapters/official_jp_v1.mjs';
import {
  buildBulbapediaJapaneseCardAssertion,
  bulbapediaContainerHealth,
  parseBulbapediaJapaneseCardList,
} from '../../scripts/audits/japanese_master_index_v4/card_source_adapters/bulbapedia_jp_v1.mjs';
import {
  buildPokeGuardianJapaneseCardAssertion,
  parsePokeGuardianJapaneseMainSetList,
  pokeGuardianContainerHealth,
} from '../../scripts/audits/japanese_master_index_v4/card_source_adapters/pokeguardian_jp_v1.mjs';
import {
  buildArtifact,
  sha256,
  stableJson,
  writeJsonArtifact,
} from '../../scripts/audits/japanese_master_index_v4/deterministic_artifact_v1.mjs';

const FETCHED_AT = '2026-07-26T18:00:00.000Z';
const LIMITLESS_HTML = `
<!doctype html>
<html lang="en">
  <body>
    <div class="infobox">
      <div class="infobox-heading sm">
        <img class="set" alt="SV8" src="https://s3.limitlesstcg.com/sets/jp/SV8.png">
        Super Electric Breaker (SV8)
      </div>
      <div class="infobox-line">18th October 2024 • 2 Cards</div>
    </div>
    <section>
      <table class="data-table striped highlight card-list">
        <tr><th>Set</th><th>No.</th><th>Name</th><th>Type</th><th>Rarity</th><th>USD</th><th>EUR</th></tr>
        <tr data-hover="https://limitlesstcg.example/SV8_1_R_JP_XS.png">
          <td><span class="card-set" data-tooltip="超電ブレイカー"><img class="set" alt="SV8" src="https://s3.limitlesstcg.com/sets/jp/SV8.png">SV8</span></td>
          <td><a href="/cards/jp/SV8/1">1</a></td>
          <td><a href="/cards/jp/SV8/1">タマタマ</a></td>
          <td class="md-only"><a href="/cards/jp/SV8/1"><span class="ptcg-symbol">G</span> Basic</a></td>
          <td class="md-only"><a href="/cards/jp/SV8/1"> Common </a></td>
          <td>$1.00</td><td>€1.00</td>
        </tr>
        <tr data-hover="https://limitlesstcg.example/SV8_2_R_JP_XS.png">
          <td><span class="card-set" data-tooltip="超電ブレイカー"><img class="set" alt="SV8" src="https://s3.limitlesstcg.com/sets/jp/SV8.png">SV8</span></td>
          <td><a href="/cards/jp/SV8/2">2</a></td>
          <td><a href="/cards/jp/SV8/2">ナッシー</a></td>
          <td class="md-only"><a href="/cards/jp/SV8/2"><span class="ptcg-symbol">G</span> Stage 1</a></td>
          <td class="md-only"><a href="/cards/jp/SV8/2"> Uncommon </a></td>
          <td>$2.00</td><td>€2.00</td>
        </tr>
      </table>
    </section>
  </body>
</html>
`;
const LIMITLESS_GRID_HTML = `
<!doctype html>
<html lang="en">
  <body>
    <div class="infobox">
      <div class="infobox-heading sm">
        <img class="set" alt="M6" src="https://s3.limitlesstcg.com/sets/jp/M6.png">
        Storm Emeralda (M6)
      </div>
      <div class="infobox-line">31st July 2026 • 2 Cards</div>
    </div>
    <section>
      <div class="card-search-grid">
        <a href="/cards/jp/M6/1"><img class="card shadow" src="https://example.com/M6_1.png"></a>
        <a href="/cards/jp/M6/2"><img class="card shadow" src="https://example.com/M6_2.png"></a>
      </div>
    </section>
  </body>
</html>
`;
const BULBAPEDIA_MODERN_NUMBERED_HTML = `
<!doctype html>
<html><body><table><tbody>
  <tr><td>001/002</td><td><a href="/wiki/Standard_format_(TCG)">J</a></td><td><a href="/wiki/Heracross_(Example_Set_1)">Heracross</a></td></tr>
  <tr><td>002/002</td><td><a href="/wiki/Standard_format_(TCG)">J</a></td><td><a href="/wiki/Surskit_(Example_Set_2)">Surskit</a></td></tr>
  <tr><td>003/002</td><td><a href="/wiki/Standard_format_(TCG)">J</a></td><td><a href="/wiki/Masquerain_(Example_Set_3)">Masquerain</a></td></tr>
</tbody></table></body></html>
`;
const ARTOFPKM_HTML = `
<!doctype html>
<html>
  <head><title>Rocket Gang Japanese Pokemon Cards</title></head>
  <body>
    <h1 class="font-bold md:text-6xl">Rocket Gang</h1>
    <h3 class="ja text-gray-300">ロケット団</h3>
    <div class="flex gap-4 items-center"><div><img src="/set.png"></div><span>Nov. 21, 1997</span></div>
    <a href="/sets/10/cards"><div>Cards</div><div>2</div></a>
    <div id="cards-container">
      <a data-action="open" data-lightbox-title="Koffing, Rocket Gang"
         data-lightbox-url="/sets/10/card/1" aria-label="Open Koffing, Rocket Gang"
         href="/images/koffing-full.png">
        <img src="/images/koffing-thumb.png">
      </a>
      <a data-action="open" data-lightbox-title="Ponyta, Rocket Gang"
         data-lightbox-url="/sets/10/card/2" aria-label="Open Ponyta, Rocket Gang"
         href="/images/ponyta-full.png">
        <img src="/images/ponyta-thumb.png">
      </a>
    </div>
  </body>
</html>
`;
const SEREBII_HTML = `
<!doctype html>
<html>
  <head><title>Serebii.net Pokemon Card Database - Ancient Roar</title></head>
  <body>
    <div align="center"><h1>Ancient Roar</h1></div>
    <p><i>Japanese Release Date:</i> October 27th 2023<br />
    <i>Amount of Cards</i>: ?? (2 Normal, ?? Secret)</p>
    <table>
      <tr>
        <td class="cen"><a href="/card/ancientroar/">Ancient Roar</a><br />1 / 2 <img src="/card/image/common.png" /></a></td>
        <td class="cen"><a href="/card/ancientroar/001.shtml"><img src="/card/th/ancientroar/1.jpg" /></a></td>
        <td class="cen"><a href="/card/ancientroar/001.shtml"><font size="2">Pansage</font></a></td>
      </tr>
      <tr>
        <td class="cen"><a href="/card/ancientroar/">Ancient Roar</a><br />2 / 2 <img src="/card/image/lvxrare.png" /></a></td>
        <td class="cen"><a href="/card/ancientroar/002.shtml"><img src="/card/th/ancientroar/2.jpg" /></a></td>
        <td class="cen"><a href="/card/ancientroar/002.shtml"><font size="2">Armarouge</font> ex</a></td>
      </tr>
    </table>
  </body>
</html>
`;
const OFFICIAL_SEARCH_PAYLOAD = {
  result: 1,
  errMsg: '',
  thisPage: 1,
  maxPage: 1,
  hitCnt: 2,
  searchCondition: [
    'スペシャルジャンボカードセット オーガポン',
    'レギュレーション：すべてのカード',
  ],
  regulation: 'all',
  cardList: [
    {
      cardID: '46442',
      cardThumbFile:
        '/assets/images/card_images/large/SV-P/046442_P_OGAPONMIDORINOMENEX.jpg',
      cardNameAltText: 'オーガポン みどりのめんex',
      cardNameViewText: 'オーガポン みどりのめんex',
    },
    {
      cardID: '46443',
      cardThumbFile:
        '/assets/images/card_images/large/SV-P/046443_P_OGAPONISHIZUENOMENEX.jpg',
      cardNameAltText: 'オーガポン いしずえのめんex',
      cardNameViewText: 'オーガポン いしずえのめんex',
    },
  ],
};
const OFFICIAL_DETAIL_HTML = `
<!doctype html>
<html>
  <body>
    <h1 class="Heading1 mt20">オーガポン みどりのめんex</h1>
    <div class="LeftBox">
      <img class="fit" src="/assets/images/card_images/large/SV-P/046442_P_OGAPONMIDORINOMENEX.jpg" alt="オーガポン みどりのめんex" />
      <div class="subtext Text-fjalla">
        <img src="/assets/images/card/regulation_logo_1/SV-P.gif" class="img-regulation" alt="SV-P" />
        &nbsp;231&nbsp;/&nbsp;SV-P&nbsp;
        <img src="/assets/images/card/rarity/ic_rare_p.gif" />
      </div>
      <div class="author"><h4>イラストレーター</h4><a href="#">5ban Graphics</a></div>
    </div>
    <span class="type">たね</span>
    <span class="hp-num">210</span>
    <li class="List_item"><a href="/info/004391.html">スペシャルジャンボカードセット オーガポン</a></li>
  </body>
</html>
`;
const BULBAPEDIA_HTML = `
<!doctype html>
<html>
  <head><title>Example Collection (TCG) - Bulbapedia</title></head>
  <body>
    <table id="English">
      <tr><th>No.</th><th>Card</th></tr>
      <tr><td>001/002</td><td><a href="/wiki/English_One_(TCG)">English One</a></td></tr>
      <tr><td>002/002</td><td><a href="/wiki/English_Two_(TCG)">English Two</a></td></tr>
    </table>
    <table id="Japanese">
      <tr><th>No.</th><th>Card</th><th>Type</th><th>Rarity</th></tr>
      <tr><td>001/003</td><td><a href="/wiki/Japanese_One_(TCG)">Japanese One</a></td><td>Pokemon</td><td>C</td></tr>
      <tr><td>002/003</td><td><a href="/wiki/Japanese_Two_(TCG)">Japanese Two</a></td><td>Pokemon</td><td>U</td></tr>
      <tr><td>003/003</td><td><a href="/wiki/Japanese_Three_(TCG)">Japanese Three</a></td><td>Trainer</td><td>R</td></tr>
      <tr><td>004/003</td><td><a href="/wiki/Japanese_Secret_(TCG)">Japanese Secret</a></td><td>Pokemon</td><td>SR</td></tr>
    </table>
  </body>
</html>
`;
const POKEGUARDIAN_HTML = `
<!doctype html>
<html>
  <head><title>Example Expansion Main Set List - PokeGuardian</title></head>
  <body>
    <img class="not-an-album" src="https://www.pokeguardian.com/ignore.jpg">
    <img class="jw-album-image__image"
         src="https://www.pokeguardian.com/media/048341_p_example-one-standard.jpg"
         alt="048341_p_example-one-standard.jpg">
    <img class="jw-album-image__image"
         data-src="/media/048342_t_example-two-standard.jpg"
         alt="048342_t_example-two-standard.jpg">
  </body>
</html>
`;

const SET_PAYLOAD = {
  id: 'SV8',
  name: '超電ブレイカー',
  releaseDate: '2024-10-18',
  cardCount: { official: 2, total: 2 },
  cards: [
    {
      id: 'SV8-001',
      localId: '001',
      name: 'タマタマ',
      image: 'https://assets.tcgdex.net/ja/SV/SV8/001',
    },
    {
      id: 'SV8-002',
      localId: '002',
      name: 'ナッシー',
      image: 'https://assets.tcgdex.net/ja/SV/SV8/002',
    },
  ],
};

function cardPayload(brief, rarity) {
  return {
    ...brief,
    category: 'Pokemon',
    illustrator: 'OKUBO',
    rarity,
    set: {
      id: SET_PAYLOAD.id,
      name: SET_PAYLOAD.name,
      cardCount: SET_PAYLOAD.cardCount,
    },
    variants: {
      firstEdition: false,
      holo: false,
      normal: true,
      reverse: false,
      wPromo: false,
    },
    variants_detailed: [
      { type: 'normal', size: 'standard', variantId: 'generated' },
    ],
    hp: 60,
    dexId: [102],
    regulationMark: 'H',
  };
}

async function writeSnapshot(directory, sourceId, payload) {
  await fs.mkdir(directory, { recursive: true });
  const body = Buffer.from(stableJson(payload));
  const bodyPath = path.join(directory, `${sourceId}_v1.json`);
  const metadataPath = path.join(directory, `${sourceId}_v1.http.json`);
  await fs.writeFile(bodyPath, body);
  await fs.writeFile(
    metadataPath,
    stableJson({
      source_id: sourceId,
      fetched_at: FETCHED_AT,
      byte_size: body.length,
      body_sha256: sha256(body),
      http_status: 200,
      request_url: `https://api.tcgdex.net/v2/ja/${sourceId}`,
    }),
  );
}

async function writeHtmlSnapshot(
  directory,
  sourceId,
  html,
  requestUrl = 'https://limitlesstcg.com/cards/jp/SV8?display=list&show=all',
) {
  await fs.mkdir(directory, { recursive: true });
  const body = Buffer.from(html);
  await fs.writeFile(path.join(directory, `${sourceId}_v1.html`), body);
  await fs.writeFile(
    path.join(directory, `${sourceId}_v1.http.json`),
    stableJson({
      source_id: sourceId,
      fetched_at: FETCHED_AT,
      byte_size: body.length,
      body_sha256: sha256(body),
      http_status: 200,
      request_url: requestUrl,
    }),
  );
}

test('TCGdex adapter preserves Japanese identity and source-owned card fields', () => {
  const setPayload = parseTcgdexJapaneseSetPayload(
    stableJson(SET_PAYLOAD),
    'SV8',
  );
  const card = parseTcgdexJapaneseCardPayload(
    stableJson(cardPayload(SET_PAYLOAD.cards[0], 'Common')),
    'SV8-001',
  );
  const assertion = buildTcgdexJapaneseCardAssertion({
    card,
    cardBrief: SET_PAYLOAD.cards[0],
    setPayload,
    workItem: {
      registry_key: 'jpn-sv8',
      source_expected_card_count: 2,
    },
    snapshotMetadata: {
      fetched_at: FETCHED_AT,
      body_sha256: 'a'.repeat(64),
    },
    rawSnapshotRef: 'cards/raw/tcgdex_ja/SV8/cards/SV8-001_v1.json',
    detailStatus: 'captured',
  });
  assert.equal(assertion.printed_name, 'タマタマ');
  assert.equal(assertion.card_number_raw, '001');
  assert.equal(assertion.card_number_numerator, 1);
  assert.equal(assertion.card_number_denominator, 2);
  assert.equal(assertion.source_set_code, 'SV8');
  assert.equal(assertion.rarity, 'Common');
  assert.deepEqual(assertion.finish_labels, ['normal']);
  assert.equal(assertion.source_fields.detail_status, 'captured');
  assert.equal(Object.hasOwn(assertion.source_fields, 'pricing'), false);
});

test('TCGdex adapter classifies set metadata with absent card rows as a source gap', () => {
  const health = tcgdexContainerHealth({
    setPayload: {
      id: 'CP4',
      cardCount: { official: 131, total: 131 },
      cards: [],
    },
    workItem: {
      registry_key: 'jpn-cp4',
      source_expected_card_count: 131,
    },
    selectedCardCount: 0,
    detailSuccessCount: 0,
    detailFailureCount: 0,
    operatorCardLimit: null,
  });
  assert.equal(health.status, 'source_card_rows_absent');
  assert.deepEqual(health.findings, [
    'set_metadata_has_count_but_cards_array_is_empty',
  ]);
});

test('Limitless adapter parses one bounded set checklist and ignores displayed prices', () => {
  const checklist = parseLimitlessJapaneseCardChecklist(
    LIMITLESS_HTML,
    'SV8',
  );
  assert.equal(checklist.set.name, 'Super Electric Breaker');
  assert.equal(checklist.set.native_japanese_name, '超電ブレイカー');
  assert.equal(checklist.set.card_count, 2);
  assert.equal(checklist.cards.length, 2);
  assert.equal(checklist.cards[0].printed_name, 'タマタマ');
  assert.equal(checklist.cards[0].card_number_raw, '1');
  assert.equal(checklist.cards[0].rarity, 'Common');
  assert.equal(checklist.cards[0].type_line, 'G Basic');

  const assertion = buildLimitlessJapaneseCardAssertion({
    card: checklist.cards[0],
    checklist,
    workItem: {
      registry_key: 'jpn-sv8',
      source_expected_card_count: 2,
      source_native_name: 'Super Electric Breaker',
    },
    snapshotMetadata: {
      fetched_at: FETCHED_AT,
      body_sha256: 'b'.repeat(64),
    },
    rawSnapshotRef:
      'cards/raw/limitless_jp_cards/SV8/set_checklist_v1.html',
  });
  assert.equal(assertion.printed_name, 'タマタマ');
  assert.equal(assertion.card_number_numerator, 1);
  assert.equal(assertion.card_number_denominator, 2);
  assert.deepEqual(assertion.finish_labels, []);
  assert.equal(assertion.source_fields.displayed_price_fields_ignored, true);
  assert.equal(Object.hasOwn(assertion.source_fields, 'usd'), false);
  assert.equal(Object.hasOwn(assertion.source_fields, 'eur'), false);
});

test('Limitless adapter preserves image-backed coordinates from the current grid layout', () => {
  const checklist = parseLimitlessJapaneseCardChecklist(
    LIMITLESS_GRID_HTML,
    'M6',
  );
  assert.equal(checklist.set.name, 'Storm Emeralda');
  assert.equal(checklist.set.card_count, 2);
  assert.equal(checklist.cards.length, 2);
  assert.equal(checklist.cards[0].source_external_id, 'M6:1');
  assert.equal(checklist.cards[0].printed_name, null);
  assert.equal(checklist.cards[0].source_fields.checklist_layout, 'card_search_grid');
  assert.equal(
    checklist.cards[0].source_fields.printed_identity_not_present_in_grid,
    true,
  );
});

test('Limitless health reports page count mismatches without inventing coverage', () => {
  const health = limitlessContainerHealth({
    checklist: {
      set: { id: 'SV8', card_count: 137 },
      cards: [{}, {}],
    },
    workItem: {
      registry_key: 'jpn-sv8',
      source_expected_card_count: 137,
    },
    selectedCardCount: 2,
    operatorCardLimit: null,
  });
  assert.equal(health.status, 'source_count_mismatch');
  assert.deepEqual(health.findings, [
    'checklist_rows_do_not_match_page_card_count',
  ]);
});

test('Limitless collapses exact duplicate rows but preserves distinct same-number variants', () => {
  const exactDuplicateRow = LIMITLESS_HTML.match(
    /<tr data-hover="https:\/\/limitlesstcg\.example\/SV8_1_R_JP_XS\.png">[\s\S]*?<\/tr>/,
  )[0];
  const exactDuplicateChecklist = parseLimitlessJapaneseCardChecklist(
    LIMITLESS_HTML.replace('</table>', `${exactDuplicateRow}</table>`),
    'SV8',
  );
  assert.equal(exactDuplicateChecklist.cards.length, 2);
  assert.equal(
    exactDuplicateChecklist.cards[0].source_external_id,
    'SV8:1',
  );
  assert.equal(
    exactDuplicateChecklist.cards[0].source_fields
      .exact_duplicate_source_rows_collapsed,
    1,
  );

  const distinctVariantRow = exactDuplicateRow
    .replaceAll('SV8_1_R_JP_XS.png', 'SV8_1_ALT_JP_XS.png')
    .replaceAll(' Common ', ' Alternate Art ');
  const distinctVariantChecklist = parseLimitlessJapaneseCardChecklist(
    LIMITLESS_HTML.replace('</table>', `${distinctVariantRow}</table>`),
    'SV8',
  );
  const sameNumberCards = distinctVariantChecklist.cards.filter(
    (card) => card.card_number_raw === '1',
  );
  assert.equal(sameNumberCards.length, 2);
  assert.equal(
    new Set(sameNumberCards.map((card) => card.source_external_id)).size,
    2,
  );
  assert.ok(
    sameNumberCards.every((card) =>
      card.source_external_id.startsWith('SV8:1:'),
    ),
  );
});

test('Art of Pokemon adapter preserves factual coordinates without inventing printed identity', () => {
  const checklist = parseArtOfPkmJapaneseCardChecklist(ARTOFPKM_HTML, '10');
  assert.equal(checklist.set.name, 'Rocket Gang');
  assert.equal(checklist.set.native_japanese_name, 'ロケット団');
  assert.equal(checklist.set.release_date, 'Nov. 21, 1997');
  assert.equal(checklist.set.card_count, 2);
  assert.equal(checklist.cards.length, 2);
  assert.equal(checklist.cards[0].english_display_name, 'Koffing');
  assert.equal(
    checklist.cards[0].source_url,
    'https://www.artofpkm.com/sets/10/card/1',
  );
  assert.deepEqual(checklist.cards[0].image_urls, [
    'https://www.artofpkm.com/images/koffing-full.png',
    'https://www.artofpkm.com/images/koffing-thumb.png',
  ]);

  const assertion = buildArtOfPkmJapaneseCardAssertion({
    card: checklist.cards[0],
    checklist,
    workItem: {
      registry_key: 'jpn-rocket-gang',
      source_native_name: 'Rocket Gang',
    },
    snapshotMetadata: {
      fetched_at: FETCHED_AT,
      body_sha256: 'c'.repeat(64),
    },
    rawSnapshotRef:
      'cards/raw/artofpkm_jp_cards/10/set_checklist_v1.html',
  });
  assert.equal(assertion.english_display_name, 'Koffing');
  assert.equal(assertion.printed_name, null);
  assert.equal(assertion.card_number_raw, null);
  assert.equal(assertion.source_fields.image_references_only, true);
  assert.equal(
    assertion.source_fields.printed_japanese_name_available_on_checklist,
    false,
  );
});

test('Art of Pokemon preserves distinct cards that share a source slot', () => {
  const duplicateSlotHtml = ARTOFPKM_HTML.replace(
    '</div>\n  </body>',
    `<a data-action="open" data-lightbox-title="Dark Rapidash, Rocket Gang"
        data-lightbox-url="/sets/10/card/1" aria-label="Open Dark Rapidash, Rocket Gang"
        href="/images/dark-rapidash-full.png">
       <img src="/images/dark-rapidash-thumb.png">
     </a>
    </div>
  </body>`,
  );
  const checklist = parseArtOfPkmJapaneseCardChecklist(
    duplicateSlotHtml,
    '10',
  );
  const sameSlotCards = checklist.cards.filter(
    (card) => card.source_fields.card_sequence_ordinal === 1,
  );
  assert.equal(checklist.cards.length, 3);
  assert.equal(sameSlotCards.length, 2);
  assert.equal(
    new Set(sameSlotCards.map((card) => card.source_external_id)).size,
    2,
  );
  assert.ok(
    sameSlotCards.every((card) =>
      card.source_external_id.startsWith('10:1:'),
    ),
  );
});

test('Art of Pokemon health preserves declared source count mismatches', () => {
  const health = artOfPkmContainerHealth({
    checklist: {
      set: { id: '10', card_count: 65 },
      cards: [{}, {}],
    },
    workItem: {
      registry_key: 'jpn-rocket-gang',
      source_expected_card_count: null,
    },
    selectedCardCount: 2,
    operatorCardLimit: null,
  });
  assert.equal(health.status, 'source_count_mismatch');
  assert.deepEqual(health.findings, [
    'checklist_rows_do_not_match_page_card_count',
  ]);
});

test('Serebii adapter preserves numbered coordinates without treating English labels as printed names', () => {
  const checklist = parseSerebiiJapaneseCardChecklist(
    SEREBII_HTML,
    'ancientroar',
  );
  assert.equal(checklist.set.name, 'Ancient Roar');
  assert.equal(checklist.set.release_date, 'October 27th 2023');
  assert.equal(checklist.cards.length, 2);
  assert.equal(checklist.cards[0].card_number_raw, '1');
  assert.equal(checklist.cards[1].english_display_name, 'Armarouge ex');
  assert.equal(checklist.cards[1].rarity, 'Lvxrare');

  const assertion = buildSerebiiJapaneseCardAssertion({
    card: checklist.cards[0],
    checklist,
    workItem: {
      registry_key: 'jpn-sv4k',
      source_expected_card_count: 2,
      source_native_name: 'Ancient Roar',
    },
    snapshotMetadata: {
      fetched_at: FETCHED_AT,
      body_sha256: 'd'.repeat(64),
    },
    rawSnapshotRef:
      'cards/raw/serebii_jp_cards/ancientroar/set_checklist_v1.html',
  });
  assert.equal(assertion.printed_name, null);
  assert.equal(assertion.english_display_name, 'Pansage');
  assert.equal(assertion.card_number_numerator, 1);
  assert.equal(assertion.card_number_denominator, 2);
  assert.equal(
    assertion.source_fields.japanese_printed_name_available_on_checklist,
    false,
  );
});

test('Serebii health reports missing checklist rows without inventing coverage', () => {
  const health = serebiiContainerHealth({
    checklist: {
      set: { id: 'ancientroar', declared_normal_card_count: 66 },
      cards: [{ card_number_denominator: 66 }],
    },
    workItem: {
      registry_key: 'jpn-sv4k',
      source_expected_card_count: 66,
    },
    selectedCardCount: 1,
    operatorCardLimit: null,
  });
  assert.equal(health.status, 'source_count_mismatch');
  assert.deepEqual(health.findings, [
    'checklist_rows_below_registry_expected_count',
  ]);
});

test('Official JP adapter joins published search results to printed card details', () => {
  const page = parseOfficialJapaneseCardSearchPage(
    stableJson(OFFICIAL_SEARCH_PAYLOAD),
    '10917',
    1,
  );
  assert.equal(page.hit_count, 2);
  assert.equal(page.cards[0].printed_name, 'オーガポン みどりのめんex');
  const detail = parseOfficialJapaneseCardDetail(
    OFFICIAL_DETAIL_HTML,
    '46442',
  );
  assert.equal(detail.card_number_raw, '231');
  assert.equal(detail.card_number_numerator, 231);
  assert.equal(detail.card_number_denominator, null);
  assert.equal(detail.source_set_code, 'SV-P');
  assert.equal(detail.rarity, 'p');
  assert.equal(detail.illustrator, '5ban Graphics');
  assert.equal(detail.hp, 210);
  assert.equal(detail.source_fields.printed_denominator_raw, 'SV-P');

  const assertion = buildOfficialJapaneseCardAssertion({
    cardBrief: page.cards[0],
    detail,
    product: { ...page, cards: page.cards },
    workItem: {
      registry_key: 'jpn-product-ogerpon-jumbo',
      source_release_date: '2024年 5月17日（金）',
    },
    snapshotMetadata: {
      fetched_at: FETCHED_AT,
      body_sha256: 'e'.repeat(64),
    },
    rawSnapshotRef:
      'cards/raw/official_jp_cards/10917/details/card_46442_v1.html',
    detailStatus: 'captured',
  });
  assert.equal(assertion.printed_name, 'オーガポン みどりのめんex');
  assert.equal(assertion.source_product_id, '10917');
  assert.equal(assertion.source_set_code, 'SV-P');
  assert.equal(assertion.source_fields.image_reference_only, true);
});

test('Official JP health marks detail failures instead of claiming complete coverage', () => {
  const health = officialContainerHealth({
    product: {
      product_id: '10917',
      hit_count: 2,
      max_page: 1,
      cards: [{}, {}],
    },
    workItem: {
      registry_key: 'jpn-product-ogerpon-jumbo',
      source_expected_card_count: null,
    },
    selectedCardCount: 2,
    detailSuccessCount: 1,
    detailFailureCount: 1,
    operatorCardLimit: null,
  });
  assert.equal(health.status, 'detail_failures');
  assert.deepEqual(health.findings, [
    'one_or_more_card_detail_requests_failed',
  ]);
});

test('Bulbapedia adapter selects the Japanese table by registry denominator', () => {
  const workItem = {
    lane_id: 'bulbapedia_jp_card_lists',
    registry_key: 'jpn-example',
    source_container_id: 'Example_Collection_(TCG)',
    source_container_url:
      'https://bulbapedia.bulbagarden.net/wiki/Example_Collection_(TCG)',
    source_expected_card_count: 3,
    source_native_name: 'Example Collection',
  };
  const checklist = parseBulbapediaJapaneseCardList(
    BULBAPEDIA_HTML,
    workItem,
  );
  assert.equal(checklist.cards.length, 4);
  assert.equal(checklist.diagnostics.rejected_other_denominator_count, 2);
  assert.equal(checklist.cards[0].card_number_raw, '001/003');
  assert.equal(checklist.cards[0].english_display_name, 'Japanese One');

  const assertion = buildBulbapediaJapaneseCardAssertion({
    card: checklist.cards[0],
    checklist,
    workItem,
    snapshotMetadata: {
      fetched_at: FETCHED_AT,
      body_sha256: 'f'.repeat(64),
    },
    rawSnapshotRef:
      'cards/raw/bulbapedia_jp_card_lists/Example_Collection_(TCG)/article_v1.html',
  });
  assert.equal(assertion.printed_name, null);
  assert.equal(assertion.english_display_name, 'Japanese One');
  assert.equal(assertion.card_number_numerator, 1);
  assert.equal(assertion.card_number_denominator, 3);
  assert.equal(
    assertion.source_fields.table_selected_by_expected_denominator,
    3,
  );

  const health = bulbapediaContainerHealth({
    checklist,
    workItem,
    selectedCardCount: checklist.cards.length,
    operatorCardLimit: null,
  });
  assert.equal(health.status, 'complete');
  assert.equal(health.covered_base_number_count, 3);
});

test('Bulbapedia adapter reads modern exact numbered rows including secret cards', () => {
  const checklist = parseBulbapediaJapaneseCardList(
    BULBAPEDIA_MODERN_NUMBERED_HTML,
    {
      source_container_id: 'Example_Set_(TCG)',
      source_container_url: 'https://example.com/example-set',
      source_expected_card_count: 2,
    },
  );
  assert.equal(checklist.cards.length, 3);
  assert.equal(checklist.cards[0].english_display_name, 'Heracross');
  assert.equal(checklist.cards[2].card_number_raw, '003/002');
  assert.equal(checklist.diagnostics.modern_numbered_row_fallback_used, true);
});

test('Bulbapedia adapter preserves an exact older unnumbered Japanese list without inventing numbers', () => {
  const workItem = {
    lane_id: 'bulbapedia_jp_card_lists',
    registry_key: 'jpn-example-older',
    source_container_id: 'Example_Older_Set_(TCG)',
    source_container_url:
      'https://bulbapedia.bulbagarden.net/wiki/Example_Older_Set_(TCG)',
    source_expected_card_count: 2,
    source_native_name: 'Example Older Set',
  };
  const checklist = parseBulbapediaJapaneseCardList(`
    <h3>Japanese</h3>
    <table>
      <tr>
        <th>No.</th><th>Image</th><th>Card name</th>
        <th>Type</th><th>Rarity</th>
      </tr>
      <tr>
        <td>—</td><td></td>
        <td><a href="/wiki/Older_One_(TCG)">Older One</a></td>
        <td>Pokemon</td><td>U</td>
      </tr>
      <tr>
        <td>—</td><td></td>
        <td><a href="/wiki/Older_Two_(TCG)">Older Two</a></td>
        <td>Trainer</td><td>R</td>
      </tr>
    </table>
  `, workItem);

  assert.equal(checklist.cards.length, 2);
  assert.equal(checklist.cards[0].card_number_raw, null);
  assert.equal(checklist.cards[0].english_display_name, 'Older One');
  assert.equal(
    checklist.cards[0].source_fields
      .printed_card_number_available_in_table,
    false,
  );
  assert.equal(
    checklist.cards[0].source_fields
      .table_selected_by_exact_unnumbered_row_count,
    2,
  );
  assert.equal(checklist.diagnostics.numbering_mode, 'unavailable');
  const assertion = buildBulbapediaJapaneseCardAssertion({
    card: checklist.cards[0],
    checklist,
    workItem,
    snapshotMetadata: {
      fetched_at: FETCHED_AT,
      body_sha256: 'b'.repeat(64),
    },
    rawSnapshotRef:
      'cards/raw/bulbapedia_jp_card_lists/Example_Older_Set_(TCG)/article_v1.html',
  });
  assert.equal(assertion.printed_name, null);
  assert.equal(assertion.card_number_raw, null);
  assert.equal(assertion.unnumbered_label, 'Older One');

  const health = bulbapediaContainerHealth({
    checklist,
    workItem,
    selectedCardCount: checklist.cards.length,
    operatorCardLimit: null,
  });
  assert.equal(health.status, 'source_numbering_unavailable');
  assert.deepEqual(health.findings, [
    'source_list_has_no_printed_numbers',
  ]);
});

test('Bulbapedia adapter preserves parallel unnumbered Japanese lists when registry count is unavailable', () => {
  const workItem = {
    lane_id: 'bulbapedia_jp_card_lists',
    registry_key: 'jpn-example-parallel',
    source_container_id: 'Example_Parallel_Sets_(TCG)',
    source_container_url:
      'https://bulbapedia.bulbagarden.net/wiki/Example_Parallel_Sets_(TCG)',
    source_expected_card_count: null,
    source_native_name: 'Example Parallel Sets',
  };
  const checklist = parseBulbapediaJapaneseCardList(`
    <h3>Japanese Set A</h3>
    <table>
      <tr><th>No.</th><th>Card name</th></tr>
      <tr><td>—</td><td><a href="/wiki/Shared_(TCG)">Shared</a></td></tr>
      <tr><td>—</td><td><a href="/wiki/A_Only_(TCG)">A Only</a></td></tr>
    </table>
    <h3>Japanese Set B</h3>
    <table>
      <tr><th>No.</th><th>Card name</th></tr>
      <tr><td>—</td><td><a href="/wiki/Shared_(TCG)">Shared</a></td></tr>
      <tr><td>—</td><td><a href="/wiki/B_Only_(TCG)">B Only</a></td></tr>
    </table>
  `, workItem);

  assert.equal(checklist.cards.length, 4);
  assert.equal(new Set(
    checklist.cards.map((card) => card.source_external_id),
  ).size, 4);
  assert.equal(checklist.diagnostics.selected_unnumbered_table_count, 2);

  const health = bulbapediaContainerHealth({
    checklist,
    workItem,
    selectedCardCount: checklist.cards.length,
    operatorCardLimit: null,
  });
  assert.equal(health.status, 'source_expected_count_unavailable');
  assert.ok(
    health.findings.includes(
      'multiple_unnumbered_japanese_card_lists_preserved',
    ),
  );
});

test('PokeGuardian adapter preserves gallery evidence without inventing names or card numbers', () => {
  const workItem = {
    lane_id: 'pokeguardian_release_reports',
    registry_key: 'jpn-example',
    source_container_id: 'EX1',
    source_container_url:
      'https://www.pokeguardian.com/sets/set-lists/japanese-sets/example-main-set-list',
    source_expected_card_count: 2,
    source_native_code: 'EX1',
    source_native_name: 'Example Expansion',
  };
  const checklist = parsePokeGuardianJapaneseMainSetList(
    POKEGUARDIAN_HTML,
    workItem,
  );
  assert.equal(checklist.cards.length, 2);
  assert.equal(checklist.cards[0].card_number_raw, null);
  assert.equal(checklist.cards[1].card_number_raw, null);
  assert.equal(
    checklist.cards[0].source_fields
      .number_derived_from_ordered_main_set_album,
    false,
  );
  assert.equal(
    checklist.cards[0].source_fields
      .printed_card_number_available_from_source,
    false,
  );

  const assertion = buildPokeGuardianJapaneseCardAssertion({
    card: checklist.cards[0],
    checklist,
    workItem,
    snapshotMetadata: {
      fetched_at: FETCHED_AT,
      body_sha256: '1'.repeat(64),
    },
    rawSnapshotRef:
      'cards/raw/pokeguardian_release_reports/EX1/article_v1.html',
  });
  assert.equal(assertion.printed_name, null);
  assert.equal(assertion.card_number_numerator, null);
  assert.equal(assertion.card_number_denominator, null);
  assert.deepEqual(assertion.image_urls, [
    'https://www.pokeguardian.com/media/048341_p_example-one-standard.jpg',
  ]);

  const health = pokeGuardianContainerHealth({
    checklist,
    workItem,
    selectedCardCount: checklist.cards.length,
    operatorCardLimit: null,
  });
  assert.equal(health.status, 'complete');
  assert.deepEqual(health.findings, [
    'printed_card_numbers_not_exposed_by_source_article',
  ]);
});

test('PokeGuardian adapter admits older rarity galleries as explicitly partial unnumbered evidence', () => {
  const workItem = {
    lane_id: 'pokeguardian_release_reports',
    registry_key: 'jpn-example-rarity',
    source_container_id: 'EX1-SR',
    source_container_url:
      'https://www.pokeguardian.com/sets/set-lists/japanese-sets/example-all-sr-cards',
    source_expected_card_count: null,
    source_native_code: 'EX1',
    source_native_name: 'Example Expansion',
  };
  const checklist = parsePokeGuardianJapaneseMainSetList(`
    <!doctype html>
    <html>
      <head><title>EX1 all SR/HR/UR cards - PokeGuardian</title></head>
      <body>
        <img class="jw-album-image__image"
             src="https://primary.jwwb.nl/public/example/150494037.jpg"
             alt="150494037.jpg">
        <img class="jw-album-image__image"
             src="https://primary.jwwb.nl/public/example/150494038.jpg"
             alt="150494038.jpg">
      </body>
    </html>
  `, workItem);

  assert.equal(checklist.cards.length, 2);
  assert.equal(checklist.cards[0].source_image_identity, '150494037');
  assert.equal(checklist.cards[0].card_number_raw, null);
  assert.equal(
    checklist.diagnostics.article_kind,
    'partial_release_or_rarity_gallery',
  );

  const health = pokeGuardianContainerHealth({
    checklist,
    workItem,
    selectedCardCount: checklist.cards.length,
    operatorCardLimit: null,
  });
  assert.equal(health.status, 'source_partial_release_report');
  assert.ok(
    health.findings.includes(
      'article_is_partial_release_or_rarity_gallery',
    ),
  );
});

test('targeted card lanes enforce conservative live request delays', () => {
  assert.equal(
    parseCardHarvestArgs([
      '--source',
      'bulbapedia_jp_card_lists',
    ]).requestDelayMs,
    5000,
  );
  assert.equal(
    parseCardHarvestArgs([
      '--source',
      'pokeguardian_release_reports',
    ]).requestDelayMs,
    1500,
  );
  assert.throws(
    () =>
      parseCardHarvestArgs([
        '--source',
        'bulbapedia_jp_card_lists',
        '--request-delay-ms',
        '4999',
      ]),
    /requires at least 5000ms delay/,
  );
  assert.throws(
    () =>
      parseCardHarvestArgs([
        '--source',
        'pokeguardian_release_reports',
        '--request-delay-ms',
        '1499',
      ]),
    /requires at least 1500ms delay/,
  );
});

test('offline TCGdex harvest retains prior assertions during a later bounded replay', async () => {
  const temporaryRoot = await fs.mkdtemp(
    path.join(os.tmpdir(), 'grookai-jpn-tcgdex-test-'),
  );
  try {
    const outputDirectory = path.join(temporaryRoot, 'cards');
    const planPath = path.join(temporaryRoot, 'plan.json');
    await writeJsonArtifact(
      planPath,
      buildArtifact({
        packageId: 'TEST-JPN-CARD-PLAN',
        generatedAt: FETCHED_AT,
        retrieval: { mode: 'test' },
        content: {
          work_items: [
            {
              lane_id: 'tcgdex_ja_cards',
              disposition: 'scheduled',
              source_container_id: 'SV8',
              source_expected_card_count: 2,
              registry_key: 'jpn-sv8',
            },
          ],
        },
      }),
    );
    const rawSetDirectory = path.join(
      outputDirectory,
      'raw',
      'tcgdex_ja_cards',
      'SV8',
    );
    await writeSnapshot(rawSetDirectory, 'set_detail', SET_PAYLOAD);
    await writeSnapshot(
      path.join(rawSetDirectory, 'cards'),
      'SV8-001',
      cardPayload(SET_PAYLOAD.cards[0], 'Common'),
    );
    await writeSnapshot(
      path.join(rawSetDirectory, 'cards'),
      'SV8-002',
      cardPayload(SET_PAYLOAD.cards[1], 'Uncommon'),
    );

    const fullOptions = parseCardHarvestArgs([
      '--offline',
      '--output-dir',
      outputDirectory,
      '--plan',
      planPath,
      '--generated-at',
      FETCHED_AT,
    ]);
    const full = await runTcgdexJaCardHarvest(fullOptions);
    assert.equal(
      full.assertionArtifact.content.summary.combined_assertion_count,
      2,
    );

    const boundedOptions = parseCardHarvestArgs([
      '--offline',
      '--output-dir',
      outputDirectory,
      '--plan',
      planPath,
      '--max-cards-per-container',
      '1',
      '--generated-at',
      FETCHED_AT,
    ]);
    const bounded = await runTcgdexJaCardHarvest(boundedOptions);
    assert.equal(
      bounded.assertionArtifact.content.summary.fresh_assertion_count,
      1,
    );
    assert.equal(
      bounded.assertionArtifact.content.summary.retained_prior_assertion_count,
      1,
    );
    assert.equal(
      bounded.assertionArtifact.content.summary.combined_assertion_count,
      2,
    );
    assert.equal(
      bounded.healthArtifact.content.containers[0].status,
      'operator_bounded_partial',
    );
  } finally {
    await fs.rm(temporaryRoot, { recursive: true, force: true });
  }
});

test('offline Limitless harvest is reproducible and retains prior union during bounded replay', async () => {
  const temporaryRoot = await fs.mkdtemp(
    path.join(os.tmpdir(), 'grookai-jpn-limitless-test-'),
  );
  try {
    const outputDirectory = path.join(temporaryRoot, 'cards');
    const planPath = path.join(temporaryRoot, 'plan.json');
    await writeJsonArtifact(
      planPath,
      buildArtifact({
        packageId: 'TEST-JPN-CARD-PLAN',
        generatedAt: FETCHED_AT,
        retrieval: { mode: 'test' },
        content: {
          work_items: [
            {
              lane_id: 'limitless_jp_cards',
              disposition: 'scheduled',
              source_container_id: 'SV8',
              source_expected_card_count: 2,
              source_native_name: 'Super Electric Breaker',
              registry_key: 'jpn-sv8',
            },
          ],
        },
      }),
    );
    const rawSetDirectory = path.join(
      outputDirectory,
      'raw',
      'limitless_jp_cards',
      'SV8',
    );
    await writeHtmlSnapshot(
      rawSetDirectory,
      'set_checklist',
      LIMITLESS_HTML,
    );

    const fullOptions = parseCardHarvestArgs([
      '--source',
      'limitless_jp_cards',
      '--offline',
      '--output-dir',
      outputDirectory,
      '--plan',
      planPath,
      '--generated-at',
      FETCHED_AT,
    ]);
    const full = await runLimitlessJaCardHarvest(fullOptions);
    assert.equal(
      full.assertionArtifact.content.summary.combined_assertion_count,
      2,
    );
    const fingerprint =
      full.assertionArtifact.content.summary.assertion_fingerprint_sha256;

    const replay = await runLimitlessJaCardHarvest(fullOptions);
    assert.equal(
      replay.assertionArtifact.content.summary.assertion_fingerprint_sha256,
      fingerprint,
    );

    const boundedOptions = parseCardHarvestArgs([
      '--source',
      'limitless_jp_cards',
      '--offline',
      '--output-dir',
      outputDirectory,
      '--plan',
      planPath,
      '--max-cards-per-container',
      '1',
      '--generated-at',
      FETCHED_AT,
    ]);
    const bounded = await runLimitlessJaCardHarvest(boundedOptions);
    assert.equal(
      bounded.assertionArtifact.content.summary.fresh_assertion_count,
      1,
    );
    assert.equal(
      bounded.assertionArtifact.content.summary.retained_prior_assertion_count,
      1,
    );
    assert.equal(
      bounded.assertionArtifact.content.summary.combined_assertion_count,
      2,
    );
    assert.equal(
      bounded.healthArtifact.content.containers[0].status,
      'operator_bounded_partial',
    );
  } finally {
    await fs.rm(temporaryRoot, { recursive: true, force: true });
  }
});

test('offline Art of Pokemon harvest is reproducible and retains prior union', async () => {
  const temporaryRoot = await fs.mkdtemp(
    path.join(os.tmpdir(), 'grookai-jpn-artofpkm-test-'),
  );
  try {
    const outputDirectory = path.join(temporaryRoot, 'cards');
    const planPath = path.join(temporaryRoot, 'plan.json');
    await writeJsonArtifact(
      planPath,
      buildArtifact({
        packageId: 'TEST-JPN-CARD-PLAN',
        generatedAt: FETCHED_AT,
        retrieval: { mode: 'test' },
        content: {
          work_items: [
            {
              lane_id: 'artofpkm_jp_cards',
              disposition: 'scheduled',
              source_container_id: '10',
              source_expected_card_count: 2,
              source_native_name: 'Rocket Gang',
              registry_key: 'jpn-rocket-gang',
            },
          ],
        },
      }),
    );
    const rawSetDirectory = path.join(
      outputDirectory,
      'raw',
      'artofpkm_jp_cards',
      '10',
    );
    await writeHtmlSnapshot(
      rawSetDirectory,
      'set_checklist',
      ARTOFPKM_HTML,
      'https://www.artofpkm.com/sets/10',
    );
    const fullOptions = parseCardHarvestArgs([
      '--source',
      'artofpkm_jp_cards',
      '--offline',
      '--output-dir',
      outputDirectory,
      '--plan',
      planPath,
      '--generated-at',
      FETCHED_AT,
    ]);
    const full = await runArtOfPkmJaCardHarvest(fullOptions);
    assert.equal(
      full.assertionArtifact.content.summary.combined_assertion_count,
      2,
    );
    const fingerprint =
      full.assertionArtifact.content.summary.assertion_fingerprint_sha256;
    const replay = await runArtOfPkmJaCardHarvest(fullOptions);
    assert.equal(
      replay.assertionArtifact.content.summary.assertion_fingerprint_sha256,
      fingerprint,
    );

    const boundedOptions = parseCardHarvestArgs([
      '--source',
      'artofpkm_jp_cards',
      '--offline',
      '--output-dir',
      outputDirectory,
      '--plan',
      planPath,
      '--max-cards-per-container',
      '1',
      '--generated-at',
      FETCHED_AT,
    ]);
    const bounded = await runArtOfPkmJaCardHarvest(boundedOptions);
    assert.equal(
      bounded.assertionArtifact.content.summary.combined_assertion_count,
      2,
    );
    assert.equal(
      bounded.assertionArtifact.content.summary.retained_prior_assertion_count,
      1,
    );
    assert.equal(
      bounded.healthArtifact.content.containers[0].status,
      'operator_bounded_partial',
    );
  } finally {
    await fs.rm(temporaryRoot, { recursive: true, force: true });
  }
});

test('offline Serebii harvest is reproducible and retains prior union', async () => {
  const temporaryRoot = await fs.mkdtemp(
    path.join(os.tmpdir(), 'grookai-jpn-serebii-test-'),
  );
  try {
    const outputDirectory = path.join(temporaryRoot, 'cards');
    const planPath = path.join(temporaryRoot, 'plan.json');
    await writeJsonArtifact(
      planPath,
      buildArtifact({
        packageId: 'TEST-JPN-CARD-PLAN',
        generatedAt: FETCHED_AT,
        retrieval: { mode: 'test' },
        content: {
          work_items: [
            {
              lane_id: 'serebii_jp_cards',
              disposition: 'scheduled',
              source_container_id: 'ancientroar',
              source_expected_card_count: 2,
              source_native_name: 'Ancient Roar',
              registry_key: 'jpn-sv4k',
            },
          ],
        },
      }),
    );
    const rawSetDirectory = path.join(
      outputDirectory,
      'raw',
      'serebii_jp_cards',
      'ancientroar',
    );
    await writeHtmlSnapshot(
      rawSetDirectory,
      'set_checklist',
      SEREBII_HTML,
      'https://www.serebii.net/card/ancientroar/',
    );
    const fullOptions = parseCardHarvestArgs([
      '--source',
      'serebii_jp_cards',
      '--offline',
      '--output-dir',
      outputDirectory,
      '--plan',
      planPath,
      '--generated-at',
      FETCHED_AT,
    ]);
    const full = await runSerebiiJaCardHarvest(fullOptions);
    assert.equal(
      full.assertionArtifact.content.summary.combined_assertion_count,
      2,
    );
    const fingerprint =
      full.assertionArtifact.content.summary.assertion_fingerprint_sha256;
    const replay = await runSerebiiJaCardHarvest(fullOptions);
    assert.equal(
      replay.assertionArtifact.content.summary.assertion_fingerprint_sha256,
      fingerprint,
    );

    const boundedOptions = parseCardHarvestArgs([
      '--source',
      'serebii_jp_cards',
      '--offline',
      '--output-dir',
      outputDirectory,
      '--plan',
      planPath,
      '--max-cards-per-container',
      '1',
      '--generated-at',
      FETCHED_AT,
    ]);
    const bounded = await runSerebiiJaCardHarvest(boundedOptions);
    assert.equal(
      bounded.assertionArtifact.content.summary.combined_assertion_count,
      2,
    );
    assert.equal(
      bounded.assertionArtifact.content.summary.retained_prior_assertion_count,
      1,
    );
    assert.equal(
      bounded.healthArtifact.content.containers[0].status,
      'operator_bounded_partial',
    );
  } finally {
    await fs.rm(temporaryRoot, { recursive: true, force: true });
  }
});

test('offline Official JP harvest is reproducible and retains prior union', async () => {
  const temporaryRoot = await fs.mkdtemp(
    path.join(os.tmpdir(), 'grookai-jpn-official-test-'),
  );
  try {
    const outputDirectory = path.join(temporaryRoot, 'cards');
    const planPath = path.join(temporaryRoot, 'plan.json');
    await writeJsonArtifact(
      planPath,
      buildArtifact({
        packageId: 'TEST-JPN-CARD-PLAN',
        generatedAt: FETCHED_AT,
        retrieval: { mode: 'test' },
        content: {
          work_items: [
            {
              lane_id: 'official_jp_cards',
              disposition: 'scheduled',
              source_container_id: '10917',
              source_expected_card_count: null,
              source_native_name:
                'スペシャルジャンボカードセット オーガポン',
              source_release_date: '2024年 5月17日（金）',
              registry_key: 'jpn-product-ogerpon-jumbo',
            },
          ],
        },
      }),
    );
    const productDirectory = path.join(
      outputDirectory,
      'raw',
      'official_jp_cards',
      '10917',
    );
    await writeSnapshot(
      path.join(productDirectory, 'pages'),
      'search_page_1',
      OFFICIAL_SEARCH_PAYLOAD,
    );
    await writeHtmlSnapshot(
      path.join(productDirectory, 'details'),
      'card_46442',
      OFFICIAL_DETAIL_HTML,
      'https://www.pokemon-card.com/card-search/details.php/card/46442/regu/all',
    );
    await writeHtmlSnapshot(
      path.join(productDirectory, 'details'),
      'card_46443',
      OFFICIAL_DETAIL_HTML.replaceAll('46442', '46443').replaceAll(
        'みどりのめん',
        'いしずえのめん',
      ),
      'https://www.pokemon-card.com/card-search/details.php/card/46443/regu/all',
    );
    const fullOptions = parseCardHarvestArgs([
      '--source',
      'official_jp_cards',
      '--offline',
      '--output-dir',
      outputDirectory,
      '--plan',
      planPath,
      '--generated-at',
      FETCHED_AT,
    ]);
    const full = await runOfficialJaCardHarvest(fullOptions);
    assert.equal(
      full.assertionArtifact.content.summary.combined_assertion_count,
      2,
    );
    const fingerprint =
      full.assertionArtifact.content.summary.assertion_fingerprint_sha256;
    const replay = await runOfficialJaCardHarvest(fullOptions);
    assert.equal(
      replay.assertionArtifact.content.summary.assertion_fingerprint_sha256,
      fingerprint,
    );

    const boundedOptions = parseCardHarvestArgs([
      '--source',
      'official_jp_cards',
      '--offline',
      '--output-dir',
      outputDirectory,
      '--plan',
      planPath,
      '--max-cards-per-container',
      '1',
      '--generated-at',
      FETCHED_AT,
    ]);
    const bounded = await runOfficialJaCardHarvest(boundedOptions);
    assert.equal(
      bounded.assertionArtifact.content.summary.combined_assertion_count,
      2,
    );
    assert.equal(
      bounded.assertionArtifact.content.summary.retained_prior_assertion_count,
      1,
    );
    assert.equal(
      bounded.healthArtifact.content.containers[0].status,
      'operator_bounded_partial',
    );
  } finally {
    await fs.rm(temporaryRoot, { recursive: true, force: true });
  }
});

test('offline targeted harvests consume only measured queue work items reproducibly', async () => {
  const temporaryRoot = await fs.mkdtemp(
    path.join(os.tmpdir(), 'grookai-jpn-targeted-test-'),
  );
  try {
    const outputDirectory = path.join(temporaryRoot, 'cards');
    const planPath = path.join(temporaryRoot, 'plan.json');
    const queuePath = path.join(temporaryRoot, 'targeted-queue.json');
    const workItems = [
      {
        lane_id: 'bulbapedia_jp_card_lists',
        disposition: 'targeted_after_primary_delta',
        source_container_id: 'Example_Collection_(TCG)',
        source_container_url:
          'https://bulbapedia.bulbagarden.net/wiki/Example_Collection_(TCG)',
        source_expected_card_count: 3,
        source_native_name: 'Example Collection',
        registry_key: 'jpn-example-bulbapedia',
      },
      {
        lane_id: 'pokeguardian_release_reports',
        disposition: 'targeted_after_primary_delta',
        source_container_id: 'EX1',
        source_container_url:
          'https://www.pokeguardian.com/sets/set-lists/japanese-sets/example-main-set-list',
        source_expected_card_count: 2,
        source_native_code: 'EX1',
        source_native_name: 'Example Expansion',
        registry_key: 'jpn-example-pokeguardian',
      },
    ];
    await writeJsonArtifact(
      planPath,
      buildArtifact({
        packageId: 'TEST-JPN-CARD-PLAN',
        generatedAt: FETCHED_AT,
        retrieval: { mode: 'test' },
        content: { work_items: workItems },
      }),
    );
    await writeJsonArtifact(
      queuePath,
      buildArtifact({
        packageId: 'JPN-MASTER-INDEX-TARGETED-SOURCE-QUEUE-V1',
        generatedAt: FETCHED_AT,
        retrieval: { mode: 'test' },
        content: {
          work_items: workItems.map((row) => ({
            lane_id: row.lane_id,
            registry_key: row.registry_key,
            source_container_id: row.source_container_id,
            source_container_url: row.source_container_url,
            source_expected_card_count: row.source_expected_card_count,
            priority: 'high',
          })),
        },
      }),
    );
    await writeHtmlSnapshot(
      path.join(
        outputDirectory,
        'raw',
        'bulbapedia_jp_card_lists',
        'Example_Collection__TCG',
      ),
      'article',
      BULBAPEDIA_HTML,
      workItems[0].source_container_url,
    );
    await writeHtmlSnapshot(
      path.join(
        outputDirectory,
        'raw',
        'pokeguardian_release_reports',
        'EX1',
      ),
      'article',
      POKEGUARDIAN_HTML,
      workItems[1].source_container_url,
    );

    const commonArgs = [
      '--offline',
      '--output-dir',
      outputDirectory,
      '--plan',
      planPath,
      '--targeted-queue',
      queuePath,
      '--generated-at',
      FETCHED_AT,
    ];
    const bulbapedia = await runBulbapediaJaCardHarvest(
      parseCardHarvestArgs([
        '--source',
        'bulbapedia_jp_card_lists',
        ...commonArgs,
      ]),
    );
    const pokeGuardian = await runPokeGuardianJaCardHarvest(
      parseCardHarvestArgs([
        '--source',
        'pokeguardian_release_reports',
        ...commonArgs,
      ]),
    );
    assert.equal(
      bulbapedia.assertionArtifact.content.summary
        .combined_assertion_count,
      4,
    );
    assert.equal(
      pokeGuardian.assertionArtifact.content.summary
        .combined_assertion_count,
      2,
    );
    assert.equal(
      bulbapedia.assertionArtifact.retrieval
        .targeted_queue_content_fingerprint_sha256,
      pokeGuardian.assertionArtifact.retrieval
        .targeted_queue_content_fingerprint_sha256,
    );
    assert.equal(
      bulbapedia.healthArtifact.content.selected_run_healthy,
      true,
    );
    assert.equal(
      pokeGuardian.healthArtifact.content.selected_run_healthy,
      true,
    );

    const replay = await runBulbapediaJaCardHarvest(
      parseCardHarvestArgs([
        '--source',
        'bulbapedia_jp_card_lists',
        ...commonArgs,
      ]),
    );
    assert.equal(
      replay.assertionArtifact.content.summary
        .assertion_fingerprint_sha256,
      bulbapedia.assertionArtifact.content.summary
        .assertion_fingerprint_sha256,
    );
  } finally {
    await fs.rm(temporaryRoot, { recursive: true, force: true });
  }
});
