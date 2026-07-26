import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import {
  contentFingerprint,
  sha256,
} from '../../scripts/audits/japanese_master_index_v4/deterministic_artifact_v1.mjs';
import {
  parseArtOfPkmJapaneseSets,
  parseBulbapediaJapaneseExpansions,
  parseLimitlessJapaneseSets,
  parseOfficialJapaneseProducts,
  parsePokeGuardianJapaneseSetIndex,
  parseSerebiiJapaneseSets,
  parseTcgCollectorJapaneseSets,
  parseTcgdexJapaneseSets,
} from '../../scripts/audits/japanese_master_index_v4/set_source_parsers_v1.mjs';
import {
  buildRegistry,
  normalizeCode,
  normalizeName,
} from '../../scripts/audits/japanese_master_index_v4/set_registry_build_v1.mjs';

const ROOT = path.resolve('docs/audits/japanese_master_index_v4/sets');
const BASELINE_PATH = path.resolve(
  'docs/audits/japanese_master_index_v4/baseline/live_jpn_set_code_inventory_v1.json',
);

test('TCGdex parser preserves Japanese names and source counts', () => {
  const rows = parseTcgdexJapaneseSets(
    JSON.stringify([
      {
        id: 'PMCG1',
        name: '拡張パック',
        cardCount: { total: 102, official: 102 },
      },
    ]),
  );
  assert.deepEqual(
    {
      id: rows[0].source_set_id,
      code: rows[0].source_native_code,
      name: rows[0].source_native_name,
      count: rows[0].source_expected_card_count,
    },
    { id: 'PMCG1', code: 'PMCG1', name: '拡張パック', count: 102 },
  );
});

test('TCGCollector parser preserves source identity, era, date, and count', () => {
  const rows = parseTcgCollectorJapaneseSets(`
    <div id="mega-evolution-era"><h2>Mega Evolution Era</h2></div>
    <div class="set-logo-grid-item set-search-result-item" data-set-id="11822">
      <a href="/sets/11822/example?setCardCountMode=anyCardVariant"
         title="Example &amp; Set" class="set-logo-grid-item-name">Example</a>
      <span class="set-logo-grid-item-code">MF</span>
      <div class="set-logo-grid-item-release-date">Sep 16, 2026</div>
      <div class="set-logo-grid-item-status-text">0/174 0%</div>
      <img src="https://static.tcgcollector.com/example.webp"
           class="set-logo-grid-item-logo">
    </div>
  `);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].source_set_id, '11822');
  assert.equal(rows[0].source_native_code, 'MF');
  assert.equal(rows[0].source_native_name, 'Example & Set');
  assert.equal(rows[0].source_era_label, 'Mega Evolution Era');
  assert.equal(rows[0].source_release_date, 'Sep 16, 2026');
  assert.equal(rows[0].source_expected_card_count, 174);
});

test('Limitless parser preserves row identity, era, date, and count', () => {
  const rows = parseLimitlessJapaneseSets(`
    <table>
      <tr><th colspan="3">Mega</th></tr>
      <tr>
        <td><a href="/cards/jp/M6"><img src="https://s3.limitlesstcg.com/sets/jp/M6.png">Storm Emeralda <span class="code annotation">M6</span></a></td>
        <td><a href="/cards/jp/M6">31 Jul 26</a></td>
        <td><a href="/cards/jp/M6">76 <span>0.00%</span></a></td>
      </tr>
    </table>
  `);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].source_set_id, 'M6');
  assert.equal(rows[0].source_native_name, 'Storm Emeralda');
  assert.equal(rows[0].source_era_label, 'Mega');
  assert.equal(rows[0].source_release_date, '31 Jul 26');
  assert.equal(rows[0].source_expected_card_count, 76);
});

test('Art of Pokémon parser preserves set id, name, and era', () => {
  const rows = parseArtOfPkmJapaneseSets(`
    <div class="flex flex-col gap-1" id="mega"><h2>MEGA</h2>
      <a class="w-full set" href="/sets/594">
        <img data-src="/tile.jpg" class="lazy-load-bg">
        <img data-src="/logo.png" class="lazy-load-logo">
        <h4>30th CELEBRATION</h4>
      </a>
    </div>
  `);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].source_set_id, '594');
  assert.equal(rows[0].source_native_name, '30th CELEBRATION');
  assert.equal(rows[0].source_era_label, 'MEGA');
  assert.equal(rows[0].source_expected_card_count, null);
  assert.equal(rows[0].source_image_url, 'https://www.artofpkm.com/logo.png');
});

test('Serebii parser preserves source slug, name, count, date, and image', () => {
  const rows = parseSerebiiJapaneseSets(`
    <table>
      <tr>
        <td class="cen"><a href="/card/abysseye"><img src="/card/logo/abysseye.png"></a></td>
        <td class="cen"><a href="/card/abysseye">Abyss Eye</a></td>
        <td class="cen">124</td>
        <td class="cen"><a href="/card/abysseye">May 22nd 2026</a></td>
      </tr>
    </table>
  `);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].source_set_id, 'abysseye');
  assert.equal(rows[0].source_native_name, 'Abyss Eye');
  assert.equal(rows[0].source_expected_card_count, 124);
  assert.equal(rows[0].source_release_date, 'May 22nd 2026');
  assert.equal(
    rows[0].source_image_url,
    'https://www.serebii.net/card/logo/abysseye.png',
  );
});

test('Bulbapedia parser preserves translated and Japanese names without inventing a code', () => {
  const rows = parseBulbapediaJapaneseExpansions(`
    <h2><span class="mw-headline" id="Main_Sets">Main Sets</span></h2>
    <h3><span class="mw-headline" id="Original_Era">Original Era</span></h3>
    <table>
      <tr>
        <th>Set no.</th><th>Symbol</th><th>Logo</th>
        <th>Japanese name<br>Translated name</th>
        <th>English equivalent</th><th>No. of cards</th><th>Release date</th>
      </tr>
      <tr>
        <td>1</td><td>-</td><td>-</td>
        <td>拡張パック<br><a href="/wiki/Expansion_Pack_(TCG)" title="Expansion Pack (TCG)">Expansion Pack</a></td>
        <td>Base Set</td><td>102</td><td>October 20, 1996</td>
      </tr>
    </table>
  `);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].source_set_id, 'Expansion_Pack_(TCG)');
  assert.equal(rows[0].source_native_code, null);
  assert.equal(rows[0].source_native_name, 'Expansion Pack');
  assert.equal(rows[0].source_native_japanese_name, '拡張パック');
  assert.equal(rows[0].source_expected_card_count, 102);
  assert.equal(rows[0].source_era_label, 'Original Era');
  assert.equal(rows[0].source_release_kind, 'Main Sets');
});

test('PokeGuardian parser clusters main and rarity articles into one release assertion', () => {
  const rows = parsePokeGuardianJapaneseSetIndex(`
    <article class="jw-news-post">
      <h2 class="jw-news-post__title">
        <a data-segment-id="10" href="/sets/10_m5-abyss-eye-all-sr-ar-sar-cards">
          M5 Abyss Eye All SR/AR/SAR Cards
        </a>
      </h2>
      <div class="jw-news-post__lead"><p>Releases May 22, 2026.</p></div>
    </article>
    <article class="jw-news-post">
      <h2 class="jw-news-post__title">
        <a data-segment-id="11" href="/sets/11_m5-abyss-eye-main-set-list">
          M5 Abyss Eye Main Set List
        </a>
      </h2>
      <div class="jw-news-post__lead"><p>Releases May 22, 2026.</p></div>
    </article>
  `);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].source_set_id, 'M5');
  assert.equal(rows[0].source_native_code, 'M5');
  assert.equal(rows[0].source_native_name, 'M5 Abyss Eye');
  assert.equal(rows[0].source_release_date, 'May 22, 2026');
  assert.equal(rows[0].source_related_urls.length, 2);
  assert.match(rows[0].source_url, /main-set-list$/);
});

test('official Japanese product parser preserves pg identity and scope hint', () => {
  const rows = parseOfficialJapaneseProducts(
    JSON.stringify({
      result: 1,
      thisPage: 1,
      maxPage: 1,
      hitCnt: 1,
      products: [
        {
          productTitle: '拡張パック「アビスアイ」',
          productType: '拡張パック',
          releaseDate: '2026年 5月22日（金）',
          tumbsImg: '/products/2026/images/abisueye.jpg',
          link_cardList: '/card-search/index.php?pg=954',
          link_detailPage: '/ex/m5/',
        },
      ],
    }),
    { productType: 'expansion' },
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].source_set_id, '954');
  assert.equal(rows[0].source_native_code, null);
  assert.equal(rows[0].source_expected_card_count, null);
  assert.equal(rows[0].source_scope_hint, 'card_list_linked');
  assert.equal(rows[0].source_container_kind, 'expansion');
});

test('official Japanese products receive explicit no-card-list scope dispositions', () => {
  const basePayload = {
    result: 1,
    thisPage: 1,
    maxPage: 1,
    hitCnt: 1,
    products: [
      {
        productTitle: 'Example',
        releaseDate: '2026年 1月1日（木）',
        link_detailPage: '/products/example',
      },
    ],
  };
  const expectations = new Map([
    ['expansion', 'official_expansion_release'],
    ['construction', 'official_constructed_deck_product'],
    ['others', 'official_card_distribution_product'],
  ]);
  for (const [productType, expected] of expectations) {
    const [row] = parseOfficialJapaneseProducts(JSON.stringify(basePayload), {
      productType,
    });
    assert.equal(row.source_scope_hint, expected);
  }
});

test('registry normalizers preserve Japanese text while folding punctuation and codes', () => {
  assert.equal(normalizeName('ポケモンカード151'), 'ポケモンカード151');
  assert.equal(
    normalizeName('Magma VS Aqua: Two Ambitions'),
    normalizeName('Magma vs Aqua — Two Ambitions'),
  );
  assert.equal(normalizeCode('JPN-SV8a'), 'sv8a');
});

test('registry resolver refuses ambiguous native codes and replaces source placeholders', () => {
  const assertions = [
    {
      source_id: 'tcgcollector_jp_sets',
      source_set_id: '1',
      source_native_code: 'B',
      source_native_name: 'Battle Deck One',
      source_release_date: null,
      source_expected_card_count: 10,
      source_era_label: 'Example',
      source_scope_hint: null,
    },
    {
      source_id: 'tcgcollector_jp_sets',
      source_set_id: '2',
      source_native_code: 'B',
      source_native_name: 'Battle Deck Two',
      source_release_date: null,
      source_expected_card_count: 11,
      source_era_label: 'Example',
      source_scope_hint: null,
    },
    {
      source_id: 'artofpkm_jp_sets',
      source_set_id: '9',
      source_native_code: null,
      source_native_name: 'Battle Deck One',
      source_release_date: null,
      source_expected_card_count: null,
      source_era_label: 'Example',
      source_scope_hint: null,
    },
  ];
  const baseline = {
    set_codes: [
      {
        set_code: 'jpn-artofpkm:9',
        folded_set_code: 'jpn-artofpkm:9',
        parent_rows: 10,
        public_rows: 10,
      },
    ],
    source_placeholder_sets: [
      {
        set_code: 'jpn-artofpkm:9',
        folded_set_code: 'jpn-artofpkm:9',
        parent_rows: 10,
        public_rows: 10,
      },
    ],
    case_only_alias_groups: [],
  };
  const result = buildRegistry({ assertions, baseline });
  assert.equal(result.summary.unresolved_source_placeholder_count, 0);
  assert.match(
    result.placeholderResolutions[0].resolved_registry_key,
    /^jpn-release-[0-9a-f]{16}$/,
  );
  assert.ok(
    result.conflicts.some(
      (row) =>
        row.conflict_type === 'native_code_maps_to_multiple_releases' &&
        row.conflict_key === 'b',
    ),
  );
});

test('preserved live set artifacts are healthy, unique, and replayable', () => {
  const assertionsPath = path.join(ROOT, 'source_set_assertions_v1.json');
  const healthPath = path.join(ROOT, 'source_health_v1.json');
  const manifestPath = path.join(ROOT, 'source_manifest_v1.json');
  const policyPath = path.join(ROOT, 'source_policy_v1.json');
  for (const artifactPath of [
    assertionsPath,
    healthPath,
    manifestPath,
    policyPath,
  ]) {
    assert.ok(fs.existsSync(artifactPath), artifactPath);
  }

  const artifact = JSON.parse(fs.readFileSync(assertionsPath, 'utf8'));
  assert.equal(
    artifact.content_fingerprint_sha256,
    contentFingerprint(artifact.content),
  );
  const counts = Object.fromEntries(
    artifact.content.source_counts.map((row) => [
      row.source_id,
      row.assertion_count,
    ]),
  );
  assert.ok(counts.tcgdex_ja_sets >= 170);
  assert.ok(counts.limitless_jp_sets >= 250);
  assert.ok(counts.tcgcollector_jp_sets >= 440);
  assert.ok(counts.artofpkm_jp_sets >= 400);
  assert.ok(counts.official_jp_products >= 600);
  assert.ok(counts.serebii_jp_sets >= 150);
  assert.ok(counts.bulbapedia_jp_expansions >= 100);
  assert.ok(counts.pokeguardian_jp_sets >= 50);

  const keys = artifact.content.assertions.map(
    (row) => `${row.source_id}:${row.source_set_id}`,
  );
  assert.equal(new Set(keys).size, keys.length);

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  for (const raw of manifest.content.raw_snapshots) {
    const body = fs.readFileSync(path.resolve(raw.body_path));
    assert.equal(body.length, raw.byte_size);
    assert.equal(sha256(body), raw.body_sha256);
    assert.equal(raw.http_status, 200);
  }

  const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
  assert.ok(
    policy.content.blocked_automated_sources.includes('pokellector_jp_sets'),
  );
});

test('governed registry covers every assertion and resolves every live placeholder', () => {
  const assertionsArtifact = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'source_set_assertions_v1.json'), 'utf8'),
  );
  const baselineArtifact = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
  const registryArtifact = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'jpn_set_registry_v1.json'), 'utf8'),
  );
  const aliasArtifact = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'jpn_set_alias_map_v1.json'), 'utf8'),
  );
  const placeholderArtifact = JSON.parse(
    fs.readFileSync(
      path.join(ROOT, 'jpn_source_placeholder_resolution_v1.json'),
      'utf8',
    ),
  );
  const conflictArtifact = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'jpn_set_conflict_queue_v1.json'), 'utf8'),
  );
  const coverageArtifact = JSON.parse(
    fs.readFileSync(
      path.join(ROOT, 'jpn_set_registry_coverage_v1.json'),
      'utf8',
    ),
  );
  const officialScopeArtifact = JSON.parse(
    fs.readFileSync(
      path.join(ROOT, 'jpn_official_product_scope_v1.json'),
      'utf8',
    ),
  );

  for (const artifact of [
    registryArtifact,
    aliasArtifact,
    placeholderArtifact,
    conflictArtifact,
    coverageArtifact,
    officialScopeArtifact,
  ]) {
    assert.equal(
      artifact.content_fingerprint_sha256,
      contentFingerprint(artifact.content),
    );
  }
  const replay = buildRegistry({
    assertions: assertionsArtifact.content.assertions,
    baseline: baselineArtifact.content,
  });
  assert.equal(
    contentFingerprint({
      summary: replay.summary,
      registry_entries: replay.registryEntries,
    }),
    registryArtifact.content_fingerprint_sha256,
  );
  assert.equal(
    registryArtifact.content.summary.source_assertion_count,
    registryArtifact.content.summary.represented_source_assertion_count,
  );
  assert.equal(
    placeholderArtifact.content.resolutions.length,
    baselineArtifact.content.source_placeholder_sets.length,
  );
  assert.equal(
    placeholderArtifact.content.summary.unresolved_source_placeholder_count,
    0,
  );
  assert.ok(
    placeholderArtifact.content.resolutions.every(
      (row) =>
        !/^jpn-(artofpkm|tcgcollector):/i.test(row.resolved_registry_key),
    ),
  );
  assert.equal(
    aliasArtifact.content.case_only_alias_resolutions.length,
    baselineArtifact.content.case_only_alias_groups.length,
  );
  assert.ok(
    conflictArtifact.content.conflicts.some(
      (row) => row.severity === 'blocking_for_code_promotion',
    ),
  );
  assert.equal(coverageArtifact.content.gate.every_assertion_represented, true);
  assert.equal(coverageArtifact.content.gate.source_placeholders_remaining, 0);
  assert.equal(
    coverageArtifact.content.gate.card_level_promotion_allowed,
    false,
  );
  assert.equal(
    officialScopeArtifact.content.summary.unresolved_scope_review_count,
    0,
  );
});
