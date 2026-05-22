import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'docs', 'audits', 'local_community_feed_v1');
const JSON_PATH = path.join(OUT_DIR, 'local_community_feed_v1_seed_test_20260521.json');
const MD_PATH = path.join(OUT_DIR, 'local_community_feed_v1_seed_test_20260521.md');

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

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
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

async function resolveCollector(client, { slug, userId }) {
  let query = client
    .from('public_profiles')
    .select('user_id,slug,display_name,public_profile_enabled,vault_sharing_enabled')
    .eq('public_profile_enabled', true)
    .eq('vault_sharing_enabled', true)
    .limit(1);

  if (userId) {
    query = query.eq('user_id', userId);
  } else if (slug) {
    query = query.eq('slug', slug);
  } else {
    throw new Error('Provide --slug=<public-profile-slug> or --user-id=<uuid>. Refusing to choose a collector automatically.');
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(`Collector lookup failed: ${error.message}`);
  if (!data) throw new Error('No public + vault-sharing collector matched the provided identifier.');
  return data;
}

async function countRows(client, table, filter) {
  let query = client.from(table).select('*', { count: 'exact', head: true });
  query = filter(query);
  const { count, error } = await query;
  if (error) throw new Error(`Count failed for ${table}: ${error.message}`);
  return count ?? 0;
}

async function main() {
  const apply = hasFlag('apply');
  const slug = argValue('slug') ?? process.env.LOCAL_COMMUNITY_TEST_OWNER_SLUG ?? null;
  const userId = argValue('user-id') ?? process.env.LOCAL_COMMUNITY_TEST_OWNER_USER_ID ?? null;
  const areaLabel = argValue('area-label') ?? process.env.LOCAL_COMMUNITY_TEST_AREA_LABEL ?? 'Founder Test Area';
  const regionCode = argValue('region-code') ?? process.env.LOCAL_COMMUNITY_TEST_REGION_CODE ?? 'CO';
  const countryCode = argValue('country-code') ?? process.env.LOCAL_COMMUNITY_TEST_COUNTRY_CODE ?? 'US';
  const geohashPrefix = argValue('geohash-prefix') ?? process.env.LOCAL_COMMUNITY_TEST_GEOHASH_PREFIX ?? '9xj';
  const radiusMiles = Number(argValue('radius-miles') ?? process.env.LOCAL_COMMUNITY_TEST_RADIUS_MILES ?? '25');

  const client = createSupabaseClient();
  await fs.mkdir(OUT_DIR, { recursive: true });

  const collector = await resolveCollector(client, { slug, userId });
  const before = await countRows(
    client,
    'collector_local_discovery_settings',
    (query) => query.eq('user_id', collector.user_id),
  );

  let writeResult = 'DRY_RUN_ONLY';
  if (apply) {
    const { error } = await client.from('collector_local_discovery_settings').upsert({
      user_id: collector.user_id,
      local_discovery_enabled: true,
      area_label: areaLabel,
      region_code: regionCode,
      country_code: countryCode,
      geohash_prefix: geohashPrefix,
      radius_miles: radiusMiles,
      location_precision: 'coarse',
      location_source: 'manual',
    }, { onConflict: 'user_id' });

    if (error) throw new Error(`Seed write failed: ${error.message}`);
    writeResult = 'APPLIED_ONE_OPT_IN_ROW';
  }

  const after = await countRows(
    client,
    'collector_local_discovery_settings',
    (query) => query.eq('user_id', collector.user_id).eq('local_discovery_enabled', true),
  );

  const result = {
    audit_id: 'LOCAL_COMMUNITY_FEED_V1_SEED_TEST_20260521',
    status: writeResult,
    apply,
    collector: {
      slug: collector.slug,
      display_name_present: clean(collector.display_name).length > 0,
      public_profile_enabled: collector.public_profile_enabled === true,
      vault_sharing_enabled: collector.vault_sharing_enabled === true,
    },
    before_matching_settings_rows: before,
    after_enabled_settings_rows: after,
    locality: {
      area_label: areaLabel,
      region_code: regionCode,
      country_code: countryCode,
      geohash_prefix_length: geohashPrefix.length,
      radius_miles: radiusMiles,
      exact_coordinates_written: false,
    },
    no_write_confirmation: {
      db_write_performed: apply,
      writes_limited_to: apply ? ['collector_local_discovery_settings'] : [],
      scanner_changes: false,
      pricing_changes: false,
      species_dex_changes: false,
      identity_changes: false,
      public_route_changes: false,
    },
  };

  const lines = [
    '# LOCAL_COMMUNITY_FEED_V1 Seed Test',
    '',
    `Status: ${writeResult}`,
    '',
    '## Collector',
    '',
    `- Slug: \`${collector.slug}\``,
    `- Public profile enabled: ${collector.public_profile_enabled === true}`,
    `- Vault sharing enabled: ${collector.vault_sharing_enabled === true}`,
    '',
    '## Locality',
    '',
    `- Area label: ${areaLabel}`,
    `- Region: ${regionCode}`,
    `- Country: ${countryCode}`,
    `- Geohash prefix length: ${geohashPrefix.length}`,
    `- Radius miles: ${radiusMiles}`,
    '- Exact coordinates written: false',
    '',
    '## Result',
    '',
    `- Before matching settings rows: ${before}`,
    `- After enabled settings rows: ${after}`,
    `- DB write performed: ${apply}`,
  ];

  await fs.writeFile(JSON_PATH, `${JSON.stringify(result, null, 2)}\n`);
  await fs.writeFile(MD_PATH, `${lines.join('\n')}\n`);

  console.log(JSON.stringify({
    status: writeResult,
    slug: collector.slug,
    before,
    after,
    json: JSON_PATH,
    markdown: MD_PATH,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
