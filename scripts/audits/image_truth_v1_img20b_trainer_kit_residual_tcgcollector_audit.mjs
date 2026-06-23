import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import https from 'node:https';
import process from 'node:process';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/image_truth_v1';
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'image_truth_img20b_trainer_kit_residual_tcgcollector_audit_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'image_truth_img20b_trainer_kit_residual_tcgcollector_audit_v1.md');
const PACKAGE_ID = 'IMG-20B-TRAINER-KIT-RESIDUAL-TCGCOLLECTOR-FALLBACK-AUDIT';

const POKEMON_TCG_TRAINER_KIT_SET_CODE_ALIASES = {
  'tk-ex-latia': 'tk1a',
  'tk-ex-latio': 'tk1b',
  'tk-ex-m': 'tk2b',
  'tk-ex-p': 'tk2a',
  tk2b: 'tk2b',
};

const MALIE_TRAINER_KIT_SET_CODES = new Set([
  'tk-bw-z',
  'tk-bw-e',
  'tk-xy-n',
  'tk-xy-sy',
  'tk-xy-b',
  'tk-xy-w',
  'tk-xy-latio',
  'tk-xy-latia',
  'tk-xy-p',
  'tk-xy-su',
  'tk-sm-l',
  'tk-sm-r',
]);

const TCGCOLLECTOR_SOURCE_PAGES = {
  'tk-dp-l': 'https://www.tcgcollector.com/sets/11100/dp-trainer-kit-lucario',
  'tk-dp-m': 'https://www.tcgcollector.com/sets/1199/dp-trainer-kit-manaphy',
  'tk-hs-g': 'https://www.tcgcollector.com/sets/11101/hgss-trainer-kit-gyarados',
  'tk-hs-r': 'https://www.tcgcollector.com/sets/11102/hgss-trainer-kit-raichu',
};

const TCGCOLLECTOR_TARGET_NUMBERS = {
  'tk-dp-l': new Set(Array.from({ length: 11 }, (_, index) => String(index + 1))),
  'tk-dp-m': new Set(Array.from({ length: 12 }, (_, index) => String(index + 1))),
  'tk-hs-g': new Set(['20']),
  'tk-hs-r': new Set(['19']),
};

function requireDbUrl() {
  return (
    process.env.SUPABASE_DB_URL ??
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    null
  );
}

function canonicalizeJson(value) {
  if (Array.isArray(value)) return value.map((entry) => canonicalizeJson(entry));
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value)
    .sort((a, b) => a.localeCompare(b))
    .reduce((acc, key) => {
      acc[key] = canonicalizeJson(value[key]);
      return acc;
    }, {});
}

function proofHash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(canonicalizeJson(value))).digest('hex');
}

function clean(value) {
  const normalized = String(value ?? '').trim();
  return normalized.length > 0 ? normalized : null;
}

function numericCardNumber(row) {
  const number = clean(row.number);
  if (number && /^\d+$/.test(number)) return String(Number(number));
  const numberPlain = clean(row.number_plain);
  if (numberPlain && /^\d+$/.test(numberPlain)) return String(Number(numberPlain));
  return null;
}

function hasAnyParentImage(row) {
  return Boolean(
    clean(row.image_path) || clean(row.image_url) || clean(row.image_alt_url) || clean(row.representative_image_url),
  );
}

function hasTcgdexReference(row) {
  return [row.image_path, row.image_url, row.image_alt_url, row.representative_image_url]
    .some((value) => clean(value)?.toLowerCase().includes('assets.tcgdex.net/en/tk/'));
}

function hasPokemonTcgReplacement(row) {
  const setCode = clean(row.set_code)?.toLowerCase();
  const number = numericCardNumber(row);
  return Boolean(setCode && number && POKEMON_TCG_TRAINER_KIT_SET_CODE_ALIASES[setCode]);
}

function hasMalieReplacement(row) {
  const setCode = clean(row.set_code)?.toLowerCase();
  const number = numericCardNumber(row);
  return Boolean(setCode && number && MALIE_TRAINER_KIT_SET_CODES.has(setCode));
}

function hasTcgCollectorReplacement(row) {
  const setCode = clean(row.set_code)?.toLowerCase();
  const number = numericCardNumber(row);
  return Boolean(setCode && number && TCGCOLLECTOR_TARGET_NUMBERS[setCode]?.has(number));
}

function hasRuntimeResolverDisplay(row) {
  if (hasTcgdexReference(row)) {
    return hasPokemonTcgReplacement(row) || hasMalieReplacement(row) || hasTcgCollectorReplacement(row);
  }

  if (hasAnyParentImage(row)) {
    return true;
  }

  return hasMalieReplacement(row) || hasTcgCollectorReplacement(row);
}

function fetchText(url) {
  const agent = new https.Agent({ rejectUnauthorized: false });
  return new Promise((resolve, reject) => {
    https
      .get(url, { agent, headers: { 'user-agent': 'grookai-image-audit/1.0' } }, (response) => {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          body += chunk;
        });
        response.on('end', () => {
          if ((response.statusCode ?? 500) >= 400) {
            reject(new Error(`${url} returned HTTP ${response.statusCode}`));
            return;
          }
          resolve(body);
        });
      })
      .on('error', reject);
  });
}

function parseTcgCollectorCards(html, setCode) {
  const matches = Array.from(
    html.matchAll(
      /<div\s+class="[\s\S]*?card-image-grid-item[\s\S]*?data-card-id="(?<id>\d+)"[\s\S]*?<a[\s\S]*?href="(?<href>[^"]+)"[\s\S]*?title="(?<title>[^"]+)"[\s\S]*?<img[\s\S]*?src="(?<src>[^"]+)"[\s\S]*?srcset="(?<srcset>[^"]+)"[\s\S]*?alt="(?<alt>[^"]+)"[\s\S]*?<div class="card-image-grid-item-info-overlay-number">\s*(?<number>[^<]+?)\s*<\/div>/g,
    ),
  );

  return matches.map((match) => {
    const srcsetUrls = match.groups.srcset
      .split(',')
      .map((entry) => entry.trim().split(/\s+/)[0])
      .filter(Boolean);
    const sourceNumber = match.groups.number.trim();
    const number = sourceNumber.split('/')[0]?.trim();
    return {
      set_code: setCode,
      card_id: match.groups.id,
      number,
      source_number: sourceNumber,
      title: match.groups.title,
      href: `https://www.tcgcollector.com${match.groups.href}`,
      image_url: srcsetUrls.at(-1) ?? match.groups.src,
    };
  });
}

async function readTcgCollectorSourceRows() {
  const rows = [];
  for (const [setCode, url] of Object.entries(TCGCOLLECTOR_SOURCE_PAGES)) {
    const targetNumbers = TCGCOLLECTOR_TARGET_NUMBERS[setCode];
    try {
      const html = await fetchText(url);
      const sourceRows = parseTcgCollectorCards(html, setCode)
        .filter((row) => targetNumbers.has(row.number));
      rows.push({
        set_code: setCode,
        source_url: url,
        source_probe_status: 'ok',
        target_count: targetNumbers.size,
        source_match_count: sourceRows.length,
        source_rows: sourceRows,
      });
    } catch (error) {
      rows.push({
        set_code: setCode,
        source_url: url,
        source_probe_status: `failed: ${error.message}`,
        target_count: targetNumbers.size,
        source_match_count: 0,
        source_rows: [],
      });
    }
  }
  return rows;
}

async function queryRows(client, sql, params = []) {
  const result = await client.query(sql, params);
  return result.rows;
}

async function readSourceSignals() {
  const resolverSource = await fs.readFile('apps/web/src/lib/canon/resolveCardImageFieldsV1.ts', 'utf8');
  return {
    resolver_has_tcgcollector_map: resolverSource.includes('TCGCOLLECTOR_TRAINER_KIT_IMAGE_URLS'),
    resolver_has_tcgcollector_helper: resolverSource.includes('getTcgCollectorTrainerKitReplacementImageUrl'),
    resolver_marks_residual_tcgcollector_as_representative_shared:
      resolverSource.includes('TCG Collector Trainer Kit image used') &&
      resolverSource.includes('image_status: "representative_shared"'),
    resolver_keeps_tcgcollector_as_external_source: resolverSource.includes('image_source: "external"'),
  };
}

function markdownTable(rows, columns) {
  if (rows.length === 0) return '_None._';
  const header = `| ${columns.map((column) => column.label).join(' | ')} |`;
  const divider = `| ${columns.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => {
    const cells = columns.map((column) => String(column.value(row) ?? '').replace(/\|/g, '\\|'));
    return `| ${cells.join(' | ')} |`;
  });
  return [header, divider, ...body].join('\n');
}

async function buildAudit(client) {
  const trainerKitRows = await queryRows(
    client,
    `
      select
        cp.id,
        cp.gv_id,
        cp.name,
        cp.set_code,
        s.name as set_name,
        cp.number,
        cp.number_plain,
        cp.image_source,
        cp.image_status,
        cp.image_url,
        cp.image_alt_url,
        cp.image_path,
        cp.representative_image_url
      from public.card_prints cp
      left join public.sets s on s.id = cp.set_id
      where cp.set_code like 'tk-%'
      order by cp.set_code, nullif(regexp_replace(coalesce(cp.number_plain, cp.number, ''), '\\D', '', 'g'), '')::int nulls last, cp.number, cp.name
    `,
  );
  const sourceSignals = await readSourceSignals();
  const tcgCollectorSourceProof = await readTcgCollectorSourceRows();

  const sourceRowsBySetAndNumber = new Map();
  for (const sourcePage of tcgCollectorSourceProof) {
    for (const sourceRow of sourcePage.source_rows) {
      sourceRowsBySetAndNumber.set(`${sourceRow.set_code}:${sourceRow.number}`, sourceRow);
    }
  }

  const residualRows = trainerKitRows
    .filter((row) => hasTcgCollectorReplacement(row))
    .map((row) => {
      const number = numericCardNumber(row);
      const sourceRow = sourceRowsBySetAndNumber.get(`${row.set_code}:${number}`);
      return {
        gv_id: row.gv_id,
        name: row.name,
        set_code: row.set_code,
        set_name: row.set_name,
        number: row.number,
        source_title: sourceRow?.title ?? null,
        source_href: sourceRow?.href ?? null,
        source_image_url: sourceRow?.image_url ?? null,
        source_match: Boolean(sourceRow),
      };
    });

  const unresolvedAfterRuntime = trainerKitRows.filter((row) => !hasRuntimeResolverDisplay(row));
  const summaryBySet = Object.entries(
    trainerKitRows.reduce((acc, row) => {
      const bucket = (acc[row.set_code] ??= {
        set_code: row.set_code,
        set_name: row.set_name,
        parent_rows: 0,
        rows_without_any_parent_image: 0,
        rows_with_tcgdex_reference: 0,
        rows_with_pokemon_tcg_exact_replacement_available: 0,
        rows_with_malie_runtime_fallback: 0,
        rows_with_tcgcollector_runtime_fallback: 0,
        rows_with_runtime_resolver_display: 0,
        rows_unresolved_after_runtime: 0,
      });
      bucket.parent_rows += 1;
      if (!hasAnyParentImage(row)) bucket.rows_without_any_parent_image += 1;
      if (hasTcgdexReference(row)) bucket.rows_with_tcgdex_reference += 1;
      if (hasPokemonTcgReplacement(row)) bucket.rows_with_pokemon_tcg_exact_replacement_available += 1;
      if (hasMalieReplacement(row)) bucket.rows_with_malie_runtime_fallback += 1;
      if (hasTcgCollectorReplacement(row)) bucket.rows_with_tcgcollector_runtime_fallback += 1;
      if (hasRuntimeResolverDisplay(row)) bucket.rows_with_runtime_resolver_display += 1;
      if (!hasRuntimeResolverDisplay(row)) bucket.rows_unresolved_after_runtime += 1;
      return acc;
    }, {}),
  )
    .map(([, value]) => value)
    .sort((a, b) => a.set_code.localeCompare(b.set_code));

  const payload = {
    package_id: PACKAGE_ID,
    mode: 'read_only_audit',
    generated_at: new Date().toISOString(),
    summary: {
      trainer_kit_parent_row_count: trainerKitRows.length,
      trainer_kit_rows_with_runtime_resolver_display: trainerKitRows.length - unresolvedAfterRuntime.length,
      trainer_kit_rows_unresolved_after_runtime: unresolvedAfterRuntime.length,
      residual_tcgcollector_target_row_count: residualRows.length,
      residual_tcgcollector_rows_matching_source_listing: residualRows.filter((row) => row.source_match).length,
      source_signals: sourceSignals,
      summary_by_set: summaryBySet,
      tcgcollector_source_proof: tcgCollectorSourceProof.map((row) => ({
        set_code: row.set_code,
        source_url: row.source_url,
        source_probe_status: row.source_probe_status,
        target_count: row.target_count,
        source_match_count: row.source_match_count,
      })),
    },
    examples: {
      residual_tcgcollector_rows: residualRows,
      unresolved_after_runtime_examples: unresolvedAfterRuntime.map((row) => ({
        gv_id: row.gv_id,
        name: row.name,
        set_code: row.set_code,
        number: row.number,
        image_source: row.image_source,
        image_status: row.image_status,
      })),
    },
    policy: {
      write_scope: 'none',
      exact_image_claims: 'none for TCG Collector fallback; runtime fields mark these as representative_shared',
      storage_scope: 'none; no image files are downloaded, uploaded, or self-hosted by this package',
      source_pages: Object.values(TCGCOLLECTOR_SOURCE_PAGES),
    },
  };

  payload.proof_hash = proofHash({
    summary: payload.summary,
    examples: payload.examples,
    policy: payload.policy,
  });

  return payload;
}

function renderMarkdown(payload) {
  const lines = [
    `# ${PACKAGE_ID}`,
    '',
    `- Generated: ${payload.generated_at}`,
    `- Mode: ${payload.mode}`,
    `- Proof hash: \`${payload.proof_hash}\``,
    `- Trainer Kit parent rows: ${payload.summary.trainer_kit_parent_row_count}`,
    `- Rows with runtime resolver display: ${payload.summary.trainer_kit_rows_with_runtime_resolver_display}`,
    `- Rows unresolved after runtime resolver coverage: ${payload.summary.trainer_kit_rows_unresolved_after_runtime}`,
    `- Residual TCG Collector target rows: ${payload.summary.residual_tcgcollector_target_row_count}`,
    `- Residual rows matching source listings: ${payload.summary.residual_tcgcollector_rows_matching_source_listing}`,
    '',
    '## Source Signals',
    '',
    markdownTable(
      Object.entries(payload.summary.source_signals).map(([name, ok]) => ({ name, ok })),
      [
        { label: 'Signal', value: (row) => row.name },
        { label: 'Present', value: (row) => row.ok },
      ],
    ),
    '',
    '## Summary By Set',
    '',
    markdownTable(payload.summary.summary_by_set, [
      { label: 'Set', value: (row) => row.set_code },
      { label: 'Name', value: (row) => row.set_name },
      { label: 'Rows', value: (row) => row.parent_rows },
      { label: 'No image', value: (row) => row.rows_without_any_parent_image },
      { label: 'TCGdex refs', value: (row) => row.rows_with_tcgdex_reference },
      { label: 'PokemonTCG exact', value: (row) => row.rows_with_pokemon_tcg_exact_replacement_available },
      { label: 'Malie fallback', value: (row) => row.rows_with_malie_runtime_fallback },
      { label: 'TCGCollector fallback', value: (row) => row.rows_with_tcgcollector_runtime_fallback },
      { label: 'Runtime display', value: (row) => row.rows_with_runtime_resolver_display },
      { label: 'Still unresolved', value: (row) => row.rows_unresolved_after_runtime },
    ]),
    '',
    '## TCG Collector Source Proof',
    '',
    markdownTable(payload.summary.tcgcollector_source_proof, [
      { label: 'Set', value: (row) => row.set_code },
      { label: 'Source', value: (row) => row.source_url },
      { label: 'Status', value: (row) => row.source_probe_status },
      { label: 'Target rows', value: (row) => row.target_count },
      { label: 'Source matches', value: (row) => row.source_match_count },
    ]),
    '',
    '## Residual Rows',
    '',
    markdownTable(payload.examples.residual_tcgcollector_rows, [
      { label: 'GV ID', value: (row) => row.gv_id },
      { label: 'Name', value: (row) => row.name },
      { label: 'Set', value: (row) => row.set_code },
      { label: 'Number', value: (row) => row.number },
      { label: 'Source title', value: (row) => row.source_title },
      { label: 'Matched', value: (row) => row.source_match },
      { label: 'Image URL', value: (row) => clean(row.source_image_url)?.slice(0, 92) },
    ]),
    '',
    '## Unresolved After Runtime Examples',
    '',
    markdownTable(payload.examples.unresolved_after_runtime_examples, [
      { label: 'GV ID', value: (row) => row.gv_id },
      { label: 'Name', value: (row) => row.name },
      { label: 'Set', value: (row) => row.set_code },
      { label: 'Number', value: (row) => row.number },
      { label: 'Image source', value: (row) => row.image_source },
      { label: 'Status', value: (row) => row.image_status },
    ]),
    '',
    '## Policy',
    '',
    `- Write scope: ${payload.policy.write_scope}`,
    `- Exact image claims: ${payload.policy.exact_image_claims}`,
    `- Storage scope: ${payload.policy.storage_scope}`,
    '',
  ];

  return lines.join('\n');
}

async function main() {
  const dbUrl = requireDbUrl();
  if (!dbUrl) {
    throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL');
  }

  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    const payload = await buildAudit(client);
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    await fs.writeFile(OUTPUT_JSON, `${JSON.stringify(payload, null, 2)}\n`);
    await fs.writeFile(OUTPUT_MD, `${renderMarkdown(payload)}\n`);
    console.log(JSON.stringify({
      package_id: PACKAGE_ID,
      output_json: OUTPUT_JSON,
      output_md: OUTPUT_MD,
      proof_hash: payload.proof_hash,
      trainer_kit_parent_row_count: payload.summary.trainer_kit_parent_row_count,
      trainer_kit_rows_with_runtime_resolver_display: payload.summary.trainer_kit_rows_with_runtime_resolver_display,
      trainer_kit_rows_unresolved_after_runtime: payload.summary.trainer_kit_rows_unresolved_after_runtime,
      residual_tcgcollector_rows_matching_source_listing: payload.summary.residual_tcgcollector_rows_matching_source_listing,
    }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`[${PACKAGE_ID}] failed`, error);
  process.exitCode = 1;
});
