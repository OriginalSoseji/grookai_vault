import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { Client } from 'pg';

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, '').split('=');
    return [key, rest.length === 0 ? true : rest.join('=')];
  }),
);

const targetUserId = String(args['target-user-id'] ?? '').trim();
const apply = args.apply === true;
const planPath = String(args.plan ?? '').trim();
const expectedPlanHash = String(args['expected-plan-hash'] ?? '').trim();
const outputDir = path.resolve(
  String(args['output-dir'] ?? 'docs/audits/vault_single_copy_repair_v1'),
);

if (!process.env.SUPABASE_DB_URL) {
  throw new Error('SUPABASE_DB_URL is required.');
}
if (!/^[0-9a-f-]{36}$/i.test(targetUserId)) {
  throw new Error('--target-user-id must be an explicit UUID.');
}
if (apply && (!planPath || !/^[0-9a-f]{64}$/i.test(expectedPlanHash))) {
  throw new Error('--apply requires --plan and --expected-plan-hash.');
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stable(value[key])]),
    );
  }
  return value;
}

function fingerprint(value) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(stable(value)))
    .digest('hex');
}

function identityKey(row) {
  if (row.slab_cert_id) return `slab:${row.slab_cert_id}`;
  if (row.card_printing_id) return `printing:${row.card_printing_id}`;
  return `unassigned:${row.resolved_card_print_id}`;
}

function importance(row) {
  const publicIntent = ['sell', 'trade', 'showcase'].includes(row.intent);
  return (
    Number(row.active_binder_count) * 1_000_000 +
    Number(row.wall_section_ids.length > 0) * 500_000 +
    Number(row.asking_price_amount != null) * 100_000 +
    Number(publicIntent) * 50_000 +
    Number(row.card_printing_id != null) * 20_000 +
    Number(row.slab_cert_id != null) * 20_000 +
    Number(row.photo_url || row.image_url) * 10_000 +
    Number(String(row.notes ?? '').trim().length > 0) * 5_000 +
    Number(row.acquisition_cost != null) * 2_000 +
    Number(row.condition_score != null) * 1_000 +
    Number(row.condition_label != null) * 500 +
    Number(row.all_binder_count) * 100 +
    Number(row.want_match_count) * 10
  );
}

async function loadState(client) {
  const instances = await client.query(
    `
      select
        vii.id,
        vii.user_id,
        vii.gv_vi_id,
        vii.card_print_id,
        coalesce(vii.card_print_id, sc.card_print_id) as resolved_card_print_id,
        vii.card_printing_id,
        vii.slab_cert_id,
        vii.legacy_vault_item_id,
        vii.acquisition_cost,
        vii.condition_label,
        vii.condition_score,
        vii.notes,
        vii.photo_url,
        vii.image_url,
        vii.intent,
        vii.asking_price_amount,
        vii.asking_price_currency,
        vii.created_at,
        cp.name,
        cp.set_code,
        cp.number
      from public.vault_item_instances vii
      left join public.slab_certs sc on sc.id = vii.slab_cert_id
      join public.card_prints cp
        on cp.id = coalesce(vii.card_print_id, sc.card_print_id)
      where vii.user_id = $1
        and vii.archived_at is null
      order by vii.id
    `,
    [targetUserId],
  );

  const ids = instances.rows.map((row) => row.id);
  const walls = ids.length
    ? await client.query(
        `select vault_item_instance_id, section_id
         from public.wall_section_memberships
         where vault_item_instance_id = any($1::uuid[])
         order by vault_item_instance_id, section_id`,
        [ids],
      )
    : { rows: [] };
  const binders = ids.length
    ? await client.query(
        `select vault_item_instance_id,
                count(*)::int as all_count,
                count(*) filter (where state in ('active', 'pending'))::int as active_count
         from public.binder_contributions
         where vault_item_instance_id = any($1::uuid[])
         group by vault_item_instance_id`,
        [ids],
      )
    : { rows: [] };
  const wants = ids.length
    ? await client.query(
        `select instance_id, count(*)::int as match_count
         from public.want_matches
         where instance_id = any($1::uuid[])
           and status not in ('stale', 'dismissed')
         group by instance_id`,
        [ids],
      )
    : { rows: [] };

  const wallById = new Map();
  for (const row of walls.rows) {
    const values = wallById.get(row.vault_item_instance_id) ?? [];
    values.push(row.section_id);
    wallById.set(row.vault_item_instance_id, values);
  }
  const binderById = new Map(
    binders.rows.map((row) => [row.vault_item_instance_id, row]),
  );
  const wantById = new Map(
    wants.rows.map((row) => [row.instance_id, Number(row.match_count)]),
  );

  return instances.rows.map((row) => ({
    ...row,
    wall_section_ids: wallById.get(row.id) ?? [],
    active_binder_count: Number(binderById.get(row.id)?.active_count ?? 0),
    all_binder_count: Number(binderById.get(row.id)?.all_count ?? 0),
    want_match_count: wantById.get(row.id) ?? 0,
  }));
}

function sourceFingerprint(rows) {
  return fingerprint(
    rows.map((row) => ({
      id: row.id,
      gv_vi_id: row.gv_vi_id,
      resolved_card_print_id: row.resolved_card_print_id,
      card_printing_id: row.card_printing_id,
      slab_cert_id: row.slab_cert_id,
      legacy_vault_item_id: row.legacy_vault_item_id,
      intent: row.intent,
      asking_price_amount: row.asking_price_amount,
      condition_label: row.condition_label,
      condition_score: row.condition_score,
      notes: row.notes,
      photo_url: row.photo_url,
      image_url: row.image_url,
      wall_section_ids: row.wall_section_ids,
      active_binder_count: row.active_binder_count,
      all_binder_count: row.all_binder_count,
      want_match_count: row.want_match_count,
    })),
  );
}

function buildSelection(rows) {
  const groups = new Map();
  for (const row of rows) {
    const key = `${row.resolved_card_print_id}|${identityKey(row)}`;
    const values = groups.get(key) ?? [];
    values.push(row);
    groups.set(key, values);
  }

  const repairs = [];
  for (const [key, values] of groups) {
    if (values.length < 2) continue;
    const ranked = [...values].sort(
      (a, b) =>
        importance(b) - importance(a) ||
        String(a.created_at).localeCompare(String(b.created_at)) ||
        a.gv_vi_id.localeCompare(b.gv_vi_id) ||
        a.id.localeCompare(b.id),
    );
    const [survivor, ...extras] = ranked;
    repairs.push({
      group_key: key,
      card_print_id: survivor.resolved_card_print_id,
      identity_key: identityKey(survivor),
      card: {
        name: survivor.name,
        set_code: survivor.set_code,
        number: survivor.number,
      },
      survivor: {
        instance_id: survivor.id,
        gv_vi_id: survivor.gv_vi_id,
        importance: importance(survivor),
        wall_section_ids: survivor.wall_section_ids,
        active_binder_count: survivor.active_binder_count,
      },
      archive: extras.map((row) => ({
        instance_id: row.id,
        gv_vi_id: row.gv_vi_id,
        importance: importance(row),
        wall_section_ids: row.wall_section_ids,
        active_binder_count: row.active_binder_count,
      })),
    });
  }
  return repairs.sort((a, b) => a.group_key.localeCompare(b.group_key));
}

function planCore(rows) {
  const repairs = buildSelection(rows);
  const archiveCount = repairs.reduce((sum, group) => sum + group.archive.length, 0);
  const exactIdentityCount = new Set(
    rows.map((row) => `${row.resolved_card_print_id}|${identityKey(row)}`),
  ).size;
  return {
    contract_version: 'VAULT_SINGLE_COPY_REPAIR_V1',
    target_user_id: targetUserId,
    mutation_boundary: {
      hard_deletes: false,
      archive_exact_instances_only: true,
      preserve_distinct_card_printings: true,
      preserve_unique_slab_certificates: true,
      merge_wall_sections_to_survivor: true,
      binder_lifecycle: 'governed_archive_trigger',
    },
    preflight: {
      active_rows: rows.length,
      exact_identity_count: exactIdentityCount,
      duplicate_identity_groups: repairs.length,
      archive_count: archiveCount,
      expected_active_rows: rows.length - archiveCount,
      source_fingerprint: sourceFingerprint(rows),
    },
    repairs,
  };
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function createPlan(client) {
  const rows = await loadState(client);
  const core = planCore(rows);
  const plan = { ...core, plan_hash: fingerprint(core) };
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const directory = path.join(outputDir, `${stamp}_plan`);
  const destination = path.join(directory, 'run_plan.json');
  await writeJson(destination, plan);
  console.log(
    JSON.stringify({
      mode: 'plan',
      plan_path: destination,
      plan_hash: plan.plan_hash,
      ...plan.preflight,
    }),
  );
}

async function applyPlan(client) {
  const parsed = JSON.parse(await fs.readFile(path.resolve(planPath), 'utf8'));
  const { plan_hash: recordedHash, ...core } = parsed;
  const actualHash = fingerprint(core);
  if (recordedHash !== actualHash || expectedPlanHash !== actualHash) {
    throw new Error('plan_hash_mismatch');
  }
  if (parsed.target_user_id !== targetUserId) {
    throw new Error('target_user_mismatch');
  }

  await client.query('begin');
  try {
    await client.query(
      "select pg_advisory_xact_lock(hashtextextended('vault_single_copy_repair:' || $1, 0))",
      [targetUserId],
    );
    const before = await loadState(client);
    if (sourceFingerprint(before) !== parsed.preflight.source_fingerprint) {
      throw new Error('source_state_changed_since_plan');
    }
    const rebuilt = planCore(before);
    if (fingerprint(rebuilt.repairs) !== fingerprint(parsed.repairs)) {
      throw new Error('selection_changed_since_plan');
    }

    await client.query("select set_config('request.jwt.claim.sub', $1, true)", [
      targetUserId,
    ]);
    await client.query(
      "select set_config('request.jwt.claim.role', 'authenticated', true)",
    );
    const auth = await client.query(
      'select auth.uid()::text as uid, auth.role() as role',
    );
    if (auth.rows[0]?.uid !== targetUserId || auth.rows[0]?.role !== 'authenticated') {
      throw new Error('authenticated_owner_context_failed');
    }

    const archived = [];
    for (const group of parsed.repairs) {
      const archiveIds = group.archive.map((row) => row.instance_id);
      await client.query(
        `insert into public.wall_section_memberships (section_id, vault_item_instance_id)
         select distinct section_id, $1::uuid
         from public.wall_section_memberships
         where vault_item_instance_id = any($2::uuid[])
         on conflict do nothing`,
        [group.survivor.instance_id, archiveIds],
      );
      for (const row of group.archive) {
        const result = await client.query(
          'select public.vault_archive_exact_instance_v1($1::uuid) as payload',
          [row.instance_id],
        );
        const payload = result.rows[0]?.payload;
        if (
          payload?.archived_instance_id !== row.instance_id ||
          payload?.gv_vi_id !== row.gv_vi_id
        ) {
          throw new Error(`archive_readback_mismatch:${row.instance_id}`);
        }
        archived.push(row.instance_id);
      }
    }

    const after = await loadState(client);
    const duplicateCount = buildSelection(after).reduce(
      (sum, group) => sum + group.archive.length,
      0,
    );
    const totalRows = await client.query(
      'select count(*)::int as count from public.vault_item_instances where user_id=$1',
      [targetUserId],
    );
    const binderState = await client.query(
      `select state, count(*)::int as count
       from public.binder_contributions
       where contributor_user_id=$1
       group by state order by state`,
      [targetUserId],
    );
    if (
      after.length !== parsed.preflight.expected_active_rows ||
      duplicateCount !== 0 ||
      archived.length !== parsed.preflight.archive_count
    ) {
      throw new Error('post_apply_reconciliation_failed');
    }
    await client.query('commit');

    const report = {
      contract_version: parsed.contract_version,
      applied_at: new Date().toISOString(),
      plan_hash: actualHash,
      target_user_id: targetUserId,
      before_active_rows: before.length,
      archived_rows: archived.length,
      after_active_rows: after.length,
      remaining_duplicate_exact_identities: duplicateCount,
      total_instance_rows_preserved: Number(totalRows.rows[0].count),
      hard_deletes: 0,
      binder_contribution_states: binderState.rows,
      result: 'applied_and_reconciled',
    };
    const destination = path.join(path.dirname(path.resolve(planPath)), 'apply_readback.json');
    await writeJson(destination, report);
    console.log(JSON.stringify({ mode: 'apply', report_path: destination, ...report }));
  } catch (error) {
    await client.query('rollback');
    throw error;
  }
}

const client = new Client({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  if (apply) await applyPlan(client);
  else await createPlan(client);
} finally {
  await client.end();
}
