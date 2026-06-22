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
  'image_truth_img_cc01_poke_card_creator_child_image_dry_run_v1.json',
);
const OUTPUT_MD = path.join(
  OUTPUT_DIR,
  'image_truth_img_cc01_poke_card_creator_child_image_dry_run_v1.md',
);
const PACKAGE_ID = 'IMG-CC-01-POKE-CARD-CREATOR-CHILD-IMAGE-DRY-RUN';

const EXPECTED_SET_CODE = 'ex5.5';
const EXPECTED_ROWS = [
  { number: '1', name: 'Treecko', printing_gv_id: 'GV-PK-CC-1-STD' },
  { number: '2', name: 'Wurmple', printing_gv_id: 'GV-PK-CC-2-STD' },
  { number: '3', name: 'Torchic', printing_gv_id: 'GV-PK-CC-3-STD' },
  { number: '4', name: 'Mudkip', printing_gv_id: 'GV-PK-CC-4-STD' },
  { number: '5', name: 'Pikachu', printing_gv_id: 'GV-PK-CC-5-STD' },
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

function normalizeText(value) {
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

async function fetchRows(client) {
  const result = await client.query(
    `
      select
        cp.id as card_print_id,
        cp.gv_id as parent_gv_id,
        cp.name as card_name,
        cp.set_code,
        s.name as set_name,
        cp.number,
        cp.variant_key,
        cp.printed_identity_modifier,
        cp.image_source as parent_image_source,
        cp.image_path as parent_image_path,
        cp.image_url as parent_image_url,
        cp.image_alt_url as parent_image_alt_url,
        cp.representative_image_url as parent_representative_image_url,
        cp.image_status as parent_image_status,
        cp.image_note as parent_image_note,
        cpi.id as card_printing_id,
        cpi.printing_gv_id,
        cpi.finish_key,
        cpi.image_source as child_image_source,
        cpi.image_path as child_image_path,
        cpi.image_url as child_image_url,
        cpi.image_alt_url as child_image_alt_url,
        cpi.image_status as child_image_status,
        cpi.image_note as child_image_note,
        vd.species_slug,
        vd.mapping_active,
        vd.counts_for_completion
      from public.card_prints cp
      join public.sets s on s.id = cp.set_id
      join public.card_printings cpi on cpi.card_print_id = cp.id
      left join public.v_grookai_dex_card_prints_v1 vd on vd.card_print_id = cp.id
      where cp.set_code = $1
      order by cp.number_plain nulls last, cp.number, cpi.finish_key
    `,
    [EXPECTED_SET_CODE],
  );
  return result.rows;
}

function classifyRow(row) {
  const expected = EXPECTED_ROWS.find(
    (entry) =>
      normalizeNumber(entry.number) === normalizeNumber(row.number) &&
      normalizeText(entry.name) === normalizeText(row.card_name),
  );
  const violations = [];

  if (!expected) violations.push('unexpected_card_identity');
  if (row.set_code !== EXPECTED_SET_CODE) violations.push('set_code_mismatch');
  if (row.finish_key !== 'normal') violations.push('finish_key_not_normal');
  if (expected && row.printing_gv_id !== expected.printing_gv_id) violations.push('printing_gv_id_mismatch');
  if (clean(row.variant_key) && clean(row.variant_key) !== 'base') violations.push('unexpected_variant_key');
  if (clean(row.printed_identity_modifier)) violations.push('unexpected_identity_modifier');
  if (clean(row.child_image_path)) violations.push('child_image_path_already_present');
  if (clean(row.child_image_url)) violations.push('child_image_url_already_present');
  if (clean(row.child_image_alt_url)) violations.push('child_image_alt_url_already_present');
  if (!clean(row.parent_image_url) && !clean(row.parent_image_alt_url) && !clean(row.parent_image_path)) {
    violations.push('parent_image_missing');
  }
  if (clean(row.parent_image_status) !== 'exact') violations.push('parent_image_not_exact');
  if (row.mapping_active !== true) violations.push('dex_mapping_not_active');
  if (row.counts_for_completion !== true) violations.push('dex_completion_not_counted');

  const plannedImagePath = clean(row.parent_image_path);
  const plannedImageUrl = plannedImagePath ? null : clean(row.parent_image_url);
  const plannedImageAltUrl = plannedImagePath ? clean(row.parent_image_alt_url) : null;
  const plannedImageStatus = 'exact_parent_image';
  const plannedImageSource = clean(row.parent_image_source) ?? 'parent_exact_image';
  const plannedImageNote = [
    `${PACKAGE_ID}: copied exact parent image metadata to normal child printing`,
    `parent_gv_id:${row.parent_gv_id}`,
    `parent_image_status:${clean(row.parent_image_status) ?? 'unknown'}`,
    clean(row.parent_image_note) ? `parent_image_note:${row.parent_image_note}` : null,
  ]
    .filter(Boolean)
    .join('; ');

  return {
    ready: violations.length === 0,
    violations,
    card_print_id: row.card_print_id,
    card_printing_id: row.card_printing_id,
    parent_gv_id: row.parent_gv_id,
    printing_gv_id: row.printing_gv_id,
    set_code: row.set_code,
    set_name: row.set_name,
    number: row.number,
    card_name: row.card_name,
    finish_key: row.finish_key,
    species_slug: row.species_slug,
    mapping_active: row.mapping_active,
    counts_for_completion: row.counts_for_completion,
    parent_image_source: clean(row.parent_image_source),
    parent_image_path: clean(row.parent_image_path),
    parent_image_url: clean(row.parent_image_url),
    parent_image_alt_url: clean(row.parent_image_alt_url),
    parent_image_status: clean(row.parent_image_status),
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

function buildSqlHash() {
  const sql = `
    update public.card_printings cpi
       set image_source = target.image_source,
           image_path = target.image_path,
           image_url = target.image_url,
           image_alt_url = target.image_alt_url,
           image_status = target.image_status,
           image_note = target.image_note
      from img_cc01_targets target
     where cpi.id = target.card_printing_id
       and cpi.image_path is null
       and cpi.image_url is null
       and cpi.image_alt_url is null
  `;
  return proofHash(sql.trim());
}

async function runRollbackDryRun(client, readyRows) {
  const targetPayload = readyRows.map((row) => ({
    card_printing_id: row.card_printing_id,
    image_source: row.planned_update.image_source,
    image_path: row.planned_update.image_path,
    image_url: row.planned_update.image_url,
    image_alt_url: row.planned_update.image_alt_url,
    image_status: row.planned_update.image_status,
    image_note: row.planned_update.image_note,
  }));

  const beforeSnapshot = await fetchChildSnapshot(client, readyRows);
  const beforeHash = proofHash(beforeSnapshot);

  await client.query('begin');
  try {
    await client.query(`
      create temp table img_cc01_targets (
        card_printing_id uuid primary key,
        image_source text not null,
        image_path text,
        image_url text,
        image_alt_url text,
        image_status text not null,
        image_note text not null
      ) on commit drop
    `);
    await client.query(
      `
        insert into img_cc01_targets (
          card_printing_id,
          image_source,
          image_path,
          image_url,
          image_alt_url,
          image_status,
          image_note
        )
        select
          card_printing_id,
          image_source,
          image_path,
          image_url,
          image_alt_url,
          image_status,
          image_note
        from jsonb_to_recordset($1::jsonb) as target(
          card_printing_id uuid,
          image_source text,
          image_path text,
          image_url text,
          image_alt_url text,
          image_status text,
          image_note text
        )
      `,
      [JSON.stringify(targetPayload)],
    );

    const guard = await client.query(`
      select
        (select count(*)::int from img_cc01_targets) as target_rows,
        (
          select count(*)::int
          from public.card_printings cpi
          join img_cc01_targets target on target.card_printing_id = cpi.id
          where cpi.image_path is null
            and cpi.image_url is null
            and cpi.image_alt_url is null
        ) as writable_rows
    `);

    const guardRow = guard.rows[0];
    if (guardRow.target_rows !== EXPECTED_ROWS.length || guardRow.writable_rows !== EXPECTED_ROWS.length) {
      throw new Error(`IMG-CC-01 guard failed: ${JSON.stringify(guardRow)}`);
    }

    const updateResult = await client.query(`
      update public.card_printings cpi
         set image_source = target.image_source,
             image_path = target.image_path,
             image_url = target.image_url,
             image_alt_url = target.image_alt_url,
             image_status = target.image_status,
             image_note = target.image_note
        from img_cc01_targets target
       where cpi.id = target.card_printing_id
         and cpi.image_path is null
         and cpi.image_url is null
         and cpi.image_alt_url is null
    `);

    const proof = await client.query(`
      select
        count(*)::int as matching_rows,
        count(*) filter (where cpi.image_status = 'exact_parent_image')::int as exact_parent_image_rows,
        count(*) filter (where cpi.image_note like '%IMG-CC-01%')::int as noted_rows
      from public.card_printings cpi
      join img_cc01_targets target on target.card_printing_id = cpi.id
    `);

    await client.query('rollback');
    const afterSnapshot = await fetchChildSnapshot(client, readyRows);
    const afterHash = proofHash(afterSnapshot);

    return {
      before_hash: beforeHash,
      after_rollback_hash: afterHash,
      rollback_restored: beforeHash === afterHash,
      rows_updated_in_rollback_transaction: updateResult.rowCount,
      proof: proof.rows[0],
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  }
}

async function fetchChildSnapshot(client, rows) {
  const ids = rows.map((row) => row.card_printing_id);
  const result = await client.query(
    `
      select
        id,
        card_print_id,
        printing_gv_id,
        finish_key,
        image_source,
        image_path,
        image_url,
        image_alt_url,
        image_status,
        image_note
      from public.card_printings
      where id = any($1::uuid[])
      order by id
    `,
    [ids],
  );
  return result.rows;
}

function renderMarkdown(report) {
  const readyRows = report.rows.filter((row) => row.ready);
  const blockedRows = report.rows.filter((row) => !row.ready);

  return `# ${PACKAGE_ID}

Generated: ${report.generated_at}

Status: dry-run only. No DB writes. No migrations. No storage uploads.

## Scope

- set: ex5.5 / Poké Card Creator Pack
- target: child card_printings only
- planned rows: ${report.summary.planned_child_image_updates}
- ready rows: ${report.summary.ready_rows}
- blocked rows: ${report.summary.blocked_rows}
- image confidence: exact parent image copied to exact normal child printing

## Safety

\`\`\`text
fingerprint: ${report.fingerprint}
sql_hash: ${report.sql_hash}
dry_run_proof: ${report.dry_run_proof.before_hash} == ${report.dry_run_proof.after_rollback_hash}
rollback_restored: ${report.dry_run_proof.rollback_restored}
db_writes_performed: false
migrations_created: false
storage_uploads_performed: false
parent_writes: false
deletes: false
merges: false
\`\`\`

## Ready Rows

${markdownTable(readyRows, [
  { label: 'number', value: (row) => row.number },
  { label: 'card', value: (row) => row.card_name },
  { label: 'printing', value: (row) => row.printing_gv_id },
  { label: 'species', value: (row) => row.species_slug },
  { label: 'planned status', value: (row) => row.planned_update.image_status },
])}

## Blocked Rows

${markdownTable(blockedRows, [
  { label: 'number', value: (row) => row.number },
  { label: 'card', value: (row) => row.card_name },
  { label: 'printing', value: (row) => row.printing_gv_id },
  { label: 'violations', value: (row) => row.violations.join(', ') },
])}

## Approval Text

\`\`\`text
Approve real IMG-CC-01-POKE-CARD-CREATOR-CHILD-IMAGE apply only. Fingerprint: ${report.fingerprint}. SQL hash: ${report.sql_hash}. Scope: ${report.summary.ready_rows} child-only exact image updates for ex5.5/Poké Card Creator Pack normal rows using existing exact parent image metadata. Dry-run proof: ${report.dry_run_proof.before_hash} == ${report.dry_run_proof.after_rollback_hash}. No parent writes. No storage uploads. No deletes. No merges. No migrations. No global apply.
\`\`\`
`;
}

async function main() {
  const dbUrl = requireDbUrl();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL.');

  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const sourceRows = await fetchRows(client);
    const classifiedRows = sourceRows.map((row) => classifyRow(row));
    const readyRows = classifiedRows.filter((row) => row.ready);
    const blockedRows = classifiedRows.filter((row) => !row.ready);

    const identityProof = {
      expected_rows: EXPECTED_ROWS,
      actual_rows: classifiedRows.map((row) => ({
        set_code: row.set_code,
        number: row.number,
        card_name: row.card_name,
        finish_key: row.finish_key,
        printing_gv_id: row.printing_gv_id,
        species_slug: row.species_slug,
        mapping_active: row.mapping_active,
        counts_for_completion: row.counts_for_completion,
        ready: row.ready,
        violations: row.violations,
      })),
    };

    const fingerprint = proofHash({
      package_id: PACKAGE_ID,
      rows: readyRows.map((row) => ({
        card_printing_id: row.card_printing_id,
        printing_gv_id: row.printing_gv_id,
        planned_update: row.planned_update,
      })),
    });
    const sqlHash = buildSqlHash();
    const dryRunProof = await runRollbackDryRun(client, readyRows);

    const report = {
      package_id: PACKAGE_ID,
      generated_at: new Date().toISOString(),
      fingerprint,
      sql_hash: sqlHash,
      summary: {
        source_rows: sourceRows.length,
        expected_rows: EXPECTED_ROWS.length,
        ready_rows: readyRows.length,
        blocked_rows: blockedRows.length,
        planned_child_image_updates: readyRows.length,
      },
      identity_proof: identityProof,
      dry_run_proof: dryRunProof,
      rows: classifiedRows,
      db_writes_performed: false,
      migrations_created: false,
      storage_uploads_performed: false,
      parent_writes_performed: false,
      deletes_performed: false,
      merges_performed: false,
    };

    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    await fs.writeFile(OUTPUT_JSON, `${JSON.stringify(report, null, 2)}\n`);
    await fs.writeFile(OUTPUT_MD, renderMarkdown(report));

    console.log(JSON.stringify({
      package_id: PACKAGE_ID,
      output_json: OUTPUT_JSON,
      output_md: OUTPUT_MD,
      fingerprint,
      sql_hash: sqlHash,
      summary: report.summary,
      dry_run_proof: {
        before_hash: dryRunProof.before_hash,
        after_rollback_hash: dryRunProof.after_rollback_hash,
        rollback_restored: dryRunProof.rollback_restored,
      },
    }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
