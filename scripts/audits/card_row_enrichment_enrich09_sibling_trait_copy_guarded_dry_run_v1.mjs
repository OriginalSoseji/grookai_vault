import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'enrich09_sibling_trait_copy_guarded_dry_run_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'enrich09_sibling_trait_copy_guarded_dry_run_v1.md');
const PACKAGE_ID = 'ENRICH-09-SIBLING-TRAIT-COPY';

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
        max(trait_rows)::int as max_trait_rows,
        min(trait_rows)::int as min_trait_rows
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
    && guard.projected_trait_insert_rows > 0;
}

async function runRollbackDryRun(client, targets) {
  const beforeSnapshot = await captureSnapshot(client, targets);
  let insideProof = null;

  try {
    await client.query('begin');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");

    const guard = await validateScope(client, targets);
    if (!guardPassed(guard, targets.length)) {
      insideProof = {
        inserted_trait_rows: 0,
        guard_blocked: true,
        guard,
      };
    } else {
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

      insideProof = {
        inserted_trait_rows: inserted.rowCount,
        inserted_samples: inserted.rows.slice(0, 25),
        proof: proof.rows[0],
        guard,
      };
    }
  } finally {
    await client.query('rollback');
  }

  const afterRollbackSnapshot = await captureSnapshot(client, targets);
  return {
    before_snapshot: beforeSnapshot,
    inside_transaction_proof: insideProof,
    after_rollback_snapshot: afterRollbackSnapshot,
    dry_run_status: beforeSnapshot.hash_sha256 === afterRollbackSnapshot.hash_sha256
      ? 'completed_rolled_back_no_durable_change'
      : 'failed_rollback_hash_mismatch',
  };
}

async function main() {
  const dbUrl = connectionString();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for guarded dry-run.');

  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    const targets = await loadTargets(client);
    const packageFingerprint = sha256(stableJson({
      package_id: PACKAGE_ID,
      targets,
    }));
    const preflight = await validateScope(client, targets);
    const execution = await runRollbackDryRun(client, targets);
    const stopFindings = [];

    if (targets.length === 0) stopFindings.push('no_targets');
    if (!guardPassed(preflight, targets.length)) stopFindings.push('preflight_guard_failed');
    if (execution.inside_transaction_proof?.guard_blocked) stopFindings.push('dry_run_guard_blocked');
    if (execution.dry_run_status !== 'completed_rolled_back_no_durable_change') stopFindings.push(execution.dry_run_status);
    if (execution.inside_transaction_proof?.inserted_trait_rows !== preflight.projected_trait_insert_rows) stopFindings.push('inserted_trait_row_count_mismatch');
    if (execution.inside_transaction_proof?.proof?.copied_trait_rows !== preflight.projected_trait_insert_rows) stopFindings.push('copied_trait_row_count_mismatch');
    if (execution.inside_transaction_proof?.proof?.unexpected_preexisting_target_trait_rows !== 0) stopFindings.push('unexpected_preexisting_target_trait_rows');

    const report = {
      version: 'ENRICH09_SIBLING_TRAIT_COPY_GUARDED_DRY_RUN_V1',
      package_id: PACKAGE_ID,
      generated_at: new Date().toISOString(),
      package_fingerprint_sha256: packageFingerprint,
      scope: {
        target_parent_rows: targets.length,
        projected_trait_insert_rows: preflight.projected_trait_insert_rows,
        writes_simulated_then_rolled_back: ['card_print_traits inserts'],
        durable_db_writes_performed: false,
        migrations_created: false,
        forbidden: ['card_prints writes', 'card_printings writes', 'card_print_identity writes', 'external_mappings writes', 'card_print_species writes', 'deletes', 'merges', 'migrations', 'image writes', 'global apply'],
      },
      preflight,
      execution,
      by_set_top_25: Object.fromEntries(Object.entries(countBy(targets, (row) => row.set_code ?? 'missing_set_code')).slice(0, 25)),
      target_samples: targets.slice(0, 50),
      stop_findings: stopFindings,
      pass: stopFindings.length === 0,
      recommended_approval_text: stopFindings.length === 0
        ? `Approve real ${PACKAGE_ID} apply only. Fingerprint: ${packageFingerprint}. Scope: ${targets.length} parent rows, ${preflight.projected_trait_insert_rows} card_print_traits inserts copied from unambiguous enriched same set/number/name siblings. Dry-run proof: ${execution.before_snapshot.hash_sha256} == ${execution.after_rollback_snapshot.hash_sha256}. No parent writes. No child writes. No identity writes. No external mapping writes. No species writes. No deletes. No merges. No migrations. No image writes. No global apply.`
        : null,
    };

    await writeJson(OUTPUT_JSON, report);

    const md = [
      '# ENRICH-09 Sibling Trait Copy Guarded Dry Run V1',
      '',
      `Package: \`${PACKAGE_ID}\``,
      '',
      '## Result',
      '',
      `- Pass: ${report.pass}`,
      `- Target parent rows: ${targets.length}`,
      `- Projected trait inserts: ${preflight.projected_trait_insert_rows}`,
      `- Inserted inside transaction: ${execution.inside_transaction_proof?.inserted_trait_rows ?? 0}`,
      `- Dry-run status: ${execution.dry_run_status}`,
      `- Before hash: \`${execution.before_snapshot.hash_sha256}\``,
      `- After rollback hash: \`${execution.after_rollback_snapshot.hash_sha256}\``,
      `- Package fingerprint: \`${packageFingerprint}\``,
      '',
      '## Safety',
      '',
      '- Durable DB writes performed: false',
      '- Migrations created: false',
      '- Simulated writes were rolled back.',
      '- No parent, child printing, identity, external mapping, species, delete, merge, or image writes were performed.',
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
      '## Approval Text',
      '',
      report.recommended_approval_text ? `\`${report.recommended_approval_text}\`` : '_Not available; dry-run did not pass._',
      '',
    ].join('\n');

    await writeText(OUTPUT_MD, md);
    console.log(JSON.stringify({
      output_json: OUTPUT_JSON,
      output_md: OUTPUT_MD,
      pass: report.pass,
      package_fingerprint_sha256: packageFingerprint,
      target_parent_rows: targets.length,
      projected_trait_insert_rows: preflight.projected_trait_insert_rows,
      dry_run_proof: `${execution.before_snapshot.hash_sha256} == ${execution.after_rollback_snapshot.hash_sha256}`,
      recommended_approval_text: report.recommended_approval_text,
    }, null, 2));
  } finally {
    await client.end();
  }
}

await main();
