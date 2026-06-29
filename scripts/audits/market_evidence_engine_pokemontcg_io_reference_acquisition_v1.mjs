import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

import '../../backend/env.mjs';
import { fetchPokemonCardById } from '../../backend/clients/pokemonapi.mjs';
import { createBackendClient } from '../../backend/supabase_backend_client.mjs';
import { acquirePokemonTcgIoEvidenceV1 } from '../../backend/pricing/market_evidence_pokemontcg_io_acquisition_v1.mjs';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_OUT_DIR = path.join(REPO_ROOT, 'docs', 'audits', 'market_evidence_engine_v1');
const SOURCE = 'pokemontcg_io_reference';
const DEFAULT_BASE_URL = 'https://api.pokemontcg.io/v2';
const DB_LOOKUP_CHUNK_SIZE = 100;

function parseArgs(argv) {
  const parsed = {
    batch: null,
    outDir: DEFAULT_OUT_DIR,
    limit: 100,
    fixtureCards: null,
    fetchMethod: 'curl',
  };

  for (const arg of argv) {
    if (arg.startsWith('--batch=')) {
      parsed.batch = path.resolve(arg.slice('--batch='.length));
    } else if (arg.startsWith('--out-dir=')) {
      parsed.outDir = path.resolve(arg.slice('--out-dir='.length));
    } else if (arg.startsWith('--limit=')) {
      parsed.limit = Number(arg.slice('--limit='.length));
    } else if (arg.startsWith('--fixture-cards=')) {
      parsed.fixtureCards = path.resolve(arg.slice('--fixture-cards='.length));
    } else if (arg.startsWith('--fetch-method=')) {
      parsed.fetchMethod = arg.slice('--fetch-method='.length);
    }
  }

  if (!Number.isInteger(parsed.limit) || parsed.limit < 1) {
    throw new Error('[mee-pokemontcg-io] --limit must be a positive integer');
  }
  if (!['curl', 'fetch'].includes(parsed.fetchMethod)) {
    throw new Error('[mee-pokemontcg-io] --fetch-method must be curl or fetch');
  }

  return parsed;
}

async function findLatestBatch(outDir) {
  const entries = await fs.readdir(outDir, { withFileTypes: true });
  const candidates = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (/^mee_04c_raw_evidence_acquisition_batch_.*\.json$/.test(entry.name)) {
      const fullPath = path.join(outDir, entry.name);
      const stat = await fs.stat(fullPath);
      candidates.push({ fullPath, mtimeMs: stat.mtimeMs });
    }
  }
  candidates.sort((left, right) => right.mtimeMs - left.mtimeMs);
  if (candidates.length === 0) {
    throw new Error('[mee-pokemontcg-io] no MEE-04C batch JSON found; run npm run mee:acquisition-batch first');
  }
  return candidates[0].fullPath;
}

async function resolvePokemonApiIds(items) {
  const ids = Array.from(new Set(items.map((item) => item.card_print_id).filter(Boolean)));
  if (ids.length === 0) {
    return new Map();
  }

  const supabase = createBackendClient();
  const direct = new Map();

  for (let offset = 0; offset < ids.length; offset += DB_LOOKUP_CHUNK_SIZE) {
    const slice = ids.slice(offset, offset + DB_LOOKUP_CHUNK_SIZE);
    const { data, error } = await supabase
      .from('card_prints')
      .select('id, external_ids')
      .in('id', slice);
    if (error) {
      throw new Error(`[mee-pokemontcg-io] card_prints lookup failed: ${error.message}`);
    }
    for (const row of data ?? []) {
      const externalId = row?.external_ids?.pokemonapi ?? row?.external_ids?.pokemontcg ?? null;
      if (externalId) {
        direct.set(row.id, { pokemonapi_id: externalId, match_basis: 'card_prints.external_ids.pokemonapi' });
      }
    }
  }

  const missing = ids.filter((id) => !direct.has(id));
  for (let offset = 0; offset < missing.length; offset += DB_LOOKUP_CHUNK_SIZE) {
    const slice = missing.slice(offset, offset + DB_LOOKUP_CHUNK_SIZE);
    const { data, error } = await supabase
      .from('external_mappings')
      .select('card_print_id, external_id')
      .eq('source', 'pokemonapi')
      .in('card_print_id', slice);
    if (error) {
      throw new Error(`[mee-pokemontcg-io] external_mappings lookup failed: ${error.message}`);
    }
    for (const row of data ?? []) {
      if (row?.card_print_id && row?.external_id && !direct.has(row.card_print_id)) {
        direct.set(row.card_print_id, { pokemonapi_id: row.external_id, match_basis: 'external_mappings.pokemonapi' });
      }
    }
  }

  return direct;
}

async function loadFixtureCards(fixturePath) {
  if (!fixturePath) return null;
  const raw = await fs.readFile(fixturePath, 'utf8');
  return JSON.parse(raw);
}

function pokemonCardUrl(cardId) {
  const base = process.env.POKEMONAPI_BASE_URL || DEFAULT_BASE_URL;
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  return new URL(`cards/${encodeURIComponent(cardId)}`, normalizedBase).toString();
}

async function fetchPokemonCardByIdViaCurl(cardId) {
  const args = [
    '--silent',
    '--show-error',
    '--location',
    '--max-time',
    '60',
    '--user-agent',
    'GrookaiMarketEvidenceAudit/1.0',
    '--header',
    'Accept: application/json',
  ];
  if (process.platform === 'win32') {
    args.unshift('--ssl-no-revoke');
  }
  const apiKey = process.env.POKEMONAPI_API_KEY;
  if (apiKey) {
    args.push('--header', `X-Api-Key: ${apiKey}`);
  }
  args.push(pokemonCardUrl(cardId));

  let stdout = null;
  let lastError = null;
  const command = process.platform === 'win32' ? 'curl.exe' : 'curl';
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      ({ stdout } = await execFileAsync(command, args, {
        timeout: 80000,
        maxBuffer: 8 * 1024 * 1024,
      }));
      break;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 750 * attempt));
    }
  }
  if (stdout === null) {
    throw lastError;
  }
  const payload = JSON.parse(stdout);
  return payload?.data ?? null;
}

async function fetchPokemonCardByIdWithMethod(cardId, fetchMethod) {
  if (fetchMethod === 'fetch') {
    return fetchPokemonCardById(cardId);
  }
  return fetchPokemonCardByIdViaCurl(cardId);
}

async function fetchCardsById(ids, fixtureCards, fetchMethod) {
  const cardsByExternalId = {};
  const errors = [];
  for (const id of ids) {
    if (fixtureCards) {
      if (fixtureCards[id]) {
        cardsByExternalId[id] = fixtureCards[id];
      }
      continue;
    }
    try {
      const card = await fetchPokemonCardByIdWithMethod(id, fetchMethod);
      if (card) {
        cardsByExternalId[id] = card;
      }
    } catch (error) {
      errors.push({
        id,
        error: error?.message ?? String(error),
        cause_code: error?.cause?.code ?? null,
        cause_message: error?.cause?.message ?? null,
      });
    }
  }
  return { cardsByExternalId, errors };
}

function cell(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function renderMarkdown({ acquisition, jsonPath, batchPath, fetchErrors }) {
  const statusRows = Object.entries(acquisition.summary.status_counts)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([status, count]) => `| ${cell(status)} | ${count} |`);

  const sampleRows = acquisition.candidate_evidence.slice(0, 50).map((row, index) => (
    `| ${index + 1} | ${cell(row.gv_id)} | ${cell(row.raw_title)} | ${cell(row.currency)} | ${row.raw_price ?? ''} | ${cell(row.finish_hint)} | ${cell(row.condition_hint)} |`
  ));

  const errorRows = fetchErrors.slice(0, 25).map((row, index) => (
    `| ${index + 1} | ${cell(row.id)} | ${cell(row.error)} |`
  ));

  return [
    '# MEE-06A PokemonTCG.io Reference Evidence V1',
    '',
    `Generated: ${acquisition.generated_at}`,
    '',
    '## Boundary',
    '',
    '- Free API reference acquisition only.',
    '- Read-only DB mapping lookup.',
    '- Local raw evidence artifact only.',
    '- No database writes.',
    '- No pricing rollups.',
    '- No migration apply.',
    '- No public price publication.',
    '- Raw evidence candidates remain review-gated.',
    '',
    '## Summary',
    '',
    `- pokemontcg_io_targets: ${acquisition.summary.pokemontcg_io_targets}`,
    `- reviewed_targets: ${acquisition.summary.reviewed_targets}`,
    `- candidate_evidence_count: ${acquisition.summary.candidate_evidence_count}`,
    `- fetch_error_count: ${fetchErrors.length}`,
    `- batch: ${path.relative(REPO_ROOT, batchPath).replace(/\\/g, '/')}`,
    `- json: ${path.relative(REPO_ROOT, jsonPath).replace(/\\/g, '/')}`,
    '',
    '## Target Status',
    '',
    '| Status | Count |',
    '| --- | ---: |',
    ...statusRows,
    '',
    '## Sample Candidate Evidence',
    '',
    '| # | ID | Raw title | Currency | Raw price | Finish | Condition/metric |',
    '| ---: | --- | --- | --- | ---: | --- | --- |',
    ...sampleRows,
    '',
    '## Fetch Errors',
    '',
    '| # | PokemonTCG ID | Error |',
    '| ---: | --- | --- |',
    ...errorRows,
    '',
  ].join('\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const batchPath = args.batch ?? await findLatestBatch(args.outDir);
  const generatedAt = new Date().toISOString();
  const stamp = generatedAt.replace(/[:.]/g, '-');

  const batch = JSON.parse(await fs.readFile(batchPath, 'utf8'));
  const sourceItems = (batch.items ?? [])
    .filter((item) => item.source === SOURCE)
    .slice(0, args.limit);

  const idMappings = await resolvePokemonApiIds(sourceItems);
  const enrichedBatch = {
    ...batch,
    items: sourceItems.map((item) => ({
      ...item,
      ...(idMappings.get(item.card_print_id) ?? {}),
    })),
  };

  const uniquePokemonApiIds = Array.from(new Set(
    enrichedBatch.items.map((item) => item.pokemonapi_id).filter(Boolean),
  ));
  const fixtureCards = await loadFixtureCards(args.fixtureCards);
  const { cardsByExternalId, errors } = await fetchCardsById(uniquePokemonApiIds, fixtureCards, args.fetchMethod);
  const acquisition = acquirePokemonTcgIoEvidenceV1({
    batch: enrichedBatch,
    cardsByExternalId,
    generatedAt,
  });
  acquisition.boundary.provider_calls = !fixtureCards;
  acquisition.boundary.source_fetches = !fixtureCards;
  acquisition.boundary.read_only_db_mapping_lookup = true;
  acquisition.boundary.fetch_method = fixtureCards ? 'fixture' : args.fetchMethod;
  acquisition.summary.unique_pokemonapi_ids = uniquePokemonApiIds.length;
  acquisition.summary.fetch_error_count = errors.length;

  await fs.mkdir(args.outDir, { recursive: true });
  const jsonPath = path.join(args.outDir, `mee_06a_pokemontcg_io_reference_evidence_${stamp}.json`);
  const mdPath = path.join(args.outDir, `mee_06a_pokemontcg_io_reference_evidence_${stamp}.md`);
  await fs.writeFile(jsonPath, JSON.stringify(acquisition, null, 2));
  await fs.writeFile(mdPath, renderMarkdown({
    acquisition,
    jsonPath,
    batchPath,
    fetchErrors: errors,
  }));

  console.log(`[mee-pokemontcg-io] read batch ${path.relative(REPO_ROOT, batchPath)}`);
  console.log(`[mee-pokemontcg-io] targets=${sourceItems.length}`);
  console.log(`[mee-pokemontcg-io] unique pokemonapi ids=${uniquePokemonApiIds.length}`);
  console.log(`[mee-pokemontcg-io] fetch method=${fixtureCards ? 'fixture' : args.fetchMethod}`);
  console.log(`[mee-pokemontcg-io] candidate evidence=${acquisition.summary.candidate_evidence_count}`);
  console.log(`[mee-pokemontcg-io] fetch errors=${errors.length}`);
  console.log(`[mee-pokemontcg-io] wrote ${path.relative(REPO_ROOT, jsonPath)}`);
  console.log(`[mee-pokemontcg-io] wrote ${path.relative(REPO_ROOT, mdPath)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
