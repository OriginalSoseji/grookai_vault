import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const SNAPSHOT_JSON_GZ = 'docs/audits/verified_master_set_index_v1/source_snapshots/pokemontcg_api_source_snapshot_v1.json.gz';
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'enrich10_pokemontcg_snapshot_rarity_guarded_dry_run_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'enrich10_pokemontcg_snapshot_rarity_guarded_dry_run_v1.md');
const PACKAGE_ID = 'ENRICH-10-POKEMONTCG-SNAPSHOT-RARITY-BACKFILL';

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

function normalizeName(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function normalizeNumber(value) {
  return String(value ?? '').trim().toLowerCase().replace(/^0+([0-9])/, '$1');
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

function loadPokemonTcgSnapshot() {
  const raw = zlib.gunzipSync(fsSync.readFileSync(SNAPSHOT_JSON_GZ));
  const snapshot = JSON.parse(raw);
  const byId = new Map();
  for (const record of snapshot.records ?? []) {
    if (record.source_key !== 'pokemontcg_api') continue;
    if (record.evidence_type !== 'card_identity') continue;
    const id = String(record.raw_snapshot_ref ?? '').replace(/^pokemontcg_api:/, '');
    if (!id || !record.rarity) continue;
    byId.set(id, record);
  }
  return {
    snapshot,
    byId,
  };
}

async function loadCandidateParents(client) {
  const result = await client.query(`
    with english as (
      select cp.*
      from public.card_prints cp
      join public.sets s on s.id = cp.set_id
      where s.identity_domain_default like 'pokemon_eng%'
    ),
    gap as (
      select *
      from english
      where rarity is null
        and artist is null
        and regulation_mark is null
        and variants is null
    ),
    mapping as (
      select distinct on (card_print_id)
        card_print_id,
        external_id
      from public.external_mappings
      where active = true
        and source = 'pokemonapi'
      order by card_print_id, synced_at desc nulls last, id desc
    )
    select
      gap.id::text as card_print_id,
      gap.set_code,
      gap.number,
      gap.number_plain,
      gap.name as card_name,
      nullif(trim(both '"' from gap.external_ids->>'pokemonapi'), '') as payload_pokemonapi_id,
      mapping.external_id as mapping_pokemonapi_id
    from gap
    left join mapping on mapping.card_print_id = gap.id
    order by gap.set_code nulls last, gap.number_plain nulls last, gap.number nulls last, gap.name, gap.id
  `);
  return result.rows;
}

function buildTargets(candidateParents, snapshotById) {
  const rows = [];
  for (const parent of candidateParents) {
    const sourceId = parent.mapping_pokemonapi_id ?? parent.payload_pokemonapi_id;
    if (!sourceId) continue;
    const snapshot = snapshotById.get(sourceId);
    if (!snapshot?.rarity) continue;
    const sameName = normalizeName(parent.card_name) === normalizeName(snapshot.card_name);
    const sameNumber = normalizeNumber(parent.number) === normalizeNumber(snapshot.card_number);
    if (!sameName || !sameNumber) continue;
    rows.push({
      card_print_id: parent.card_print_id,
      set_code: parent.set_code,
      number: parent.number,
      number_plain: parent.number_plain,
      card_name: parent.card_name,
      source_id: sourceId,
      source_url: snapshot.source_url,
      source_set_key: snapshot.set_key,
      source_card_number: snapshot.card_number,
      source_card_name: snapshot.card_name,
      rarity: snapshot.rarity,
      match_method: parent.mapping_pokemonapi_id ? 'active_external_mapping' : 'external_ids_payload',
    });
  }
  return rows;
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
       from jsonb_to_recordset($1::jsonb) as t(card_print_id uuid, rarity text)
     )
     select
       (select count(*)::int from target) as target_count,
       (select count(distinct card_print_id)::int from target) as distinct_target_count,
       (select count(*)::int from target where nullif(rarity, '') is null) as missing_target_rarity_count,
       (select count(*)::int from target left join public.card_prints cp on cp.id = target.card_print_id where cp.id is null) as missing_parent_count,
       (select count(*)::int
        from target
        join public.card_prints cp on cp.id = target.card_print_id
        where cp.rarity is not null) as non_null_rarity_overwrite_count,
       (select count(*)::int
        from target
        join public.card_prints cp on cp.id = target.card_print_id
        where cp.artist is not null or cp.regulation_mark is not null or cp.variants is not null) as non_blank_catalog_metadata_count,
       (select count(*)::int
        from target
        join public.card_prints cp on cp.id = target.card_print_id
        join public.sets s on s.id = cp.set_id
        where s.identity_domain_default not like 'pokemon_eng%') as non_english_target_count`,
    [JSON.stringify(targets.map((row) => ({ card_print_id: row.card_print_id, rarity: row.rarity })))],
  );
  return {
    ...result.rows[0],
    target_fingerprint_sha256: sha256(stableJson(targets)),
  };
}

function guardPassed(guard, expectedCount) {
  return guard.target_count === expectedCount
    && guard.distinct_target_count === expectedCount
    && guard.missing_target_rarity_count === 0
    && guard.missing_parent_count === 0
    && guard.non_null_rarity_overwrite_count === 0
    && guard.non_blank_catalog_metadata_count === 0
    && guard.non_english_target_count === 0;
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
        updated_parent_rows: 0,
        guard_blocked: true,
        guard,
      };
    } else {
      await client.query(
        `create temporary table enrich10_targets (
           card_print_id uuid primary key,
           rarity text not null,
           source_url text not null,
           source_id text not null
         ) on commit drop`,
      );
      await client.query(
        `insert into enrich10_targets
         select card_print_id, rarity, source_url, source_id
         from jsonb_to_recordset($1::jsonb) as t(card_print_id uuid, rarity text, source_url text, source_id text)`,
        [JSON.stringify(targets.map((row) => ({
          card_print_id: row.card_print_id,
          rarity: row.rarity,
          source_url: row.source_url,
          source_id: row.source_id,
        })))],
      );

      const updated = await client.query(
        `update public.card_prints cp
         set
           rarity = target.rarity,
           updated_at = now()
         from enrich10_targets target
         where cp.id = target.card_print_id
           and cp.rarity is null
           and cp.artist is null
           and cp.regulation_mark is null
           and cp.variants is null
         returning cp.id::text as card_print_id, cp.set_code, cp.number, cp.name as card_name, cp.rarity`,
      );

      const proof = await client.query(
        `select
           (select count(*)::int from enrich10_targets) as target_count,
           (select count(*)::int
            from enrich10_targets target
            join public.card_prints cp on cp.id = target.card_print_id
            where cp.rarity = target.rarity) as matching_rarity_count,
           (select count(*)::int
            from enrich10_targets target
            join public.card_prints cp on cp.id = target.card_print_id
            where cp.artist is not null or cp.regulation_mark is not null or cp.variants is not null) as unexpected_metadata_write_count`,
      );
      insideProof = {
        updated_parent_rows: updated.rowCount,
        updated_samples: updated.rows.slice(0, 25),
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

  const { snapshot, byId } = loadPokemonTcgSnapshot();
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    const candidateParents = await loadCandidateParents(client);
    const targets = buildTargets(candidateParents, byId);
    const packageFingerprint = sha256(stableJson({
      package_id: PACKAGE_ID,
      snapshot_file: SNAPSHOT_JSON_GZ,
      snapshot_generated_at: snapshot.generated_at,
      targets,
    }));
    const preflight = await validateScope(client, targets);
    const execution = await runRollbackDryRun(client, targets);
    const stopFindings = [];

    if (targets.length === 0) stopFindings.push('no_targets');
    if (!guardPassed(preflight, targets.length)) stopFindings.push('preflight_guard_failed');
    if (execution.inside_transaction_proof?.guard_blocked) stopFindings.push('dry_run_guard_blocked');
    if (execution.dry_run_status !== 'completed_rolled_back_no_durable_change') stopFindings.push(execution.dry_run_status);
    if (execution.inside_transaction_proof?.updated_parent_rows !== targets.length) stopFindings.push('updated_parent_row_count_mismatch');
    if (execution.inside_transaction_proof?.proof?.matching_rarity_count !== targets.length) stopFindings.push('matching_rarity_count_mismatch');
    if (execution.inside_transaction_proof?.proof?.unexpected_metadata_write_count !== 0) stopFindings.push('unexpected_metadata_write_count');

    const report = {
      version: 'ENRICH10_POKEMONTCG_SNAPSHOT_RARITY_GUARDED_DRY_RUN_V1',
      package_id: PACKAGE_ID,
      generated_at: new Date().toISOString(),
      package_fingerprint_sha256: packageFingerprint,
      source_snapshot: {
        file: SNAPSHOT_JSON_GZ,
        generated_at: snapshot.generated_at,
        records: snapshot.summary?.records ?? null,
      },
      scope: {
        candidate_catalog_metadata_gap_rows: candidateParents.length,
        target_parent_rows: targets.length,
        writes_simulated_then_rolled_back: ['card_prints.rarity null-only updates'],
        durable_db_writes_performed: false,
        migrations_created: false,
        forbidden: ['non-null overwrites', 'artist writes', 'regulation_mark writes', 'variants writes', 'child writes', 'identity writes', 'external mapping writes', 'species writes', 'deletes', 'merges', 'migrations', 'image writes', 'global apply'],
      },
      preflight,
      execution,
      by_set: countBy(targets, (row) => row.set_code ?? 'missing_set_code'),
      target_samples: targets.slice(0, 50),
      stop_findings: stopFindings,
      pass: stopFindings.length === 0,
      recommended_approval_text: stopFindings.length === 0
        ? `Approve real ${PACKAGE_ID} apply only. Fingerprint: ${packageFingerprint}. Scope: ${targets.length} null-only card_prints.rarity updates from preserved PokemonTCG snapshot exact source IDs. Dry-run proof: ${execution.before_snapshot.hash_sha256} == ${execution.after_rollback_snapshot.hash_sha256}. No non-null overwrites. No artist writes. No regulation_mark writes. No variants writes. No child writes. No identity writes. No external mapping writes. No species writes. No deletes. No merges. No migrations. No image writes. No global apply.`
        : null,
    };

    await writeJson(OUTPUT_JSON, report);

    const md = [
      '# ENRICH-10 PokemonTCG Snapshot Rarity Guarded Dry Run V1',
      '',
      `Package: \`${PACKAGE_ID}\``,
      '',
      '## Result',
      '',
      `- Pass: ${report.pass}`,
      `- Candidate catalog metadata gap rows: ${candidateParents.length}`,
      `- Target parent rows: ${targets.length}`,
      `- Updated inside transaction: ${execution.inside_transaction_proof?.updated_parent_rows ?? 0}`,
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
      '- Only null `card_prints.rarity` updates were simulated.',
      '- No non-null overwrites, artist writes, regulation mark writes, variant writes, child writes, identity writes, mapping writes, species writes, deletes, merges, or image writes were performed.',
      '',
      '## By Set',
      '',
      markdownTable(Object.entries(report.by_set).map(([set_code, rows]) => ({ set_code, rows })), [
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
      dry_run_proof: `${execution.before_snapshot.hash_sha256} == ${execution.after_rollback_snapshot.hash_sha256}`,
      recommended_approval_text: report.recommended_approval_text,
    }, null, 2));
  } finally {
    await client.end();
  }
}

await main();
