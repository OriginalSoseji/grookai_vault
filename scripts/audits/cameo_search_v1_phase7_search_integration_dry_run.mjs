import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';

const ROOT = process.cwd();
const requireFromBackend = createRequire(path.join(ROOT, 'backend', 'package.json'));
const dotenv = requireFromBackend('dotenv');
const pg = requireFromBackend('pg');

for (const envPath of ['.env.local', '.env']) {
  dotenv.config({ path: path.join(ROOT, envPath), override: false, quiet: true });
}

const OUT_DIR = path.join(ROOT, 'docs', 'audits', 'cameo_search_v1');
const JSON_PATH = path.join(OUT_DIR, 'cameo_search_v1_phase7_search_integration_dry_run_20260520.json');
const MD_PATH = path.join(OUT_DIR, 'cameo_search_v1_phase7_search_integration_dry_run_20260520.md');
const EXPECTED_ACTIVE_CAMEOS = 1360;

const PROBE_QUERIES = [
  { query: 'pikachu', expectation: 'identity_should_rank_above_cameo' },
  { query: 'pikachu cameo', expectation: 'cameo_results_should_appear_with_label' },
  { query: 'aerodactyl cameo', expectation: 'pokemon_cameo_results_should_appear_with_label' },
  { query: 'acerola cameo', expectation: 'trainer_cameo_results_should_appear_with_label' },
  { query: 'GV-PK-CRE-30', expectation: 'exact_parent_identity_should_remain_dominant' },
];

function sslForConnectionString(connectionString) {
  if (/sslmode=(disable|allow|prefer)/i.test(connectionString)) return false;
  if (/localhost|127\.0\.0\.1|host\.docker\.internal/i.test(connectionString)) return false;
  return { rejectUnauthorized: false };
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function hasRawUuid(value) {
  return /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i.test(JSON.stringify(value));
}

const DRY_RUN_SEARCH_SQL = `
with prepared as (
  select
    lower(nullif(trim($1), '')) as q_norm,
    regexp_split_to_array(lower(coalesce(nullif(trim($1), ''), '')), '\\s+') as q_tokens
),
cameo_agg as (
  select
    c.gv_id,
    string_agg(
      lower(concat_ws(
        ' ',
        'cameo',
        case when c.cameo_subject_type = 'trainer' then 'trainer' else 'pokemon' end,
        c.cameo_subject_name,
        c.pokemon_ndex,
        array_to_string(c.cameo_qualifiers, ' '),
        c.notes_raw
      )),
      ' '
      order by c.cameo_subject_name
    ) as cameo_search_text,
    array_agg(
      distinct (
        case
          when c.cameo_subject_type = 'trainer' then 'Cameo trainer: '
          else 'Cameo: '
        end
        || c.cameo_subject_name
        || case
          when array_length(c.cameo_qualifiers, 1) > 0
            then ' · ' || array_to_string(c.cameo_qualifiers, ', ')
          else ''
        end
      )
    ) as cameo_labels
  from public.v_card_print_cameos_public_v1 c
  group by c.gv_id
),
documents as (
  select
    d.search_document_id,
    d.object_type,
    d.public_id,
    d.parent_gv_id,
    d.printing_gv_id,
    d.display_name,
    d.display_discriminator,
    d.route_path,
    d.route_query,
    d.name,
    d.number_digits,
    d.number_padded,
    d.set_code,
    d.search_text as identity_search_text,
    lower(concat_ws(' ', d.search_text, ca.cameo_search_text)) as enriched_search_text,
    ca.cameo_search_text,
    ca.cameo_labels,
    d.rank_bucket
  from public.v_print_identity_search_documents_v1 d
  left join cameo_agg ca
    on ca.gv_id = d.parent_gv_id
   and d.object_type = 'parent_print'
  where d.object_type = 'parent_print'
     or d.object_type = 'child_printing'
),
scored as (
  select
    d.search_document_id,
    d.object_type,
    d.parent_gv_id,
    d.printing_gv_id,
    d.display_name,
    case
      when p.q_norm is not null
        and d.cameo_search_text is not null
        and (
          d.cameo_search_text like '%' || p.q_norm || '%'
          or exists (
            select 1
            from unnest(p.q_tokens) token
            where token <> '' and token <> 'cameo' and d.cameo_search_text like '%' || token || '%'
          )
        )
        then coalesce(
          (
            select
              case
                when c.cameo_subject_type = 'trainer' then 'Cameo trainer: '
                else 'Cameo: '
              end
              || c.cameo_subject_name
              || case
                when array_length(c.cameo_qualifiers, 1) > 0
                  then ' · ' || array_to_string(c.cameo_qualifiers, ', ')
                else ''
              end
            from public.v_card_print_cameos_public_v1 c
            where c.gv_id = d.parent_gv_id
              and exists (
                select 1
                from unnest(p.q_tokens) token
                where token <> ''
                  and token <> 'cameo'
                  and lower(concat_ws(
                    ' ',
                    c.cameo_subject_name,
                    c.pokemon_ndex,
                    array_to_string(c.cameo_qualifiers, ' '),
                    c.notes_raw
                  )) like '%' || token || '%'
              )
            order by
              case
                when lower(c.cameo_subject_name) = any(p.q_tokens) then 0
                else 1
              end,
              c.cameo_subject_name
            limit 1
          ),
          d.cameo_labels[1],
          'Cameo'
        )
      else d.display_discriminator
    end as display_discriminator,
    d.route_path,
    d.route_query,
    array_remove(array[
      case when p.q_norm is not null and lower(coalesce(d.public_id, '')) = p.q_norm then 'public_id' end,
      case when p.q_norm is not null and lower(coalesce(d.parent_gv_id, '')) = p.q_norm then 'parent_gv_id' end,
      case when p.q_norm is not null and lower(coalesce(d.printing_gv_id, '')) = p.q_norm then 'printing_gv_id' end,
      case when p.q_norm is not null and lower(coalesce(d.name, '')) like '%' || p.q_norm || '%' then 'name' end,
      case when p.q_norm is not null and d.identity_search_text like '%' || p.q_norm || '%' then 'identity_search_text' end,
      case when p.q_norm is not null and d.cameo_search_text like '%' || p.q_norm || '%' then 'cameo_search_text' end,
      case when p.q_norm is not null and exists (
        select 1
        from unnest(p.q_tokens) token
        where token <> '' and token <> 'cameo' and d.cameo_search_text like '%' || token || '%'
      ) then 'cameo_token' end
    ], null)::text[] as matched_fields,
    case
      when d.cameo_search_text is not null and p.q_norm is not null and d.identity_search_text like '%' || p.q_norm || '%' and d.cameo_search_text like '%' || p.q_norm || '%' then 'identity_and_cameo'
      when d.cameo_search_text is not null and p.q_norm is not null and (
        d.cameo_search_text like '%' || p.q_norm || '%'
        or exists (
          select 1
          from unnest(p.q_tokens) token
          where token <> '' and token <> 'cameo' and d.cameo_search_text like '%' || token || '%'
        )
      ) then 'cameo'
      else 'identity'
    end as match_source,
    (
      d.rank_bucket
      + case when p.q_norm is not null and lower(coalesce(d.public_id, '')) = p.q_norm then 10000 else 0 end
      + case when p.q_norm is not null and lower(coalesce(d.printing_gv_id, '')) = p.q_norm then 9500 else 0 end
      + case when p.q_norm is not null and lower(coalesce(d.parent_gv_id, '')) = p.q_norm then 9000 else 0 end
      + case when p.q_norm is not null and lower(coalesce(d.name, '')) = p.q_norm then 1800 else 0 end
      + case when p.q_norm is not null and lower(coalesce(d.name, '')) like '%' || p.q_norm || '%' then 800 else 0 end
      + case when p.q_norm is not null and d.identity_search_text like '%' || p.q_norm || '%' then 400 else 0 end
      + case
          when p.q_norm is not null then (
            select count(*)::integer * 120
            from unnest(p.q_tokens) token
            where token <> '' and d.identity_search_text like '%' || token || '%'
          )
          else 0
        end
      + case
          when p.q_norm is not null and d.cameo_search_text like '%' || p.q_norm || '%' then 300
          else 0
        end
      + case
          when p.q_norm is not null then (
            select count(*)::integer * 70
            from unnest(p.q_tokens) token
            where token <> '' and token <> 'cameo' and d.cameo_search_text like '%' || token || '%'
          )
          else 0
        end
      + case
          when p.q_norm is not null
            and 'cameo' = any(p.q_tokens)
            and d.cameo_search_text is not null
            then 90
          else 0
        end
    )::integer as rank_score
  from documents d
  cross join prepared p
  where
    p.q_norm is not null
    and (
      (
        'cameo' = any(p.q_tokens)
        and d.cameo_search_text is not null
        and not exists (
          select 1
          from unnest(p.q_tokens) token
          where token <> ''
            and token <> 'cameo'
            and d.cameo_search_text not like '%' || token || '%'
        )
      )
      or (
        not ('cameo' = any(p.q_tokens))
        and (
          lower(coalesce(d.public_id, '')) = p.q_norm
          or lower(coalesce(d.parent_gv_id, '')) = p.q_norm
          or lower(coalesce(d.printing_gv_id, '')) = p.q_norm
          or d.identity_search_text like '%' || p.q_norm || '%'
          or d.cameo_search_text like '%' || p.q_norm || '%'
          or not exists (
            select 1
            from unnest(p.q_tokens) token
            where token <> '' and d.enriched_search_text not like '%' || token || '%'
          )
        )
      )
    )
)
select
  search_document_id,
  object_type,
  parent_gv_id,
  printing_gv_id,
  display_name,
  display_discriminator,
  route_path,
  route_query,
  matched_fields,
  match_source,
  rank_score
from scored
where rank_score > 0
order by rank_score desc, display_name asc, parent_gv_id asc, coalesce(printing_gv_id, '') asc
limit 1000;
`;

function analyzeProbe(probe, rows) {
  const top = rows[0] ?? null;
  const identityRows = rows.filter((row) => row.match_source === 'identity' || row.match_source === 'identity_and_cameo');
  const cameoRows = rows.filter((row) => row.match_source === 'cameo' || row.match_source === 'identity_and_cameo');
  const anyRawUuid = hasRawUuid(rows);
  const anyChildRoute = rows.some((row) => row.route_path === `/card/${row.printing_gv_id}`);
  const cameoLabelsOk = cameoRows.every((row) => String(row.display_discriminator ?? '').startsWith('Cameo'));
  const identityBeatsCameo = probe.expectation !== 'identity_should_rank_above_cameo'
    || (top && top.match_source !== 'cameo' && rows.some((row) => row.match_source === 'cameo' && row.rank_score < top.rank_score));
  const exactParentDominant = probe.expectation !== 'exact_parent_identity_should_remain_dominant'
    || (top && top.match_source === 'identity' && top.route_query === null);
  const cameoAppears = !probe.expectation.includes('cameo_results_should_appear')
    || cameoRows.length > 0;
  return {
    query: probe.query,
    expectation: probe.expectation,
    result_count: rows.length,
    top_result: top,
    cameo_result_count: cameoRows.length,
    identity_result_count: identityRows.length,
    checks: {
      cameo_appears: cameoAppears,
      cameo_labels_ok: cameoLabelsOk,
      identity_beats_cameo_for_plain_identity_query: identityBeatsCameo,
      exact_parent_identity_dominant: exactParentDominant,
      no_raw_uuid_in_results: !anyRawUuid,
      no_child_public_route: !anyChildRoute,
    },
    sample_results: rows.slice(0, 5),
  };
}

function buildMarkdown(report) {
  const lines = [];
  lines.push('# CAMEO_SEARCH_V1 Phase 7 Search Integration Dry Run');
  lines.push('');
  lines.push(`Date: ${report.generated_at.slice(0, 10)}`);
  lines.push('');
  lines.push('## Scope');
  lines.push('');
  lines.push('Read-only proof that approved cameo metadata can extend print identity search documents without becoming identity and without wiring UI/search resolver changes.');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Active cameo rows: ${report.source_counts.active_cameos}`);
  lines.push(`- Distinct cameo parent cards: ${report.source_counts.distinct_parent_gv_ids}`);
  lines.push(`- Current search documents: ${report.source_counts.current_search_documents}`);
  lines.push(`- Proposed cameo-enriched parent documents: ${report.source_counts.cameo_enriched_parent_documents}`);
  lines.push(`- Public cameo view raw UUID columns: ${report.public_view.raw_uuid_columns.length}`);
  lines.push('');
  lines.push('## Probe Results');
  lines.push('');
  for (const probe of report.probes) {
    lines.push(`### ${probe.query}`);
    lines.push('');
    lines.push(`- Top result: ${probe.top_result ? `${probe.top_result.display_name} (${probe.top_result.parent_gv_id})` : 'none'}`);
    lines.push(`- Top source: ${probe.top_result?.match_source ?? 'none'}`);
    lines.push(`- Cameo results: ${probe.cameo_result_count}`);
    lines.push(`- Checks passed: ${Object.values(probe.checks).every(Boolean)}`);
    lines.push('');
  }
  lines.push('## Decision');
  lines.push('');
  lines.push(report.ready_for_future_migration
    ? 'Dry run passed. A later migration may safely add cameo tokens and cameo result labels to print identity search, with ranking kept below primary identity matches.'
    : 'Dry run failed. Do not integrate cameo tokens until failed checks are resolved.');
  lines.push('');
  lines.push('## Confirmations');
  lines.push('');
  lines.push('- No DB writes.');
  lines.push('- No migration created or applied.');
  lines.push('- No resolver/app/search UI changes.');
  lines.push('- No Species Dex changes.');
  lines.push('- No scanner changes.');
  lines.push('- No pricing changes.');
  lines.push('- No raw UUIDs exposed in dry-run result payloads.');
  return `${lines.join('\n')}\n`;
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) throw new Error('SUPABASE_DB_URL is not set.');

  const client = new pg.Client({
    connectionString,
    ssl: sslForConnectionString(connectionString),
    statement_timeout: 120000,
    application_name: 'cameo_search_v1_phase7_search_integration_dry_run',
  });

  await client.connect();
  try {
    await client.query('begin transaction read only');

    const sourceCounts = await client.query(`
      select
        (select count(*)::int from public.card_print_cameos where active) as active_cameos,
        (select count(distinct gv_id)::int from public.v_card_print_cameos_public_v1) as distinct_parent_gv_ids,
        (select count(*)::int from public.v_print_identity_search_documents_v1) as current_search_documents,
        (
          select count(distinct d.search_document_id)::int
          from public.v_print_identity_search_documents_v1 d
          join public.v_card_print_cameos_public_v1 c
            on c.gv_id = d.parent_gv_id
          where d.object_type = 'parent_print'
        ) as cameo_enriched_parent_documents,
        (
          select count(*)::int
          from public.card_print_cameos
          where match_status <> 'APPROVED_MATCH'
        ) as blocked_rows_present
    `);

    const publicColumns = await client.query(`
      select column_name, data_type
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'v_card_print_cameos_public_v1'
      order by ordinal_position
    `);
    const rawUuidColumns = publicColumns.rows.filter((row) => row.data_type === 'uuid');

    const dexBefore = await client.query(`
      select
        ps.slug,
        count(distinct cps.card_print_id)::int as total_print_count
      from public.pokemon_species ps
      join public.card_print_species cps
        on cps.species_id = ps.id
       and cps.active
       and cps.counts_for_completion
      where ps.slug in ('pikachu', 'charizard')
      group by ps.slug
      order by ps.slug
    `);

    const probes = [];
    for (const probe of PROBE_QUERIES) {
      const { rows } = await client.query(DRY_RUN_SEARCH_SQL, [probe.query]);
      probes.push(analyzeProbe(probe, rows));
    }

    await client.query('commit');

    const report = {
      generated_at: new Date().toISOString(),
      mode: 'READ_ONLY_DRY_RUN',
      source_counts: sourceCounts.rows[0],
      public_view: {
        columns: publicColumns.rows,
        raw_uuid_columns: rawUuidColumns,
      },
      dex_denominator_snapshot: dexBefore.rows,
      proposed_integration: {
        search_document_extension: 'append cameo tokens to parent-print search_text only',
        result_label_rule: 'when cameo tokens are the reason for a match, display_discriminator becomes Cameo: <subject> or Cameo trainer: <subject>',
        ranking_rule: 'primary identity exact/name/public-id scoring remains higher than cameo-only scoring',
        route_rule: 'cameo matches route to parent /card/<parent_gv_id>; no cameo route and no child route are introduced',
      },
      sql_hash: sha256(DRY_RUN_SEARCH_SQL),
      probes,
      checks: {
        active_cameo_rows_expected: sourceCounts.rows[0].active_cameos === EXPECTED_ACTIVE_CAMEOS,
        blocked_rows_absent: sourceCounts.rows[0].blocked_rows_present === 0,
        public_view_has_no_uuid_columns: rawUuidColumns.length === 0,
        probe_checks_pass: probes.every((probe) => Object.values(probe.checks).every(Boolean)),
        species_dex_snapshot_read_only: dexBefore.rows.length === 2,
      },
      confirmations: {
        db_writes: false,
        migration_created: false,
        migration_applied: false,
        resolver_changes: false,
        app_changes: false,
        search_ui_changes: false,
        species_dex_changes: false,
        scanner_changes: false,
        pricing_changes: false,
      },
    };
    report.ready_for_future_migration = Object.values(report.checks).every(Boolean);

    await fs.writeFile(JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
    await fs.writeFile(MD_PATH, buildMarkdown(report));

    console.log(JSON.stringify({
      status: report.ready_for_future_migration ? 'dry_run_pass' : 'dry_run_blocked',
      json_path: path.relative(ROOT, JSON_PATH),
      md_path: path.relative(ROOT, MD_PATH),
      checks: report.checks,
      probe_count: probes.length,
    }, null, 2));
  } catch (error) {
    try {
      await client.query('rollback');
    } catch {
      // ignore rollback failure after read-only errors
    }
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
