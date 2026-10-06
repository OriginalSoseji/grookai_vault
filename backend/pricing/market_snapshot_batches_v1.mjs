const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// The caller holds the existing publication lock. A completed qualification
// ledger is immutable; snapshots remain staging until full reconciliation.
// Restart from the first decision on retry: ON CONFLICT preserves completed
// pages and their original phase lineage without skipping holes.
export async function writeMarketSnapshotBatchesV1(client, {
  runId, expectedCount, batchSize = 500, insertBatch, onBatch = () => {},
}) {
  if (!UUID.test(runId ?? '') || !Number.isSafeInteger(expectedCount) || expectedCount < 0 ||
      !Number.isSafeInteger(batchSize) || batchSize < 1 || batchSize > 2000 || typeof insertBatch !== 'function') {
    throw new Error('Invalid snapshot batch configuration');
  }
  let cursor = null, selected = 0, inserted = 0, pages = 0;
  for (;;) {
    const { rows } = await client.query(
      `select id from public.market_price_qualification_decisions
       where run_id = $1 and eligible = true and decision = 'publish'
         and publication_lane = 'current'
         ${cursor ? 'and id > $2::uuid' : ''}
       order by id limit $${cursor ? 3 : 2}`,
      cursor ? [runId, cursor, batchSize] : [runId, batchSize],
    );
    if (rows.length > batchSize) throw new Error('Snapshot page exceeded bound');
    if (!rows.length) break;
    let last = cursor;
    const ids = rows.map(row => {
      if (!UUID.test(row.id ?? '') || (last !== null && row.id <= last)) {
        throw new Error('Snapshot decision cursor failed to advance');
      }
      last = row.id;
      return row.id;
    });
    if (selected + ids.length > expectedCount) throw new Error('Snapshot decision count exceeded frozen publication count');
    const count = await insertBatch(ids);
    if (!Number.isSafeInteger(count) || count < 0 || count > ids.length) throw new Error('Invalid snapshot insert count');
    selected += ids.length;
    inserted += count;
    pages += 1;
    cursor = last;
    await onBatch({ pages, selected, inserted, lastDecisionId: cursor });
  }
  if (selected !== expectedCount) throw new Error(`Snapshot decision count mismatch expected=${expectedCount} selected=${selected}`);
  return { pages, selected, inserted };
}
