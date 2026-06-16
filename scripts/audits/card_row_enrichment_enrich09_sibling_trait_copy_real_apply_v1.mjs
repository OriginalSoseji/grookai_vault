import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const DRY_RUN_JSON = path.join(OUTPUT_DIR, 'enrich09_sibling_trait_copy_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'enrich09_sibling_trait_copy_real_apply_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'enrich09_sibling_trait_copy_real_apply_v1.md');

const PACKAGE_ID = 'ENRICH-09-SIBLING-TRAIT-COPY';
const EXPECTED_FINGERPRINT = '21a80f96bbe49558fff8f7c6a9416bf909b7cf2415a81685791771ee21647ac5';
const EXPECTED_DRY_RUN_PROOF = '733c303b5d398e430410935c0a11362063a9f726f3ce109032f92f7a9249522c';
const EXPECTED_TARGET_ROWS = 1009;
const EXPECTED_TRAIT_INSERT_ROWS = 1693;
const APPROVAL_TEXT = 'Approve real ENRICH-09-SIBLING-TRAIT-COPY apply only. Fingerprint: 21a80f96bbe49558fff8f7c6a9416bf909b7cf2415a81685791771ee21647ac5. Scope: 1009 parent rows, 1693 card_print_traits inserts copied from unambiguous enriched same set/number/name siblings. Dry-run proof: 733c303b5d398e430410935c0a11362063a9f726f3ce109032f92f7a9249522c == 733c303b5d398e430410935c0a11362063a9f726f3ce109032f92f7a9249522c. No parent writes. No child writes. No identity writes. No external mapping writes. No species writes. No deletes. No merges. No migrations. No image writes. No global apply.';

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

async function loadTargets(client) {
  const result = await client.query(`
    with english as (
      select cp.*
      from public.card_prints cp
      join public.sets s on s.id = cp.set_id
      where s.identity_domain_default like 'pokemon_eng%'
    ),
    trait_counts as (
      select card_print_id, count(*)::int as trait_count
      from public.card_print_traits
      group by card_print_id
    ),
    target as (
      select cp.*
      from english cp
      left join trait_counts tc on tc.card_print_id = cp.id
      where coalesce(tc.trait_count, 0) = 0
    ),
    sibling_traits as (
      select
        target.id as target_card_print_id,
        sib.id as sibling_card_print_id,
        target.set_code,
        target.number,
        target.number_plain,
        target.name as card_name,
        target.printed_identity_modifier,
        count(cpt.id)::int as trait_rows,
        md5(jsonb_agg(jsonb_build_object(
          'trait_type', cpt.trait_type,
          'trait_value', cpt.trait_value,
          'hp', cpt.hp,
          'national_dex', cpt.national_dex,
          'types', cpt.types,
          'rarity', cpt.rarity,
          'supertype', cpt.supertype,
          'card_category', cpt.card_category,
          'legacy_rarity', cpt.legacy_rarity
        ) order by cpt.id)::text) as trait_signature
      from target
      join english sib
        on sib.id <> target.id
       and sib.set_code is not distinct from target.set_code
       and sib.number is not distinct from target.number
       and lower(sib.name) = lower(target.name)
      join public.card_print_traits cpt on cpt.card_print_id = sib.id
      group by target.id, sib.id, target.set_code, target.number, target.number_plain, target.name, target.printed_identity_modifier
    ),
    grouped as (
      select
        target_card_print_id,
        count(*)::int as sibling_count,
        count(distinct trait_signature)::int as distinct_signature_count,
        max(trait_rows)::int as max_trait_rows
      from sibling_traits
      group by target_card_print_id
    ),
    ranked as (
      select
        st.*,
        grouped.sibling_count,
        grouped.distinct_signature_count,
        row_number() over (
          partition by st.target_card_print_id
          order by st.trait_rows desc, st.sibling_card_print_id
        ) as rn
      from sibling_traits st
      join grouped on grouped.target_card_print_id = st.target_card_print_id
      where grouped.distinct_signature_count = 1
    )
    select
      target_card_print_id::text,
      sibling_card_print_id::text,
      set_code,
      number,
      number_plain,
      card_name,
      printed_identity_modifier,
      trait_rows,
      sibling_count,
      distinct_signature_count,
      trait_signature
    from ranked
    where rn = 1
    order by set_code nulls last, number_plain nulls last, number nulls last, card_name, target_card_print_id
  `);
  return result.rows;
}

async function captureSnapshot(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(target_card_print_id uuid, sibling_card_print_id uuid)
     )
     select
       'target_trait' as row_type,
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
     join public.card_print_traits cpt on cpt.card_print_id = target.target_card_print_id
     union all
     select
       'sibling_trait' as row_type,
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
     join public.card_print_traits cpt on cpt.card_print_id = target.sibling_card_print_id
     order by row_type, card_print_id, trait_type nulls last, trait_value nulls last, supertype nulls last, card_category nulls last`,
    [JSON.stringify(targets)],
  );
  return {
    captured_at: new Date().toISOString(),
    rows: result.rows,
    hash_sha256: sha256(stableJson(result.rows)),
    counts: {
      target_rows: targets.length,
      target_trait_rows: result.rows.filter((row) => row.row_type === 'target_trait').length,
      sibling_trait_rows: result.rows.filter((row) => row.row_type === 'sibling_trait').length,
      total_rows: result.rows.length,
    },
  };
}

async function validateScope(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(target_card_print_id uuid, sibling_card_print_id uuid, trait_rows int, distinct_signature_count int)
     ),
     target_traits as (
       select card_print_id, count(*)::int as trait_count
       from public.card_print_traits
       group by card_print_id
     ),
     sibling_traits as (
       select card_print_id, count(*)::int as trait_count
       from public.card_print_traits
       group by card_print_id
     ),
     domain_check as (
       select target.target_card_print_id
       from target
       join public.card_prints cp on cp.id = target.target_card_print_id
       join public.sets s on s.id = cp.set_id
       where s.identity_domain_default like 'pokemon_eng%'
     )
     select
       (select count(*)::int from target) as target_count,
       (select count(distinct target_card_print_id)::int from target) as distinct_target_count,
       (select count(*)::int from target left join public.card_prints cp on cp.id = target.target_card_print_id where cp.id is null) as missing_target_parent_count,
       (select count(*)::int from target left join public.card_prints cp on cp.id = target.sibling_card_print_id where cp.id is null) as missing_sibling_parent_count,
       (select count(*)::int from target left join domain_check dc on dc.target_card_print_id = target.target_card_print_id where dc.target_card_print_id is null) as non_english_target_count,
       (select count(*)::int from target join target_traits tt on tt.card_print_id = target.target_card_print_id where tt.trait_count > 0) as target_already_has_traits_count,
       (select count(*)::int from target left join sibling_traits st on st.card_print_id = target.sibling_card_print_id where coalesce(st.trait_count, 0) <> target.trait_rows) as sibling_trait_count_mismatch_count,
       (select count(*)::int from target where distinct_signature_count <> 1) as ambiguous_signature_count,
       (select coalesce(sum(trait_rows), 0)::int from target) as projected_trait_insert_rows`,
    [JSON.stringify(targets)],
  );
  return {
    ...result.rows[0],
    target_fingerprint_sha256: sha256(stableJson(targets)),
  };
}

function guardPassed(guard, expectedCount) {
  return guard.target_count === expectedCount
    && guard.distinct_target_count === expectedCount
    && guard.missing_target_parent_count === 0
    && guard.missing_sibling_parent_count === 0
    && guard.non_english_target_count === 0
    && guard.target_already_has_traits_count === 0
    && guard.sibling_trait_count_mismatch_count === 0
    && guard.ambiguous_signature_count === 0
    && guard.projected_trait_insert_rows === EXPECTED_TRAIT_INSERT_ROWS;
}

function validateDryRun(dryRun, packageFingerprint) {
  const findings = [];
  if (dryRun.package_id !== PACKAGE_ID) findings.push('dry_run_package_id_mismatch');
  if (dryRun.pass !== true) findings.push('dry_run_not_passed');
  if (dryRun.package_fingerprint_sha256 !== packageFingerprint) findings.push('package_fingerprint_mismatch');
  if (dryRun.package_fingerprint_sha256 !== EXPECTED_FINGERPRINT) findings.push('expected_fingerprint_mismatch');
  if (dryRun.scope?.target_parent_rows !== EXPECTED_TARGET_ROWS) findings.push('target_rows_mismatch');
  if (dryRun.scope?.projected_trait_insert_rows !== EXPECTED_TRAIT_INSERT_ROWS) findings.push('trait_insert_rows_mismatch');
  if (dryRun.execution?.before_snapshot?.hash_sha256 !== EXPECTED_DRY_RUN_PROOF) findings.push('dry_run_before_hash_mismatch');
  if (dryRun.execution?.after_rollback_snapshot?.hash_sha256 !== EXPECTED_DRY_RUN_PROOF) findings.push('dry_run_after_hash_mismatch');
  if (dryRun.execution?.dry_run_status !== 'completed_rolled_back_no_durable_change') findings.push('dry_run_status_mismatch');
  if (dryRun.execution?.inside_transaction_proof?.inserted_trait_rows !== EXPECTED_TRAIT_INSERT_ROWS) findings.push('dry_run_insert_count_mismatch');
  if (dryRun.recommended_approval_text !== APPROVAL_TEXT) findings.push('approval_text_mismatch');
  return findings;
}

async function applyPackage(client, targets) {
  const beforeSnapshot = await captureSnapshot(client, targets);
  let applyProof = null;

  try {
    await client.query('begin');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");

    const guard = await validateScope(client, targets);
    if (!guardPassed(guard, targets.length)) {
      throw new Error(`preflight guard failed: ${JSON.stringify(guard)}`);
    }

    await client.query(
      `create temporary table enrich09_targets (
         target_card_print_id uuid primary key,
         sibling_card_print_id uuid not null,
         trait_rows int not null,
         distinct_signature_count int not null
       ) on commit drop`,
    );

    await client.query(
      `insert into enrich09_targets
       select target_card_print_id, sibling_card_print_id, trait_rows, distinct_signature_count
       from jsonb_to_recordset($1::jsonb) as t(
         target_card_print_id uuid,
         sibling_card_print_id uuid,
         trait_rows int,
         distinct_signature_count int
       )`,
      [JSON.stringify(targets)],
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
         target.target_card_print_id,
         source_trait.trait_type,
         source_trait.trait_value,
         'sibling_trait_copy_v1:' || target.sibling_card_print_id::text,
         source_trait.confidence,
         source_trait.hp,
         source_trait.national_dex,
         source_trait.types,
         source_trait.rarity,
         source_trait.supertype,
         source_trait.card_category,
         source_trait.legacy_rarity
       from enrich09_targets target
       join public.card_print_traits source_trait on source_trait.card_print_id = target.sibling_card_print_id
       returning id::text, card_print_id::text, trait_type, trait_value, supertype, card_category`,
    );

    const proof = await client.query(
      `select
         (select count(*)::int from enrich09_targets) as target_count,
         (select coalesce(sum(trait_rows), 0)::int from enrich09_targets) as expected_trait_rows,
         (select count(*)::int
          from enrich09_targets target
          join public.card_print_traits cpt on cpt.card_print_id = target.target_card_print_id
          where cpt.source = 'sibling_trait_copy_v1:' || target.sibling_card_print_id::text) as copied_trait_rows,
         (select count(*)::int
          from enrich09_targets target
          join public.card_print_traits cpt on cpt.card_print_id = target.target_card_print_id
          where cpt.source not like 'sibling_trait_copy_v1:%') as unexpected_preexisting_target_trait_rows`,
    );

    applyProof = {
      inserted_trait_rows: inserted.rowCount,
      inserted_samples: inserted.rows.slice(0, 25),
      proof: proof.rows[0],
    };

    if (applyProof.inserted_trait_rows !== EXPECTED_TRAIT_INSERT_ROWS) throw new Error('inserted_trait_row_count_mismatch');
    if (applyProof.proof.copied_trait_rows !== EXPECTED_TRAIT_INSERT_ROWS) throw new Error('copied_trait_row_count_mismatch');
    if (applyProof.proof.unexpected_preexisting_target_trait_rows !== 0) throw new Error('unexpected_preexisting_target_trait_rows');

    await client.query('commit');
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  }

  const afterSnapshot = await captureSnapshot(client, targets);
  return {
    before_snapshot: beforeSnapshot,
    apply_proof: applyProof,
    after_snapshot: afterSnapshot,
  };
}

async function main() {
  const dryRun = await readJson(DRY_RUN_JSON);
  const dbUrl = connectionString();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for real apply.');

  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    const targets = await loadTargets(client);
    const packageFingerprint = sha256(stableJson({ package_id: PACKAGE_ID, targets }));
    const dryRunFindings = validateDryRun(dryRun, packageFingerprint);
    if (dryRunFindings.length > 0) throw new Error(`DRY_RUN_VALIDATION_FAILED:${dryRunFindings.join(',')}`);
    if (targets.length !== EXPECTED_TARGET_ROWS) throw new Error(`target_count_drift:${targets.length}`);

    const execution = await applyPackage(client, targets);
    const stopFindings = [];

    if (execution.before_snapshot.counts.target_trait_rows !== 0) stopFindings.push('target_traits_existed_before_apply');
    if (execution.apply_proof.inserted_trait_rows !== EXPECTED_TRAIT_INSERT_ROWS) stopFindings.push('inserted_trait_row_count_mismatch');
    if (execution.after_snapshot.counts.target_trait_rows !== EXPECTED_TRAIT_INSERT_ROWS) stopFindings.push('after_snapshot_target_trait_rows_mismatch');
    if (execution.after_snapshot.counts.sibling_trait_rows !== execution.before_snapshot.counts.sibling_trait_rows) stopFindings.push('sibling_trait_rows_changed');

    const report = {
      version: 'ENRICH09_SIBLING_TRAIT_COPY_REAL_APPLY_V1',
      package_id: PACKAGE_ID,
      generated_at: new Date().toISOString(),
      approved_text: APPROVAL_TEXT,
      package_fingerprint_sha256: packageFingerprint,
      dry_run_proof: `${EXPECTED_DRY_RUN_PROOF} == ${EXPECTED_DRY_RUN_PROOF}`,
      source_file: DRY_RUN_JSON,
      scope: {
        target_parent_rows: targets.length,
        trait_insert_rows: EXPECTED_TRAIT_INSERT_ROWS,
        writes_performed: ['card_print_traits inserts'],
        durable_db_writes_performed: true,
        parent_writes: false,
        child_writes: false,
        identity_writes: false,
        external_mapping_writes: false,
        species_writes: false,
        deletes: false,
        merges: false,
        migrations_created: false,
        image_writes: false,
        global_apply: false,
      },
      by_set_top_25: Object.fromEntries(Object.entries(countBy(targets, (row) => row.set_code ?? 'missing_set_code')).slice(0, 25)),
      execution,
      stop_findings: stopFindings,
      pass: stopFindings.length === 0,
    };

    await writeJson(OUTPUT_JSON, report);

    const md = [
      '# ENRICH-09 Sibling Trait Copy Real Apply V1',
      '',
      `Package: \`${PACKAGE_ID}\``,
      '',
      '## Result',
      '',
      `- Pass: ${report.pass}`,
      `- Target parent rows: ${targets.length}`,
      `- Inserted trait rows: ${execution.apply_proof.inserted_trait_rows}`,
      `- Target trait rows before: ${execution.before_snapshot.counts.target_trait_rows}`,
      `- Target trait rows after: ${execution.after_snapshot.counts.target_trait_rows}`,
      `- Package fingerprint: \`${packageFingerprint}\``,
      `- Dry-run proof: \`${EXPECTED_DRY_RUN_PROOF} == ${EXPECTED_DRY_RUN_PROOF}\``,
      '',
      '## Safety',
      '',
      '- Durable DB writes performed: true',
      '- Writes performed: `card_print_traits` inserts only',
      '- Parent writes: false',
      '- Child writes: false',
      '- Identity writes: false',
      '- External mapping writes: false',
      '- Species writes: false',
      '- Deletes/merges: false',
      '- Migrations created: false',
      '- Image writes: false',
      '- Global apply: false',
      '',
      '## By Set',
      '',
      markdownTable(Object.entries(report.by_set_top_25).map(([set_code, rows]) => ({ set_code, rows })), [
        { label: 'set_code', value: (row) => row.set_code },
        { label: 'rows', value: (row) => row.rows },
      ]),
      '',
      '## Stop Findings',
      '',
      report.stop_findings.length ? report.stop_findings.map((finding) => `- ${finding}`).join('\n') : '_None._',
      '',
    ].join('\n');

    await writeText(OUTPUT_MD, md);
    console.log(JSON.stringify({
      output_json: OUTPUT_JSON,
      output_md: OUTPUT_MD,
      pass: report.pass,
      package_fingerprint_sha256: packageFingerprint,
      inserted_trait_rows: execution.apply_proof.inserted_trait_rows,
      stop_findings: stopFindings,
    }, null, 2));
  } finally {
    await client.end();
  }
}

await main();
