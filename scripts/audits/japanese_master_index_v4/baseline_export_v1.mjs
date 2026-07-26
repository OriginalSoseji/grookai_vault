import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

import dotenv from 'dotenv';

import {
  assertAuditOnlyArgs,
  withReadOnlyClient,
} from './read_only_guard_v1.mjs';
import {
  buildArtifact,
  contentFingerprint,
  sha256,
  stableJson,
  writeJsonArtifact,
} from './deterministic_artifact_v1.mjs';

export const BASELINE_EXPORT_VERSION = 'JPN-MASTER-INDEX-BASELINE-EXPORT-V1';

const DEFAULT_OUTPUT_ROOT = 'docs/audits/japanese_master_index_v4/baseline';
const JPN_PARENT_PREDICATE = `c.identity_domain = 'pokemon_jpn'`;
const EXPECTED_PLAN_BASELINE = {
  jpn_parent_rows: 26_047,
  public_jpn_gv_ids: 25_985,
  active_jpn_identities: 25_953,
  jpn_child_printings: 25_953,
  raw_set_codes: 504,
  case_folded_set_codes: 388,
  case_only_alias_groups: 116,
  source_placeholder_sets: 45,
  cards_in_source_placeholder_sets: 1_297,
  no_public_gv_or_image_rows: 62,
  no_active_identity_or_evidence_rows: 94,
};

function parseArgs(argv) {
  const options = {
    outputRoot: DEFAULT_OUTPUT_ROOT,
    environmentLabel: 'production-read-only',
    envFile: null,
  };

  for (const arg of argv) {
    if (arg.startsWith('--output-root=')) {
      options.outputRoot = arg.slice('--output-root='.length);
    } else if (arg.startsWith('--environment=')) {
      options.environmentLabel = arg.slice('--environment='.length);
    } else if (arg.startsWith('--env-file=')) {
      options.envFile = arg.slice('--env-file='.length);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function sortRows(rows, keys) {
  return [...rows].sort((left, right) => {
    for (const key of keys) {
      const comparison = String(left[key] ?? '').localeCompare(String(right[key] ?? ''));
      if (comparison !== 0) return comparison;
    }
    return 0;
  });
}

function classifyGap(row) {
  const quality = row.data_quality_flags ?? {};
  const external = row.external_ids ?? {};
  const duplicate = (
    quality.master_identity_graph_jpn_duplicate_shell
    ?? external.master_identity_graph_jpn_duplicate_shell
  );

  if (duplicate?.status === 'superseded_duplicate_shell' || duplicate?.canonical_card_print_id) {
    return {
      classification: 'superseded_duplicate_shell',
      canonical_card_print_id: duplicate.canonical_card_print_id ?? null,
      canonical_gv_id: duplicate.canonical_gv_id ?? null,
    };
  }

  if (quality.new_set_release_ingestion_v1 || external.new_set_release_ingestion_v1) {
    return {
      classification: 'new_set_release_identity_or_evidence_pending',
      canonical_card_print_id: null,
      canonical_gv_id: null,
    };
  }

  if (!row.has_active_identity && row.has_active_evidence) {
    return {
      classification: 'active_identity_missing_evidence_present',
      canonical_card_print_id: null,
      canonical_gv_id: null,
    };
  }

  if (row.has_active_identity && !row.has_active_evidence) {
    return {
      classification: 'active_evidence_missing_identity_present',
      canonical_card_print_id: null,
      canonical_gv_id: null,
    };
  }

  return {
    classification: 'identity_and_evidence_missing_unclassified',
    canonical_card_print_id: null,
    canonical_gv_id: null,
  };
}

function driftReport(actual) {
  return Object.fromEntries(
    Object.entries(EXPECTED_PLAN_BASELINE).map(([key, expected]) => [
      key,
      {
        expected,
        actual: actual[key],
        delta: Number(actual[key]) - expected,
        matches: Number(actual[key]) === expected,
      },
    ]),
  );
}

function markdownSummary({
  generatedAt,
  guard,
  parentSummary,
  sourceCoverage,
  setInventory,
  gapQueue,
  englishFingerprint,
  artifactRecords,
}) {
  const sourceRows = sourceCoverage.sources
    .map((row) => `| ${row.source_key} | ${row.evidence_rows} | ${row.card_rows} |`)
    .join('\n');
  const driftRows = Object.entries(parentSummary.plan_baseline_drift)
    .map(([key, value]) => `| ${key} | ${value.expected} | ${value.actual} | ${value.delta} |`)
    .join('\n');

  return `# Japanese Master Index V4 - Live Baseline

Generated: ${generatedAt}

## No-Write Proof

- Guard: \`${guard.guard_version}\`
- Transaction read-only: \`${guard.transaction_read_only}\`
- Session default read-only: \`${guard.default_transaction_read_only}\`
- Environment key: \`${guard.environment_key_sha256}\`
- Database writes: **false**
- Storage writes: **false**

## Current Japanese Graph

| Measure | Count |
|---|---:|
| Japanese parent rows | ${parentSummary.counts.jpn_parent_rows} |
| Public Japanese GV IDs | ${parentSummary.counts.public_jpn_gv_ids} |
| Active Japanese identities | ${parentSummary.counts.active_jpn_identities} |
| Japanese child printings | ${parentSummary.counts.jpn_child_printings} |
| Raw set codes | ${parentSummary.counts.raw_set_codes} |
| Case-folded set codes | ${parentSummary.counts.case_folded_set_codes} |
| Case-only alias groups | ${parentSummary.counts.case_only_alias_groups} |
| Source-placeholder sets | ${parentSummary.counts.source_placeholder_sets} |
| Cards under source-placeholder sets | ${parentSummary.counts.cards_in_source_placeholder_sets} |
| No public GV ID or image | ${parentSummary.counts.no_public_gv_or_image_rows} |
| No active identity or evidence lane | ${parentSummary.counts.no_active_identity_or_evidence_rows} |

## Plan Baseline Drift

| Measure | Expected | Actual | Delta |
|---|---:|---:|---:|
${driftRows}

Drift is evidence, not an automatic error. Every delta remains in the baseline
and must be reconciled by the index build.

## Stored Evidence Lanes

| Source | Evidence rows | Parent cards |
|---|---:|---:|
${sourceRows}

## Gap Classification

- Identity/evidence gap rows: ${gapQueue.identity_or_evidence_gaps.length}
- Private or no-image rows: ${gapQueue.private_or_no_image_rows.length}
- Classifications: \`${JSON.stringify(gapQueue.classification_counts)}\`

## Set Inventory

- Exact source set codes: ${setInventory.exact_set_code_count}
- Case-folded set codes: ${setInventory.case_folded_set_code_count}
- Case-only alias groups: ${setInventory.case_only_alias_groups.length}
- Source-placeholder set codes: ${setInventory.source_placeholder_sets.length}

## English Reference Freeze

- Active species rows: ${englishFingerprint.active_species_count}
- Active English species links: ${englishFingerprint.active_english_species_link_count}
- Combined fingerprint: \`${englishFingerprint.combined_fingerprint_sha256}\`

## Artifacts

${artifactRecords.map((record) => `- \`${record.path}\` - \`${record.sha256}\``).join('\n')}
`;
}

export async function exportBaseline({
  connectionString,
  outputRoot = DEFAULT_OUTPUT_ROOT,
  environmentLabel = 'production-read-only',
  generatedAt = new Date().toISOString(),
}) {
  return withReadOnlyClient({
    connectionString,
    environmentLabel,
  }, async (db, guard) => {
    const schemaRows = (await db.query(`
      select
        table_name,
        column_name,
        data_type,
        is_nullable,
        ordinal_position
      from information_schema.columns
      where table_schema = 'public'
        and table_name = any($1::text[])
      order by table_name, ordinal_position
    `, [[
      'card_prints',
      'card_printings',
      'sets',
      'card_print_identity',
      'card_print_identity_source_evidence',
      'card_print_family_review_queue',
      'card_print_species',
      'pokemon_species',
    ]])).rows;
    const schemaFingerprint = contentFingerprint(schemaRows);
    const retrieval = {
      ...guard,
      schema_fingerprint_sha256: schemaFingerprint,
    };

    const counts = (await db.query(`
      with jpn as (
        select c.*
        from public.card_prints c
        where ${JPN_PARENT_PREDICATE}
      ),
      exact_codes as (
        select distinct set_code
        from jpn
        where set_code is not null
      ),
      folded_codes as (
        select lower(set_code) folded_code, count(distinct set_code) exact_count
        from jpn
        where set_code is not null
        group by lower(set_code)
      ),
      placeholder_codes as (
        select distinct set_code
        from jpn
        where lower(set_code) like 'jpn-tcgcollector:%'
           or lower(set_code) like 'jpn-artofpkm:%'
      )
      select
        (select count(*) from jpn)::int as jpn_parent_rows,
        (select count(*) from jpn where gv_id like 'GV-PK-JPN-%')::int
          as public_jpn_gv_ids,
        (
          select count(distinct i.card_print_id)
          from public.card_print_identity i
          join jpn c on c.id = i.card_print_id
          where i.is_active
        )::int as active_jpn_identities,
        (
          select count(*)
          from public.card_printings p
          join jpn c on c.id = p.card_print_id
        )::int as jpn_child_printings,
        (select count(*) from exact_codes)::int as raw_set_codes,
        (select count(*) from folded_codes)::int as case_folded_set_codes,
        (select count(*) from folded_codes where exact_count > 1)::int
          as case_only_alias_groups,
        (select count(*) from placeholder_codes)::int as source_placeholder_sets,
        (
          select count(*)
          from jpn c
          join placeholder_codes p on p.set_code = c.set_code
        )::int as cards_in_source_placeholder_sets,
        (
          select count(*)
          from jpn
          where gv_id is null
             or coalesce(image_url, representative_image_url, image_alt_url) is null
        )::int as no_public_gv_or_image_rows,
        (
          select count(*)
          from jpn c
          where not exists (
            select 1
            from public.card_print_identity i
            where i.card_print_id = c.id and i.is_active
          )
          or not exists (
            select 1
            from public.card_print_identity_source_evidence e
            where e.card_print_id = c.id and e.active
          )
        )::int as no_active_identity_or_evidence_rows,
        (
          select count(distinct s.card_print_id)
          from public.card_print_species s
          join jpn c on c.id = s.card_print_id
          where s.active and s.role = 'primary'
        )::int as active_primary_species_links,
        (
          select count(*)
          from public.card_print_family_review_queue q
          join jpn c on c.id = q.card_print_id
          where q.active
        )::int as active_family_review_rows
    `)).rows[0];

    const familyReviewStatuses = sortRows((await db.query(`
      select q.review_status, q.family_status, count(*)::int as rows
      from public.card_print_family_review_queue q
      join public.card_prints c on c.id = q.card_print_id
      where ${JPN_PARENT_PREDICATE} and q.active
      group by q.review_status, q.family_status
      order by q.review_status, q.family_status
    `)).rows, ['review_status', 'family_status']);

    const parentSummaryContent = {
      counts,
      family_review_statuses: familyReviewStatuses,
      plan_baseline_drift: driftReport(counts),
      schema_fingerprint_sha256: schemaFingerprint,
    };

    const sourceRows = sortRows((await db.query(`
      select
        e.source_key,
        count(*)::int as evidence_rows,
        count(distinct e.card_print_id)::int as card_rows,
        min(e.created_at) as first_stored_at,
        max(e.updated_at) as last_stored_at
      from public.card_print_identity_source_evidence e
      join public.card_prints c on c.id = e.card_print_id
      where ${JPN_PARENT_PREDICATE} and e.active
      group by e.source_key
      order by e.source_key
    `)).rows, ['source_key']);

    const laneDistribution = sortRows((await db.query(`
      with lane_counts as (
        select
          c.id,
          count(distinct e.source_key)::int as stored_lane_count
        from public.card_prints c
        left join public.card_print_identity_source_evidence e
          on e.card_print_id = c.id and e.active
        where ${JPN_PARENT_PREDICATE}
        group by c.id
      )
      select stored_lane_count, count(*)::int as parent_rows
      from lane_counts
      group by stored_lane_count
      order by stored_lane_count
    `)).rows, ['stored_lane_count']);

    const sourceCoverageContent = {
      sources: sourceRows,
      stored_lane_distribution: laneDistribution,
      note: 'Stored source keys are evidence lanes; source-family independence is adjudicated later.',
    };

    const setCodeRows = sortRows((await db.query(`
      select
        c.set_code,
        lower(c.set_code) as folded_set_code,
        count(*)::int as parent_rows,
        count(*) filter (where c.gv_id like 'GV-PK-JPN-%')::int as public_rows,
        count(*) filter (
          where exists (
            select 1 from public.card_print_identity i
            where i.card_print_id = c.id and i.is_active
          )
        )::int as active_identity_rows,
        array_remove(array_agg(distinct e.source_key order by e.source_key), null)
          as stored_source_keys
      from public.card_prints c
      left join public.card_print_identity_source_evidence e
        on e.card_print_id = c.id and e.active
      where ${JPN_PARENT_PREDICATE}
        and c.set_code is not null
      group by c.set_code, lower(c.set_code)
      order by lower(c.set_code), c.set_code
    `)).rows, ['folded_set_code', 'set_code']);

    const caseAliases = sortRows((await db.query(`
      select
        lower(c.set_code) as folded_set_code,
        array_agg(distinct c.set_code order by c.set_code) as exact_set_codes,
        count(*)::int as parent_rows
      from public.card_prints c
      where ${JPN_PARENT_PREDICATE}
        and c.set_code is not null
      group by lower(c.set_code)
      having count(distinct c.set_code) > 1
      order by lower(c.set_code)
    `)).rows, ['folded_set_code']);

    const placeholderSets = setCodeRows.filter(
      (row) => (
        row.folded_set_code.startsWith('jpn-tcgcollector:')
        || row.folded_set_code.startsWith('jpn-artofpkm:')
      ),
    );

    const setInventoryContent = {
      exact_set_code_count: setCodeRows.length,
      case_folded_set_code_count: new Set(
        setCodeRows.map((row) => row.folded_set_code),
      ).size,
      set_codes: setCodeRows,
      case_only_alias_groups: caseAliases,
      source_placeholder_sets: placeholderSets,
    };

    const gapRows = (await db.query(`
      select
        c.id::text as card_print_id,
        c.gv_id,
        c.set_code,
        c.number,
        c.name,
        c.image_url,
        c.representative_image_url,
        c.image_alt_url,
        c.external_ids,
        c.data_quality_flags,
        exists (
          select 1 from public.card_print_identity i
          where i.card_print_id = c.id and i.is_active
        ) as has_active_identity,
        exists (
          select 1 from public.card_print_identity_source_evidence e
          where e.card_print_id = c.id and e.active
        ) as has_active_evidence
      from public.card_prints c
      where ${JPN_PARENT_PREDICATE}
        and (
          c.gv_id is null
          or coalesce(c.image_url, c.representative_image_url, c.image_alt_url) is null
          or not exists (
            select 1 from public.card_print_identity i
            where i.card_print_id = c.id and i.is_active
          )
          or not exists (
            select 1 from public.card_print_identity_source_evidence e
            where e.card_print_id = c.id and e.active
          )
        )
      order by c.set_code, c.number, c.name, c.id
    `)).rows;

    const classifiedGaps = gapRows.map((row) => {
      const classification = classifyGap(row);
      return {
        card_print_id: row.card_print_id,
        gv_id: row.gv_id,
        set_code: row.set_code,
        printed_number: row.number,
        printed_name: row.name,
        has_public_gv_id: Boolean(row.gv_id),
        has_image: Boolean(
          row.image_url ?? row.representative_image_url ?? row.image_alt_url,
        ),
        has_active_identity: row.has_active_identity,
        has_active_evidence: row.has_active_evidence,
        ...classification,
      };
    });
    const identityOrEvidenceGaps = classifiedGaps.filter(
      (row) => !row.has_active_identity || !row.has_active_evidence,
    );
    const privateOrNoImageRows = classifiedGaps.filter(
      (row) => !row.has_public_gv_id || !row.has_image,
    );
    const classificationCounts = classifiedGaps.reduce((countsByClass, row) => {
      countsByClass[row.classification] = (countsByClass[row.classification] ?? 0) + 1;
      return countsByClass;
    }, {});
    const gapQueueContent = {
      identity_or_evidence_gaps: identityOrEvidenceGaps,
      private_or_no_image_rows: privateOrNoImageRows,
      classification_counts: classificationCounts,
      unresolved_unclassified_count: classifiedGaps.filter(
        (row) => row.classification === 'identity_and_evidence_missing_unclassified',
      ).length,
    };

    const speciesRows = (await db.query(`
      select
        id::text,
        national_dex_number,
        canonical_name,
        slug,
        is_form,
        coalesce(base_species_id::text, '') as base_species_id
      from public.pokemon_species
      where active
      order by national_dex_number, slug, id
    `)).rows;
    const englishSpeciesLinks = (await db.query(`
      select
        s.card_print_id::text,
        s.species_id::text,
        s.role,
        s.counts_for_completion,
        s.source,
        coalesce(s.confidence::text, '') as confidence
      from public.card_print_species s
      join public.card_prints c on c.id = s.card_print_id
      where s.active
        and c.identity_domain = 'pokemon_eng_standard'
      order by s.card_print_id, s.species_id, s.role
    `)).rows;
    const speciesFingerprint = contentFingerprint(speciesRows);
    const englishLinkFingerprint = contentFingerprint(englishSpeciesLinks);
    const englishFamilyContent = {
      active_species_count: speciesRows.length,
      active_species_fingerprint_sha256: speciesFingerprint,
      active_english_species_link_count: englishSpeciesLinks.length,
      active_english_species_link_fingerprint_sha256: englishLinkFingerprint,
      combined_fingerprint_sha256: sha256(
        `${speciesFingerprint}:${englishLinkFingerprint}`,
      ),
    };

    const sourceManifestContent = {
      generator_version: BASELINE_EXPORT_VERSION,
      queried_tables: [...new Set(schemaRows.map((row) => row.table_name))].sort(),
      stored_sources: sourceRows.map((row) => ({
        source_key: row.source_key,
        evidence_rows: row.evidence_rows,
        card_rows: row.card_rows,
        first_stored_at: row.first_stored_at,
        last_stored_at: row.last_stored_at,
        preservation_status: 'live_database_evidence_exported',
      })),
      raw_source_acquisition_status: 'not_started_in_v4',
      note: 'This manifest inventories preserved live evidence only; Phase 3 adds source-owned raw artifacts.',
    };

    const artifactsToWrite = [
      ['live_jpn_parent_summary_v1.json', 'LIVE-JPN-PARENT-SUMMARY-V1', parentSummaryContent],
      ['live_jpn_source_coverage_v1.json', 'LIVE-JPN-SOURCE-COVERAGE-V1', sourceCoverageContent],
      ['live_jpn_set_code_inventory_v1.json', 'LIVE-JPN-SET-CODE-INVENTORY-V1', setInventoryContent],
      ['live_jpn_identity_gap_queue_v1.json', 'LIVE-JPN-IDENTITY-GAP-QUEUE-V1', gapQueueContent],
      ['english_family_reference_fingerprint_v1.json', 'ENGLISH-FAMILY-REFERENCE-FINGERPRINT-V1', englishFamilyContent],
      ['live_jpn_source_manifest_v1.json', 'LIVE-JPN-SOURCE-MANIFEST-V1', sourceManifestContent],
    ];

    const artifactRecords = [];
    for (const [filename, packageId, content] of artifactsToWrite) {
      const artifact = buildArtifact({
        packageId,
        generatedAt,
        retrieval,
        content,
      });
      artifactRecords.push(await writeJsonArtifact(
        path.join(outputRoot, filename),
        artifact,
      ));
    }

    const summaryMarkdown = markdownSummary({
      generatedAt,
      guard,
      parentSummary: parentSummaryContent,
      sourceCoverage: sourceCoverageContent,
      setInventory: setInventoryContent,
      gapQueue: gapQueueContent,
      englishFingerprint: englishFamilyContent,
      artifactRecords,
    });
    const summaryPath = path.join(outputRoot, 'live_jpn_baseline_summary_v1.md');
    await fs.writeFile(summaryPath, summaryMarkdown, 'utf8');
    artifactRecords.push({
      path: summaryPath.replaceAll('\\', '/'),
      bytes: Buffer.byteLength(summaryMarkdown),
      sha256: sha256(summaryMarkdown),
      content_fingerprint_sha256: null,
    });

    const manifestContent = {
      generator_version: BASELINE_EXPORT_VERSION,
      schema_fingerprint_sha256: schemaFingerprint,
      no_write_boundary: {
        database_writes: false,
        storage_writes: false,
        pricing_writes: false,
        identity_writes: false,
        family_promotion_writes: false,
      },
      artifacts: artifactRecords,
    };
    const manifest = buildArtifact({
      packageId: 'LIVE-JPN-BASELINE-MANIFEST-V1',
      generatedAt,
      retrieval,
      content: manifestContent,
    });
    const manifestRecord = await writeJsonArtifact(
      path.join(outputRoot, 'live_jpn_baseline_manifest_v1.json'),
      manifest,
    );

    return {
      generated_at: generatedAt,
      output_root: outputRoot,
      guard,
      counts,
      gap_classifications: classificationCounts,
      english_family_reference_fingerprint: englishFamilyContent.combined_fingerprint_sha256,
      artifacts: [...artifactRecords, manifestRecord],
    };
  });
}

async function main() {
  const argv = process.argv.slice(2);
  assertAuditOnlyArgs(argv);
  const options = parseArgs(argv);
  dotenv.config(options.envFile ? { path: options.envFile } : {});
  const connectionString = (
    process.env.SUPABASE_DB_URL
    ?? process.env.DATABASE_URL
    ?? process.env.POSTGRES_URL
  );
  const result = await exportBaseline({
    connectionString,
    outputRoot: options.outputRoot,
    environmentLabel: options.environmentLabel,
  });
  process.stdout.write(stableJson(result));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack : error);
    process.exitCode = 1;
  });
}
