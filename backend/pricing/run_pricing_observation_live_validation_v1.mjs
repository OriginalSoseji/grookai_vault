import '../env.mjs';

import { createBackendClient } from '../supabase_backend_client.mjs';
import {
  getEbayBrowseBudgetSnapshot,
  getEstimatedBrowseCallsPerPricingJob,
  isEbayBrowseBudgetExceededError,
  logEbayBrowseBudgetConfig,
} from '../clients/ebay_browse_budget_v1.mjs';
import { updatePricingForCardPrint } from './ebay_browse_prices_worker.mjs';

const MAX_TARGETS = 5;

function parseArgs(argv) {
  const result = {
    runId: null,
    debug: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--run-id') {
      result.runId = argv[i + 1] ?? null;
      i += 1;
    } else if (arg === '--debug') {
      result.debug = true;
    }
  }

  return result;
}

function buildRunId(explicitRunId = null) {
  if (explicitRunId && String(explicitRunId).trim()) {
    return String(explicitRunId).trim();
  }
  return `live_validation_v1_${new Date().toISOString().replace(/[-:.]/g, '').replace('Z', 'Z')}`;
}

function printJsonBlock(label, value) {
  console.log(`\n[live_validation_v1] ${label}`);
  console.log(JSON.stringify(value, null, 2));
}

function normalizeTargetRow(row) {
  return {
    id: row.id,
    name: row.name,
    rarity: row.rarity ?? null,
    number_plain: row.number_plain ? String(row.number_plain).trim() : null,
    set_id: row.set_id,
    set_name: row?.set?.name ?? row?.set_name ?? null,
    set_code: row.set_code ?? null,
    listing_count: row.listing_count ?? null,
  };
}

async function getCandidateRows(query) {
  const { data, error } = await query;
  if (error) {
    throw new Error(`[live_validation_v1] candidate query failed: ${error.message}`);
  }
  return (data ?? []).map((row) => normalizeTargetRow(row));
}

async function selectTarget(supabase, label, queryBuilders, chosenIds) {
  for (const builder of queryBuilders) {
    const rows = await getCandidateRows(builder(supabase));
    for (const row of rows) {
      if (!row.id || !row.set_code || !row.number_plain || chosenIds.has(row.id)) {
        continue;
      }
      chosenIds.add(row.id);
      console.log(
        `[live_validation_v1] selected ${label}: ${row.name} | ${row.set_code} | #${row.number_plain} | ${row.id}`,
      );
      return row;
    }
  }
  throw new Error(`[live_validation_v1] unable to resolve target ${label}`);
}

async function selectThinMarketTarget(supabase, chosenIds) {
  const { data, error } = await supabase
    .from('card_print_active_prices')
    .select('card_print_id,listing_count')
    .gt('listing_count', 0)
    .lte('listing_count', 2)
    .order('listing_count', { ascending: true })
    .limit(100);

  if (error) {
    throw new Error(`[live_validation_v1] thin-market query failed: ${error.message}`);
  }

  for (const row of data ?? []) {
    const cardPrintId = row.card_print_id;
    if (!cardPrintId || chosenIds.has(cardPrintId)) {
      continue;
    }
    const details = await getCandidateRows(
      supabase
        .from('card_prints')
        .select('id,name,rarity,number_plain,set_id,set_code,set:sets(name)')
        .eq('id', cardPrintId)
        .limit(1),
    );
    const match = details[0];
    if (!match || !match.set_code || !match.number_plain) {
      continue;
    }
    chosenIds.add(match.id);
    console.log(
      `[live_validation_v1] selected thinner_market: ${match.name} | ${match.set_code} | #${match.number_plain} | ${match.id}`,
    );
    return {
      ...match,
      listing_count: row.listing_count,
    };
  }

  throw new Error('[live_validation_v1] unable to resolve thinner_market target');
}

async function selectTargets(supabase) {
  const chosenIds = new Set();
  const targets = {
    modern_clean: await selectTarget(supabase, 'modern_clean', [
      (client) => client
        .from('card_prints')
        .select('id,name,rarity,number_plain,set_id,set_code,set:sets(name)')
        .eq('name', 'Pikachu')
        .eq('set_code', 'sv02')
        .not('number_plain', 'is', null)
        .limit(25),
      (client) => client
        .from('card_prints')
        .select('id,name,rarity,number_plain,set_id,set_code,set:sets(name)')
        .like('set_code', 'sv%')
        .not('number_plain', 'is', null)
        .limit(100),
    ], chosenIds),
    promo: await selectTarget(supabase, 'promo', [
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
        .in('set_code', ['swshp', 'svp'])
        .not('number_plain', 'is', null)
        .limit(100),
    ], chosenIds),
    ambiguous_name: await selectTarget(supabase, 'ambiguous_name', [
      (client) => client
        .from('card_prints')
        .select('id,name,rarity,number_plain,set_id,set_code,set:sets(name)')
        .eq('name', 'Charizard')
        .eq('set_code', 'base1')
        .eq('number_plain', '4')
        .limit(25),
      (client) => client
        .from('card_prints')
        .select('id,name,rarity,number_plain,set_id,set_code,set:sets(name)')
        .eq('name', 'Charizard')
        .not('number_plain', 'is', null)
        .limit(100),
    ], chosenIds),
    older_set: await selectTarget(supabase, 'older_set', [
      (client) => client
        .from('card_prints')
        .select('id,name,rarity,number_plain,set_id,set_code,set:sets(name)')
        .eq('name', 'Gyarados')
        .eq('set_code', 'base1')
        .eq('number_plain', '6')
        .limit(25),
      (client) => client
        .from('card_prints')
        .select('id,name,rarity,number_plain,set_id,set_code,set:sets(name)')
        .eq('set_code', 'base1')
        .not('number_plain', 'is', null)
        .limit(100),
    ], chosenIds),
  };

  targets.thinner_market = await selectThinMarketTarget(supabase, chosenIds);
  return targets;
}

async function fetchActivePriceRows(supabase, cardPrintIds) {
  const { data, error } = await supabase
    .from('card_print_active_prices')
    .select('card_print_id,name,number_plain,source,nm_floor,nm_median,lp_floor,lp_median,listing_count,confidence,last_snapshot_at,updated_at')
    .in('card_print_id', cardPrintIds)
    .order('card_print_id', { ascending: true });

  if (error) {
    throw new Error(`[live_validation_v1] active price read failed: ${error.message}`);
  }

  return data ?? [];
}

async function fetchLatestCurveRows(supabase, cardPrintIds) {
  const { data, error } = await supabase
    .from('card_print_latest_price_curve')
    .select('card_print_id,created_at,nm_median,nm_floor,lp_median,lp_floor,mp_median,mp_floor,hp_median,hp_floor,dmg_median,dmg_floor,confidence,listing_count,raw_json')
    .in('card_print_id', cardPrintIds)
    .order('card_print_id', { ascending: true });

  if (error) {
    throw new Error(`[live_validation_v1] price curve read failed: ${error.message}`);
  }

  return data ?? [];
}

async function fetchRunObservations(supabase, runId) {
  const { data, error } = await supabase
    .from('pricing_observations')
    .select('id,card_print_id,source,external_id,title,listing_url,price,shipping,currency,condition_raw,listing_type,match_confidence,mapping_status,classification,condition_bucket,exclusion_reason,raw_payload,observed_at,created_at')
    .contains('raw_payload', { validation_run_id: runId })
    .order('observed_at', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`[live_validation_v1] observation read failed: ${error.message}`);
  }

  return data ?? [];
}

async function fetchAcceptedRunObservations(supabase, runId) {
  const { data, error } = await supabase
    .from('v_pricing_observations_accepted')
    .select('id,card_print_id,source,external_id,title,price,shipping,total_price,condition_bucket,match_confidence,raw_payload,observed_at,created_at')
    .contains('raw_payload', { validation_run_id: runId })
    .order('observed_at', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`[live_validation_v1] accepted observation read failed: ${error.message}`);
  }

  return data ?? [];
}

function summarizeDistribution(rows) {
  const map = new Map();
  for (const row of rows) {
    const key = `${row.classification}::${row.mapping_status}`;
    map.set(key, {
      classification: row.classification,
      mapping_status: row.mapping_status,
      count: (map.get(key)?.count ?? 0) + 1,
    });
  }
  return [...map.values()].sort((a, b) => {
    const classCmp = String(a.classification).localeCompare(String(b.classification));
    if (classCmp !== 0) {
      return classCmp;
    }
    return String(a.mapping_status).localeCompare(String(b.mapping_status));
  });
}

function classifyRunOutcome(executionResults) {
  const blockedByThrottle = executionResults.some(
    (row) => row.status === 'blocked_by_throttle' || row.error_status === 429,
  );
  if (blockedByThrottle) {
    return 'BLOCKED_BY_THROTTLE';
  }

  const updatedCount = executionResults.filter((row) => row.status === 'updated').length;
  if (updatedCount > 0) {
    return 'PASS';
  }

  return 'UNPROVEN';
}

function toCardSummaries(targets) {
  return Object.entries(targets).map(([label, target]) => ({
    label,
    card_print_id: target.id,
    name: target.name,
    set_code: target.set_code,
    number_plain: target.number_plain,
    listing_count_hint: target.listing_count ?? null,
  }));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const runId = buildRunId(args.runId);
  const supabase = createBackendClient();

  logEbayBrowseBudgetConfig('pricing_observation_live_validation_v1');

  const budgetBefore = await getEbayBrowseBudgetSnapshot({ supabase });
  const estimatedCallsPerJob = getEstimatedBrowseCallsPerPricingJob();
  const budgetTargetCap = Math.floor(budgetBefore.remaining_calls / Math.max(estimatedCallsPerJob, 1));

  if (budgetBefore.remaining_calls < estimatedCallsPerJob) {
    throw new Error(
      `[live_validation_v1] insufficient Browse budget for a single validation job: remaining=${budgetBefore.remaining_calls} estimated_per_job=${estimatedCallsPerJob}`,
    );
  }

  const targets = await selectTargets(supabase);
  const targetList = toCardSummaries(targets).slice(0, Math.min(MAX_TARGETS, budgetTargetCap, MAX_TARGETS));
  if (targetList.length === 0) {
    throw new Error('[live_validation_v1] budget-aware target list resolved to zero cards');
  }

  const cardPrintIds = targetList.map((target) => target.card_print_id);
  const preActivePrices = await fetchActivePriceRows(supabase, cardPrintIds);

  printJsonBlock('run_context', {
    run_id: runId,
    estimated_calls_per_job: estimatedCallsPerJob,
    budget_before: budgetBefore,
    requested_target_count: MAX_TARGETS,
    budget_target_cap: budgetTargetCap,
    actual_target_count: targetList.length,
  });
  printJsonBlock('targets_used', targetList);
  printJsonBlock('pre_active_prices', preActivePrices);

  const executionResults = [];
  for (const target of targetList) {
    const beforeEach = await getEbayBrowseBudgetSnapshot({ supabase });
    if (beforeEach.remaining_calls < estimatedCallsPerJob) {
      executionResults.push({
        card_print_id: target.card_print_id,
        name: target.name,
        status: 'skipped_budget_low',
        budget_before_card: beforeEach,
      });
      break;
    }

    try {
      const summary = await updatePricingForCardPrint({
        supabase,
        cardPrintId: target.card_print_id,
        dryRun: false,
        debug: args.debug,
        validationRunId: runId,
      });
      const afterEach = await getEbayBrowseBudgetSnapshot({ supabase });
      executionResults.push({
        card_print_id: target.card_print_id,
        name: target.name,
        status: 'updated',
        budget_before_card: beforeEach,
        budget_after_card: afterEach,
        summary: {
          nm_median: summary.nm_median,
          nm_floor: summary.nm_floor,
          lp_median: summary.lp_median,
          lp_floor: summary.lp_floor,
          mp_median: summary.mp_median,
          hp_median: summary.hp_median,
          dmg_median: summary.dmg_median,
          listing_count: summary.listing_count,
          confidence: summary.confidence,
        },
      });
    } catch (error) {
      const blockedByThrottle = isEbayBrowseBudgetExceededError(error) || error?.status === 429 || error?.cause?.status === 429;
      const record = {
        card_print_id: target.card_print_id,
        name: target.name,
        status: blockedByThrottle ? 'blocked_by_throttle' : 'error',
        error_message: error?.message ?? String(error),
        error_code: error?.code ?? null,
        error_status: error?.status ?? error?.cause?.status ?? null,
      };
      executionResults.push(record);
      if (blockedByThrottle) {
        break;
      }
    }
  }

  const budgetAfter = await getEbayBrowseBudgetSnapshot({ supabase });
  const observations = await fetchRunObservations(supabase, runId);
  const acceptedObservations = await fetchAcceptedRunObservations(supabase, runId);
  const postActivePrices = await fetchActivePriceRows(supabase, cardPrintIds);
  const postCurves = await fetchLatestCurveRows(supabase, cardPrintIds);

  const acceptedNotMapped = observations.filter(
    (row) => row.classification === 'accepted' && row.mapping_status !== 'mapped',
  ).length;

  const perCardObservationSamples = {};
  for (const target of targetList) {
    perCardObservationSamples[target.card_print_id] = observations
      .filter((row) => row.card_print_id === target.card_print_id)
      .map((row) => ({
        external_id: row.external_id,
        title: row.title,
        classification: row.classification,
        mapping_status: row.mapping_status,
        condition_bucket: row.condition_bucket,
        price: row.price,
        shipping: row.shipping,
        observed_at: row.observed_at,
        exclusion_reason: row.exclusion_reason,
      }));
  }

  const explainabilityCards = targetList.slice(0, 2).map((target) => ({
    ...target,
    accepted_comps: acceptedObservations
      .filter((row) => row.card_print_id === target.card_print_id)
      .map((row) => ({
        external_id: row.external_id,
        title: row.title,
        condition_bucket: row.condition_bucket,
        price: row.price,
        shipping: row.shipping,
        total_price: row.total_price,
        match_confidence: row.match_confidence,
        observed_at: row.observed_at,
      })),
    active_price_row: postActivePrices.find((row) => row.card_print_id === target.card_print_id) ?? null,
    latest_curve_row: postCurves.find((row) => row.card_print_id === target.card_print_id) ?? null,
  }));

  printJsonBlock('execution_results', executionResults);
  printJsonBlock('run_classification', {
    run_id: runId,
    outcome: classifyRunOutcome(executionResults),
  });
  printJsonBlock('budget_after', budgetAfter);
  printJsonBlock('observation_ingestion_results', {
    run_id: runId,
    total_observations: observations.length,
    distribution: summarizeDistribution(observations),
    accepted_not_mapped: acceptedNotMapped,
    accepted_view_count: acceptedObservations.length,
    accepted_direct_count: observations.filter(
      (row) => row.classification === 'accepted' && row.mapping_status === 'mapped',
    ).length,
  });
  printJsonBlock('per_card_observation_samples', perCardObservationSamples);
  printJsonBlock('accepted_comp_review', explainabilityCards);
  printJsonBlock('post_active_prices', postActivePrices);
}

main().catch((error) => {
  console.error('[live_validation_v1] failed', error);
  process.exitCode = 1;
});
