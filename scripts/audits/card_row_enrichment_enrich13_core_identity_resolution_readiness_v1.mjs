import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'enrich13_core_identity_resolution_readiness_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'enrich13_core_identity_resolution_readiness_v1.md');

const POCKET_SET_CODE_PATTERN = /^(?:A\d|B\d|P-A)/i;

function connectionString() {
  return process.env.SUPABASE_DB_URL
    ?? process.env.DATABASE_URL
    ?? process.env.POSTGRES_URL
    ?? process.env.POSTGRES_PRISMA_URL
    ?? null;
}

function clean(value) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeName(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row) ?? 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

function markdownTable(rows, columns) {
  if (!rows.length) return '_None._';
  return [
    `| ${columns.map((column) => column.label).join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${columns.map((column) => String(column.value(row) ?? '').replace(/\|/g, '\\|')).join(' | ')} |`),
  ].join('\n');
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeText(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value);
}

async function queryRows(client, sql, params = []) {
  const result = await client.query(sql, params);
  return result.rows;
}

function sourceIds(row) {
  const ids = [];
  const externalIds = row.external_ids ?? {};
  for (const [source, value] of Object.entries(externalIds)) {
    if (typeof value === 'string') ids.push({ source, external_id: value });
    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'string') ids.push({ source, external_id: item });
      }
    }
  }
  return ids;
}

function parseSourceId(row) {
  const setCode = clean(row.sets_code);
  if (!setCode) return null;
  const ids = sourceIds(row);
  const exact = ids.find((item) => item.external_id.startsWith(`${setCode}-`));
  if (!exact) return null;
  const cardNumber = exact.external_id.slice(setCode.length + 1);
  if (!clean(cardNumber)) return null;
  return {
    source: exact.source,
    external_id: exact.external_id,
    source_set_code: setCode,
    source_card_number: cardNumber,
  };
}

function numberPlainFromSourceNumber(sourceNumber) {
  const value = clean(sourceNumber);
  if (!value) return null;
  if (/^[A-Za-z][0-9]+$/.test(value)) return value.toUpperCase();
  if (/[0-9]/.test(value)) {
    return value.replace(/\/.*$/, '').replace(/[^0-9]/g, '');
  }
  return value;
}

function isPocketLike(row) {
  const setsCode = clean(row.sets_code);
  if (!setsCode) return false;
  return POCKET_SET_CODE_PATTERN.test(setsCode);
}

function isSubsetAliasGovernanceNeeded(parsed) {
  if (!parsed) return false;
  if (parsed.source_set_code === 'cel25' && /A\d+$/i.test(parsed.source_card_number)) return true;
  return false;
}

function identityKey(row) {
  return [
    clean(row.set_code) ?? '',
    clean(row.number) ?? '',
    normalizeName(row.name),
    clean(row.printed_identity_modifier) ?? '',
  ].join('|');
}

async function loadCoreIdentityRows(client) {
  return queryRows(client, `
    select
      cp.id::text as card_print_id,
      cp.set_id::text as set_id,
      s.code as sets_code,
      s.name as set_name,
      s.identity_domain_default,
      cp.set_code,
      cp.number,
      cp.number_plain,
      cp.name,
      cp.gv_id,
      cp.variant_key,
      cp.printed_identity_modifier,
      cp.external_ids,
      count(distinct cpr.id)::int as child_count,
      count(distinct cpi.id) filter (where cpi.is_active = true)::int as active_identity_count,
      count(distinct em.id) filter (where em.active = true)::int as active_mapping_count,
      count(distinct cpt.id)::int as trait_count,
      count(distinct cps.id) filter (where cps.active = true)::int as species_count,
      count(distinct vii.id) filter (where vii.archived_at is null)::int as vault_instance_count
    from public.card_prints cp
    join public.sets s on s.id = cp.set_id
    left join public.card_printings cpr on cpr.card_print_id = cp.id
    left join public.card_print_identity cpi on cpi.card_print_id = cp.id
    left join public.external_mappings em on em.card_print_id = cp.id
    left join public.card_print_traits cpt on cpt.card_print_id = cp.id
    left join public.card_print_species cps on cps.card_print_id = cp.id
    left join public.vault_item_instances vii on vii.card_print_id = cp.id
    where s.identity_domain_default like 'pokemon_eng%'
      and (
        cp.name is null
        or cp.set_id is null
        or cp.set_code is null
        or cp.number is null
        or cp.number_plain is null
      )
    group by cp.id, s.code, s.name, s.identity_domain_default
    order by s.code nulls last, cp.name nulls last, cp.id
  `);
}

async function loadCollisionRows(client, proposals) {
  if (!proposals.length) return new Map();
  const result = await client.query(
    `with proposed as (
       select *
       from jsonb_to_recordset($1::jsonb) as p(
         card_print_id uuid,
         set_id uuid,
         proposed_set_code text,
         proposed_number text,
         proposed_number_plain text,
         proposed_name text,
         proposed_variant_key text,
         proposed_printed_identity_modifier text
       )
     )
     select
       p.card_print_id::text as proposed_card_print_id,
       owner.id::text as owner_card_print_id,
       owner.set_code,
       owner.number,
       owner.number_plain,
       owner.name,
       owner.gv_id,
       owner.printed_identity_modifier,
       count(distinct cpr.id)::int as owner_child_count,
       count(distinct cpi.id) filter (where cpi.is_active = true)::int as owner_active_identity_count,
       count(distinct em.id) filter (where em.active = true)::int as owner_active_mapping_count
     from proposed p
     join public.card_prints owner
       on owner.id <> p.card_print_id
      and owner.set_id = p.set_id
      and owner.number_plain is not distinct from p.proposed_number_plain
      and coalesce(owner.variant_key, '') = coalesce(p.proposed_variant_key, '')
      and owner.printed_identity_modifier is not distinct from p.proposed_printed_identity_modifier
     left join public.card_printings cpr on cpr.card_print_id = owner.id
     left join public.card_print_identity cpi on cpi.card_print_id = owner.id
     left join public.external_mappings em on em.card_print_id = owner.id
     group by p.card_print_id, owner.id
     order by p.card_print_id::text, owner.id::text`,
    [JSON.stringify(proposals)],
  );

  const byCandidate = new Map();
  for (const row of result.rows) {
    if (!byCandidate.has(row.proposed_card_print_id)) byCandidate.set(row.proposed_card_print_id, []);
    byCandidate.get(row.proposed_card_print_id).push(row);
  }
  return byCandidate;
}

function classify(row, parsed, collisionOwners) {
  const blockers = [];
  const warnings = [];

  if (isPocketLike(row)) blockers.push('pocket_like_set_excluded_from_english_physical_enrichment');
  if (!parsed) blockers.push('no_parseable_source_id_for_core_identity');
  if (parsed && parsed.source_set_code !== row.sets_code) blockers.push('source_set_code_mismatch');
  if (parsed && isSubsetAliasGovernanceNeeded(parsed)) blockers.push('subset_alias_identity_governance_required');
  if (!clean(row.name)) blockers.push('missing_card_name');
  if (collisionOwners.length > 0) blockers.push('proposed_identity_existing_owner_collision');
  if (Number(row.vault_instance_count ?? 0) > 0) warnings.push('vault_referenced_parent');
  if (clean(row.gv_id)) warnings.push('existing_gv_id_would_need_identity_consistency_review');

  if (blockers.includes('pocket_like_set_excluded_from_english_physical_enrichment')) {
    return { classification: 'blocked_pocket_domain_governance_required', blockers, warnings };
  }
  if (blockers.includes('subset_alias_identity_governance_required')) {
    return { classification: 'blocked_subset_alias_governance_required', blockers, warnings };
  }
  if (blockers.includes('proposed_identity_existing_owner_collision')) {
    return { classification: 'blocked_proposed_identity_collision', blockers, warnings };
  }
  if (blockers.length > 0) {
    return { classification: 'blocked_source_acquisition_or_manual_review_required', blockers, warnings };
  }
  return {
    classification: 'ready_for_core_identity_guarded_dry_run_preparation',
    blockers,
    warnings,
  };
}

async function main() {
  const dbUrl = connectionString();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for read-only audit.');

  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  await client.query('set default_transaction_read_only = on');

  try {
    const coreRows = await loadCoreIdentityRows(client);
    const preliminaryRows = coreRows.map((row) => {
      const parsed = parseSourceId(row);
      const proposed = parsed
        ? {
            proposed_set_code: parsed.source_set_code,
            proposed_number: parsed.source_card_number,
            proposed_number_plain: numberPlainFromSourceNumber(parsed.source_card_number),
          }
        : {
            proposed_set_code: null,
            proposed_number: null,
            proposed_number_plain: null,
          };
      return { row, parsed, proposed };
    });

    const collisionInput = preliminaryRows
      .filter((entry) => entry.proposed.proposed_set_code && entry.proposed.proposed_number && entry.row.name)
      .map((entry) => ({
        card_print_id: entry.row.card_print_id,
        set_id: entry.row.set_id,
        proposed_set_code: entry.proposed.proposed_set_code,
        proposed_number: entry.proposed.proposed_number,
        proposed_number_plain: entry.proposed.proposed_number_plain,
        proposed_name: entry.row.name,
        proposed_variant_key: entry.row.variant_key,
        proposed_printed_identity_modifier: entry.row.printed_identity_modifier,
      }));
    const collisions = await loadCollisionRows(client, collisionInput);

    const rows = preliminaryRows.map((entry) => {
      const collisionOwners = collisions.get(entry.row.card_print_id) ?? [];
      const classified = classify(entry.row, entry.parsed, collisionOwners);
      return {
        card_print_id: entry.row.card_print_id,
        set_id: entry.row.set_id,
        sets_code: entry.row.sets_code,
        set_name: entry.row.set_name,
        identity_domain_default: entry.row.identity_domain_default,
        current_set_code: entry.row.set_code,
        current_number: entry.row.number,
        current_number_plain: entry.row.number_plain,
        card_name: entry.row.name,
        gv_id: entry.row.gv_id,
        variant_key: entry.row.variant_key,
        printed_identity_modifier: entry.row.printed_identity_modifier,
        external_ids: entry.row.external_ids,
        parsed_source: entry.parsed,
        proposed_set_code: entry.proposed.proposed_set_code,
        proposed_number: entry.proposed.proposed_number,
        proposed_number_plain: entry.proposed.proposed_number_plain,
        proposed_updates: {
          set_code: clean(entry.row.set_code) ? null : entry.proposed.proposed_set_code,
          number: clean(entry.row.number) ? null : entry.proposed.proposed_number,
          number_plain: clean(entry.row.number_plain) ? null : entry.proposed.proposed_number_plain,
        },
        dependency_counts: {
          child_count: Number(entry.row.child_count ?? 0),
          active_identity_count: Number(entry.row.active_identity_count ?? 0),
          active_mapping_count: Number(entry.row.active_mapping_count ?? 0),
          trait_count: Number(entry.row.trait_count ?? 0),
          species_count: Number(entry.row.species_count ?? 0),
          vault_instance_count: Number(entry.row.vault_instance_count ?? 0),
        },
        collision_owner_count: collisionOwners.length,
        collision_owner_samples: collisionOwners.slice(0, 10),
        classification: classified.classification,
        blockers: classified.blockers,
        warnings: classified.warnings,
      };
    });

    const readyRows = rows.filter((row) => row.classification === 'ready_for_core_identity_guarded_dry_run_preparation');
    const report = {
      version: 'ENRICH-13-CORE-IDENTITY-SET-CODE-RESOLUTION-READINESS-V1',
      generated_at: new Date().toISOString(),
      mode: 'audit_only_readiness',
      db_writes_performed: false,
      migrations_created: false,
      cleanup_performed: false,
      scope: {
        target: 'English physical parent core identity gaps only',
        writes_authorized: false,
        proposed_write_surface_if_later_approved: ['card_prints.set_code', 'card_prints.number', 'card_prints.number_plain'],
        forbidden: ['child writes', 'gv_id writes', 'identity inserts', 'external mapping writes', 'deletes', 'merges', 'migrations', 'image writes'],
      },
      summary: {
        total_core_identity_gap_rows: rows.length,
        ready_for_guarded_dry_run_preparation: readyRows.length,
        blocked_rows: rows.length - readyRows.length,
        by_classification: countBy(rows, (row) => row.classification),
        by_blocker: countBy(rows.flatMap((row) => row.blockers.length ? row.blockers : ['none']), (value) => value),
        by_set_top_25: Object.fromEntries(Object.entries(countBy(rows, (row) => row.sets_code ?? 'missing_sets_code')).slice(0, 25)),
        ready_by_set_top_25: Object.fromEntries(Object.entries(countBy(readyRows, (row) => row.proposed_set_code)).slice(0, 25)),
      },
      recommended_next_package: readyRows.length > 0
        ? {
            package_id: 'ENRICH-13A-CORE-IDENTITY-SOURCE-ID-BACKFILL',
            status: 'ready_for_guarded_dry_run_design',
            scope: `${readyRows.length} parent core identity updates from exact source IDs, no GV-ID writes`,
            writes_authorized: false,
          }
        : {
            package_id: null,
            status: 'no_ready_rows',
            writes_authorized: false,
          },
      blocked_strategy: [
        {
          classification: 'blocked_pocket_domain_governance_required',
          strategy: 'Do not mutate as English physical enrichment. Decide whether these rows belong to Pocket/excluded identity domain or separate non-physical cleanup.',
        },
        {
          classification: 'blocked_subset_alias_governance_required',
          strategy: 'Resolve subset identity first, then propose parent core identity updates under the canonical subset set_code.',
        },
        {
          classification: 'blocked_proposed_identity_collision',
          strategy: 'Resolve duplicate ownership/collision before any parent identity update.',
        },
        {
          classification: 'blocked_source_acquisition_or_manual_review_required',
          strategy: 'Acquire exact source identity or manually review before write planning.',
        },
      ],
      rows,
      ready_rows: readyRows,
      samples_by_classification: Object.fromEntries(
        Object.keys(countBy(rows, (row) => row.classification)).map((classification) => [
          classification,
          rows.filter((row) => row.classification === classification).slice(0, 25),
        ]),
      ),
    };

    report.fingerprint_sha256 = sha256(stableJson({
      version: report.version,
      generated_at: report.generated_at,
      summary: report.summary,
      ready_rows: readyRows.map((row) => ({
        card_print_id: row.card_print_id,
        proposed_set_code: row.proposed_set_code,
        proposed_number: row.proposed_number,
        proposed_number_plain: row.proposed_number_plain,
      })),
    }));

    await writeJson(OUTPUT_JSON, report);

    const classRows = Object.entries(report.summary.by_classification)
      .map(([classification, count]) => ({ classification, count }));
    const blockerRows = Object.entries(report.summary.by_blocker)
      .map(([blocker, count]) => ({ blocker, count }))
      .filter((row) => row.blocker !== 'none');
    const setRows = Object.entries(report.summary.ready_by_set_top_25)
      .map(([set_code, count]) => ({ set_code, count }));

    const md = [
      '# ENRICH-13 Core Identity Resolution Readiness V1',
      '',
      'Read-only readiness report for English physical parent rows missing core identity fields.',
      '',
      '## Safety',
      '',
      '- DB writes performed: false',
      '- Migrations created: false',
      '- Cleanup performed: false',
      '- Proposed scope if later approved: `card_prints.set_code`, `card_prints.number`, `card_prints.number_plain` only',
      '- Forbidden in this lane: child writes, GV-ID writes, identity inserts, external mapping writes, deletes, merges, migrations, image writes',
      '',
      '## Summary',
      '',
      `- Total core identity gap rows: ${report.summary.total_core_identity_gap_rows}`,
      `- Ready for guarded dry-run preparation: ${report.summary.ready_for_guarded_dry_run_preparation}`,
      `- Blocked rows: ${report.summary.blocked_rows}`,
      '',
      '## Classification Counts',
      '',
      markdownTable(classRows, [
        { label: 'classification', value: (row) => row.classification },
        { label: 'rows', value: (row) => row.count },
      ]),
      '',
      '## Top Blockers',
      '',
      markdownTable(blockerRows, [
        { label: 'blocker', value: (row) => row.blocker },
        { label: 'rows', value: (row) => row.count },
      ]),
      '',
      '## Ready Rows By Set',
      '',
      markdownTable(setRows, [
        { label: 'set', value: (row) => row.set_code },
        { label: 'ready rows', value: (row) => row.count },
      ]),
      '',
      '## Recommended Next Package',
      '',
      report.recommended_next_package.package_id
        ? `Prepare guarded dry-run package \`${report.recommended_next_package.package_id}\` for ${readyRows.length} parent-only core identity updates.`
        : 'No write package is ready.',
      '',
      '## Blocked Strategy',
      '',
      markdownTable(report.blocked_strategy, [
        { label: 'classification', value: (row) => row.classification },
        { label: 'strategy', value: (row) => row.strategy },
      ]),
      '',
      `Fingerprint: \`${report.fingerprint_sha256}\``,
      '',
    ].join('\n');

    await writeText(OUTPUT_MD, md);

    console.log(JSON.stringify({
      output_json: OUTPUT_JSON,
      output_md: OUTPUT_MD,
      fingerprint_sha256: report.fingerprint_sha256,
      summary: report.summary,
      recommended_next_package: report.recommended_next_package,
    }, null, 2));
  } finally {
    await client.end();
  }
}

await main();
