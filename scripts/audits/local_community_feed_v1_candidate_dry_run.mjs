import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'docs', 'audits', 'local_community_feed_v1');

function loadLocalEnv() {
  for (const fileName of ['.env.local', '.env']) {
    const filePath = path.join(ROOT, fileName);
    if (!fsSync.existsSync(filePath)) continue;
    const content = fsSync.readFileSync(filePath, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
      const index = trimmed.indexOf('=');
      const key = trimmed.slice(0, index).trim();
      const rawValue = trimmed.slice(index + 1).trim();
      if (!key || process.env[key]) continue;
      process.env[key] = rawValue.replace(/^['"]|['"]$/g, '');
    }
  }
}

function argValue(name) {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length).trim() : null;
}

function outputPaths() {
  const label = clean(argValue('label')).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  const suffix = label ? `_${label}` : '';
  return {
    json: path.join(OUT_DIR, `local_community_feed_v1_candidate_dry_run_20260521${suffix}.json`),
    markdown: path.join(OUT_DIR, `local_community_feed_v1_candidate_dry_run_20260521${suffix}.md`),
  };
}

function clean(value) {
  return String(value ?? '').trim();
}

function createSupabaseClient() {
  loadLocalEnv();
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL and SUPABASE_SECRET_KEY.');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

async function resolveViewer(client) {
  const viewerUserId = argValue('viewer-user-id') ?? process.env.LOCAL_COMMUNITY_TEST_VIEWER_USER_ID ?? null;
  const viewerSlug = argValue('viewer-slug') ?? process.env.LOCAL_COMMUNITY_TEST_VIEWER_SLUG ?? null;

  if (!viewerUserId && !viewerSlug) {
    return {
      ok: false,
      reason: 'Provide --viewer-slug=<slug> or --viewer-user-id=<uuid>. Refusing to choose a nearby-feed viewer automatically.',
      viewer: null,
    };
  }

  let query = client
    .from('public_profiles')
    .select('user_id,slug,display_name,public_profile_enabled,vault_sharing_enabled')
    .eq('public_profile_enabled', true)
    .eq('vault_sharing_enabled', true)
    .limit(1);

  query = viewerUserId ? query.eq('user_id', viewerUserId) : query.eq('slug', viewerSlug);
  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(`Viewer lookup failed: ${error.message}`);
  if (!data) {
    return { ok: false, reason: 'Viewer profile not found or not public + vault sharing.', viewer: null };
  }
  return { ok: true, reason: null, viewer: data };
}

function localityMatch(viewerSetting, ownerSetting) {
  if (!viewerSetting || !ownerSetting) return null;
  if (ownerSetting.local_discovery_enabled !== true) return null;
  if (clean(viewerSetting.country_code) !== clean(ownerSetting.country_code)) return null;

  const viewerGeohash = clean(viewerSetting.geohash_prefix);
  const ownerGeohash = clean(ownerSetting.geohash_prefix);
  if (viewerGeohash && ownerGeohash && viewerGeohash === ownerGeohash) {
    return { bucket: 'nearby', label: clean(ownerSetting.area_label) || 'Nearby' };
  }

  if (clean(viewerSetting.region_code) && clean(viewerSetting.region_code) === clean(ownerSetting.region_code)) {
    return { bucket: 'same_region', label: clean(ownerSetting.area_label) || 'Same region' };
  }

  return null;
}

function sourceKey(row, sourceType) {
  return `${sourceType}:${clean(row.vault_item_id) || clean(row.instance_id) || clean(row.gv_id)}`;
}

async function main() {
  const client = createSupabaseClient();
  const paths = outputPaths();
  await fs.mkdir(OUT_DIR, { recursive: true });

  const viewerResult = await resolveViewer(client);
  if (!viewerResult.ok) {
    const result = {
      audit_id: 'LOCAL_COMMUNITY_FEED_V1_CANDIDATE_DRY_RUN_20260521',
      status: 'BLOCKED_VIEWER_REQUIRED',
      reason: viewerResult.reason,
      candidates: [],
      no_write_confirmation: true,
    };
    await fs.writeFile(paths.json, `${JSON.stringify(result, null, 2)}\n`);
    await fs.writeFile(paths.markdown, `# LOCAL_COMMUNITY_FEED_V1 Candidate Dry Run\n\nStatus: ${result.status}\n\n${result.reason}\n\nNo DB writes.\n`);
    console.log(JSON.stringify({ status: result.status, reason: result.reason, json: paths.json, markdown: paths.markdown }, null, 2));
    return;
  }

  const viewer = viewerResult.viewer;
  const [{ data: settings, error: settingsError }, { data: wallRows, error: wallError }, { data: streamRows, error: streamError }, { data: blocks, error: blocksError }, { data: mutes, error: mutesError }] = await Promise.all([
    client.from('collector_local_discovery_settings').select('user_id,local_discovery_enabled,area_label,region_code,country_code,geohash_prefix,radius_miles,location_precision'),
    client.from('v_wall_cards_v1').select('owner_user_id,owner_slug,owner_display_name,gv_id,name,set_code,set_name,number,intent,created_at,display_image_url').limit(200),
    client.from('v_card_stream_v1').select('vault_item_id,owner_user_id,owner_slug,owner_display_name,gv_id,name,set_code,set_name,number,intent,created_at,image_url').limit(200),
    client.from('collector_local_blocks').select('blocker_user_id,blocked_user_id').limit(1000),
    client.from('collector_local_mutes').select('muter_user_id,muted_user_id,expires_at').limit(1000),
  ]);

  for (const [label, error] of [['settings', settingsError], ['wall', wallError], ['stream', streamError], ['blocks', blocksError], ['mutes', mutesError]]) {
    if (error) throw new Error(`${label} query failed: ${error.message}`);
  }

  const settingsByUserId = new Map((settings ?? []).map((row) => [clean(row.user_id), row]));
  const viewerSetting = settingsByUserId.get(clean(viewer.user_id));
  const blockedPairs = new Set((blocks ?? []).flatMap((row) => [
    `${clean(row.blocker_user_id)}:${clean(row.blocked_user_id)}`,
    `${clean(row.blocked_user_id)}:${clean(row.blocker_user_id)}`,
  ]));
  const now = Date.now();
  const mutedOwners = new Set(
    (mutes ?? [])
      .filter((row) => clean(row.muter_user_id) === clean(viewer.user_id))
      .filter((row) => !row.expires_at || Date.parse(row.expires_at) > now)
      .map((row) => clean(row.muted_user_id)),
  );

  const rawRows = [
    ...(wallRows ?? []).map((row) => ({ ...row, source_type: 'wall_card' })),
    ...(streamRows ?? []).map((row) => ({ ...row, source_type: clean(row.intent) || 'network_card' })),
  ];

  const seen = new Set();
  const candidates = [];
  const excluded = {
    self: 0,
    missing_owner_setting: 0,
    locality_mismatch: 0,
    blocked: 0,
    muted: 0,
    duplicate_source: 0,
  };

  for (const row of rawRows) {
    const ownerUserId = clean(row.owner_user_id);
    if (!ownerUserId || ownerUserId === clean(viewer.user_id)) {
      excluded.self += 1;
      continue;
    }

    const key = sourceKey(row, row.source_type);
    if (seen.has(key)) {
      excluded.duplicate_source += 1;
      continue;
    }
    seen.add(key);

    const ownerSetting = settingsByUserId.get(ownerUserId);
    if (!ownerSetting) {
      excluded.missing_owner_setting += 1;
      continue;
    }

    const locality = localityMatch(viewerSetting, ownerSetting);
    if (!locality) {
      excluded.locality_mismatch += 1;
      continue;
    }

    if (blockedPairs.has(`${clean(viewer.user_id)}:${ownerUserId}`)) {
      excluded.blocked += 1;
      continue;
    }

    if (mutedOwners.has(ownerUserId)) {
      excluded.muted += 1;
      continue;
    }

    candidates.push({
      source_type: row.source_type,
      owner_slug: clean(row.owner_slug),
      owner_display_name_present: clean(row.owner_display_name).length > 0,
      gv_id: clean(row.gv_id),
      name: clean(row.name),
      set_code: clean(row.set_code),
      number: clean(row.number),
      intent: clean(row.intent) || null,
      locality_label: locality.label,
      distance_bucket: locality.bucket,
      route_target: clean(row.gv_id) ? `/card/${clean(row.gv_id)}` : null,
    });
  }

  const result = {
    audit_id: 'LOCAL_COMMUNITY_FEED_V1_CANDIDATE_DRY_RUN_20260521',
    status: 'NO_WRITE_CANDIDATE_DRY_RUN',
    viewer: {
      slug: viewer.slug,
      has_local_setting: Boolean(viewerSetting),
      local_discovery_enabled: viewerSetting?.local_discovery_enabled === true,
    },
    source_counts: {
      local_settings: settings?.length ?? 0,
      wall_rows: wallRows?.length ?? 0,
      stream_rows: streamRows?.length ?? 0,
      blocks: blocks?.length ?? 0,
      mutes: mutes?.length ?? 0,
    },
    excluded,
    candidate_count: candidates.length,
    candidates,
    no_write_confirmation: true,
    precise_location_exposed: false,
    raw_user_ids_exposed_in_candidates: false,
  };

  const lines = [
    '# LOCAL_COMMUNITY_FEED_V1 Candidate Dry Run',
    '',
    `Status: ${result.status}`,
    '',
    '## Viewer',
    '',
    `- Slug: \`${viewer.slug}\``,
    `- Has local setting: ${result.viewer.has_local_setting}`,
    `- Local discovery enabled: ${result.viewer.local_discovery_enabled}`,
    '',
    '## Counts',
    '',
    `- Local settings: ${result.source_counts.local_settings}`,
    `- Wall rows inspected: ${result.source_counts.wall_rows}`,
    `- Stream rows inspected: ${result.source_counts.stream_rows}`,
    `- Candidate rows: ${result.candidate_count}`,
    '',
    '## Exclusions',
    '',
    ...Object.entries(excluded).map(([key, value]) => `- ${key}: ${value}`),
    '',
    '## Safety',
    '',
    '- No DB writes.',
    '- No exact coordinates exposed.',
    '- No raw user IDs emitted in candidate rows.',
  ];

  await fs.writeFile(paths.json, `${JSON.stringify(result, null, 2)}\n`);
  await fs.writeFile(paths.markdown, `${lines.join('\n')}\n`);
  console.log(JSON.stringify({ status: result.status, candidateCount: candidates.length, json: paths.json, markdown: paths.markdown }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
