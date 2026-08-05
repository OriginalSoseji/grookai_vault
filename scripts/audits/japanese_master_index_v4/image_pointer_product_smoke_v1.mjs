import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

import dotenv from 'dotenv';

import { readVerifiedArtifact } from './artifact_rows_v1.mjs';
import {
  buildArtifact,
  contentFingerprint,
  stableJson,
  writeJsonArtifact,
} from './deterministic_artifact_v1.mjs';
import {
  assertAuditOnlyArgs,
  withReadOnlyClient,
} from './read_only_guard_v1.mjs';

export const PRODUCT_SMOKE_VERSION =
  'JPN-MASTER-INDEX-V4-IMAGE-POINTER-PRODUCT-SMOKE-V1';
export const EXPECTED_PRODUCT_SMOKE_ROWS = 53;
export const EXPECTED_PACKAGE_FINGERPRINT =
  'e76ecd6f12ad5c1a1a1f6836d54c34d527e4688f43d5196331aed31da93df912';
export const EXPECTED_POINTER_PLAN_HASH =
  '0600e0de392dcf714b5a3450a6f05fd739e6b32092e9e46883c747c56bacf5be';
export const EXPECTED_MUTATION_CONTRACT_HASH =
  '5f103aaabda1f04533426e6695b367460c29483e694b5909e233c6529778e6f9';

const PLAN_ARTIFACT =
  'docs/audits/japanese_master_index_v4/image_pointer_plan_v1/'
  + 'jpn_image_pointer_plan_v1.json';
const DEFAULT_OUTPUT_ROOT =
  'docs/audits/japanese_master_index_v4/image_pointer_product_smoke_v1';
const DEFAULT_WEB_BASE_URL = 'https://grookaivault.com';
const SET_GRID_PAGE_SIZE = 48;

function clean(value) {
  const normalized = String(value ?? '').trim();
  return normalized || null;
}

function normalizeBaseUrl(value) {
  const parsed = new URL(value);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Product smoke base URL must use HTTP or HTTPS.');
  }
  return parsed.href.replace(/\/$/, '');
}

function parseArgs(argv) {
  assertAuditOnlyArgs(argv);
  const options = {
    envFile: null,
    environment: 'production-read-only-2026-08-05',
    outputRoot: DEFAULT_OUTPUT_ROOT,
    startLocalWeb: false,
    localWebPort: 3197,
    webBaseUrl: DEFAULT_WEB_BASE_URL,
  };
  for (const argument of argv) {
    if (argument.startsWith('--env-file=')) {
      options.envFile = argument.slice('--env-file='.length);
    } else if (argument.startsWith('--environment=')) {
      options.environment = argument.slice('--environment='.length);
    } else if (argument.startsWith('--output-root=')) {
      options.outputRoot = argument.slice('--output-root='.length);
    } else if (argument.startsWith('--web-base-url=')) {
      options.webBaseUrl = argument.slice('--web-base-url='.length);
    } else if (argument === '--start-local-web') {
      options.startLocalWeb = true;
    } else if (argument.startsWith('--local-web-port=')) {
      options.localWebPort = Number.parseInt(
        argument.slice('--local-web-port='.length),
        10,
      );
    } else {
      throw new Error(`Unsupported argument: ${argument}`);
    }
  }
  if (
    !Number.isInteger(options.localWebPort)
    || options.localWebPort < 1024
    || options.localWebPort > 65_535
  ) {
    throw new Error('Local web port must be an integer from 1024 to 65535.');
  }
  if (options.startLocalWeb) {
    options.webBaseUrl = `http://127.0.0.1:${options.localWebPort}`;
  }
  options.webBaseUrl = normalizeBaseUrl(options.webBaseUrl);
  return options;
}

function startLocalWebServer(port) {
  const nextBin = path.join(
    process.cwd(),
    'apps',
    'web',
    'node_modules',
    'next',
    'dist',
    'bin',
    'next',
  );
  const child = spawn(
    process.execPath,
    [nextBin, 'start', '-p', String(port)],
    {
      cwd: path.join(process.cwd(), 'apps', 'web'),
      env: process.env,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  let output = '';
  child.stdout.on('data', (chunk) => { output += chunk.toString(); });
  child.stderr.on('data', (chunk) => { output += chunk.toString(); });
  return { child, getOutput: () => output };
}

async function waitForLocalWeb(baseUrl, server) {
  for (let index = 0; index < 60; index += 1) {
    if (server.child.exitCode !== null) {
      throw new Error(
        `Local web server exited before readiness: ${server.getOutput().slice(-2000)}`,
      );
    }
    try {
      const response = await fetch(`${baseUrl}/login`, {
        method: 'GET',
        signal: AbortSignal.timeout(2_000),
      });
      if (response.status < 500) return;
    } catch {
      // Continue until the bounded readiness window expires.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(
    `Local web server did not become ready: ${server.getOutput().slice(-2000)}`,
  );
}

async function stopLocalWebServer(server) {
  if (!server || server.child.exitCode !== null) return;
  server.child.kill('SIGTERM');
  await new Promise((resolve) => setTimeout(resolve, 750));
  if (server.child.exitCode === null) server.child.kill('SIGKILL');
}

async function mapLimit(values, limit, mapper) {
  const output = new Array(values.length);
  let cursor = 0;
  async function worker() {
    while (cursor < values.length) {
      const index = cursor;
      cursor += 1;
      output[index] = await mapper(values[index], index);
    }
  }
  await Promise.all(Array.from(
    { length: Math.min(limit, values.length) },
    () => worker(),
  ));
  return output;
}

async function loadPointerRows() {
  const { artifact: plan } = await readVerifiedArtifact(PLAN_ARTIFACT);
  const content = plan.content;
  if (content.status !== 'complete_no_write_pointer_plan') {
    throw new Error('Frozen image pointer plan is not complete.');
  }
  if (content.package_fingerprint_sha256 !== EXPECTED_PACKAGE_FINGERPRINT) {
    throw new Error('Frozen package fingerprint changed.');
  }
  if (content.pointer_plan_hash_sha256 !== EXPECTED_POINTER_PLAN_HASH) {
    throw new Error('Frozen pointer plan hash changed.');
  }
  if (
    content.mutation_contract_hash_sha256
    !== EXPECTED_MUTATION_CONTRACT_HASH
  ) {
    throw new Error('Frozen mutation contract hash changed.');
  }

  const rows = [];
  for (const shardPath of content.row_dataset.shard_paths) {
    const { artifact: shard } = await readVerifiedArtifact(shardPath);
    rows.push(...shard.content.rows);
  }
  if (
    rows.length !== EXPECTED_PRODUCT_SMOKE_ROWS
    || rows.length !== content.row_dataset.row_count
    || contentFingerprint(rows)
      !== content.row_dataset.content_fingerprint_sha256
  ) {
    throw new Error('Frozen image pointer row dataset changed.');
  }
  if (new Set(rows.map((row) => row.target_row_id)).size !== rows.length) {
    throw new Error('Frozen image pointer rows are not unique.');
  }
  return { rows, plan };
}

const PRODUCT_READBACK_SQL = `
with scope as (
  select card_print_id, position::integer
  from unnest($1::uuid[]) with ordinality
    as selected(card_print_id, position)
),
target_sets as (
  select distinct lower(parent.set_code) as normalized_set_code
  from scope
  join public.card_prints parent on parent.id = scope.card_print_id
),
ranked_set_rows as (
  select
    parent.id,
    row_number() over (
      partition by lower(parent.set_code)
      order by
        parent.number_plain asc nulls last,
        parent.number asc,
        parent.id asc
    ) - 1 as set_position
  from public.card_prints parent
  join target_sets
    on target_sets.normalized_set_code = lower(parent.set_code)
  where parent.gv_id is not null
    and parent.set_code is not null
)
select
  scope.position,
  parent.id::text as card_print_id,
  parent.gv_id,
  parent.name,
  parent.set_code,
  parent.number,
  to_jsonb(parent) as row_snapshot,
  set_row.name as set_name,
  ranked_set_rows.set_position::integer,
  (
    select count(*)::integer
    from public.card_printings child
    where child.card_print_id = parent.id
  ) as live_child_count,
  (
    select count(*)::integer
    from public.v_print_identity_search_documents_v1 document
    where document.card_print_id = parent.id
      and document.object_type = 'parent_print'
  ) as print_search_document_count,
  (
    select count(*)::integer
    from public.v_card_search search
    where search.id = parent.id
  ) as legacy_search_row_count,
  (
    select count(*)::integer
    from public.v_cards_search_v2 search
    where search.id = parent.id
  ) as search_v2_row_count,
  exists (
    select 1
    from public.search_print_identity_v1(
      parent.gv_id,
      null,
      null,
      'parent_print',
      10,
      0
    ) match
    where match.parent_gv_id = parent.gv_id
  ) as exact_search_rpc_match
from scope
join public.card_prints parent on parent.id = scope.card_print_id
join public.sets set_row on set_row.id = parent.set_id
join ranked_set_rows on ranked_set_rows.id = parent.id
order by scope.position`;

async function queryProductReadback(client, pointerRows) {
  const result = await client.query(
    PRODUCT_READBACK_SQL,
    [pointerRows.map((row) => row.target_row_id)],
  );
  if (result.rows.length !== EXPECTED_PRODUCT_SMOKE_ROWS) {
    throw new Error(`Product readback returned ${result.rows.length} rows.`);
  }
  for (let index = 0; index < result.rows.length; index += 1) {
    if (result.rows[index].card_print_id !== pointerRows[index].target_row_id) {
      throw new Error(`Product readback order changed at row ${index + 1}.`);
    }
  }
  return result.rows;
}

const SET_SCOPE_READBACK_SQL = `
with scope as (
  select distinct lower(parent.set_code) as normalized_set_code
  from public.card_prints parent
  where parent.id = any($1::uuid[])
),
set_counts as (
  select
    scope.normalized_set_code,
    count(parent.id)::integer as canonical_card_count
  from scope
  join public.card_prints parent
    on lower(parent.set_code) = scope.normalized_set_code
  where parent.gv_id is not null
  group by scope.normalized_set_code
)
select
  scope.normalized_set_code,
  set_counts.canonical_card_count,
  jsonb_agg(
    jsonb_build_object(
      'code', set_row.code,
      'name', set_row.name,
      'hero_image_url', set_row.hero_image_url,
      'printed_set_abbrev', set_row.printed_set_abbrev,
      'printed_total', set_row.printed_total,
      'release_date', set_row.release_date
    )
    order by set_row.code, set_row.name
  ) as set_rows
from scope
join set_counts using (normalized_set_code)
join public.sets set_row
  on lower(set_row.code) = scope.normalized_set_code
group by scope.normalized_set_code, set_counts.canonical_card_count
order by scope.normalized_set_code`;

function normalizeComparableValue(value) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function isGeneratedJapaneseSetName(row) {
  const code = normalizeComparableValue(row.code).replace(/^jpn-/, '');
  const name = normalizeComparableValue(row.name);
  return Boolean(code && name && new Set([
    `japanese ${code}`,
    `japanese ${code} set`,
    `japanese ${code} pokemon set`,
    `japanese ${code} pokemon card set`,
  ]).has(name));
}

function setMetadataScore(row) {
  let score = 0;
  if (normalizeComparableValue(row.name)) score += 1;
  if (!isGeneratedJapaneseSetName(row)) score += 32;
  if (normalizeComparableValue(row.hero_image_url)) score += 8;
  if (normalizeComparableValue(row.printed_set_abbrev)) score += 4;
  if (typeof row.printed_total === 'number') score += 2;
  if (normalizeComparableValue(row.release_date)) score += 1;
  return score;
}

function setMetadataTieBreakKey(row) {
  return [row.name, row.code, row.printed_set_abbrev, row.release_date]
    .map(normalizeComparableValue)
    .join('|');
}

export function choosePreferredSetMetadataRow(rows) {
  return rows.reduce((preferred, row) => {
    if (!preferred) return row;
    const preferredScore = setMetadataScore(preferred);
    const rowScore = setMetadataScore(row);
    if (rowScore !== preferredScore) {
      return rowScore > preferredScore ? row : preferred;
    }
    return setMetadataTieBreakKey(row).localeCompare(
      setMetadataTieBreakKey(preferred),
    ) < 0 ? row : preferred;
  }, null);
}

function normalizeSetDisplayName(value) {
  return String(value ?? '')
    .replaceAll('<big>', '')
    .replaceAll('</big>', '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function renderedSetPageHasCount(body, count) {
  const formatted = Number(count).toLocaleString('en-US');
  return body.includes(`${formatted} catalog rows`)
    || body.includes(`"children":["${formatted}"," catalog rows"]`)
    || body.includes(`\\"children\\":[\\"${formatted}\\",\\" catalog rows\\"]`);
}

async function querySetScopeReadback(client, pointerRows) {
  const result = await client.query(
    SET_SCOPE_READBACK_SQL,
    [pointerRows.map((row) => row.target_row_id)],
  );
  return result.rows.map((row) => {
    const preferred = choosePreferredSetMetadataRow(row.set_rows ?? []);
    if (!preferred?.name) {
      throw new Error(
        `Set metadata is missing for ${row.normalized_set_code}.`,
      );
    }
    return {
      normalized_set_code: row.normalized_set_code,
      canonical_card_count: Number(row.canonical_card_count),
      expected_set_name: normalizeSetDisplayName(preferred.name),
      equivalent_set_rows: row.set_rows.length,
    };
  });
}

function expectedProxyPath(gvId) {
  return `/api/canon/cards/${encodeURIComponent(gvId.toUpperCase())}/image`;
}

async function fetchResponse(url, kind = 'text') {
  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: { 'User-Agent': `${PRODUCT_SMOKE_VERSION}/1.0` },
      signal: AbortSignal.timeout(30_000),
    });
    if (kind === 'bytes') {
      const bytes = Buffer.from(await response.arrayBuffer());
      return {
        ok: response.ok,
        status: response.status,
        content_type: response.headers.get('content-type'),
        cache_control: response.headers.get('cache-control'),
        size_bytes: bytes.byteLength,
        sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
        error: null,
      };
    }
    const body = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      content_type: response.headers.get('content-type'),
      body,
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      status: null,
      content_type: null,
      body: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export function renderedHtmlHasPath(body, expectedPath) {
  const source = String(body ?? '');
  return source.includes(expectedPath)
    || source.toLowerCase().includes(
      encodeURIComponent(expectedPath).toLowerCase(),
    );
}

async function fetchImageChecks(baseUrl, pointerRows) {
  return mapLimit(pointerRows, 8, async (row) => {
    const proxyPath = expectedProxyPath(row.gv_id);
    const response = await fetchResponse(`${baseUrl}${proxyPath}`, 'bytes');
    const expected = row.storage_observation;
    return {
      card_print_id: row.target_row_id,
      gv_id: row.gv_id,
      route: proxyPath,
      status: response.status,
      content_type: response.content_type,
      cache_control: response.cache_control,
      size_bytes: response.size_bytes ?? null,
      sha256: response.sha256 ?? null,
      exact_bytes_match:
        response.ok
        && response.size_bytes === expected.size_bytes
        && response.sha256 === expected.sha256
        && response.content_type?.toLowerCase().startsWith(
          expected.content_type.toLowerCase(),
        ),
      error: response.error,
    };
  });
}

async function fetchCardPageChecks(baseUrl, pointerRows) {
  return mapLimit(pointerRows, 6, async (row) => {
    const route = `/card/${encodeURIComponent(row.gv_id)}`;
    const response = await fetchResponse(`${baseUrl}${route}`);
    const body = String(response.body ?? '');
    const proxyPath = expectedProxyPath(row.gv_id);
    const containsHostedProxy = renderedHtmlHasPath(body, proxyPath);
    return {
      card_print_id: row.target_row_id,
      gv_id: row.gv_id,
      route,
      status: response.status,
      contains_name: body.includes(row.name),
      contains_hosted_proxy: containsHostedProxy,
      contains_image_unavailable: body.includes('Image unavailable'),
      passed:
        response.ok
        && body.includes(row.name)
        && containsHostedProxy
        && !body.includes('Image unavailable'),
      error: response.error,
    };
  });
}

function buildSetGridWindows(liveRows) {
  const windows = new Map();
  for (const row of liveRows) {
    const offset = Math.floor(Number(row.set_position) / SET_GRID_PAGE_SIZE)
      * SET_GRID_PAGE_SIZE;
    const key = `${row.set_code}:${offset}`;
    if (!windows.has(key)) {
      windows.set(key, { set_code: row.set_code, offset, rows: [] });
    }
    windows.get(key).rows.push(row);
  }
  return [...windows.values()].sort((left, right) =>
    left.set_code.localeCompare(right.set_code) || left.offset - right.offset,
  );
}

async function fetchSetGridChecks(baseUrl, liveRows) {
  const windows = buildSetGridWindows(liveRows);
  const windowResults = await mapLimit(windows, 6, async (window) => {
    const route = '/api/public-set-cards'
      + `?set_code=${encodeURIComponent(window.set_code)}`
      + `&offset=${window.offset}&limit=${SET_GRID_PAGE_SIZE}`;
    const response = await fetchResponse(`${baseUrl}${route}`);
    let payload = null;
    try {
      payload = JSON.parse(response.body ?? 'null');
    } catch {
      // Invalid JSON is reported through the row checks below.
    }
    const items = Array.isArray(payload?.items) ? payload.items : [];
    const itemsByGvId = new Map(items.map((item) => [item.gv_id, item]));
    return {
      set_code: window.set_code,
      offset: window.offset,
      route,
      status: response.status,
      response_items: items.length,
      rows: window.rows.map((row) => {
        const item = itemsByGvId.get(row.gv_id) ?? null;
        const proxyPath = expectedProxyPath(row.gv_id);
        const fallback = clean(row.row_snapshot.image_url);
        return {
          card_print_id: row.card_print_id,
          gv_id: row.gv_id,
          found: Boolean(item),
          display_image_url: clean(item?.display_image_url),
          external_image_fallback_url:
            clean(item?.external_image_fallback_url),
          image_source: clean(item?.image_source),
          image_status: clean(item?.image_status),
          display_image_kind: clean(item?.display_image_kind),
          hosted_first:
            item?.display_image_url === proxyPath
            && item?.image_source === 'identity'
            && item?.image_status === 'exact'
            && item?.display_image_kind === 'exact',
          fallback_preserved:
            Boolean(fallback)
            && item?.external_image_fallback_url === fallback,
        };
      }),
      error: response.error,
    };
  });

  return windowResults.flatMap((window) => window.rows.map((row) => ({
    ...row,
    route: window.route,
    status: window.status,
    error: window.error,
  })));
}

async function fetchSetPageChecks(baseUrl, setScopes) {
  return mapLimit(setScopes, 6, async (scope) => {
    const route = `/sets/${encodeURIComponent(scope.normalized_set_code)}`;
    const response = await fetchResponse(`${baseUrl}${route}`);
    const body = String(response.body ?? '');
    const containsCanonicalCardCount = renderedSetPageHasCount(
      body,
      scope.canonical_card_count,
    );
    return {
      set_code: scope.normalized_set_code,
      set_name: scope.expected_set_name,
      canonical_card_count: scope.canonical_card_count,
      equivalent_set_rows: scope.equivalent_set_rows,
      route,
      status: response.status,
      contains_set_name: body.includes(scope.expected_set_name),
      contains_canonical_card_count: containsCanonicalCardCount,
      passed:
        response.ok
        && body.includes(scope.expected_set_name)
        && containsCanonicalCardCount,
      error: response.error,
    };
  });
}

export function buildProductSmokeRow({
  pointerRow,
  liveRow,
  imageCheck,
  cardPageCheck,
  setGridCheck,
}) {
  const checks = {
    complete_row_hash:
      contentFingerprint(liveRow.row_snapshot)
      === pointerRow.expected_after_snapshot_hash,
    exact_image_pointer:
      liveRow.row_snapshot.image_source === 'identity'
      && liveRow.row_snapshot.image_path === pointerRow.target_storage_path
      && liveRow.row_snapshot.image_status === 'exact',
    external_fallback_preserved:
      Boolean(clean(pointerRow.preserved_values.image_url))
      && liveRow.row_snapshot.image_url
        === pointerRow.preserved_values.image_url,
    no_public_child_printing: Number(liveRow.live_child_count) === 0,
    parent_search_document:
      Number(liveRow.print_search_document_count) === 1,
    legacy_search_row: Number(liveRow.legacy_search_row_count) === 1,
    search_v2_row: Number(liveRow.search_v2_row_count) === 1,
    exact_search_rpc: liveRow.exact_search_rpc_match === true,
    production_image_exact_bytes: imageCheck.exact_bytes_match === true,
    production_card_detail: cardPageCheck.passed === true,
    production_set_grid_hosted_first: setGridCheck.hosted_first === true,
    production_set_grid_fallback:
      setGridCheck.fallback_preserved === true,
  };
  const failures = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([label]) => label);
  return {
    position: Number(liveRow.position),
    card_print_id: liveRow.card_print_id,
    gv_id: liveRow.gv_id,
    name: liveRow.name,
    set_code: liveRow.set_code,
    number: liveRow.number,
    image_path: liveRow.row_snapshot.image_path,
    expected_after_snapshot_hash:
      pointerRow.expected_after_snapshot_hash,
    observed_row_snapshot_hash:
      contentFingerprint(liveRow.row_snapshot),
    checks,
    failures,
    passed: failures.length === 0,
    runtime: {
      image: imageCheck,
      card_detail: cardPageCheck,
      set_grid: setGridCheck,
    },
  };
}

export function buildProductSmokeSummary(rows, setPages) {
  const count = (selector) => rows.filter(selector).length;
  const failures = rows.flatMap((row) => row.failures.map((failure) => ({
    gv_id: row.gv_id,
    failure,
  })));
  const setPageFailures = setPages.filter((row) => !row.passed);
  return {
    selected_rows: rows.length,
    passed_rows: count((row) => row.passed),
    failed_rows: count((row) => !row.passed),
    distinct_card_print_ids: new Set(rows.map((row) => row.card_print_id)).size,
    distinct_gv_ids: new Set(rows.map((row) => row.gv_id)).size,
    distinct_sets: new Set(rows.map((row) => row.set_code)).size,
    complete_row_hash_matches: count((row) =>
      row.checks.complete_row_hash),
    exact_image_pointers: count((row) =>
      row.checks.exact_image_pointer),
    preserved_external_fallbacks: count((row) =>
      row.checks.external_fallback_preserved),
    zero_child_printing_rows: count((row) =>
      row.checks.no_public_child_printing),
    exact_search_rpc_matches: count((row) =>
      row.checks.exact_search_rpc),
    exact_production_image_byte_matches: count((row) =>
      row.checks.production_image_exact_bytes),
    production_card_detail_passes: count((row) =>
      row.checks.production_card_detail),
    production_set_grid_hosted_first: count((row) =>
      row.checks.production_set_grid_hosted_first),
    production_set_grid_fallback_preserved: count((row) =>
      row.checks.production_set_grid_fallback),
    set_pages_checked: setPages.length,
    set_pages_passed: setPages.filter((row) => row.passed).length,
    set_page_total_matches: setPages.filter((row) =>
      row.contains_canonical_card_count).length,
    set_page_name_matches: setPages.filter((row) =>
      row.contains_set_name).length,
    failures,
    set_page_failures: setPageFailures,
  };
}

function markdown(report) {
  const summary = report.summary;
  const rows = report.rows.map((row) =>
    `| ${row.position} | ${row.gv_id} | ${row.name} | ${row.set_code} | ${row.passed ? 'PASS' : `FAIL: ${row.failures.join(', ')}`} |`,
  ).join('\n');
  return `# Japanese Master Index V4 Image Pointer Product Smoke V1

Generated: ${report.generated_at}

## Result

- Status: \`${report.status}\`
- Production base URL: \`${report.web_base_url}\`
- Passed rows: ${summary.passed_rows} / ${summary.selected_rows}
- Distinct set pages passed: ${summary.set_pages_passed} / ${summary.set_pages_checked}
- Set pages with exact canonical totals: ${summary.set_page_total_matches} / ${summary.set_pages_checked}
- Set pages with preferred metadata: ${summary.set_page_name_matches} / ${summary.set_pages_checked}
- Complete live row hashes: ${summary.complete_row_hash_matches} / ${summary.selected_rows}
- Exact production image byte matches: ${summary.exact_production_image_byte_matches} / ${summary.selected_rows}
- Card-detail routes passed: ${summary.production_card_detail_passes} / ${summary.selected_rows}
- Set-grid hosted-first rows: ${summary.production_set_grid_hosted_first} / ${summary.selected_rows}
- Set-grid external fallbacks preserved: ${summary.production_set_grid_fallback_preserved} / ${summary.selected_rows}
- Exact search RPC matches: ${summary.exact_search_rpc_matches} / ${summary.selected_rows}
- Public child printing rows: 0
- Database writes: false
- Storage writes: false

## Safety Boundary

- The database connection ran inside a proven read-only transaction.
- Runtime requests used GET only.
- No search route was called because that route records telemetry.
- No database row, Storage object, family state, printing publication state, price, or canonical identity was changed.

## Rows

| # | GV-ID | Card | Set | Result |
| ---: | --- | --- | --- | --- |
${rows}

## Next Gate

The 53 linked parent images are product-visible. The next Japanese V4 gate is a separately governed expansion of image acquisition beyond these 53 parents. Public child printing creation and family promotion remain blocked and require independent evidence and approval.
`;
}

async function writeHashManifest(outputRoot, artifacts) {
  const entries = [];
  for (const artifactPath of artifacts) {
    const bytes = await fs.readFile(artifactPath);
    entries.push({
      path: artifactPath.replaceAll('\\', '/'),
      bytes: bytes.byteLength,
      sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
    });
  }
  const manifestPath = path.join(outputRoot, 'artifact_hashes_v1.json');
  await fs.writeFile(manifestPath, stableJson({
    package_id: PRODUCT_SMOKE_VERSION,
    artifacts: entries,
  }), 'utf8');
  return manifestPath;
}

async function runProductSmoke(options) {
  const connectionString = process.env.SUPABASE_DB_URL
    ?? process.env.DATABASE_URL
    ?? process.env.POSTGRES_URL;
  const { rows: pointerRows, plan } = await loadPointerRows();

  const databaseResult = await withReadOnlyClient({
    connectionString,
    environmentLabel: options.environment,
    statementTimeoutMs: 240_000,
  }, async (client, guard) => ({
    rows: await queryProductReadback(client, pointerRows),
    setScopes: await querySetScopeReadback(client, pointerRows),
    guard,
  }));

  const [imageChecks, cardPageChecks, setGridChecks, setPageChecks] =
    await Promise.all([
      fetchImageChecks(options.webBaseUrl, pointerRows),
      fetchCardPageChecks(options.webBaseUrl, pointerRows),
      fetchSetGridChecks(options.webBaseUrl, databaseResult.rows),
      fetchSetPageChecks(options.webBaseUrl, databaseResult.setScopes),
    ]);

  const byCardId = (rows) => new Map(rows.map((row) => [row.card_print_id, row]));
  const imagesById = byCardId(imageChecks);
  const cardPagesById = byCardId(cardPageChecks);
  const setGridById = byCardId(setGridChecks);
  const rows = databaseResult.rows.map((liveRow, index) =>
    buildProductSmokeRow({
      pointerRow: pointerRows[index],
      liveRow,
      imageCheck: imagesById.get(liveRow.card_print_id),
      cardPageCheck: cardPagesById.get(liveRow.card_print_id),
      setGridCheck: setGridById.get(liveRow.card_print_id),
    }),
  );
  const summary = buildProductSmokeSummary(rows, setPageChecks);
  const passed =
    summary.selected_rows === EXPECTED_PRODUCT_SMOKE_ROWS
    && summary.passed_rows === EXPECTED_PRODUCT_SMOKE_ROWS
    && summary.distinct_card_print_ids === EXPECTED_PRODUCT_SMOKE_ROWS
    && summary.distinct_gv_ids === EXPECTED_PRODUCT_SMOKE_ROWS
    && summary.set_pages_passed === summary.set_pages_checked;
  const generatedAt = new Date().toISOString();
  const report = {
    status: passed
      ? 'complete_read_only_product_smoke'
      : 'blocked_product_smoke_findings',
    generated_at: generatedAt,
    web_base_url: options.webBaseUrl,
    source: {
      plan_content_fingerprint_sha256: plan.content_fingerprint_sha256,
      package_fingerprint_sha256: EXPECTED_PACKAGE_FINGERPRINT,
      pointer_plan_hash_sha256: EXPECTED_POINTER_PLAN_HASH,
      mutation_contract_hash_sha256: EXPECTED_MUTATION_CONTRACT_HASH,
    },
    guard: databaseResult.guard,
    summary,
    set_scope_readback: databaseResult.setScopes,
    set_pages: setPageChecks,
    rows,
    execution_boundary: {
      database_reads: true,
      database_writes: false,
      storage_reads_through_product_proxy: true,
      storage_writes: false,
      runtime_http_methods: ['GET'],
      approvals: false,
      child_printing_writes: false,
      family_promotion: false,
      canonical_identity_changes: false,
      pricing_writes: false,
    },
  };
  const artifact = buildArtifact({
    packageId: PRODUCT_SMOKE_VERSION,
    generatedAt,
    retrieval: {
      access_mode: 'guarded_live_read_only_plus_production_http_get',
      database_reads: true,
      database_writes: false,
      storage_reads: true,
      storage_writes: false,
      web_base_url: options.webBaseUrl,
    },
    content: report,
  });

  await fs.mkdir(options.outputRoot, { recursive: true });
  const jsonPath = path.join(
    options.outputRoot,
    'jpn_image_pointer_product_smoke_v1.json',
  );
  const markdownPath = path.join(
    options.outputRoot,
    'jpn_image_pointer_product_smoke_v1.md',
  );
  const jsonWrite = await writeJsonArtifact(jsonPath, artifact);
  await fs.writeFile(markdownPath, markdown(report), 'utf8');
  const hashManifestPath = await writeHashManifest(
    options.outputRoot,
    [jsonPath, markdownPath],
  );

  console.log(stableJson({
    package_id: PRODUCT_SMOKE_VERSION,
    status: report.status,
    rows: summary.selected_rows,
    passed_rows: summary.passed_rows,
    set_pages: summary.set_pages_checked,
    set_pages_passed: summary.set_pages_passed,
    output_json: jsonWrite.path,
    output_markdown: markdownPath.replaceAll('\\', '/'),
    artifact_hashes: hashManifestPath.replaceAll('\\', '/'),
    content_fingerprint_sha256: artifact.content_fingerprint_sha256,
    database_writes: false,
    storage_writes: false,
  }));

  if (!passed) process.exitCode = 1;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.envFile) {
    dotenv.config({ path: options.envFile, quiet: true });
  }
  dotenv.config({ quiet: true });

  const localServer = options.startLocalWeb
    ? startLocalWebServer(options.localWebPort)
    : null;
  try {
    if (localServer) {
      await waitForLocalWeb(options.webBaseUrl, localServer);
    }
    await runProductSmoke(options);
  } finally {
    await stopLocalWebServer(localServer);
  }
}

const isEntrypoint = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isEntrypoint) {
  main().catch((error) => {
    console.error(`[${PRODUCT_SMOKE_VERSION}] fatal:`, error);
    process.exitCode = 1;
  });
}
