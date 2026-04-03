import '../env.mjs';
import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

const OUTPUT_PATH = path.join(
  process.cwd(),
  'docs',
  'checkpoints',
  'gvid_route_audit_v1.json',
);

function ensureOutputDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

async function run() {
  if (!process.env.SUPABASE_DB_URL) {
    throw new Error('SUPABASE_DB_URL is required');
  }

  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    application_name: 'gvid_route_audit_v1',
  });

  await client.connect();

  try {
    const [
      activeIdentityCountResult,
      activeIdentityWithGvIdCountResult,
      activeIdentityWithoutGvIdCountResult,
      sampleRowsResult,
      duplicateRouteGvIdGroupsResult,
      duplicateRouteGvIdRowCountResult,
      sampleExcludedRowsResult,
    ] = await Promise.all([
      client.query(`
        select count(*)::int as row_count
        from public.card_print_identity cpi
        where cpi.is_active = true
      `),
      client.query(`
        select count(*)::int as row_count
        from public.card_print_identity cpi
        join public.card_prints cp
          on cp.id = cpi.card_print_id
        where cpi.is_active = true
          and cp.gv_id is not null
      `),
      client.query(`
        select count(*)::int as row_count
        from public.card_print_identity cpi
        join public.card_prints cp
          on cp.id = cpi.card_print_id
        where cpi.is_active = true
          and cp.gv_id is null
      `),
      client.query(`
        select
          cpi.card_print_id,
          cp.gv_id,
          cpi.identity_domain,
          cpi.printed_number,
          cpi.set_code_identity
        from public.card_print_identity cpi
        join public.card_prints cp
          on cp.id = cpi.card_print_id
        where cpi.is_active = true
        order by cp.gv_id nulls last, cpi.card_print_id
        limit 50
      `),
      client.query(`
        select
          cp.gv_id,
          count(*)::int as row_count
        from public.card_print_identity cpi
        join public.card_prints cp
          on cp.id = cpi.card_print_id
        where cpi.is_active = true
          and cp.gv_id is not null
        group by cp.gv_id
        having count(*) > 1
        order by row_count desc, cp.gv_id
      `),
      client.query(`
        with duplicate_route_gv_ids as (
          select cp.gv_id
          from public.card_print_identity cpi
          join public.card_prints cp
            on cp.id = cpi.card_print_id
          where cpi.is_active = true
            and cp.gv_id is not null
          group by cp.gv_id
          having count(*) > 1
        )
        select count(*)::int as row_count
        from public.card_print_identity cpi
        join public.card_prints cp
          on cp.id = cpi.card_print_id
        join duplicate_route_gv_ids d
          on d.gv_id = cp.gv_id
        where cpi.is_active = true
      `),
      client.query(`
        select
          cpi.card_print_id,
          cp.gv_id,
          cpi.identity_domain,
          cpi.printed_number,
          cpi.set_code_identity,
          case
            when cp.gv_id is null then 'PARENT_GV_ID_NULL'
            else 'DUPLICATE_ROUTE_GV_ID'
          end as exclusion_reason
        from public.card_print_identity cpi
        join public.card_prints cp
          on cp.id = cpi.card_print_id
        where cpi.is_active = true
          and (
            cp.gv_id is null
            or cp.gv_id in (
              select cp2.gv_id
              from public.card_print_identity cpi2
              join public.card_prints cp2
                on cp2.id = cpi2.card_print_id
              where cpi2.is_active = true
                and cp2.gv_id is not null
              group by cp2.gv_id
              having count(*) > 1
            )
          )
        order by exclusion_reason, cpi.card_print_id
        limit 50
      `),
    ]);

    const activeIdentityRows = activeIdentityCountResult.rows[0]?.row_count ?? 0;
    const activeIdentityWithGvIdCount = activeIdentityWithGvIdCountResult.rows[0]?.row_count ?? 0;
    const activeIdentityWithoutGvIdCount = activeIdentityWithoutGvIdCountResult.rows[0]?.row_count ?? 0;
    const duplicateRouteGvIdRowCount = duplicateRouteGvIdRowCountResult.rows[0]?.row_count ?? 0;
    const reachableViaCurrentRouteCount = activeIdentityWithGvIdCount - duplicateRouteGvIdRowCount;
    const excludedByCurrentRouteQueryShapeCount =
      activeIdentityRows - reachableViaCurrentRouteCount;

    const output = {
      generated_at: new Date().toISOString(),
      active_identity_rows: activeIdentityRows,
      active_identity_with_gvid_count: activeIdentityWithGvIdCount,
      active_identity_without_gvid_count: activeIdentityWithoutGvIdCount,
      overlap_active_identity_and_gvid_present_count: activeIdentityWithGvIdCount,
      duplicate_route_gvid_groups: duplicateRouteGvIdGroupsResult.rows,
      duplicate_route_gvid_row_count: duplicateRouteGvIdRowCount,
      reachable_via_current_route_count: reachableViaCurrentRouteCount,
      unreachable_with_gvid_count: duplicateRouteGvIdRowCount,
      excluded_by_current_route_query_shape_count: excludedByCurrentRouteQueryShapeCount,
      sample_identity_rows: sampleRowsResult.rows,
      sample_excluded_rows: sampleExcludedRowsResult.rows,
      claim_outcome:
        activeIdentityWithGvIdCount > 0 ? 'CLAIM_CONFIRMED' : 'CLAIM_DISPROVED',
      current_query_behavior: {
        base_table: 'public.card_prints',
        base_filter: 'eq(gv_id, <route param>)',
        nested_identity_lookup: 'separate optional read by card_print_id after parent row fetch',
        route_excludes_due_to_parent_missing_gvid: activeIdentityWithoutGvIdCount,
        route_excludes_due_to_duplicate_gvid_collision: duplicateRouteGvIdRowCount,
      },
    };

    ensureOutputDir(OUTPUT_PATH);
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
    console.log(JSON.stringify(output, null, 2));
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
