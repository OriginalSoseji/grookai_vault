import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';

const ROOT = process.cwd();
const requireFromBackend = createRequire(path.join(ROOT, 'backend', 'package.json'));
const dotenv = requireFromBackend('dotenv');
const pg = requireFromBackend('pg');

for (const envPath of ['.env.local', '.env']) {
  dotenv.config({ path: path.join(ROOT, envPath), override: false });
}

const SOURCE_MATRIX_PATH = path.join(
  ROOT,
  'docs',
  'plans',
  'pokemon_db_remediation_v1',
  'number_normalization_lane_a_247_execution_matrix_20260517.json',
);
const OUT_DIR = path.join(ROOT, 'docs', 'audits', 'pokemon_post_lane_a_247_audit_20260517');
const MATRIX_PATH = path.join(OUT_DIR, 'gv_id_public_coverage_matrix_20260517.json');
const REPORT_PATH = path.join(OUT_DIR, 'gv_id_public_coverage_audit_20260517.md');
const SITE_ORIGIN = 'https://grookaivault.com';
const EXPECTED_ROW_COUNT = 247;

const PUBLIC_VIEW_NAMES = [
  'card_prints_public',
  'v_card_prints_web_v1',
  'v_card_search',
];

const TLS_NOTE =
  'Node fetch required NODE_TLS_REJECT_UNAUTHORIZED=0 in this local environment due local certificate chain verification failure. Browser-facing HTTPS responses were still fetched from https://grookaivault.com.';

function quoteIdent(identifier) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
    throw new Error(`Unsafe identifier: ${identifier}`);
  }
  return `"${identifier}"`;
}

function cleanText(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function normalizeLookupText(value) {
  return cleanText(value)
    ?.toLowerCase()
    .replace(/&[#a-z0-9]+;/gi, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() ?? '';
}

function decodeHtml(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function htmlToVisibleText(html) {
  return decodeHtml(html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' '));
}

function rowSortKey(row) {
  const numberValue = Number(row.number_plain ?? row.number ?? Number.MAX_SAFE_INTEGER);
  const numberKey = Number.isFinite(numberValue) ? numberValue.toString().padStart(5, '0') : '99999';
  return [
    normalizeLookupText(row.set_code ?? row.execution_set_code),
    numberKey,
    normalizeLookupText(row.name),
    row.card_print_id,
  ].join('|');
}

function sortRows(rows) {
  return [...rows].sort((left, right) => rowSortKey(left).localeCompare(rowSortKey(right)));
}

function countBy(rows, getKey) {
  const counts = new Map();
  for (const row of rows) {
    const key = getKey(row);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function groupBy(rows, getKey) {
  const groups = new Map();
  for (const row of rows) {
    const key = getKey(row);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  return groups;
}

function renderTable(headers, rows) {
  const lines = [];
  lines.push(`| ${headers.join(' | ')} |`);
  lines.push(`| ${headers.map(() => '---').join(' | ')} |`);
  for (const row of rows) {
    lines.push(`| ${row.map((value) => String(value ?? '').replace(/\|/g, '\\|')).join(' | ')} |`);
  }
  return lines.join('\n');
}

function loadExecutedRows(executionMatrix) {
  const rows = executionMatrix.updated_rows ?? executionMatrix.before_after_rows ?? [];
  if (!Array.isArray(rows) || rows.length !== EXPECTED_ROW_COUNT) {
    throw new Error(`Expected ${EXPECTED_ROW_COUNT} Lane A execution rows, found ${rows.length}.`);
  }
  return rows.map((row) => ({
    card_print_id: row.card_print_id,
    execution_set_code: row.set_code,
    execution_set_name: row.set_name,
    execution_card_name: row.card_name,
    execution_number: row.number ?? row.after_number,
    execution_number_plain: row.number_plain ?? row.after_number_plain,
  }));
}

async function tableColumnExists(client, tableName, columnName) {
  const { rows } = await client.query(
    `
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = $1
        and column_name = $2
      limit 1
    `,
    [tableName, columnName],
  );
  return rows.length > 0;
}

async function loadViewInventory(client) {
  const inventory = [];

  for (const viewName of PUBLIC_VIEW_NAMES) {
    const { rows: objectRows } = await client.query('select to_regclass($1) as regclass', [`public.${viewName}`]);
    const tableAvailable = Boolean(objectRows[0]?.regclass);
    if (!tableAvailable) {
      inventory.push({
        object_name: viewName,
        table_available: false,
        columns: [],
        match_basis: null,
      });
      continue;
    }

    const { rows: columnRows } = await client.query(
      `
        select column_name
        from information_schema.columns
        where table_schema = 'public'
          and table_name = $1
        order by ordinal_position
      `,
      [viewName],
    );
    const columns = columnRows.map((row) => row.column_name);
    const matchBasis = columns.includes('id')
      ? 'id'
      : columns.includes('card_print_id')
        ? 'card_print_id'
        : columns.includes('gv_id')
          ? 'gv_id'
          : null;

    inventory.push({
      object_name: viewName,
      table_available: true,
      columns,
      match_basis: matchBasis,
    });
  }

  return inventory;
}

async function loadViewMembership(client, viewInventory, cardPrintIds, gvIds) {
  const membership = {};

  for (const view of viewInventory) {
    membership[view.object_name] = {
      table_available: view.table_available,
      match_basis: view.match_basis,
      matched_keys: [],
      matched_count: 0,
    };

    if (!view.table_available || !view.match_basis) {
      continue;
    }

    const objectSql = `public.${quoteIdent(view.object_name)}`;
    const columnSql = quoteIdent(view.match_basis);
    const values = view.match_basis === 'gv_id' ? gvIds : cardPrintIds;
    const { rows } = await client.query(
      `
        select distinct ${columnSql}::text as key
        from ${objectSql}
        where ${columnSql}::text = any($1::text[])
      `,
      [values],
    );
    membership[view.object_name].matched_keys = rows.map((row) => row.key).sort();
    membership[view.object_name].matched_count = rows.length;
  }

  return membership;
}

async function loadLiveRows(client, executedRows) {
  const expectedIds = executedRows.map((row) => row.card_print_id);
  const { rows } = await client.query(
    `
      with expected as (
        select *
        from jsonb_to_recordset($1::jsonb) as e(
          card_print_id uuid,
          execution_set_code text,
          execution_set_name text,
          execution_card_name text,
          execution_number text,
          execution_number_plain text
        )
      )
      select
        e.card_print_id::text,
        e.execution_set_code,
        e.execution_set_name,
        e.execution_card_name,
        e.execution_number,
        e.execution_number_plain,
        cp.gv_id,
        cp.name,
        cp.number,
        cp.number_plain,
        cp.image_url,
        cp.representative_image_url,
        cp.image_status,
        cp.set_code as card_print_set_code,
        cp.identity_domain,
        cp.variant_key,
        cp.printed_identity_modifier,
        s.code as set_code,
        s.name as set_name,
        s.identity_model as set_identity_model,
        coalesce(ai.active_identity_rows, 0)::int as active_identity_rows
      from expected e
      left join public.card_prints cp on cp.id = e.card_print_id
      left join public.sets s on s.id = cp.set_id
      left join lateral (
        select count(*)::int as active_identity_rows
        from public.card_print_identity cpi
        where cpi.card_print_id = cp.id
          and cpi.is_active = true
      ) ai on true
      order by lower(coalesce(s.code, e.execution_set_code)), cp.number_plain nulls last, cp.number nulls last, cp.name nulls last
    `,
    [JSON.stringify(executedRows)],
  );

  const expectedIdSet = new Set(expectedIds);
  const liveIdSet = new Set(rows.map((row) => row.card_print_id));
  const missingLiveIds = [...expectedIdSet].filter((id) => !liveIdSet.has(id)).sort();

  return {
    rows,
    missing_live_ids: missingLiveIds,
  };
}

function classifyCoverageRows(rows, viewMembership) {
  const availableMembershipObjects = Object.entries(viewMembership)
    .filter(([, info]) => info.table_available && info.match_basis);
  const matchedByObject = new Map(
    availableMembershipObjects.map(([objectName, info]) => [objectName, new Set(info.matched_keys)]),
  );

  return rows.map((row) => {
    const membership = {};
    for (const [objectName, info] of Object.entries(viewMembership)) {
      const key = info.match_basis === 'gv_id' ? row.gv_id : row.card_print_id;
      membership[objectName] = {
        table_available: info.table_available,
        match_basis: info.match_basis,
        present: Boolean(key && matchedByObject.get(objectName)?.has(String(key))),
      };
    }

    const appearsInPublicView = Object.values(membership).some((entry) => entry.table_available && entry.present);
    const hasGvId = Boolean(cleanText(row.gv_id));
    const hasSetName = Boolean(cleanText(row.set_name));
    const hasCardNumber = Boolean(cleanText(row.number)) && Boolean(cleanText(row.number_plain));
    const hasImage = Boolean(cleanText(row.image_url));
    const hasAnyImage = hasImage || Boolean(cleanText(row.representative_image_url));
    const hasPublicViewBlocker = availableMembershipObjects.length > 0 && !appearsInPublicView;

    const reasons = [];
    if (!hasGvId) reasons.push('MISSING_GV_ID');
    if (!hasSetName) reasons.push('MISSING_SET_NAME');
    if (!hasCardNumber) reasons.push('MISSING_CARD_NUMBER');
    if (hasPublicViewBlocker) reasons.push('MISSING_PUBLIC_VIEW_MEMBERSHIP');
    if (!hasImage) reasons.push('MISSING_IMAGE');

    const classification = reasons.find((reason) => reason !== 'MISSING_IMAGE') ?? reasons[0] ?? 'PUBLIC_READY';

    return {
      card_print_id: row.card_print_id,
      gv_id: cleanText(row.gv_id),
      name: cleanText(row.name),
      number: cleanText(row.number),
      number_plain: cleanText(row.number_plain),
      image_url: cleanText(row.image_url),
      representative_image_url: cleanText(row.representative_image_url),
      image_status: cleanText(row.image_status),
      set_code: cleanText(row.set_code),
      set_name: cleanText(row.set_name),
      card_print_set_code: cleanText(row.card_print_set_code),
      identity_domain: cleanText(row.identity_domain),
      variant_key: cleanText(row.variant_key),
      printed_identity_modifier: cleanText(row.printed_identity_modifier),
      set_identity_model: cleanText(row.set_identity_model),
      active_identity_rows: row.active_identity_rows,
      execution_set_code: cleanText(row.execution_set_code),
      execution_set_name: cleanText(row.execution_set_name),
      execution_card_name: cleanText(row.execution_card_name),
      execution_number: cleanText(row.execution_number),
      execution_number_plain: cleanText(row.execution_number_plain),
      canonical_route_candidate: hasGvId,
      public_web_app_route_eligible: hasGvId,
      has_gv_id: hasGvId,
      has_set_name: hasSetName,
      has_card_number: hasCardNumber,
      has_image_url: hasImage,
      has_any_image: hasAnyImage,
      appears_in_public_web_views: appearsInPublicView,
      public_view_membership: membership,
      classification,
      reasons: reasons.length > 0 ? reasons : ['PUBLIC_READY'],
    };
  });
}

function buildCounts(rows, viewInventory) {
  const publicReadyRows = rows.filter((row) => row.classification === 'PUBLIC_READY');
  const classificationCounts = Object.fromEntries([...countBy(rows, (row) => row.classification).entries()].sort());
  const reasonCounts = {};
  for (const row of rows) {
    for (const reason of row.reasons) {
      reasonCounts[reason] = (reasonCounts[reason] ?? 0) + 1;
    }
  }

  return {
    total_audited: rows.length,
    has_gv_id: rows.filter((row) => row.has_gv_id).length,
    missing_gv_id: rows.filter((row) => !row.has_gv_id).length,
    has_set_name: rows.filter((row) => row.has_set_name).length,
    missing_set_name: rows.filter((row) => !row.has_set_name).length,
    has_card_number: rows.filter((row) => row.has_card_number).length,
    missing_card_number: rows.filter((row) => !row.has_card_number).length,
    has_image: rows.filter((row) => row.has_image_url).length,
    missing_image: rows.filter((row) => !row.has_image_url).length,
    has_any_image: rows.filter((row) => row.has_any_image).length,
    missing_any_image: rows.filter((row) => !row.has_any_image).length,
    appears_in_public_web_views: rows.filter((row) => row.appears_in_public_web_views).length,
    absent_from_public_web_views: rows.filter((row) => !row.appears_in_public_web_views).length,
    public_web_app_route_eligible: rows.filter((row) => row.public_web_app_route_eligible).length,
    public_ready: publicReadyRows.length,
    not_public_ready: rows.length - publicReadyRows.length,
    classification_counts: classificationCounts,
    reason_counts: Object.fromEntries(Object.entries(reasonCounts).sort()),
    available_public_membership_objects: viewInventory.filter((view) => view.table_available && view.match_basis).length,
  };
}

function takeBalancedSample(rows, targetCount, perSetLimit = 6) {
  const sorted = sortRows(rows);
  const groups = [...groupBy(sorted, (row) => cleanText(row.set_code) ?? cleanText(row.execution_set_code) ?? 'unknown').entries()]
    .sort(([left], [right]) => left.localeCompare(right));
  const selected = [];
  const selectedIds = new Set();

  for (const [, groupRows] of groups) {
    for (const row of groupRows.slice(0, perSetLimit)) {
      if (selected.length >= targetCount) break;
      selected.push(row);
      selectedIds.add(row.card_print_id);
    }
    if (selected.length >= targetCount) break;
  }

  if (selected.length < targetCount) {
    for (const row of sorted) {
      if (selected.length >= targetCount) break;
      if (selectedIds.has(row.card_print_id)) continue;
      selected.push(row);
      selectedIds.add(row.card_print_id);
    }
  }

  return selected;
}

function buildWebsiteSample(rows) {
  const missingGvId = sortRows(rows.filter((row) => !row.gv_id));
  const withGvId = sortRows(rows.filter((row) => row.gv_id));
  const missingSample = missingGvId.length <= 30 ? missingGvId : takeBalancedSample(missingGvId, 18, 6);
  const targetWithGvId = Math.max(30 - missingSample.length, 12);
  const withGvIdSample = takeBalancedSample(withGvId, Math.min(targetWithGvId, withGvId.length), 6);
  const selected = [...missingSample, ...withGvIdSample];
  const selectedIds = new Set(selected.map((row) => row.card_print_id));

  if (selected.length < 30) {
    for (const row of sortRows(rows)) {
      if (selected.length >= 30) break;
      if (selectedIds.has(row.card_print_id)) continue;
      selected.push(row);
      selectedIds.add(row.card_print_id);
    }
  }

  return sortRows(selected);
}

async function fetchWithStatus(url, options = {}) {
  const response = await fetch(url, {
    redirect: 'follow',
    ...options,
    headers: {
      'User-Agent': 'grookai-readonly-public-coverage-audit/1.0',
      ...(options.headers ?? {}),
    },
  });
  const contentType = response.headers.get('content-type') ?? '';
  const body = contentType.includes('application/json') ? await response.json() : await response.text();
  return {
    url: response.url,
    status: response.status,
    ok: response.ok,
    content_type: contentType,
    body,
  };
}

function searchRowsFromPayload(payload) {
  if (!payload || typeof payload !== 'object') return [];
  if (Array.isArray(payload.rows)) return payload.rows;
  if (Array.isArray(payload.canonical)) return payload.canonical;
  return [];
}

function buildSampleSearchQuery(row) {
  return [
    row.name,
    row.set_name,
    row.number,
  ].filter(Boolean).join(' ');
}

function rowMatchesSearchResult(row, result) {
  const resultGvId = cleanText(result?.gv_id);
  if (row.gv_id && resultGvId && resultGvId.toUpperCase() === row.gv_id.toUpperCase()) {
    return true;
  }

  const nameMatches = normalizeLookupText(result?.name) === normalizeLookupText(row.name);
  const numberMatches = normalizeLookupText(result?.number) === normalizeLookupText(row.number);
  const resultSetName = normalizeLookupText(result?.set_name ?? result?.sets?.name ?? result?.setName);
  const setMatches = resultSetName && resultSetName === normalizeLookupText(row.set_name);
  return Boolean(nameMatches && numberMatches && setMatches);
}

async function verifyWebsiteSample(rows) {
  if (!process.env.NODE_TLS_REJECT_UNAUTHORIZED) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }

  const checks = [];
  for (const row of rows) {
    const searchQuery = buildSampleSearchQuery(row);
    const searchUrl = `${SITE_ORIGIN}/api/resolver/search?q=${encodeURIComponent(searchQuery)}&sort=relevance`;
    let searchStatus = null;
    let searchMatch = false;
    let searchFirstGvId = null;
    let searchError = null;

    try {
      const searchResponse = await fetchWithStatus(searchUrl);
      searchStatus = searchResponse.status;
      const searchRows = searchRowsFromPayload(searchResponse.body);
      searchFirstGvId = cleanText(searchRows[0]?.gv_id);
      searchMatch = searchRows.some((result) => rowMatchesSearchResult(row, result));
    } catch (error) {
      searchError = error instanceof Error ? error.message : 'unknown fetch error';
    }

    let cardUrl = null;
    let cardStatus = null;
    let pageHasCard = false;
    let pageHasName = false;
    let pageHasSetName = false;
    let pageHasNumber = false;
    let pageHasImage = false;
    let cardError = null;

    if (row.gv_id) {
      cardUrl = `${SITE_ORIGIN}/card/${encodeURIComponent(row.gv_id)}`;
      try {
        const cardResponse = await fetchWithStatus(cardUrl);
        cardStatus = cardResponse.status;
        const html = typeof cardResponse.body === 'string' ? cardResponse.body : JSON.stringify(cardResponse.body);
        const visibleText = normalizeLookupText(htmlToVisibleText(html));
        pageHasCard = cardResponse.ok;
        pageHasName = visibleText.includes(normalizeLookupText(row.name));
        pageHasSetName = visibleText.includes(normalizeLookupText(row.set_name));
        pageHasNumber = visibleText.includes(normalizeLookupText(row.number));
        pageHasImage = /<img\b/i.test(html);
      } catch (error) {
        cardError = error instanceof Error ? error.message : 'unknown fetch error';
      }
    }

    const cardRouteReady = Boolean(row.gv_id && cardStatus === 200 && pageHasCard && pageHasName && pageHasSetName && pageHasNumber);
    const imageReady = row.has_any_image ? pageHasImage : true;
    const status = !row.gv_id
      ? 'FAIL_MISSING_GV_ID_PUBLIC_ROUTE'
      : cardRouteReady && searchMatch && imageReady
        ? 'PASS'
        : 'FAIL_PUBLIC_DISPLAY_MISMATCH';

    checks.push({
      card_print_id: row.card_print_id,
      gv_id: row.gv_id,
      name: row.name,
      set_name: row.set_name,
      number: row.number,
      image_url: row.image_url,
      representative_image_url: row.representative_image_url,
      search_query: searchQuery,
      search_api_url: searchUrl,
      search_api_status: searchStatus,
      search_api_match: searchMatch,
      search_api_first_gv_id: searchFirstGvId,
      search_error: searchError,
      card_url: cardUrl,
      card_status: cardStatus,
      page_has_card: pageHasCard,
      page_has_name: pageHasName,
      page_has_set_name: pageHasSetName,
      page_has_number: pageHasNumber,
      page_has_image: pageHasImage,
      card_error: cardError,
      status,
    });
  }

  return checks;
}

function buildSetBreakdown(rows) {
  return [...groupBy(rows, (row) => row.set_code ?? row.execution_set_code ?? 'unknown').entries()]
    .map(([setCode, setRows]) => {
      const counts = buildCounts(setRows, []);
      return {
        set_code: setCode,
        set_name: setRows[0]?.set_name ?? setRows[0]?.execution_set_name ?? null,
        total_rows: setRows.length,
        has_gv_id: counts.has_gv_id,
        missing_gv_id: counts.missing_gv_id,
        public_ready: counts.public_ready,
        missing_image: counts.missing_image,
        appears_in_public_web_views: counts.appears_in_public_web_views,
      };
    })
    .sort((left, right) => left.set_code.localeCompare(right.set_code));
}

function renderMarkdown(matrix) {
  const lines = [];
  const counts = matrix.counts;
  const website = matrix.website_sample_summary;

  lines.push('# GV-ID Public Coverage Audit - 2026-05-17');
  lines.push('');
  lines.push('Status: read-only focused audit after the Lane A 247 number-normalization execution. No Supabase writes, migrations, inserts, updates, deletes, generated ID backfills, public view rewrites, deploys, card/set changes, or variant changes were performed.');
  lines.push('');
  lines.push('## Corrected Display Rule');
  lines.push('');
  lines.push('Blank or hidden `card_prints.set_code` is not a user-facing defect. Grookai product display should show set name as the user-facing authority. Set code remains internal routing/debug identity. This audit does not mark missing visible set code as a failure.');
  lines.push('');
  lines.push('The remaining public issue is `gv_id` and public addressability coverage: whether normalized cards have a stable public route and can be surfaced with card name, set name, card number, image, and `/card/[gv_id]` where applicable.');
  lines.push('');
  lines.push('## Coverage Counts');
  lines.push('');
  lines.push(renderTable(
    ['Metric', 'Count'],
    [
      ['Total audited', counts.total_audited],
      ['Has gv_id', counts.has_gv_id],
      ['Missing gv_id', counts.missing_gv_id],
      ['Public-ready', counts.public_ready],
      ['Not public-ready', counts.not_public_ready],
      ['Has set name', counts.has_set_name],
      ['Missing set name', counts.missing_set_name],
      ['Has card number', counts.has_card_number],
      ['Missing card number', counts.missing_card_number],
      ['Has image_url', counts.has_image],
      ['Missing image_url', counts.missing_image],
      ['Has any image field', counts.has_any_image],
      ['Missing any image field', counts.missing_any_image],
      ['Appears in public web views', counts.appears_in_public_web_views],
      ['Absent from public web views', counts.absent_from_public_web_views],
      ['Public web app route eligible', counts.public_web_app_route_eligible],
    ],
  ));
  lines.push('');
  lines.push('## Classification Counts');
  lines.push('');
  lines.push(renderTable(
    ['Classification', 'Rows'],
    Object.entries(counts.classification_counts).map(([classification, count]) => [classification, count]),
  ));
  lines.push('');
  lines.push('## Reason Counts');
  lines.push('');
  lines.push(renderTable(
    ['Reason', 'Rows'],
    Object.entries(counts.reason_counts).map(([reason, count]) => [reason, count]),
  ));
  lines.push('');
  lines.push('## Set Breakdown');
  lines.push('');
  lines.push(renderTable(
    ['Set', 'Name', 'Rows', 'Has gv_id', 'Missing gv_id', 'Public-ready', 'Missing image_url'],
    matrix.set_breakdown.map((row) => [
      row.set_code,
      row.set_name,
      row.total_rows,
      row.has_gv_id,
      row.missing_gv_id,
      row.public_ready,
      row.missing_image,
    ]),
  ));
  lines.push('');
  lines.push('## Public View Inventory');
  lines.push('');
  lines.push(renderTable(
    ['Object', 'Available', 'Match basis', 'Matched rows'],
    matrix.public_view_inventory.map((view) => [
      view.object_name,
      view.table_available,
      view.match_basis ?? '',
      matrix.public_view_membership[view.object_name]?.matched_count ?? 0,
    ]),
  ));
  lines.push('');
  lines.push('## Website Sample Verification');
  lines.push('');
  lines.push(renderTable(
    ['Metric', 'Count'],
    [
      ['Sample count', website.sample_count],
      ['Pass', website.pass_count],
      ['Fail', website.fail_count],
      ['Missing gv_id route failures', website.missing_gv_id_route_failures],
      ['Display mismatch failures', website.public_display_mismatch_failures],
    ],
  ));
  lines.push('');
  lines.push(renderTable(
    ['Status', 'GV-ID', 'Name', 'Set name', 'Number', 'Card status', 'Search match', 'Image tag'],
    matrix.website_sample_checks.slice(0, 40).map((row) => [
      row.status,
      row.gv_id ?? '',
      row.name,
      row.set_name,
      row.number,
      row.card_status ?? '',
      row.search_api_match,
      row.page_has_image,
    ]),
  ));
  lines.push('');
  lines.push('## Proposed Fix Plan');
  lines.push('');
  lines.push('1. Missing `gv_id`: the existing public web contract treats non-null `card_prints.gv_id` as the stable public route identity. The repo has compatibility aliases for legacy GV-ID prefixes and several historical migrations that set specific GV-IDs, but this audit did not find a general approved backfill execution path for the 247 Lane A rows. A future generator/backfill plan must be explicit, reviewed, and guarded.');
  lines.push('');
  lines.push('2. Safe generation requirements: before any future `gv_id` backfill, prove deterministic input fields for each row: canonical Pokemon domain, canonical set identity, printed number, card name, identity modifier/variant where needed, and collision-free candidate GV-ID. The plan must query the existing unique `card_prints.gv_id` surface and compatibility alias rules before proposing any new IDs.');
  lines.push('');
  lines.push('3. Public view/query exclusion: current web code primarily reads `card_prints` directly and filters public set/card/search surfaces to rows with non-null `gv_id`. Missing `gv_id` is therefore an intentional public route gate, not a reason to loosen web queries. If DB public views are introduced or used later, they should preserve the same stable-ID gate unless a separate product decision authorizes provisional exposure.');
  lines.push('');
  lines.push('4. Route/search failures with existing `gv_id`: rows that already have `gv_id` should continue to be verified through `/card/[gv_id]` and `/api/resolver/search`. If any such row fails, investigate resolver identifier normalization, search scoring, and public set routing before changing DB data.');
  lines.push('');
  lines.push('5. Image-only issues: rows whose only missing signal is image coverage should be classified as image pipeline work, not a GV-ID or set-code issue.');
  lines.push('');
  lines.push('## TLS Note');
  lines.push('');
  lines.push(matrix.tls_note);
  lines.push('');
  lines.push('## Confirmation');
  lines.push('');
  lines.push('- Supabase writes: none.');
  lines.push('- Migrations: none.');
  lines.push('- Data changes: none.');
  lines.push('- Deploy: none.');
  return `${lines.join('\n')}\n`;
}

async function main() {
  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) throw new Error('SUPABASE_DB_URL is not set.');

  const executionMatrix = JSON.parse(await fs.readFile(SOURCE_MATRIX_PATH, 'utf8'));
  const executedRows = loadExecutedRows(executionMatrix);
  const client = new pg.Client({
    connectionString,
    application_name: 'gv_id_public_coverage_audit_v1:readonly',
    statement_timeout: 120000,
  });

  let live;
  let viewInventory;
  let viewMembership;
  await client.connect();
  try {
    await client.query('begin transaction read only');

    const cardPrintSetCodeExists = await tableColumnExists(client, 'card_prints', 'set_code');
    if (!cardPrintSetCodeExists) {
      throw new Error('Expected public.card_prints.set_code to exist for compatibility audit.');
    }

    live = await loadLiveRows(client, executedRows);
    viewInventory = await loadViewInventory(client);
    const gvIds = live.rows.map((row) => row.gv_id).filter((value) => typeof value === 'string' && value.trim());
    viewMembership = await loadViewMembership(
      client,
      viewInventory,
      live.rows.map((row) => row.card_print_id),
      gvIds,
    );

    await client.query('rollback');
  } catch (error) {
    try {
      await client.query('rollback');
    } catch {
      // Preserve the original error.
    }
    throw error;
  } finally {
    await client.end();
  }

  const coverageRows = classifyCoverageRows(live.rows, viewMembership);
  const counts = buildCounts(coverageRows, viewInventory);
  const websiteSampleRows = buildWebsiteSample(coverageRows);
  const websiteSampleChecks = await verifyWebsiteSample(websiteSampleRows);
  const websiteStatusCounts = Object.fromEntries([...countBy(websiteSampleChecks, (row) => row.status).entries()].sort());
  const matrix = {
    status: live.missing_live_ids.length === 0 ? 'READ_ONLY_AUDIT_COMPLETE' : 'READ_ONLY_AUDIT_LIVE_ROW_MISMATCH',
    generated_at: new Date().toISOString(),
    source_matrix: path.relative(ROOT, SOURCE_MATRIX_PATH).replace(/\\/g, '/'),
    audit_scope: {
      lane: 'Lane A 247 post-execution public identity/display coverage',
      total_expected_rows: EXPECTED_ROW_COUNT,
      display_rule: 'set name is user-facing authority; set_code is internal/routing/debug and is not required for product display',
      hard_rules: [
        'no Supabase writes',
        'no migrations',
        'no inserts',
        'no updates',
        'no deletes',
        'no generated ID backfill execution',
        'no public view rewrites',
        'no deploy',
      ],
    },
    tls_note: TLS_NOTE,
    missing_live_ids: live.missing_live_ids,
    counts,
    public_view_inventory: viewInventory,
    public_view_membership: viewMembership,
    set_breakdown: buildSetBreakdown(coverageRows),
    rows: coverageRows,
    website_sample_summary: {
      sample_count: websiteSampleChecks.length,
      pass_count: websiteSampleChecks.filter((row) => row.status === 'PASS').length,
      fail_count: websiteSampleChecks.filter((row) => row.status !== 'PASS').length,
      missing_gv_id_route_failures: websiteSampleChecks.filter((row) => row.status === 'FAIL_MISSING_GV_ID_PUBLIC_ROUTE').length,
      public_display_mismatch_failures: websiteSampleChecks.filter((row) => row.status === 'FAIL_PUBLIC_DISPLAY_MISMATCH').length,
      status_counts: websiteStatusCounts,
    },
    website_sample_checks: websiteSampleChecks,
  };

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(MATRIX_PATH, JSON.stringify(matrix, null, 2) + '\n');
  await fs.writeFile(REPORT_PATH, renderMarkdown(matrix));

  console.log(JSON.stringify({
    status: matrix.status,
    total_audited: counts.total_audited,
    has_gv_id: counts.has_gv_id,
    missing_gv_id: counts.missing_gv_id,
    public_ready: counts.public_ready,
    sample_count: matrix.website_sample_summary.sample_count,
    sample_pass: matrix.website_sample_summary.pass_count,
    sample_fail: matrix.website_sample_summary.fail_count,
  }, null, 2));
}

await main();
