import { randomUUID } from 'node:crypto';

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

// Sort decisions once: their source-order fields have no matching index.
// WITH HOLD also permits use outside a caller transaction; PostgreSQL can spill
// the result to temporary storage without retaining the ledger in Node.
async function* readDecisionBatches(client, runId, batchSize) {
  const cursor = `market_decisions_${randomUUID().replaceAll('-', '')}`;
  await client.query(`declare ${cursor} no scroll cursor with hold for
    select * from public.market_price_qualification_decisions where run_id = $1
    order by source_product_id, source_subtype_name, source_observation_id`, [runId]);
  try {
    for (;;) {
      const { rows } = await client.query(`fetch forward ${batchSize} from ${cursor}`);
      if (rows.length > batchSize) throw new Error('Ledger page exceeded bound');
      if (!rows.length) break;
      yield rows;
    }
  } finally {
    await client.query(`close ${cursor}`);
  }
}

// Candidate paging uses its existing run/product/subtype index and UUID ties.
export async function* readMarketLedgerBatchesV1(client, kind, runId, batchSize = 1000) {
  const query = queries[kind];
  if (!query || !Number.isSafeInteger(batchSize) || batchSize < 1 || batchSize > 10000) throw new Error('Invalid ledger paging configuration');
  if (kind === 'decisions') {
    yield* readDecisionBatches(client, runId, batchSize);
    return;
  }
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
