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
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'image_truth_img20a_trainer_kit_malie_fallback_audit_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'image_truth_img20a_trainer_kit_malie_fallback_audit_v1.md');
const PACKAGE_ID = 'IMG-20A-TRAINER-KIT-MALIE-REPRESENTATIVE-FALLBACK-AUDIT';

const MALIE_LISTING_BASE = 'https://malie.io/static/listings';
const POKEMON_TCG_TRAINER_KIT_SET_CODE_ALIASES = {
  'tk-ex-latia': 'tk1a',
  'tk-ex-latio': 'tk1b',
  'tk-ex-m': 'tk2b',
  'tk-ex-p': 'tk2a',
  tk2b: 'tk2b',
};
const MALIE_TRAINER_KIT_SET_IMAGE_PLANS = {
  'tk-bw-z': { series: 'BW', code: 'TK5A', folder: 'TK_Zoroark', label: 'BW Trainer Kit (Zoroark)' },
  'tk-bw-e': { series: 'BW', code: 'TK5B', folder: 'TK_Excadrill', label: 'BW Trainer Kit (Excadrill)' },
  'tk-xy-n': { series: 'XY', code: 'TK6A', folder: 'TK_Noivern', label: 'XY Trainer Kit (Noivern)' },
  'tk-xy-sy': { series: 'XY', code: 'TK6B', folder: 'TK_Sylveon', label: 'XY Trainer Kit (Sylveon)' },
  'tk-xy-b': { series: 'XY', code: 'TK7A', folder: 'TK_Bisharp', label: 'XY Trainer Kit (Bisharp)' },
  'tk-xy-w': { series: 'XY', code: 'TK7B', folder: 'TK_Wigglytuff', label: 'XY Trainer Kit (Wigglytuff)' },
  'tk-xy-latio': { series: 'XY', code: 'TK8A', folder: 'TK_Latios', label: 'XY Trainer Kit (Latios)' },
  'tk-xy-latia': { series: 'XY', code: 'TK8B', folder: 'TK_Latias', label: 'XY Trainer Kit (Latias)' },
  'tk-xy-p': { series: 'XY', code: 'TK9A', folder: 'TK_PikachuLibre', label: 'XY Trainer Kit (Pikachu Libre)' },
  'tk-xy-su': { series: 'XY', code: 'TK9B', folder: 'TK_Suicune', label: 'XY Trainer Kit (Suicune)' },
  'tk-sm-l': { series: 'SM', code: 'TK10A', folder: 'TK_Lycanroc', label: 'SM Trainer Kit (Lycanroc)' },
  'tk-sm-r': { series: 'SM', code: 'TK10B', folder: 'TK_AlolanRaichu', label: 'SM Trainer Kit (Alolan Raichu)' },
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

function slugForMalieTrainerKitImage(value) {
  const normalized = clean(value);
  if (!normalized) return null;
  const slug = normalized
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['\u2018\u2019`]/g, '')
    .replace(/&/g, ' and ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
  return slug.length > 0 ? slug : null;
}

function numericCardNumber(row) {
  const number = clean(row.number);
  if (number && /^\d+$/.test(number)) return String(Number(number));
  const numberPlain = clean(row.number_plain);
  if (numberPlain && /^\d+$/.test(numberPlain)) return String(Number(numberPlain));
  return null;
}

function malieImageUrlForRow(row) {
  const plan = MALIE_TRAINER_KIT_SET_IMAGE_PLANS[row.set_code];
  const number = numericCardNumber(row)?.padStart(3, '0');
  const nameSlug = slugForMalieTrainerKitImage(row.name);
  if (!plan || !number || !nameSlug) return null;
  return `https://cdn.malie.io/file/malie-io/art/cards/jpg/en_US/${plan.series}/${plan.code}-${plan.folder}/en_US-${plan.code}-${number}-${nameSlug}.jpg`;
}

function pokemonTcgImageUrlForRow(row) {
  const setCode = clean(row.set_code)?.toLowerCase();
  const pokemonTcgSetCode = setCode ? POKEMON_TCG_TRAINER_KIT_SET_CODE_ALIASES[setCode] : null;
  const number = numericCardNumber(row);
  if (!pokemonTcgSetCode || !number) return null;
  return `https://images.pokemontcg.io/${pokemonTcgSetCode}/${encodeURIComponent(number)}_hires.png`;
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

function hasRuntimeResolverDisplay(row) {
  if (hasTcgdexReference(row)) {
    return Boolean(pokemonTcgImageUrlForRow(row) || malieImageUrlForRow(row));
  }

  if (hasAnyParentImage(row)) {
    return true;
  }

  return Boolean(malieImageUrlForRow(row));
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

function extractMalieImageLinks(html) {
  return Array.from(
    html.matchAll(/https:\/\/cdn\.malie\.io\/file\/malie-io\/art\/cards\/jpg\/en_US\/[^"'<>\s]+/g),
    (match) => match[0],
  );
}

async function queryRows(client, sql, params = []) {
  const result = await client.query(sql, params);
  return result.rows;
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

async function readSourceSignals() {
  const resolverSource = await fs.readFile('apps/web/src/lib/canon/resolveCardImageFieldsV1.ts', 'utf8');
  return {
    resolver_has_malie_plan: resolverSource.includes('MALIE_TRAINER_KIT_SET_IMAGE_PLANS'),
    resolver_marks_malie_representative_shared: resolverSource.includes('image_status: "representative_shared"'),
    resolver_sets_malie_as_representative_display: resolverSource.includes('display_image_kind: "representative"'),
    resolver_keeps_pokemon_tcg_exact_replacement: resolverSource.includes('image_source: "pokemonapi"'),
  };
}

async function readMalieListingProof() {
  const rows = [];
  for (const [setCode, plan] of Object.entries(MALIE_TRAINER_KIT_SET_IMAGE_PLANS)) {
    const listingUrl = `${MALIE_LISTING_BASE}/${plan.code}.html`;
    try {
      const html = await fetchText(listingUrl);
      const links = extractMalieImageLinks(html);
      rows.push({
        set_code: setCode,
        label: plan.label,
        listing_url: listingUrl,
        expected_code: plan.code,
        source_link_count: links.length,
        source_links: links,
        first_source_link: links[0] ?? null,
        last_source_link: links.at(-1) ?? null,
        source_probe_status: 'ok',
      });
    } catch (error) {
      rows.push({
        set_code: setCode,
        label: plan.label,
        listing_url: listingUrl,
        expected_code: plan.code,
        source_link_count: 0,
        source_links: [],
        first_source_link: null,
        last_source_link: null,
        source_probe_status: `failed: ${error.message}`,
      });
    }
  }
  return rows;
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

  const rowsWithComputedFallback = trainerKitRows
    .map((row) => ({
      ...row,
      computed_pokemon_tcg_exact_url: pokemonTcgImageUrlForRow(row),
      computed_malie_representative_url: malieImageUrlForRow(row),
    }))
    .filter((row) => row.computed_pokemon_tcg_exact_url || row.computed_malie_representative_url);

  const rowsUnresolvedAfterRuntime = trainerKitRows.filter((row) => !hasRuntimeResolverDisplay(row));

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
        rows_with_runtime_resolver_display: 0,
        rows_unresolved_after_runtime: 0,
        in_malie_plan: Boolean(MALIE_TRAINER_KIT_SET_IMAGE_PLANS[row.set_code]),
      });
      bucket.parent_rows += 1;
      if (!hasAnyParentImage(row)) bucket.rows_without_any_parent_image += 1;
      if (hasTcgdexReference(row)) bucket.rows_with_tcgdex_reference += 1;
      if (pokemonTcgImageUrlForRow(row)) bucket.rows_with_pokemon_tcg_exact_replacement_available += 1;
      if (malieImageUrlForRow(row)) bucket.rows_with_malie_runtime_fallback += 1;
      if (hasRuntimeResolverDisplay(row)) bucket.rows_with_runtime_resolver_display += 1;
      if (!hasRuntimeResolverDisplay(row)) bucket.rows_unresolved_after_runtime += 1;
      return acc;
    }, {}),
  )
    .map(([, value]) => value)
    .sort((a, b) => a.set_code.localeCompare(b.set_code));

  const sourceSignals = await readSourceSignals();
  const malieListingProof = await readMalieListingProof();
  const malieSourceLinksBySet = new Map(
    malieListingProof.map((row) => [row.set_code, new Set(row.source_links)]),
  );
  const rowsWithMalieSourceMatch = rowsWithComputedFallback.filter((row) => {
    const computedUrl = row.computed_malie_representative_url;
    return computedUrl ? malieSourceLinksBySet.get(row.set_code)?.has(computedUrl) : false;
  });

  const payload = {
    package_id: PACKAGE_ID,
    mode: 'read_only_audit',
    generated_at: new Date().toISOString(),
    summary: {
      mapped_trainer_kit_set_count: Object.keys(MALIE_TRAINER_KIT_SET_IMAGE_PLANS).length,
      trainer_kit_parent_row_count: trainerKitRows.length,
      trainer_kit_rows_with_source_backed_runtime_replacement: rowsWithComputedFallback.length,
      trainer_kit_rows_with_malie_runtime_fallback: rowsWithComputedFallback.filter((row) => row.computed_malie_representative_url).length,
      trainer_kit_rows_with_pokemon_tcg_exact_replacement_available: rowsWithComputedFallback.filter((row) => row.computed_pokemon_tcg_exact_url).length,
      trainer_kit_malie_runtime_fallbacks_matching_source_listing: rowsWithMalieSourceMatch.length,
      trainer_kit_rows_unresolved_after_runtime: rowsUnresolvedAfterRuntime.length,
      summary_by_set: summaryBySet,
      source_signals: sourceSignals,
      malie_listing_proof: malieListingProof,
    },
    examples: {
      computed_malie_runtime_fallback_examples: rowsWithComputedFallback.slice(0, 36).map((row) => ({
        gv_id: row.gv_id,
        name: row.name,
        set_code: row.set_code,
        number: row.number,
        computed_pokemon_tcg_exact_url: row.computed_pokemon_tcg_exact_url,
        computed_malie_representative_url: row.computed_malie_representative_url,
      })),
      unresolved_after_runtime_examples: rowsUnresolvedAfterRuntime
        .slice(0, 36)
        .map((row) => ({
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
      exact_image_claims: 'none for Malie fallback; runtime fields mark these as representative_shared',
      storage_scope: 'none; no image files are downloaded, uploaded, or self-hosted by this package',
      source_pages: [
        'https://malie.io/static/',
        'https://malie.io/static/listings/SV1.html',
        ...Object.values(MALIE_TRAINER_KIT_SET_IMAGE_PLANS).map((plan) => `${MALIE_LISTING_BASE}/${plan.code}.html`),
      ],
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
    `- Mapped Trainer Kit sets: ${payload.summary.mapped_trainer_kit_set_count}`,
    `- Trainer Kit parent rows: ${payload.summary.trainer_kit_parent_row_count}`,
    `- Rows with source-backed runtime replacement: ${payload.summary.trainer_kit_rows_with_source_backed_runtime_replacement}`,
    `- Rows with Malie runtime representative fallback: ${payload.summary.trainer_kit_rows_with_malie_runtime_fallback}`,
    `- Rows with PokemonTCG exact replacement available: ${payload.summary.trainer_kit_rows_with_pokemon_tcg_exact_replacement_available}`,
    `- Malie fallback URLs matching source listings: ${payload.summary.trainer_kit_malie_runtime_fallbacks_matching_source_listing}`,
    `- Rows unresolved after runtime resolver coverage: ${payload.summary.trainer_kit_rows_unresolved_after_runtime}`,
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
      { label: 'Runtime display', value: (row) => row.rows_with_runtime_resolver_display },
      { label: 'Still unresolved', value: (row) => row.rows_unresolved_after_runtime },
      { label: 'Mapped', value: (row) => row.in_malie_plan },
    ]),
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
    '## Malie Listing Proof',
    '',
    markdownTable(payload.summary.malie_listing_proof, [
      { label: 'Set', value: (row) => row.set_code },
      { label: 'Listing', value: (row) => row.listing_url },
      { label: 'Links', value: (row) => row.source_link_count },
      { label: 'Status', value: (row) => row.source_probe_status },
      { label: 'First link', value: (row) => clean(row.first_source_link)?.slice(0, 80) },
      { label: 'Last link', value: (row) => clean(row.last_source_link)?.slice(0, 80) },
    ]),
    '',
    '## Runtime Fallback Examples',
    '',
    markdownTable(payload.examples.computed_malie_runtime_fallback_examples, [
      { label: 'GV ID', value: (row) => row.gv_id },
      { label: 'Name', value: (row) => row.name },
      { label: 'Set', value: (row) => row.set_code },
      { label: 'Number', value: (row) => row.number },
      { label: 'PokemonTCG URL', value: (row) => clean(row.computed_pokemon_tcg_exact_url)?.slice(0, 96) },
      { label: 'Malie URL', value: (row) => clean(row.computed_malie_representative_url)?.slice(0, 96) },
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
      trainer_kit_rows_with_source_backed_runtime_replacement: payload.summary.trainer_kit_rows_with_source_backed_runtime_replacement,
      trainer_kit_rows_with_malie_runtime_fallback: payload.summary.trainer_kit_rows_with_malie_runtime_fallback,
      trainer_kit_rows_with_pokemon_tcg_exact_replacement_available: payload.summary.trainer_kit_rows_with_pokemon_tcg_exact_replacement_available,
      trainer_kit_malie_runtime_fallbacks_matching_source_listing: payload.summary.trainer_kit_malie_runtime_fallbacks_matching_source_listing,
      trainer_kit_rows_unresolved_after_runtime: payload.summary.trainer_kit_rows_unresolved_after_runtime,
    }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`[${PACKAGE_ID}] failed`, error);
  process.exitCode = 1;
});
