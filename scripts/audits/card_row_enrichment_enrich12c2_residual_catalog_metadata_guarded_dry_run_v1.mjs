import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;
const execFileAsync = promisify(execFile);

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'enrich12c2_residual_catalog_metadata_guarded_dry_run_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'enrich12c2_residual_catalog_metadata_guarded_dry_run_v1.md');
const PACKAGE_ID = 'ENRICH-12C2-RESIDUAL-CATALOG-METADATA-RETRY';
const FETCH_TIMEOUT_MS = 12000;
const FETCH_CONCURRENCY = 8;

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

function namesMatch(cardName, sourceName) {
  const normalizedCardName = normalizeName(cardName);
  const normalizedSourceName = normalizeName(sourceName);
  if (normalizedCardName === normalizedSourceName) return true;
  const basicEnergy = /^basic ([a-z]+ energy)$/.exec(normalizedCardName);
  return Boolean(basicEnergy && basicEnergy[1] === normalizedSourceName);
}

function normalizeNumber(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .replace(/\d+/g, (digits) => String(Number.parseInt(digits, 10)));
}

function isBlank(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
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
    with mapping as (
      select distinct on (card_print_id)
        card_print_id,
        external_id
      from public.external_mappings
      where active = true
        and source = 'tcgdex'
      order by card_print_id, synced_at desc nulls last, id desc
    )
    select
      cp.id::text as card_print_id,
      cp.set_code,
      s.name as set_name,
      cp.number,
      cp.number_plain,
      cp.name as card_name,
      cp.printed_identity_modifier,
      mapping.external_id
    from public.card_prints cp
    join public.sets s on s.id = cp.set_id
    join mapping on mapping.card_print_id = cp.id
    where s.identity_domain_default like 'pokemon_eng%'
      and cp.rarity is null
      and cp.artist is null
      and cp.regulation_mark is null
      and cp.variants is null
      and cp.set_code is not null
      and cp.number is not null
    order by cp.set_code nulls last, cp.number_plain nulls last, cp.number nulls last, cp.name, cp.id
  `);
  return result.rows;
}

async function fetchTcgdexCard(externalId) {
  const url = `https://api.tcgdex.net/v2/en/cards/${encodeURIComponent(externalId)}`;
  const maxTimeSeconds = String(Math.max(1, Math.ceil(FETCH_TIMEOUT_MS / 1000)));
  const { stdout } = await execFileAsync('curl.exe', [
    '--ssl-no-revoke',
    '--connect-timeout',
    '5',
    '--max-time',
    maxTimeSeconds,
    '--retry',
    '3',
    '--retry-delay',
    '2',
    '--retry-all-errors',
    '-s',
    url,
  ], {
    encoding: 'utf8',
    timeout: FETCH_TIMEOUT_MS * 4,
    maxBuffer: 8 * 1024 * 1024,
  });
  if (!stdout.trim()) throw new Error('empty_response');
  return { url, card: JSON.parse(stdout) };
}

function sourceMetadata(card) {
  const variants = card?.variants && typeof card.variants === 'object' && !Array.isArray(card.variants)
    ? card.variants
    : null;
  return {
    rarity: isBlank(card?.rarity) ? null : String(card.rarity),
    artist: isBlank(card?.illustrator) ? null : String(card.illustrator),
    regulation_mark: isBlank(card?.regulationMark) ? null : String(card.regulationMark),
    variants: variants && Object.keys(variants).length > 0 ? variants : null,
  };
}

async function classifyCandidate(candidate) {
  try {
    const { url, card } = await fetchTcgdexCard(candidate.external_id);
    const sourceName = card?.name ?? null;
    const sourceNumber = card?.localId ?? null;
    const nameMatches = namesMatch(candidate.card_name, sourceName);
    const numberMatches = normalizeNumber(candidate.number) === normalizeNumber(sourceNumber);
    const metadata = sourceMetadata(card);
    const hasMetadata = !isBlank(metadata.rarity)
      || !isBlank(metadata.artist)
      || !isBlank(metadata.regulation_mark)
      || !isBlank(metadata.variants);

    if (!nameMatches || !numberMatches || !hasMetadata) {
      return {
        status: 'blocked',
        row: {
          ...candidate,
          source_url: url,
          source_card_name: sourceName,
          source_card_number: sourceNumber,
          blocked_reason: !nameMatches ? 'source_name_mismatch' : !numberMatches ? 'source_number_mismatch' : 'no_source_metadata',
        },
      };
    }

    return {
      status: 'accepted',
      row: {
        ...candidate,
        source_url: url,
        source_card_name: sourceName,
        source_card_number: sourceNumber,
        source_set_id: card?.set?.id ?? null,
        source_set_name: card?.set?.name ?? null,
        ...metadata,
      },
    };
  } catch (error) {
    return {
      status: 'blocked',
      row: {
        ...candidate,
        source_url: `https://api.tcgdex.net/v2/en/cards/${encodeURIComponent(candidate.external_id)}`,
        blocked_reason: 'source_fetch_failed',
        error_message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

async function acquireTargets(candidates) {
  const accepted = [];
  const blocked = [];
  let cursor = 0;
  const workerCount = Math.max(1, Math.min(FETCH_CONCURRENCY, candidates.length || 1));
  async function worker() {
    while (cursor < candidates.length) {
      const index = cursor;
      cursor += 1;
      const result = await classifyCandidate(candidates[index]);
      if (result.status === 'accepted') accepted.push(result.row);
      else blocked.push(result.row);
    }
  }
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  const orderKey = (row) => [row.set_code ?? '', row.number_plain ?? '', row.number ?? '', row.card_name ?? '', row.card_print_id].join('|');
  accepted.sort((a, b) => orderKey(a).localeCompare(orderKey(b)));
  blocked.sort((a, b) => orderKey(a).localeCompare(orderKey(b)));
  return { accepted, blocked };
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

function guardPassed(guard, expectedCount) {
  return guard.target_count === expectedCount
    && guard.distinct_target_count === expectedCount
    && guard.no_metadata_target_count === 0
    && guard.missing_parent_count === 0
    && guard.non_null_metadata_overwrite_count === 0
    && guard.non_english_target_count === 0
    && expectedCount > 0;
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
      insideProof = { updated_parent_rows: 0, guard_blocked: true, guard };
    } else {
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
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    const candidates = await loadCandidates(client);
    const acquisition = await acquireTargets(candidates);
    const targets = acquisition.accepted;
    const packageFingerprint = sha256(stableJson({
      package_id: PACKAGE_ID,
      targets: targets.map((row) => ({
        card_print_id: row.card_print_id,
        set_code: row.set_code,
        number: row.number,
        card_name: row.card_name,
        external_id: row.external_id,
        source_url: row.source_url,
        source_card_name: row.source_card_name,
        source_card_number: row.source_card_number,
        rarity: row.rarity,
        artist: row.artist,
        regulation_mark: row.regulation_mark,
        variants: row.variants,
      })),
    }));
    const preflight = await validateScope(client, targets);
    const execution = await runRollbackDryRun(client, targets);
    const stopFindings = [];

    if (targets.length === 0) stopFindings.push('no_targets');
    if (!guardPassed(preflight, targets.length)) stopFindings.push('preflight_guard_failed');
    if (execution.inside_transaction_proof?.guard_blocked) stopFindings.push('dry_run_guard_blocked');
    if (execution.dry_run_status !== 'completed_rolled_back_no_durable_change') stopFindings.push(execution.dry_run_status);
    if (execution.inside_transaction_proof?.updated_parent_rows !== targets.length) stopFindings.push('updated_parent_row_count_mismatch');
    if (execution.inside_transaction_proof?.proof?.matching_metadata_count !== targets.length) stopFindings.push('matching_metadata_count_mismatch');

    const report = {
      version: 'ENRICH12C2_RESIDUAL_CATALOG_METADATA_GUARDED_DRY_RUN_V1',
      package_id: PACKAGE_ID,
      generated_at: new Date().toISOString(),
      package_fingerprint_sha256: packageFingerprint,
      scope: {
        candidate_catalog_metadata_gap_rows: candidates.length,
        target_parent_rows: targets.length,
        blocked_candidate_rows: acquisition.blocked.length,
        writes_simulated_then_rolled_back: ['card_prints rarity/artist/regulation_mark/variants null-only updates'],
        durable_db_writes_performed: false,
        migrations_created: false,
        forbidden: ['non-null overwrites', 'child writes', 'identity writes', 'external mapping writes', 'species writes', 'deletes', 'merges', 'migrations', 'image writes', 'global apply'],
      },
      acquisition: {
        accepted_by_set_top_25: Object.fromEntries(Object.entries(countBy(targets, (row) => row.set_code ?? 'missing_set_code')).slice(0, 25)),
        blocked_by_reason: countBy(acquisition.blocked, (row) => row.blocked_reason),
        blocked_samples: acquisition.blocked.slice(0, 50),
      },
      preflight,
      execution,
      accepted_targets: targets,
      stop_findings: stopFindings,
      pass: stopFindings.length === 0,
      recommended_approval_text: stopFindings.length === 0
        ? `Approve real ${PACKAGE_ID} apply only. Fingerprint: ${packageFingerprint}. Scope: ${targets.length} null-only card_prints catalog metadata updates from exact active TCGdex source mappings. Dry-run proof: ${execution.before_snapshot.hash_sha256} == ${execution.after_rollback_snapshot.hash_sha256}. No non-null overwrites. No child writes. No identity writes. No external mapping writes. No species writes. No deletes. No merges. No migrations. No image writes. No global apply.`
        : null,
    };

    await writeJson(OUTPUT_JSON, report);
    const md = [
      '# ENRICH-12C2 Residual Catalog Metadata Guarded Dry Run V1',
      '',
      `- Pass: ${report.pass}`,
      `- Candidate rows: ${candidates.length}`,
      `- Target parent rows: ${targets.length}`,
      `- Blocked rows: ${acquisition.blocked.length}`,
      `- Updated inside transaction: ${execution.inside_transaction_proof?.updated_parent_rows ?? 0}`,
      `- Dry-run status: ${execution.dry_run_status}`,
      `- Before hash: \`${execution.before_snapshot.hash_sha256}\``,
      `- After rollback hash: \`${execution.after_rollback_snapshot.hash_sha256}\``,
      `- Package fingerprint: \`${packageFingerprint}\``,
      '',
      '## Accepted By Set',
      '',
      markdownTable(Object.entries(report.acquisition.accepted_by_set_top_25).map(([set_code, rows]) => ({ set_code, rows })), [
        { label: 'set_code', value: (row) => row.set_code },
        { label: 'rows', value: (row) => row.rows },
      ]),
      '',
      '## Blocked By Reason',
      '',
      markdownTable(Object.entries(report.acquisition.blocked_by_reason).map(([reason, rows]) => ({ reason, rows })), [
        { label: 'reason', value: (row) => row.reason },
        { label: 'rows', value: (row) => row.rows },
      ]),
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
      candidate_rows: candidates.length,
      target_parent_rows: targets.length,
      blocked_candidate_rows: acquisition.blocked.length,
      dry_run_proof: `${execution.before_snapshot.hash_sha256} == ${execution.after_rollback_snapshot.hash_sha256}`,
      recommended_approval_text: report.recommended_approval_text,
    }, null, 2));
  } finally {
    await client.end();
  }
}

await main();
