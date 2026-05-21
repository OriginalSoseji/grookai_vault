import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import pg from 'pg';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'docs', 'audits', 'local_community_feed_v1');
const JSON_PATH = path.join(OUT_DIR, 'local_community_feed_v1_phase3_rpc_proof_20260521.json');
const MD_PATH = path.join(OUT_DIR, 'local_community_feed_v1_phase3_rpc_proof_20260521.md');

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

function clean(value) {
  return String(value ?? '').trim();
}

function hasUuidLikePublicValue(row) {
  const uuidPattern = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i;
  const allowedKeys = new Set(['created_at']);
  for (const [key, value] of Object.entries(row)) {
    if (allowedKeys.has(key)) continue;
    if (typeof value === 'string' && uuidPattern.test(value)) {
      return { key, value };
    }
  }
  return null;
}

async function withRollback(client, callback) {
  await client.query('begin');
  try {
    return await callback();
  } finally {
    await client.query('rollback');
  }
}

async function main() {
  loadLocalEnv();
  const connectionString = process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('SUPABASE_DB_URL or DATABASE_URL is required.');
  }

  await fs.mkdir(OUT_DIR, { recursive: true });
  const client = new pg.Client({
    connectionString,
    ssl: connectionString.includes('localhost') || connectionString.includes('127.0.0.1') ? false : { rejectUnauthorized: false },
  });
  await client.connect();

  const result = {
    audit_id: 'LOCAL_COMMUNITY_FEED_V1_PHASE3_RPC_PROOF_20260521',
    status: 'STARTED',
    function_exists: false,
    grants: {},
    viewer: null,
    anon_rejected: false,
    anon_error_code: null,
    authenticated_candidate_count: 0,
    sampled_rows: [],
    columns: [],
    no_raw_user_ids_exposed: false,
    no_exact_location_exposed: false,
    route_targets_are_parent_card_routes: false,
    no_write_confirmation: true,
  };

  try {
    const functionCheck = await client.query(`
      select to_regprocedure('public.local_community_feed_v1(integer)') is not null as exists
    `);
    result.function_exists = functionCheck.rows[0]?.exists === true;

    const grants = await client.query(`
      select
        has_function_privilege('authenticated', 'public.local_community_feed_v1(integer)', 'EXECUTE') as authenticated_execute,
        has_function_privilege('anon', 'public.local_community_feed_v1(integer)', 'EXECUTE') as anon_execute,
        has_function_privilege('public', 'public.local_community_feed_v1(integer)', 'EXECUTE') as public_execute
    `);
    result.grants = grants.rows[0] ?? {};

    const viewer = await client.query(`
      select pp.user_id, pp.slug
      from public.public_profiles pp
      join public.collector_local_discovery_settings s
        on s.user_id = pp.user_id
       and s.local_discovery_enabled is true
      where pp.slug = 'imnotcesar'
        and pp.public_profile_enabled is true
        and pp.vault_sharing_enabled is true
      limit 1
    `);
    if (viewer.rowCount === 0) {
      throw new Error('Expected seeded viewer imnotcesar was not found with local discovery enabled.');
    }
    result.viewer = { slug: viewer.rows[0].slug };
    const viewerUserId = viewer.rows[0].user_id;

    await withRollback(client, async () => {
      await client.query("select set_config('request.jwt.claim.sub', '', true)");
      try {
        await client.query('select * from public.local_community_feed_v1(10)');
      } catch (error) {
        result.anon_rejected = true;
        result.anon_error_code = error.code ?? null;
      }
    });

    const rows = await withRollback(client, async () => {
      await client.query("select set_config('request.jwt.claim.sub', $1, true)", [viewerUserId]);
      const response = await client.query('select * from public.local_community_feed_v1(20)');
      return response.rows;
    });

    result.authenticated_candidate_count = rows.length;
    result.sampled_rows = rows.slice(0, 6);
    result.columns = rows.length > 0 ? Object.keys(rows[0]) : [];

    const forbiddenColumns = result.columns.filter((column) => (
      /(^|_)user_id$/i.test(column)
      || /(^|_)latitude$|(^|_)longitude$|(^|_)lat$|(^|_)lng$/i.test(column)
      || /gps|geohash_prefix|address|email/i.test(column)
    ));
    const leakedValue = rows.map(hasUuidLikePublicValue).find(Boolean) ?? null;
    result.no_raw_user_ids_exposed = forbiddenColumns.length === 0 && leakedValue === null;
    result.no_exact_location_exposed = forbiddenColumns.length === 0 && rows.every((row) => !('geohash_prefix' in row));
    result.route_targets_are_parent_card_routes = rows.every((row) => !row.route_target || /^\/card\/GV-PK-/.test(row.route_target));
    result.forbidden_columns = forbiddenColumns;
    result.uuid_like_public_value = leakedValue;
    result.status = result.function_exists
      && result.grants.authenticated_execute === true
      && result.grants.anon_execute === false
      && result.anon_rejected
      && result.authenticated_candidate_count > 0
      && result.no_raw_user_ids_exposed
      && result.no_exact_location_exposed
      && result.route_targets_are_parent_card_routes
      ? 'PASS'
      : 'FAIL';
  } finally {
    await client.end();
  }

  const lines = [
    '# LOCAL_COMMUNITY_FEED_V1 Phase 3 RPC Proof',
    '',
    `Status: ${result.status}`,
    '',
    '## Scope',
    '',
    '- Authenticated local community feed RPC/read model only.',
    '- No UI implementation.',
    '- No DB writes by this proof script.',
    '',
    '## Results',
    '',
    `- Function exists: ${result.function_exists}`,
    `- Authenticated execute grant: ${result.grants.authenticated_execute === true}`,
    `- Anonymous execute grant: ${result.grants.anon_execute === true}`,
    `- Public execute grant: ${result.grants.public_execute === true}`,
    `- Anonymous rejected: ${result.anon_rejected}${result.anon_error_code ? ` (${result.anon_error_code})` : ''}`,
    `- Viewer: \`${result.viewer?.slug ?? 'unresolved'}\``,
    `- Candidate rows returned: ${result.authenticated_candidate_count}`,
    `- No raw user IDs exposed: ${result.no_raw_user_ids_exposed}`,
    `- No exact location exposed: ${result.no_exact_location_exposed}`,
    `- Parent card route targets only: ${result.route_targets_are_parent_card_routes}`,
    '',
    '## Public Columns',
    '',
    result.columns.length > 0 ? result.columns.map((column) => `- \`${column}\``).join('\n') : '- No rows sampled.',
    '',
    '## Safety',
    '',
    '- No exact coordinates.',
    '- No geohash prefix in the response.',
    '- No raw owner user IDs.',
    '- Child public routes remain disabled; feed rows route to parent card routes.',
  ];

  await fs.writeFile(JSON_PATH, `${JSON.stringify(result, null, 2)}\n`);
  await fs.writeFile(MD_PATH, `${lines.join('\n')}\n`);
  console.log(JSON.stringify({ status: result.status, json: JSON_PATH, markdown: MD_PATH, candidateCount: result.authenticated_candidate_count }, null, 2));

  if (result.status !== 'PASS') {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
