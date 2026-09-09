export function createCandidateStreamReconcilerV1(expectedSourceRunId, expectedCount) {
  if (!Number.isSafeInteger(expectedCount) || expectedCount < 0) throw new Error('Invalid expected candidate count');
  const seen = new Set();
  let first = null, last = null;
  return {
    accept(rows) {
      for (const row of rows) {
        const id = row.source_observation_id;
        if (!id || seen.has(id)) throw new Error('candidate reconciliation failed: missing or duplicate_source_observation_id');
        if (row.source_sync_run_id !== expectedSourceRunId) throw new Error('candidate reconciliation failed: source_sync_run_mismatch');
        seen.add(id);
        first ??= id;
        last = id;
      }
      if (seen.size > expectedCount) throw new Error('candidate reconciliation failed: candidate_count exceeded');
    },
    finish() {
      if (seen.size !== expectedCount) throw new Error(`candidate reconciliation failed: candidate_count:${seen.size}/${expectedCount}`);
      return { count: seen.size, first_source_observation_id: first, last_source_observation_id: last };
    },
  };
}

const queries = {
  candidates: {
    table: 'public.market_price_pipeline_candidates',
    columns: 'id, candidate_payload, source_product_id, source_subtype_name, source_observation_id',
  },
  decisions: { table: 'public.market_price_qualification_decisions', columns: '*' },
};

// Both ledgers are immutable, run-bound, and indexed by the leading cursor keys.
export async function* readMarketLedgerBatchesV1(client, kind, runId, batchSize = 1000) {
  const query = queries[kind];
  if (!query || !Number.isSafeInteger(batchSize) || batchSize < 1 || batchSize > 10000) throw new Error('Invalid ledger paging configuration');
  let cursor = null;
  for (;;) {
    const { rows } = await client.query(
      `select ${query.columns} from ${query.table}
       where run_id = $1
         ${cursor ? 'and (source_product_id, source_subtype_name, source_observation_id) > ($2::integer, $3::text, $4::uuid)' : ''}
       order by source_product_id, source_subtype_name, source_observation_id
       limit $${cursor ? 5 : 2}`,
      cursor ? [runId, ...cursor, batchSize] : [runId, batchSize],
    );
    if (rows.length > batchSize) throw new Error('Ledger page exceeded bound');
    if (!rows.length) break;
    const last = rows.at(-1);
    const next = [last.source_product_id, last.source_subtype_name, last.source_observation_id];
    if (next.some(value => value == null) || JSON.stringify(next) === JSON.stringify(cursor)) throw new Error('Invalid ledger cursor');
    yield rows;
    cursor = next;
  }
}

export function marketLedgerRowsV1(client, kind, runId) {
  return {
    async *[Symbol.asyncIterator]() {
      for await (const rows of readMarketLedgerBatchesV1(client, kind, runId)) yield* rows;
    },
  };
}
