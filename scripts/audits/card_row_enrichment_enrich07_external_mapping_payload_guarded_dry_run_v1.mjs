import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'enrich07_external_mapping_payload_guarded_dry_run_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'enrich07_external_mapping_payload_guarded_dry_run_v1.md');
const PACKAGE_ID = 'ENRICH-07-EXTERNAL-MAPPING-PAYLOAD-BACKFILL';
const ALLOWED_SOURCES = new Set(['tcgdex', 'pokemonapi']);

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

async function loadCandidates(client) {
  const result = await client.query(`
    with active_mapping_counts as (
      select card_print_id, count(*) filter (where active = true)::int as active_mapping_count
      from public.external_mappings
      group by card_print_id
    ),
    payload as (
      select
        cp.id::text as card_print_id,
        cp.set_code,
        s.name as set_name,
        cp.number,
        cp.number_plain,
        cp.name as card_name,
        j.key as source,
        trim(both '"' from j.value::text) as external_id,
        jsonb_typeof(j.value) as value_type
      from public.card_prints cp
      join public.sets s on s.id = cp.set_id
      left join active_mapping_counts am on am.card_print_id = cp.id
      cross join lateral jsonb_each(cp.external_ids) j
      where s.identity_domain_default like 'pokemon_eng%'
        and coalesce(am.active_mapping_count, 0) = 0
        and cp.external_ids is not null
        and cp.external_ids <> '{}'::jsonb
    )
    select *
    from payload
    where source = any($1::text[])
      and value_type = 'string'
      and external_id is not null
      and btrim(external_id) <> ''
    order by source, set_code nulls last, number_plain nulls last, number nulls last, card_name nulls last
  `, [[...ALLOWED_SOURCES]]);

  return result.rows;
}

function buildTargets(candidateRows) {
  return candidateRows.map((row) => ({
    card_print_id: row.card_print_id,
    source: row.source,
    external_id: row.external_id,
    set_code: row.set_code,
    number: row.number,
    number_plain: row.number_plain,
    card_name: row.card_name,
  }));
}

async function captureSnapshot(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(card_print_id uuid, source text, external_id text)
     )
     select
       'parent' as row_type,
       cp.id::text as row_id,
       cp.id::text as card_print_id,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name as card_name,
       target.source,
       target.external_id
     from target
     join public.card_prints cp on cp.id = target.card_print_id
     union all
     select
       'active_mapping' as row_type,
       em.id::text as row_id,
       em.card_print_id::text as card_print_id,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name as card_name,
       em.source,
       em.external_id
     from target
     join public.external_mappings em
       on em.card_print_id = target.card_print_id
      and em.source = target.source
      and em.external_id = target.external_id
      and em.active = true
     join public.card_prints cp on cp.id = em.card_print_id
     order by row_type, source, external_id, row_id`,
    [JSON.stringify(targets)],
  );

  return {
    captured_at: new Date().toISOString(),
    rows: result.rows,
    hash_sha256: sha256(stableJson(result.rows)),
    counts: {
      target_rows: targets.length,
      parent_rows: result.rows.filter((row) => row.row_type === 'parent').length,
      active_mapping_rows: result.rows.filter((row) => row.row_type === 'active_mapping').length,
      total_rows: result.rows.length,
    },
  };
}

async function validateScope(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(card_print_id uuid, source text, external_id text)
     )
     select
       (select count(*)::int from target) as target_count,
       (select count(*)::int from target where source <> all($2::text[])) as unsupported_source_count,
       (select count(distinct card_print_id::text || '|' || source || '|' || external_id)::int from target) as distinct_target_count,
       (select count(distinct source || '|' || external_id)::int from target) as distinct_source_external_count,
       (select count(*)::int from target left join public.card_prints cp on cp.id = target.card_print_id where cp.id is null) as missing_parent_count,
       (select count(*)::int from target join public.external_mappings em on em.card_print_id = target.card_print_id and em.source = target.source and em.active = true) as target_source_already_mapped_count,
       (select count(*)::int from target join public.external_mappings em on em.source = target.source and em.external_id = target.external_id and em.active = true) as existing_source_external_collision_count,
       (select count(*)::int from (
          select source, external_id
          from target
          group by source, external_id
          having count(*) > 1
        ) dup) as batch_duplicate_source_external_count`,
    [JSON.stringify(targets), [...ALLOWED_SOURCES]],
  );
  return {
    ...result.rows[0],
    target_fingerprint_sha256: sha256(stableJson(targets)),
  };
}

async function loadCollisionSamples(client, targets) {
  if (!targets.length) return [];
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         card_print_id uuid,
         source text,
         external_id text,
         set_code text,
         number text,
         number_plain text,
         card_name text
       )
     )
     select
       target.card_print_id::text as target_card_print_id,
       target.set_code as target_set_code,
       target.number as target_number,
       target.card_name as target_card_name,
       target.source,
       target.external_id,
       em.card_print_id::text as existing_card_print_id,
       owner.set_code as existing_set_code,
       owner.number as existing_number,
       owner.name as existing_card_name
     from target
     join public.external_mappings em
       on em.source = target.source
      and em.external_id = target.external_id
      and em.active = true
     join public.card_prints owner on owner.id = em.card_print_id
     order by target.source, target.external_id, target.set_code nulls last, target.number_plain nulls last
     limit 100`,
    [JSON.stringify(targets)],
  );
  return result.rows;
}

async function runRollbackDryRun(client, targets, packageFingerprint) {
  const beforeSnapshot = await captureSnapshot(client, targets);
  let insideProof = null;
  let guardBlock = null;

  try {
    await client.query('begin');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");

    const guard = await validateScope(client, targets);
    if (
      guard.target_count !== targets.length ||
      guard.unsupported_source_count !== 0 ||
      guard.distinct_target_count !== targets.length ||
      guard.distinct_source_external_count !== targets.length ||
      guard.missing_parent_count !== 0 ||
      guard.target_source_already_mapped_count !== 0 ||
      guard.existing_source_external_collision_count !== 0 ||
      guard.batch_duplicate_source_external_count !== 0
    ) {
      guardBlock = guard;
      insideProof = {
        inserted_rows: 0,
        proof: null,
        guard_blocked: true,
        guard,
      };
    } else {
      await client.query(
        `create temporary table enrich07_targets (
           card_print_id uuid not null,
           source text not null,
           external_id text not null,
           set_code text,
           number text,
           number_plain text,
           card_name text,
           primary key (card_print_id, source, external_id)
         ) on commit drop`,
      );
      await client.query(
        `insert into enrich07_targets
         select *
         from jsonb_to_recordset($1::jsonb) as t(
           card_print_id uuid,
           source text,
           external_id text,
           set_code text,
           number text,
           number_plain text,
           card_name text
         )`,
        [JSON.stringify(targets)],
      );

      const inserted = await client.query(
        `insert into public.external_mappings (card_print_id, source, external_id, meta, synced_at, active)
         select
           target.card_print_id,
           target.source,
           target.external_id,
           jsonb_build_object('source', $1::text, 'package_id', $2::text, 'payload_source', 'card_prints.external_ids'),
           now(),
           true
         from enrich07_targets target
         returning id::text, card_print_id::text, source, external_id`,
        ['card_row_enrichment_v1', PACKAGE_ID],
      );

      const proof = await client.query(
        `select
           (select count(*)::int from enrich07_targets) as target_count,
           (select count(*)::int
            from enrich07_targets target
            join public.external_mappings em
              on em.card_print_id = target.card_print_id
             and em.source = target.source
             and em.external_id = target.external_id
             and em.active = true) as matching_active_mapping_count,
           (select count(*)::int from (
              select source, external_id
              from public.external_mappings
              where active = true
              group by source, external_id
              having count(*) > 1
              limit 1
            ) dup) as duplicate_source_external_exists`,
      );

      insideProof = {
        inserted_rows: inserted.rowCount,
        proof: proof.rows[0],
      };
    }
  } finally {
    await client.query('rollback');
  }

  const afterRollbackSnapshot = await captureSnapshot(client, targets);
  return {
    before_snapshot: beforeSnapshot,
    inside_transaction_proof: insideProof,
    guard_blocked: guardBlock,
    after_rollback_snapshot: afterRollbackSnapshot,
    dry_run_status: guardBlock
      ? 'skipped_guard_blocked_rolled_back_no_durable_change'
      : beforeSnapshot.hash_sha256 === afterRollbackSnapshot.hash_sha256
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
    const candidateRows = await loadCandidates(client);
    const targets = buildTargets(candidateRows);
    const packageFingerprint = sha256(stableJson({
      package_id: PACKAGE_ID,
      allowed_sources: [...ALLOWED_SOURCES].sort(),
      targets,
    }));

    const preflight = await validateScope(client, targets);
    const execution = await runRollbackDryRun(client, targets, packageFingerprint);
    const collision_samples = preflight.existing_source_external_collision_count === 0
      ? []
      : await loadCollisionSamples(client, targets);
    const stop_findings = [];

    if (targets.length === 0) stop_findings.push('no_targets');
    if (preflight.target_count !== targets.length) stop_findings.push('preflight_target_count_mismatch');
    if (preflight.unsupported_source_count !== 0) stop_findings.push('unsupported_source_in_scope');
    if (preflight.distinct_target_count !== targets.length) stop_findings.push('duplicate_target_rows');
    if (preflight.distinct_source_external_count !== targets.length) stop_findings.push('duplicate_source_external_in_batch');
    if (preflight.missing_parent_count !== 0) stop_findings.push('missing_parent_rows');
    if (preflight.target_source_already_mapped_count !== 0) stop_findings.push('target_source_already_mapped');
    if (preflight.existing_source_external_collision_count !== 0) stop_findings.push('existing_source_external_collision');
    if (preflight.batch_duplicate_source_external_count !== 0) stop_findings.push('batch_duplicate_source_external');
    if (execution.guard_blocked) stop_findings.push('dry_run_guard_blocked');
    if (!execution.guard_blocked) {
      if (execution.dry_run_status !== 'completed_rolled_back_no_durable_change') stop_findings.push(execution.dry_run_status);
      if (execution.inside_transaction_proof?.inserted_rows !== targets.length) stop_findings.push('inserted_row_count_mismatch');
      if (execution.inside_transaction_proof?.proof?.matching_active_mapping_count !== targets.length) stop_findings.push('matching_active_mapping_count_mismatch');
      if (execution.inside_transaction_proof?.proof?.duplicate_source_external_exists !== 0) stop_findings.push('duplicate_source_external_after_insert');
    }

    const report = {
      version: 'ENRICH07_EXTERNAL_MAPPING_PAYLOAD_GUARDED_DRY_RUN_V1',
      package_id: PACKAGE_ID,
      generated_at: new Date().toISOString(),
      package_fingerprint_sha256: packageFingerprint,
      allowed_sources: [...ALLOWED_SOURCES].sort(),
      scope: {
        target_rows: targets.length,
        writes_simulated_then_rolled_back: ['external_mappings inserts'],
        forbidden: ['parent writes', 'child writes', 'identity writes', 'deletes', 'merges', 'migrations', 'image writes', 'global apply'],
        durable_db_writes_performed: false,
        migrations_created: false,
      },
      preflight,
      execution,
      collision_samples,
      by_source: countBy(targets, (row) => row.source),
      by_set_top_25: Object.fromEntries(Object.entries(countBy(targets, (row) => row.set_code)).slice(0, 25)),
      target_samples: targets.slice(0, 50),
      stop_findings,
      pass: stop_findings.length === 0,
      recommended_approval_text: stop_findings.length === 0
        ? `Approve real ${PACKAGE_ID} apply only. Fingerprint: ${packageFingerprint}. Scope: ${targets.length} active external_mappings inserts from scalar card_prints.external_ids payloads; sources ${[...ALLOWED_SOURCES].sort().join(', ')}. Dry-run proof: ${execution.before_snapshot.hash_sha256} == ${execution.after_rollback_snapshot.hash_sha256}. No parent writes. No child writes. No identity writes. No deletes. No merges. No migrations. No image writes. No global apply.`
        : null,
    };

    await writeJson(OUTPUT_JSON, report);

    const md = [
      '# ENRICH-07 External Mapping Payload Guarded Dry Run V1',
      '',
      `Package: \`${PACKAGE_ID}\``,
      '',
      '## Result',
      '',
      `- Pass: ${report.pass}`,
      `- Target rows: ${targets.length}`,
      `- Inserted inside transaction: ${execution.inside_transaction_proof?.inserted_rows ?? 0}`,
      `- Dry-run status: ${execution.dry_run_status}`,
      `- Before hash: \`${execution.before_snapshot.hash_sha256}\``,
      `- After rollback hash: \`${execution.after_rollback_snapshot.hash_sha256}\``,
      `- Package fingerprint: \`${packageFingerprint}\``,
      '',
      '## By Source',
      '',
      markdownTable(Object.entries(report.by_source).map(([source, rows]) => ({ source, rows })), [
        { label: 'source', value: (row) => row.source },
        { label: 'rows', value: (row) => row.rows },
      ]),
      '',
      '## Safety',
      '',
      '- Durable DB writes performed: false',
      '- Migrations created: false',
      '- Parent writes: false',
      '- Child writes: false',
      '- Identity writes: false',
      '- Deletes/merges: false',
      '- Image writes: false',
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
      dry_run_proof: `${execution.before_snapshot.hash_sha256} == ${execution.after_rollback_snapshot.hash_sha256}`,
      recommended_approval_text: report.recommended_approval_text,
    }, null, 2));
  } finally {
    await client.end();
  }
}

await main();
