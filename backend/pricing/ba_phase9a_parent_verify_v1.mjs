import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import pg from 'pg';

const { Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const checkpointsDir = path.join(repoRoot, 'docs', 'checkpoints');
const verificationPath = path.join(checkpointsDir, 'ba_phase9a_parent_verify_v1.json');

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

function mustGetLocalDbUrl() {
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

async function loadSchemaState(client) {
  const [
    cardPrintConstraintsResult,
    cardPrintIndexesResult,
    identityIndexesResult,
    identityConstraintResult,
    baSetResult,
  ] = await Promise.all([
    client.query(`
      select conname, pg_get_constraintdef(oid) as definition
      from pg_constraint
      where connamespace = 'public'::regnamespace
        and conrelid = 'public.card_prints'::regclass
      order by conname
    `),
    client.query(`
      select indexname, indexdef
      from pg_indexes
      where schemaname = 'public'
        and tablename = 'card_prints'
      order by indexname
    `),
    client.query(`
      select indexname, indexdef
      from pg_indexes
      where schemaname = 'public'
        and tablename = 'card_print_identity'
      order by indexname
    `),
    client.query(`
      select conname, pg_get_constraintdef(oid) as definition
      from pg_constraint
      where connamespace = 'public'::regnamespace
        and conrelid = 'public.card_print_identity'::regclass
      order by conname
    `),
    client.query(`
      select id, code
      from public.sets
      where code = 'ba-2020'
      limit 1
    `),
  ]);

  return {
    cardPrintConstraints: cardPrintConstraintsResult.rows,
    cardPrintIndexes: cardPrintIndexesResult.rows,
    identityIndexes: identityIndexesResult.rows,
    identityConstraints: identityConstraintResult.rows,
    baSet: baSetResult.rows[0] ?? null,
  };
}

async function ensureVerifierGameId(client) {
  const existingGame = await client.query(`
    select id
    from public.games
    order by code nulls last, name nulls last, id
    limit 1
  `);

  const existingGameId = existingGame.rows[0]?.id ?? null;
  if (existingGameId) {
    return existingGameId;
  }

  const insertedGame = await client.query(`
    insert into public.games (code, name, slug)
    values ('ba-phase9a-verify', 'BA Phase 9A Verify', 'ba-phase9a-verify')
    returning id
  `);

  const insertedGameId = insertedGame.rows[0]?.id ?? null;
  if (!insertedGameId) {
    throw new Error('failed to create verifier game row');
  }

  return insertedGameId;
}

async function verifyParentDuplicateInsert(client, baSetId, gameId) {
  await client.query('begin');
  try {
    const insertOne = await client.query(
      `
        insert into public.card_prints (
          game_id,
          set_id,
          set_code,
          number,
          variant_key,
          name,
          gv_id
        )
        values ($1, $2, 'ba-2020', '999', '', 'ba-parent-verify-a', 'GV-PK-BA-PARENT-VERIFY-A')
        returning id, set_code, number, number_plain, variant_key, gv_id
      `,
      [gameId, baSetId],
    );

    const insertTwo = await client.query(
      `
        insert into public.card_prints (
          game_id,
          set_id,
          set_code,
          number,
          variant_key,
          name,
          gv_id
        )
        values ($1, $2, 'ba-2020', '999', '', 'ba-parent-verify-b', 'GV-PK-BA-PARENT-VERIFY-B')
        returning id, set_code, number, number_plain, variant_key, gv_id
      `,
      [gameId, baSetId],
    );

    await client.query('rollback');

    return {
      passed: true,
      detail: {
        row_one: insertOne.rows[0] ?? null,
        row_two: insertTwo.rows[0] ?? null,
      },
    };
  } catch (error) {
    await client.query('rollback');
    return {
      passed: false,
      detail: {
        error: error.message,
        code: error.code ?? null,
        constraint: error.constraint ?? null,
      },
    };
  }
}

async function verifyIdentityUniqueness(client, baSetId, gameId) {
  await client.query('begin');
  try {
    const parentOne = await client.query(
      `
        insert into public.card_prints (
          game_id,
          set_id,
          set_code,
          number,
          variant_key,
          name,
          gv_id
        )
        values ($1, $2, 'ba-2020', '901', '', 'identity-parent-one', 'GV-PK-BA-VERIFY-ID-1')
        returning id
      `,
      [gameId, baSetId],
    );

    const parentTwo = await client.query(
      `
        insert into public.card_prints (
          game_id,
          set_id,
          set_code,
          number,
          variant_key,
          name,
          gv_id
        )
        values ($1, $2, 'ba-2020', '902', '', 'identity-parent-two', 'GV-PK-BA-VERIFY-ID-2')
        returning id
      `,
      [gameId, baSetId],
    );

    const parentThree = await client.query(
      `
        insert into public.card_prints (
          game_id,
          set_id,
          set_code,
          number,
          variant_key,
          name,
          gv_id
        )
        values ($1, $2, 'ba-2020', '903', '', 'identity-parent-three', 'GV-PK-BA-VERIFY-ID-3')
        returning id
      `,
      [gameId, baSetId],
    );

    const parentOneId = parentOne.rows[0]?.id;
    const parentTwoId = parentTwo.rows[0]?.id;
    const parentThreeId = parentThree.rows[0]?.id;
    if (!parentOneId || !parentTwoId || !parentThreeId) {
      throw new Error('failed to create verifier parent rows');
    }

    await client.query(
      `
        insert into public.card_print_identity (
          card_print_id,
          identity_domain,
          set_code_identity,
          printed_number,
          normalized_printed_name,
          source_name_raw,
          identity_payload,
          identity_key_version,
          identity_key_hash,
          is_active
        )
        values (
          $1,
          'pokemon_ba',
          'ba-2020',
          '901',
          'identity parent one',
          'Identity Parent One Raw',
          '{}'::jsonb,
          'pokemon_ba:v1',
          'ba-phase9a-parent-verify-hash-parent-1',
          true
        )
      `,
      [parentOneId],
    );

    let parentConstraintFailure = null;
    try {
      await client.query('savepoint verify_parent_active_constraint');
      await client.query(
        `
          insert into public.card_print_identity (
            card_print_id,
            identity_domain,
            set_code_identity,
            printed_number,
            normalized_printed_name,
            source_name_raw,
            identity_payload,
            identity_key_version,
            identity_key_hash,
            is_active
          )
          values (
            $1,
            'pokemon_ba',
            'ba-2020',
            '901B',
            'identity parent one alt',
            'Identity Parent One Raw Alt',
            '{}'::jsonb,
            'pokemon_ba:v1',
            'ba-phase9a-parent-verify-hash-parent-1-alt',
            true
          )
        `,
        [parentOneId],
      );
    } catch (error) {
      await client.query('rollback to savepoint verify_parent_active_constraint');
      parentConstraintFailure = {
        code: error.code ?? null,
        constraint: error.constraint ?? null,
        message: error.message,
      };
    }

    await client.query(
      `
        insert into public.card_print_identity (
          card_print_id,
          identity_domain,
          set_code_identity,
          printed_number,
          normalized_printed_name,
          source_name_raw,
          identity_payload,
          identity_key_version,
          identity_key_hash,
          is_active
        )
        values (
          $1,
          'pokemon_ba',
          'ba-2020',
          '902',
          'identity parent two',
          'Identity Parent Two Raw',
          '{}'::jsonb,
          'pokemon_ba:v1',
          'ba-phase9a-parent-verify-hash-parent-2',
          true
        )
      `,
      [parentTwoId],
    );

    let hashConstraintFailure = null;
    try {
      await client.query('savepoint verify_identity_hash_constraint');
      await client.query(
        `
          insert into public.card_print_identity (
            card_print_id,
            identity_domain,
            set_code_identity,
            printed_number,
            normalized_printed_name,
            source_name_raw,
            identity_payload,
            identity_key_version,
            identity_key_hash,
            is_active
          )
          values (
            $1,
            'pokemon_ba',
            'ba-2020',
            '903',
            'identity parent three',
            'Identity Parent Three Raw',
            '{}'::jsonb,
            'pokemon_ba:v1',
            'ba-phase9a-parent-verify-hash-parent-2',
            true
          )
        `,
        [parentThreeId],
      );
    } catch (error) {
      await client.query('rollback to savepoint verify_identity_hash_constraint');
      hashConstraintFailure = {
        code: error.code ?? null,
        constraint: error.constraint ?? null,
        message: error.message,
      };
    }

    await client.query('rollback');

    const parentConstraintPassed =
      parentConstraintFailure?.constraint === 'uq_card_print_identity_active_card_print_id';
    const hashConstraintPassed =
      hashConstraintFailure?.constraint === 'uq_card_print_identity_active_domain_hash';

    return {
      passed: parentConstraintPassed && hashConstraintPassed,
      detail: {
        parent_constraint_failure: parentConstraintFailure,
        hash_constraint_failure: hashConstraintFailure,
      },
    };
  } catch (error) {
    await client.query('rollback');
    return {
      passed: false,
      detail: {
        fatal_error: error.message,
      },
    };
  }
}

function checkNoSchemaDrift(schemaState) {
  const legacyConstraintPresent = schemaState.cardPrintConstraints.some(
    (row) => row.conname === 'uq_card_prints_identity',
  );

  const uniqueCardPrintDefs = [
    ...schemaState.cardPrintConstraints
      .filter((row) => String(row.definition).startsWith('UNIQUE '))
      .map((row) => row.definition),
    ...schemaState.cardPrintIndexes
      .filter((row) => String(row.indexdef).toLowerCase().includes('create unique index'))
      .map((row) => row.indexdef),
  ];

  const parentIdentityLeak = uniqueCardPrintDefs.filter((definition) => {
    const normalized = String(definition).toLowerCase();
    return (
      normalized.includes('number_plain')
      || normalized.includes(' variant_key')
      || normalized.includes('(set_code')
      || normalized.includes('(set_id')
    );
  });

  const requiredCardPrintIndexNames = ['card_prints_gv_id_uq', 'card_prints_pkey', 'card_prints_print_identity_key_uq'];
  const presentCardPrintIndexNames = new Set([
    ...schemaState.cardPrintIndexes.map((row) => row.indexname),
    ...schemaState.cardPrintConstraints.map((row) => row.conname),
  ]);
  const missingRequired = requiredCardPrintIndexNames.filter((name) => !presentCardPrintIndexNames.has(name));

  const requiredIdentityIndexNames = [
    'uq_card_print_identity_active_card_print_id',
    'uq_card_print_identity_active_domain_hash',
  ];
  const missingIdentityIndexes = requiredIdentityIndexNames.filter(
    (name) => !schemaState.identityIndexes.some((row) => row.indexname === name),
  );

  return {
    passed:
      !legacyConstraintPresent
      && parentIdentityLeak.length === 0
      && missingRequired.length === 0
      && missingIdentityIndexes.length === 0,
    detail: {
      legacy_constraint_present: legacyConstraintPresent,
      parent_identity_leak_definitions: parentIdentityLeak,
      missing_required_card_print_indexes_or_constraints: missingRequired,
      missing_required_identity_indexes: missingIdentityIndexes,
    },
  };
}

async function main() {
  const localDbUrl = mustGetLocalDbUrl();

  const result = await withClient(localDbUrl, async (client) => {
    const schemaState = await loadSchemaState(client);
    if (!schemaState.baSet?.id) {
      throw new Error('ba-2020 set missing locally after reset');
    }
    const verifierGameId = await ensureVerifierGameId(client);

    const v1 = {
      passed:
        !schemaState.cardPrintConstraints.some((row) => row.conname === 'uq_card_prints_identity')
        && !schemaState.cardPrintIndexes.some((row) => row.indexname === 'uq_card_prints_identity'),
      detail: {
        remaining_constraint_names: schemaState.cardPrintConstraints.map((row) => row.conname),
        remaining_unique_index_names: schemaState.cardPrintIndexes
          .filter((row) => String(row.indexdef).toLowerCase().includes('create unique index'))
          .map((row) => row.indexname),
      },
    };

    const v2 = await verifyParentDuplicateInsert(client, schemaState.baSet.id, verifierGameId);
    const v3 = await verifyIdentityUniqueness(client, schemaState.baSet.id, verifierGameId);
    const v4 = checkNoSchemaDrift(schemaState);

    return {
      generated_at: new Date().toISOString(),
      phase: 'BA_PHASE9A_PARENT_UNIQUENESS_REALIGNMENT_V1',
      checks: {
        V1_LEGACY_PARENT_UNIQUENESS_CONSTRAINT_REMOVED: v1,
        V2_CARD_PRINTS_ALLOWS_DUPLICATE_SET_CODE_NUMBER_PLAIN: v2,
        V3_CARD_PRINT_IDENTITY_UNIQUENESS_REMAINS_ENFORCED: v3,
        V4_NO_SCHEMA_DRIFT_OUTSIDE_INTENDED_CHANGE: v4,
      },
      all_passed: v1.passed && v2.passed && v3.passed && v4.passed,
    };
  });

  await writeJson(verificationPath, result);

  if (!result.all_passed) {
    console.error('[ba-phase9a-parent-verify-v1] STOP: verification failed.');
    process.exit(1);
  }

  console.log('[ba-phase9a-parent-verify-v1] verification passed.');
  console.log(`[ba-phase9a-parent-verify-v1] wrote ${verificationPath}`);
}

main().catch((error) => {
  console.error('[ba-phase9a-parent-verify-v1] fatal', error);
  process.exit(1);
});
