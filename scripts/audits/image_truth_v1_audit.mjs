import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/image_truth_v1';
const AUDIT_JSON = path.join(OUTPUT_DIR, 'image_truth_audit_v1.json');
const AUDIT_MD = path.join(OUTPUT_DIR, 'image_truth_audit_v1.md');
const RISK_JSON = path.join(OUTPUT_DIR, 'image_truth_risk_queue_v1.json');
const RISK_MD = path.join(OUTPUT_DIR, 'image_truth_risk_queue_v1.md');
const CONFIDENCE_JSON = path.join(OUTPUT_DIR, 'image_truth_confidence_audit_v1.json');
const CONFIDENCE_MD = path.join(OUTPUT_DIR, 'image_truth_confidence_audit_v1.md');
const RISK_QUEUE_LIMIT = 1000;
const ADDRESSABLE_QUEUE_LIMIT = 500;

const CHILD_IMAGE_COLUMNS = [
  'image_source',
  'image_path',
  'image_url',
  'image_alt_url',
  'image_status',
  'image_note',
];

const VISUALLY_DISTINCT_FINISHES = new Set([
  'reverse',
  'reverse_holo',
  'pokeball',
  'poke_ball_reverse',
  'masterball',
  'master_ball_reverse',
  'rocket_reverse',
  'cosmos',
  'cosmos_holo',
  'cracked_ice',
  'stamped',
]);

const FINISH_REVIEW_FINISHES = new Set(['holo']);
const NORMALISH_FINISHES = new Set(['normal', 'standard']);
const NON_MEANINGFUL_MODIFIERS = new Set(['', 'base', 'default', 'normal', 'standard', 'none']);
const STAMP_OR_MODIFIER_PATTERN = /(stamp|stamped|staff|league|winner|prerelease|pokemon_together|play_pokemon|first_edition|1st_edition|championship|professor|pokemon_center|eb_games|gamestop|toys_r_us)/i;

function requireDbUrl() {
  return (
    process.env.SUPABASE_DB_URL ??
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    null
  );
}

function clean(value) {
  const normalized = String(value ?? '').trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeKey(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function normalizeStatus(value) {
  return normalizeKey(value) || 'unset';
}

function intValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function hasExactImage(row, prefix) {
  return Boolean(clean(row[`${prefix}_image_url`]) || clean(row[`${prefix}_image_alt_url`]) || clean(row[`${prefix}_image_path`]));
}

function hasPublicImage(row, prefix) {
  return Boolean(clean(row[`${prefix}_image_url`]) || clean(row[`${prefix}_image_alt_url`]));
}

function hasRepresentativeImage(row) {
  return Boolean(clean(row.parent_representative_image_url));
}

function isModifierVisuallyDistinct(row) {
  const values = [
    row.variant_key,
    row.printed_identity_modifier,
    row.parent_gv_id,
    row.card_name,
  ].map((value) => normalizeKey(value));

  if (values.some((value) => value && !NON_MEANINGFUL_MODIFIERS.has(value) && STAMP_OR_MODIFIER_PATTERN.test(value))) {
    return true;
  }

  return false;
}

function requiresExactChildImage(row) {
  const finishKey = normalizeKey(row.finish_key);
  if (VISUALLY_DISTINCT_FINISHES.has(finishKey)) {
    return true;
  }
  if (!NORMALISH_FINISHES.has(finishKey) && !FINISH_REVIEW_FINISHES.has(finishKey) && finishKey !== '') {
    return true;
  }
  return isModifierVisuallyDistinct(row);
}

function needsFinishVisualReview(row) {
  const finishKey = normalizeKey(row.finish_key);
  return FINISH_REVIEW_FINISHES.has(finishKey);
}

function imageCoverageStatus(row, hasChildImageStorageColumns) {
  if (hasChildImageStorageColumns && hasExactImage(row, 'child')) {
    return 'exact_child_image_present';
  }
  if (hasPublicImage(row, 'parent')) {
    return 'using_parent_exact_image';
  }
  if (hasRepresentativeImage(row)) {
    return 'using_parent_representative_image';
  }
  return 'missing_display_image';
}

function imageConfidence(row, hasChildImageStorageColumns, imageScope) {
  if (imageScope !== 'english_physical') {
    return 'blocked';
  }

  const childStatus = normalizeStatus(row.child_image_status);
  const coverage = imageCoverageStatus(row, hasChildImageStorageColumns);
  const exactRequired = requiresExactChildImage(row);

  if (hasChildImageStorageColumns && hasExactImage(row, 'child')) {
    if (childStatus === 'exact') return 'exact';
    if (childStatus === 'representative' || childStatus.startsWith('representative_')) return 'representative';
    if (childStatus === 'missing_variant_visual') return 'missing_variant_visual';
    return 'blocked';
  }

  if (coverage === 'missing_display_image') {
    return 'missing';
  }

  if (exactRequired) {
    return 'missing_variant_visual';
  }

  if (coverage === 'using_parent_exact_image') {
    return 'exact';
  }

  if (coverage === 'using_parent_representative_image') {
    return 'representative';
  }

  return 'blocked';
}

function confidenceReason(row, hasChildImageStorageColumns, imageScope) {
  const confidence = imageConfidence(row, hasChildImageStorageColumns, imageScope);
  const coverage = imageCoverageStatus(row, hasChildImageStorageColumns);
  if (confidence === 'exact') {
    return coverage === 'exact_child_image_present'
      ? 'exact_child_image_present'
      : 'base_or_non_visual_child_uses_parent_exact_image';
  }
  if (confidence === 'representative') return 'representative_display_image_available';
  if (confidence === 'missing_variant_visual') return 'display_image_available_but_exact_finish_or_modifier_visual_missing';
  if (confidence === 'missing') return 'no_safe_display_image_available';
  if (imageScope !== 'english_physical') return `blocked_scope_${imageScope}`;
  return 'blocked_unproven_child_image_status';
}

function riskLevel(row, hasChildImageStorageColumns) {
  const coverage = imageCoverageStatus(row, hasChildImageStorageColumns);
  const exactRequired = requiresExactChildImage(row);
  const ownershipRefs = intValue(row.ownership_refs_count);

  if (exactRequired && coverage === 'missing_display_image') {
    return 'critical';
  }
  if (exactRequired && coverage === 'using_parent_exact_image') {
    return 'high';
  }
  if (exactRequired && coverage === 'using_parent_representative_image') {
    return 'high';
  }
  if (!exactRequired && coverage === 'missing_display_image') {
    return 'medium';
  }
  if (ownershipRefs > 0 && exactRequired && coverage !== 'exact_child_image_present') {
    return 'high';
  }
  if (!hasChildImageStorageColumns && exactRequired) {
    return 'high';
  }
  return 'low';
}

function riskReasons(row, hasChildImageStorageColumns) {
  const reasons = [];
  const finishKey = normalizeKey(row.finish_key);
  const coverage = imageCoverageStatus(row, hasChildImageStorageColumns);

  if (!hasChildImageStorageColumns) reasons.push('child_image_storage_columns_absent');
  if (VISUALLY_DISTINCT_FINISHES.has(finishKey)) reasons.push('visually_distinct_finish');
  if (needsFinishVisualReview(row)) reasons.push('holo_finish_review_debt');
  if (!NORMALISH_FINISHES.has(finishKey) && finishKey !== '' && !FINISH_REVIEW_FINISHES.has(finishKey)) reasons.push('non_normal_finish');
  if (isModifierVisuallyDistinct(row)) reasons.push('visual_identity_modifier_or_stamp');
  if (coverage === 'using_parent_exact_image') reasons.push('child_printing_falls_back_to_parent_exact_image');
  if (coverage === 'using_parent_representative_image') reasons.push('child_printing_falls_back_to_parent_representative_image');
  if (coverage === 'missing_display_image') reasons.push('no_display_image_available');
  if (intValue(row.ownership_refs_count) > 0) reasons.push('owned_child_printing_reference');

  return reasons.length > 0 ? reasons : ['low_risk_base_image_use'];
}

function groupCount(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row) ?? 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

function topRows(rows, limit = 50) {
  const rank = { critical: 0, high: 1, medium: 2, low: 3 };
  return [...rows]
    .sort((a, b) => {
      const riskDelta = (rank[a.risk_level] ?? 9) - (rank[b.risk_level] ?? 9);
      if (riskDelta !== 0) return riskDelta;
      const ownedDelta = intValue(b.ownership_refs_count) - intValue(a.ownership_refs_count);
      if (ownedDelta !== 0) return ownedDelta;
      return `${a.set_code ?? ''}:${a.number ?? ''}:${a.card_name ?? ''}`.localeCompare(`${b.set_code ?? ''}:${b.number ?? ''}:${b.card_name ?? ''}`);
    })
    .slice(0, limit);
}

function hasResolvedSet(row) {
  const setCode = String(row.set_code ?? '').trim().toLowerCase();
  return Boolean(setCode && setCode !== 'unknown' && setCode !== 'null');
}

function hasResolvedNumber(row) {
  return Boolean(String(row.number ?? '').trim());
}

function classifyImageScope(row) {
  const setCode = clean(row.set_code);
  if (!setCode) return 'unresolved_set';

  const source = row.set_source && typeof row.set_source === 'object' ? row.set_source : {};
  const domain = normalizeKey(source.domain);
  const identityDomain = normalizeKey(row.set_identity_domain_default);
  if (
    source.digital_only === true ||
    source.exclude_from_physical_pipelines === true ||
    domain === 'tcg_pocket' ||
    identityDomain === 'tcg_pocket_excluded'
  ) {
    return 'digital_or_non_physical_excluded';
  }

  if (identityDomain.startsWith('pokemon_eng')) return 'english_physical';
  return 'other_or_unclassified';
}

function displayUnknown(value) {
  return clean(value) ?? 'unknown';
}

function markdownTable(rows, columns) {
  if (rows.length === 0) return '_None._';
  const header = `| ${columns.map((column) => column.label).join(' | ')} |`;
  const separator = `| ${columns.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => `| ${columns.map((column) => String(column.value(row) ?? '').replace(/\|/g, '\\|')).join(' | ')} |`);
  return [header, separator, ...body].join('\n');
}

async function getColumns(client, tableName) {
  const result = await client.query(
    `
      select column_name
      from information_schema.columns
      where table_schema = 'public'
        and table_name = $1
      order by ordinal_position
    `,
    [tableName],
  );
  return new Set(result.rows.map((row) => row.column_name));
}

async function tableExists(client, tableName) {
  const result = await client.query('select to_regclass($1) as regclass', [`public.${tableName}`]);
  return Boolean(result.rows[0]?.regclass);
}

function selectChildColumn(column, hasColumn) {
  return hasColumn ? `cpi.${column} as child_${column}` : `null::text as child_${column}`;
}

async function main() {
  const connectionString = requireDbUrl();
  if (!connectionString) {
    throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for read-only image truth audit.');
  }

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    await client.query('begin read only');

    const cardPrintingColumns = await getColumns(client, 'card_printings');
    const hasChildImageStorageColumns = CHILD_IMAGE_COLUMNS.every((column) => cardPrintingColumns.has(column));
    const hasVaultInstances = await tableExists(client, 'vault_item_instances');
    const vaultJoin = hasVaultInstances
      ? 'left join public.vault_item_instances vii on vii.card_printing_id = cpi.id and vii.archived_at is null'
      : '';
    const ownershipSelect = hasVaultInstances ? 'count(distinct vii.id)::int' : '0::int';

    const rowsResult = await client.query(`
      select
        cpi.id as card_printing_id,
        cpi.card_print_id,
        cpi.finish_key,
        cpi.printing_gv_id,
        fk.label as finish_label,
        ${selectChildColumn('image_source', cardPrintingColumns.has('image_source'))},
        ${selectChildColumn('image_path', cardPrintingColumns.has('image_path'))},
        ${selectChildColumn('image_url', cardPrintingColumns.has('image_url'))},
        ${selectChildColumn('image_alt_url', cardPrintingColumns.has('image_alt_url'))},
        ${selectChildColumn('image_status', cardPrintingColumns.has('image_status'))},
        ${selectChildColumn('image_note', cardPrintingColumns.has('image_note'))},
        cp.gv_id as parent_gv_id,
        cp.name as card_name,
        cp.number,
        cp.set_code,
        s.name as set_name,
        s.identity_domain_default as set_identity_domain_default,
        s.source as set_source,
        cp.variant_key,
        cp.printed_identity_modifier,
        cp.image_source as parent_image_source,
        cp.image_path as parent_image_path,
        cp.image_url as parent_image_url,
        cp.image_alt_url as parent_image_alt_url,
        cp.representative_image_url as parent_representative_image_url,
        cp.image_status as parent_image_status,
        cp.image_note as parent_image_note,
        ${ownershipSelect} as ownership_refs_count
      from public.card_printings cpi
      join public.card_prints cp on cp.id = cpi.card_print_id
      left join public.sets s on s.id = cp.set_id
      left join public.finish_keys fk on fk.key = cpi.finish_key
      ${vaultJoin}
      group by
        cpi.id,
        fk.label,
        cp.id,
        s.id,
        s.name
      order by cp.set_code, cp.number_plain nulls last, cp.number, cp.name, cpi.finish_key
    `);

    const rows = rowsResult.rows.map((row) => {
      const coverageStatus = imageCoverageStatus(row, hasChildImageStorageColumns);
      const exactChildRequired = requiresExactChildImage(row);
      const finishVisualReviewNeeded = needsFinishVisualReview(row);
      const imageScope = classifyImageScope(row);
      const confidence = imageConfidence(row, hasChildImageStorageColumns, imageScope);
      return {
        card_printing_id: row.card_printing_id,
        printing_gv_id: clean(row.printing_gv_id),
        card_print_id: row.card_print_id,
        parent_gv_id: clean(row.parent_gv_id),
        set_code: clean(row.set_code),
        set_name: clean(row.set_name),
        image_scope: imageScope,
        set_identity_domain_default: clean(row.set_identity_domain_default),
        card_name: clean(row.card_name),
        number: clean(row.number),
        finish_key: clean(row.finish_key),
        finish_label: clean(row.finish_label),
        variant_key: clean(row.variant_key),
        printed_identity_modifier: clean(row.printed_identity_modifier),
        exact_child_image_required: exactChildRequired,
        finish_visual_review_needed: finishVisualReviewNeeded,
        image_coverage_status: coverageStatus,
        image_confidence: confidence,
        image_confidence_reason: confidenceReason(row, hasChildImageStorageColumns, imageScope),
        risk_level: riskLevel(row, hasChildImageStorageColumns),
        risk_reasons: riskReasons(row, hasChildImageStorageColumns),
        child_has_public_image: hasPublicImage(row, 'child'),
        child_image_status: clean(row.child_image_status),
        parent_has_public_image: hasPublicImage(row, 'parent'),
        parent_has_representative_image: hasRepresentativeImage(row),
        parent_image_status: clean(row.parent_image_status),
        parent_image_source: clean(row.parent_image_source),
        ownership_refs_count: intValue(row.ownership_refs_count),
      };
    });

    const riskyRows = rows.filter((row) => row.risk_level !== 'low');
    const exactRequiredRows = rows.filter((row) => row.exact_child_image_required);
    const finishVisualReviewRows = rows.filter((row) => row.finish_visual_review_needed);
    const missingExactRows = exactRequiredRows.filter((row) => row.image_coverage_status !== 'exact_child_image_present');
    const missingFinishReviewRows = finishVisualReviewRows.filter((row) => row.image_coverage_status !== 'exact_child_image_present');
    const criticalOrHighRows = rows.filter((row) => row.risk_level === 'critical' || row.risk_level === 'high');
    const applyAddressableMissingExactRows = missingExactRows.filter((row) => row.image_scope === 'english_physical' && hasResolvedSet(row) && hasResolvedNumber(row));
    const identityBlockedMissingExactRows = missingExactRows.filter((row) => !hasResolvedSet(row) || !hasResolvedNumber(row));
    const nonPhysicalBlockedMissingExactRows = missingExactRows.filter((row) => row.image_scope === 'digital_or_non_physical_excluded');
    const otherScopeMissingExactRows = missingExactRows.filter((row) => row.image_scope === 'other_or_unclassified');
    const englishPhysicalRows = rows.filter((row) => row.image_scope === 'english_physical');
    const englishPhysicalExactRequiredRows = exactRequiredRows.filter((row) => row.image_scope === 'english_physical');

    const summary = {
      generated_at: new Date().toISOString(),
      audit_only: true,
      db_writes_performed: false,
      migrations_created: false,
      total_child_printings: rows.length,
      child_image_storage_columns_present: hasChildImageStorageColumns,
      child_image_storage_columns: Object.fromEntries(CHILD_IMAGE_COLUMNS.map((column) => [column, cardPrintingColumns.has(column)])),
      exact_child_image_required: exactRequiredRows.length,
      finish_visual_review_needed: finishVisualReviewRows.length,
      exact_required_missing_child_exact_image: missingExactRows.length,
      finish_visual_review_missing_child_exact_image: missingFinishReviewRows.length,
      critical_or_high_risk_rows: criticalOrHighRows.length,
      risk_level_counts: groupCount(rows, (row) => row.risk_level),
      image_coverage_counts: groupCount(rows, (row) => row.image_coverage_status),
      finish_counts: groupCount(rows, (row) => row.finish_key ?? 'unknown'),
      risky_finish_counts: groupCount(riskyRows, (row) => row.finish_key ?? 'unknown'),
      risky_set_counts: groupCount(riskyRows, (row) => row.set_code ?? 'unknown'),
      image_scope_counts: groupCount(rows, (row) => row.image_scope),
      risky_image_scope_counts: groupCount(riskyRows, (row) => row.image_scope),
      image_confidence_counts: groupCount(rows, (row) => row.image_confidence),
      english_physical_image_confidence_counts: groupCount(englishPhysicalRows, (row) => row.image_confidence),
      english_physical_exact_required_image_confidence_counts: groupCount(englishPhysicalExactRequiredRows, (row) => row.image_confidence),
      english_physical_display_covered_rows: englishPhysicalRows.filter((row) => row.image_confidence !== 'missing' && row.image_confidence !== 'blocked').length,
      english_physical_missing_display_rows: englishPhysicalRows.filter((row) => row.image_confidence === 'missing').length,
      english_physical_missing_variant_visual_rows: englishPhysicalRows.filter((row) => row.image_confidence === 'missing_variant_visual').length,
      english_physical_exact_rows: englishPhysicalRows.filter((row) => row.image_confidence === 'exact').length,
      english_physical_representative_rows: englishPhysicalRows.filter((row) => row.image_confidence === 'representative').length,
      image_apply_addressable_missing_exact_rows: applyAddressableMissingExactRows.length,
      image_identity_blocked_missing_exact_rows: identityBlockedMissingExactRows.length,
      image_non_physical_blocked_missing_exact_rows: nonPhysicalBlockedMissingExactRows.length,
      image_other_scope_missing_exact_rows: otherScopeMissingExactRows.length,
    };

    const audit = {
      summary,
      top_risk_rows: topRows(riskyRows, 100),
      per_finish: Object.entries(summary.finish_counts).map(([finish_key, total_count]) => ({
        finish_key,
        total_count,
        risk_count: summary.risky_finish_counts[finish_key] ?? 0,
      })),
      per_set_top_risk: Object.entries(summary.risky_set_counts).slice(0, 100).map(([set_code, risk_count]) => ({
        set_code,
        risk_count,
      })),
    };

    const riskQueue = {
      generated_at: summary.generated_at,
      audit_only: true,
      db_writes_performed: false,
      migrations_created: false,
      queue_definition: 'Child printings that require exact visual proof but currently render without an exact child-level image.',
      detailed_rows_are_top_limited: true,
      row_limit: RISK_QUEUE_LIMIT,
      addressable_row_limit: ADDRESSABLE_QUEUE_LIMIT,
      full_missing_exact_rows_count: missingExactRows.length,
      finish_visual_review_rows_not_in_queue: missingFinishReviewRows.length,
      bucket_summary: {
        apply_addressable_missing_exact_rows: applyAddressableMissingExactRows.length,
        identity_blocked_missing_exact_rows: identityBlockedMissingExactRows.length,
        non_physical_blocked_missing_exact_rows: nonPhysicalBlockedMissingExactRows.length,
        other_scope_missing_exact_rows: otherScopeMissingExactRows.length,
        missing_exact_by_scope: groupCount(missingExactRows, (row) => row.image_scope),
        missing_exact_by_finish: groupCount(missingExactRows, (row) => row.finish_key ?? 'unknown'),
        missing_exact_by_set: groupCount(missingExactRows, (row) => row.set_code ?? 'unknown'),
        apply_addressable_by_finish: groupCount(applyAddressableMissingExactRows, (row) => row.finish_key ?? 'unknown'),
        apply_addressable_by_set: groupCount(applyAddressableMissingExactRows, (row) => row.set_code ?? 'unknown'),
        identity_blocked_by_finish: groupCount(identityBlockedMissingExactRows, (row) => row.finish_key ?? 'unknown'),
        identity_blocked_by_set: groupCount(identityBlockedMissingExactRows, (row) => row.set_code ?? 'unknown'),
      },
      rows: topRows(missingExactRows, RISK_QUEUE_LIMIT),
      apply_addressable_rows: topRows(applyAddressableMissingExactRows, ADDRESSABLE_QUEUE_LIMIT),
      identity_blocked_rows: topRows(identityBlockedMissingExactRows, 100),
      non_physical_blocked_rows: topRows(nonPhysicalBlockedMissingExactRows, 100),
      other_scope_rows: topRows(otherScopeMissingExactRows, 100),
    };

    const confidenceAudit = {
      generated_at: summary.generated_at,
      audit_only: true,
      db_writes_performed: false,
      migrations_created: false,
      contract: 'IMAGE_CONFIDENCE_CONTRACT_V1',
      scope: 'English physical card_printings. Non-English/digital/unresolved rows are reported as blocked and excluded from image repair authority.',
      confidence_definitions: {
        exact: 'Image is proven to match the selected printing, including finish/stamp/parallel when applicable.',
        representative: 'Image is safe for display at card identity level but is not exact child visual truth.',
        missing_variant_visual: 'Correct card display image is available, but exact finish/stamp/parallel visual is missing or unproven.',
        missing: 'No safe display image is available.',
        blocked: 'Image repair is blocked by scope, identity, or unproven image status.',
      },
      summary: {
        total_child_printings: rows.length,
        english_physical_child_printings: englishPhysicalRows.length,
        english_physical_exact_required_rows: englishPhysicalExactRequiredRows.length,
        english_physical_display_covered_rows: summary.english_physical_display_covered_rows,
        english_physical_missing_display_rows: summary.english_physical_missing_display_rows,
        english_physical_missing_variant_visual_rows: summary.english_physical_missing_variant_visual_rows,
        english_physical_exact_rows: summary.english_physical_exact_rows,
        english_physical_representative_rows: summary.english_physical_representative_rows,
        confidence_counts_all_scopes: summary.image_confidence_counts,
        confidence_counts_english_physical: summary.english_physical_image_confidence_counts,
        confidence_counts_english_physical_exact_required: summary.english_physical_exact_required_image_confidence_counts,
      },
      by_finish_english_physical_exact_required: Object.entries(
        groupCount(englishPhysicalExactRequiredRows, (row) => `${row.finish_key ?? 'unknown'}:${row.image_confidence}`),
      ).map(([key, count]) => {
        const [finish_key, image_confidence] = key.split(':');
        return { finish_key, image_confidence, count };
      }),
      missing_display_rows: topRows(englishPhysicalRows.filter((row) => row.image_confidence === 'missing'), 500),
      missing_variant_visual_rows: topRows(englishPhysicalRows.filter((row) => row.image_confidence === 'missing_variant_visual'), 500),
      representative_rows: topRows(englishPhysicalRows.filter((row) => row.image_confidence === 'representative'), 100),
      blocked_rows: topRows(rows.filter((row) => row.image_confidence === 'blocked'), 100),
    };

    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    await fs.writeFile(AUDIT_JSON, `${JSON.stringify(audit, null, 2)}\n`);
    await fs.writeFile(RISK_JSON, `${JSON.stringify(riskQueue, null, 2)}\n`);
    await fs.writeFile(CONFIDENCE_JSON, `${JSON.stringify(confidenceAudit, null, 2)}\n`);

    const topRisk = topRows(riskyRows, 30);
    const topSets = Object.entries(summary.risky_set_counts).slice(0, 25).map(([set_code, risk_count]) => ({ set_code, risk_count }));
    const topFinishes = Object.entries(summary.risky_finish_counts).map(([finish_key, risk_count]) => ({ finish_key, risk_count }));

    await fs.writeFile(AUDIT_MD, `# Image Truth Audit V1

Generated: ${summary.generated_at}

Status: audit only. No DB writes. No migrations.

## Summary

- total child printings: ${summary.total_child_printings}
- child image storage columns present: ${summary.child_image_storage_columns_present}
- exact child image required: ${summary.exact_child_image_required}
- finish visual review needed: ${summary.finish_visual_review_needed}
- exact-required rows missing exact child image: ${summary.exact_required_missing_child_exact_image}
- finish-review rows missing exact child image: ${summary.finish_visual_review_missing_child_exact_image}
- critical/high image risk rows: ${summary.critical_or_high_risk_rows}
- image apply-addressable missing exact rows: ${summary.image_apply_addressable_missing_exact_rows}
- image identity-blocked missing exact rows: ${summary.image_identity_blocked_missing_exact_rows}
- image non-physical blocked missing exact rows: ${summary.image_non_physical_blocked_missing_exact_rows}
- image other-scope missing exact rows: ${summary.image_other_scope_missing_exact_rows}
- english physical display-covered rows: ${summary.english_physical_display_covered_rows}
- english physical missing-display rows: ${summary.english_physical_missing_display_rows}
- english physical missing-variant-visual rows: ${summary.english_physical_missing_variant_visual_rows}
- db_writes_performed: false
- migrations_created: false

## Image Confidence Counts

All scopes:

${markdownTable(Object.entries(summary.image_confidence_counts).map(([confidence, count]) => ({ confidence, count })), [
  { label: 'confidence', value: (row) => row.confidence },
  { label: 'rows', value: (row) => row.count },
])}

English physical only:

${markdownTable(Object.entries(summary.english_physical_image_confidence_counts).map(([confidence, count]) => ({ confidence, count })), [
  { label: 'confidence', value: (row) => row.confidence },
  { label: 'rows', value: (row) => row.count },
])}

## Image Coverage Counts

${markdownTable(Object.entries(summary.image_coverage_counts).map(([status, count]) => ({ status, count })), [
  { label: 'coverage', value: (row) => row.status },
  { label: 'rows', value: (row) => row.count },
])}

## Risk Counts

${markdownTable(Object.entries(summary.risk_level_counts).map(([risk, count]) => ({ risk, count })), [
  { label: 'risk', value: (row) => row.risk },
  { label: 'rows', value: (row) => row.count },
])}

## Risk By Finish

${markdownTable(topFinishes, [
  { label: 'finish', value: (row) => row.finish_key },
  { label: 'risk rows', value: (row) => row.risk_count },
])}

## Top Risk Sets

${markdownTable(topSets, [
  { label: 'set', value: (row) => row.set_code },
  { label: 'risk rows', value: (row) => row.risk_count },
])}

## Top Risk Rows

${markdownTable(topRisk, [
  { label: 'risk', value: (row) => row.risk_level },
  { label: 'set', value: (row) => displayUnknown(row.set_code) },
  { label: 'number', value: (row) => displayUnknown(row.number) },
  { label: 'card', value: (row) => displayUnknown(row.card_name) },
  { label: 'finish', value: (row) => displayUnknown(row.finish_key) },
  { label: 'coverage', value: (row) => row.image_coverage_status },
  { label: 'reasons', value: (row) => row.risk_reasons.join(', ') },
])}

## Interpretation

This audit does not prove that a displayed image is visually wrong. It identifies where Grookai cannot honestly prove exact child-printing imagery and is likely falling back to parent/base imagery for visually distinct printings.

Holo-only rows are counted as finish visual review debt, but are not promoted into the primary exact-image queue unless another visible variant/stamp/modifier rule also applies.

The next safe DB phase should be a governed image truth sidecar or child image storage activation, not blind parent image updates.
`);

    await fs.writeFile(RISK_MD, `# Image Truth Risk Queue V1

Generated: ${summary.generated_at}

Status: audit only. No DB writes. No migrations.

Queue definition: child printings that require exact visual proof but currently render without an exact child-level image.

Rows in JSON queue: ${riskQueue.rows.length}
Full missing exact rows: ${riskQueue.full_missing_exact_rows_count}
Apply-addressable missing exact rows: ${riskQueue.bucket_summary.apply_addressable_missing_exact_rows}
Identity-blocked missing exact rows: ${riskQueue.bucket_summary.identity_blocked_missing_exact_rows}
Non-physical blocked missing exact rows: ${riskQueue.bucket_summary.non_physical_blocked_missing_exact_rows}
Other-scope missing exact rows: ${riskQueue.bucket_summary.other_scope_missing_exact_rows}

${markdownTable(riskQueue.rows.slice(0, 100), [
  { label: 'risk', value: (row) => row.risk_level },
  { label: 'set', value: (row) => displayUnknown(row.set_code) },
  { label: 'scope', value: (row) => displayUnknown(row.image_scope) },
  { label: 'confidence', value: (row) => displayUnknown(row.image_confidence) },
  { label: 'number', value: (row) => displayUnknown(row.number) },
  { label: 'card', value: (row) => displayUnknown(row.card_name) },
  { label: 'finish', value: (row) => displayUnknown(row.finish_key) },
  { label: 'printing', value: (row) => row.printing_gv_id ?? row.card_printing_id },
  { label: 'coverage', value: (row) => row.image_coverage_status },
])}
`);

    await fs.writeFile(CONFIDENCE_MD, `# Image Truth Confidence Audit V1

Generated: ${summary.generated_at}

Status: audit only. No DB writes. No migrations. No image promotion.

Contract: IMAGE_CONFIDENCE_CONTRACT_V1

## Summary

- english physical child printings: ${confidenceAudit.summary.english_physical_child_printings}
- english physical exact-required rows: ${confidenceAudit.summary.english_physical_exact_required_rows}
- english physical display-covered rows: ${confidenceAudit.summary.english_physical_display_covered_rows}
- english physical missing-display rows: ${confidenceAudit.summary.english_physical_missing_display_rows}
- english physical missing-variant-visual rows: ${confidenceAudit.summary.english_physical_missing_variant_visual_rows}
- db_writes_performed: false
- migrations_created: false

## English Physical Confidence Counts

${markdownTable(Object.entries(confidenceAudit.summary.confidence_counts_english_physical).map(([confidence, count]) => ({ confidence, count })), [
  { label: 'confidence', value: (row) => row.confidence },
  { label: 'rows', value: (row) => row.count },
])}

## English Physical Exact-Required Confidence Counts

${markdownTable(Object.entries(confidenceAudit.summary.confidence_counts_english_physical_exact_required).map(([confidence, count]) => ({ confidence, count })), [
  { label: 'confidence', value: (row) => row.confidence },
  { label: 'rows', value: (row) => row.count },
])}

## Interpretation

\`missing_variant_visual\` means Grookai can show a safe card image, but must label it honestly because the exact finish, stamp, or parallel visual is not proven.

This gives Grookai high display coverage without falsely claiming exact variant imagery.

## First Missing Display Rows

${markdownTable(confidenceAudit.missing_display_rows.slice(0, 50), [
  { label: 'set', value: (row) => displayUnknown(row.set_code) },
  { label: 'number', value: (row) => displayUnknown(row.number) },
  { label: 'card', value: (row) => displayUnknown(row.card_name) },
  { label: 'finish', value: (row) => displayUnknown(row.finish_key) },
  { label: 'reason', value: (row) => displayUnknown(row.image_confidence_reason) },
])}

## First Missing Variant Visual Rows

${markdownTable(confidenceAudit.missing_variant_visual_rows.slice(0, 50), [
  { label: 'set', value: (row) => displayUnknown(row.set_code) },
  { label: 'number', value: (row) => displayUnknown(row.number) },
  { label: 'card', value: (row) => displayUnknown(row.card_name) },
  { label: 'finish', value: (row) => displayUnknown(row.finish_key) },
  { label: 'reason', value: (row) => displayUnknown(row.image_confidence_reason) },
])}
`);

    await client.query('rollback');
    console.log(JSON.stringify(summary, null, 2));
  } catch (error) {
    try {
      await client.query('rollback');
    } catch (_) {}
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});
