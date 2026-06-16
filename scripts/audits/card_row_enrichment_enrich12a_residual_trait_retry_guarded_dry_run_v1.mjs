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
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'enrich12a_residual_trait_retry_guarded_dry_run_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'enrich12a_residual_trait_retry_guarded_dry_run_v1.md');
const PACKAGE_ID = 'ENRICH-12A-RESIDUAL-SOURCE-MAPPED-TRAIT-RETRY';
const FETCH_TIMEOUT_MS = 12000;
const FETCH_CONCURRENCY = 4;

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

function sanitizeErrorMessage(value) {
  const apiKey = String(process.env.POKEMONAPI_API_KEY ?? '').trim();
  let message = String(value ?? '');
  if (apiKey) message = message.replaceAll(apiKey, '[REDACTED_POKEMONAPI_API_KEY]');
  return message.replace(/X-Api-Key:\s+[^\s]+/gi, 'X-Api-Key: [REDACTED]');
}

async function loadCandidates(client) {
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
    gaps as (
      select cp.*
      from english cp
      left join trait_counts tc on tc.card_print_id = cp.id
      where coalesce(tc.trait_count, 0) = 0
        and cp.set_code is not null
        and cp.number is not null
    ),
    mapping as (
      select distinct on (card_print_id, source)
        card_print_id,
        source,
        external_id
      from public.external_mappings
      where active = true
        and source in ('pokemonapi', 'tcgdex')
      order by card_print_id, source, synced_at desc nulls last, id desc
    ),
    ranked as (
      select
        gaps.id::text as card_print_id,
        gaps.set_code,
        gaps.number,
        gaps.number_plain,
        gaps.name as card_name,
        gaps.printed_identity_modifier,
        mapping.source,
        mapping.external_id,
        row_number() over (
          partition by gaps.id
          order by case mapping.source when 'pokemonapi' then 1 when 'tcgdex' then 2 else 9 end
        ) as rn
      from gaps
      join mapping on mapping.card_print_id = gaps.id
      where nullif(mapping.external_id, '') is not null
    )
    select *
    from ranked
    where rn = 1
    order by set_code nulls last, number_plain nulls last, number nulls last, card_name, card_print_id
  `);
  return result.rows;
}

function sourceUrl(source, externalId) {
  if (source === 'pokemonapi') return `https://api.pokemontcg.io/v2/cards/${encodeURIComponent(externalId)}`;
  if (source === 'tcgdex') return `https://api.tcgdex.net/v2/en/cards/${encodeURIComponent(externalId)}`;
  return null;
}

async function fetchJson(url) {
  const maxTimeSeconds = String(Math.max(1, Math.ceil(FETCH_TIMEOUT_MS / 1000)));
  const args = [
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
  ];
  const pokemonApiKey = String(process.env.POKEMONAPI_API_KEY ?? '').trim();
  if (url.includes('api.pokemontcg.io') && pokemonApiKey) args.push('-H', `X-Api-Key: ${pokemonApiKey}`);
  args.push(url);
  const { stdout } = await execFileAsync('curl.exe', args, {
    encoding: 'utf8',
    timeout: FETCH_TIMEOUT_MS * 4,
    maxBuffer: 8 * 1024 * 1024,
  });
  if (!stdout.trim()) throw new Error('empty_response');
  return JSON.parse(stdout);
}

function sourceCardPayload(source, response) {
  return source === 'pokemonapi' ? response?.data ?? null : response ?? null;
}

function sourceCardNumber(source, card) {
  return source === 'tcgdex' ? card?.localId ?? null : card?.number ?? null;
}

function cardTypes(card) {
  return Array.isArray(card?.types) ? card.types.filter(Boolean).map(String) : [];
}

function cardSubtypes(source, card) {
  if (source === 'pokemonapi') return Array.isArray(card?.subtypes) ? card.subtypes.filter(Boolean).map(String) : [];
  return [card?.stage].filter(Boolean).map(String);
}

function cardSupertype(source, card) {
  if (source === 'pokemonapi') return card?.supertype ?? null;
  if (card?.category === 'Pokemon') return 'Pokemon';
  return card?.category ?? null;
}

function cardCategory(source, card) {
  if (source === 'pokemonapi') return cardSubtypes(source, card)[0] ?? null;
  return card?.stage ?? card?.category ?? null;
}

function cardHp(card) {
  if (card?.hp === null || card?.hp === undefined || card?.hp === '') return null;
  const parsed = Number.parseInt(String(card.hp), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function nationalDex(source, card) {
  const values = source === 'pokemonapi' ? card?.nationalPokedexNumbers : card?.dexId;
  if (!Array.isArray(values) || values.length === 0) return null;
  const parsed = Number.parseInt(String(values[0]), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function legalities(source, card) {
  if (source === 'pokemonapi') {
    return Object.entries(card?.legalities ?? {})
      .filter(([format, value]) => ['standard', 'expanded'].includes(format) && String(value).toLowerCase() === 'legal')
      .map(([format]) => format);
  }
  return Object.entries(card?.legal ?? {})
    .filter(([format, value]) => ['standard', 'expanded'].includes(format) && value === true)
    .map(([format]) => format);
}

function buildTraitRows(target, card) {
  const source = target.source;
  const traits = [];
  const types = cardTypes(card);
  const supertype = cardSupertype(source, card);
  const subtypes = cardSubtypes(source, card);
  const dex = nationalDex(source, card);
  const hp = cardHp(card);
  const rarity = card?.rarity ?? null;
  const category = cardCategory(source, card);

  traits.push({
    card_print_id: target.card_print_id,
    trait_type: 'pokemon:stats',
    trait_value: source,
    source,
    confidence: null,
    hp,
    national_dex: dex,
    types,
    rarity,
    supertype,
    card_category: category,
    legacy_rarity: source === 'pokemonapi' ? rarity : null,
  });

  for (const type of types) traits.push(emptyTrait(target.card_print_id, 'pokemon:type', type, source));
  if (supertype) traits.push(emptyTrait(target.card_print_id, 'pokemon:supertype', supertype, source));
  for (const subtype of subtypes) traits.push(emptyTrait(target.card_print_id, 'pokemon:subtype', subtype, source));
  if (dex !== null) {
    traits.push({
      card_print_id: target.card_print_id,
      trait_type: 'pokemon:national_dex',
      trait_value: String(dex),
      source,
      confidence: null,
      hp,
      national_dex: dex,
      types,
      rarity,
      supertype,
      card_category: category,
      legacy_rarity: source === 'pokemonapi' ? rarity : null,
    });
  }
  for (const legal of legalities(source, card)) traits.push(emptyTrait(target.card_print_id, 'pokemon:legal', legal, source));
  return traits;
}

function emptyTrait(cardPrintId, traitType, traitValue, source) {
  return {
    card_print_id: cardPrintId,
    trait_type: traitType,
    trait_value: traitValue,
    source,
    confidence: null,
    hp: null,
    national_dex: null,
    types: null,
    rarity: null,
    supertype: null,
    card_category: null,
    legacy_rarity: null,
  };
}

async function classifyCandidate(candidate) {
  const url = sourceUrl(candidate.source, candidate.external_id);
  try {
    const response = await fetchJson(url);
    const card = sourceCardPayload(candidate.source, response);
    if (!card) return { status: 'blocked', row: { ...candidate, source_url: url, blocked_reason: 'missing_card_payload' } };

    const sourceName = card?.name ?? null;
    const sourceNumber = sourceCardNumber(candidate.source, card);
    const nameMatches = namesMatch(candidate.card_name, sourceName);
    const numberMatches = normalizeNumber(candidate.number) === normalizeNumber(sourceNumber);
    const traitRows = buildTraitRows(candidate, card);
    if (!nameMatches || !numberMatches || traitRows.length === 0) {
      return {
        status: 'blocked',
        row: {
          ...candidate,
          source_url: url,
          source_card_name: sourceName,
          source_card_number: sourceNumber,
          blocked_reason: !nameMatches ? 'source_name_mismatch' : !numberMatches ? 'source_number_mismatch' : 'no_trait_rows',
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
        trait_rows: traitRows,
        trait_row_count: traitRows.length,
      },
    };
  } catch (error) {
    return {
      status: 'blocked',
      row: {
        ...candidate,
        source_url: url,
        blocked_reason: 'source_fetch_failed',
        error_message: sanitizeErrorMessage(error instanceof Error ? error.message : String(error)),
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

function flattenedTraitRows(accepted) {
  return accepted.flatMap((row) => row.trait_rows ?? []);
}

async function validateScope(client, accepted) {
  const traitRows = flattenedTraitRows(accepted);
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
          select card_print_id, trait_type, trait_value, source, count(*)::int
          from traits
          group by card_print_id, trait_type, trait_value, source
          having count(*) > 1
        ) duplicates) as duplicate_trait_identity_count,
       (select count(*)::int
        from traits
        where nullif(trait_type, '') is null
           or nullif(trait_value, '') is null
           or source not in ('pokemonapi', 'tcgdex')) as invalid_trait_shape_count`,
    [
      JSON.stringify(accepted.map((row) => ({ card_print_id: row.card_print_id }))),
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

async function captureSnapshot(client, accepted) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(card_print_id uuid)
     )
     select cpt.card_print_id::text, cpt.trait_type, cpt.trait_value, cpt.source, cpt.hp, cpt.national_dex, cpt.types, cpt.rarity, cpt.supertype, cpt.card_category, cpt.legacy_rarity
     from target
     join public.card_print_traits cpt on cpt.card_print_id = target.card_print_id
     order by cpt.card_print_id, cpt.trait_type, cpt.trait_value, cpt.source`,
    [JSON.stringify(accepted.map((row) => ({ card_print_id: row.card_print_id })))],
  );
  return {
    captured_at: new Date().toISOString(),
    rows: result.rows,
    hash_sha256: sha256(stableJson(result.rows)),
    row_count: result.rows.length,
  };
}

function guardPassed(guard, acceptedCount, traitCount) {
  return guard.target_count === acceptedCount
    && guard.distinct_target_count === acceptedCount
    && guard.missing_parent_count === 0
    && guard.non_english_target_count === 0
    && guard.target_already_has_traits_count === 0
    && guard.projected_trait_insert_rows === traitCount
    && guard.duplicate_trait_identity_count === 0
    && guard.invalid_trait_shape_count === 0
    && traitCount > 0;
}

async function runRollbackDryRun(client, accepted) {
  const traitRows = flattenedTraitRows(accepted);
  const beforeSnapshot = await captureSnapshot(client, accepted);
  let insideProof = null;
  try {
    await client.query('begin');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");
    const guard = await validateScope(client, accepted);
    if (!guardPassed(guard, accepted.length, traitRows.length)) {
      insideProof = { inserted_trait_rows: 0, guard_blocked: true, guard };
    } else {
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
         select card_print_id, trait_type, trait_value, source, confidence, hp, national_dex, types, rarity, supertype, card_category, legacy_rarity
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
        `insert into public.card_print_traits (card_print_id, trait_type, trait_value, source, confidence, hp, national_dex, types, rarity, supertype, card_category, legacy_rarity)
         select card_print_id, trait_type, trait_value, source, confidence, hp, national_dex, types, rarity, supertype, card_category, legacy_rarity
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
      insideProof = { inserted_trait_rows: inserted.rowCount, inserted_samples: inserted.rows.slice(0, 25), proof: proof.rows[0], guard };
    }
  } finally {
    await client.query('rollback');
  }
  const afterRollbackSnapshot = await captureSnapshot(client, accepted);
  return {
    before_snapshot: beforeSnapshot,
    inside_transaction_proof: insideProof,
    after_rollback_snapshot: afterRollbackSnapshot,
    dry_run_status: beforeSnapshot.hash_sha256 === afterRollbackSnapshot.hash_sha256 ? 'completed_rolled_back_no_durable_change' : 'failed_rollback_hash_mismatch',
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
    const accepted = acquisition.accepted;
    const blocked = acquisition.blocked;
    const traitRows = flattenedTraitRows(accepted);
    const packageFingerprint = sha256(stableJson({
      package_id: PACKAGE_ID,
      targets: accepted.map((row) => ({
        card_print_id: row.card_print_id,
        set_code: row.set_code,
        number: row.number,
        card_name: row.card_name,
        source: row.source,
        external_id: row.external_id,
        source_url: row.source_url,
        source_card_name: row.source_card_name,
        source_card_number: row.source_card_number,
        trait_rows: row.trait_rows,
      })),
    }));
    const preflight = await validateScope(client, accepted);
    const execution = await runRollbackDryRun(client, accepted);
    const stopFindings = [];
    if (accepted.length === 0) stopFindings.push('no_accepted_targets');
    if (!guardPassed(preflight, accepted.length, traitRows.length)) stopFindings.push('preflight_guard_failed');
    if (execution.inside_transaction_proof?.guard_blocked) stopFindings.push('dry_run_guard_blocked');
    if (execution.dry_run_status !== 'completed_rolled_back_no_durable_change') stopFindings.push(execution.dry_run_status);
    if (execution.inside_transaction_proof?.inserted_trait_rows !== traitRows.length) stopFindings.push('inserted_trait_row_count_mismatch');
    if (execution.inside_transaction_proof?.proof?.inserted_trait_rows !== traitRows.length) stopFindings.push('proof_trait_row_count_mismatch');

    const report = {
      version: 'ENRICH12A_RESIDUAL_TRAIT_RETRY_GUARDED_DRY_RUN_V1',
      package_id: PACKAGE_ID,
      generated_at: new Date().toISOString(),
      package_fingerprint_sha256: packageFingerprint,
      scope: {
        source_candidates_examined: candidates.length,
        target_parent_rows: accepted.length,
        blocked_candidate_rows: blocked.length,
        projected_trait_insert_rows: traitRows.length,
        writes_simulated_then_rolled_back: ['card_print_traits inserts'],
        durable_db_writes_performed: false,
        migrations_created: false,
        forbidden: ['card_prints writes', 'card_printings writes', 'card_print_identity writes', 'external_mappings writes', 'card_print_species writes', 'deletes', 'merges', 'migrations', 'image writes', 'global apply'],
      },
      acquisition: {
        candidates_by_source: countBy(candidates, (row) => row.source),
        accepted_by_source: countBy(accepted, (row) => row.source),
        blocked_by_reason: countBy(blocked, (row) => row.blocked_reason),
        blocked_samples: blocked.slice(0, 50),
      },
      preflight,
      execution,
      accepted_targets: accepted.map((row) => ({
        card_print_id: row.card_print_id,
        set_code: row.set_code,
        number: row.number,
        number_plain: row.number_plain,
        card_name: row.card_name,
        printed_identity_modifier: row.printed_identity_modifier,
        source: row.source,
        external_id: row.external_id,
        source_url: row.source_url,
        source_card_name: row.source_card_name,
        source_card_number: row.source_card_number,
        trait_row_count: row.trait_row_count,
        trait_rows: row.trait_rows,
      })),
      stop_findings: stopFindings,
      pass: stopFindings.length === 0,
      recommended_approval_text: stopFindings.length === 0
        ? `Approve real ${PACKAGE_ID} apply only. Fingerprint: ${packageFingerprint}. Scope: ${accepted.length} parent rows, ${traitRows.length} card_print_traits inserts from residual exact active source mappings. Dry-run proof: ${execution.before_snapshot.hash_sha256} == ${execution.after_rollback_snapshot.hash_sha256}. No parent writes. No child writes. No identity writes. No external mapping writes. No species writes. No deletes. No merges. No migrations. No image writes. No global apply.`
        : null,
    };
    await writeJson(OUTPUT_JSON, report);
    const md = [
      '# ENRICH-12A Residual Source-Mapped Trait Retry Guarded Dry Run V1',
      '',
      `- Pass: ${report.pass}`,
      `- Candidates examined: ${candidates.length}`,
      `- Accepted parent rows: ${accepted.length}`,
      `- Blocked candidate rows: ${blocked.length}`,
      `- Projected trait inserts: ${traitRows.length}`,
      `- Dry-run status: ${execution.dry_run_status}`,
      `- Before hash: \`${execution.before_snapshot.hash_sha256}\``,
      `- After rollback hash: \`${execution.after_rollback_snapshot.hash_sha256}\``,
      `- Package fingerprint: \`${packageFingerprint}\``,
      '',
      '## Accepted By Source',
      '',
      markdownTable(Object.entries(report.acquisition.accepted_by_source).map(([source, rows]) => ({ source, rows })), [
        { label: 'source', value: (row) => row.source },
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
      source_candidates_examined: candidates.length,
      accepted_parent_rows: accepted.length,
      blocked_candidate_rows: blocked.length,
      projected_trait_insert_rows: traitRows.length,
      dry_run_proof: `${execution.before_snapshot.hash_sha256} == ${execution.after_rollback_snapshot.hash_sha256}`,
      recommended_approval_text: report.recommended_approval_text,
    }, null, 2));
  } finally {
    await client.end();
  }
}

await main();
