import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const ts = require('typescript');

function loadTsModule(relativePath) {
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
    require,
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

test('Grookai Search recognizes stamp and image worklist language deterministically', () => {
  const { buildSmartSearchIntent } = loadTsModule('../../apps/web/src/lib/search/smartSearchIntent.ts');

  const stamped = buildSmartSearchIntent('Build-A-Bear stamped Piplup');
  const missingImages = buildSmartSearchIntent('cards missing images');

  assert.deepEqual(Array.from(stamped.stampLabels), ['Build-A-Bear Workshop Stamp']);
  assert.equal(stamped.residualQuery, 'Piplup');
  assert.equal(missingImages.imageState, 'missing');
  assert.ok(missingImages.interpretedLabels.includes('Image: Missing exact image'));
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
