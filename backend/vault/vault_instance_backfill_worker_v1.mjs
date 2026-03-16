import '../env.mjs';

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { createBackendClient } from '../supabase_backend_client.mjs';

const DEFAULT_LIMIT = 100;
const FETCH_PAGE_SIZE = 100;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_CHECKPOINT_PATH = path.join(
  __dirname,
  '.checkpoints',
  'vault_instance_backfill_worker_v1.json',
);

function parseArgs(argv = process.argv.slice(2)) {
  const opts = {
    limit: DEFAULT_LIMIT,
    dryRun: false,
    resume: false,
    checkpointPath: DEFAULT_CHECKPOINT_PATH,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--dry-run') {
      opts.dryRun = true;
      continue;
    }

    if (arg === '--resume') {
      opts.resume = true;
      continue;
    }

    if (arg === '--limit') {
      const next = Number.parseInt(argv[i + 1], 10);
      if (Number.isFinite(next) && next > 0) {
        opts.limit = next;
      }
      i += 1;
      continue;
    }

    if (arg.startsWith('--limit=')) {
      const next = Number.parseInt(arg.split('=')[1], 10);
      if (Number.isFinite(next) && next > 0) {
        opts.limit = next;
      }
      continue;
    }

    if (arg === '--checkpoint') {
      opts.checkpointPath = argv[i + 1] || opts.checkpointPath;
      i += 1;
      continue;
    }

    if (arg.startsWith('--checkpoint=')) {
      opts.checkpointPath = arg.split('=')[1] || opts.checkpointPath;
      continue;
    }
  }

  return opts;
}

async function loadCheckpoint(checkpointPath) {
  try {
    const raw = await fs.readFile(checkpointPath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

async function saveCheckpoint(checkpointPath, checkpoint) {
  await fs.mkdir(path.dirname(checkpointPath), { recursive: true });
  await fs.writeFile(checkpointPath, `${JSON.stringify(checkpoint, null, 2)}\n`, 'utf8');
}

function compareRowOrder(a, b) {
  const userCmp = String(a.user_id || '').localeCompare(String(b.user_id || ''));
  if (userCmp !== 0) return userCmp;

  const aCreated = a.created_at || '';
  const bCreated = b.created_at || '';
  if (aCreated < bCreated) return -1;
  if (aCreated > bCreated) return 1;

  return String(a.id || '').localeCompare(String(b.id || ''));
}

function shouldSkipBeforeCheckpoint(row, checkpoint) {
  if (!checkpoint || !checkpoint.last_processed_vault_item_id) {
    return false;
  }

  const marker = {
    user_id: checkpoint.last_processed_user_id || '',
    created_at: checkpoint.last_processed_created_at || '',
    id: checkpoint.last_processed_vault_item_id,
  };

  return compareRowOrder(row, marker) < 0;
}

async function fetchLegacyBucketBatch(supabase, from) {
  const to = from + FETCH_PAGE_SIZE - 1;
  const { data, error } = await supabase
    .from('vault_items')
    .select(`
      id,
      user_id,
      card_id,
      qty,
      acquisition_cost,
      condition_label,
      condition_score,
      is_graded,
      grade_company,
      grade_value,
      grade_label,
      notes,
      name,
      set_name,
      photo_url,
      market_price,
      last_price_update,
      image_source,
      image_url,
      image_back_source,
      image_back_url,
      created_at,
      archived_at
    `)
    .is('archived_at', null)
    .order('user_id', { ascending: true })
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })
    .range(from, to);

  if (error) {
    throw new Error(`legacy bucket fetch failed: ${error.message}`);
  }

  return data || [];
}

async function fetchExistingInstanceCounts(supabase, legacyVaultItemIds) {
  const counts = new Map();
  if (!legacyVaultItemIds.length) {
    return counts;
  }

  let from = 0;

  while (true) {
    const to = from + 999;
    const { data, error } = await supabase
      .from('vault_item_instances')
      .select('legacy_vault_item_id')
      .in('legacy_vault_item_id', legacyVaultItemIds)
      .order('legacy_vault_item_id', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to);

    if (error) {
      throw new Error(`instance count fetch failed: ${error.message}`);
    }

    if (!data || data.length === 0) {
      break;
    }

    for (const row of data) {
      const legacyId = row.legacy_vault_item_id;
      if (!legacyId) continue;
      counts.set(legacyId, (counts.get(legacyId) || 0) + 1);
    }

    if (data.length < 1000) {
      break;
    }

    from += 1000;
  }

  return counts;
}

async function fetchOwnerStateMap(supabase, userIds) {
  const map = new Map();
  if (!userIds.length) {
    return map;
  }

  const { data, error } = await supabase
    .from('vault_owners')
    .select('user_id,owner_code,next_instance_index')
    .in('user_id', userIds);

  if (error) {
    throw new Error(`owner state fetch failed: ${error.message}`);
  }

  for (const row of data || []) {
    map.set(row.user_id, {
      ownerCode: row.owner_code || null,
      nextInstanceIndex: Number(row.next_instance_index) || 1,
    });
  }

  return map;
}

function previewGvvi({ ownerState, userId, plannedAllocationsByUser }) {
  const planned = plannedAllocationsByUser.get(userId) || 0;
  const nextIndex = (ownerState?.nextInstanceIndex || 1) + planned;
  plannedAllocationsByUser.set(userId, planned + 1);

  if (!ownerState?.ownerCode) {
    return `GVVI-{new-owner-code}-${String(nextIndex).padStart(6, '0')}`;
  }

  return `GVVI-${ownerState.ownerCode}-${String(nextIndex).padStart(6, '0')}`;
}

function summarizeRpcRow(data) {
  if (Array.isArray(data)) {
    return data[0] || null;
  }
  return data || null;
}

async function createInstanceRow(supabase, bucketRow) {
  const rpcPayload = {
    p_user_id: bucketRow.user_id,
    p_card_print_id: bucketRow.card_id,
    p_legacy_vault_item_id: bucketRow.id,
    p_acquisition_cost: bucketRow.acquisition_cost,
    p_condition_label: bucketRow.condition_label,
    p_condition_score: bucketRow.condition_score,
    p_is_graded: bucketRow.is_graded,
    p_grade_company: bucketRow.grade_company,
    p_grade_value: bucketRow.grade_value,
    p_grade_label: bucketRow.grade_label,
    p_notes: bucketRow.notes,
    p_name: bucketRow.name,
    p_set_name: bucketRow.set_name,
    p_photo_url: bucketRow.photo_url,
    p_market_price: bucketRow.market_price,
    p_last_price_update: bucketRow.last_price_update,
    p_image_source: bucketRow.image_source,
    p_image_url: bucketRow.image_url,
    p_image_back_source: bucketRow.image_back_source,
    p_image_back_url: bucketRow.image_back_url,
    p_created_at: bucketRow.created_at,
    p_archived_at: bucketRow.archived_at,
  };

  const { data, error } = await supabase.rpc('admin_vault_instance_create_v1', rpcPayload);

  if (error) {
    throw new Error(`RPC admin_vault_instance_create_v1 failed: ${error.message}`);
  }

  const row = summarizeRpcRow(data);
  if (!row?.id || !row?.gv_vi_id) {
    throw new Error('RPC admin_vault_instance_create_v1 returned an invalid instance row');
  }

  return row;
}

function verificationQuery() {
  return `
select
  vi.legacy_vault_item_id,
  count(*) as instance_rows
from public.vault_item_instances vi
where vi.legacy_vault_item_id is not null
group by vi.legacy_vault_item_id
order by vi.legacy_vault_item_id;
`.trim();
}

async function runBackfill(options) {
  const supabase = createBackendClient();
  const checkpoint = options.resume ? await loadCheckpoint(options.checkpointPath) : null;
  const plannedAllocationsByUser = new Map();

  if (checkpoint) {
    console.log('[vault-instance-backfill-v1] resume checkpoint loaded', checkpoint);
  }

  let from = 0;
  let processedBucketRows = 0;
  let createdInstances = 0;
  let skippedAlreadyBackfilled = 0;

  while (processedBucketRows < options.limit) {
    const batch = await fetchLegacyBucketBatch(supabase, from);
    if (batch.length === 0) {
      break;
    }

    const candidateRows = checkpoint
      ? batch.filter((row) => !shouldSkipBeforeCheckpoint(row, checkpoint))
      : batch;

    if (candidateRows.length === 0) {
      from += FETCH_PAGE_SIZE;
      continue;
    }

    const legacyIds = candidateRows.map((row) => row.id);
    const userIds = [...new Set(candidateRows.map((row) => row.user_id).filter(Boolean))];
    const existingCounts = await fetchExistingInstanceCounts(supabase, legacyIds);
    const ownerStateMap = await fetchOwnerStateMap(supabase, userIds);

    for (const bucketRow of candidateRows) {
      if (processedBucketRows >= options.limit) {
        break;
      }

      processedBucketRows += 1;

      if (!bucketRow.card_id) {
        throw new Error(`vault_item ${bucketRow.id} is missing card_id`);
      }

      const desiredCopies = Number(bucketRow.qty) || 0;
      const existingCopyCount = existingCounts.get(bucketRow.id) || 0;

      if (desiredCopies <= 0) {
        console.log(
          `[vault-instance-backfill-v1] skip vault_item_id=${bucketRow.id} user_id=${bucketRow.user_id} reason=nonpositive_qty qty=${bucketRow.qty}`,
        );
        continue;
      }

      if (existingCopyCount >= desiredCopies) {
        skippedAlreadyBackfilled += 1;
        console.log(
          `[vault-instance-backfill-v1] skip vault_item_id=${bucketRow.id} user_id=${bucketRow.user_id} reason=already_backfilled existing=${existingCopyCount} qty=${desiredCopies}`,
        );
        continue;
      }

      for (let copyIndex = existingCopyCount + 1; copyIndex <= desiredCopies; copyIndex += 1) {
        if (options.dryRun) {
          const previewId = previewGvvi({
            ownerState: ownerStateMap.get(bucketRow.user_id) || null,
            userId: bucketRow.user_id,
            plannedAllocationsByUser,
          });

          console.log(
            `[vault-instance-backfill-v1][dry-run] user_id=${bucketRow.user_id} vault_item_id=${bucketRow.id} copy_index=${copyIndex}/${desiredCopies} expected_gvvi=${previewId} card_print_id=${bucketRow.card_id}`,
          );
          continue;
        }

        const created = await createInstanceRow(supabase, bucketRow);
        createdInstances += 1;

        console.log(
          `[vault-instance-backfill-v1] created user_id=${bucketRow.user_id} vault_item_id=${bucketRow.id} copy_index=${copyIndex}/${desiredCopies} gv_vi_id=${created.gv_vi_id} instance_id=${created.id}`,
        );

        await saveCheckpoint(options.checkpointPath, {
          last_processed_user_id: bucketRow.user_id,
          last_processed_created_at: bucketRow.created_at,
          last_processed_vault_item_id: bucketRow.id,
          last_copy_index: copyIndex,
          updated_at: new Date().toISOString(),
        });
      }
    }

    from += FETCH_PAGE_SIZE;
  }

  console.log(
    `[vault-instance-backfill-v1] complete dryRun=${options.dryRun} processed_bucket_rows=${processedBucketRows} created_instances=${createdInstances} skipped_already_backfilled=${skippedAlreadyBackfilled}`,
  );
  console.log('[vault-instance-backfill-v1] verification_query=');
  console.log(verificationQuery());
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  console.log('[vault-instance-backfill-v1] start', options);
  await runBackfill(options);
}

const isMain = (() => {
  if (!process.argv[1]) {
    return false;
  }
  try {
    return import.meta.url === pathToFileURL(process.argv[1]).href;
  } catch {
    return false;
  }
})();

if (isMain) {
  main().catch((error) => {
    console.error('[vault-instance-backfill-v1] failed:', error);
    process.exitCode = 1;
  });
}

export {
  DEFAULT_CHECKPOINT_PATH,
  parseArgs,
  previewGvvi,
  verificationQuery,
};
