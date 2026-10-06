// Read-only inspection; no production write or publication authority.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readJungleCatalogStateV5} from './jungle_edition_catalog_state_v5.mjs';

export const JUNGLE_HISTORY_AGGREGATE_V6 = 'select count(*)::bigint::text rows,md5(coalesce(string_agg(md5(t::text),\'\' order by md5(t::text)),\'\')) digest from public."justtcg_variant_price_snapshots" t where "card_print_id"=any($1::uuid[])';
export const JUNGLE_HISTORY_CURSOR_SQL_V6 = 'declare jungle_history_v6 no scroll cursor for select md5(t::text) digest from public.justtcg_variant_price_snapshots t where card_print_id=any($1::uuid[])';
const fetchSql = 'fetch forward 2000 from jungle_history_v6';
const closeSql = 'close jungle_history_v6';

// Intercept only the qualified V5 aggregate. All other protection queries remain
// byte-for-byte V5 queries. PostgreSQL hashes complete native records, preserving
// NULLs, numeric scale and nested JSON. Node sorts only fixed-width hex hashes.
export function jungleHistoryCursorClientV6(client, {onBatch = () => {}} = {}) {
  return {query: async (sql, args) => {
    if (sql !== JUNGLE_HISTORY_AGGREGATE_V6) return client.query(sql, args);
    assert.ok(Array.isArray(args) && args.length === 1);
    assert.ok(Array.isArray(args[0]) && args[0].length === 83);
    assert.equal(new Set(args[0]).size, 83, 'distinct_legacy_parents_required');
    for (const id of args[0]) assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    const hashes = [], started = Date.now();
    let opened = false, failure, batch = 0;
    try {
      await client.query(JUNGLE_HISTORY_CURSOR_SQL_V6, args);
      opened = true;
      for (;;) {
        assert.ok(Date.now() - started < 120000, 'history_inspection_time_bound');
        const start = Date.now(), result = await client.query(fetchSql);
        assert.ok(Array.isArray(result.rows) && result.rows.length <= 2000, 'history_batch_bound');
        for (const row of result.rows) {
          assert.deepEqual(Object.keys(row), ['digest']);
          assert.match(row.digest, /^[0-9a-f]{32}$/);
          hashes.push(row.digest);
        }
        assert.ok(hashes.length <= 250000, 'history_inspection_row_bound');
        onBatch({batch: ++batch, rows: result.rows.length, total: hashes.length, ms: Date.now() - start});
        if (result.rows.length === 0) break;
      }
      hashes.sort();
      return {rows: [{rows: String(hashes.length), digest: createHash('md5').update(hashes.join('')).digest('hex')}]};
    } catch (error) {
      failure = error;
      throw error;
    } finally {
      if (opened) {
        try { await client.query(closeSql); }
        catch (error) {
          // A transaction-aborted cleanup error must not hide a timeout or data
          // validation failure. The caller still owns transaction rollback.
          if (failure) failure.cursorCloseError = error.message;
          else throw error;
        }
      }
    }
  }};
}

export async function readJungleCatalogStateV6(client, rows, options) {
  const isolation = (await client.query('show transaction_isolation')).rows[0].transaction_isolation;
  assert.ok(['repeatable read', 'serializable'].includes(isolation), 'stable_inspection_transaction_required');
  return readJungleCatalogStateV5(jungleHistoryCursorClientV6(client, {onBatch: options.onBatch}), rows, options);
}
