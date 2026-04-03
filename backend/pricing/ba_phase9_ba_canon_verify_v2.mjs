import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import pg from 'pg';

import {
  BA_SET_CODES,
  EXPECTED_CANDIDATE_COUNT,
  IDENTITY_DOMAIN,
  IDENTITY_KEY_VERSION,
  buildPaths,
  runPromotion,
} from './ba_phase9_ba_canon_promote_v2.mjs';

const { Client } = pg;

function parseEnvBlock(text) {
  const env = {};
  for (const rawLine of String(text).split(/\r?\n/)) {
    const line = rawLine.trim();
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    let [, key, value] = match;
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function normalizeTextOrNull(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function mustGetLocalDbUrl(repoRoot) {
  const output = execFileSync('supabase', ['status', '-o', 'env'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  const env = parseEnvBlock(output);
  const dbUrl = normalizeTextOrNull(env.DB_URL);
  if (!dbUrl) {
    throw new Error('local DB_URL not available from `supabase status -o env`');
  }
  return dbUrl;
}

async function withClient(connectionString, fn) {
  const client = new Client({ connectionString, ssl: false });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

async function writeJson(filePath, payload) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function main() {
  const paths = buildPaths();
  const verificationPath = path.join(
    paths.checkpointsDir,
    'ba_phase9_ba_promotion_report_v2.json',
  );
  const localDbUrl = mustGetLocalDbUrl(paths.repoRoot);

  const [dryRunResult, localAudit] = await Promise.all([
    runPromotion({ apply: false }),
    withClient(localDbUrl, async (client) => {
      const [
        baCardPrintCountResult,
        baIdentityCountResult,
        baIdentityUniquenessResult,
        activePerCardPrintResult,
        baGvIdUniquenessResult,
        tcgPocketIdentityResult,
        mappingsFkResult,
        crossDomainLeakageResult,
      ] = await Promise.all([
        client.query(
          `
            select count(*)::int as row_count
            from public.card_prints
            where set_code = any($1::text[])
              and gv_id like 'GV-PK-BA-%'
          `,
          [BA_SET_CODES],
        ),
        client.query(
          `
            select count(*)::int as row_count
            from public.card_print_identity
            where identity_domain = $1
              and identity_key_version = $2
              and is_active = true
          `,
          [IDENTITY_DOMAIN, IDENTITY_KEY_VERSION],
        ),
        client.query(
          `
            select
              count(*)::int as total_rows,
              count(distinct identity_key_hash)::int as distinct_identity_key_hashes
            from public.card_print_identity
            where identity_domain = $1
              and identity_key_version = $2
              and is_active = true
          `,
          [IDENTITY_DOMAIN, IDENTITY_KEY_VERSION],
        ),
        client.query(
          `
            select count(*)::int as offending_group_count
            from (
              select cpi.card_print_id
              from public.card_print_identity cpi
              join public.card_prints cp
                on cp.id = cpi.card_print_id
              where cpi.is_active = true
                and cp.set_code = any($1::text[])
              group by cpi.card_print_id
              having count(*) <> 1
            ) groups
          `,
          [BA_SET_CODES],
        ),
        client.query(
          `
            select
              count(*)::int as total_rows,
              count(distinct gv_id)::int as distinct_gv_ids
            from public.card_prints
            where set_code = any($1::text[])
              and gv_id like 'GV-PK-BA-%'
          `,
          [BA_SET_CODES],
        ),
        client.query(
          `
            select count(*)::int as row_count
            from public.card_print_identity
            where identity_domain = 'tcg_pocket'
          `,
        ),
        client.query(
          `
            select pg_get_constraintdef(oid) as definition
            from pg_constraint
            where conname = 'external_mappings_card_print_id_fkey'
              and connamespace = 'public'::regnamespace
          `,
        ),
        client.query(
          `
            select count(*)::int as row_count
            from public.card_print_identity cpi
            join public.card_prints cp
              on cp.id = cpi.card_print_id
            where cp.set_code = any($1::text[])
              and cpi.identity_domain <> $2
          `,
          [BA_SET_CODES, IDENTITY_DOMAIN],
        ),
      ]);

      return {
        ba_card_print_count: Number(baCardPrintCountResult.rows[0]?.row_count ?? 0),
        ba_identity_count: Number(baIdentityCountResult.rows[0]?.row_count ?? 0),
        ba_identity_uniqueness: {
          total_rows: Number(baIdentityUniquenessResult.rows[0]?.total_rows ?? 0),
          distinct_identity_key_hashes: Number(
            baIdentityUniquenessResult.rows[0]?.distinct_identity_key_hashes ?? 0,
          ),
        },
        active_per_card_print_offending_group_count: Number(
          activePerCardPrintResult.rows[0]?.offending_group_count ?? 0,
        ),
        ba_gv_id_uniqueness: {
          total_rows: Number(baGvIdUniquenessResult.rows[0]?.total_rows ?? 0),
          distinct_gv_ids: Number(baGvIdUniquenessResult.rows[0]?.distinct_gv_ids ?? 0),
        },
        tcg_pocket_identity_count: Number(tcgPocketIdentityResult.rows[0]?.row_count ?? 0),
        mappings_fk_definition: mappingsFkResult.rows[0]?.definition ?? null,
        cross_domain_leakage_count: Number(crossDomainLeakageResult.rows[0]?.row_count ?? 0),
      };
    }),
  ]);

  const verificationResults = {
    V1_BA_CARD_PRINT_COUNT_IS_328: {
      passed: localAudit.ba_card_print_count === EXPECTED_CANDIDATE_COUNT,
      detail: localAudit.ba_card_print_count,
    },
    V2_BA_CARD_PRINT_IDENTITY_COUNT_IS_328: {
      passed: localAudit.ba_identity_count === EXPECTED_CANDIDATE_COUNT,
      detail: localAudit.ba_identity_count,
    },
    V3_BA_IDENTITY_UNIQUENESS_HOLDS: {
      passed:
        localAudit.ba_identity_uniqueness.total_rows
        === localAudit.ba_identity_uniqueness.distinct_identity_key_hashes,
      detail: localAudit.ba_identity_uniqueness,
    },
    V4_ONE_ACTIVE_IDENTITY_PER_BA_CARD_PRINT: {
      passed: localAudit.active_per_card_print_offending_group_count === 0,
      detail: localAudit.active_per_card_print_offending_group_count,
    },
    V5_BA_GV_ID_UNIQUENESS_HOLDS: {
      passed: localAudit.ba_gv_id_uniqueness.total_rows === localAudit.ba_gv_id_uniqueness.distinct_gv_ids,
      detail: localAudit.ba_gv_id_uniqueness,
    },
    V6_TCG_POCKET_IDENTITY_DOMAIN_REMAINS_ZERO: {
      passed: localAudit.tcg_pocket_identity_count === 0,
      detail: localAudit.tcg_pocket_identity_count,
    },
    V7_EXTERNAL_MAPPINGS_STILL_REFERENCE_CARD_PRINTS: {
      passed: String(localAudit.mappings_fk_definition ?? '').includes('REFERENCES card_prints(id)'),
      detail: localAudit.mappings_fk_definition,
    },
    V8_IDEMPOTENCY_HOLDS_ON_RERUN: {
      passed:
        dryRunResult.plan.insert_card_prints_count === 0
        && dryRunResult.plan.insert_identity_rows_count === 0,
      detail: {
        insert_card_prints_count: dryRunResult.plan.insert_card_prints_count,
        insert_identity_rows_count: dryRunResult.plan.insert_identity_rows_count,
        skipped_existing_count: dryRunResult.plan.skipped_existing_count,
      },
    },
    V9_NO_CROSS_DOMAIN_LEAKAGE_FOR_BA_ROWS: {
      passed: localAudit.cross_domain_leakage_count === 0,
      detail: localAudit.cross_domain_leakage_count,
    },
  };

  const allPassed = Object.values(verificationResults).every((result) => result.passed);

  const reportPayload = {
    generated_at: new Date().toISOString(),
    phase: 'BA_PHASE9_BA_CANON_PROMOTION_V2',
    inserted_card_prints: EXPECTED_CANDIDATE_COUNT - dryRunResult.plan.insert_card_prints_count,
    inserted_identity_rows: EXPECTED_CANDIDATE_COUNT - dryRunResult.plan.insert_identity_rows_count,
    skipped_existing: dryRunResult.plan.skipped_existing_count,
    gv_id_sample: dryRunResult.candidates.slice(0, 10).map((candidate) => candidate.gv_id),
    verification_results: {
      all_passed: allPassed,
      checks: verificationResults,
    },
  };

  await writeJson(verificationPath, reportPayload);

  if (!allPassed) {
    console.error('[ba-phase9-ba-canon-verify-v2] STOP: verification failed.');
    process.exit(1);
  }

  console.log('[ba-phase9-ba-canon-verify-v2] verification passed.');
  console.log(`[ba-phase9-ba-canon-verify-v2] wrote ${verificationPath}`);
}

main().catch((error) => {
  console.error('[ba-phase9-ba-canon-verify-v2] fatal', error);
  process.exit(1);
});
