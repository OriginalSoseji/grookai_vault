import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

import '../../backend/env.mjs';
import { createBackendClient } from '../../backend/supabase_backend_client.mjs';
import {
  acquireTcgcsvReferenceEvidenceV1,
  matchingTcgcsvGroupsForItemV1,
} from '../../backend/pricing/market_evidence_tcgcsv_reference_acquisition_v1.mjs';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_OUT_DIR = path.join(REPO_ROOT, 'docs', 'audits', 'market_evidence_engine_v1');
const DEFAULT_CACHE_DIR = path.join(DEFAULT_OUT_DIR, 'tcgcsv_reference_cache_v1');
const CURL_BIN = os.platform() === 'win32' ? 'curl.exe' : 'curl';
const CATEGORY_ID = 3;
const BASE_URL = `https://tcgcsv.com/tcgplayer/${CATEGORY_ID}`;
const SOURCE = 'tcgcsv_reference';

function parseArgs(argv) {
  const parsed = {
    batch: null,
    outDir: DEFAULT_OUT_DIR,
    cacheDir: DEFAULT_CACHE_DIR,
    limit: 100,
    refreshCache: false,
  };
  for (const arg of argv) {
    if (arg.startsWith('--batch=')) {
      parsed.batch = path.resolve(arg.slice('--batch='.length));
    } else if (arg.startsWith('--out-dir=')) {
      parsed.outDir = path.resolve(arg.slice('--out-dir='.length));
    } else if (arg.startsWith('--cache-dir=')) {
      parsed.cacheDir = path.resolve(arg.slice('--cache-dir='.length));
    } else if (arg.startsWith('--limit=')) {
      parsed.limit = Number(arg.slice('--limit='.length));
    } else if (arg === '--refresh-cache') {
      parsed.refreshCache = true;
    }
  }
  if (!Number.isInteger(parsed.limit) || parsed.limit < 1) {
    throw new Error('[mee-tcgcsv] --limit must be a positive integer');
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
    throw new Error('[mee-tcgcsv] no MEE-04C batch JSON found; run npm run mee:acquisition-batch first');
  }
  return candidates[0].fullPath;
}

async function fetchJsonCached(url, cacheFile, { refreshCache }) {
  if (!refreshCache) {
    try {
      return JSON.parse(await fs.readFile(cacheFile, 'utf8'));
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }

  let stdout = null;
  let lastError = null;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      ({ stdout } = await execFileAsync(CURL_BIN, [
        '--ssl-no-revoke',
        '--silent',
        '--show-error',
        '--location',
        '--max-time',
        '120',
        '--user-agent',
        'GrookaiMarketEvidenceAudit/1.0',
        url,
      ], { timeout: 140000, maxBuffer: 80 * 1024 * 1024 }));
      break;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
  if (stdout === null) throw lastError;
  const json = JSON.parse(stdout);
  await fs.mkdir(path.dirname(cacheFile), { recursive: true });
  await fs.writeFile(cacheFile, `${JSON.stringify(json)}\n`);
  return json;
}

async function readSetCatalog(items) {
  const codes = Array.from(new Set(items.map((item) => item.set_code).filter(Boolean)));
  if (codes.length === 0) return new Map();
  const supabase = createBackendClient();
  const { data, error } = await supabase
    .from('sets')
    .select('code,name')
    .in('code', codes);
  if (error) {
    throw new Error(`[mee-tcgcsv] set catalog lookup failed: ${error.message}`);
  }
  return new Map((data ?? []).map((row) => [row.code, row]));
}

async function loadGroups(cacheDir, options) {
  const payload = await fetchJsonCached(`${BASE_URL}/groups`, path.join(cacheDir, 'groups.json'), options);
  return payload.results ?? [];
}

async function loadGroupPayload(groupId, cacheDir, options) {
  const [productsPayload, pricesPayload] = await Promise.all([
    fetchJsonCached(`${BASE_URL}/${groupId}/products`, path.join(cacheDir, `${groupId}_products.json`), options),
    fetchJsonCached(`${BASE_URL}/${groupId}/prices`, path.join(cacheDir, `${groupId}_prices.json`), options),
  ]);
  return {
    products: productsPayload.results ?? [],
    prices: pricesPayload.results ?? [],
  };
}

function cell(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function renderMarkdown({ acquisition, jsonPath, batchPath }) {
  const statusRows = Object.entries(acquisition.summary.status_counts)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([status, count]) => `| ${cell(status)} | ${count} |`);
  const sampleRows = acquisition.candidate_evidence.slice(0, 50).map((row, index) => (
    `| ${index + 1} | ${cell(row.gv_id)} | ${cell(row.raw_title)} | ${cell(row.raw_price)} | ${cell(row.finish_hint)} | ${cell(row.condition_hint)} |`
  ));

  return [
    '# MEE-06B TCGCSV Reference Evidence V1',
    '',
    `Generated: ${acquisition.generated_at}`,
    '',
    '## Boundary',
    '',
    '- Public TCGCSV/TCGplayer snapshot reference acquisition only.',
    '- Read-only DB set catalog lookup.',
    '- Local raw evidence artifact only.',
    '- No database writes.',
    '- No pricing rollups.',
    '- No migration apply.',
    '- No public price publication.',
    '- Raw evidence candidates remain review-gated.',
    '',
    '## Summary',
    '',
    `- tcgcsv_targets: ${acquisition.summary.tcgcsv_targets}`,
    `- reviewed_targets: ${acquisition.summary.reviewed_targets}`,
    `- candidate_evidence_count: ${acquisition.summary.candidate_evidence_count}`,
    `- groups_loaded: ${acquisition.summary.groups_loaded}`,
    `- groups_fetched: ${acquisition.summary.groups_fetched}`,
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
    '| # | ID | Raw title | Raw price | Finish | Condition/metric |',
    '| ---: | --- | --- | ---: | --- | --- |',
    ...sampleRows,
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
  const setCatalog = await readSetCatalog(sourceItems);
  const enrichedItems = sourceItems.map((item) => {
    const set = setCatalog.get(item.set_code);
    return {
      ...item,
      set_name: set?.name ?? item.set_name ?? null,
      printed_set_name: set?.printed_name ?? item.printed_set_name ?? null,
    };
  });

  const groups = await loadGroups(args.cacheDir, args);
  const neededGroups = new Map();
  for (const item of enrichedItems) {
    for (const group of matchingTcgcsvGroupsForItemV1(item, groups)) {
      neededGroups.set(group.groupId, group);
    }
  }

  const groupPayloadsByGroupId = {};
  for (const groupId of neededGroups.keys()) {
    groupPayloadsByGroupId[groupId] = await loadGroupPayload(groupId, args.cacheDir, args);
  }

  const acquisition = acquireTcgcsvReferenceEvidenceV1({
    batch: { ...batch, items: enrichedItems },
    groups,
    groupPayloadsByGroupId,
    generatedAt,
  });
  acquisition.boundary.provider_calls = true;
  acquisition.boundary.source_fetches = true;
  acquisition.boundary.read_only_db_set_catalog_lookup = true;
  acquisition.summary.groups_loaded = groups.length;
  acquisition.summary.groups_fetched = neededGroups.size;

  await fs.mkdir(args.outDir, { recursive: true });
  const jsonPath = path.join(args.outDir, `mee_06b_tcgcsv_reference_evidence_${stamp}.json`);
  const mdPath = path.join(args.outDir, `mee_06b_tcgcsv_reference_evidence_${stamp}.md`);
  await fs.writeFile(jsonPath, JSON.stringify(acquisition, null, 2));
  await fs.writeFile(mdPath, renderMarkdown({ acquisition, jsonPath, batchPath }));

  console.log(`[mee-tcgcsv] read batch ${path.relative(REPO_ROOT, batchPath)}`);
  console.log(`[mee-tcgcsv] targets=${sourceItems.length}`);
  console.log(`[mee-tcgcsv] groups loaded=${groups.length}`);
  console.log(`[mee-tcgcsv] groups fetched=${neededGroups.size}`);
  console.log(`[mee-tcgcsv] candidate evidence=${acquisition.summary.candidate_evidence_count}`);
  console.log(`[mee-tcgcsv] wrote ${path.relative(REPO_ROOT, jsonPath)}`);
  console.log(`[mee-tcgcsv] wrote ${path.relative(REPO_ROOT, mdPath)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
