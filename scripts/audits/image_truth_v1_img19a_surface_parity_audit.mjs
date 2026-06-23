import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/image_truth_v1';
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'image_truth_img19a_surface_parity_audit_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'image_truth_img19a_surface_parity_audit_v1.md');
const PACKAGE_ID = 'IMG-19A-IMAGE-SURFACE-PARITY-AUDIT';

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
  const dexSource = await fs.readFile('apps/web/src/lib/grookaiDex/getGrookaiDexSpeciesDetail.ts', 'utf8');
  const publicCardImageSource = await fs.readFile('apps/web/src/lib/publicCardImage.ts', 'utf8');
  const resolverSource = await fs.readFile('apps/web/src/lib/canon/resolveCardImageFieldsV1.ts', 'utf8');

  return {
    dex_uses_child_display_fallbacks: dexSource.includes('getChildDisplayImageFallbacks'),
    dex_passes_parent_image_status_to_resolver: dexSource.includes('image_status,image_note'),
    dex_does_not_import_resolve_display_image_url: !dexSource.includes('resolveDisplayImageUrl'),
    product_surfaces_prefer_display_image_url_lock: publicCardImageSource.includes('Product surfaces must prefer display_image_url'),
    resolver_blocks_known_broken_tcgdex_urls: resolverSource.includes('isKnownBrokenTcgdexImageUrl'),
    resolver_has_mcd2021_pokemon_tcg_replacement: resolverSource.includes('images.pokemontcg.io/mcd21'),
    resolver_has_trainer_kit_pokemon_tcg_aliases: resolverSource.includes('POKEMON_TCG_TRAINER_KIT_SET_CODE_ALIASES'),
  };
}

async function buildAudit(client) {
  const dexParentMissingChildHasImage = await queryRows(
    client,
    `
      with dex as (
        select distinct
          v.card_print_id,
          v.gv_id,
          v.name,
          v.set_code,
          v.set_name,
          v.number,
          v.image_url,
          v.image_alt_url,
          v.image_path,
          v.representative_image_url
        from public.v_grookai_dex_card_prints_v1 v
        where v.mapping_active = true
          and v.card_print_id is not null
      ),
      child as (
        select
          card_print_id,
          count(*)::int as child_image_rows,
          count(*) filter (where image_status = 'exact')::int as exact_child_image_rows
        from public.card_printings
        where nullif(trim(coalesce(image_path, '')), '') is not null
           or nullif(trim(coalesce(image_url, '')), '') is not null
           or nullif(trim(coalesce(image_alt_url, '')), '') is not null
        group by card_print_id
      )
      select
        d.card_print_id,
        d.gv_id,
        d.name,
        d.set_code,
        d.set_name,
        d.number,
        child.child_image_rows,
        child.exact_child_image_rows
      from dex d
      join child on child.card_print_id = d.card_print_id
      where nullif(trim(coalesce(d.image_path, '')), '') is null
        and nullif(trim(coalesce(d.image_url, '')), '') is null
        and nullif(trim(coalesce(d.image_alt_url, '')), '') is null
        and nullif(trim(coalesce(d.representative_image_url, '')), '') is null
      order by d.set_code, d.number, d.name
    `,
  );

  const dexKnownBrokenTcgdexRefs = await queryRows(
    client,
    `
      select distinct
        v.card_print_id,
        v.gv_id,
        v.name,
        v.set_code,
        v.set_name,
        v.number,
        coalesce(v.image_url, v.image_alt_url, v.image_path, v.representative_image_url) as image_reference
      from public.v_grookai_dex_card_prints_v1 v
      where v.mapping_active = true
        and (
          lower(coalesce(v.image_url, '')) like '%assets.tcgdex.net/en/tk/%'
          or lower(coalesce(v.image_alt_url, '')) like '%assets.tcgdex.net/en/tk/%'
          or lower(coalesce(v.image_path, '')) like '%assets.tcgdex.net/en/tk/%'
          or lower(coalesce(v.representative_image_url, '')) like '%assets.tcgdex.net/en/tk/%'
          or lower(coalesce(v.image_url, '')) like '%assets.tcgdex.net/en/mc/2021swsh/%'
          or lower(coalesce(v.image_alt_url, '')) like '%assets.tcgdex.net/en/mc/2021swsh/%'
          or lower(coalesce(v.image_path, '')) like '%assets.tcgdex.net/en/mc/2021swsh/%'
          or lower(coalesce(v.representative_image_url, '')) like '%assets.tcgdex.net/en/mc/2021swsh/%'
        )
      order by v.set_code, v.number, v.name
    `,
  );

  const familySummary = await queryRows(
    client,
    `
      with family as (
        select
          cp.*,
          case
            when cp.set_code = '2021swsh' then 'mcdonalds_2021'
            when cp.set_code like 'tk-%' then 'trainer_kit'
            when cp.set_code = 'mep' then 'mep_black_star_promos'
            when cp.set_code in ('base1-shadowless', 'base1-first-edition', 'base1-1999-2000') then 'base_set_print_run_lanes'
            else 'other'
          end as family_name
        from public.card_prints cp
      ),
      child as (
        select card_print_id, count(*)::int as child_image_rows
        from public.card_printings
        where nullif(trim(coalesce(image_path, '')), '') is not null
           or nullif(trim(coalesce(image_url, '')), '') is not null
           or nullif(trim(coalesce(image_alt_url, '')), '') is not null
        group by card_print_id
      )
      select
        f.family_name,
        count(*)::int as parent_rows,
        count(*) filter (
          where nullif(trim(coalesce(f.image_path, '')), '') is null
            and nullif(trim(coalesce(f.image_url, '')), '') is null
            and nullif(trim(coalesce(f.image_alt_url, '')), '') is null
            and nullif(trim(coalesce(f.representative_image_url, '')), '') is null
        )::int as parent_rows_without_image,
        count(*) filter (
          where nullif(trim(coalesce(f.image_path, '')), '') is null
            and nullif(trim(coalesce(f.image_url, '')), '') is null
            and nullif(trim(coalesce(f.image_alt_url, '')), '') is null
            and nullif(trim(coalesce(f.representative_image_url, '')), '') is null
            and child.child_image_rows > 0
        )::int as parent_rows_without_image_but_child_image_exists
      from family f
      left join child on child.card_print_id = f.id
      where f.family_name <> 'other'
      group by f.family_name
      order by f.family_name
    `,
  );

  const sourceSignals = await readSourceSignals();

  const payload = {
    package_id: PACKAGE_ID,
    mode: 'read_only_audit',
    generated_at: new Date().toISOString(),
    summary: {
      dex_parent_missing_child_has_image_count: dexParentMissingChildHasImage.length,
      dex_known_broken_tcgdex_reference_count: dexKnownBrokenTcgdexRefs.length,
      family_summary: familySummary,
      source_signals: sourceSignals,
    },
    findings: {
      dex_parent_missing_child_has_image_examples: dexParentMissingChildHasImage.slice(0, 25),
      dex_known_broken_tcgdex_reference_examples: dexKnownBrokenTcgdexRefs.slice(0, 25),
    },
    policy: {
      write_scope: 'none',
      expected_runtime_fix: 'product surfaces use resolveCardImageFieldsV1 and shared child display fallback; self-hosting remains a source/storage decision, not a bypass for image truth status',
    },
  };

  payload.proof_hash = proofHash({
    summary: payload.summary,
    findings: payload.findings,
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
    `- Dex parent-missing/child-image rows: ${payload.summary.dex_parent_missing_child_has_image_count}`,
    `- Dex known broken TCGdex reference rows: ${payload.summary.dex_known_broken_tcgdex_reference_count}`,
    '',
    '## Family Summary',
    '',
    markdownTable(payload.summary.family_summary, [
      { label: 'Family', value: (row) => row.family_name },
      { label: 'Parent rows', value: (row) => row.parent_rows },
      { label: 'No parent image', value: (row) => row.parent_rows_without_image },
      { label: 'Child image exists', value: (row) => row.parent_rows_without_image_but_child_image_exists },
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
    '## Dex Parent Missing, Child Image Exists Examples',
    '',
    markdownTable(payload.findings.dex_parent_missing_child_has_image_examples, [
      { label: 'GV ID', value: (row) => row.gv_id },
      { label: 'Name', value: (row) => row.name },
      { label: 'Set', value: (row) => row.set_code },
      { label: 'Number', value: (row) => row.number },
      { label: 'Child images', value: (row) => row.child_image_rows },
      { label: 'Exact child images', value: (row) => row.exact_child_image_rows },
    ]),
    '',
    '## Known Broken TCGdex Reference Examples',
    '',
    markdownTable(payload.findings.dex_known_broken_tcgdex_reference_examples, [
      { label: 'GV ID', value: (row) => row.gv_id },
      { label: 'Name', value: (row) => row.name },
      { label: 'Set', value: (row) => row.set_code },
      { label: 'Number', value: (row) => row.number },
      { label: 'Reference', value: (row) => clean(row.image_reference)?.slice(0, 80) },
    ]),
    '',
    '## Policy',
    '',
    `- Write scope: ${payload.policy.write_scope}`,
    `- Runtime fix: ${payload.policy.expected_runtime_fix}`,
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
    await fs.writeFile(OUTPUT_MD, renderMarkdown(payload));
    console.log(JSON.stringify({
      package_id: PACKAGE_ID,
      output_json: OUTPUT_JSON,
      output_md: OUTPUT_MD,
      proof_hash: payload.proof_hash,
      dex_parent_missing_child_has_image_count: payload.summary.dex_parent_missing_child_has_image_count,
      dex_known_broken_tcgdex_reference_count: payload.summary.dex_known_broken_tcgdex_reference_count,
    }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`[${PACKAGE_ID}] failed`, error);
  process.exitCode = 1;
});
