import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import pg from 'pg';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'docs', 'audits', 'local_community_feed_v1');
const JSON_PATH = path.join(OUT_DIR, 'local_community_feed_v2_wishlist_live_smoke_v1.json');
const MD_PATH = path.join(OUT_DIR, 'local_community_feed_v2_wishlist_live_smoke_v1.md');
const FIXTURE_NOTE = 'local_community_feed_v2_wishlist_live_smoke_v1 rollback fixture';

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

function clean(value) {
  return String(value ?? '').trim();
}

async function withRollback(client, callback) {
  await client.query('begin');
  try {
    return await callback();
  } finally {
    await client.query('rollback');
  }
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

async function setAuthenticatedViewer(client, viewerUserId) {
  await client.query("select set_config('request.jwt.claim.sub', $1, true)", [viewerUserId]);
  await client.query("select set_config('role', 'authenticated', true)");
}

async function fetchFeedRows(client, viewerUserId, limit = 40) {
  await setAuthenticatedViewer(client, viewerUserId);
  const response = await client.query('select * from public.local_community_feed_v2($1)', [limit]);
  return response.rows;
}

async function fetchWantMatchCandidates(client, viewerUserId, limit = 100) {
  await setAuthenticatedViewer(client, viewerUserId);
  const response = await client.query(
    'select * from public.local_community_want_match_candidates_v1($1, $2)',
    [viewerUserId, limit],
  );
  return response.rows;
}

async function resolveViewer(client, slug) {
  const response = await client.query(
    `
      select pp.user_id, pp.slug
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
    throw new Error(`Viewer ${slug} was not found with public profile, vault sharing, and local discovery enabled.`);
  }

  return response.rows[0];
}

async function resolveCandidateCardPrint(client, row) {
  const response = await client.query(
    `
      with source_rows as (
        select
          'wall_card'::text as source_type,
          w.owner_slug,
          w.card_print_id,
          w.gv_id,
          w.intent,
          w.created_at
        from public.v_wall_cards_v1 w
        union all
        select
          coalesce(nullif(btrim(s.intent), ''), 'network_card')::text as source_type,
          s.owner_slug,
          s.card_print_id,
          s.gv_id,
          s.intent,
          s.created_at
        from public.v_card_stream_v1 s
      )
      select card_print_id
      from source_rows
      where owner_slug = $1
        and gv_id = $2
        and source_type = $3
        and coalesce(nullif(btrim(intent), ''), '') = coalesce(nullif(btrim($4::text), ''), '')
      order by
        case when created_at = $5::timestamptz then 0 else 1 end,
        created_at desc nulls last
      limit 1
    `,
    [row.owner_slug, row.gv_id, row.source_type, row.intent, row.created_at],
  );

  if (response.rowCount === 0) {
    throw new Error(`Could not resolve source card_print_id for sampled feed row ${row.feed_item_id}.`);
  }

  return response.rows[0].card_print_id;
}

function findMatchingPublicRow(rows, candidate) {
  return rows.find((row) => (
    clean(row.owner_slug) === clean(candidate.owner_slug)
    && clean(row.gv_id) === clean(candidate.gv_id)
    && clean(row.source_type) === clean(candidate.source_type)
    && clean(row.intent) === clean(candidate.intent)
  )) ?? null;
}

async function main() {
  loadLocalEnv();
  const connectionString = process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('SUPABASE_DB_URL or DATABASE_URL is required.');
  }

  const viewerSlug = argValue('viewer-slug') ?? process.env.LOCAL_COMMUNITY_TEST_VIEWER_SLUG ?? 'imnotcesar';
  await fs.mkdir(OUT_DIR, { recursive: true });

  const client = new pg.Client({
    connectionString,
    ssl: connectionString.includes('localhost') || connectionString.includes('127.0.0.1')
      ? false
      : { rejectUnauthorized: false },
  });
  await client.connect();

  const result = {
    audit_id: 'LOCAL_COMMUNITY_FEED_V2_WISHLIST_LIVE_SMOKE_V1',
    status: 'STARTED',
    viewer_slug: viewerSlug,
    function_exists: false,
    grants: {},
    baseline_row_count: 0,
    baseline_wishlist_match_count: 0,
    candidate: null,
    fixture: {},
    post_fixture_row_count: 0,
    post_fixture_wishlist_match_count: 0,
    selected_row_matched: false,
    selected_match_reason: null,
    shared_candidate_count: 0,
    shared_candidate_agrees_with_feed: false,
    columns: [],
    forbidden_columns: [],
    uuid_like_public_value: null,
    no_raw_user_ids_exposed: false,
    no_exact_location_exposed: false,
    no_private_wishlist_data_exposed: false,
    rollback_verification: {},
    no_persistent_write_confirmation: false,
  };

  try {
    const functionCheck = await client.query(`
      select to_regprocedure('public.local_community_feed_v2(integer)') is not null as exists
    `);
    result.function_exists = functionCheck.rows[0]?.exists === true;

    const grants = await client.query(`
      select
        has_function_privilege('authenticated', 'public.local_community_feed_v2(integer)', 'EXECUTE') as authenticated_execute,
        has_function_privilege('anon', 'public.local_community_feed_v2(integer)', 'EXECUTE') as anon_execute,
        has_function_privilege('public', 'public.local_community_feed_v2(integer)', 'EXECUTE') as public_execute
    `);
    result.grants = grants.rows[0] ?? {};

    const viewer = await resolveViewer(client, viewerSlug);

    const baselineRows = await withRollback(client, async () => fetchFeedRows(client, viewer.user_id, 40));
    result.baseline_row_count = baselineRows.length;
    result.baseline_wishlist_match_count = baselineRows.filter((row) => row.viewer_wishlist_match === true).length;
    if (baselineRows.length === 0) {
      throw new Error(`Viewer ${viewerSlug} has no visible local community feed rows to seed against.`);
    }

    const candidateRow = baselineRows.find((row) => row.viewer_wishlist_match !== true) ?? baselineRows[0];
    const candidateCardPrintId = await resolveCandidateCardPrint(client, candidateRow);
    result.candidate = {
      feed_item_id: candidateRow.feed_item_id,
      owner_slug: candidateRow.owner_slug,
      gv_id: candidateRow.gv_id,
      card_name: candidateRow.card_name,
      source_type: candidateRow.source_type,
      intent: candidateRow.intent,
      distance_bucket: candidateRow.distance_bucket,
      relationship_context: candidateRow.relationship_context,
      already_matched_before_fixture: candidateRow.viewer_wishlist_match === true,
    };

    const postRows = await withRollback(client, async () => {
      await setAuthenticatedViewer(client, viewer.user_id);
      const beforeExisting = await client.query(
        'select count(*)::int as count from public.wishlist_items where user_id = $1 and card_id = $2',
        [viewer.user_id, candidateCardPrintId],
      );
      result.fixture.existing_wishlist_rows_for_candidate = beforeExisting.rows[0]?.count ?? null;

      await client.query(
        `
          insert into public.wishlist_items (user_id, card_id, note)
          values ($1, $2, $3)
          on conflict (user_id, card_id) do nothing
        `,
        [viewer.user_id, candidateCardPrintId, FIXTURE_NOTE],
      );

      const afterFixture = await client.query(
        'select count(*)::int as count from public.wishlist_items where user_id = $1 and card_id = $2',
        [viewer.user_id, candidateCardPrintId],
      );
      result.fixture.wishlist_rows_for_candidate_inside_transaction = afterFixture.rows[0]?.count ?? null;

      const rows = await fetchFeedRows(client, viewer.user_id, 40);
      const candidates = await fetchWantMatchCandidates(client, viewer.user_id, 100);
      result.shared_candidate_count = candidates.length;
      result.shared_candidate_agrees_with_feed = candidates.some((candidate) => (
        clean(candidate.owner_slug) === clean(candidateRow.owner_slug)
        && clean(candidate.gv_id) === clean(candidateRow.gv_id)
        && clean(candidate.source_type) === clean(candidateRow.source_type)
        && clean(candidate.intent) === clean(candidateRow.intent)
      ));
      return rows;
    });

    result.post_fixture_row_count = postRows.length;
    result.post_fixture_wishlist_match_count = postRows.filter((row) => row.viewer_wishlist_match === true).length;
    result.columns = postRows.length > 0 ? Object.keys(postRows[0]) : [];

    const selected = findMatchingPublicRow(postRows, candidateRow);
    result.selected_row_matched = selected?.viewer_wishlist_match === true;
    result.selected_match_reason = selected?.match_reason ?? null;

    result.forbidden_columns = result.columns.filter((column) => (
      /(^|_)user_id$/i.test(column)
      || /(^|_)latitude$|(^|_)longitude$|(^|_)lat$|(^|_)lng$/i.test(column)
      || /gps|geohash_prefix|address|email/i.test(column)
      || /wishlist_item_id|wishlist_note|card_print_id/i.test(column)
    ));
    result.uuid_like_public_value = postRows.map(hasUuidLikePublicValue).find(Boolean) ?? null;
    result.no_raw_user_ids_exposed = result.forbidden_columns.length === 0 && result.uuid_like_public_value === null;
    result.no_exact_location_exposed = result.forbidden_columns.length === 0 && postRows.every((row) => !('geohash_prefix' in row));
    result.no_private_wishlist_data_exposed = result.forbidden_columns.length === 0
      && postRows.every((row) => !('wishlist_item_id' in row) && !('wishlist_note' in row) && !('card_print_id' in row));

    const rollbackVerification = await client.query(
      'select count(*)::int as proof_note_rows from public.wishlist_items where user_id = $1 and card_id = $2 and note = $3',
      [viewer.user_id, candidateCardPrintId, FIXTURE_NOTE],
    );
    result.rollback_verification = rollbackVerification.rows[0] ?? {};
    result.no_persistent_write_confirmation = result.rollback_verification.proof_note_rows === 0;

    result.status = result.function_exists
      && result.grants.authenticated_execute === true
      && result.grants.anon_execute === false
      && result.baseline_row_count > 0
      && result.fixture.wishlist_rows_for_candidate_inside_transaction === 1
      && result.selected_row_matched
      && result.selected_match_reason === 'viewer_wishlist'
      && result.shared_candidate_agrees_with_feed
      && result.no_raw_user_ids_exposed
      && result.no_exact_location_exposed
      && result.no_private_wishlist_data_exposed
      && result.no_persistent_write_confirmation
      ? 'PASS'
      : 'FAIL';
  } finally {
    await client.end();
  }

  const lines = [
    '# LOCAL_COMMUNITY_FEED_V2 Wishlist Live Smoke',
    '',
    `Status: ${result.status}`,
    '',
    '## Scope',
    '',
    '- Production linked database smoke for the v2 local community feed RPC.',
    '- Uses a rollback-only wishlist fixture.',
    '- No persistent wishlist, vault, image, price, identity, route, or geofence writes.',
    '',
    '## Results',
    '',
    `- Viewer: \`${result.viewer_slug}\``,
    `- Function exists: ${result.function_exists}`,
    `- Authenticated execute grant: ${result.grants.authenticated_execute === true}`,
    `- Anonymous execute grant: ${result.grants.anon_execute === true}`,
    `- Baseline rows: ${result.baseline_row_count}`,
    `- Baseline wishlist matches: ${result.baseline_wishlist_match_count}`,
    `- Post-fixture rows: ${result.post_fixture_row_count}`,
    `- Post-fixture wishlist matches: ${result.post_fixture_wishlist_match_count}`,
    `- Selected row matched: ${result.selected_row_matched}`,
    `- Selected match reason: ${result.selected_match_reason ?? 'null'}`,
    `- Shared candidate count: ${result.shared_candidate_count}`,
    `- Shared candidate agrees with feed: ${result.shared_candidate_agrees_with_feed}`,
    '',
    '## Candidate',
    '',
    result.candidate
      ? [
        `- Owner: \`${result.candidate.owner_slug}\``,
        `- Card: ${result.candidate.card_name} (\`${result.candidate.gv_id}\`)`,
        `- Source: \`${result.candidate.source_type}\``,
        `- Distance bucket: \`${result.candidate.distance_bucket}\``,
        `- Already matched before fixture: ${result.candidate.already_matched_before_fixture}`,
      ].join('\n')
      : '- No candidate resolved.',
    '',
    '## Public Safety',
    '',
    `- No raw user IDs exposed: ${result.no_raw_user_ids_exposed}`,
    `- No exact location exposed: ${result.no_exact_location_exposed}`,
    `- No private wishlist data exposed: ${result.no_private_wishlist_data_exposed}`,
    `- Forbidden columns: ${result.forbidden_columns.length}`,
    `- No persistent proof fixture rows: ${result.no_persistent_write_confirmation}`,
  ];

  await fs.writeFile(JSON_PATH, `${JSON.stringify(result, null, 2)}\n`);
  await fs.writeFile(MD_PATH, `${lines.join('\n')}\n`);
  console.log(JSON.stringify({
    status: result.status,
    viewer: result.viewer_slug,
    baselineRows: result.baseline_row_count,
    postFixtureWishlistMatches: result.post_fixture_wishlist_match_count,
    selectedRowMatched: result.selected_row_matched,
    json: JSON_PATH,
    markdown: MD_PATH,
  }, null, 2));

  if (result.status !== 'PASS') {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
