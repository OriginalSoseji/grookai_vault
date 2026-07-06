import '../env.mjs';

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Client } from 'pg';

const PACKAGE_ID = 'E1-WATCH-BACKFILL-V1';
const REPORT_DIR = path.join('docs', 'audits', 'product_evolution');
const REASON_RANK = {
  inferred: 1,
  owned: 2,
  want: 3,
  manual: 4,
};
const REASON_STRENGTH = {
  inferred: 0.35,
  owned: 0.8,
  want: 0.95,
  manual: 1,
};

function parseArgs(argv = process.argv.slice(2)) {
  const opts = {
    apply: false,
    dryRun: true,
    userId: null,
    limitUsers: null,
    report: true,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--apply') {
      opts.apply = true;
      opts.dryRun = false;
    } else if (arg === '--dry-run') {
      opts.apply = false;
      opts.dryRun = true;
    } else if (arg === '--user-id') {
      opts.userId = argv[index + 1] ?? null;
      index += 1;
    } else if (arg.startsWith('--user-id=')) {
      opts.userId = arg.slice('--user-id='.length) || null;
    } else if (arg === '--limit-users') {
      opts.limitUsers = Number.parseInt(argv[index + 1] ?? '', 10);
      index += 1;
    } else if (arg.startsWith('--limit-users=')) {
      opts.limitUsers = Number.parseInt(arg.slice('--limit-users='.length), 10);
    } else if (arg === '--no-report') {
      opts.report = false;
    } else if (arg === '--help' || arg === '-h') {
      printUsageAndExit();
    } else {
      throw new Error(`[${PACKAGE_ID}] Unknown argument: ${arg}`);
    }
  }

  if (opts.userId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(opts.userId)) {
    throw new Error(`[${PACKAGE_ID}] --user-id must be a UUID`);
  }
  if (opts.limitUsers !== null && (!Number.isInteger(opts.limitUsers) || opts.limitUsers < 1)) {
    throw new Error(`[${PACKAGE_ID}] --limit-users must be a positive integer`);
  }

  return opts;
}

function printUsageAndExit() {
  console.log(`Usage:
  node backend/engagement/backfill_interest_graph_watches_v1.mjs --dry-run [--user-id <uuid>] [--limit-users <n>]
  node backend/engagement/backfill_interest_graph_watches_v1.mjs --apply --user-id <uuid>

Notes:
  Defaults to --dry-run.
  Full-user --apply requires explicit operator approval outside this script.
  Requires SUPABASE_DB_URL, DATABASE_URL, or POSTGRES_URL.`);
  process.exit(0);
}

function dbUrl() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, stable(nested)]));
  }
  return value;
}

const CANDIDATE_CTE = `
with raw_candidates as (
  select distinct
    'owned_cards'::text as source,
    vii.user_id,
    'card'::text as subject_type,
    vii.card_print_id as subject_id,
    'owned'::text as reason,
    0.80::double precision as strength
  from public.vault_item_instances vii
  where vii.archived_at is null
    and vii.card_print_id is not null

  union all

  select distinct
    'wishlist_items'::text as source,
    wi.user_id,
    'card'::text as subject_type,
    wi.card_id as subject_id,
    'want'::text as reason,
    0.95::double precision as strength
  from public.wishlist_items wi
  where wi.card_id is not null

  union all

  select
    'owned_sets_3plus'::text as source,
    vii.user_id,
    'set'::text as subject_type,
    cp.set_id as subject_id,
    'inferred'::text as reason,
    0.35::double precision as strength
  from public.vault_item_instances vii
  join public.card_prints cp on cp.id = vii.card_print_id
  where vii.archived_at is null
    and vii.card_print_id is not null
    and cp.set_id is not null
  group by vii.user_id, cp.set_id
  having count(distinct vii.card_print_id) >= 3

  union all

  select distinct
    'collector_follows'::text as source,
    cf.follower_user_id as user_id,
    'collector'::text as subject_type,
    cf.followed_user_id as subject_id,
    'manual'::text as reason,
    1.0::double precision as strength
  from public.collector_follows cf
),
candidate_users as (
  select distinct user_id
  from raw_candidates
  where ($1::uuid is null or user_id = $1::uuid)
  order by user_id
  limit coalesce($2::integer, 2147483647)
),
scoped_candidates as (
  select rc.*
  from raw_candidates rc
  join candidate_users cu on cu.user_id = rc.user_id
),
ranked_candidates as (
  select
    sc.*,
    row_number() over (
      partition by sc.user_id, sc.subject_type, sc.subject_id
      order by
        case sc.reason
          when 'manual' then 4
          when 'want' then 3
          when 'owned' then 2
          when 'inferred' then 1
          else 0
        end desc,
        sc.source asc
    ) as candidate_rank
  from scoped_candidates sc
),
candidates as (
  select source, user_id, subject_type, subject_id, reason, strength
  from ranked_candidates
  where candidate_rank = 1
)
`;

async function fetchSummary(client, opts) {
  const query = `
    ${CANDIDATE_CTE}
    select
      candidates.source,
      candidates.subject_type,
      candidates.reason,
      count(*)::integer as candidate_count,
      count(distinct candidates.user_id)::integer as user_count,
      count(*) filter (where existing.id is null)::integer as would_insert_count,
      count(*) filter (where existing.id is not null)::integer as conflict_count,
      count(*) filter (
        where existing.id is not null
          and (
            case candidates.reason
              when 'manual' then 4
              when 'want' then 3
              when 'owned' then 2
              when 'inferred' then 1
              else 0
            end
          ) >= (
            case existing.reason
              when 'manual' then 4
              when 'want' then 3
              when 'owned' then 2
              when 'inferred' then 1
              else 0
            end
          )
      )::integer as would_promote_or_keep_count
    from candidates
    left join public.watches existing
      on existing.user_id = candidates.user_id
     and existing.subject_type = candidates.subject_type
     and existing.subject_id = candidates.subject_id
    group by candidates.source, candidates.subject_type, candidates.reason
    order by candidates.source, candidates.subject_type, candidates.reason
  `;
  const result = await client.query(query, [opts.userId, opts.limitUsers]);
  return result.rows;
}

async function fetchTotals(client, opts) {
  const query = `
    ${CANDIDATE_CTE}
    select
      count(*)::integer as candidate_count,
      count(distinct candidates.user_id)::integer as user_count,
      count(*) filter (where existing.id is null)::integer as would_insert_count,
      count(*) filter (where existing.id is not null)::integer as conflict_count
    from candidates
    left join public.watches existing
      on existing.user_id = candidates.user_id
     and existing.subject_type = candidates.subject_type
     and existing.subject_id = candidates.subject_id
  `;
  const result = await client.query(query, [opts.userId, opts.limitUsers]);
  return result.rows[0] ?? {};
}

async function applyBackfill(client, opts) {
  const query = `
    ${CANDIDATE_CTE}
    insert into public.watches (
      user_id,
      subject_type,
      subject_id,
      reason,
      strength,
      origin
    )
    select
      user_id,
      subject_type,
      subject_id,
      reason,
      strength,
      'backfill_v1'::text as origin
    from candidates
    on conflict (user_id, subject_type, subject_id) do update
    set
      reason = case
        when (
          case excluded.reason
            when 'manual' then 4
            when 'want' then 3
            when 'owned' then 2
            when 'inferred' then 1
            else 0
          end
        ) >= (
          case public.watches.reason
            when 'manual' then 4
            when 'want' then 3
            when 'owned' then 2
            when 'inferred' then 1
            else 0
          end
        )
        then excluded.reason
        else public.watches.reason
      end,
      strength = greatest(public.watches.strength, excluded.strength),
      origin = public.watches.origin,
      updated_at = now()
    returning (xmax = 0) as inserted
  `;
  const result = await client.query(query, [opts.userId, opts.limitUsers]);
  return {
    affected_count: result.rowCount,
    inserted_count: result.rows.filter((row) => row.inserted === true).length,
    updated_count: result.rows.filter((row) => row.inserted !== true).length,
  };
}

async function fetchPostApplyCounts(client, opts) {
  const result = await client.query(
    `
      select
        subject_type,
        reason,
        origin,
        count(*)::integer as row_count,
        count(distinct user_id)::integer as user_count
      from public.watches
      where ($1::uuid is null or user_id = $1::uuid)
      group by subject_type, reason, origin
      order by subject_type, reason, origin
    `,
    [opts.userId],
  );
  return result.rows;
}

function renderMarkdown(report) {
  const lines = [
    `# ${PACKAGE_ID}`,
    '',
    `Generated: ${report.generated_at}`,
    `Mode: ${report.mode}`,
    `User scope: ${report.options.user_id ?? 'all'}`,
    `Limit users: ${report.options.limit_users ?? 'none'}`,
    '',
    '## Totals',
    '',
    `- Candidate watches: ${report.totals.candidate_count ?? 0}`,
    `- Users: ${report.totals.user_count ?? 0}`,
    `- Would insert: ${report.totals.would_insert_count ?? 0}`,
    `- Conflicts: ${report.totals.conflict_count ?? 0}`,
  ];

  if (report.apply_result) {
    lines.push(
      `- Affected: ${report.apply_result.affected_count}`,
      `- Inserted: ${report.apply_result.inserted_count}`,
      `- Updated: ${report.apply_result.updated_count}`,
    );
  }

  lines.push('', '## Source Summary', '');
  lines.push('| Source | Subject | Reason | Candidates | Users | Would insert | Conflicts |');
  lines.push('| --- | --- | --- | ---: | ---: | ---: | ---: |');
  for (const row of report.source_summary) {
    lines.push(`| ${row.source} | ${row.subject_type} | ${row.reason} | ${row.candidate_count} | ${row.user_count} | ${row.would_insert_count} | ${row.conflict_count} |`);
  }

  if (report.post_apply_counts?.length) {
    lines.push('', '## Post-Apply Watch Counts', '');
    lines.push('| Subject | Reason | Origin | Rows | Users |');
    lines.push('| --- | --- | --- | ---: | ---: |');
    for (const row of report.post_apply_counts) {
      lines.push(`| ${row.subject_type} | ${row.reason} | ${row.origin} | ${row.row_count} | ${row.user_count} |`);
    }
  }

  lines.push('', '## Rollback', '');
  lines.push('Dev/user-scoped rollback:');
  lines.push('');
  lines.push('```sql');
  lines.push("delete from public.watches where user_id = '<user_id>' and origin = 'backfill_v1';");
  lines.push('```');
  lines.push('');
  lines.push('Full rollback requires explicit production approval:');
  lines.push('');
  lines.push('```sql');
  lines.push("delete from public.watches where origin = 'backfill_v1';");
  lines.push('```');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function writeReports(report) {
  await mkdir(REPORT_DIR, { recursive: true });
  const stamp = report.generated_at.replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const base = path.join(REPORT_DIR, `e1_watch_backfill_${stamp}`);
  const jsonPath = `${base}.json`;
  const mdPath = `${base}.md`;
  await writeFile(jsonPath, `${JSON.stringify(stable(report), null, 2)}\n`, 'utf8');
  await writeFile(mdPath, renderMarkdown(report), 'utf8');
  return { jsonPath, mdPath };
}

export async function runBackfillInterestGraphWatchesV1(rawOpts = {}) {
  const opts = {
    apply: rawOpts.apply === true,
    dryRun: rawOpts.apply !== true,
    userId: rawOpts.userId ?? null,
    limitUsers: rawOpts.limitUsers ?? null,
    report: rawOpts.report !== false,
  };
  const connectionString = dbUrl();
  if (!connectionString) {
    throw new Error(`[${PACKAGE_ID}] SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL is required`);
  }

  const generatedAt = new Date().toISOString();
  const client = new Client({
    connectionString,
    application_name: 'backfill_interest_graph_watches_v1',
  });
  await client.connect();
  try {
    const totals = await fetchTotals(client, opts);
    const sourceSummary = await fetchSummary(client, opts);
    let applyResult = null;
    let postApplyCounts = [];

    if (opts.apply) {
      applyResult = await applyBackfill(client, opts);
      postApplyCounts = await fetchPostApplyCounts(client, opts);
    }

    const report = {
      package_id: PACKAGE_ID,
      generated_at: generatedAt,
      mode: opts.apply ? 'apply' : 'dry-run',
      options: {
        user_id: opts.userId,
        limit_users: opts.limitUsers,
      },
      rules: {
        origin: 'backfill_v1',
        sources: ['owned_cards', 'wishlist_items', 'owned_sets_3plus', 'collector_follows'],
        reason_rank: REASON_RANK,
        reason_strength: REASON_STRENGTH,
        full_apply_requires_separate_approval: true,
      },
      totals,
      source_summary: sourceSummary,
      apply_result: applyResult,
      post_apply_counts: postApplyCounts,
    };

    if (opts.report) {
      report.report_paths = await writeReports(report);
    }
    return report;
  } finally {
    await client.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runBackfillInterestGraphWatchesV1(parseArgs())
    .then((report) => {
      console.log(JSON.stringify({
        package_id: report.package_id,
        mode: report.mode,
        options: report.options,
        totals: report.totals,
        apply_result: report.apply_result,
        report_paths: report.report_paths ?? null,
      }, null, 2));
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
