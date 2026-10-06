import assert from 'node:assert/strict';
import { assertMtgPublicAdditivePlanV1, mtgDigestV1 } from './mtg_public_additive_plan_v1.mjs';
import { captureMtgPromotionCollisionsV1, captureMtgPromotionExactReadbackV1, insertMtgPromotionRowsV1 } from './mtg_canonical_catalog_promotion_rollback_proof_v1.mjs';

// No connection factory, environment URL, CLI apply mode or COMMIT path exists.
// The caller must attest Docker identity, open a local transaction, and always roll it back.
export async function assertMtgRehearsalTargetV1(client) {
  const c = client.connectionParameters;
  assert.equal(c.host, '127.0.0.1');
  assert.equal(Number(c.port), 55000);
  assert.equal(c.database, 'postgres');
  assert.equal(c.user, 'postgres');
  const s = (await client.query(`select host(inet_server_addr()) address,
    current_setting('max_worker_processes') workers,
    current_setting('transaction_isolation') isolation,
    (select count(*)::int from supabase_migrations.schema_migrations) migrations`)).rows[0];
  assert.match(s.address, /^10\.248\.37\.\d+$/);
  assert.equal(s.workers, '0');
  assert.equal(s.migrations, 428);
  assert.equal(s.isolation, 'serializable');
}

export async function captureMtgPublicProtectedStateV1(client, plan) {
  assertMtgPublicAdditivePlanV1(plan);
  const tables = (await client.query(`select n.nspname schema_name,c.relname table_name
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname in ('public','auth','storage','supabase_migrations') and c.relkind in ('r','p')
    order by 1,2`)).rows;
  const quote = s => '"' + s.replaceAll('"', '""') + '"';
  const digests = {};
  for (const { schema_name: schema, table_name: table } of tables) {
    let where = '', params = [];
    if (schema === 'public' && plan.rows[table]) {
      if (table === 'external_mappings' || table === 'external_printing_mappings') {
        where = "where not (source||':'||external_id=any($1::text[]))";
        params = [plan.rows[table].map(r => r.source + ':' + r.external_id)];
      } else { where = 'where not(id=any($1::uuid[]))'; params = [plan.rows[table].map(r => r.id)]; }
    } else if (schema === 'public' && ['mtg_canonical_import_batches', 'mtg_canonical_import_rows'].includes(table)) {
      where = `where not(${table.endsWith('batches') ? 'id' : 'batch_id'}=any($1::uuid[]))`;
      params = [plan.stages.map(s => s.contract.batch_id)];
    }
    digests[schema + '.' + table] = (await client.query(`select count(*)::int count,
      encode(sha256(convert_to(coalesce(string_agg(h,'' order by h),''),'UTF8')),'hex') sha256
      from (select encode(sha256(convert_to(to_jsonb(t)::text,'UTF8')),'hex') h
        from ${quote(schema)}.${quote(table)} t ${where}) hashes`, params)).rows[0];
  }
  const security = (await client.query(`select n.nspname schema_name,c.relname,c.relrowsecurity,c.relforcerowsecurity,c.relacl::text,
    coalesce((select jsonb_agg(to_jsonb(p) order by policyname) from pg_policies p where p.schemaname=n.nspname and p.tablename=c.relname),'[]'::jsonb) policies
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname in ('public','auth','storage') and c.relkind in ('r','p') order by 1,2`)).rows;
  return { tables: digests, security_sha256: mtgDigestV1(security) };
}

async function stage(client, { payload: p, contract: c }) {
  const batch = await client.query(`insert into public.mtg_canonical_import_batches
    (id,payload_fingerprint_sha256,plan_version,source_bulk_sha256,foundation_migration_sha256,
     producing_commit_sha,producing_branch,selected_set_code,selected_set_name,status,row_counts,execution_boundaries)
    values ($1,$2,$3,$4,$5,$6,$7,$8,$9,'staged',$10::jsonb,$11::jsonb)`,
  [c.batch_id,p.writer_payload_fingerprint,p.plan_version,p.source_bulk_sha256,p.foundation_migration_sha256,
    p.repository.commit_sha,p.repository.branch,p.selected_set.code,p.selected_set.name,JSON.stringify(p.counts),JSON.stringify(p.boundaries)]);
  assert.equal(batch.rowCount, 1);
  const actualBatch = (await client.query(`select payload_fingerprint_sha256,plan_version,source_bulk_sha256,
    foundation_migration_sha256,producing_commit_sha,producing_branch,selected_set_code,selected_set_name,
    status,row_counts,execution_boundaries from public.mtg_canonical_import_batches where id=$1`, [c.batch_id])).rows;
  assert.deepEqual(actualBatch, [{ payload_fingerprint_sha256:p.writer_payload_fingerprint,plan_version:p.plan_version,
    source_bulk_sha256:p.source_bulk_sha256,foundation_migration_sha256:p.foundation_migration_sha256,
    producing_commit_sha:p.repository.commit_sha,producing_branch:p.repository.branch,selected_set_code:p.selected_set.code,
    selected_set_name:p.selected_set.name,status:'staged',row_counts:p.counts,execution_boundaries:p.boundaries }]);
  const inserted = await client.query(`insert into public.mtg_canonical_import_rows
    (id,batch_id,entity_type,row_key,row_ordinal,payload,payload_sha256)
    select id,batch_id,entity_type,row_key,row_ordinal,payload,payload_sha256
    from jsonb_to_recordset($1::jsonb) as r(id uuid,batch_id uuid,entity_type text,row_key text,row_ordinal int,payload jsonb,payload_sha256 text)`, [JSON.stringify(c.rows)]);
  assert.equal(inserted.rowCount, c.rows.length);
  const actual = (await client.query(`select id,batch_id,entity_type,row_key,row_ordinal,payload,payload_sha256
    from public.mtg_canonical_import_rows where batch_id=$1 order by entity_type,row_ordinal`, [c.batch_id])).rows;
  const sort = rows => [...rows].sort((a,b) => a.entity_type.localeCompare(b.entity_type) || a.row_ordinal-b.row_ordinal);
  assert.deepEqual(sort(actual), sort(c.rows), 'Staging readback drift');
}

export async function rehearseMtgPublicAdditiveInTransactionV1(client, plan) {
  assertMtgPublicAdditivePlanV1(plan);
  await assertMtgRehearsalTargetV1(client);
  const release = (await client.query("select release_status from public.catalog_game_release_controls where game_code='mtg'")).rows;
  assert.deepEqual(release, [{ release_status: 'public' }]);
  const collisions = await captureMtgPromotionCollisionsV1(client, plan.rows);
  assert.ok(Object.values(collisions).every(n => Number(n) === 0), 'Canonical collision or partial prior apply');
  const before = await captureMtgPublicProtectedStateV1(client, plan);
  for (const s of plan.stages) await stage(client, s);
  // Local rollback uses reserved negative surrogate mapping IDs to avoid advancing
  // a nontransactional production-style sequence in the retained database.
  // A production executor must separately qualify its actual mapping-ID allocation.
  const inserted = await insertMtgPromotionRowsV1(client, { ...plan.rows, external_mappings: [] });
  inserted.external_mappings = (await client.query(`insert into public.external_mappings
    (id,card_print_id,source,external_id,active,meta)
    select (-1000000000-row_number() over(order by external_id))::bigint,card_print_id,source,external_id,active,meta
    from jsonb_to_recordset($1::jsonb) as r(card_print_id uuid,source text,external_id text,active boolean,meta jsonb)`, [JSON.stringify(plan.rows.external_mappings)])).rowCount;
  assert.deepEqual(inserted, Object.fromEntries(Object.entries(plan.rows).map(([k,v]) => [k,v.length])));
  const exact = await captureMtgPromotionExactReadbackV1(client, plan.rows);
  for (const [table, check] of Object.entries(exact)) {
    assert.equal(Number(check.actual_count), plan.rows[table].length, table);
    assert.equal(Number(check.exact_count), plan.rows[table].length, table);
  }
  assert.deepEqual(await captureMtgPublicProtectedStateV1(client, plan), before, 'Existing data/security changed');
  assertMtgPublicAdditivePlanV1(plan);
  return { inserted, exact, protectedState: before, stagedRows: plan.stages.reduce((n,s) => n+s.contract.rows.length,0), stageBatches: plan.stages.length, plan_sha256: plan.plan_sha256, commitSupported: false };
}
