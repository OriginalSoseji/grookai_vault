import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';
import dotenv from 'dotenv';
import {
  buildSpeciesLookup,
  classifyCardSpecies,
  loadSpeciesSeed,
} from '../../backend/grookai_dex/grookai_dex_common_v1.mjs';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const DRY_RUN_JSON = path.join(OUTPUT_DIR, 'enrich08a_species_name_rule_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'enrich08a_species_name_rule_real_apply_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'enrich08a_species_name_rule_real_apply_v1.md');

const PACKAGE_ID = 'ENRICH-08A-SPECIES-NAME-RULE-BACKFILL';
const SOURCE = 'grookai_dex_name_rule_v1';
const EXPECTED_FINGERPRINT = '28ae8be4b409b41ffe65d0b609ebbd29d8a6376779dcd7198f63911545c40e82';
const EXPECTED_DRY_RUN_PROOF = '4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945';
const EXPECTED_TARGET_ROWS = 76;
const EXPECTED_TARGET_PARENTS = 76;
const CHUNK_SIZE = 500;
const APPROVAL_TEXT = 'Approve real ENRICH-08A-SPECIES-NAME-RULE-BACKFILL apply only. Fingerprint: 28ae8be4b409b41ffe65d0b609ebbd29d8a6376779dcd7198f63911545c40e82. Scope: 76 card_print_species inserts across 76 English physical parents using grookai_dex_name_rule_v1. Dry-run proof: 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945 == 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945. No parent writes. No child writes. No identity writes. No mapping writes. No deletes. No merges. No migrations. No image writes. No global apply.';

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

function chunk(values, size) {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) chunks.push(values.slice(index, index + size));
  return chunks;
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

async function loadMissingSpeciesCards(client) {
  const result = await client.query(`
    with active_species as (
      select card_print_id, count(*) filter (where active = true)::int as active_species_count
      from public.card_print_species
      group by card_print_id
    )
    select
      cp.id::text as id,
      cp.gv_id,
      cp.name,
      cp.set_id::text as set_id,
      cp.set_code,
      cp.number,
      cp.number_plain,
      cp.rarity,
      cp.variant_key
    from public.card_prints cp
    join public.sets s on s.id = cp.set_id
    left join active_species species on species.card_print_id = cp.id
    where s.identity_domain_default like 'pokemon_eng%'
      and coalesce(species.active_species_count, 0) = 0
    order by cp.set_code nulls last, cp.number_plain nulls last, cp.number nulls last, cp.name
  `);
  return result.rows;
}

async function loadTraits(client, cardPrintIds) {
  const traits = new Map();
  for (const ids of chunk(cardPrintIds, CHUNK_SIZE)) {
    const result = await client.query(
      `select card_print_id::text, national_dex, supertype, card_category, types
       from public.card_print_traits
       where card_print_id = any($1::uuid[])`,
      [ids],
    );
    for (const row of result.rows) traits.set(row.card_print_id, row);
  }
  return traits;
}

async function loadSpeciesIdBySlug(client) {
  const result = await client.query('select id::text, slug from public.pokemon_species where active = true');
  return new Map(result.rows.map((row) => [row.slug, row.id]));
}

function buildTargets(cards, traitByCardPrintId, speciesSeed) {
  const tokenEntries = buildSpeciesLookup(speciesSeed.species);
  const targets = [];

  for (const card of cards) {
    const classification = classifyCardSpecies(card, tokenEntries, traitByCardPrintId);
    for (const mapping of classification.mappings) {
      if (!mapping.counts_for_completion) continue;
      targets.push({
        card_print_id: mapping.card_print_id,
        species_slug: mapping.species_slug,
        role: mapping.role,
        counts_for_completion: mapping.counts_for_completion,
        source: mapping.source,
        confidence: mapping.confidence,
        evidence: mapping.evidence,
        set_code: card.set_code,
        number: card.number,
        card_name: card.name,
      });
    }
  }

  const seen = new Set();
  return targets.filter((row) => {
    const key = `${row.card_print_id}|${row.species_slug}|${row.role}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function captureSnapshot(client, targets) {
  const result = await client.query(
    `with target as (
       select distinct card_print_id
       from jsonb_to_recordset($1::jsonb) as t(card_print_id uuid)
     )
     select
       cps.id::text as species_mapping_id,
       cps.card_print_id::text as card_print_id,
       ps.slug as species_slug,
       cps.role,
       cps.counts_for_completion,
       cps.source,
       cps.active
     from target
     join public.card_print_species cps on cps.card_print_id = target.card_print_id
     join public.pokemon_species ps on ps.id = cps.species_id
     order by cps.card_print_id, ps.slug, cps.role, cps.id`,
    [JSON.stringify(targets.map((row) => ({ card_print_id: row.card_print_id })))],
  );
  return {
    captured_at: new Date().toISOString(),
    rows: result.rows,
    hash_sha256: sha256(stableJson(result.rows)),
    row_count: result.rows.length,
  };
}

async function validateScope(client, targets, speciesIdBySlug) {
  const targetRows = targets.map((row) => ({ ...row, species_id: speciesIdBySlug.get(row.species_slug) ?? null }));
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         card_print_id uuid,
         species_slug text,
         species_id uuid,
         role text
       )
     )
     select
       (select count(*)::int from target) as target_count,
       (select count(distinct card_print_id)::int from target) as target_parent_count,
       (select count(distinct card_print_id::text || '|' || species_slug || '|' || role)::int from target) as distinct_target_count,
       (select count(*)::int from target where species_id is null) as missing_species_id_count,
       (select count(*)::int from target left join public.card_prints cp on cp.id = target.card_print_id where cp.id is null) as missing_parent_count,
       (select count(*)::int
        from target
        join public.card_print_species cps
          on cps.card_print_id = target.card_print_id
         and cps.species_id = target.species_id
         and cps.role = target.role
         and cps.active = true) as existing_active_mapping_count,
       (select count(*)::int
        from target
        join public.card_print_species cps
          on cps.card_print_id = target.card_print_id
         and cps.active = true) as parents_with_existing_active_species_count`,
    [JSON.stringify(targetRows)],
  );
  return {
    ...result.rows[0],
    target_fingerprint_sha256: sha256(stableJson(targetRows)),
  };
}

function guardPassed(guard, targetCount) {
  return guard.target_count === targetCount
    && guard.distinct_target_count === targetCount
    && guard.missing_species_id_count === 0
    && guard.missing_parent_count === 0
    && guard.existing_active_mapping_count === 0
    && guard.parents_with_existing_active_species_count === 0;
}

function validateDryRun(dryRun, packageFingerprint) {
  const findings = [];
  if (dryRun.package_id !== PACKAGE_ID) findings.push('dry_run_package_id_mismatch');
  if (dryRun.pass !== true) findings.push('dry_run_not_passed');
  if (dryRun.package_fingerprint_sha256 !== packageFingerprint) findings.push('package_fingerprint_mismatch');
  if (dryRun.package_fingerprint_sha256 !== EXPECTED_FINGERPRINT) findings.push('expected_fingerprint_mismatch');
  if (dryRun.scope?.target_species_mapping_inserts !== EXPECTED_TARGET_ROWS) findings.push('target_rows_mismatch');
  if (dryRun.scope?.target_parent_rows !== EXPECTED_TARGET_PARENTS) findings.push('target_parent_rows_mismatch');
  if (dryRun.execution?.before_snapshot?.hash_sha256 !== EXPECTED_DRY_RUN_PROOF) findings.push('dry_run_before_hash_mismatch');
  if (dryRun.execution?.after_rollback_snapshot?.hash_sha256 !== EXPECTED_DRY_RUN_PROOF) findings.push('dry_run_after_hash_mismatch');
  if (dryRun.execution?.dry_run_status !== 'completed_rolled_back_no_durable_change') findings.push('dry_run_status_mismatch');
  if (dryRun.recommended_approval_text !== APPROVAL_TEXT) findings.push('approval_text_mismatch');
  if (dryRun.execution?.inside_transaction_proof?.inserted_species_rows !== EXPECTED_TARGET_ROWS) findings.push('dry_run_insert_count_mismatch');
  return findings;
}

async function applyPackage(client, targets, speciesIdBySlug) {
  const beforeSnapshot = await captureSnapshot(client, targets);
  let insertProof = null;

  try {
    await client.query('begin');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");

    const guard = await validateScope(client, targets, speciesIdBySlug);
    if (!guardPassed(guard, targets.length)) {
      throw new Error(`preflight guard failed: ${JSON.stringify(guard)}`);
    }

    const targetRows = targets.map((row) => ({ ...row, species_id: speciesIdBySlug.get(row.species_slug) }));
    await client.query(
      `create temporary table enrich08a_targets (
         card_print_id uuid not null,
         species_id uuid not null,
         species_slug text not null,
         role text not null,
         counts_for_completion boolean not null,
         source text not null,
         confidence numeric,
         evidence jsonb not null,
         primary key (card_print_id, species_id, role)
       ) on commit drop`,
    );
    await client.query(
      `insert into enrich08a_targets
       select card_print_id, species_id, species_slug, role, counts_for_completion, source, confidence, evidence
       from jsonb_to_recordset($1::jsonb) as t(
         card_print_id uuid,
         species_id uuid,
         species_slug text,
         role text,
         counts_for_completion boolean,
         source text,
         confidence numeric,
         evidence jsonb
       )`,
      [JSON.stringify(targetRows)],
    );

    const inserted = await client.query(
      `insert into public.card_print_species (
         card_print_id,
         species_id,
         role,
         counts_for_completion,
         source,
         confidence,
         evidence,
         active
       )
       select card_print_id, species_id, role, counts_for_completion, source, confidence, evidence, true
       from enrich08a_targets
       returning id::text, card_print_id::text, species_id::text, role`,
    );

    const proof = await client.query(
      `select
         (select count(*)::int from enrich08a_targets) as target_count,
         (select count(distinct card_print_id)::int from enrich08a_targets) as target_parent_count,
         (select count(*)::int
          from enrich08a_targets target
          join public.card_print_species cps
            on cps.card_print_id = target.card_print_id
           and cps.species_id = target.species_id
           and cps.role = target.role
           and cps.active = true) as matching_active_species_count`,
    );

    insertProof = {
      inserted_species_rows: inserted.rowCount,
      proof: proof.rows[0],
      inserted_samples: inserted.rows.slice(0, 25),
    };

    if (insertProof.inserted_species_rows !== targets.length) throw new Error('inserted_species_row_count_mismatch');
    if (insertProof.proof.matching_active_species_count !== targets.length) throw new Error('matching_active_species_count_mismatch');

    await client.query('commit');
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  }

  const afterSnapshot = await captureSnapshot(client, targets);
  return {
    before_snapshot: beforeSnapshot,
    insert_proof: insertProof,
    after_snapshot: afterSnapshot,
  };
}

async function main() {
  const dbUrl = connectionString();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for real apply.');

  const dryRun = await readJson(DRY_RUN_JSON);
  const speciesSeed = await loadSpeciesSeed();
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    const cards = await loadMissingSpeciesCards(client);
    const traits = await loadTraits(client, cards.map((row) => row.id));
    const speciesIdBySlug = await loadSpeciesIdBySlug(client);
    const targets = buildTargets(cards, traits, speciesSeed);
    const packageFingerprint = sha256(stableJson({
      package_id: PACKAGE_ID,
      source: SOURCE,
      targets,
    }));

    const dryRunFindings = validateDryRun(dryRun, packageFingerprint);
    if (dryRunFindings.length > 0) {
      throw new Error(`DRY_RUN_VALIDATION_FAILED:${dryRunFindings.join(',')}`);
    }

    const execution = await applyPackage(client, targets, speciesIdBySlug);
    const stopFindings = [];

    if (targets.length !== EXPECTED_TARGET_ROWS) stopFindings.push(`target_count_drift:${targets.length}`);
    if (new Set(targets.map((row) => row.card_print_id)).size !== EXPECTED_TARGET_PARENTS) stopFindings.push('target_parent_count_drift');
    if (execution.before_snapshot.row_count !== 0) stopFindings.push('before_species_rows_not_zero');
    if (execution.insert_proof.inserted_species_rows !== targets.length) stopFindings.push('inserted_species_rows_mismatch');
    if (execution.insert_proof.proof.matching_active_species_count !== targets.length) stopFindings.push('matching_active_species_count_mismatch');
    if (execution.after_snapshot.row_count !== targets.length) stopFindings.push('after_species_rows_mismatch');

    const report = {
      version: 'ENRICH08A_SPECIES_NAME_RULE_REAL_APPLY_V1',
      package_id: PACKAGE_ID,
      generated_at: new Date().toISOString(),
      approved_text: APPROVAL_TEXT,
      package_fingerprint_sha256: packageFingerprint,
      dry_run_proof: `${EXPECTED_DRY_RUN_PROOF} == ${EXPECTED_DRY_RUN_PROOF}`,
      scope: {
        target_species_mapping_inserts: targets.length,
        target_parent_rows: new Set(targets.map((row) => row.card_print_id)).size,
        writes_performed: ['card_print_species inserts'],
        durable_db_writes_performed: true,
        parent_writes: false,
        child_writes: false,
        identity_writes: false,
        mapping_writes: false,
        deletes: false,
        merges: false,
        migrations_created: false,
        image_writes: false,
        global_apply: false,
      },
      by_species_top_25: Object.fromEntries(Object.entries(countBy(targets, (row) => row.species_slug)).slice(0, 25)),
      by_set_top_25: Object.fromEntries(Object.entries(countBy(targets, (row) => row.set_code)).slice(0, 25)),
      execution,
      stop_findings: stopFindings,
      pass: stopFindings.length === 0,
    };

    await writeJson(OUTPUT_JSON, report);

    const md = [
      '# ENRICH-08A Species Name Rule Real Apply V1',
      '',
      `Package: \`${PACKAGE_ID}\``,
      '',
      '## Result',
      '',
      `- Pass: ${report.pass}`,
      `- Target species inserts: ${targets.length}`,
      `- Target parent rows: ${report.scope.target_parent_rows}`,
      `- Inserted species rows: ${execution.insert_proof.inserted_species_rows}`,
      `- Package fingerprint: \`${packageFingerprint}\``,
      `- Dry-run proof: \`${EXPECTED_DRY_RUN_PROOF} == ${EXPECTED_DRY_RUN_PROOF}\``,
      `- Before species rows in scope: ${execution.before_snapshot.row_count}`,
      `- After species rows in scope: ${execution.after_snapshot.row_count}`,
      '',
      '## Safety',
      '',
      '- Durable DB writes performed: true',
      '- Writes performed: `card_print_species` inserts only',
      '- Parent writes: false',
      '- Child writes: false',
      '- Identity writes: false',
      '- Mapping writes: false',
      '- Deletes/merges: false',
      '- Migrations created: false',
      '- Image writes: false',
      '- Global apply: false',
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
      inserted_species_rows: execution.insert_proof.inserted_species_rows,
      after_species_rows: execution.after_snapshot.row_count,
      stop_findings: stopFindings,
    }, null, 2));
  } finally {
    await client.end();
  }
}

await main();
