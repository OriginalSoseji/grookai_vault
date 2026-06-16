import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const PARENT_GV_JSON = path.join(OUTPUT_DIR, 'parent_gv_id_backfill_candidates_v1.json');
const CHILD_GV_JSON = path.join(OUTPUT_DIR, 'child_printing_gv_id_backfill_candidates_v1.json');
const ACTIVE_IDENTITY_JSON = path.join(OUTPUT_DIR, 'active_identity_backfill_candidates_v1.json');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'card_row_enrichment_residual_blocker_audit_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'card_row_enrichment_residual_blocker_audit_v1.md');

function connectionString() {
  return process.env.SUPABASE_DB_URL
    ?? process.env.DATABASE_URL
    ?? process.env.POSTGRES_URL
    ?? process.env.POSTGRES_PRISMA_URL
    ?? null;
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

function clean(value) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row) ?? 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

function groupBy(rows, keyFn) {
  const groups = new Map();
  for (const row of rows) {
    const key = keyFn(row) ?? 'unknown';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  return groups;
}

function markdownTable(rows, columns) {
  if (!rows.length) return '_None._';
  return [
    `| ${columns.map((column) => column.label).join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${columns.map((column) => String(column.value(row) ?? '').replace(/\|/g, '\\|')).join(' | ')} |`),
  ].join('\n');
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
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

async function loadParentDependencyRows(client, ids) {
  if (!ids.length) return new Map();
  const rows = await queryRows(client, `
    select
      cp.id::text as card_print_id,
      cp.gv_id,
      cp.set_code,
      s.name as set_name,
      cp.number,
      cp.number_plain,
      cp.name as card_name,
      cp.variant_key,
      cp.printed_identity_modifier,
      count(distinct cpr.id)::int as child_count,
      count(distinct cpi.id) filter (where cpi.is_active = true)::int as active_identity_count,
      count(distinct em.id) filter (where em.active = true)::int as active_mapping_count,
      count(distinct cpt.id)::int as trait_count,
      count(distinct cps.id) filter (where cps.active = true)::int as species_count,
      count(distinct vii.id) filter (where vii.archived_at is null)::int as vault_instance_count
    from public.card_prints cp
    left join public.sets s on s.id = cp.set_id
    left join public.card_printings cpr on cpr.card_print_id = cp.id
    left join public.card_print_identity cpi on cpi.card_print_id = cp.id
    left join public.external_mappings em on em.card_print_id = cp.id
    left join public.card_print_traits cpt on cpt.card_print_id = cp.id
    left join public.card_print_species cps on cps.card_print_id = cp.id
    left join public.vault_item_instances vii on vii.card_print_id = cp.id
    where cp.id = any($1::uuid[])
    group by cp.id, s.name
  `, [ids]);
  return new Map(rows.map((row) => [row.card_print_id, row]));
}

async function loadGvOwners(client, gvIds) {
  if (!gvIds.length) return new Map();
  const rows = await queryRows(client, `
    select
      cp.id::text as card_print_id,
      cp.gv_id,
      cp.set_code,
      s.name as set_name,
      cp.number,
      cp.number_plain,
      cp.name as card_name,
      cp.variant_key,
      cp.printed_identity_modifier,
      count(distinct cpr.id)::int as child_count,
      array_remove(array_agg(distinct cpr.finish_key order by cpr.finish_key), null) as child_finishes,
      count(distinct cpi.id) filter (where cpi.is_active = true)::int as active_identity_count,
      count(distinct em.id) filter (where em.active = true)::int as active_mapping_count,
      count(distinct cpt.id)::int as trait_count,
      count(distinct cps.id) filter (where cps.active = true)::int as species_count,
      count(distinct vii.id) filter (where vii.archived_at is null)::int as vault_instance_count
    from public.card_prints cp
    left join public.sets s on s.id = cp.set_id
    left join public.card_printings cpr on cpr.card_print_id = cp.id
    left join public.card_print_identity cpi on cpi.card_print_id = cp.id
    left join public.external_mappings em on em.card_print_id = cp.id
    left join public.card_print_traits cpt on cpt.card_print_id = cp.id
    left join public.card_print_species cps on cps.card_print_id = cp.id
    left join public.vault_item_instances vii on vii.card_print_id = cp.id
    where cp.gv_id = any($1::text[])
    group by cp.id, s.name
    order by cp.gv_id, cp.set_code, cp.number_plain nulls last, cp.number, cp.name
  `, [gvIds]);
  const byGv = new Map();
  for (const row of rows) {
    if (!byGv.has(row.gv_id)) byGv.set(row.gv_id, []);
    byGv.get(row.gv_id).push(row);
  }
  return byGv;
}

async function loadNoChildParents(client) {
  return queryRows(client, `
    with child as (
      select card_print_id, count(*)::int as child_count
      from public.card_printings
      group by card_print_id
    )
    select
      cp.id::text as card_print_id,
      cp.gv_id,
      cp.set_code,
      s.name as set_name,
      cp.number,
      cp.number_plain,
      cp.name as card_name,
      cp.variant_key,
      cp.printed_identity_modifier,
      cp.external_ids,
      count(distinct cpi.id) filter (where cpi.is_active = true)::int as active_identity_count,
      count(distinct em.id) filter (where em.active = true)::int as active_mapping_count,
      count(distinct cpt.id)::int as trait_count,
      count(distinct cps.id) filter (where cps.active = true)::int as species_count,
      count(distinct vii.id) filter (where vii.archived_at is null)::int as vault_instance_count
    from public.card_prints cp
    join public.sets s on s.id = cp.set_id
    left join child on child.card_print_id = cp.id
    left join public.card_print_identity cpi on cpi.card_print_id = cp.id
    left join public.external_mappings em on em.card_print_id = cp.id
    left join public.card_print_traits cpt on cpt.card_print_id = cp.id
    left join public.card_print_species cps on cps.card_print_id = cp.id
    left join public.vault_item_instances vii on vii.card_print_id = cp.id
    where s.identity_domain_default like 'pokemon_eng%'
      and coalesce(child.child_count, 0) = 0
    group by cp.id, s.name
    order by cp.set_code nulls last, cp.number_plain nulls last, cp.number nulls last, cp.name
  `);
}

async function loadExternalMappingGaps(client) {
  return queryRows(client, `
    with mappings as (
      select card_print_id, count(*) filter (where active = true)::int as active_mapping_count
      from public.external_mappings
      group by card_print_id
    )
    select
      cp.id::text as card_print_id,
      cp.set_code,
      s.name as set_name,
      cp.number,
      cp.number_plain,
      cp.name as card_name,
      cp.external_ids,
      jsonb_object_keys(coalesce(cp.external_ids, '{}'::jsonb)) as external_id_source
    from public.card_prints cp
    join public.sets s on s.id = cp.set_id
    left join mappings m on m.card_print_id = cp.id
    where s.identity_domain_default like 'pokemon_eng%'
      and coalesce(m.active_mapping_count, 0) = 0
      and cp.external_ids is not null
      and cp.external_ids <> '{}'::jsonb
  `);
}

async function loadChildPrintingCurrentRows(client, ids) {
  if (!ids.length) return new Map();
  const rows = await queryRows(client, `
    select
      cpr.id::text as card_printing_id,
      cpr.card_print_id::text as card_print_id,
      cpr.finish_key,
      cpr.printing_gv_id,
      cp.gv_id as parent_gv_id,
      cp.set_code,
      cp.number,
      cp.number_plain,
      cp.name as card_name
    from public.card_printings cpr
    join public.card_prints cp on cp.id = cpr.card_print_id
    where cpr.id = any($1::uuid[])
  `, [ids]);
  return new Map(rows.map((row) => [row.card_printing_id, row]));
}

function classifyParentCollision(candidate, owners) {
  const candidateHasNoDependents = Number(candidate.dependency?.child_count ?? 0) === 0
    && Number(candidate.dependency?.active_identity_count ?? 0) === 0
    && Number(candidate.dependency?.active_mapping_count ?? 0) === 0
    && Number(candidate.dependency?.trait_count ?? 0) === 0
    && Number(candidate.dependency?.species_count ?? 0) === 0
    && Number(candidate.dependency?.vault_instance_count ?? 0) === 0;
  const ownerHasCanonShape = owners.some((owner) =>
    Number(owner.child_count ?? 0) > 0
    || Number(owner.active_identity_count ?? 0) > 0
    || Number(owner.active_mapping_count ?? 0) > 0
  );
  if (candidateHasNoDependents && ownerHasCanonShape) return 'stale_empty_duplicate_parent_candidate';
  if (candidateHasNoDependents) return 'empty_collision_candidate_needs_owner_review';
  return 'collision_with_dependencies_manual_review';
}

function summarizeCollisionGroups(parentGvCandidates, dependencyMap, gvOwnerMap) {
  const sourceCollisionRows = parentGvCandidates
    .filter((row) => row.blockers?.includes('proposed_gv_id_existing_collision'));
  const alreadyResolvedRows = sourceCollisionRows
    .filter((row) => !dependencyMap.has(row.card_print_id));
  const collisionRows = sourceCollisionRows
    .filter((row) => dependencyMap.has(row.card_print_id))
    .map((row) => ({
      ...row,
      dependency: dependencyMap.get(row.card_print_id) ?? null,
      existing_owners: gvOwnerMap.get(row.proposed_gv_id) ?? [],
    }))
    .map((row) => ({
      ...row,
      residual_classification: classifyParentCollision(row, row.existing_owners),
    }));

  const groups = [...groupBy(collisionRows, (row) => row.proposed_gv_id).entries()]
    .map(([proposed_gv_id, rows]) => ({
      proposed_gv_id,
      candidate_count: rows.length,
      existing_owner_count: rows[0]?.existing_owners?.length ?? 0,
      residual_classification_counts: countBy(rows, (row) => row.residual_classification),
      candidates: rows.slice(0, 10).map((row) => ({
        card_print_id: row.card_print_id,
        set_code: row.set_code,
        number: row.number,
        card_name: row.card_name,
        dependency: row.dependency,
        residual_classification: row.residual_classification,
      })),
      existing_owners: rows[0]?.existing_owners ?? [],
    }));

  return {
    rows: collisionRows,
    groups,
    summary: {
      total_rows: collisionRows.length,
      source_collision_rows: sourceCollisionRows.length,
      already_resolved_or_deleted_rows: alreadyResolvedRows.length,
      total_groups: groups.length,
      by_residual_classification: countBy(collisionRows, (row) => row.residual_classification),
      by_set_top_25: Object.fromEntries(Object.entries(countBy(collisionRows, (row) => row.set_code ?? 'missing_set_code')).slice(0, 25)),
    },
    already_resolved_or_deleted_samples: alreadyResolvedRows.slice(0, 50),
  };
}

function summarizeIdentityDuplicateGroups(activeIdentityCandidates) {
  const duplicateRows = activeIdentityCandidates
    .filter((row) => row.blockers?.includes('identity_hash_batch_duplicate'))
    .map((row) => ({
      card_print_id: row.card_print_id,
      set_code: row.set_code,
      set_name: row.set_name,
      number: row.number,
      number_plain: row.number_plain,
      card_name: row.card_name,
      variant_key: row.variant_key,
      printed_identity_modifier: row.printed_identity_modifier,
      identity_key_hash: row.projected?.identity_key_hash ?? null,
      projected_identity: row.projected,
    }));
  const groups = [...groupBy(duplicateRows, (row) => row.identity_key_hash).entries()]
    .map(([identity_key_hash, rows]) => ({
      identity_key_hash,
      row_count: rows.length,
      set_codes: [...new Set(rows.map((row) => row.set_code).filter(Boolean))].sort(),
      numbers: [...new Set(rows.map((row) => row.number).filter(Boolean))].sort(),
      names: [...new Set(rows.map((row) => row.card_name).filter(Boolean))].sort(),
      modifiers: [...new Set(rows.map((row) => row.printed_identity_modifier).filter(Boolean))].sort(),
      likely_reason: rows.some((row) => clean(row.printed_identity_modifier))
        ? 'modifier_not_participating_in_projected_hash_or_duplicate_modified_parent'
        : 'duplicate_parent_same_identity',
      rows: rows.slice(0, 12),
    }))
    .sort((a, b) => b.row_count - a.row_count || String(a.identity_key_hash).localeCompare(String(b.identity_key_hash)));

  return {
    rows: duplicateRows,
    groups,
    summary: {
      total_rows: duplicateRows.length,
      total_groups: groups.length,
      by_likely_reason: countBy(groups, (row) => row.likely_reason),
      by_set_top_25: Object.fromEntries(Object.entries(countBy(duplicateRows, (row) => row.set_code ?? 'missing_set_code')).slice(0, 25)),
    },
  };
}

function summarizeChildGvBlockers(childGvCandidates, childCurrentMap = new Map()) {
  const blockedRows = childGvCandidates.filter((row) => row.classification === 'blocked_child_printing_gv_id_backfill');
  const crackedIceCandidateRows = blockedRows.filter((row) =>
    row.finish_key === 'cracked_ice'
    && row.blockers?.length === 1
    && row.blockers.includes('finish_suffix_rule_needed')
    && clean(row.parent_gv_id)
  );
  const crackedIceAppliedRows = [];
  const crackedIceGovernanceRows = [];
  for (const row of crackedIceCandidateRows) {
    const current = childCurrentMap.get(row.card_printing_id);
    if (current?.printing_gv_id) {
      crackedIceAppliedRows.push({
        ...row,
        current_printing_gv_id: current.printing_gv_id,
        current_parent_gv_id: current.parent_gv_id,
        residual_classification: 'already_backfilled_after_governed_suffix_apply',
      });
    } else {
      crackedIceGovernanceRows.push(row);
    }
  }
  const missingParentGvRows = blockedRows.filter((row) => row.blockers?.includes('missing_parent_gv_id'));
  return {
    summary: {
      total_blocked: blockedRows.length,
      cracked_ice_suffix_governance_source_rows: crackedIceCandidateRows.length,
      cracked_ice_suffix_governance_ready: crackedIceGovernanceRows.length,
      cracked_ice_suffix_governance_already_backfilled: crackedIceAppliedRows.length,
      missing_parent_gv_id: missingParentGvRows.length,
      by_finish: countBy(blockedRows, (row) => row.finish_key ?? 'missing_finish'),
      by_blocker: countBy(blockedRows.flatMap((row) => row.blockers ?? []), (value) => value),
      by_set_top_25: Object.fromEntries(Object.entries(countBy(blockedRows, (row) => row.set_code ?? 'missing_set_code')).slice(0, 25)),
    },
    cracked_ice_suffix_governance_rows: crackedIceGovernanceRows,
    cracked_ice_suffix_governance_applied_samples: crackedIceAppliedRows.slice(0, 50),
    missing_parent_gv_samples: missingParentGvRows.slice(0, 50),
  };
}

function summarizeNoChildParents(noChildRows) {
  const rows = noChildRows.map((row) => {
    const dependencyCount =
      Number(row.active_identity_count ?? 0)
      + Number(row.active_mapping_count ?? 0)
      + Number(row.trait_count ?? 0)
      + Number(row.species_count ?? 0)
      + Number(row.vault_instance_count ?? 0);
    let residual_classification = 'needs_master_index_adjudication';
    if (dependencyCount === 0) residual_classification = 'empty_parent_candidate_needs_duplicate_or_stale_review';
    if (dependencyCount > 0 && Number(row.active_mapping_count ?? 0) > 0) residual_classification = 'source_mapped_childless_parent_needs_master_index_child_decision';
    if (Number(row.vault_instance_count ?? 0) > 0) residual_classification = 'vault_referenced_childless_parent_manual_review';
    return {
      ...row,
      dependency_count: dependencyCount,
      residual_classification,
    };
  });
  return {
    rows,
    summary: {
      total_rows: rows.length,
      by_residual_classification: countBy(rows, (row) => row.residual_classification),
      by_set_top_25: Object.fromEntries(Object.entries(countBy(rows, (row) => row.set_code ?? 'missing_set_code')).slice(0, 25)),
    },
  };
}

function summarizeExternalMappings(rows) {
  const groupedRows = [...groupBy(rows, (row) => row.card_print_id).entries()].map(([card_print_id, sourceRows]) => ({
    card_print_id,
    set_code: sourceRows[0]?.set_code ?? null,
    set_name: sourceRows[0]?.set_name ?? null,
    number: sourceRows[0]?.number ?? null,
    card_name: sourceRows[0]?.card_name ?? null,
    sources: sourceRows.map((row) => row.external_id_source).filter(Boolean).sort(),
    source_count: sourceRows.length,
    residual_classification: sourceRows.length === 1
      ? 'single_source_external_id_payload_mapping_review'
      : 'multi_source_external_id_payload_mapping_review',
  }));
  return {
    rows: groupedRows,
    summary: {
      total_rows_with_payload: groupedRows.length,
      source_mentions: rows.length,
      by_source: countBy(rows, (row) => row.external_id_source),
      by_residual_classification: countBy(groupedRows, (row) => row.residual_classification),
      by_set_top_25: Object.fromEntries(Object.entries(countBy(groupedRows, (row) => row.set_code ?? 'missing_set_code')).slice(0, 25)),
    },
  };
}

async function main() {
  const dbUrl = connectionString();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for read-only audit.');

  const [parentGv, childGv, activeIdentity] = await Promise.all([
    readJson(PARENT_GV_JSON),
    readJson(CHILD_GV_JSON),
    readJson(ACTIVE_IDENTITY_JSON),
  ]);

  const parentRows = parentGv.rows ?? [];
  const childRows = childGv.rows ?? [];
  const identityRows = activeIdentity.rows ?? [];

  const collisionRows = parentRows.filter((row) => row.blockers?.includes('proposed_gv_id_existing_collision'));
  const collisionCandidateIds = collisionRows.map((row) => row.card_print_id);
  const collisionGvIds = [...new Set(collisionRows.map((row) => row.proposed_gv_id).filter(Boolean))];

  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  await client.query('set default_transaction_read_only = on');
  try {
    const dependencyMap = await loadParentDependencyRows(client, collisionCandidateIds);
    const gvOwnerMap = await loadGvOwners(client, collisionGvIds);
    const noChildRows = await loadNoChildParents(client);
    const externalMappingRows = await loadExternalMappingGaps(client);
    const blockedChildIds = childRows
      .filter((row) => row.classification === 'blocked_child_printing_gv_id_backfill')
      .map((row) => row.card_printing_id)
      .filter(Boolean);
    const childCurrentMap = await loadChildPrintingCurrentRows(client, blockedChildIds);

    const parentCollision = summarizeCollisionGroups(parentRows, dependencyMap, gvOwnerMap);
    const childBlockers = summarizeChildGvBlockers(childRows, childCurrentMap);
    const identityDuplicate = summarizeIdentityDuplicateGroups(identityRows);
    const noChild = summarizeNoChildParents(noChildRows);
    const externalMappings = summarizeExternalMappings(externalMappingRows);

    const report = {
      version: 'CARD_ROW_ENRICHMENT_RESIDUAL_BLOCKER_AUDIT_V1',
      generated_at: new Date().toISOString(),
      scope: {
        mode: 'read_only',
        db_writes_performed: false,
        migrations_created: false,
        image_work_included: false,
      },
      source_files: {
        parent_gv_candidates: PARENT_GV_JSON,
        child_gv_candidates: CHILD_GV_JSON,
        active_identity_candidates: ACTIVE_IDENTITY_JSON,
      },
      parent_gv_collision: {
        summary: parentCollision.summary,
        groups: parentCollision.groups.slice(0, 300),
      },
      parent_gv_missing_identity_fields: {
        summary: {
          missing_parent_set_code_rows: parentRows.filter((row) => row.blockers?.includes('missing_parent_set_code')).length,
          missing_printed_number_rows: parentRows.filter((row) => row.blockers?.includes('missing_printed_number')).length,
          by_set_top_25: Object.fromEntries(Object.entries(countBy(parentRows.filter((row) => row.blockers?.includes('missing_parent_set_code') || row.blockers?.includes('missing_printed_number')), (row) => row.set_code ?? 'missing_set_code')).slice(0, 25)),
        },
        samples: parentRows.filter((row) => row.blockers?.includes('missing_parent_set_code') || row.blockers?.includes('missing_printed_number')).slice(0, 100),
      },
      child_printing_gv_blockers: childBlockers,
      active_identity_duplicate_hashes: {
        summary: identityDuplicate.summary,
        groups: identityDuplicate.groups.slice(0, 300),
      },
      no_child_printing_parents: {
        summary: noChild.summary,
        samples: noChild.rows.slice(0, 250),
      },
      external_mapping_payload_gaps: {
        summary: externalMappings.summary,
        samples: externalMappings.rows.slice(0, 250),
      },
      recommended_next_packages: [
        {
          package_id: 'ENRICH-04-CRACKED-ICE-PRINTING-GV-ID-SUFFIX',
          status: childBlockers.summary.cracked_ice_suffix_governance_ready > 0
            ? 'ready_for_governance_dry_run_preparation'
            : 'no_ready_rows',
          candidate_rows: childBlockers.summary.cracked_ice_suffix_governance_ready,
          required_decision: 'Approve governed child printing GV suffix for cracked_ice, recommended suffix CRACKED-ICE.',
          writes_if_later_approved: ['card_printings.printing_gv_id'],
          forbidden: ['parent writes', 'identity writes', 'deletes', 'merges', 'migrations', 'image writes'],
        },
        {
          package_id: 'ENRICH-06-EMPTY-DUPLICATE-PARENT-REVIEW',
          status: parentCollision.summary.by_residual_classification?.stale_empty_duplicate_parent_candidate
            ? 'needs_guarded_dependency_transfer_or_delete_design'
            : 'blocked',
          candidate_rows: parentCollision.summary.by_residual_classification?.stale_empty_duplicate_parent_candidate ?? 0,
          required_decision: 'Design separate package. Do not delete from this audit.',
        },
        {
          package_id: 'ENRICH-07-EXTERNAL-MAPPING-PAYLOAD-BACKFILL',
          status: externalMappings.summary.total_rows_with_payload > 0
            ? 'needs_source_specific_guarded_dry_run_design'
            : 'no_payload_rows',
          candidate_rows: externalMappings.summary.total_rows_with_payload,
          required_decision: 'Validate external_ids source keys and collision rules before insert.',
        },
      ],
    };

    report.fingerprint_sha256 = sha256(stableJson({
      version: report.version,
      generated_at: report.generated_at,
      parent_gv_collision_summary: report.parent_gv_collision.summary,
      child_printing_gv_summary: report.child_printing_gv_blockers.summary,
      active_identity_summary: report.active_identity_duplicate_hashes.summary,
      no_child_summary: report.no_child_printing_parents.summary,
      external_mapping_summary: report.external_mapping_payload_gaps.summary,
      recommended_next_packages: report.recommended_next_packages,
    }));

    await writeJson(OUTPUT_JSON, report);

    const md = [
      '# Card Row Enrichment Residual Blocker Audit V1',
      '',
      'Read-only overnight residual blocker classification after ENRICH-01/02/03.',
      '',
      '## Safety',
      '',
      '- DB writes performed: false',
      '- Migrations created: false',
      '- Image work included: false',
      '- This report is not apply authority.',
      '',
      '## Parent GV-ID Collisions',
      '',
      markdownTable([
        { metric: 'blocked collision rows', value: parentCollision.summary.total_rows },
        { metric: 'collision groups', value: parentCollision.summary.total_groups },
        ...Object.entries(parentCollision.summary.by_residual_classification).map(([metric, value]) => ({ metric, value })),
      ], [
        { label: 'metric', value: (row) => row.metric },
        { label: 'value', value: (row) => row.value },
      ]),
      '',
      '## Child Printing GV-ID Blockers',
      '',
      markdownTable([
        { metric: 'total blocked', value: childBlockers.summary.total_blocked },
        { metric: 'cracked ice suffix governance ready', value: childBlockers.summary.cracked_ice_suffix_governance_ready },
        { metric: 'missing parent gv_id', value: childBlockers.summary.missing_parent_gv_id },
      ], [
        { label: 'metric', value: (row) => row.metric },
        { label: 'value', value: (row) => row.value },
      ]),
      '',
      '## Active Identity Duplicate Hashes',
      '',
      markdownTable([
        { metric: 'duplicate rows', value: identityDuplicate.summary.total_rows },
        { metric: 'duplicate groups', value: identityDuplicate.summary.total_groups },
        ...Object.entries(identityDuplicate.summary.by_likely_reason).map(([metric, value]) => ({ metric, value })),
      ], [
        { label: 'metric', value: (row) => row.metric },
        { label: 'value', value: (row) => row.value },
      ]),
      '',
      '## No-Child Parent Rows',
      '',
      markdownTable(Object.entries(noChild.summary.by_residual_classification).map(([metric, value]) => ({ metric, value })), [
        { label: 'classification', value: (row) => row.metric },
        { label: 'rows', value: (row) => row.value },
      ]),
      '',
      '## External Mapping Payload Gaps',
      '',
      markdownTable([
        { metric: 'rows with external_ids payload', value: externalMappings.summary.total_rows_with_payload },
        { metric: 'source mentions', value: externalMappings.summary.source_mentions },
        ...Object.entries(externalMappings.summary.by_source).slice(0, 15).map(([metric, value]) => ({ metric, value })),
      ], [
        { label: 'metric/source', value: (row) => row.metric },
        { label: 'value', value: (row) => row.value },
      ]),
      '',
      '## Recommended Next Packages',
      '',
      markdownTable(report.recommended_next_packages, [
        { label: 'package', value: (row) => row.package_id },
        { label: 'status', value: (row) => row.status },
        { label: 'candidate rows', value: (row) => row.candidate_rows },
        { label: 'required decision', value: (row) => row.required_decision },
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
      recommended_next_packages: report.recommended_next_packages,
    }, null, 2));
  } finally {
    await client.end();
  }
}

await main();
