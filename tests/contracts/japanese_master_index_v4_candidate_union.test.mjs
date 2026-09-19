import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildJapaneseCandidateUnion,
  candidateResolutionInternals,
} from '../../scripts/audits/japanese_master_index_v4/candidate_resolution_v1.mjs';
import {
  normalizeJapaneseCardAssertion,
} from '../../scripts/audits/japanese_master_index_v4/card_assertion_contract_v1.mjs';

const RAW_HASH = 'a'.repeat(64);

test('candidate numbers retain prefixes, suffixes and promo series even with a numeric numerator', () => {
  for (const [raw, expected] of [
    ['001/100', '1'], ['A001', 'A1'], ['001-A', '1A'],
    ['018/SV-P', '18/SVP'], ['018/DP-P', '18/DPP'],
  ]) {
    assert.equal(candidateResolutionInternals.numberCoreFromRaw(raw), expected);
    assert.equal(candidateResolutionInternals.assertionNumberCore({
      card_number_raw: raw, card_number_numerator: 1,
    }), expected);
  }
});

function assertion({
  sourceId,
  externalId,
  number = null,
  printedName = null,
  englishName = null,
  images = [],
  finishLabels = [],
}) {
  return normalizeJapaneseCardAssertion({
    source_id: sourceId,
    source_family: sourceId,
    source_kind: 'fixture',
    source_external_id: externalId,
    source_url: `https://example.test/${sourceId}/${externalId}`,
    source_container_id: 'a',
    registry_key: 'jpn-a',
    language: 'ja',
    parser_version: 'FIXTURE-V1',
    raw_snapshot_ref: `fixture/${sourceId}/${externalId}.json`,
    raw_snapshot_sha256: RAW_HASH,
    source_fields: {},
    printed_name: printedName,
    english_display_name: englishName,
    card_number_raw: number,
    card_number_numerator: number === null
      ? null
      : Number.parseInt(number, 10),
    image_urls: images,
    finish_labels: finishLabels,
  });
}

function fixture() {
  const speciesRows = [
    {
      id: 'species-bulbasaur',
      national_dex_number: 1,
      canonical_name: 'bulbasaur',
      slug: 'bulbasaur',
      is_form: false,
      active: true,
    },
    {
      id: 'species-pikachu',
      national_dex_number: 25,
      canonical_name: 'pikachu',
      slug: 'pikachu',
      is_form: false,
      active: true,
    },
  ];
  const parents = [
    {
      card_print_id: 'parent-1',
      gv_id: 'GV-PK-JPN-A-001',
      set_code: 'jpn-a',
      printed_number: '001',
      number_plain: '001',
      printed_name: 'フシギダネ',
      image_url: 'https://images.test/parent-1.png',
    },
    {
      card_print_id: 'parent-2',
      gv_id: 'GV-PK-JPN-A-002',
      set_code: 'jpn-a',
      printed_number: '002',
      number_plain: '002',
      printed_name: 'ピカチュウ',
      image_url: 'https://images.test/parent-2.png',
    },
  ];
  const evidenceRows = [
    {
      evidence_id: 'evidence-1',
      card_print_id: 'parent-1',
      source_key: 'preserved-source',
      active: true,
      evidence_subject: {
        source_canonical_set_key: 'A',
        printed_number: '001',
        card_name_ja_candidates: ['フシギダネ'],
        card_name_en_candidates: ['Bulbasaur'],
      },
    },
  ];
  const assertions = [
    assertion({
      sourceId: 'source-1',
      externalId: 'exact-name',
      number: '1',
      printedName: 'フシギダネ',
    }),
    assertion({
      sourceId: 'source-1',
      externalId: 'unique-number',
      number: '2',
      englishName: 'Not Pikachu',
    }),
    assertion({
      sourceId: 'source-1',
      externalId: 'novel-3',
      number: '3',
      printedName: 'フシギダネ',
    }),
    assertion({
      sourceId: 'source-1',
      externalId: 'duplicate-4-a',
      number: '4',
      printedName: 'フシギダネ',
    }),
    assertion({
      sourceId: 'source-1',
      externalId: 'duplicate-4-b',
      number: '4',
      printedName: 'ピカチュウ',
    }),
    assertion({
      sourceId: 'source-2',
      externalId: 'exact-parent-image',
      images: ['https://images.test/parent-1.png'],
      englishName: 'Wrong English Name',
    }),
    assertion({
      sourceId: 'source-1',
      externalId: 'english-only',
      images: ['https://images.test/unshared.png'],
      englishName: 'Pikachu',
    }),
    assertion({
      sourceId: 'source-1',
      externalId: 'shared-image-a',
      images: ['https://images.test/shared.png'],
      englishName: 'Bulbasaur',
    }),
    assertion({
      sourceId: 'source-2',
      externalId: 'shared-image-b',
      images: ['https://images.test/shared.png'],
      englishName: 'Bulbasaur',
    }),
  ];

  return {
    parents,
    identityRows: [],
    evidenceRows,
    printingRows: [
      {
        card_printing_id: 'printing-1',
        card_print_id: 'parent-1',
        printing_gv_id: 'GV-PK-JPN-A-001-STD',
        finish_key: 'normal',
      },
    ],
    familyReviewRows: [],
    jpnSpeciesLinks: [
      {
        card_print_species_id: 'jpn-link-1',
        card_print_id: 'parent-1',
        species_id: 'species-bulbasaur',
        role: 'primary',
        active: true,
      },
      {
        card_print_species_id: 'jpn-link-2',
        card_print_id: 'parent-2',
        species_id: 'species-pikachu',
        role: 'primary',
        active: true,
      },
    ],
    speciesRows,
    englishFamilyCards: [
      {
        card_print_id: 'english-1',
        gv_id: 'GV-PK-BASE-044',
        name: 'Bulbasaur',
        set_code: 'base1',
        number: '044',
      },
    ],
    englishFamilySpeciesLinks: [
      {
        card_print_species_id: 'english-link-1',
        card_print_id: 'english-1',
        species_id: 'species-bulbasaur',
        role: 'primary',
        active: true,
      },
    ],
    registryEntries: [
      {
        registry_key: 'jpn-a',
        live_set_code_aliases: ['jpn-a'],
      },
    ],
    aliases: [
      {
        alias_value: 'A',
        normalized_alias_value: 'a',
        ambiguous: false,
        registry_key: 'jpn-a',
      },
    ],
    sourceAssertions: [{ laneId: 'fixture', assertions }],
  };
}

test('candidate resolver conservatively joins existing Japanese identities', () => {
  const result = buildJapaneseCandidateUnion(fixture());
  const resolutionByExternalId = new Map(
    result.assertionResolutions.map((row) => {
      const source = result.sourceAssertionUnion.find(
        (union) => union.assertion_key === row.assertion_key,
      );
      return [source.source_external_id, row];
    }),
  );

  assert.equal(
    resolutionByExternalId.get('exact-name').existing_card_print_id,
    'parent-1',
  );
  assert.equal(
    resolutionByExternalId.get('exact-name').resolution_method,
    'existing_exact_set_number_printed_name',
  );
  assert.equal(
    resolutionByExternalId.get('unique-number').existing_card_print_id,
    'parent-2',
  );
  assert.equal(
    resolutionByExternalId.get('exact-parent-image').existing_card_print_id,
    'parent-1',
  );
});

test('multipart source cannot join a single parent by number, name or identical image', () => {
  for(const legacy of [true,false]) {
    const input=fixture();
    const source=assertion({sourceId:'official_jp_cards',externalId:`multipart-${legacy}`,number:'001',
      printedName:input.parents[0].printed_name,images:[input.parents[0].image_url]});
    source.category='V-UNION';
    if(!legacy)source.source_fields={card_representation_kind:'multi_part_card_assembly',requires_component_reconciliation:true};
    input.sourceAssertions=[{laneId:'official',assertions:[source]}];
    const result=buildJapaneseCandidateUnion(input),row=result.assertionResolutions.find(r=>r.assertion_key===source.assertion_key);
    assert.equal(row.existing_card_print_id,null);
    assert.equal(row.resolution_status,'multipart_assembly_requires_component_reconciliation');
    const candidate=result.identityCandidates.find(c=>c.candidate_key===row.candidate_key);
    assert.equal(candidate.promotion_status,'review_required');
    assert.equal(candidate.candidate_kind,'source_isolated_multipart_assembly');
  }
});

test('English name alone never links an unnumbered assertion to a parent', () => {
  const result = buildJapaneseCandidateUnion(fixture());
  const union = result.sourceAssertionUnion.find(
    (row) => row.source_external_id === 'english-only',
  );
  assert.equal(union.projected_existing_card_print_id, null);
  assert.equal(union.resolution_status, 'source_isolated_unnumbered');
});

test('duplicate numbered assertions from one source remain unresolved', () => {
  const result = buildJapaneseCandidateUnion(fixture());
  const duplicateRows = result.sourceAssertionUnion.filter(
    (row) => row.source_external_id?.startsWith('duplicate-4-'),
  );
  assert.equal(duplicateRows.length, 2);
  assert.ok(duplicateRows.every(
    (row) => row.resolution_status === 'ambiguous_novel_numbered_group',
  ));
  assert.ok(result.conflicts.some(
    (row) => (
      row.conflict_type === 'numbered_identity_group_ambiguous'
      && row.findings.includes('duplicate_number_within_source')
    ),
  ));
});

test('cross-source exact image may form one unnumbered candidate', () => {
  const result = buildJapaneseCandidateUnion(fixture());
  const rows = result.sourceAssertionUnion.filter(
    (row) => row.source_external_id?.startsWith('shared-image-'),
  );
  assert.equal(rows.length, 2);
  assert.equal(rows[0].projected_candidate_key, rows[1].projected_candidate_key);
  assert.equal(
    rows[0].resolution_status,
    'novel_unnumbered_exact_image_candidate',
  );
});

test('novel family projection uses exact linked evidence and does not promote', () => {
  const result = buildJapaneseCandidateUnion(fixture());
  const novel = result.identityCandidates.find(
    (row) => (
      row.candidate_kind === 'novel_numbered'
      && row.number_core === '3'
    ),
  );
  assert.ok(novel);
  const projection = result.familyProjectionRows.find(
    (row) => row.candidate_key === novel.candidate_key,
  );
  assert.equal(projection.projection_status, 'projected_exact');
  assert.equal(projection.species_id, 'species-bulbasaur');
  assert.ok(result.familySpeciesLinks.some(
    (row) => (
      row.family_card_key === novel.candidate_key
      && row.link_status === 'projected_only_not_promoted'
    ),
  ));
});

test('combined family graph preserves English and Japanese existing nodes', () => {
  const result = buildJapaneseCandidateUnion(fixture());
  assert.ok(result.familyCardNodes.some(
    (row) => row.family_card_key === 'existing:english-1',
  ));
  assert.ok(result.familyCardNodes.some(
    (row) => row.family_card_key === 'existing:parent-1',
  ));
  assert.ok(result.familySpeciesLinks.some(
    (row) => row.family_link_key === 'existing-en:english-link-1',
  ));
  assert.ok(result.familySpeciesLinks.some(
    (row) => row.family_link_key === 'existing-ja:jpn-link-1',
  ));
});

function singleAssertion(input, row) {
  input.sourceAssertions = [{ laneId: 'fixture', assertions: [row] }];
  return buildJapaneseCandidateUnion(input);
}

test('a conflicting Japanese name cannot join through unique coordinate or shared image', () => {
  const result = singleAssertion(fixture(), assertion({
    sourceId: 'source-1', externalId: 'wrong-name', number: '001',
    printedName: 'ピカチュウ', images: ['https://images.test/parent-1.png'],
    finishLabels: ['holo'],
  }));
  assert.equal(result.assertionResolutions[0].resolution_status, 'conflicting_existing_parent');
  assert.equal(result.assertionResolutions[0].candidate_key, null);
  assert.equal(result.summary.novel_index_candidate_count, 0);
  assert.ok(result.identityCandidates.every((row) => row.assertion_keys.length === 0));
  assert.ok(!result.conflicts.some((row) => row.conflict_type === 'existing_printing_finish_gap'));
});

test('a shared image cannot collapse a lettered printing number to its ordinary counterpart', () => {
  const row = assertion({ sourceId: 'source-1', externalId: 'suffix', number: '001-A',
    printedName: 'フシギダネ', images: ['https://images.test/parent-1.png'] });
  const result = singleAssertion(fixture(), row);
  assert.equal(result.assertionResolutions[0].resolution_status, 'conflicting_existing_parent');
  assert.equal(result.assertionResolutions[0].existing_card_print_id, null);
});

test('lettered numbered cards remain separate candidates when no conflicting image is supplied', () => {
  const result = singleAssertion(fixture(), assertion({
    sourceId: 'source-1', externalId: 'suffix', number: '001-A', printedName: 'フシギダネ',
  }));
  assert.equal(result.assertionResolutions[0].resolution_status, 'novel_numbered_candidate');
  assert.equal(result.assertionResolutions[0].number_core, '1A');
});

test('active original Japanese name is retained alongside an English normalized display name', () => {
  const input = fixture();
  input.parents[0].printed_name = 'Bulbasaur';
  input.identityRows = [{ card_print_id: 'parent-1', is_active: true,
    normalized_printed_name: 'Bulbasaur', source_name_raw: 'フシギダネ' }];
  const result = singleAssertion(input, assertion({ sourceId: 'source-1', externalId: 'raw-name',
    number: '001', printedName: 'フシギダネ' }));
  assert.equal(result.assertionResolutions[0].resolution_method, 'existing_exact_set_number_printed_name');
});

test('product-container assertions cannot create novel cards over an existing printed-set coordinate', () => {
  const input = fixture();
  input.registryEntries.push({ registry_key: 'jpn-product-fixture', live_set_code_aliases: [] });
  const row = { ...assertion({ sourceId: 'source-1', externalId: 'product', number: '001',
    printedName: 'フシギダネ' }), registry_key: 'jpn-product-fixture', source_set_code: 'A' };
  const result = singleAssertion(input, row);
  assert.equal(result.assertionResolutions[0].resolution_status, 'existing_printed_coordinate_requires_review');
  assert.equal(result.summary.novel_index_candidate_count, 0);
  assert.equal(result.assertionResolutions[0].existing_card_print_id, null);
  const conflict = result.conflicts.find((item) => item.conflict_type === 'printed_set_product_context_requires_reconciliation');
  assert.deepEqual(conflict.candidate_card_print_ids, ['parent-1']);
  assert.deepEqual(conflict.name_matching_card_print_ids, ['parent-1']);
});

test('genuinely new product coordinates remain candidates, not suppressed by a different registry', () => {
  const input = fixture();
  input.registryEntries.push({ registry_key: 'jpn-product-fixture', live_set_code_aliases: [] });
  const result = singleAssertion(input, { ...assertion({ sourceId: 'source-1', externalId: 'new',
    number: '099', printedName: 'フシギダネ' }), registry_key: 'jpn-product-fixture', source_set_code: 'A' });
  assert.equal(result.assertionResolutions[0].resolution_status, 'novel_numbered_candidate');
  assert.equal(result.assertionResolutions[0].registry_key, 'jpn-product-fixture');
});
