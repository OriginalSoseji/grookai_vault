import pg from "pg";

import "../../backend/env.mjs";
import {
  buildOnePieceBatchRowV1,
  compareOnePieceProtectedSnapshotsV1,
  evaluateOnePieceSourceSnapshotV1,
  evaluateOnePieceStagingFootprintAbsentV1,
  evaluateOnePieceTransactionReadbackV1,
  evaluateOnePieceTransactionSecurityV1,
  ONE_PIECE_STAGING_OBJECTS,
  PROTECTED_TABLES_V1,
} from "../../backend/pricing/one_piece_canonical_import_rollback_canary_v1.mjs";
import {
  sha256,
  stableJson,
} from "../../backend/pricing/one_piece_canonical_import_staging_v1.mjs";
import { marketEvidenceDbUrl } from "../lib/market_evidence_db_query_v1.mjs";

const { Client } = pg;

export function onePieceDatabaseSslConfigV1(connectionString) {
  if (!connectionString) {
    throw new Error("SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL is required");
  }
  const host = new URL(connectionString).hostname.toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]"
    ? false
    : { rejectUnauthorized: false };
}

function quoteIdentifier(value) {
  if (!/^[a-z_][a-z0-9_]*$/i.test(value)) {
    throw new Error(`Unsafe SQL identifier: ${value}`);
  }
  return `"${value.replaceAll('"', '""')}"`;
}

function qualifiedIdentifier(relation) {
  const parts = relation.split(".");
  if (parts.length !== 2) throw new Error(`Expected schema-qualified relation: ${relation}`);
  return parts.map(quoteIdentifier).join(".");
}

export function createOnePieceProductionClientV1(applicationName) {
  const connectionString = marketEvidenceDbUrl();
  return new Client({
    connectionString,
    ssl: onePieceDatabaseSslConfigV1(connectionString),
    connectionTimeoutMillis: 15_000,
    query_timeout: 240_000,
    statement_timeout: 240_000,
    application_name: applicationName,
  });
}

export async function captureOnePieceProtectedBoundariesV1(client) {
  const tables = {};
  for (const relation of PROTECTED_TABLES_V1) {
    const presentResult = await client.query(
      "select to_regclass($1)::text as relation",
      [relation],
    );
    const present = presentResult.rows[0]?.relation !== null;
    let rowCount = null;
    if (present) {
      const countResult = await client.query(
        `select count(*)::text as row_count from ${qualifiedIdentifier(relation)}`,
      );
      rowCount = countResult.rows[0].row_count;
    }
    tables[relation] = { present, row_count: rowCount };
  }
  const mtgResult = await client.query(`
    select jsonb_build_object(
      'game_count', (select count(*)::text from public.games where code = 'mtg'),
      'set_count', (select count(*)::text from public.sets where game = 'mtg'),
      'card_count', (
        select count(*)::text
        from public.card_prints card
        join public.games game on game.id = card.game_id
        where game.code = 'mtg'
      ),
      'identity_count', (
        select count(*)::text
        from public.card_print_identity identity_row
        join public.card_prints card on card.id = identity_row.card_print_id
        join public.games game on game.id = card.game_id
        where game.code = 'mtg'
      ),
      'printing_count', (
        select count(*)::text
        from public.card_printings printing
        join public.card_prints card on card.id = printing.card_print_id
        join public.games game on game.id = card.game_id
        where game.code = 'mtg'
      ),
      'external_mapping_count', (
        select count(*)::text
        from public.external_mappings mapping
        join public.card_prints card on card.id = mapping.card_print_id
        join public.games game on game.id = card.game_id
        where game.code = 'mtg'
      ),
      'external_printing_mapping_count', (
        select count(*)::text
        from public.external_printing_mappings mapping
        join public.card_printings printing on printing.id = mapping.card_printing_id
        join public.card_prints card on card.id = printing.card_print_id
        join public.games game on game.id = card.game_id
        where game.code = 'mtg'
      ),
      'canonical_scope', 'mtg'
    ) as value
  `);
  const mtgScope = mtgResult.rows[0].value;
  mtgScope.staging_batch_count =
    tables["public.mtg_canonical_import_batches"].row_count;
  mtgScope.staging_row_count = tables["public.mtg_canonical_import_rows"].row_count;
  return { tables, mtg_scope: mtgScope };
}

export async function captureOnePieceSourceSnapshotV1(client, expectation) {
  const categoryResult = await client.query(
    `select category_id
     from public.tcgcsv_source_categories
     where category_id = $1`,
    [expectation.category_id],
  );
  const groupResult = await client.query(
    `select group_id, name, published_on::date::text as published_on,
            source_active, catalog_metadata_status
     from public.tcgcsv_source_groups
     where category_id = $1 and group_id = $2`,
    [expectation.category_id, expectation.group.group_id],
  );
  const productIds = expectation.products.map((row) => row.source_product_id);
  const productResult = await client.query(
    `select product_id as source_product_id,
            category_id as source_category_id,
            group_id as source_group_id,
            payload_hash,
            source_active,
            catalog_metadata_status
     from public.tcgcsv_source_products
     where product_id = any($1::integer[])
     order by product_id`,
    [productIds],
  );
  const observedOn = [...new Set(expectation.price_lanes.map((row) => row.observed_on))];
  const priceResult = observedOn.length === 0
    ? { rows: [] }
    : await client.query(
        `select product_id as source_product_id,
                source_price_row_identity,
                subtype_name_normalized,
                observed_on::text,
                coalesce(market_price > 0, false) as positive_market_signal
         from public.tcgcsv_source_price_daily_observations
         where category_id = $1
           and product_id = any($2::integer[])
           and observed_on = any($3::date[])
         order by product_id, source_price_row_identity, observed_on`,
        [expectation.category_id, productIds, observedOn],
      );
  return {
    category: categoryResult.rows[0] ?? null,
    group: groupResult.rows[0] ?? null,
    products: productResult.rows.map((row) => ({
      ...row,
      source_product_id: Number(row.source_product_id),
      source_category_id: Number(row.source_category_id),
      source_group_id: Number(row.source_group_id),
    })),
    price_lanes: priceResult.rows.map((row) => ({
      ...row,
      source_product_id: Number(row.source_product_id),
    })),
  };
}

export async function captureOnePieceStagingFootprintV1(client) {
  const tables = {};
  for (const relation of ONE_PIECE_STAGING_OBJECTS.tables) {
    const result = await client.query("select to_regclass($1)::text as relation", [relation]);
    tables[relation] = result.rows[0]?.relation !== null;
  }
  const functionResult = await client.query(
    "select to_regprocedure($1)::text as procedure",
    [ONE_PIECE_STAGING_OBJECTS.function],
  );
  const policyResult = await client.query(
    `select policyname
     from pg_policies
     where schemaname = 'public' and policyname = any($1::text[])
     order by policyname`,
    [ONE_PIECE_STAGING_OBJECTS.policies],
  );
  const triggerResult = await client.query(
    `select tgname
     from pg_trigger
     where not tgisinternal and tgname = any($1::text[])
     order by tgname`,
    [ONE_PIECE_STAGING_OBJECTS.triggers],
  );
  const indexResult = await client.query(
    `select indexname
     from pg_indexes
     where schemaname = 'public' and indexname = any($1::text[])
     order by indexname`,
    [ONE_PIECE_STAGING_OBJECTS.indexes],
  );
  const migrationResult = await client.query(
    `select exists (
       select 1 from supabase_migrations.schema_migrations where version = $1
     ) as recorded`,
    [ONE_PIECE_STAGING_OBJECTS.migration_version],
  );
  return {
    tables,
    function_present: functionResult.rows[0]?.procedure !== null,
    policies: policyResult.rows.map((row) => row.policyname),
    triggers: triggerResult.rows.map((row) => row.tgname),
    indexes: indexResult.rows.map((row) => row.indexname),
    migration_recorded: migrationResult.rows[0].recorded,
  };
}

async function capturePrivileges(client, role, relation) {
  const result = await client.query(
    `select
       has_table_privilege($1, $2, 'select') as "select",
       has_table_privilege($1, $2, 'insert') as "insert",
       has_table_privilege($1, $2, 'update') as "update",
       has_table_privilege($1, $2, 'delete') as "delete"`,
    [role, relation],
  );
  return result.rows[0];
}

export async function captureOnePieceTransactionSecurityV1(client) {
  const relationResult = await client.query(`
    select relname, relrowsecurity
    from pg_class
    where oid in (
      'public.one_piece_canonical_import_batches'::regclass,
      'public.one_piece_canonical_import_rows'::regclass
    )
  `);
  const rls = Object.fromEntries(
    relationResult.rows.map((row) => [row.relname, row.relrowsecurity]),
  );
  const privileges = {};
  for (const role of ["anon", "authenticated", "service_role"]) {
    privileges[role] = {
      batch: await capturePrivileges(
        client,
        role,
        "public.one_piece_canonical_import_batches",
      ),
      row: await capturePrivileges(
        client,
        role,
        "public.one_piece_canonical_import_rows",
      ),
    };
  }
  const policyResult = await client.query(`
    select tablename, policyname, cmd
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'one_piece_canonical_import_batches',
        'one_piece_canonical_import_rows'
      )
    order by tablename, policyname
  `);
  const triggerResult = await client.query(
    `select tgname
     from pg_trigger
     where not tgisinternal and tgname = any($1::text[])
     order by tgname`,
    [ONE_PIECE_STAGING_OBJECTS.triggers],
  );
  const functionResult = await client.query(
    "select to_regprocedure($1)::text as procedure",
    [ONE_PIECE_STAGING_OBJECTS.function],
  );
  return {
    batch_rls_enabled: rls.one_piece_canonical_import_batches === true,
    row_rls_enabled: rls.one_piece_canonical_import_rows === true,
    privileges,
    policies: policyResult.rows,
    triggers: triggerResult.rows.map((row) => row.tgname),
    function_present: functionResult.rows[0]?.procedure !== null,
  };
}

export async function insertOnePieceCanaryRowsV1(client, plan) {
  const batch = buildOnePieceBatchRowV1(plan);
  await client.query(
    `insert into public.one_piece_canonical_import_batches (
       id, canary_plan_fingerprint_sha256, manifest_logical_sha256,
       migration_draft_sha256, plan_version, schema_version,
       producing_commit_sha, producing_branch, selected_group_id,
       selected_group_name, selected_group_released_on, execution_mode,
       authorized_durable_batch_rows, authorized_durable_staging_rows,
       row_counts, execution_boundaries
     ) values (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::date, $12,
       $13, $14, $15::jsonb, $16::jsonb
     )`,
    [
      batch.id,
      batch.canary_plan_fingerprint_sha256,
      batch.manifest_logical_sha256,
      batch.migration_draft_sha256,
      batch.plan_version,
      batch.schema_version,
      batch.producing_commit_sha,
      batch.producing_branch,
      batch.selected_group_id,
      batch.selected_group_name,
      batch.selected_group_released_on,
      batch.execution_mode,
      batch.authorized_durable_batch_rows,
      batch.authorized_durable_staging_rows,
      JSON.stringify(batch.row_counts),
      JSON.stringify(batch.execution_boundaries),
    ],
  );
  await client.query(
    `insert into public.one_piece_canonical_import_rows (
       id, batch_id, source_product_id, source_group_id, record_class,
       single_card_kind, language_key, promotion_state, row_ordinal,
       payload, payload_sha256
     )
     select id, batch_id, source_product_id, source_group_id, record_class,
            single_card_kind, language_key, promotion_state, row_ordinal,
            payload, payload_sha256
     from jsonb_to_recordset($1::jsonb) as source_row(
       id uuid, batch_id uuid, source_product_id bigint, source_group_id bigint,
       record_class text, single_card_kind text, language_key text,
       promotion_state text, row_ordinal integer, payload jsonb,
       payload_sha256 text
     )`,
    [JSON.stringify(plan.staging_rows)],
  );
  return batch;
}

export async function readOnePieceTransactionRowsV1(client, plan, expectedBatch) {
  const batchResult = await client.query(
    `select id::text, canary_plan_fingerprint_sha256,
            manifest_logical_sha256, migration_draft_sha256,
            plan_version, schema_version, producing_commit_sha,
            producing_branch, selected_group_id::integer,
            selected_group_name, selected_group_released_on::text,
            execution_mode, authorized_durable_batch_rows,
            authorized_durable_staging_rows, row_counts, execution_boundaries
     from public.one_piece_canonical_import_batches where id = $1`,
    [plan.batch.id],
  );
  const rowResult = await client.query(
    `select id::text, batch_id::text, source_product_id::integer,
            source_group_id::integer, record_class, single_card_kind,
            language_key, promotion_state, row_ordinal, payload, payload_sha256
     from public.one_piece_canonical_import_rows
     where batch_id = $1
     order by row_ordinal`,
    [plan.batch.id],
  );
  return {
    batch_count: batchResult.rowCount,
    row_count: rowResult.rowCount,
    batch: batchResult.rows[0] ?? null,
    expected_batch: expectedBatch,
    rows: rowResult.rows,
  };
}

async function expectMutationRejected(client, savepoint, sql, values) {
  await client.query(`savepoint ${savepoint}`);
  let rejected = false;
  try {
    await client.query(sql, values);
  } catch {
    rejected = true;
  } finally {
    await client.query(`rollback to savepoint ${savepoint}`);
    await client.query(`release savepoint ${savepoint}`);
  }
  return rejected;
}

export async function proveOnePieceMutationRejectionV1(client, plan) {
  const updateRejected = await expectMutationRejected(
    client,
    "one_piece_update_probe",
    `update public.one_piece_canonical_import_batches
     set selected_group_name = selected_group_name where id = $1`,
    [plan.batch.id],
  );
  const deleteRejected = await expectMutationRejected(
    client,
    "one_piece_delete_probe",
    "delete from public.one_piece_canonical_import_rows where id = $1",
    [plan.staging_rows[0].id],
  );
  return { update_rejected: updateRejected, delete_rejected: deleteRejected };
}

export async function captureOnePieceReadOnlyProofV1({
  plan,
  sourceExpectation,
  applicationName,
  createClient = createOnePieceProductionClientV1,
}) {
  const client = createClient(applicationName);
  let transactionStarted = false;
  let rolledBack = false;
  await client.connect();
  try {
    await client.query("set default_transaction_read_only = on");
    await client.query("begin transaction isolation level repeatable read read only");
    transactionStarted = true;
    await client.query("set local statement_timeout = '240s'");
    const transactionReadOnly = await client.query("show transaction_read_only");
    const defaultReadOnly = await client.query("show default_transaction_read_only");
    if (
      transactionReadOnly.rows[0]?.transaction_read_only !== "on" ||
      defaultReadOnly.rows[0]?.default_transaction_read_only !== "on"
    ) {
      throw new Error("Fresh verifier connection is not provably read-only");
    }
    const protectedBoundaries = await captureOnePieceProtectedBoundariesV1(client);
    const source = await captureOnePieceSourceSnapshotV1(client, sourceExpectation);
    const footprint = await captureOnePieceStagingFootprintV1(client);
    await client.query("rollback");
    rolledBack = true;
    transactionStarted = false;
    return {
      transaction_read_only: true,
      default_transaction_read_only: true,
      protected_boundaries: protectedBoundaries,
      source,
      staging_footprint: footprint,
      plan_fingerprint: plan.canary_plan_fingerprint_sha256,
    };
  } finally {
    if (transactionStarted) {
      try {
        await client.query("rollback");
        rolledBack = true;
      } catch {
        // The caller treats an unproven rollback as a failed canary.
      }
    }
    await client.end();
    if (!rolledBack) throw new Error("Read-only proof transaction did not roll back");
  }
}

export function evaluateOnePiecePostRollbackProofV1({
  baseline,
  postRollback,
  sourceExpectation,
}) {
  return [
    ...evaluateOnePieceStagingFootprintAbsentV1(postRollback.staging_footprint),
    ...compareOnePieceProtectedSnapshotsV1(
      baseline.protected_boundaries,
      postRollback.protected_boundaries,
    ),
    ...evaluateOnePieceSourceSnapshotV1(sourceExpectation, postRollback.source),
  ];
}

export async function runOnePieceRollbackTransactionV1({
  plan,
  migrationInnerBody,
  baseline,
  sourceExpectation,
  createClient = createOnePieceProductionClientV1,
}) {
  const client = createClient("one-piece-canonical-rollback-canary-v1");
  const proof = {
    transaction_started: false,
    rollback_attempted: false,
    rollback_succeeded: false,
    transaction_readback: null,
    security: null,
    protected_inside: null,
    source_inside: null,
    findings: [],
  };
  let primaryError = null;
  await client.connect();
  try {
    await client.query("begin transaction isolation level serializable");
    proof.transaction_started = true;
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '240s'");
    const transactionReadOnly = await client.query("show transaction_read_only");
    proof.transaction_read_only = transactionReadOnly.rows[0]?.transaction_read_only;
    if (proof.transaction_read_only !== "off") {
      throw new Error("Rollback canary transaction is unexpectedly read-only");
    }
    const transactionSourceBefore = await captureOnePieceSourceSnapshotV1(
      client,
      sourceExpectation,
    );
    const sourceBeforeIssues = evaluateOnePieceSourceSnapshotV1(
      sourceExpectation,
      transactionSourceBefore,
    );
    if (sourceBeforeIssues.length > 0) {
      throw new Error(`Source drift before transaction mutation: ${sourceBeforeIssues.join(", ")}`);
    }
    await client.query(migrationInnerBody);
    const expectedBatch = await insertOnePieceCanaryRowsV1(client, plan);
    const readback = await readOnePieceTransactionRowsV1(client, plan, expectedBatch);
    const mutation = await proveOnePieceMutationRejectionV1(client, plan);
    proof.transaction_readback = { ...readback, ...mutation };
    proof.security = await captureOnePieceTransactionSecurityV1(client);
    proof.protected_inside = await captureOnePieceProtectedBoundariesV1(client);
    proof.source_inside = await captureOnePieceSourceSnapshotV1(client, sourceExpectation);
    proof.findings.push(
      ...evaluateOnePieceTransactionReadbackV1(plan, proof.transaction_readback),
      ...evaluateOnePieceTransactionSecurityV1(proof.security),
      ...compareOnePieceProtectedSnapshotsV1(
        baseline.protected_boundaries,
        proof.protected_inside,
      ),
      ...evaluateOnePieceSourceSnapshotV1(sourceExpectation, proof.source_inside),
    );
    if (proof.findings.length > 0) {
      throw new Error(`Transaction-local proof failed: ${proof.findings.join(", ")}`);
    }
  } catch (error) {
    primaryError = error;
  } finally {
    if (proof.transaction_started) {
      proof.rollback_attempted = true;
      try {
        await client.query("rollback");
        proof.rollback_succeeded = true;
      } catch (rollbackError) {
        proof.rollback_error = rollbackError.message;
      }
    }
    await client.end();
  }
  if (!proof.rollback_succeeded) {
    const error = new Error(
      `Rollback could not be proven${primaryError ? ` after: ${primaryError.message}` : ""}`,
    );
    error.databaseProof = proof;
    throw error;
  }
  if (primaryError) {
    primaryError.databaseProof = proof;
    throw primaryError;
  }
  return proof;
}

export function assertOnePieceBaselineV1({ baseline, sourceExpectation }) {
  const issues = [
    ...evaluateOnePieceStagingFootprintAbsentV1(baseline.staging_footprint),
    ...evaluateOnePieceSourceSnapshotV1(sourceExpectation, baseline.source),
  ];
  if (issues.length > 0) throw new Error(`Production baseline failed: ${issues.join(", ")}`);
  return true;
}

export function assertOnePiecePostRollbackV1(input) {
  const issues = evaluateOnePiecePostRollbackProofV1(input);
  if (issues.length > 0) throw new Error(`Post-rollback proof failed: ${issues.join(", ")}`);
  return true;
}

export function summarizeOnePieceDatabaseProofV1(proof) {
  return {
    transaction_started: proof.transaction_started,
    rollback_attempted: proof.rollback_attempted,
    rollback_succeeded: proof.rollback_succeeded,
    transaction_batch_count: proof.transaction_readback?.batch_count ?? null,
    transaction_row_count: proof.transaction_readback?.row_count ?? null,
    update_rejected: proof.transaction_readback?.update_rejected ?? null,
    delete_rejected: proof.transaction_readback?.delete_rejected ?? null,
    findings: proof.findings,
    proof_sha256: sha256(stableJson(proof)),
  };
}
