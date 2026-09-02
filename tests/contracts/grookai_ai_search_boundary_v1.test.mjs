import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const ts = require('typescript');

function loadTsModule(relativePath, mocks = {}) {
  const source = readFileSync(new URL(relativePath, import.meta.url), 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
    },
  }).outputText;

  const module = { exports: {} };
  const sandbox = {
    module,
    exports: module.exports,
    process,
    require: (id) => mocks[id] ?? require(id),
  };
  vm.runInNewContext(transpiled, sandbox, { filename: relativePath });
  return module.exports;
}

test('Grookai Search parses collector language without requiring AI', () => {
  const { buildSmartSearchIntent } = loadTsModule('../../apps/web/src/lib/search/smartSearchIntent.ts');

  const intent = buildSmartSearchIntent('Give me all reverse holos, pikachus, from 2014-2026');

  assert.equal(intent.residualQuery, 'pikachu');
  assert.equal(intent.releaseYearMin, 2014);
  assert.equal(intent.releaseYearMax, 2026);
  assert.deepEqual(Array.from(intent.finishKeys), ['reverse']);
  assert.ok(intent.interpretedLabels.includes('Reverse Holo'));
  assert.ok(intent.interpretedLabels.includes('2014-2026'));
});

test('Grookai Search maps collector parallel language to live finish keys', () => {
  const { buildSmartSearchIntent } = loadTsModule('../../apps/web/src/lib/search/smartSearchIntent.ts');

  const pokeBall = buildSmartSearchIntent('Poke Ball reverse Pikachu');
  const masterBall = buildSmartSearchIntent('Master Ball reverse Pikachu');

  assert.deepEqual(Array.from(pokeBall.finishKeys), ['pokeball']);
  assert.equal(pokeBall.residualQuery, 'Pikachu');
  assert.deepEqual(Array.from(masterBall.finishKeys), ['masterball']);
  assert.equal(masterBall.residualQuery, 'Pikachu');

  const plainPokeBall = buildSmartSearchIntent('Exeggutor Poké Ball');
  const plainMasterBall = buildSmartSearchIntent('Pikachu Master Ball');
  assert.deepEqual(Array.from(plainPokeBall.finishKeys), ['pokeball']);
  assert.equal(plainPokeBall.residualQuery, 'Exeggutor');
  assert.deepEqual(Array.from(plainMasterBall.finishKeys), ['masterball']);
  assert.equal(plainMasterBall.residualQuery, 'Pikachu');

  const pokeBallCard = buildSmartSearchIntent('Poké Ball');
  const masterBallCard = buildSmartSearchIntent('Master Ball card');
  assert.deepEqual(Array.from(pokeBallCard.finishKeys), []);
  assert.equal(pokeBallCard.residualQuery, 'Poké Ball');
  assert.deepEqual(Array.from(masterBallCard.finishKeys), []);
  assert.equal(masterBallCard.residualQuery, 'Master Ball');
});

test('Grookai Search preserves name, year, and finish intent across TCGs', () => {
  const { buildSmartSearchIntent } = loadTsModule('../../apps/web/src/lib/search/smartSearchIntent.ts');

  const pokemon = buildSmartSearchIntent('Gengar 2000-2024 reverse holo');
  assert.equal(pokemon.residualQuery, 'Gengar');
  assert.equal(pokemon.releaseYearMin, 2000);
  assert.equal(pokemon.releaseYearMax, 2024);
  assert.deepEqual(Array.from(pokemon.finishKeys), ['reverse']);

  const magic = buildSmartSearchIntent('Lightning Bolt 1993-2024 foil');
  assert.equal(magic.residualQuery, 'Lightning Bolt');
  assert.equal(magic.releaseYearMin, 1993);
  assert.equal(magic.releaseYearMax, 2024);
  assert.deepEqual(Array.from(magic.finishKeys), ['foil']);

  const setLanguage = buildSmartSearchIntent('Charizard from 151');
  assert.equal(setLanguage.residualQuery, 'Charizard from 151');

  const canonicalName = buildSmartSearchIntent('Mail from Bill');
  assert.equal(canonicalName.residualQuery, 'Mail from Bill');
});

test('Grookai Search parses plain artist and illustrator year-range language', () => {
  const { buildSmartSearchIntent } = loadTsModule('../../apps/web/src/lib/search/smartSearchIntent.ts');
  const { resolveSmartSearchQuery } = loadTsModule('../../apps/web/src/lib/search/resolveSmartSearchQuery.ts');

  const artist = buildSmartSearchIntent('artist Ken Sugimori 1999-2003');
  assert.equal(artist.artist, 'Ken Sugimori');
  assert.equal(artist.releaseYearMin, 1999);
  assert.equal(artist.releaseYearMax, 2003);
  assert.equal(artist.residualQuery, '');
  assert.ok(artist.interpretedLabels.includes('Artist: Ken Sugimori'));
  assert.ok(artist.interpretedLabels.includes('1999-2003'));
  assert.equal(resolveSmartSearchQuery('artist Ken Sugimori 1999-2003', artist), '');

  const illustrator = buildSmartSearchIntent('illustrator Mitsuhiro Arita from 2014 to 2026');
  assert.equal(illustrator.artist, 'Mitsuhiro Arita');
  assert.equal(illustrator.releaseYearMin, 2014);
  assert.equal(illustrator.releaseYearMax, 2026);
  assert.equal(illustrator.residualQuery, '');
  assert.ok(illustrator.interpretedLabels.includes('Artist: Mitsuhiro Arita'));
  assert.ok(illustrator.interpretedLabels.includes('2014-2026'));
});

test('Grookai Search recognizes stamp and image worklist language deterministically', () => {
  const { buildSmartSearchIntent } = loadTsModule('../../apps/web/src/lib/search/smartSearchIntent.ts');
  const { resolveSmartSearchQuery } = loadTsModule('../../apps/web/src/lib/search/resolveSmartSearchQuery.ts');

  const stamped = buildSmartSearchIntent('Build-A-Bear stamped Piplup');
  const pokemonCenter = buildSmartSearchIntent('Pokemon Center stamped promos');
  const wbKids = buildSmartSearchIntent('WB Kids stamp Pikachu');
  const wbKidsFamilyOnly = buildSmartSearchIntent('WB Kids stamp');
  const missingImages = buildSmartSearchIntent('cards missing images');

  assert.deepEqual(Array.from(stamped.stampLabels), ['Build-A-Bear Workshop Stamp']);
  assert.equal(stamped.residualQuery, 'Piplup');
  assert.deepEqual(Array.from(pokemonCenter.stampLabels), ['Pokemon Center Stamp']);
  assert.equal(pokemonCenter.residualQuery, '');
  assert.deepEqual(Array.from(wbKids.stampLabels), ['WB Kids Stamp']);
  assert.equal(wbKids.residualQuery, 'Pikachu');
  assert.equal(resolveSmartSearchQuery('WB Kids stamp', wbKidsFamilyOnly), '');
  assert.equal(resolveSmartSearchQuery('WB Kids stamp Pikachu', wbKids), 'Pikachu');
  assert.equal(missingImages.imageState, 'missing');
  assert.ok(missingImages.interpretedLabels.includes('Image: Missing exact image'));
});

test('Grookai Search normalization preserves accented collector labels', () => {
  const { normalizeSearchText } = loadTsModule(
    '../../apps/web/src/lib/search/normalizeSearchText.ts',
  );

  assert.equal(normalizeSearchText('Play Pokémon Stamp'), 'play pokemon stamp');
  assert.equal(normalizeSearchText('Pokémon_Together-Stamp'), 'pokemon together stamp');
});

test('smart structured variant search uses bounded game-aware candidate discovery', () => {
  const route = readFileSync(
    new URL('../../apps/web/src/app/api/resolver/search/route.ts', import.meta.url),
    'utf8',
  );
  const source = readFileSync(
    new URL('../../apps/web/src/lib/explore/getExploreRows.ts', import.meta.url),
    'utf8',
  );

  assert.match(
    route,
    /shouldUseStructuredTextExpansion[\s\S]*getExploreRowsForGameScopedTextSearch\(routedQuery, gameScope, sortMode/,
  );
  assert.match(
    route,
    /inlineSetIntent = resolveGameScopedSetSearchIntent\(query, gameScope\)[\s\S]*effectiveExactSetCode[\s\S]*routedQuery/,
  );
  assert.match(
    source,
    /canUseBoundedGameRpc[\s\S]*search_game_card_prints_v4[\s\S]*fetchSmartDiscoveryChildRows[\s\S]*releaseFilteredRows/,
  );
  assert.match(
    source,
    /gameScope === "one_piece"[\s\S]*punctuationFallback[\s\S]*runBoundedSearch\(punctuationFallback/,
  );
  assert.match(
    source,
    /function trimNonAsciiAlphaNumericBoundaries[\s\S]*while \(start < end[\s\S]*while \(end > start/,
  );
  assert.doesNotMatch(source, /\[\^a-z0-9\]\+\|\[\^a-z0-9\]\+/);
  assert.match(
    source,
    /MAX_STRUCTURED_PARENT_CANDIDATES[\s\S]*offset_in: offset/,
  );
  assert.match(
    source,
    /if \(parentRows\.length === 0\) return \[\];[\s\S]*filterRowsByReleaseYear[\s\S]*fetchSmartDiscoveryChildRows/,
  );
});

test('collector sentence suggestions are scoped to Pokemon, Magic, and One Piece', () => {
  const { getCollectorSearchPresets, getCollectorSearchSuggestions } = loadTsModule(
    '../../apps/web/src/lib/search/collectorSearchSuggestions.ts',
  );

  assert.equal(getCollectorSearchSuggestions('pokemon')[0].query, 'Gengar 2000-2024 reverse holo');
  assert.equal(getCollectorSearchSuggestions('mtg')[0].query, 'Lightning Bolt 1993-2024 foil');
  assert.equal(getCollectorSearchSuggestions('one_piece')[0].query, 'Monkey D. Luffy from OP05');
  assert.equal(getCollectorSearchPresets('mtg')[0].label, 'Lightning Bolt 1993-2024 foil');

  const explore = readFileSync(
    new URL('../../apps/web/src/components/explore/ExplorePageClient.tsx', import.meta.url),
    'utf8',
  );
  assert.match(explore, /buildScopedExploreHref\(`q=\$\{encodeURIComponent\(preset\.query\)\}`\)/);
});

test('inline set language resolves per TCG without corrupting canonical card names', () => {
  const { resolveGameScopedSetSearchIntent } = loadTsModule(
    '../../apps/web/src/lib/publicSets.shared.ts',
    { '@/lib/resolver/shorthand': { SET_SHORTHANDS: {} } },
  );

  const pokemon = resolveGameScopedSetSearchIntent('Charizard from 151', 'pokemon');
  const onePiece = resolveGameScopedSetSearchIntent('Monkey D. Luffy from OP05', 'one_piece');
  const magic = resolveGameScopedSetSearchIntent('Black Lotus from Alpha', 'mtg');
  const canonicalName = resolveGameScopedSetSearchIntent('Mail from Bill', 'pokemon');

  assert.deepEqual(Array.from(pokemon.setCodes), ['sv03.5']);
  assert.equal(pokemon.remainingQuery, 'charizard from');
  assert.deepEqual(Array.from(onePiece.setCodes), ['op05']);
  assert.equal(onePiece.remainingQuery, 'monkey d. luffy from');
  assert.deepEqual(Array.from(magic.setCodes), ['lea']);
  assert.equal(magic.remainingQuery, 'black lotus from');
  assert.deepEqual(Array.from(canonicalName.setCodes), []);
  assert.equal(canonicalName.remainingQuery, 'Mail from Bill');
});

test('Grookai Search keeps canonical variants discoverable when printing coverage is incomplete', () => {
  const { mergeSmartVariantScopeRows } = loadTsModule(
    '../../apps/web/src/lib/search/smartVariantSearchPolicy.ts',
  );
  const parentWithChild = {
    gv_id: 'GV-PK-ONE',
    search_object_type: 'parent_print',
  };
  const parentWithoutChild = {
    gv_id: 'GV-PK-TWO',
    search_object_type: 'parent_print',
  };
  const child = {
    gv_id: 'GV-PK-ONE',
    search_object_type: 'child_printing',
  };

  assert.deepEqual(
    Array.from(
      mergeSmartVariantScopeRows(
        [parentWithChild, parentWithoutChild],
        [child],
        false,
      ),
    ).map((row) => `${row.gv_id}:${row.search_object_type}`),
    ['GV-PK-TWO:parent_print', 'GV-PK-ONE:child_printing'],
  );
  assert.deepEqual(
    Array.from(
      mergeSmartVariantScopeRows(
        [parentWithChild, parentWithoutChild],
        [child],
        true,
      ),
    ).map((row) => `${row.gv_id}:${row.search_object_type}`),
    ['GV-PK-ONE:child_printing'],
  );
});

test('fully applied structured catalog results are not labeled approximate', () => {
  const { classifySmartVariantResolverState } = loadTsModule(
    '../../apps/web/src/lib/search/smartVariantSearchPolicy.ts',
  );
  const intent = {
    residualQuery: 'Pikachu ex Surging Sparks 057',
    finishKeys: [],
    stampLabels: ['Play Pokemon Stamp'],
    unappliedLabels: [],
  };

  assert.equal(
    classifySmartVariantResolverState(1, intent, 'structured_text'),
    'DIRECT_MATCH',
  );
  assert.equal(
    classifySmartVariantResolverState(2, intent, 'structured_text'),
    'WEAK_MATCH',
  );
  assert.equal(
    classifySmartVariantResolverState(1, intent, 'generic'),
    'WEAK_MATCH',
  );
  assert.equal(
    classifySmartVariantResolverState(
      1,
      { ...intent, unappliedLabels: ['Unapplied constraint'] },
      'structured_text',
    ),
    'WEAK_MATCH',
  );
  assert.equal(
    classifySmartVariantResolverState(
      16,
      {
        residualQuery: 'Monkey D. Luffy from OP05',
        finishKeys: [],
        stampLabels: [],
        unappliedLabels: [],
      },
      'structured_text',
      { expectedSetCodes: ['OP05'] },
    ),
    'WEAK_MATCH',
  );

  const route = readFileSync(
    new URL('../../apps/web/src/app/api/resolver/search/route.ts', import.meta.url),
    'utf8',
  );
  const mobile = readFileSync(new URL('../../lib/main.dart', import.meta.url), 'utf8');
  assert.match(
    route,
    /intentSummary:\s*\{[\s\S]*expectedSetCodes,[\s\S]*structuredEvidenceFlags:\s*\{[\s\S]*expectedSet:\s*expectedSetCodes\.length > 0/,
  );
  assert.match(
    mobile,
    /hasAppliedStructuredEvidence[\s\S]*evidence\?\.expectedSet == true[\s\S]*title = 'Refined results'/,
  );
  assert.match(
    mobile,
    /Your set, number, promo, or variant filters were applied\. Multiple cards still match\./,
  );
});

test('Grookai Search recognizes governed special-case identity families deterministically', () => {
  const { buildSmartSearchIntent } = loadTsModule('../../apps/web/src/lib/search/smartSearchIntent.ts');
  const { resolveSmartSearchQuery } = loadTsModule('../../apps/web/src/lib/search/resolveSmartSearchQuery.ts');

  const examples = [
    ['Pokemon Centre stamped Lechonk', 'Pokemon Center Stamp', 'Lechonk'],
    ['PC stamped Lechonk', 'Pokemon Center Stamp', 'Lechonk'],
    ['BAB Piplup', 'Build-A-Bear Workshop Stamp', 'Piplup'],
    ['TRU Piplup', 'Toys R Us Stamp', 'Piplup'],
    ['Dragon Vault stamped Salamence', 'Dragon Vault Stamp', 'Salamence'],
    ['Regional Championships Salamence', 'Regional Championships Stamp', 'Salamence'],
    ['Prize Pack Bronzong', 'Prize Pack Stamp', 'Bronzong'],
    ['Player Rewards crosshatch Fire Energy', 'Player Rewards Crosshatch Stamp', 'Fire Energy'],
    ['W stamp Dark Arbok', 'WOTC Stamp', 'Dark Arbok'],
    ['E3 stamp Pikachu', 'E3 Stamp', 'Pikachu'],
    ['Jungle no symbol Vaporeon', 'No Symbol Error', 'Jungle Vaporeon'],
    ['Base Set Pikachu red cheeks shadowless', 'Red Cheeks', 'Base Set Pikachu'],
    ['Black Flame Ninetales', 'Black Flame Error', 'Ninetales'],
    ['No Damage Ninetales', 'No Damage Error', 'Ninetales'],
    ['D. Fending error Beedrill', 'D. Fending Error', 'Beedrill'],
    ['Sideways Fighting Energy Diglett', 'Sideways Fighting Energy Error', 'Diglett'],
    ['Incorrect Artist Mewtwo', 'Incorrect Artist Variant', 'Mewtwo'],
  ];

  for (const [query, expectedLabel, expectedResidual] of examples) {
    const intent = buildSmartSearchIntent(query);
    assert.ok(
      intent.stampLabels.includes(expectedLabel),
      `${query} should include ${expectedLabel}; got ${intent.stampLabels.join(', ')}`,
    );
    assert.equal(intent.residualQuery, expectedResidual, `${query} residual`);
    assert.equal(resolveSmartSearchQuery(query, intent), expectedResidual);
  }

  const ancientMew = buildSmartSearchIntent('Ancient Mew');
  assert.equal(ancientMew.stampLabels.length, 0);
  assert.equal(ancientMew.residualQuery, 'Ancient Mew');
  assert.equal(resolveSmartSearchQuery('Ancient Mew', ancientMew), 'Ancient Mew');
});

test('Grookai Search composes stamp filters with year, artist, and residual text discovery', () => {
  const source = readFileSync(
    new URL('../../apps/web/src/lib/explore/getExploreRows.ts', import.meta.url),
    'utf8',
  );

  assert.match(source, /function rowMatchesSmartStampLabels/);
  assert.match(source, /function applySmartStampParentFilter/);
  assert.match(
    source,
    /return applySmartStampParentFilter\(parentRows, options\.stampLabels\);/,
  );
  assert.match(
    source,
    /parentRows = applySmartStampParentFilter\(parentRows, options\.stampLabels\);/,
  );
});

test('Grookai Smart Search contract is authoritative and keeps normal search non-AI', () => {
  const index = readFileSync(new URL('../../docs/CONTRACT_INDEX.md', import.meta.url), 'utf8');
  const contract = readFileSync(new URL('../../docs/contracts/GROOKAI_SMART_SEARCH_V1.md', import.meta.url), 'utf8');
  const contractJson = JSON.parse(
    readFileSync(new URL('../../docs/contracts/GROOKAI_SMART_SEARCH_V1.json', import.meta.url), 'utf8'),
  );

  assert.match(index, /\|\s*GROOKAI_SMART_SEARCH_V1\s*\|\s*Active\s*\|/);
  assert.equal(contractJson.status, 'active');
  assert.equal(contractJson.normal_search_ai_model_calls_allowed, false);
  assert.equal(contractJson.db_writes_allowed, false);
  assert.equal(contractJson.migrations_allowed, false);
  assert.match(contract, /Grookai Search must remain free, fast, deterministic, and governed/);
  assert.match(contract, /Normal Search must not call AI models/);
});

test('Grookai Assistant access fails closed unless explicitly enabled and entitled', () => {
  const { resolveGrookaiAssistantAccess } = loadTsModule('../../apps/web/src/lib/ai/grookaiAssistantAccess.ts');
  const originalEnv = { ...process.env };
  const founderEntitlement = {
    tier: 'founder_admin',
    capabilities: {
      canUseFounderTools: true,
      canUseVendorTools: true,
      canUseAssistant: true,
    },
  };

  try {
    delete process.env.GROOKAI_ASSISTANT_ENABLED;
    delete process.env.GROOKAI_ASSISTANT_FREE_TRIAL_ENABLED;

    const disabled = resolveGrookaiAssistantAccess({
      user: { email: 'founder@example.com' },
      mode: 'search_interpretation',
      entitlement: founderEntitlement,
    });
    assert.equal(disabled.allowed, false);
    assert.equal(disabled.reason, 'assistant_disabled');

    process.env.GROOKAI_ASSISTANT_ENABLED = 'true';

    const founder = resolveGrookaiAssistantAccess({
      user: { email: 'founder@example.com' },
      mode: 'search_interpretation',
      entitlement: founderEntitlement,
    });
    assert.equal(founder.allowed, true);
    assert.equal(founder.tier, 'founder_admin');
    assert.equal(founder.reason, 'founder_admin_entitlement');
  } finally {
    process.env = originalEnv;
  }
});

test('Grookai AI runtime guard blocks model calls by default and never allows Search lane model calls', () => {
  const { resolveGrookaiAiRuntimeGuard } = loadTsModule('../../apps/web/src/lib/ai/grookaiAiRuntimeGuard.ts');
  const { resolveGrookaiAssistantCapability } = loadTsModule('../../apps/web/src/lib/ai/grookaiAssistantCapabilities.ts');
  const originalEnv = { ...process.env };
  const entitled = {
    allowed: true,
    tier: 'founder_admin',
    reason: 'founder_admin_entitlement',
    dailyLimit: 100,
    mode: 'search_interpretation',
  };

  try {
    delete process.env.GROOKAI_AI_MODEL_CALLS_ENABLED;

    const disabled = resolveGrookaiAiRuntimeGuard({
      productLane: 'assistant',
      outputType: 'typed_filter_proposal',
      entitlement: entitled,
      capability: resolveGrookaiAssistantCapability('search_interpretation'),
    });
    assert.equal(disabled.modelCallAllowed, false);
    assert.equal(disabled.reason, 'model_calls_disabled');

    process.env.GROOKAI_AI_MODEL_CALLS_ENABLED = 'true';

    const searchLane = resolveGrookaiAiRuntimeGuard({
      productLane: 'search',
      outputType: 'typed_filter_proposal',
      entitlement: entitled,
      capability: resolveGrookaiAssistantCapability('search_interpretation'),
    });
    assert.equal(searchLane.modelCallAllowed, false);
    assert.equal(searchLane.reason, 'unsupported_product_lane');

    const assistantLane = resolveGrookaiAiRuntimeGuard({
      productLane: 'assistant',
      outputType: 'typed_filter_proposal',
      entitlement: entitled,
      capability: resolveGrookaiAssistantCapability('search_interpretation'),
    });
    assert.equal(assistantLane.modelCallAllowed, false);
    assert.equal(assistantLane.reason, 'capability_not_model_eligible');
  } finally {
    process.env = originalEnv;
  }
});

test('planned Assistant capabilities stay blocked until grounded handlers exist', () => {
  const { resolveGrookaiAiRuntimeGuard } = loadTsModule('../../apps/web/src/lib/ai/grookaiAiRuntimeGuard.ts');
  const { resolveGrookaiAssistantCapability } = loadTsModule('../../apps/web/src/lib/ai/grookaiAssistantCapabilities.ts');
  const originalEnv = { ...process.env };
  const entitled = {
    allowed: true,
    tier: 'founder_admin',
    reason: 'founder_admin_entitlement',
    dailyLimit: 100,
    mode: 'variant_explanation',
  };

  try {
    process.env.GROOKAI_AI_MODEL_CALLS_ENABLED = 'true';

    const capability = resolveGrookaiAssistantCapability('variant_explanation');
    const decision = resolveGrookaiAiRuntimeGuard({
      productLane: 'assistant',
      outputType: capability.outputType,
      entitlement: entitled,
      capability,
    });

    assert.equal(capability.status, 'planned_grounding_required');
    assert.equal(capability.groundingRequired, true);
    assert.equal(decision.modelCallAllowed, false);
    assert.equal(decision.reason, 'capability_not_model_eligible');
  } finally {
    process.env = originalEnv;
  }
});

test('variant explanation context route is read-only and grounded in public variant copy', () => {
  const routeSource = readFileSync(
    new URL('../../apps/web/src/app/api/assistant/variant-explanation-context/route.ts', import.meta.url),
    'utf8',
  );
  const generatedCopy = JSON.parse(
    readFileSync(
      new URL('../../apps/web/src/lib/cards/variantOriginPublicCopy.generated.json', import.meta.url),
      'utf8',
    ),
  );
  const buildABear = generatedCopy.families.build_a_bear_workshop_stamp;

  assert.equal(/\.insert\s*\(/i.test(routeSource), false);
  assert.equal(/\.update\s*\(/i.test(routeSource), false);
  assert.equal(/\.upsert\s*\(/i.test(routeSource), false);
  assert.equal(/\.delete\s*\(/i.test(routeSource), false);
  assert.equal(/rpc\s*\(/i.test(routeSource), false);
  assert.equal(typeof buildABear.why_it_exists, 'string');
  assert.equal(typeof buildABear.why_collectors_care, 'string');
  assert.ok(buildABear.why_it_exists.length > 20);
  assert.ok(buildABear.why_collectors_care.length > 20);
});

test('variant explanation builder separates why it exists from why collectors care', () => {
  const { buildGrookaiVariantExplanation } = loadTsModule('../../apps/web/src/lib/ai/grookaiVariantExplanationBuilder.ts');
  const generatedCopy = JSON.parse(
    readFileSync(
      new URL('../../apps/web/src/lib/cards/variantOriginPublicCopy.generated.json', import.meta.url),
      'utf8',
    ),
  );
  const origin = {
    ...generatedCopy.by_gv_id['GV-PK-BASE1-58-RED-CHEEKS-SHADOWLESS'],
    ...generatedCopy.families.base_pikachu_print_run,
  };

  const explanation = buildGrookaiVariantExplanation({
    ok: true,
    boundary_version: 'GROOKAI_AI_PRODUCT_BOUNDARIES_V1',
    product_lane: 'assistant',
    mode: 'variant_explanation',
    output_type: 'grounded_explanation',
    assistant_available: false,
    entitlement: {},
    runtime_guard: {},
    context_status: 'ready',
    card: {
      card_print_id: origin.card_print_id,
      gv_id: origin.gv_id,
      name: 'Pikachu',
      set_name: 'Base Set',
      set_code: 'base1',
      printed_number: '58',
      printed_total: 102,
      rarity: 'Common',
      release_year: 1999,
      artist: null,
      variant_key: origin.variant_key,
      variant_label: 'Shadowless Red Cheeks',
      printed_identity_modifier: origin.printed_identity_modifier,
      printed_identity_modifier_label: 'Shadowless Red Cheeks',
      active_identity: null,
    },
    selected_printing: null,
    image_truth: {},
    ownership: { checked: false, owned_count: null, error: null },
    variant_origin: origin,
    limitations: [],
    safety: {},
  });

  assert.equal(explanation.status, 'ready');
  assert.equal(explanation.why_it_exists, generatedCopy.families.base_pikachu_print_run.why_it_exists);
  assert.equal(explanation.why_collectors_care, generatedCopy.families.base_pikachu_print_run.why_collectors_care);
  assert.notEqual(explanation.why_it_exists, explanation.why_collectors_care);
});
