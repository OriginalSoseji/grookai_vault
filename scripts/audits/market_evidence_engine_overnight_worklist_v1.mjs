import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import '../../backend/env.mjs';
import { createBackendClient } from '../../backend/supabase_backend_client.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_OUT_DIR = path.join(REPO_ROOT, 'docs', 'audits', 'market_evidence_engine_v1');
const PAGE_SIZE = 1000;

function parseArgs(argv) {
  const parsed = {
    limit: 500,
    staleDays: 30,
    outDir: DEFAULT_OUT_DIR,
  };

  for (const arg of argv) {
    if (arg.startsWith('--limit=')) {
      parsed.limit = Number(arg.slice('--limit='.length));
    } else if (arg.startsWith('--stale-days=')) {
      parsed.staleDays = Number(arg.slice('--stale-days='.length));
    } else if (arg.startsWith('--out-dir=')) {
      parsed.outDir = path.resolve(arg.slice('--out-dir='.length));
    }
  }

  if (!Number.isInteger(parsed.limit) || parsed.limit < 1) {
    throw new Error('[mee-overnight] --limit must be a positive integer');
  }
  if (!Number.isInteger(parsed.staleDays) || parsed.staleDays < 1) {
    throw new Error('[mee-overnight] --stale-days must be a positive integer');
  }

  return parsed;
}

async function fetchAll(label, queryFactory) {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await queryFactory().range(from, to);
    if (error) {
      throw new Error(`[mee-overnight] ${label} read failed: ${error.message}`);
    }

    const page = data ?? [];
    rows.push(...page);
    console.log(`[mee-overnight] read ${label}: +${page.length} (${rows.length} total)`);

    if (page.length < PAGE_SIZE) {
      return rows;
    }
  }
}

function normalizeText(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function daysSince(value, nowMs) {
  if (!value) {
    return null;
  }
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) {
    return null;
  }
  return Math.max(0, Math.floor((nowMs - time) / 86_400_000));
}

function classifyRarityBoost(rarity) {
  const normalized = (rarity ?? '').toLowerCase();
  if (!normalized) {
    return 0;
  }
  if (/(secret|hyper|ultra|illustration|special|rare|promo|holo|ex|gx|vmax|vstar)/.test(normalized)) {
    return 10;
  }
  return 0;
}

function buildCoverage({ cardPrints, latestEbayRows, acceptedRows, referenceRows, staleDays }) {
  const nowMs = Date.now();
  const latestEbayByCard = new Map(latestEbayRows.map((row) => [row.card_print_id, row]));
  const acceptedByCard = new Map();
  const referenceByCard = new Map();

  for (const row of acceptedRows) {
    const cardPrintId = normalizeText(row.card_print_id);
    if (!cardPrintId || row.source !== 'ebay') {
      continue;
    }
    const current = acceptedByCard.get(cardPrintId) ?? {
      count: 0,
      newest_observed_at: null,
      condition_buckets: new Set(),
    };
    current.count += 1;
    if (row.condition_bucket) {
      current.condition_buckets.add(row.condition_bucket);
    }
    if (!current.newest_observed_at || String(row.observed_at) > String(current.newest_observed_at)) {
      current.newest_observed_at = row.observed_at;
    }
    acceptedByCard.set(cardPrintId, current);
  }

  for (const row of referenceRows) {
    const cardPrintId = normalizeText(row.card_print_id);
    if (!cardPrintId) {
      continue;
    }
    const current = referenceByCard.get(cardPrintId) ?? {
      variant_count: 0,
      newest_updated_at: null,
    };
    current.variant_count += 1;
    if (!current.newest_updated_at || String(row.updated_at) > String(current.newest_updated_at)) {
      current.newest_updated_at = row.updated_at;
    }
    referenceByCard.set(cardPrintId, current);
  }

  const targets = [];
  const summary = {
    card_print_count: cardPrints.length,
    ebay_latest_count: latestEbayByCard.size,
    accepted_ebay_card_count: acceptedByCard.size,
    reference_card_count: referenceByCard.size,
    missing_accepted_ebay_count: 0,
    missing_ebay_latest_count: 0,
    stale_ebay_latest_count: 0,
    no_reference_count: 0,
  };

  for (const card of cardPrints) {
    const latest = latestEbayByCard.get(card.id) ?? null;
    const accepted = acceptedByCard.get(card.id) ?? null;
    const reference = referenceByCard.get(card.id) ?? null;
    const latestAgeDays = daysSince(latest?.last_snapshot_at ?? latest?.updated_at, nowMs);
    const acceptedAgeDays = daysSince(accepted?.newest_observed_at, nowMs);
    const staleLatest = latestAgeDays === null || latestAgeDays > staleDays;
    const hasReference = Boolean(reference);

    if (!accepted) {
      summary.missing_accepted_ebay_count += 1;
    }
    if (!latest) {
      summary.missing_ebay_latest_count += 1;
    }
    if (latest && staleLatest) {
      summary.stale_ebay_latest_count += 1;
    }
    if (!hasReference) {
      summary.no_reference_count += 1;
    }

    let priorityScore = 0;
    const reasons = [];
    if (!accepted) {
      priorityScore += 60;
      reasons.push('no accepted mapped eBay observations');
    }
    if (!latest) {
      priorityScore += 30;
      reasons.push('no eBay latest rollup');
    } else if (staleLatest) {
      priorityScore += 15;
      reasons.push(`eBay latest older than ${staleDays} days`);
    }
    if (hasReference) {
      priorityScore += 10;
      reasons.push('reference lane exists for cross-check');
    }
    const rarityBoost = classifyRarityBoost(card.rarity);
    if (rarityBoost > 0) {
      priorityScore += rarityBoost;
      reasons.push('collector-interest rarity');
    }

    if (priorityScore <= 0) {
      continue;
    }

    targets.push({
      card_print_id: card.id,
      gv_id: card.gv_id ?? null,
      name: card.name,
      set_code: card.set_code,
      number_plain: card.number_plain,
      rarity: card.rarity ?? null,
      priority_score: priorityScore,
      reasons,
      ebay_latest: latest
        ? {
            listing_count: latest.listing_count ?? null,
            confidence: latest.confidence ?? null,
            last_snapshot_at: latest.last_snapshot_at ?? null,
            updated_at: latest.updated_at ?? null,
            age_days: latestAgeDays,
          }
        : null,
      accepted_ebay: accepted
        ? {
            observation_count: accepted.count,
            newest_observed_at: accepted.newest_observed_at,
            age_days: acceptedAgeDays,
            condition_buckets: Array.from(accepted.condition_buckets).sort(),
          }
        : null,
      reference_lane: reference
        ? {
            variant_count: reference.variant_count,
            newest_updated_at: reference.newest_updated_at,
          }
        : null,
    });
  }

  targets.sort((a, b) => {
    if (b.priority_score !== a.priority_score) {
      return b.priority_score - a.priority_score;
    }
    return `${a.set_code}:${a.number_plain}:${a.name}`.localeCompare(`${b.set_code}:${b.number_plain}:${b.name}`);
  });

  return { summary, targets };
}

function renderMarkdown({ generatedAt, args, summary, targets, jsonFile }) {
  const topTargets = targets.slice(0, Math.min(50, targets.length));
  const rows = topTargets.map((target) => {
    const id = target.gv_id ?? target.card_print_id;
    const card = `${target.name} (${target.set_code} #${target.number_plain ?? '?'})`;
    const reasons = target.reasons.join('; ');
    return `| ${target.priority_score} | ${card} | ${id} | ${reasons} |`;
  });

  return [
    '# Market Evidence Engine Overnight Worklist V1',
    '',
    `Generated: ${generatedAt}`,
    '',
    '## Boundary',
    '',
    '- Read-only Supabase queries only.',
    '- No provider calls.',
    '- No database writes.',
    '- No pricing rollups.',
    '- No migration apply.',
    '- Raw worklist rows are not pricing truth.',
    '',
    '## Runtime Options',
    '',
    `- limit: ${args.limit}`,
    `- stale_days: ${args.staleDays}`,
    `- json: ${jsonFile}`,
    '',
    '## Summary',
    '',
    `- card_print_count: ${summary.card_print_count}`,
    `- ebay_latest_count: ${summary.ebay_latest_count}`,
    `- accepted_ebay_card_count: ${summary.accepted_ebay_card_count}`,
    `- reference_card_count: ${summary.reference_card_count}`,
    `- missing_accepted_ebay_count: ${summary.missing_accepted_ebay_count}`,
    `- missing_ebay_latest_count: ${summary.missing_ebay_latest_count}`,
    `- stale_ebay_latest_count: ${summary.stale_ebay_latest_count}`,
    `- no_reference_count: ${summary.no_reference_count}`,
    '',
    '## Top Targets',
    '',
    '| Score | Card | ID | Reasons |',
    '| ---: | --- | --- | --- |',
    ...rows,
    '',
    '## Next Step',
    '',
    'Use this worklist to choose the first bounded MEE acquisition batch after the warehouse schema draft is reviewed and explicitly approved.',
    '',
  ].join('\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const supabase = createBackendClient();
  const generatedAt = new Date().toISOString();
  const stamp = generatedAt.replace(/[:.]/g, '-');

  console.log('[mee-overnight] starting read-only worklist build');

  const [cardPrints, latestEbayRows, acceptedRows, referenceRows] = await Promise.all([
    fetchAll('card_prints', () => supabase
      .from('card_prints')
      .select('id, gv_id, name, set_code, number_plain, rarity')
      .order('set_code', { ascending: true })
      .order('number_plain', { ascending: true })),
    fetchAll('ebay_active_prices_latest', () => supabase
      .from('ebay_active_prices_latest')
      .select('card_print_id, listing_count, confidence, last_snapshot_at, updated_at')),
    fetchAll('v_pricing_observations_accepted', () => supabase
      .from('v_pricing_observations_accepted')
      .select('card_print_id, source, condition_bucket, observed_at')),
    fetchAll('justtcg_variant_prices_latest', () => supabase
      .from('justtcg_variant_prices_latest')
      .select('card_print_id, updated_at')),
  ]);

  const { summary, targets } = buildCoverage({
    cardPrints,
    latestEbayRows,
    acceptedRows,
    referenceRows,
    staleDays: args.staleDays,
  });

  const limitedTargets = targets.slice(0, args.limit);
  await fs.mkdir(args.outDir, { recursive: true });

  const jsonPath = path.join(args.outDir, `mee_overnight_worklist_${stamp}.json`);
  const mdPath = path.join(args.outDir, `mee_overnight_worklist_${stamp}.md`);
  const jsonFile = path.relative(REPO_ROOT, jsonPath).replace(/\\/g, '/');

  await fs.writeFile(jsonPath, JSON.stringify({
    generated_at: generatedAt,
    contract: 'MARKET_EVIDENCE_ENGINE_V1',
    mode: 'read_only_worklist',
    boundary: {
      provider_calls: false,
      db_writes: false,
      pricing_rollups: false,
      migration_apply: false,
    },
    options: args,
    summary,
    target_count_before_limit: targets.length,
    targets: limitedTargets,
  }, null, 2));

  await fs.writeFile(mdPath, renderMarkdown({
    generatedAt,
    args,
    summary,
    targets: limitedTargets,
    jsonFile,
  }));

  console.log(`[mee-overnight] wrote ${path.relative(REPO_ROOT, jsonPath)}`);
  console.log(`[mee-overnight] wrote ${path.relative(REPO_ROOT, mdPath)}`);
  console.log(`[mee-overnight] top target count=${limitedTargets.length} total candidates=${targets.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
