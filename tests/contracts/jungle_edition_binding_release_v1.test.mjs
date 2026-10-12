import test from 'node:test';
import assert from 'node:assert/strict';
import {
  JUNGLE_BINDING_RELEASE_V1,
  attestJungleBindingTargetV1,
  assertJungleBindingReleaseV1,
  executeJungleBindingReleaseV1,
  jungleBindingFingerprintV1,
  readJungleBindingReleaseV1,
  sealJungleBindingReleaseV1,
} from '../../backend/pricing/jungle_edition_binding_release_v1.mjs';

const hex = (character) => character.repeat(64);
const uuid = (number) => `00000000-0000-4000-8000-${String(number).padStart(12, '0')}`;
const schemaState = Object.freeze({
  columns: [{ table_schema: 'public', table_name: 'card_prints', column_name: 'id' }],
  functions: [{ proname: 'tcgplayer_jungle_binding_valid_v1', args: 'p_binding_id uuid, p_require_active boolean' }],
  views: [{ relname: 'v_market_price_current_v1', definition: 'select 1' }],
  constraints: [{ relname: 'card_prints', conname: 'card_prints_pkey', definition: 'PRIMARY KEY (id)' }],
  triggers: [],
});
const securityState = Object.freeze({
  relations: [{ relname: 'card_prints', relkind: 'r', owner: 'postgres' }],
  policies: [],
  indexes: [{ tablename: 'card_prints', indexname: 'card_prints_pkey', indexdef: 'CREATE UNIQUE INDEX card_prints_pkey ON public.card_prints USING btree (id)' }],
  enums: [],
});

function target(overrides = {}) {
  return {
    environment: 'local_rehearsal',
    project_ref: null,
    connection_host: '127.0.0.1',
    connection_port: 55011,
    connection_database: 'jungle_binding_executor_430_20261011',
    connection_user: 'postgres',
    database_name: 'jungle_binding_executor_430_20261011',
    database_user: 'postgres',
    server_address: '10.248.37.5',
    server_version_num: 170006,
    database_oid: 16384,
    system_identifier: '7554084510398507592',
    migration_count: 430,
    migration_head: '20261008100000',
    schema_state_fingerprint: jungleBindingFingerprintV1(schemaState),
    security_state_fingerprint: jungleBindingFingerprintV1(securityState),
    ...overrides,
  };
}

function draft() {
  return {
    project_ref: 'ycdxbpibncqcchqiihfz',
    physical_manifest_fingerprint: hex('a'),
    physical_manifest_file_sha256: hex('b'),
    source_review_sha256: hex('c'),
    schema_capture_sha256: hex('d'),
    schema_security_sha256: hex('e'),
    target: target(),
    source_sync_run_id: uuid(900),
    source_finished_at: '2026-10-11T09:31:49.502Z',
    snapshot_at: '2026-10-11T20:19:39.884Z',
    rows: Array.from({ length: 128 }, (_, index) => ({
      id: uuid(index + 1),
      identity_link_id: uuid(index + 201),
      card_print_id: uuid(index + 401),
      card_printing_id: uuid(index + 601),
      gv_id: `GV-PK-JU-${index + 1}-${index % 2 ? 'FIRST-EDITION' : 'UNLIMITED'}`,
      edition: index % 2 ? 'first_edition' : 'unlimited',
      finish_key: index < 32 ? 'holo' : 'normal',
      product_id: 45000 + index,
      source_subtype: `${index % 2 ? '1st Edition' : 'Unlimited'}${index < 32 ? ' Holofoil' : ''}`,
      source_product_payload_hash: hex('1'),
      manifest_sha256: hex('a'),
      source_observation_id: uuid(index + 801),
      source_row_hash: hex('2'),
      source_artifact_id: uuid(999),
      expected_link_state: 'staged',
      binding_state: 'active',
    })),
  };
}

test('seals one exact 128-row Jungle binding release', () => {
  const plan = sealJungleBindingReleaseV1(draft(), { at: '2026-10-11T20:30:00.000Z' });
  assert.equal(plan.version, JUNGLE_BINDING_RELEASE_V1);
  assert.equal(plan.executable, true);
  assert.match(plan.plan_fingerprint, /^[a-f0-9]{64}$/);
  assert.equal(assertJungleBindingReleaseV1(plan, {
    expectedFingerprint: plan.plan_fingerprint,
    now: Date.parse('2026-10-11T20:31:00.000Z'),
  }), plan);
});

test('canonical fingerprint is independent of object key order', () => {
  assert.equal(jungleBindingFingerprintV1({ b: 2, a: { d: 4, c: 3 } }), jungleBindingFingerprintV1({ a: { c: 3, d: 4 }, b: 2 }));
});

test('rejects rehashed attempts to expand scope or change reviewed rows', () => {
  const plan = sealJungleBindingReleaseV1(draft(), { at: '2026-10-11T20:30:00.000Z' });
  const expanded = structuredClone(plan);
  expanded.boundaries.vault_writes = true;
  assert.throws(() => assertJungleBindingReleaseV1(expanded, { expectedFingerprint: plan.plan_fingerprint, allowExpiredSource: true }), /release_boundary_mismatch/);

  const changed = structuredClone(plan);
  changed.rows[0].source_product_payload_hash = hex('9');
  assert.throws(() => assertJungleBindingReleaseV1(changed, { expectedFingerprint: plan.plan_fingerprint, allowExpiredSource: true }), /plan_fingerprint_mismatch/);
});

test('requires a separately supplied reviewed fingerprint', () => {
  const plan = sealJungleBindingReleaseV1(draft(), { at: '2026-10-11T20:30:00.000Z' });
  assert.throws(() => assertJungleBindingReleaseV1(plan, { allowExpiredSource: true }), /expected_plan_fingerprint_required/);
  const resealed = structuredClone(plan);
  resealed.rows[0].source_row_hash = hex('9');
  resealed.plan_fingerprint = jungleBindingFingerprintV1({
    version: resealed.version,
    project_ref: resealed.project_ref,
    at: resealed.at,
    physical_manifest_fingerprint: resealed.physical_manifest_fingerprint,
    physical_manifest_file_sha256: resealed.physical_manifest_file_sha256,
    source_review_sha256: resealed.source_review_sha256,
    schema_capture_sha256: resealed.schema_capture_sha256,
    schema_security_sha256: resealed.schema_security_sha256,
    target: resealed.target,
    source_sync_run_id: resealed.source_sync_run_id,
    source_finished_at: resealed.source_finished_at,
    snapshot_at: resealed.snapshot_at,
    boundaries: resealed.boundaries,
    rows: resealed.rows,
  });
  resealed.review_ref = `${JUNGLE_BINDING_RELEASE_V1}:${resealed.plan_fingerprint}`;
  assert.throws(() => assertJungleBindingReleaseV1(resealed, {
    expectedFingerprint: plan.plan_fingerprint,
    allowExpiredSource: true,
  }), /expected_plan_fingerprint_mismatch/);
});

test('rejects duplicates, non-executable plans, and stale source evidence', () => {
  const plan = sealJungleBindingReleaseV1(draft(), { at: '2026-10-11T20:30:00.000Z' });
  const duplicate = structuredClone(plan);
  duplicate.rows[1].identity_link_id = duplicate.rows[0].identity_link_id;
  assert.throws(() => assertJungleBindingReleaseV1(duplicate, { expectedFingerprint: plan.plan_fingerprint, allowExpiredSource: true }), /duplicate_identity_link_id/);

  const disabled = structuredClone(plan);
  disabled.executable = false;
  assert.throws(() => assertJungleBindingReleaseV1(disabled, { expectedFingerprint: plan.plan_fingerprint, allowExpiredSource: true }), /plan_not_executable/);

  assert.throws(() => assertJungleBindingReleaseV1(plan, {
    expectedFingerprint: plan.plan_fingerprint,
    now: Date.parse('2026-10-13T20:30:00.000Z'),
  }), /source_evidence_stale_or_future/);
});

function targetClient(identityOverrides = {}, connectionOverrides = {}) {
  const identity = {
    database_name: 'jungle_binding_executor_430_20261011',
    database_user: 'postgres',
    server_address: '10.248.37.5',
    server_version_num: 170006,
    database_oid: 16384,
    system_identifier: '7554084510398507592',
    migration_count: 430,
    migration_head: '20261008100000',
    ...identityOverrides,
  };
  return {
    connectionParameters: {
      host: '127.0.0.1', port: 55011, database: 'jungle_binding_executor_430_20261011', user: 'postgres',
      ...connectionOverrides,
    },
    async query(sql) {
      if (sql.includes('pg_control_system()')) return { rows: [identity] };
      if (sql.includes('information_schema.columns')) return { rows: schemaState.columns };
      if (sql.includes("p.prokind in ('f','p')")) return { rows: schemaState.functions };
      if (sql.includes("c.relkind in ('v','m')")) return { rows: schemaState.views };
      if (sql.includes('from pg_constraint')) return { rows: schemaState.constraints };
      if (sql.includes('from pg_trigger')) return { rows: schemaState.triggers };
      if (sql.includes('aclexplode')) return { rows: securityState.relations };
      if (sql.includes('from pg_policies')) return { rows: securityState.policies };
      if (sql.includes('from pg_indexes')) return { rows: securityState.indexes };
      if (sql.includes('join pg_enum')) return { rows: securityState.enums };
      throw new Error(`unexpected_query:${sql}`);
    },
  };
}

test('attests the connected database and both sealed schema captures', async () => {
  const plan = sealJungleBindingReleaseV1(draft(), { at: '2026-10-11T20:30:00.000Z' });
  assert.deepEqual(await attestJungleBindingTargetV1(targetClient(), plan), plan.target);
  await assert.rejects(
    attestJungleBindingTargetV1(targetClient({ migration_head: '20261007150000' }), plan),
    /connected_database_attestation_mismatch/,
  );
  await assert.rejects(
    attestJungleBindingTargetV1(targetClient({}, { database: 'retained_clone_with_same_rows' }), plan),
    /connected_database_attestation_mismatch/,
  );
});

function exactReadbackClient(plan, { productHash = null, activeBindingCount = 128 } = {}) {
  const attestation = targetClient();
  const queries = [];
  return {
    ...attestation,
    queries,
    async query(sql, parameters) {
      queries.push(sql);
      if (/^begin isolation level serializable read only$/i.test(sql)) return { rows: [] };
      if (sql.startsWith('set local ') || sql.includes('pg_advisory_xact_lock')) return { rows: [] };
      if (sql === 'commit' || sql === 'rollback') return { rows: [] };
      if (sql.includes('select l.id::text identity_link_id')) return { rows: plan.rows.map((row) => ({
        identity_link_id: row.identity_link_id,
        card_print_id: row.card_print_id,
        card_printing_id: row.card_printing_id,
        gv_id: row.gv_id,
        edition: row.edition,
        finish_key: row.finish_key,
        state: 'active',
      })).sort((a, b) => a.identity_link_id.localeCompare(b.identity_link_id)) };
      if (sql.includes('select b.id::text,b.identity_link_id::text')) return { rows: plan.rows.map((row) => ({
        id: row.id,
        identity_link_id: row.identity_link_id,
        product_id: row.product_id,
        source_subtype: row.source_subtype,
        source_product_payload_hash: row.source_product_payload_hash,
        manifest_sha256: row.manifest_sha256,
        review_ref: plan.review_ref,
        state: 'active',
      })).sort((a, b) => a.id.localeCompare(b.id)) };
      if (sql.includes('select count(*)::int n from public.tcgplayer_jungle_edition_bindings_v1 b')) return { rows: [{ n: 128 }] };
      if (sql.includes('from public.tcgplayer_jungle_edition_assignments_v1')) return { rows: [{ n: 0 }] };
      if (sql.includes('product.payload_hash product_hash')) return { rows: plan.rows.map((row, index) => ({
        ...row,
        link_state: 'active',
        link_valid: true,
        product_hash: index === 0 && productHash ? productHash : row.source_product_payload_hash,
        source_active: true,
        catalog_metadata_status: 'current',
        observation_hash: row.source_row_hash,
        source_sync_run_id: plan.source_sync_run_id,
        observation_artifact_id: row.source_artifact_id,
        source_run_status: 'completed',
        failed_count: 0,
        finished_at: plan.source_finished_at,
        artifact_hash: hex('f'),
        http_status: 200,
        byte_size: 1,
      })) };
      if (sql.includes('tcgplayer_jungle_binding_valid_v1(id,true)')) return { rows: [{ n: activeBindingCount }] };
      return attestation.query(sql, parameters);
    },
  };
}

test('readback revalidates current source evidence and all active bindings', async () => {
  const plan = sealJungleBindingReleaseV1(draft(), { at: '2026-10-11T20:30:00.000Z' });
  const options = { plan, expectedFingerprint: plan.plan_fingerprint, mode: 'readback' };
  await assert.rejects(
    executeJungleBindingReleaseV1({ ...options, client: exactReadbackClient(plan, { productHash: hex('9') }) }),
    /source_product_hash_drift/,
  );
  await assert.rejects(
    executeJungleBindingReleaseV1({ ...options, client: exactReadbackClient(plan, { activeBindingCount: 127 }) }),
    /active_binding_validation_failed/,
  );
  const result = await executeJungleBindingReleaseV1({ ...options, client: exactReadbackClient(plan) });
  assert.equal(result.after, 'exact');
  assert.equal(result.independentReadback, true);
});

test('independent readback holds one serializable snapshot and release lock', async () => {
  const plan = sealJungleBindingReleaseV1(draft(), { at: '2026-10-11T20:30:00.000Z' });
  const expectedFingerprint = plan.plan_fingerprint;
  const client = exactReadbackClient(plan);
  const result = await readJungleBindingReleaseV1(client, plan, { expectedFingerprint });
  assert.equal(result.state, 'exact');
  assert.match(client.queries[0], /^begin isolation level serializable read only$/i);
  const attestationIndex = client.queries.findIndex((sql) => sql.includes('pg_control_system()'));
  const lockIndex = client.queries.findIndex((sql) => sql.includes('pg_advisory_xact_lock'));
  const stateIndex = client.queries.findIndex((sql) => sql.includes('select l.id::text identity_link_id'));
  assert.ok(attestationIndex > 0);
  assert.ok(lockIndex > attestationIndex);
  assert.ok(stateIndex > lockIndex);
  assert.equal(client.queries.at(-1), 'commit');

  const drifted = exactReadbackClient(plan, { productHash: hex('9') });
  await assert.rejects(
    readJungleBindingReleaseV1(drifted, plan, { expectedFingerprint }),
    /source_product_hash_drift/,
  );
  assert.equal(drifted.queries.at(-1), 'rollback');
});
