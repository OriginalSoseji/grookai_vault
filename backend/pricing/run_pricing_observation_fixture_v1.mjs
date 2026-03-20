import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

import { categorizeListing, detectGradedSignal } from './ebay_browse_prices_worker.mjs';
import { insertPricingObservations } from './pricing_observation_layer_v1.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const FIXTURE_PATH = path.join(__dirname, 'fixtures', 'pricing_observation_fixture_v1.json');
const FIXTURE_PREFIX = 'fixture_v1_';

function parseArgs(argv) {
  return {
    cleanup: argv.includes('--cleanup'),
  };
}

function parseSupabaseStatusEnv(output) {
  const env = {};
  for (const rawLine of output.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || !line.includes('=')) {
      continue;
    }
    const [key, ...rest] = line.split('=');
    const joined = rest.join('=').trim();
    env[key] = joined.replace(/^"/, '').replace(/"$/, '');
  }
  return env;
}

function loadLocalSupabaseEnv() {
  const output = execFileSync('supabase', ['status', '-o', 'env'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const env = parseSupabaseStatusEnv(output);
  if (!env.API_URL || !env.SERVICE_ROLE_KEY || !env.DB_URL) {
    throw new Error('[fixture_v1] local Supabase env not available. Start local Supabase first.');
  }
  return env;
}

function createLocalSupabaseClient(env) {
  return createClient(env.API_URL, env.SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function createLinkedSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error('[fixture_v1] linked Supabase env is not available');
  }
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function normalizeTargetRow(row) {
  const totalCards = row.total_cards === null || row.total_cards === undefined
    ? null
    : String(row.total_cards).trim() || null;
  const numberPlain = String(row.number_plain).trim();
  return {
    id: row.id,
    name: row.name,
    rarity: row.rarity ?? null,
    number_plain: numberPlain,
    set_id: row.set_id,
    set_name: row.set_name,
    set_code: row.set_code,
    total_cards: totalCards,
  };
}

function buildTargetContext(target, fixtureExternalId) {
  const totalCards = target.total_cards ? String(target.total_cards).trim() : null;
  const numberDescriptor = totalCards ? `${target.number_plain}/${totalCards}` : target.number_plain;
  return {
    fixture_external_id: fixtureExternalId,
    card_print_id: target.id,
    name: target.name,
    set_name: target.set_name ?? '',
    set_code: target.set_code ?? '',
    set_code_upper: (target.set_code ?? '').toUpperCase(),
    number_plain: target.number_plain ?? '',
    number_descriptor: numberDescriptor,
  };
}

function interpolateTemplate(template, context) {
  if (typeof template !== 'string') {
    return template;
  }
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key) => {
    return Object.prototype.hasOwnProperty.call(context, key) ? String(context[key] ?? '') : '';
  });
}

function buildFixtureListing(boundFixture) {
  return {
    itemId: boundFixture.external_id,
    title: boundFixture.title,
    price: boundFixture.price,
    currency: boundFixture.currency,
    condition: boundFixture.condition_raw,
    conditionDescription: boundFixture.condition_raw,
    itemCondition: boundFixture.condition_raw,
    buyingOptions: boundFixture.listing_type ? [boundFixture.listing_type] : [],
    shippingCost: boundFixture.shipping,
    raw: {
      fixture_v1: true,
      fixture_id: boundFixture.fixture_id,
      category: boundFixture.category,
      itemId: boundFixture.external_id,
      itemWebUrl: boundFixture.listing_url,
      title: boundFixture.title,
      condition: boundFixture.condition_raw,
      listingType: boundFixture.listing_type,
      ...boundFixture.raw_payload,
    },
  };
}

function buildObservationFromFixture(boundFixture, decision) {
  const resolvedCardPrintId = decision.mappingStatus === 'mapped' ? boundFixture.target.id : null;

  return {
    card_print_id: resolvedCardPrintId,
    source: 'ebay',
    external_id: boundFixture.external_id,
    listing_url: boundFixture.listing_url,
    title: boundFixture.title,
    price: boundFixture.price,
    shipping: boundFixture.shipping,
    currency: boundFixture.currency,
    condition_raw: boundFixture.condition_raw,
    listing_type: boundFixture.listing_type,
    match_confidence: decision.matchConfidence,
    mapping_status: decision.mappingStatus,
    classification: decision.classification,
    condition_bucket: decision.bucket ?? null,
    exclusion_reason: decision.exclusionReason ?? null,
    observed_at: boundFixture.observed_at,
    raw_payload: {
      fixture_v1: true,
      fixture_id: boundFixture.fixture_id,
      category: boundFixture.category,
      target_key: boundFixture.target_key,
      expected_mapping_status: boundFixture.expected_mapping_status,
      expected_classification: boundFixture.expected_classification,
      expected_condition_bucket: boundFixture.expected_condition_bucket ?? null,
      bound_target: {
        card_print_id: boundFixture.target.id,
        name: boundFixture.target.name,
        set_code: boundFixture.target.set_code,
        number_plain: boundFixture.target.number_plain,
      },
      listing: boundFixture.raw_payload ?? {},
    },
  };
}

async function getCandidateRows(query) {
  const { data, error } = await query;
  if (error) {
    throw new Error(`[fixture_v1] candidate query failed: ${error.message}`);
  }
  return (data ?? []).map((row) => normalizeTargetRow({
    ...row,
    set_name: row?.set?.name ?? null,
    total_cards: null,
  }));
}

async function selectTarget(supabase, label, queryBuilders, chosenIds) {
  for (const builder of queryBuilders) {
    const rows = await getCandidateRows(builder(supabase));
    for (const row of rows) {
      if (chosenIds.has(row.id)) {
        continue;
      }
      chosenIds.add(row.id);
      console.log(`[fixture_v1] selected ${label}: ${row.name} | ${row.set_code} | #${row.number_plain} | ${row.id}`);
      return row;
    }
  }
  throw new Error(`[fixture_v1] unable to resolve target ${label}`);
}

async function selectTargets(supabase) {
  const chosenIds = new Set();
  return {
    base_primary: await selectTarget(supabase, 'base_primary', [
      (client) => client
        .from('card_prints')
        .select('id,name,rarity,number_plain,set_id,set_code,set:sets(name)')
        .eq('name', 'Charizard')
        .eq('set_code', 'base1')
        .eq('number_plain', '4')
        .limit(20),
      (client) => client
        .from('card_prints')
        .select('id,name,rarity,number_plain,set_id,set_code,set:sets(name)')
        .eq('set_code', 'base1')
        .eq('number_plain', '4')
        .limit(20),
      (client) => client
        .from('card_prints')
        .select('id,name,rarity,number_plain,set_id,set_code,set:sets(name)')
        .eq('set_code', 'base1')
        .not('number_plain', 'is', null)
        .limit(50),
    ], chosenIds),
    promo_primary: await selectTarget(supabase, 'promo_primary', [
      (client) => client
        .from('card_prints')
        .select('id,name,rarity,number_plain,set_id,set_code,set:sets(name)')
        .eq('name', 'Pikachu')
        .eq('set_code', 'swshp')
        .not('number_plain', 'is', null)
        .limit(50),
      (client) => client
        .from('card_prints')
        .select('id,name,rarity,number_plain,set_id,set_code,set:sets(name)')
        .eq('name', 'Pikachu')
        .eq('set_code', 'svp')
        .not('number_plain', 'is', null)
        .limit(50),
      (client) => client
        .from('card_prints')
        .select('id,name,rarity,number_plain,set_id,set_code,set:sets(name)')
        .in('set_code', ['swshp', 'svp'])
        .not('number_plain', 'is', null)
        .limit(100),
    ], chosenIds),
    modern_primary: await selectTarget(supabase, 'modern_primary', [
      (client) => client
        .from('card_prints')
        .select('id,name,rarity,number_plain,set_id,set_code,set:sets(name)')
        .eq('name', 'Pikachu')
        .eq('set_code', 'sv02')
        .not('number_plain', 'is', null)
        .limit(50),
      (client) => client
        .from('card_prints')
        .select('id,name,rarity,number_plain,set_id,set_code,set:sets(name)')
        .eq('name', 'Pikachu')
        .like('set_code', 'sv%')
        .neq('set_code', 'svp')
        .not('number_plain', 'is', null)
        .limit(100),
      (client) => client
        .from('card_prints')
        .select('id,name,rarity,number_plain,set_id,set_code,set:sets(name)')
        .like('set_code', 'sv%')
        .not('number_plain', 'is', null)
        .limit(100),
      (client) => client
        .from('card_prints')
        .select('id,name,rarity,number_plain,set_id,set_code,set:sets(name)')
        .like('set_code', 'swsh%')
        .not('number_plain', 'is', null)
        .limit(100),
    ], chosenIds),
    secondary_primary: await selectTarget(supabase, 'secondary_primary', [
      (client) => client
        .from('card_prints')
        .select('id,name,rarity,number_plain,set_id,set_code,set:sets(name)')
        .eq('name', 'Gyarados')
        .eq('set_code', 'base1')
        .eq('number_plain', '6')
        .limit(50),
      (client) => client
        .from('card_prints')
        .select('id,name,rarity,number_plain,set_id,set_code,set:sets(name)')
        .eq('set_code', 'base1')
        .eq('number_plain', '6')
        .limit(50),
      (client) => client
        .from('card_prints')
        .select('id,name,rarity,number_plain,set_id,set_code,set:sets(name)')
        .not('number_plain', 'is', null)
        .limit(100),
    ], chosenIds),
    base_secondary: await selectTarget(supabase, 'base_secondary', [
      (client) => client
        .from('card_prints')
        .select('id,name,rarity,number_plain,set_id,set_code,set:sets(name)')
        .eq('name', 'Blastoise')
        .eq('set_code', 'base1')
        .eq('number_plain', '2')
        .limit(50),
      (client) => client
        .from('card_prints')
        .select('id,name,rarity,number_plain,set_id,set_code,set:sets(name)')
        .eq('set_code', 'base1')
        .eq('number_plain', '2')
        .limit(50),
      (client) => client
        .from('card_prints')
        .select('id,name,rarity,number_plain,set_id,set_code,set:sets(name)')
        .eq('name', 'Blastoise')
        .not('number_plain', 'is', null)
        .limit(100),
    ], chosenIds),
  };
}

async function cleanupFixtureRows(supabase) {
  const { error } = await supabase
    .from('pricing_observations')
    .delete()
    .like('external_id', `${FIXTURE_PREFIX}%`);
  if (error) {
    throw new Error(`[fixture_v1] cleanup failed: ${error.message}`);
  }
}

async function loadFixtures() {
  const raw = await fs.readFile(FIXTURE_PATH, 'utf8');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error('[fixture_v1] fixture file must contain an array');
  }
  return parsed;
}

function bindFixtureRow(fixture, targets) {
  const target = targets[fixture.target_key];
  if (!target) {
    throw new Error(`[fixture_v1] unknown target_key ${fixture.target_key}`);
  }
  const externalId = `${FIXTURE_PREFIX}${fixture.fixture_id}`;
  const context = buildTargetContext(target, externalId);
  return {
    ...fixture,
    target,
    external_id: externalId,
    observed_at: new Date().toISOString(),
    listing_url: interpolateTemplate(fixture.listing_url_template ?? '', context),
    title: interpolateTemplate(fixture.title_template ?? '', context),
    raw_payload: {
      fixture_v1: true,
      fixture_id: fixture.fixture_id,
      target_key: fixture.target_key,
      interpolated_title: interpolateTemplate(fixture.title_template ?? '', context),
    },
  };
}

async function fetchFixtureRows(supabase) {
  const rows = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await supabase
      .from('pricing_observations')
      .select('id,card_print_id,source,external_id,title,price,shipping,currency,condition_raw,listing_type,match_confidence,mapping_status,classification,condition_bucket,exclusion_reason,observed_at,created_at')
      .like('external_id', `${FIXTURE_PREFIX}%`)
      .order('external_id', { ascending: true })
      .range(from, from + 499);
    if (error) {
      throw new Error(`[fixture_v1] fixture read failed: ${error.message}`);
    }
    if (!data || data.length === 0) {
      break;
    }
    rows.push(...data);
    if (data.length < 500) {
      break;
    }
  }
  return rows;
}

function sortDistributionRows(rows) {
  return rows.sort((a, b) => {
    const classCmp = String(a.classification).localeCompare(String(b.classification));
    if (classCmp !== 0) {
      return classCmp;
    }
    return String(a.mapping_status).localeCompare(String(b.mapping_status));
  });
}

function sortAcceptedByCard(rows) {
  return rows.sort((a, b) => {
    if (b.count !== a.count) {
      return b.count - a.count;
    }
    return String(a.card_print_id).localeCompare(String(b.card_print_id));
  });
}

async function runValidationQueries(supabase) {
  const fixtureRows = await fetchFixtureRows(supabase);
  const distributionMap = new Map();
  const acceptedByCardMap = new Map();

  for (const row of fixtureRows) {
    const distributionKey = `${row.classification}::${row.mapping_status}`;
    distributionMap.set(distributionKey, {
      classification: row.classification,
      mapping_status: row.mapping_status,
      count: (distributionMap.get(distributionKey)?.count ?? 0) + 1,
    });

    if (row.classification === 'accepted' && row.card_print_id) {
      acceptedByCardMap.set(row.card_print_id, {
        card_print_id: row.card_print_id,
        count: (acceptedByCardMap.get(row.card_print_id)?.count ?? 0) + 1,
      });
    }
  }

  const acceptedNotMapped = fixtureRows.filter(
    (row) => row.classification === 'accepted' && row.mapping_status !== 'mapped',
  ).length;

  const nonNullCardIds = Array.from(
    new Set(fixtureRows.map((row) => row.card_print_id).filter(Boolean)),
  );

  let auditView = [];
  if (nonNullCardIds.length > 0) {
    const { data, error } = await supabase
      .from('v_pricing_observation_audit')
      .select('card_print_id,classification,mapping_status,listing_count,avg_confidence,min_price,max_price')
      .in('card_print_id', nonNullCardIds)
      .order('card_print_id', { ascending: true });
    if (error) {
      throw new Error(`[fixture_v1] audit view read failed: ${error.message}`);
    }
    auditView = data ?? [];
  }

  return {
    fixtureRows,
    totalInserted: [{ count: fixtureRows.length }],
    distribution: sortDistributionRows(Array.from(distributionMap.values())),
    acceptedNotMapped: [{ count: acceptedNotMapped }],
    acceptedByCard: sortAcceptedByCard(Array.from(acceptedByCardMap.values())),
    stagedSample: fixtureRows
      .filter((row) => row.classification === 'staged')
      .slice(0, 5)
      .map(({ external_id, title, classification, mapping_status, exclusion_reason }) => ({
        external_id,
        title,
        classification,
        mapping_status,
        exclusion_reason,
      })),
    rejectedSample: fixtureRows
      .filter((row) => row.classification === 'rejected')
      .slice(0, 5)
      .map(({ external_id, title, classification, mapping_status, exclusion_reason }) => ({
        external_id,
        title,
        classification,
        mapping_status,
        exclusion_reason,
      })),
    auditView,
  };
}

function summarizeExpectations(boundFixtures, actualRows) {
  const actualByExternalId = new Map(
    actualRows.map((row) => [row.external_id, row]),
  );

  const mismatches = [];
  for (const fixture of boundFixtures) {
    const actual = actualByExternalId.get(fixture.external_id);
    if (!actual) {
      mismatches.push({
        fixture_id: fixture.fixture_id,
        issue: 'missing_insert',
      });
      continue;
    }

    const gradedSignal = detectGradedSignal(fixture.title ?? '');
    const expectedIsGraded = fixture.expected_is_graded;
    const expectedBucket = fixture.expected_condition_bucket ?? null;
    const actualBucket = actual.condition_bucket ?? null;
    if (
      actual.mapping_status !== fixture.expected_mapping_status ||
      actual.classification !== fixture.expected_classification ||
      actualBucket !== expectedBucket ||
      (typeof expectedIsGraded === 'boolean' && gradedSignal.isGraded !== expectedIsGraded)
    ) {
      mismatches.push({
        fixture_id: fixture.fixture_id,
        expected_mapping_status: fixture.expected_mapping_status,
        actual_mapping_status: actual.mapping_status,
        expected_classification: fixture.expected_classification,
        actual_classification: actual.classification,
        expected_condition_bucket: expectedBucket,
        actual_condition_bucket: actualBucket,
        expected_is_graded: typeof expectedIsGraded === 'boolean' ? expectedIsGraded : undefined,
        actual_is_graded: gradedSignal.isGraded,
        actual_graded_tier: gradedSignal.tier,
      });
    }
  }

  return {
    inserted: actualRows.length,
    expected: boundFixtures.length,
    mismatch_count: mismatches.length,
    mismatches,
  };
}

function printJsonBlock(label, value) {
  console.log(`\n[fixture_v1] ${label}`);
  console.log(JSON.stringify(value, null, 2));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  let supabase = null;
  let executionContext = 'local';

  try {
    const localEnv = loadLocalSupabaseEnv();
    const localClient = createLocalSupabaseClient(localEnv);
    const { count, error } = await localClient
      .from('card_prints')
      .select('*', { count: 'exact', head: true });
    if (error) {
      throw new Error(error.message);
    }
    if ((count ?? 0) > 0) {
      supabase = localClient;
      executionContext = 'local';
    }
  } catch {
    supabase = null;
  }

  if (!supabase) {
    supabase = createLinkedSupabaseClient();
    executionContext = 'linked';
  }

  if (args.cleanup) {
    await cleanupFixtureRows(supabase);
    console.log(`[fixture_v1] cleanup complete (${executionContext})`);
    return;
  }

  console.log(`[fixture_v1] using ${executionContext} Supabase only; no eBay API calls will be made`);
  const targets = await selectTargets(supabase);
  printJsonBlock('targets_used', targets);

  await cleanupFixtureRows(supabase);

  const fixtures = await loadFixtures();
  const boundFixtures = fixtures.map((fixture) => bindFixtureRow(fixture, targets));

  const observations = boundFixtures.map((fixture) => {
    const listing = buildFixtureListing(fixture);
    const decision = categorizeListing(listing, {
      dryRun: false,
      debug: false,
      print: fixture.target,
    });
    return buildObservationFromFixture(fixture, decision);
  });

  const insertedRows = await insertPricingObservations(supabase, observations);
  const expectationSummary = summarizeExpectations(boundFixtures, insertedRows);
  const validationResults = await runValidationQueries(supabase);
  const slabSignalResults = boundFixtures
    .filter((fixture) => typeof fixture.expected_is_graded === 'boolean')
    .map((fixture) => {
      const gradedSignal = detectGradedSignal(fixture.title ?? '');
      return {
        fixture_id: fixture.fixture_id,
        title: fixture.title,
        expected_is_graded: fixture.expected_is_graded,
        actual_is_graded: gradedSignal.isGraded,
        actual_graded_tier: gradedSignal.tier,
        actual_graded_reason: gradedSignal.reason,
      };
    });

  const explainabilityTargetIds = validationResults.acceptedByCard
    .slice(0, 2)
    .map((row) => row.card_print_id)
    .filter(Boolean);

  const explainability = {};
  for (const cardPrintId of explainabilityTargetIds) {
    const { data, error } = await supabase
      .from('v_pricing_observations_accepted')
      .select('external_id,title,condition_bucket,price,shipping,total_price,match_confidence')
      .like('external_id', `${FIXTURE_PREFIX}%`)
      .eq('card_print_id', cardPrintId)
      .order('observed_at', { ascending: false });
    if (error) {
      throw new Error(`[fixture_v1] explainability read failed: ${error.message}`);
    }
    explainability[cardPrintId] = data ?? [];
  }

  printJsonBlock('execution_context', { context: executionContext });
  printJsonBlock('expectation_summary', expectationSummary);
  printJsonBlock('validation_total_inserted', validationResults.totalInserted);
  printJsonBlock('validation_distribution', validationResults.distribution);
  printJsonBlock('validation_accepted_not_mapped', validationResults.acceptedNotMapped);
  printJsonBlock('validation_accepted_by_card', validationResults.acceptedByCard);
  printJsonBlock('validation_staged_sample', validationResults.stagedSample);
  printJsonBlock('validation_rejected_sample', validationResults.rejectedSample);
  printJsonBlock('validation_audit_view', validationResults.auditView);
  printJsonBlock('slab_signal_results', slabSignalResults);
  printJsonBlock('explainability_sample', explainability);
}

main().catch((error) => {
  console.error('[fixture_v1] runner failed:', error);
  process.exitCode = 1;
});
