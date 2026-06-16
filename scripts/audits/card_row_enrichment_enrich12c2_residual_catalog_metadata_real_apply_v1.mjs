import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const DRY_RUN_JSON = path.join(OUTPUT_DIR, 'enrich12c2_residual_catalog_metadata_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'enrich12c2_residual_catalog_metadata_real_apply_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'enrich12c2_residual_catalog_metadata_real_apply_v1.md');

const PACKAGE_ID = 'ENRICH-12C2-RESIDUAL-CATALOG-METADATA-RETRY';
const EXPECTED_FINGERPRINT = '3be12029a643045cd1a0904bbf366953fd58e122f14d5e3496735469ab17e897';
const EXPECTED_DRY_RUN_PROOF = '729aa6b0b50fedc7d865a96e95b2356e4e12aa9ff43856847445072a911c3aa9';
const EXPECTED_TARGET_ROWS = 8;
const APPROVAL_TEXT = 'Approve real ENRICH-12C2-RESIDUAL-CATALOG-METADATA-RETRY apply only. Fingerprint: 3be12029a643045cd1a0904bbf366953fd58e122f14d5e3496735469ab17e897. Scope: 8 null-only card_prints catalog metadata updates from exact active TCGdex source mappings. Dry-run proof: 729aa6b0b50fedc7d865a96e95b2356e4e12aa9ff43856847445072a911c3aa9 == 729aa6b0b50fedc7d865a96e95b2356e4e12aa9ff43856847445072a911c3aa9. No non-null overwrites. No child writes. No identity writes. No external mapping writes. No species writes. No deletes. No merges. No migrations. No image writes. No global apply.';

function connectionString() {
  return process.env.SUPABASE_DB_URL
    ?? process.env.DATABASE_URL
    ?? process.env.POSTGRES_URL
    ?? process.env.POSTGRES_PRISMA_URL
    ?? null;
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row) ?? 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

function markdownTable(rows, columns) {
  if (!rows.length) return '_None._';
  return [
    `| ${columns.map((column) => column.label).join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${columns.map((column) => String(column.value(row) ?? '').replace(/\|/g, '\\|')).join(' | ')} |`),
  ].join('\n');
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeText(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value);
}

function validateDryRunReport(report) {
  const targets = report.accepted_targets ?? [];
  const beforeHash = report.execution?.before_snapshot?.hash_sha256;
  const afterHash = report.execution?.after_rollback_snapshot?.hash_sha256;
  const findings = [];

  if (report.package_id !== PACKAGE_ID) findings.push('package_id_mismatch');
  if (report.pass !== true) findings.push('dry_run_not_passed');
  if (report.package_fingerprint_sha256 !== EXPECTED_FINGERPRINT) findings.push('package_fingerprint_mismatch');
  if (beforeHash !== EXPECTED_DRY_RUN_PROOF || afterHash !== EXPECTED_DRY_RUN_PROOF) findings.push('dry_run_proof_mismatch');
  if (targets.length !== EXPECTED_TARGET_ROWS) findings.push('target_row_count_mismatch');
  if (report.recommended_approval_text !== APPROVAL_TEXT) findings.push('approval_text_mismatch');
  if (targets.some((row) => !row.card_print_id || !row.source_url?.startsWith('https://api.tcgdex.net/'))) findings.push('invalid_source_target');
  if (targets.some((row) => row.rarity == null && row.artist == null && row.regulation_mark == null && row.variants == null)) findings.push('empty_metadata_target');

  return { targets, findings };
}

async function captureSnapshot(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(card_print_id uuid)
     )
     select
       cp.id::text as card_print_id,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name as card_name,
       cp.rarity,
       cp.artist,
       cp.regulation_mark,
       cp.variants
     from target
     join public.card_prints cp on cp.id = target.card_print_id
     order by cp.set_code nulls last, cp.number_plain nulls last, cp.number nulls last, cp.name, cp.id`,
    [JSON.stringify(targets.map((row) => ({ card_print_id: row.card_print_id })))],
  );
  return {
    captured_at: new Date().toISOString(),
    rows: result.rows,
    hash_sha256: sha256(stableJson(result.rows)),
    row_count: result.rows.length,
  };
}

async function validateScope(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         card_print_id uuid,
         rarity text,
         artist text,
         regulation_mark text,
         variants jsonb
       )
     )
     select
       (select count(*)::int from target) as target_count,
       (select count(distinct card_print_id)::int from target) as distinct_target_count,
       (select count(*)::int
        from target
        where rarity is null and artist is null and regulation_mark is null and variants is null) as no_metadata_target_count,
       (select count(*)::int from target left join public.card_prints cp on cp.id = target.card_print_id where cp.id is null) as missing_parent_count,
       (select count(*)::int
        from target
        join public.card_prints cp on cp.id = target.card_print_id
        where cp.rarity is not null or cp.artist is not null or cp.regulation_mark is not null or cp.variants is not null) as non_null_metadata_overwrite_count,
       (select count(*)::int
        from target
        join public.card_prints cp on cp.id = target.card_print_id
        join public.sets s on s.id = cp.set_id
        where s.identity_domain_default not like 'pokemon_eng%') as non_english_target_count`,
    [JSON.stringify(targets.map((row) => ({
      card_print_id: row.card_print_id,
      rarity: row.rarity,
      artist: row.artist,
      regulation_mark: row.regulation_mark,
      variants: row.variants,
    })))],
  );
  return result.rows[0];
}

function guardPassed(guard) {
  return guard.target_count === EXPECTED_TARGET_ROWS
    && guard.distinct_target_count === EXPECTED_TARGET_ROWS
    && guard.no_metadata_target_count === 0
    && guard.missing_parent_count === 0
    && guard.non_null_metadata_overwrite_count === 0
    && guard.non_english_target_count === 0;
}

async function applyMetadata(client, targets) {
  await client.query(
    `create temporary table enrich12c_targets (
       card_print_id uuid primary key,
       rarity text null,
       artist text null,
       regulation_mark text null,
       variants jsonb null
     ) on commit drop`,
  );
  await client.query(
    `insert into enrich12c_targets
     select card_print_id, rarity, artist, regulation_mark, variants
     from jsonb_to_recordset($1::jsonb) as t(
       card_print_id uuid,
       rarity text,
       artist text,
       regulation_mark text,
       variants jsonb
     )`,
    [JSON.stringify(targets.map((row) => ({
      card_print_id: row.card_print_id,
      rarity: row.rarity,
      artist: row.artist,
      regulation_mark: row.regulation_mark,
      variants: row.variants,
    })))],
  );

  const updated = await client.query(
    `update public.card_prints cp
     set
       rarity = target.rarity,
       artist = target.artist,
       regulation_mark = target.regulation_mark,
       variants = target.variants,
       updated_at = now()
     from enrich12c_targets target
     where cp.id = target.card_print_id
       and cp.rarity is null
       and cp.artist is null
       and cp.regulation_mark is null
       and cp.variants is null
     returning cp.id::text as card_print_id, cp.set_code, cp.number, cp.name as card_name, cp.rarity, cp.artist, cp.regulation_mark, cp.variants`,
  );

  const proof = await client.query(
    `select
       (select count(*)::int from enrich12c_targets) as target_count,
       (select count(*)::int
        from enrich12c_targets target
        join public.card_prints cp on cp.id = target.card_print_id
        where cp.rarity is not distinct from target.rarity
          and cp.artist is not distinct from target.artist
          and cp.regulation_mark is not distinct from target.regulation_mark
          and cp.variants is not distinct from target.variants) as matching_metadata_count`,
  );

  return {
    updated_parent_rows: updated.rowCount,
    updated_samples: updated.rows.slice(0, 25),
    proof: proof.rows[0],
  };
}

async function main() {
  const dbUrl = connectionString();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for real apply.');

  const dryRun = await readJson(DRY_RUN_JSON);
  const dryRunValidation = validateDryRunReport(dryRun);
  if (dryRunValidation.findings.length > 0) {
    throw new Error(`DRY_RUN_VALIDATION_FAILED:${dryRunValidation.findings.join(',')}`);
  }

  const { targets } = dryRunValidation;
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  let beforeSnapshot = null;
  let afterSnapshot = null;
  let guard = null;
  let applyProof = null;

  try {
    beforeSnapshot = await captureSnapshot(client, targets);
    await client.query('begin');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");

    guard = await validateScope(client, targets);
    if (!guardPassed(guard)) throw new Error(`PRECONDITION_FAILED:${JSON.stringify(guard)}`);

    applyProof = await applyMetadata(client, targets);
    if (applyProof.updated_parent_rows !== EXPECTED_TARGET_ROWS) {
      throw new Error(`UPDATE_COUNT_MISMATCH:${applyProof.updated_parent_rows}`);
    }
    if (applyProof.proof.matching_metadata_count !== EXPECTED_TARGET_ROWS) {
      throw new Error(`PROOF_COUNT_MISMATCH:${applyProof.proof.matching_metadata_count}`);
    }

    await client.query('commit');
    afterSnapshot = await captureSnapshot(client, targets);
  } catch (error) {
    try {
      await client.query('rollback');
    } catch {
      // Transaction may already be closed.
    }
    throw error;
  } finally {
    await client.end();
  }

  const report = {
    version: 'ENRICH12C_TCGDEX_CATALOG_METADATA_REAL_APPLY_V1',
    package_id: PACKAGE_ID,
    generated_at: new Date().toISOString(),
    package_fingerprint_sha256: EXPECTED_FINGERPRINT,
    approval_text_required: APPROVAL_TEXT,
    scope: {
      target_parent_rows: EXPECTED_TARGET_ROWS,
      writes_performed: ['card_prints rarity/artist/regulation_mark/variants null-only updates'],
      migrations_created: false,
      forbidden: ['non-null overwrites', 'card_printings writes', 'card_print_identity writes', 'external_mappings writes', 'card_print_species writes', 'deletes', 'merges', 'migrations', 'image writes', 'global apply'],
    },
    dry_run_reference: {
      dry_run_json: DRY_RUN_JSON,
      dry_run_proof: `${EXPECTED_DRY_RUN_PROOF} == ${EXPECTED_DRY_RUN_PROOF}`,
    },
    guard,
    before_snapshot: beforeSnapshot,
    apply_proof: applyProof,
    after_snapshot: afterSnapshot,
    by_set_top_25: Object.fromEntries(Object.entries(countBy(targets, (row) => row.set_code ?? 'missing_set_code')).slice(0, 25)),
    pass: afterSnapshot.row_count === EXPECTED_TARGET_ROWS
      && applyProof.updated_parent_rows === EXPECTED_TARGET_ROWS
      && applyProof.proof.matching_metadata_count === EXPECTED_TARGET_ROWS,
  };

  await writeJson(OUTPUT_JSON, report);

  const md = [
    '# ENRICH-12C TCGdex Catalog Metadata Real Apply V1',
    '',
    `Package: \`${PACKAGE_ID}\``,
    '',
    '## Result',
    '',
    `- Pass: ${report.pass}`,
    `- Target parent rows: ${EXPECTED_TARGET_ROWS}`,
    `- Parent rows updated: ${applyProof.updated_parent_rows}`,
    `- Matching metadata proof: ${applyProof.proof.matching_metadata_count}`,
    `- Package fingerprint: \`${EXPECTED_FINGERPRINT}\``,
    '',
    '## Safety',
    '',
    '- Writes performed: `card_prints` null-only catalog metadata updates only',
    '- Migrations created: false',
    '- No non-null overwrites, child printing, identity, external mapping, species, delete, merge, migration, image, or global apply writes were performed.',
    '',
    '## By Set',
    '',
    markdownTable(Object.entries(report.by_set_top_25).map(([set_code, rows]) => ({ set_code, rows })), [
      { label: 'set_code', value: (row) => row.set_code },
      { label: 'rows', value: (row) => row.rows },
    ]),
    '',
  ].join('\n');

  await writeText(OUTPUT_MD, md);
  console.log(JSON.stringify({
    output_json: OUTPUT_JSON,
    output_md: OUTPUT_MD,
    pass: report.pass,
    package_fingerprint_sha256: EXPECTED_FINGERPRINT,
    target_parent_rows: EXPECTED_TARGET_ROWS,
    updated_parent_rows: applyProof.updated_parent_rows,
  }, null, 2));
}

await main();
