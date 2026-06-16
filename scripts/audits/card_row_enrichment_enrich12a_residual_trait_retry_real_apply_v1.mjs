import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const DRY_RUN_JSON = path.join(OUTPUT_DIR, 'enrich12a_residual_trait_retry_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'enrich12a_residual_trait_retry_real_apply_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'enrich12a_residual_trait_retry_real_apply_v1.md');

const PACKAGE_ID = 'ENRICH-12A-RESIDUAL-SOURCE-MAPPED-TRAIT-RETRY';
const EXPECTED_FINGERPRINT = 'de596ede88f9ca77a1757378d7739820b4fa8c0061777a6f49c221145644f2fa';
const EXPECTED_DRY_RUN_PROOF = '4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945';
const EXPECTED_TARGET_ROWS = 72;
const EXPECTED_TRAIT_INSERT_ROWS = 372;
const APPROVAL_TEXT = 'Approve real ENRICH-12A-RESIDUAL-SOURCE-MAPPED-TRAIT-RETRY apply only. Fingerprint: de596ede88f9ca77a1757378d7739820b4fa8c0061777a6f49c221145644f2fa. Scope: 72 parent rows, 372 card_print_traits inserts from residual exact active source mappings. Dry-run proof: 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945 == 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945. No parent writes. No child writes. No identity writes. No external mapping writes. No species writes. No deletes. No merges. No migrations. No image writes. No global apply.';

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

function flattenTraitRows(targets) {
  return targets.flatMap((row) => row.trait_rows ?? []);
}

function validateDryRunReport(report) {
  const targets = report.accepted_targets ?? [];
  const traitRows = flattenTraitRows(targets);
  const beforeHash = report.execution?.before_snapshot?.hash_sha256;
  const afterHash = report.execution?.after_rollback_snapshot?.hash_sha256;
  const findings = [];

  if (report.package_id !== PACKAGE_ID) findings.push('package_id_mismatch');
  if (report.pass !== true) findings.push('dry_run_not_passed');
  if (report.package_fingerprint_sha256 !== EXPECTED_FINGERPRINT) findings.push('package_fingerprint_mismatch');
  if (beforeHash !== EXPECTED_DRY_RUN_PROOF || afterHash !== EXPECTED_DRY_RUN_PROOF) findings.push('dry_run_proof_mismatch');
  if (targets.length !== EXPECTED_TARGET_ROWS) findings.push('target_row_count_mismatch');
  if (traitRows.length !== EXPECTED_TRAIT_INSERT_ROWS) findings.push('trait_insert_count_mismatch');
  if (report.recommended_approval_text !== APPROVAL_TEXT) findings.push('approval_text_mismatch');
  if (traitRows.some((row) => !['pokemonapi', 'tcgdex'].includes(row.source))) findings.push('unexpected_trait_source');

  return { targets, traitRows, findings };
}

async function captureSnapshot(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(card_print_id uuid)
     )
     select
       cpt.card_print_id::text,
       cpt.trait_type,
       cpt.trait_value,
       cpt.source,
       cpt.confidence,
       cpt.hp,
       cpt.national_dex,
       cpt.types,
       cpt.rarity,
       cpt.supertype,
       cpt.card_category,
       cpt.legacy_rarity
     from target
     join public.card_print_traits cpt on cpt.card_print_id = target.card_print_id
     order by cpt.card_print_id, cpt.trait_type, cpt.trait_value, cpt.source`,
    [JSON.stringify(targets.map((row) => ({ card_print_id: row.card_print_id })))],
  );
  return {
    captured_at: new Date().toISOString(),
    rows: result.rows,
    hash_sha256: sha256(stableJson(result.rows)),
    row_count: result.rows.length,
  };
}

async function validateScope(client, targets, traitRows) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(card_print_id uuid)
     ),
     traits as (
       select *
       from jsonb_to_recordset($2::jsonb) as t(card_print_id uuid, trait_type text, trait_value text, source text)
     ),
     existing_traits as (
       select card_print_id, count(*)::int as trait_count
       from public.card_print_traits
       group by card_print_id
     )
     select
       (select count(*)::int from target) as target_count,
       (select count(distinct card_print_id)::int from target) as distinct_target_count,
       (select count(*)::int from target left join public.card_prints cp on cp.id = target.card_print_id where cp.id is null) as missing_parent_count,
       (select count(*)::int
        from target
        join public.card_prints cp on cp.id = target.card_print_id
        join public.sets s on s.id = cp.set_id
        where s.identity_domain_default not like 'pokemon_eng%') as non_english_target_count,
       (select count(*)::int
        from target
        join existing_traits et on et.card_print_id = target.card_print_id
        where et.trait_count > 0) as target_already_has_traits_count,
       (select count(*)::int from traits) as projected_trait_insert_rows,
       (select count(*)::int
        from (
          select card_print_id, trait_type, trait_value, source, count(*)::int as row_count
          from traits
          group by card_print_id, trait_type, trait_value, source
          having count(*) > 1
        ) duplicates) as duplicate_trait_identity_count,
       (select count(*)::int
        from traits
        join public.card_print_traits cpt
          on cpt.card_print_id = traits.card_print_id
         and cpt.trait_type = traits.trait_type
         and cpt.trait_value = traits.trait_value
         and cpt.source = traits.source) as preexisting_same_trait_count,
       (select count(*)::int
        from traits
        where nullif(trait_type, '') is null
           or nullif(trait_value, '') is null
           or source not in ('pokemonapi', 'tcgdex')) as invalid_trait_shape_count`,
    [
      JSON.stringify(targets.map((row) => ({ card_print_id: row.card_print_id }))),
      JSON.stringify(traitRows.map((row) => ({
        card_print_id: row.card_print_id,
        trait_type: row.trait_type,
        trait_value: row.trait_value,
        source: row.source,
      }))),
    ],
  );
  return result.rows[0];
}

function guardPassed(guard) {
  return guard.target_count === EXPECTED_TARGET_ROWS
    && guard.distinct_target_count === EXPECTED_TARGET_ROWS
    && guard.missing_parent_count === 0
    && guard.non_english_target_count === 0
    && guard.target_already_has_traits_count === 0
    && guard.projected_trait_insert_rows === EXPECTED_TRAIT_INSERT_ROWS
    && guard.duplicate_trait_identity_count === 0
    && guard.preexisting_same_trait_count === 0
    && guard.invalid_trait_shape_count === 0;
}

async function insertTraits(client, traitRows) {
  await client.query(
    `create temporary table enrich12a_trait_targets (
       card_print_id uuid not null,
       trait_type text not null,
       trait_value text not null,
       source text not null,
       confidence numeric null,
       hp int null,
       national_dex int null,
       types text[] null,
       rarity text null,
       supertype text null,
       card_category text null,
       legacy_rarity text null
     ) on commit drop`,
  );
  await client.query(
    `insert into enrich12a_trait_targets
     select
       card_print_id,
       trait_type,
       trait_value,
       source,
       confidence,
       hp,
       national_dex,
       types,
       rarity,
       supertype,
       card_category,
       legacy_rarity
     from jsonb_to_recordset($1::jsonb) as t(
       card_print_id uuid,
       trait_type text,
       trait_value text,
       source text,
       confidence numeric,
       hp int,
       national_dex int,
       types text[],
       rarity text,
       supertype text,
       card_category text,
       legacy_rarity text
     )`,
    [JSON.stringify(traitRows)],
  );

  const inserted = await client.query(
    `insert into public.card_print_traits (
       card_print_id,
       trait_type,
       trait_value,
       source,
       confidence,
       hp,
       national_dex,
       types,
       rarity,
       supertype,
       card_category,
       legacy_rarity
     )
     select
       card_print_id,
       trait_type,
       trait_value,
       source,
       confidence,
       hp,
       national_dex,
       types,
       rarity,
       supertype,
       card_category,
       legacy_rarity
     from enrich12a_trait_targets
     returning id::text, card_print_id::text, trait_type, trait_value, source`,
  );

  const proof = await client.query(
    `select
       (select count(distinct card_print_id)::int from enrich12a_trait_targets) as target_count,
       (select count(*)::int from enrich12a_trait_targets) as expected_trait_rows,
       (select count(*)::int
        from public.card_print_traits cpt
        join enrich12a_trait_targets target
          on target.card_print_id = cpt.card_print_id
         and target.trait_type = cpt.trait_type
         and target.trait_value = cpt.trait_value
         and target.source = cpt.source) as inserted_trait_rows`,
  );

  return {
    inserted_trait_rows: inserted.rowCount,
    inserted_samples: inserted.rows.slice(0, 25),
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

  const { targets, traitRows } = dryRunValidation;
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

    guard = await validateScope(client, targets, traitRows);
    if (!guardPassed(guard)) throw new Error(`PRECONDITION_FAILED:${JSON.stringify(guard)}`);

    applyProof = await insertTraits(client, traitRows);
    if (applyProof.inserted_trait_rows !== EXPECTED_TRAIT_INSERT_ROWS) {
      throw new Error(`INSERT_COUNT_MISMATCH:${applyProof.inserted_trait_rows}`);
    }
    if (applyProof.proof.inserted_trait_rows !== EXPECTED_TRAIT_INSERT_ROWS) {
      throw new Error(`PROOF_COUNT_MISMATCH:${applyProof.proof.inserted_trait_rows}`);
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
    version: 'ENRICH12A_RESIDUAL_TRAIT_RETRY_REAL_APPLY_V1',
    package_id: PACKAGE_ID,
    generated_at: new Date().toISOString(),
    package_fingerprint_sha256: EXPECTED_FINGERPRINT,
    approval_text_required: APPROVAL_TEXT,
    scope: {
      target_parent_rows: EXPECTED_TARGET_ROWS,
      trait_insert_rows: EXPECTED_TRAIT_INSERT_ROWS,
      writes_performed: ['card_print_traits inserts'],
      migrations_created: false,
      forbidden: ['card_prints writes', 'card_printings writes', 'card_print_identity writes', 'external_mappings writes', 'card_print_species writes', 'deletes', 'merges', 'migrations', 'image writes', 'global apply'],
    },
    dry_run_reference: {
      dry_run_json: DRY_RUN_JSON,
      dry_run_proof: `${EXPECTED_DRY_RUN_PROOF} == ${EXPECTED_DRY_RUN_PROOF}`,
    },
    guard,
    before_snapshot: beforeSnapshot,
    apply_proof: applyProof,
    after_snapshot: afterSnapshot,
    by_source: countBy(traitRows, (row) => row.source),
    by_trait_type: countBy(traitRows, (row) => row.trait_type),
    by_set_top_25: Object.fromEntries(Object.entries(countBy(targets, (row) => row.set_code ?? 'missing_set_code')).slice(0, 25)),
    pass: afterSnapshot.row_count === EXPECTED_TRAIT_INSERT_ROWS,
  };

  await writeJson(OUTPUT_JSON, report);

  const md = [
    '# ENRICH-12A Residual Trait Retry Real Apply V1',
    '',
    `Package: \`${PACKAGE_ID}\``,
    '',
    '## Result',
    '',
    `- Pass: ${report.pass}`,
    `- Target parent rows: ${EXPECTED_TARGET_ROWS}`,
    `- Trait inserts: ${applyProof.inserted_trait_rows}`,
    `- After snapshot trait rows: ${afterSnapshot.row_count}`,
    `- Package fingerprint: \`${EXPECTED_FINGERPRINT}\``,
    '',
    '## Safety',
    '',
    '- Writes performed: `card_print_traits` inserts only',
    '- Migrations created: false',
    '- No parent, child printing, identity, external mapping, species, delete, merge, migration, image, or global apply writes were performed.',
    '',
    '## By Source',
    '',
    markdownTable(Object.entries(report.by_source).map(([source, rows]) => ({ source, rows })), [
      { label: 'source', value: (row) => row.source },
      { label: 'rows', value: (row) => row.rows },
    ]),
    '',
    '## By Trait Type',
    '',
    markdownTable(Object.entries(report.by_trait_type).map(([trait_type, rows]) => ({ trait_type, rows })), [
      { label: 'trait_type', value: (row) => row.trait_type },
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
    trait_insert_rows: applyProof.inserted_trait_rows,
  }, null, 2));
}

await main();
