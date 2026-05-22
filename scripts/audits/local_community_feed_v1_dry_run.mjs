import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'docs', 'audits', 'local_community_feed_v1');
const JSON_PATH = path.join(OUT_DIR, 'local_community_feed_v1_phase1_dry_run_20260520.json');
const MD_PATH = path.join(OUT_DIR, 'local_community_feed_v1_phase1_dry_run_20260520.md');

function loadLocalEnv() {
  for (const fileName of ['.env.local', '.env']) {
    const filePath = path.join(ROOT, fileName);
    if (!fsSync.existsSync(filePath)) {
      continue;
    }

    const content = fsSync.readFileSync(filePath, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
        continue;
      }
      const index = trimmed.indexOf('=');
      const key = trimmed.slice(0, index).trim();
      const rawValue = trimmed.slice(index + 1).trim();
      if (!key || process.env[key]) {
        continue;
      }
      process.env[key] = rawValue.replace(/^['"]|['"]$/g, '');
    }
  }
}

function createSupabaseClient() {
  loadLocalEnv();
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL and SUPABASE_SECRET_KEY/SUPABASE_PUBLISHABLE_KEY for read-only audit.');
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

function clean(value) {
  return String(value ?? '').trim();
}

async function countRows(client, table, queryBuilder = null) {
  let query = client.from(table).select('*', { count: 'exact', head: true });
  if (queryBuilder) {
    query = queryBuilder(query);
  }
  const { count, error } = await query;
  if (error) {
    return { ok: false, count: null, error: error.message };
  }
  return { ok: true, count: count ?? 0, error: null };
}

async function fetchSampleRows(client, table, limit = 20) {
  const { data, error } = await client.from(table).select('*').limit(limit);
  if (error) {
    return { ok: false, rows: [], error: error.message };
  }
  return { ok: true, rows: data ?? [], error: null };
}

function inspectForbiddenLocationFields(row) {
  const forbidden = [];
  for (const key of Object.keys(row ?? {})) {
    const normalized = key.toLowerCase();
    if (
      normalized.includes('latitude') ||
      normalized === 'lat' ||
      normalized.includes('longitude') ||
      normalized === 'lng' ||
      normalized === 'lon' ||
      normalized.includes('address') ||
      normalized.includes('gps') ||
      normalized.includes('ip_location') ||
      normalized.includes('raw_location')
    ) {
      forbidden.push(key);
    }
  }
  return forbidden;
}

async function main() {
  const client = createSupabaseClient();
  await fs.mkdir(OUT_DIR, { recursive: true });

  const counts = {
    public_profiles: await countRows(client, 'public_profiles'),
    public_profiles_enabled: await countRows(client, 'public_profiles', (query) => query.eq('public_profile_enabled', true)),
    public_profiles_vault_sharing: await countRows(client, 'public_profiles', (query) => query.eq('public_profile_enabled', true).eq('vault_sharing_enabled', true)),
    v_wall_cards_v1: await countRows(client, 'v_wall_cards_v1'),
    v_card_stream_v1: await countRows(client, 'v_card_stream_v1'),
    collector_follows: await countRows(client, 'collector_follows'),
    card_feed_events: await countRows(client, 'card_feed_events'),
  };

  const wallSample = await fetchSampleRows(client, 'v_wall_cards_v1');
  const streamSample = await fetchSampleRows(client, 'v_card_stream_v1');
  const forbiddenProjectionFields = [
    ...new Set([
      ...wallSample.rows.flatMap(inspectForbiddenLocationFields),
      ...streamSample.rows.flatMap(inspectForbiddenLocationFields),
    ]),
  ].sort();

  const dryRunEligibleLocalCollectors = 0;
  const dryRunEligibleFeedRows = 0;
  const blockedReason = 'Phase 1 migration is draft-only/not populated; no collector can be local-feed eligible yet.';

  const result = {
    audit_id: 'LOCAL_COMMUNITY_FEED_V1_PHASE1_DRY_RUN_20260520',
    status: 'NO_WRITE_DRY_RUN',
    generated_at: new Date().toISOString(),
    future_tables: {
      note: 'Object presence is verified by the apply-gate SQL precheck, not by Supabase REST dry-run probes.',
      expected_pending_objects: [
        'collector_local_discovery_settings',
        'collector_local_blocks',
        'collector_local_mutes',
        'local_community_collectors_are_blocked_v1',
      ],
    },
    source_counts: Object.fromEntries(
      Object.entries(counts).map(([key, value]) => [key, value.count]),
    ),
    source_count_errors: Object.fromEntries(
      Object.entries(counts)
        .filter(([, value]) => !value.ok)
        .map(([key, value]) => [key, value.error]),
    ),
    forbiddenProjectionFields,
    dry_run: {
      eligible_local_collectors: dryRunEligibleLocalCollectors,
      eligible_feed_rows: dryRunEligibleFeedRows,
      blocked_reason: blockedReason,
      anonymous_local_feed_allowed: false,
      precise_location_projected: forbiddenProjectionFields.length > 0,
      existing_global_views_modified: false,
    },
    gates: {
      no_db_writes: true,
      no_migrations_applied: true,
      local_opt_in_required: true,
      authenticated_only_required: true,
      no_precise_location_fields_in_current_wall_or_stream_samples: forbiddenProjectionFields.length === 0,
      block_mute_tables_required_before_release: true,
      existing_public_views_left_unchanged: true,
    },
  };

  const lines = [
    '# LOCAL_COMMUNITY_FEED_V1 Phase 1 Dry Run',
    '',
    `Generated: ${result.generated_at}`,
    '',
    '## Status',
    '',
    'NO_WRITE_DRY_RUN. The local community feed is not eligible to return rows until the opt-in infrastructure is applied and populated.',
    '',
    '## Future Table Presence',
    '',
    'Future object presence is verified by the apply-gate SQL precheck, not by Supabase REST dry-run probes.',
    '',
    'Expected pending objects:',
    '',
    '- `collector_local_discovery_settings`',
    '- `collector_local_blocks`',
    '- `collector_local_mutes`',
    '- `local_community_collectors_are_blocked_v1`',
    '',
    '## Source Counts',
    '',
    '| Source | Count |',
    '| --- | ---: |',
    ...Object.entries(result.source_counts).map(([key, value]) => `| \`${key}\` | ${value ?? 'unknown'} |`),
    '',
    '## Projection Safety',
    '',
    forbiddenProjectionFields.length === 0
      ? 'No forbidden precise-location fields were found in sampled `v_wall_cards_v1` or `v_card_stream_v1` rows.'
      : `Forbidden location-like fields found: ${forbiddenProjectionFields.map((field) => `\`${field}\``).join(', ')}`,
    '',
    '## Dry-Run Result',
    '',
    `- Eligible local collectors: ${dryRunEligibleLocalCollectors}`,
    `- Eligible feed rows: ${dryRunEligibleFeedRows}`,
    `- Blocked reason: ${blockedReason}`,
    '- Anonymous local feed allowed: false',
    '- Existing global public views modified: false',
    '',
    '## No-Write Confirmation',
    '',
    '- No DB writes.',
    '- No migrations applied.',
    '- No UI integration.',
    '- No scanner changes.',
    '- No pricing changes.',
    '- No Species Dex changes.',
    '- No identity changes.',
  ];

  await fs.writeFile(JSON_PATH, `${JSON.stringify(result, null, 2)}\n`);
  await fs.writeFile(MD_PATH, `${lines.join('\n')}\n`);

  console.log(JSON.stringify({
    status: result.status,
    json: JSON_PATH,
    markdown: MD_PATH,
    eligibleLocalCollectors: dryRunEligibleLocalCollectors,
    eligibleFeedRows: dryRunEligibleFeedRows,
    forbiddenProjectionFields,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
