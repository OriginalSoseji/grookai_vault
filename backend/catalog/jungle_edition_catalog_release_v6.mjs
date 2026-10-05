// Separately versioned production staging engine. No binding or price publication.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash, X509Certificate} from 'node:crypto';
import {printingManifestHash as hash} from './printing_completeness_gate_v1.mjs';
import {buildJungleExecutionRows, readJungleExecutionSchema} from './jungle_edition_catalog_execution_v1.mjs';
import {readJungleCatalogStateV6} from './jungle_edition_catalog_state_v6.mjs';
import {reviewJungleEditionSourcesV4} from '../pricing/jungle_edition_source_review_v4.mjs';
import ledgerIds from './jungle_catalog_427_ledger.json' with {type: 'json'};
import qualification from './jungle_catalog_production_schema_v6.json' with {type: 'json'};

export const JUNGLE_RELEASE_EXECUTION_V6 = 'JUNGLE_EDITION_CATALOG_RELEASE_EXECUTION_V6';
export const JUNGLE_PROJECT_V6 = 'ycdxbpibncqcchqiihfz';
const HOST = 'aws-1-us-east-2.pooler.supabase.com';
export const JUNGLE_COUNTS_V6 = Object.freeze({raw_imports: 1, card_prints: 128, card_printings: 128, card_printing_truth_reviews: 128, card_print_species: 126, jungle_edition_identity_links_v1: 128});
const tables = Object.keys(JUNGLE_COUNTS_V6);
const boundaries = Object.freeze({updates: 0, deletes: 0, ownedCopyWrites: 0, sourceMappingWrites: 0, pricingWrites: 0, activeLinks: 0});
const sha = b => createHash('sha256').update(b).digest('hex');
const identifier = s => {assert.match(s, /^[a-z_][a-z0-9_]*$/); return '"' + s + '"';};
const utcTimestamp = value => {
  const match = String(value).match(/^(\d{4}-\d\d-\d\d)[T ](\d\d:\d\d:\d\d)(?:\.(\d{1,6}))?(?:Z|\+00(?::00)?)$/);
  assert.ok(match, 'full_precision_utc_timestamp_required');
  return match[1] + 'T' + match[2] + '.' + (match[3] ?? '').padEnd(6, '0') + 'Z';
};
const normalize = rows => [...rows].sort((a,b) => String(a.id).localeCompare(String(b.id))).map(row => Object.fromEntries(Object.entries(row).map(([k,v]) => [k, k.endsWith('_at') && v ? utcTimestamp(v) : v])));
// Historical node-postgres Date serialization retained only milliseconds. This
// comparison cannot invent the missing digits. The plan separately retains full
// current rows and native PostgreSQL record digests for transaction preservation.
export function assertJungleHistoricalRowsV6(current, historical, message = 'historical_record_drift') {
  const actual = normalize(current), expected = normalize(historical);
  const original = new Map(historical.map(row => [String(row.id), row]));
  const unrecordedSubmillisecondFields = [];
  for (const row of actual) for (const [key, value] of Object.entries(row)) {
    const reference = original.get(String(row.id))?.[key];
    if (key.endsWith('_at') && typeof reference === 'string' && /\.\d{3}Z$/.test(reference) && value != null) {
      if (value.slice(23,26) !== '000') unrecordedSubmillisecondFields.push({id:row.id,field:key});
      row[key] = value.slice(0,23) + '000Z';
    }
  }
  assert.deepEqual(actual, expected, message);
  return {comparison:'recorded_historical_precision',unrecordedSubmillisecondFields};
}
const signed = value => {const {fingerprint, ...body} = value; assert.equal(hash(body), fingerprint, 'fingerprint_mismatch'); return body;};
const fresh = (at, now, age = 3600000) => {const elapsed = now - Date.parse(at); assert.ok(Number.isFinite(elapsed) && elapsed >= 0 && elapsed < age, 'stale_or_future_evidence');};
const originalSnapshot = artifacts => JSON.parse(String(artifacts.get('jungle:production-snapshot')));
const bindings = artifacts => Object.fromEntries([...artifacts].sort(([a],[b]) => a.localeCompare(b)).map(([ref, bytes]) => [ref, sha(bytes)]));

export function jungleProducerV6() {
  const paths = [
    'scripts/audits/jungle_edition_catalog_release_v6.mjs',
    'backend/catalog/jungle_edition_catalog_release_v6.mjs', 'backend/catalog/jungle_catalog_schema_v6.sql', 'backend/catalog/jungle_catalog_production_schema_v6.json',
    'backend/catalog/jungle_edition_catalog_state_v6.mjs', 'backend/catalog/jungle_edition_catalog_state_v5.mjs', 'backend/catalog/jungle_edition_catalog_execution_v1.mjs',
    'backend/catalog/jungle_edition_master_authority_v1.mjs', 'backend/catalog/master_index_printing_authority_v1.mjs', 'backend/catalog/printing_completeness_gate_v1.mjs',
    'backend/catalog/jungle_catalog_427_ledger.json', 'backend/pricing/jungle_edition_source_review_v4.mjs', 'backend/pricing/tcgplayer_edition_identity_v1.mjs', 'scripts/audits/me04_finish_truth_v1.mjs',
  ];
  const files = Object.fromEntries(paths.map(p => [p, sha(fs.readFileSync(new URL('../../' + p, import.meta.url)))]));
  return {files, fingerprint: hash(files)};
}

// Preserve every schema definition/OID/ACL. Exclude only session/data counts and
// planner estimates, which are not schema and change during ordinary activity.
export function jungleSchemaProjectionV6(raw) {
  const {sanity, read_only, LEDGER, ...schema} = structuredClone(raw);
  assert.ok(sanity && ['on','off'].includes(read_only) && Array.isArray(LEDGER));
  schema.ALL_RELATIONS_QUERY = schema.ALL_RELATIONS_QUERY.map(({page_size_estimate, row_count_estimate, ...row}) => row);
  // Query result rows are an unordered multiset. Sort complete canonical rows;
  // retain duplicate rows and all nested array ordering (for example arguments).
  const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
  for (const [key, value] of Object.entries(schema)) if (Array.isArray(value)) {
    schema[key] = value.map(row => ({row, key: JSON.stringify(canonical(row))})).sort((a,b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0).map(({row}) => row);
  }
  return schema;
}

export function assertJungleConnectionV6(client, target) {
  const c = client.connectionParameters;
  assert.ok(['production','local_qualification'].includes(target), 'unknown_execution_target');
  assert.equal(c.database, 'postgres');
  if (target === 'local_qualification') {
    assert.equal(c.host, '127.0.0.1'); assert.equal(Number(c.port), 54800); assert.equal(c.user, 'postgres');
    return;
  }
  assert.equal(c.host, HOST); assert.ok([5432,6543].includes(Number(c.port))); assert.equal(c.user, 'postgres.' + JUNGLE_PROJECT_V6);
  assert.equal(c.ssl?.rejectUnauthorized, true); assert.equal(c.ssl.servername, HOST);
  assert.equal(client.connection?.stream?.authorized, true, 'verified_tls_required');
  assert.ok(Array.isArray(c.ssl.ca) && c.ssl.ca.length === 2, 'pinned_ca_chain_required');
  const certs = c.ssl.ca.map(pem => new X509Certificate(pem));
  assert.deepEqual(certs.map(c => sha(c.raw)), ['303b0a59bbc8d77e967fbed20b3fe68ec5d7d391c3081ece9936efceef0a55ea','807025ad50d4ed219d2c9c7d299c004f824eb00cf7f65afef607d07b72e6cafa']);
  for (const cert of certs) assert.ok(Date.parse(cert.validFrom) < Date.now() && Date.parse(cert.validTo) > Date.now());
  assert.ok(certs[0].verify(certs[1].publicKey) && certs[1].verify(certs[1].publicKey));
}

async function targetState(client, target) {
  assertJungleConnectionV6(client, target);
  const state = (await client.query("select current_database() database,session_user username,host(inet_server_addr()) address,current_setting('max_worker_processes') workers")).rows[0];
  assert.equal(state.database, 'postgres');
  if (target === 'local_qualification') {assert.match(state.address, /^10\.248\.35\.\d+$/); assert.equal(state.workers, '0'); assert.equal(state.username, 'postgres');}
  else assert.equal(state.username, 'postgres');
  return state;
}

function buildRows(manifest, artifacts, gameId) {
  const rows = buildJungleExecutionRows(manifest, artifacts, {asOf: originalSnapshot(artifacts).at, gameId});
  rows.raw_imports[0].notes = 'Reviewed Jungle base editions; bounded catalog staging only; no activation, publication or copy reassignment.';
  assert.deepEqual(Object.fromEntries(Object.entries(rows).map(([t,r]) => [t,r.length])), JUNGLE_COUNTS_V6);
  return rows;
}
function expectedRows(rows, schema) {
  // V5's display projection uses milliseconds. Independent native-record digests
  // below protect every planned field, including sub-millisecond timestamps.
  const display = rows => [...rows].sort((a,b) => String(a.id).localeCompare(String(b.id))).map(row => Object.fromEntries(Object.entries(row).map(([k,v]) => [k,k.endsWith('_at') && v ? new Date(v).toISOString() : v])));
  return Object.fromEntries(tables.map(t => [t, display(rows[t].map(row => Object.fromEntries(schema.columns.filter(c => c.table_name === t).map(c => [c.column_name, Object.hasOwn(row,c.column_name) ? row[c.column_name] : null]))))]));
}
async function environment(client, target) {
  const sql = fs.readFileSync(new URL('./jungle_catalog_schema_v6.sql', import.meta.url), 'utf8'); assert.equal(sha(sql), qualification.querySha256, 'qualified_schema_query_changed');
  const raw = (await client.query(sql)).rows[0].receipt;
  const ledger = (await client.query('select version,name,statements from supabase_migrations.schema_migrations order by version')).rows;
  assert.deepEqual(ledger.map(r => r.version), ledgerIds);
  const schema = await readJungleExecutionSchema(client), fullSchema = jungleSchemaProjectionV6(raw);
  if (target === 'production') {
    assert.ok(raw.sanity.cards >= 40000 && raw.sanity.sets >= 150 && raw.sanity.traits >= 5000, 'environment_sanity_failed');
    assert.equal(hash(fullSchema), qualification.fullSchemaFingerprint, 'unreviewed_production_schema');
    assert.equal(hash(ledger), qualification.ledgerFingerprint, 'released_ledger_statements_changed');
  }
  return {schema, fullSchema, ledger};
}
async function begin(client, readonly) {
  await client.query('begin isolation level serializable' + (readonly ? ' read only' : ''));
  await client.query("set local timezone='UTC';set local statement_timeout='15s';set local lock_timeout='2s'");
  if (readonly) assert.equal((await client.query('show transaction_read_only')).rows[0].transaction_read_only, 'on');
}
const digestSql = "select count(*)::int rows,md5(coalesce(string_agg(md5(t::text),'' order by md5(t::text)),'')) digest from ";
async function plannedDigests(client, plan, expected = false) {
  const digests = {};
  for (const table of tables) {
    const sql = expected ? digestSql + `jsonb_populate_recordset(null::public.${identifier(table)},$1::jsonb) t` : digestSql + `public.${identifier(table)} t where id::text=any($1::text[])`;
    digests[table] = (await client.query(sql, [expected ? JSON.stringify(plan.expected[table]) : plan.rows[table].map(r => String(r.id))])).rows[0];
  }
  return digests;
}
async function state(client, plan) {
  return {...await readJungleCatalogStateV6(client, plan.rows, {legacyParents: plan.legacyParents, legacyChildren: plan.legacyChildren}), selectedDigests: await plannedDigests(client, plan)};
}
async function auxiliaryState(client, plan) {
  const scopes = [
    ['sets',' where id=$1::uuid',[plan.rows.card_prints[0].set_id]],
    ['games',' where id=$1::uuid',[plan.gameId]],
    ['pokemon_species',' where id=any($1::uuid[])',[plan.retained.species.map(r => r.id)]],
    ['catalog_set_release_controls',' where set_id=$1::uuid',[plan.rows.card_prints[0].set_id]],
    ['catalog_game_release_controls'," where lower(game_code)='pokemon'",[]],
    ['tcgplayer_jungle_edition_bindings_v1','',[]],
    ['tcgplayer_jungle_edition_assignments_v1','',[]],
    ['jungle_slab_intake_receipts_v1','',[]],
    ['vendor_sales_trade_control','',[]],
  ];
  const result = {};
  for (const [table, where, args] of scopes) result[table] = (await client.query(digestSql + 'public.' + identifier(table) + ' t' + where, args)).rows[0];
  return result;
}
function classify(plan, current) {
  assert.deepEqual(current.foreignKeys, plan.before.foreignKeys, 'dependency_inventory_drift');
  assert.deepEqual(current.footprints, plan.before.footprints, 'protected_records_drift');
  if (tables.every(t => current.selected[t].length === 0)) {assert.ok(tables.every(t => current.selectedDigests[t].rows === 0)); return 'before';}
  assert.deepEqual(current.selected, plan.expected, 'partial_or_conflicting_execution');
  assert.deepEqual(current.selectedDigests, plan.expectedDigests, 'planned_native_record_drift');
  return 'exact';
}

export function assertJunglePlanV6(plan, {manifest, artifacts, sourceArtifacts = new Map(), readback = false, now = Date.now()} = {}) {
  signed(plan); assert.equal(plan.version, JUNGLE_RELEASE_EXECUTION_V6); assert.ok(['production','local_qualification'].includes(plan.target));
  assert.equal(plan.project_ref, plan.target === 'production' ? JUNGLE_PROJECT_V6 : null);
  assert.equal(plan.activation, false); assert.deepEqual(plan.boundaries, boundaries); assert.deepEqual(plan.counts, JUNGLE_COUNTS_V6);
  if (!readback) fresh(plan.at, now);
  assert.equal(Date.parse(plan.expiresAt), Date.parse(plan.at) + 3600000);
  assert.equal(plan.manifestFingerprint, manifest.fingerprint); assert.deepEqual(plan.artifacts, bindings(artifacts));
  assert.deepEqual(plan.producer, jungleProducerV6(), 'producer_changed');
  assert.deepEqual(plan.rows, buildRows(manifest, artifacts, plan.gameId));
  assert.deepEqual(plan.expected, expectedRows(plan.rows, plan.environment.schema));
  assert.deepEqual(Object.keys(plan.expectedDigests).sort(), [...tables].sort());
  for (const table of tables) {assert.equal(plan.expectedDigests[table].rows, JUNGLE_COUNTS_V6[table]); assert.match(plan.expectedDigests[table].digest, /^[a-f0-9]{32}$/);}
  assert.deepEqual(plan.environment.ledger.map(r => r.version), ledgerIds);
  assert.deepEqual(plan.legacyParents, originalSnapshot(artifacts).cards.map(r => r.id));
  assert.deepEqual(plan.legacyChildren, originalSnapshot(artifacts).printings.map(r => r.id));
  const original = originalSnapshot(artifacts);
  assert.deepEqual(plan.historicalPrecision, {
    cards: assertJungleHistoricalRowsV6(plan.retained.cards, original.cards.map(r=>({...r,game_id:plan.gameId}))),
    printings: assertJungleHistoricalRowsV6(plan.retained.printings, original.printings),
    species: assertJungleHistoricalRowsV6(plan.retained.species, original.species),
  });
  assert.equal(plan.before.foreignKeys.length, 89); assert.equal(plan.before.footprints.length, 104);
  assert.ok(tables.every(t => plan.before.selected[t].length === 0), 'plan_initial_collision');
  if (plan.target === 'production') {
    assert.equal(plan.gameId, originalSnapshot(artifacts).cards[0].game_id);
    assert.equal(hash(plan.environment.fullSchema), qualification.fullSchemaFingerprint);
    assert.equal(hash(plan.environment.ledger), qualification.ledgerFingerprint);
    assert.deepEqual(plan.sourceArtifactHashes, bindings(sourceArtifacts));
    const review = reviewJungleEditionSourcesV4({manifest, snapshot: plan.sourceCapture, artifactBytes: sourceArtifacts, asOf: readback ? plan.at : new Date(now).toISOString()});
    assert.equal(review.summary.compatible, 128); assert.equal(review.summary.held, 0);
    assert.equal(hash(plan.before.footprints), plan.accountReview.currentFootprintsFingerprint);
    assert.ok(['pending','explicit_baseline_acceptance'].includes(plan.accountReview.status));
    if (plan.accountReview.status === 'pending') assert.deepEqual(plan.reviewHolds, ['global:vault_item_instances']);
    else {
      assert.deepEqual(plan.reviewHolds, []);
      assert.ok(plan.accountReview.approvalRecordRef?.trim());
      assert.ok(plan.accountReview.approvalText?.includes(plan.accountReview.currentFootprintsFingerprint), 'exact_account_baseline_acceptance_required');
      fresh(plan.accountReview.at, Date.parse(plan.at));
    }
  } else {
    assert.equal(plan.sourceCapture, null); assert.equal(plan.accountReview, null); assert.deepEqual(plan.reviewHolds, []);
  }
}

export function assertJungleAuthorityV6(authority, plan, mode, now = Date.now()) {
  assert.ok(['rollback','apply'].includes(mode)); assert.equal(plan.target, 'production');
  assert.deepEqual(plan.reviewHolds, [], 'account_review_pending');
  signed(authority); assert.equal(authority.version, 'JUNGLE_CATALOG_RELEASE_AUTHORITY_V6');
  assert.equal(authority.status, 'explicit_founder_approval'); assert.equal(authority.project_ref, JUNGLE_PROJECT_V6);
  assert.equal(authority.planFingerprint, plan.fingerprint); assert.equal(authority.producerFingerprint, plan.producer.fingerprint);
  assert.deepEqual(authority.counts, JUNGLE_COUNTS_V6); assert.deepEqual(authority.boundaries, boundaries);
  assert.ok(Array.isArray(authority.modes) && authority.modes.includes(mode) && authority.modes.every(m => ['rollback','apply'].includes(m)));
  assert.ok(authority.approvalRecordRef?.trim());
  assert.ok(authority.approvalText?.includes(plan.fingerprint) && authority.approvalText.includes(plan.producer.fingerprint), 'exact_plan_and_producer_approval_required');
  assert.equal(authority.approvalRecordSha256, sha(Buffer.from(authority.approvalText)), 'original_approval_record_hash_required');
  fresh(authority.approvedAt, now); assert.ok(Date.parse(authority.expiresAt) > now && Date.parse(authority.expiresAt) <= Date.parse(plan.expiresAt));
}
export function assertJungleRollbackV6(receipt, plan, authority, now = Date.now()) {
  signed(receipt); assert.equal(receipt.version, JUNGLE_RELEASE_EXECUTION_V6); assert.equal(receipt.target, 'production'); assert.equal(receipt.project_ref, JUNGLE_PROJECT_V6);
  assert.equal(receipt.mode, 'rollback'); assert.equal(receipt.planFingerprint, plan.fingerprint); assert.equal(receipt.producerFingerprint, plan.producer.fingerprint); assert.equal(receipt.authorityFingerprint, authority.fingerprint);
  assert.equal(receipt.before, 'before'); assert.equal(receipt.after, 'exact'); assert.deepEqual(receipt.writes, JUNGLE_COUNTS_V6);
  assert.equal(receipt.rollbackProven, true); assert.equal(receipt.independentReadback, true); assert.equal(receipt.dependenciesPreserved, true);
  assert.equal(receipt.committed, false); assert.equal(receipt.commitUncertain, false); assert.equal(receipt.rollbackUncertain, false); assert.equal(receipt.activation, false);
  fresh(receipt.finishedAt, now);
}

export async function freezeJungleReleaseV6({client, manifest, artifacts, target, sourceCapture = null, sourceArtifacts = new Map(), accountReview = null}) {
  await targetState(client, target); await begin(client, true);
  try {
    const game = (await client.query("select id from games where code='pokemon'")).rows; assert.equal(game.length, 1);
    const snapshot = originalSnapshot(artifacts), rows = buildRows(manifest, artifacts, game[0].id), env = await environment(client, target);
    const plan = {version: JUNGLE_RELEASE_EXECUTION_V6, target, project_ref: target === 'production' ? JUNGLE_PROJECT_V6 : null, at: new Date().toISOString(), producer: jungleProducerV6(), manifestFingerprint: manifest.fingerprint,
      artifacts: bindings(artifacts), gameId: game[0].id, rows, counts: JUNGLE_COUNTS_V6, expected: expectedRows(rows, env.schema), environment: env,
      legacyParents: snapshot.cards.map(r => r.id), legacyChildren: snapshot.printings.map(r => r.id), sourceCapture, sourceArtifactHashes: bindings(sourceArtifacts), accountReview, reviewHolds: target === 'production' && accountReview?.status !== 'explicit_baseline_acceptance' ? ['global:vault_item_instances'] : [], activation: false, boundaries};
    plan.expiresAt = new Date(Date.parse(plan.at) + 3600000).toISOString(); plan.expectedDigests = await plannedDigests(client, plan, true); plan.before = await state(client, plan);
    const retained = {
      cards: (await client.query('select to_jsonb(t) row from card_prints t where set_id=$1 order by id', [manifest.authority.set_id])).rows.map(r => r.row),
      printings: (await client.query('select to_jsonb(t) row from card_printings t where card_print_id=any($1::uuid[]) order by id', [plan.legacyParents])).rows.map(r => r.row),
      species: (await client.query('select to_jsonb(t) row from pokemon_species t where id=any($1::uuid[]) order by id', [snapshot.species.map(r => r.id)])).rows.map(r => r.row),
    };
    plan.historicalPrecision = {
      cards: assertJungleHistoricalRowsV6(retained.cards, snapshot.cards.map(r => ({...r, game_id: plan.gameId})), 'retained_parent_drift'),
      printings: assertJungleHistoricalRowsV6(retained.printings, snapshot.printings, 'retained_child_drift'),
      species: assertJungleHistoricalRowsV6(retained.species, snapshot.species, 'species_authority_drift'),
    };
    plan.retained = retained;
    assert.deepEqual((await client.query('select id,code,game,identity_model from sets where id=$1',[manifest.authority.set_id])).rows,[{id:manifest.authority.set_id,code:'base2',game:'pokemon',identity_model:'standard'}]);
    plan.auxiliary = await auxiliaryState(client, plan);
    for (const table of ['tcgplayer_jungle_edition_bindings_v1','tcgplayer_jungle_edition_assignments_v1','jungle_slab_intake_receipts_v1']) assert.equal(plan.auxiliary[table].rows, 0, 'inactive_release_required');
    if (target === 'production') {
      plan.accountReview = accountReview ?? {status:'pending',currentFootprintsFingerprint:hash(plan.before.footprints),at:plan.at,reason:'V41 historical saved-copy review remains unresolved'};
      assert.equal(plan.accountReview.currentFootprintsFingerprint, hash(plan.before.footprints));
    }
    plan.fingerprint = hash(plan); assertJunglePlanV6(plan, {manifest, artifacts, sourceArtifacts});
    await client.query('rollback'); return plan;
  } catch (error) {try {await client.query('rollback');} catch {error.rollbackUncertain = true;} throw error;}
}

async function verifyEnvironment(client, plan) {
  assert.deepEqual(await environment(client, plan.target), plan.environment, 'schema_or_ledger_drift');
  assert.deepEqual(await plannedDigests(client, plan, true), plan.expectedDigests, 'expected_record_projection_drift');
  assert.deepEqual((await client.query("select id from games where code='pokemon'")).rows, [{id: plan.gameId}], 'game_registry_drift');
  const species = (await client.query('select to_jsonb(t) row from pokemon_species t where id=any($1::uuid[]) order by id', [plan.retained.species.map(r => r.id)])).rows.map(r => r.row);
  assert.deepEqual(species, plan.retained.species, 'species_authority_drift');
  assert.deepEqual(await auxiliaryState(client, plan), plan.auxiliary, 'auxiliary_records_drift');
}
async function independentReadback(client, plan, expected) {
  try {await begin(client, true); await verifyEnvironment(client, plan); const actual = await state(client, plan); assert.equal(classify(plan, actual), expected, 'independent_readback_mismatch'); await client.query('rollback'); return actual;}
  catch (error) {try {await client.query('rollback');} catch {error.rollbackUncertain = true;} throw error;}
}

export async function executeJungleReleaseV6({client, plan, expectedFingerprint, manifest, artifacts, sourceArtifacts = new Map(), mode, authority, rollbackReceipt, onPhase}) {
  assert.ok(['preflight','rollback','apply','readback'].includes(mode)); assert.equal(plan.fingerprint, expectedFingerprint);
  const validate = () => {
    assertJunglePlanV6(plan, {manifest, artifacts, sourceArtifacts, readback: mode === 'readback'});
    if (plan.target === 'production' && ['rollback','apply'].includes(mode)) {
      assertJungleAuthorityV6(authority, plan, mode);
      if (mode === 'apply') assertJungleRollbackV6(rollbackReceipt, plan, authority);
    }
  };
  validate(); assert.ok(!onPhase || plan.target === 'local_qualification', 'production_test_callback_forbidden');
  await targetState(client, plan.target);
  let commitAttempted = false, committed = false, transactionOpen = false;
  try {
    transactionOpen = true; await begin(client, ['preflight','readback'].includes(mode));
    if (['rollback','apply'].includes(mode)) {
      await client.query('select pg_advisory_xact_lock(hashtextextended($1,0))', ['JUNGLE_EDITION_CATALOG_RELEASE_EXECUTION_V2']);
      await client.query('lock table ' + tables.map(t => 'public.' + identifier(t)).join(',') + ' in share row exclusive mode');
      await client.query('select id from card_prints where set_id=$1 order by id for update', [manifest.authority.set_id]);
    }
    await verifyEnvironment(client, plan);
    const before = classify(plan, await state(client, plan)); if (mode === 'readback') assert.equal(before, 'exact');
    const writes = Object.fromEntries(tables.map(t => [t,0]));
    if (before === 'before' && ['rollback','apply'].includes(mode)) {
      for (const t of tables) {
        const fields = Object.keys(plan.rows[t][0]).filter(k => plan.environment.schema.columns.find(c => c.table_name === t && c.column_name === k)?.is_generated === 'NEVER').map(identifier).join(',');
        writes[t] = (await client.query(`insert into public.${identifier(t)}(${fields}) select ${fields} from jsonb_populate_recordset(null::public.${identifier(t)},$1::jsonb)`, [JSON.stringify(plan.rows[t])])).rowCount;
        assert.equal(writes[t], JUNGLE_COUNTS_V6[t]); await onPhase?.(t);
      }
    }
    validate(); await verifyEnvironment(client, plan); const after = classify(plan, await state(client, plan));
    if (mode !== 'preflight' || before === 'exact') assert.equal(after, 'exact');
    if (mode === 'apply') {
      await onPhase?.('before_commit'); validate(); await verifyEnvironment(client, plan); assert.equal(classify(plan, await state(client, plan)), 'exact'); validate();
      commitAttempted = true; await client.query('commit'); committed = true; transactionOpen = false;
    } else {await client.query('rollback'); transactionOpen = false;}
    let independent = false;
    if (['rollback','apply'].includes(mode)) {await independentReadback(client, plan, mode === 'rollback' ? before : 'exact'); independent = true;}
    const result = {version: JUNGLE_RELEASE_EXECUTION_V6, target: plan.target, project_ref: plan.project_ref, mode, before, after, writes, planFingerprint: plan.fingerprint, producerFingerprint: plan.producer.fingerprint,
      authorityFingerprint: authority?.fingerprint ?? null, rollbackProven: mode === 'rollback' && independent, independentReadback: independent, dependenciesPreserved: true, committed, commitUncertain: false, rollbackUncertain: false, activation: false, finishedAt: new Date().toISOString()};
    return {...result, fingerprint: hash(result)};
  } catch (error) {
    if (transactionOpen) {try {await client.query('rollback');} catch {error.rollbackUncertain = true;}}
    error.commitUncertain = commitAttempted && !committed; error.committed = committed; error.independentReadbackRequired = commitAttempted;
    throw error;
  }
}
