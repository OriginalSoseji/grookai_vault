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
const OUTPUT_JSON = path.join(
  OUTPUT_DIR,
  'image_truth_img18a_mep_pokemon_center_stamp_representative_dry_run_v1.json',
);
const OUTPUT_MD = path.join(
  OUTPUT_DIR,
  'image_truth_img18a_mep_pokemon_center_stamp_representative_dry_run_v1.md',
);
const PACKAGE_ID = 'IMG-18A-MEP-POKEMON-CENTER-STAMP-REPRESENTATIVE-CHILD-IMAGE-DRY-RUN';

const TARGETS = [
  { set_code: 'mep', number: '022', name: 'Charcadet' },
  { set_code: 'mep', number: '031', name: "N's Zekrom" },
  { set_code: 'mep', number: '070', name: 'Tyrunt' },
  { set_code: 'mep', number: '080', name: 'Fennekin' },
];

function requireDbUrl() {
  return (
    process.env.SUPABASE_DB_URL ??
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    null
  );
}

function clean(value) {
  const normalized = String(value ?? '').trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeKey(value) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeNumber(value) {
  return String(value ?? '').trim().toLowerCase().replace(/^0+(?=\d)/, '');
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

async function fetchTargetPairs(client) {
  const result = await client.query(
    `
      with targets(set_code, number, name) as (
        select * from jsonb_to_recordset($1::jsonb) as t(set_code text, number text, name text)
      ),
      stamped as (
        select
          t.set_code as target_set_code,
          t.number as target_number,
          t.name as target_name,
          cp.id as stamped_card_print_id,
          cp.gv_id as stamped_gv_id,
          cp.name as stamped_name,
          cp.set_code as stamped_set_code,
          cp.number as stamped_number,
          cp.variant_key as stamped_variant_key,
          cp.printed_identity_modifier as stamped_printed_identity_modifier,
          cp.image_source as stamped_parent_image_source,
          cp.image_path as stamped_parent_image_path,
          cp.image_url as stamped_parent_image_url,
          cp.image_alt_url as stamped_parent_image_alt_url,
          cp.representative_image_url as stamped_parent_representative_image_url,
          cp.image_status as stamped_parent_image_status,
          cp.image_note as stamped_parent_image_note,
          cpi.id as stamped_card_printing_id,
          cpi.printing_gv_id as stamped_printing_gv_id,
          cpi.finish_key as stamped_finish_key,
          cpi.image_source as stamped_child_image_source,
          cpi.image_path as stamped_child_image_path,
          cpi.image_url as stamped_child_image_url,
          cpi.image_alt_url as stamped_child_image_alt_url,
          cpi.image_status as stamped_child_image_status,
          cpi.image_note as stamped_child_image_note
        from targets t
        join public.card_prints cp
          on lower(cp.set_code) = lower(t.set_code)
         and regexp_replace(lower(cp.number), '^0+(?=\\d)', '') = regexp_replace(lower(t.number), '^0+(?=\\d)', '')
         and lower(cp.name) = lower(t.name)
         and cp.variant_key = 'pokemon_center_stamp'
         and cp.printed_identity_modifier = 'pokemon_center_stamp'
        join public.card_printings cpi on cpi.card_print_id = cp.id
        where cpi.finish_key = 'holo'
      ),
      base as (
        select
          t.set_code as target_set_code,
          t.number as target_number,
          t.name as target_name,
          cp.id as base_card_print_id,
          cp.gv_id as base_gv_id,
          cp.name as base_name,
          cp.set_code as base_set_code,
          cp.number as base_number,
          cp.variant_key as base_variant_key,
          cp.printed_identity_modifier as base_printed_identity_modifier,
          cpi.id as base_card_printing_id,
          cpi.printing_gv_id as base_printing_gv_id,
          cpi.finish_key as base_finish_key,
          cpi.image_source as base_child_image_source,
          cpi.image_path as base_child_image_path,
          cpi.image_url as base_child_image_url,
          cpi.image_alt_url as base_child_image_alt_url,
          cpi.image_status as base_child_image_status,
          cpi.image_note as base_child_image_note
        from targets t
        join public.card_prints cp
          on lower(cp.set_code) = lower(t.set_code)
         and regexp_replace(lower(cp.number), '^0+(?=\\d)', '') = regexp_replace(lower(t.number), '^0+(?=\\d)', '')
         and lower(cp.name) = lower(t.name)
         and coalesce(nullif(cp.variant_key, ''), 'base') = 'base'
         and cp.printed_identity_modifier is null
        join public.card_printings cpi on cpi.card_print_id = cp.id
        where cpi.finish_key = 'holo'
      )
      select
        stamped.*,
        base.base_card_print_id,
        base.base_gv_id,
        base.base_name,
        base.base_set_code,
        base.base_number,
        base.base_variant_key,
        base.base_printed_identity_modifier,
        base.base_card_printing_id,
        base.base_printing_gv_id,
        base.base_finish_key,
        base.base_child_image_source,
        base.base_child_image_path,
        base.base_child_image_url,
        base.base_child_image_alt_url,
        base.base_child_image_status,
        base.base_child_image_note
      from stamped
      join base using (target_set_code, target_number, target_name)
      order by stamped.target_number
    `,
    [JSON.stringify(TARGETS)],
  );

  return result.rows;
}

function classifyRow(row) {
  const violations = [];
  const target = {
    set_code: clean(row.target_set_code),
    number: clean(row.target_number),
    card_name: clean(row.target_name),
  };

  if (normalizeKey(row.stamped_set_code) !== normalizeKey(target.set_code)) violations.push('stamped_set_code_mismatch');
  if (normalizeNumber(row.stamped_number) !== normalizeNumber(target.number)) violations.push('stamped_number_mismatch');
  if (normalizeKey(row.stamped_name) !== normalizeKey(target.card_name)) violations.push('stamped_name_mismatch');
  if (row.stamped_variant_key !== 'pokemon_center_stamp') violations.push('stamped_variant_key_mismatch');
  if (row.stamped_printed_identity_modifier !== 'pokemon_center_stamp') {
    violations.push('stamped_printed_identity_modifier_mismatch');
  }
  if (row.stamped_finish_key !== 'holo') violations.push('stamped_finish_key_mismatch');
  if (clean(row.stamped_child_image_path)) violations.push('stamped_child_image_path_already_present');
  if (clean(row.stamped_child_image_url)) violations.push('stamped_child_image_url_already_present');
  if (clean(row.stamped_child_image_alt_url)) violations.push('stamped_child_image_alt_url_already_present');

  if (normalizeKey(row.base_set_code) !== normalizeKey(target.set_code)) violations.push('base_set_code_mismatch');
  if (normalizeNumber(row.base_number) !== normalizeNumber(target.number)) violations.push('base_number_mismatch');
  if (normalizeKey(row.base_name) !== normalizeKey(target.card_name)) violations.push('base_name_mismatch');
  if (clean(row.base_printed_identity_modifier)) violations.push('base_has_identity_modifier');
  if (row.base_finish_key !== 'holo') violations.push('base_finish_key_mismatch');
  if (!clean(row.base_child_image_path) && !clean(row.base_child_image_url) && !clean(row.base_child_image_alt_url)) {
    violations.push('base_child_image_missing');
  }

  const sourcePath = clean(row.base_child_image_path);
  const sourceUrl = clean(row.base_child_image_url) ?? clean(row.base_child_image_alt_url);
  const plannedImagePath = sourcePath;
  const plannedImageUrl = sourcePath ? null : sourceUrl;
  const plannedImageAltUrl = null;
  const plannedImageSource = 'identity';
  const plannedImageStatus = 'representative_shared_stamp';
  const sourceEvidenceUrl = extractSourceUrl(row.base_child_image_note);
  const plannedImageNote = [
    `${PACKAGE_ID}: representative base MEP image copied from same set/number/name base child printing`,
    sourceEvidenceUrl ? `source:${sourceEvidenceUrl}` : null,
    `base_printing_gv_id:${row.base_printing_gv_id}`,
    'not_exact_stamped_image',
  ].filter(Boolean).join('; ');

  return {
    ready: violations.length === 0,
    violations,
    card_printing_id: row.stamped_card_printing_id,
    card_print_id: row.stamped_card_print_id,
    printing_gv_id: row.stamped_printing_gv_id,
    parent_gv_id: row.stamped_gv_id,
    set_code: row.stamped_set_code,
    number: row.stamped_number,
    card_name: row.stamped_name,
    finish_key: row.stamped_finish_key,
    variant_key: row.stamped_variant_key,
    printed_identity_modifier: row.stamped_printed_identity_modifier,
    source_base_card_printing_id: row.base_card_printing_id,
    source_base_printing_gv_id: row.base_printing_gv_id,
    source_base_image_path: clean(row.base_child_image_path),
    source_base_image_url: clean(row.base_child_image_url),
    source_base_image_alt_url: clean(row.base_child_image_alt_url),
    source_base_image_status: clean(row.base_child_image_status),
    source_base_image_note: clean(row.base_child_image_note),
    source_evidence_url: sourceEvidenceUrl,
    planned_update: {
      image_source: plannedImageSource,
      image_path: plannedImagePath,
      image_url: plannedImageUrl,
      image_alt_url: plannedImageAltUrl,
      image_status: plannedImageStatus,
      image_note: plannedImageNote,
    },
  };
}

function extractSourceUrl(note) {
  const value = clean(note);
  if (!value) return null;
  const match = value.match(/https?:\/\/\S+/);
  return match ? match[0].replace(/[),.;]+$/g, '') : null;
}

function buildSqlHash() {
  const sql = `
    update public.card_printings
       set image_source = $2,
           image_path = $3,
           image_url = $4,
           image_alt_url = $5,
           image_status = $6,
           image_note = $7
     where id = $1
       and image_path is null
       and image_url is null
       and image_alt_url is null
  `;
  return proofHash(sql.trim());
}

function renderMarkdown(report) {
  const readyRows = report.rows.filter((row) => row.ready);
  const blockedRows = report.rows.filter((row) => !row.ready);

  return `# ${PACKAGE_ID}

Generated: ${report.generated_at}

Status: dry-run only. No DB writes. No migrations. No storage uploads.

## Scope

- target: child card_printings only
- set: MEP Black Star Promos
- modifier: Pokemon Center Stamp
- rows: ${report.summary.target_rows}
- ready rows: ${report.summary.ready_rows}
- blocked rows: ${report.summary.blocked_rows}
- image confidence after apply: representative
- exact stamped image claim: false

This package closes current English physical missing-display rows by routing stamped child printings to already-stored same-card base representative images.

It does not claim the displayed image shows the Pokemon Center stamp.

## Proof

\`\`\`text
fingerprint: ${report.fingerprint}
sql_hash: ${report.sql_hash}
db_writes_performed: false
migrations_created: false
storage_uploads_performed: false
parent_writes: false
deletes: false
merges: false
\`\`\`

## Ready Rows

${markdownTable(readyRows, [
  { label: 'set', value: (row) => row.set_code },
  { label: 'number', value: (row) => row.number },
  { label: 'card', value: (row) => row.card_name },
  { label: 'printing', value: (row) => row.printing_gv_id },
  { label: 'source base printing', value: (row) => row.source_base_printing_gv_id },
  { label: 'planned status', value: (row) => row.planned_update.image_status },
])}

## Source Evidence URLs

${markdownTable(readyRows, [
  { label: 'card', value: (row) => `${row.card_name} #${row.number}` },
  { label: 'source URL', value: (row) => row.source_evidence_url ?? 'preserved child image path only' },
])}

## Blocked Rows

${markdownTable(blockedRows, [
  { label: 'set', value: (row) => row.set_code },
  { label: 'number', value: (row) => row.number },
  { label: 'card', value: (row) => row.card_name },
  { label: 'violations', value: (row) => row.violations.join(', ') },
])}

## Approval Text

\`\`\`text
Approve real IMG-18B-MEP-POKEMON-CENTER-STAMP-REPRESENTATIVE-CHILD-IMAGE apply only. Fingerprint: ${report.fingerprint}. SQL hash: ${report.sql_hash}. Scope: ${report.summary.ready_rows} child-only representative image updates for MEP Pokemon Center stamped holo rows; exact stamped image claim=false; source base images preserved from same set/number/name MEP child printings. No parent writes. No storage uploads. No deletes. No merges. No migrations. No global apply.
\`\`\`
`;
}

async function main() {
  const dbUrl = requireDbUrl();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for dry-run.');

  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const rawRows = await fetchTargetPairs(client);
    const rows = rawRows.map(classifyRow);
    const readyRows = rows.filter((row) => row.ready);
    const proofPayload = {
      package_id: PACKAGE_ID,
      ready_rows: readyRows.map((row) => ({
        card_printing_id: row.card_printing_id,
        printing_gv_id: row.printing_gv_id,
        planned_update: row.planned_update,
        source_base_card_printing_id: row.source_base_card_printing_id,
        source_base_printing_gv_id: row.source_base_printing_gv_id,
      })),
    };
    const report = {
      package_id: PACKAGE_ID,
      generated_at: new Date().toISOString(),
      dry_run_only: true,
      db_writes_performed: false,
      migrations_created: false,
      storage_uploads_performed: false,
      parent_writes: false,
      deletes: false,
      merges: false,
      summary: {
        target_rows: TARGETS.length,
        matched_pair_rows: rows.length,
        ready_rows: readyRows.length,
        blocked_rows: rows.length - readyRows.length,
        planned_child_image_updates: readyRows.length,
        image_status: 'representative_shared_stamp',
        exact_stamped_image_claim: false,
      },
      fingerprint: proofHash(proofPayload),
      sql_hash: buildSqlHash(),
      proof_payload: proofPayload,
      rows,
    };

    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    await fs.writeFile(OUTPUT_JSON, `${JSON.stringify(report, null, 2)}\n`);
    await fs.writeFile(OUTPUT_MD, renderMarkdown(report));
    console.log(JSON.stringify({
      package_id: PACKAGE_ID,
      fingerprint: report.fingerprint,
      sql_hash: report.sql_hash,
      summary: report.summary,
      outputs: [OUTPUT_JSON, OUTPUT_MD],
    }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
