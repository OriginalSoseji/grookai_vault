import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import pg from 'pg';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'docs', 'audits', 'local_community_feed_v1');
const JSON_PATH = path.join(OUT_DIR, 'local_community_feed_v1_phase6_block_mute_proof_20260521.json');
const MD_PATH = path.join(OUT_DIR, 'local_community_feed_v1_phase6_block_mute_proof_20260521.md');

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

function ownerVisible(rows, ownerSlug) {
  return rows.some((row) => clean(row.owner_slug) === ownerSlug);
}

async function withRollback(client, callback) {
  await client.query('begin');
  try {
    return await callback();
  } finally {
    await client.query('rollback');
  }
}

async function fetchFeedRows(client, viewerUserId, limit = 40) {
  await client.query("select set_config('request.jwt.claim.sub', $1, true)", [viewerUserId]);
  const response = await client.query('select * from public.local_community_feed_v1($1)', [limit]);
  return response.rows;
}

async function resolveProfile(client, slug) {
  const response = await client.query(
    `
      select pp.user_id, pp.slug, pp.display_name
      from public.public_profiles pp
      join public.collector_local_discovery_settings s
        on s.user_id = pp.user_id
       and s.local_discovery_enabled is true
      where pp.slug = $1
        and pp.public_profile_enabled is true
        and pp.vault_sharing_enabled is true
      limit 1
    `,
    [slug],
  );

  if (response.rowCount === 0) {
    throw new Error(`Profile ${slug} was not found with public profile, vault sharing, and local discovery enabled.`);
  }

  return response.rows[0];
}

async function assertNoPersistentFixture(client, viewerUserId, ownerUserId) {
  const response = await client.query(
    `
      select
        (
          select count(*)::int
          from public.collector_local_blocks
          where blocker_user_id = $1
            and blocked_user_id = $2
            and reason = 'phase6 rollback proof fixture'
        ) as block_fixture_rows,
        (
          select count(*)::int
          from public.collector_local_mutes
          where muter_user_id = $1
            and muted_user_id = $2
            and (expires_at is null or expires_at > now())
        ) as active_mute_rows
    `,
    [viewerUserId, ownerUserId],
  );

  return response.rows[0] ?? { block_fixture_rows: null, active_mute_rows: null };
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
    audit_id: 'LOCAL_COMMUNITY_FEED_V1_PHASE6_BLOCK_MUTE_PROOF_20260521',
    status: 'STARTED',
    viewer_slug: 'imnotcesar',
    target_owner_slug: 'pokejavi',
    baseline: {},
    block_fixture: {},
    mute_fixture: {},
    rollback_verification: {},
    no_persistent_write_confirmation: false,
  };

  try {
    const viewer = await resolveProfile(client, result.viewer_slug);
    const owner = await resolveProfile(client, result.target_owner_slug);
    result.viewer = { slug: viewer.slug };
    result.target_owner = { slug: owner.slug };

    const baselineRows = await withRollback(client, async () => fetchFeedRows(client, viewer.user_id, 40));
    result.baseline = {
      row_count: baselineRows.length,
      target_owner_visible: ownerVisible(baselineRows, owner.slug),
      target_owner_rows: baselineRows.filter((row) => clean(row.owner_slug) === owner.slug).length,
    };

    const blockRows = await withRollback(client, async () => {
      await client.query(
        `
          insert into public.collector_local_blocks (blocker_user_id, blocked_user_id, reason)
          values ($1, $2, 'phase6 rollback proof fixture')
          on conflict (blocker_user_id, blocked_user_id)
          do update set reason = excluded.reason
        `,
        [viewer.user_id, owner.user_id],
      );
      const helper = await client.query(
        'select public.local_community_collectors_are_blocked_v1($1, $2) as blocked',
        [viewer.user_id, owner.user_id],
      );
      const rows = await fetchFeedRows(client, viewer.user_id, 40);
      result.block_fixture.helper_returned_blocked = helper.rows[0]?.blocked === true;
      return rows;
    });
    result.block_fixture.row_count = blockRows.length;
    result.block_fixture.target_owner_visible = ownerVisible(blockRows, owner.slug);
    result.block_fixture.target_owner_rows = blockRows.filter((row) => clean(row.owner_slug) === owner.slug).length;

    const muteRows = await withRollback(client, async () => {
      await client.query(
        `
          insert into public.collector_local_mutes (muter_user_id, muted_user_id, expires_at)
          values ($1, $2, null)
          on conflict (muter_user_id, muted_user_id)
          do update set expires_at = null
        `,
        [viewer.user_id, owner.user_id],
      );
      const rows = await fetchFeedRows(client, viewer.user_id, 40);
      return rows;
    });
    result.mute_fixture.row_count = muteRows.length;
    result.mute_fixture.target_owner_visible = ownerVisible(muteRows, owner.slug);
    result.mute_fixture.target_owner_rows = muteRows.filter((row) => clean(row.owner_slug) === owner.slug).length;

    result.rollback_verification = await assertNoPersistentFixture(client, viewer.user_id, owner.user_id);
    result.no_persistent_write_confirmation = result.rollback_verification.block_fixture_rows === 0
      && result.rollback_verification.active_mute_rows === 0;
    result.status = result.baseline.target_owner_visible === true
      && result.block_fixture.helper_returned_blocked === true
      && result.block_fixture.target_owner_visible === false
      && result.mute_fixture.target_owner_visible === false
      && result.no_persistent_write_confirmation
      ? 'PASS'
      : 'FAIL';
  } finally {
    await client.end();
  }

  const lines = [
    '# LOCAL_COMMUNITY_FEED_V1 Phase 6 Block/Mute Proof',
    '',
    `Status: ${result.status}`,
    '',
    '## Scope',
    '',
    '- Targeted negative fixture for local community feed safety.',
    '- Uses rollback-only transaction fixtures.',
    '- No persistent DB writes.',
    '- No app, scanner, pricing, Species Dex, or route changes.',
    '',
    '## Viewer And Target',
    '',
    `- Viewer: \`${result.viewer_slug}\``,
    `- Target owner: \`${result.target_owner_slug}\``,
    '',
    '## Baseline',
    '',
    `- Rows returned: ${result.baseline.row_count}`,
    `- Target owner visible: ${result.baseline.target_owner_visible}`,
    `- Target owner rows: ${result.baseline.target_owner_rows}`,
    '',
    '## Block Fixture',
    '',
    `- Helper returned blocked: ${result.block_fixture.helper_returned_blocked}`,
    `- Rows returned: ${result.block_fixture.row_count}`,
    `- Target owner visible: ${result.block_fixture.target_owner_visible}`,
    `- Target owner rows: ${result.block_fixture.target_owner_rows}`,
    '',
    '## Mute Fixture',
    '',
    `- Rows returned: ${result.mute_fixture.row_count}`,
    `- Target owner visible: ${result.mute_fixture.target_owner_visible}`,
    `- Target owner rows: ${result.mute_fixture.target_owner_rows}`,
    '',
    '## Rollback Verification',
    '',
    `- Persistent proof block rows remaining: ${result.rollback_verification.block_fixture_rows}`,
    `- Persistent active mute rows for target after rollback: ${result.rollback_verification.active_mute_rows}`,
    `- No persistent write confirmation: ${result.no_persistent_write_confirmation}`,
    '',
    '## Decision',
    '',
    result.status === 'PASS'
      ? 'Block/mute exclusion is proven for the seeded local feed target. This clears the remaining Phase 5 rollout gate for internal preview/staging.'
      : 'Block/mute exclusion is not proven. Do not broaden enablement.',
  ];

  await fs.writeFile(JSON_PATH, `${JSON.stringify(result, null, 2)}\n`);
  await fs.writeFile(MD_PATH, `${lines.join('\n')}\n`);
  console.log(JSON.stringify({ status: result.status, json: JSON_PATH, markdown: MD_PATH }, null, 2));

  if (result.status !== 'PASS') {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
