import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const PACKAGE_ID = 'MASTER-INDEX-PROMO-ORIGIN-03B-FAMILY-PUBLIC-COPY-EXPORT';
const INPUT_JSONL = path.join(
  ROOT,
  'docs',
  'audits',
  'master_index_promo_origin_v1',
  'master_index_promo_origin_02a_source_acquisition_v1.jsonl',
);
const WEB_PUBLIC_COPY_JSON = path.join(
  ROOT,
  'apps',
  'web',
  'src',
  'lib',
  'cards',
  'variantOriginPublicCopy.generated.json',
);
const OUTPUT_DIR = path.join(ROOT, 'docs', 'audits', 'master_index_promo_origin_v1');
const SUMMARY_JSON = path.join(OUTPUT_DIR, 'master_index_promo_origin_03b_family_public_copy_export_summary_v1.json');
const SUMMARY_MD = path.join(OUTPUT_DIR, 'master_index_promo_origin_03b_family_public_copy_export_summary_v1.md');

const PROMO_FAMILY_COPY = {
  best_of_game: {
    family_key: 'best_of_game',
    family_label: 'Best of Game Promo',
    variant_category: 'promo_checklist_identity',
    confidence: 'medium',
    why_it_exists:
      'Best of Game cards are promotional checklist cards released outside ordinary booster expansion numbering.',
    why_collectors_care:
      'Collectors track Best of Game cards as their own promo lane because the checklist membership differs from a standard set copy.',
    how_to_identify:
      'Confirm the Best of Game set label, promo checklist number, and card name. Exact distribution details may vary by card.',
    grookai_rule:
      'Grookai models this as a promo checklist identity. This family-level copy does not claim an exact product, event, or distribution source for every card.',
    source_urls: [],
  },
  bw_black_star_promos: {
    family_key: 'bw_black_star_promos',
    family_label: 'BW Black Star Promo',
    variant_category: 'promo_checklist_identity',
    confidence: 'medium',
    why_it_exists:
      'BW Black Star Promos are Black & White-era promotional cards released through products, events, campaigns, and other non-booster channels.',
    why_collectors_care:
      'The BW promo number identifies a separate Black Star promo checklist object rather than an ordinary expansion card.',
    how_to_identify:
      'Look for a BW-prefixed promo number and Black Star promo checklist membership.',
    grookai_rule:
      'Grookai models BW Black Star Promos as parent promo identities. Exact product or event origin requires a separate card-level source.',
    source_urls: [],
  },
  dp_black_star_promos: {
    family_key: 'dp_black_star_promos',
    family_label: 'DP Black Star Promo',
    variant_category: 'promo_checklist_identity',
    confidence: 'medium',
    why_it_exists:
      'DP Black Star Promos are Diamond & Pearl-era promotional cards released outside normal expansion packs.',
    why_collectors_care:
      'The DP promo number places the card in a separate Black Star promo checklist that collectors track apart from expansion copies.',
    how_to_identify:
      'Look for a DP-prefixed promo number and Black Star promo checklist membership.',
    grookai_rule:
      'Grookai models DP Black Star Promos as parent promo identities. This explanation is checklist-level, not an exact product-origin claim.',
    source_urls: [],
  },
  hgss_black_star_promos: {
    family_key: 'hgss_black_star_promos',
    family_label: 'HGSS Black Star Promo',
    variant_category: 'promo_checklist_identity',
    confidence: 'medium',
    why_it_exists:
      'HGSS Black Star Promos are HeartGold & SoulSilver-era promotional cards released outside ordinary expansion checklists.',
    why_collectors_care:
      'The HGSS promo number identifies a dedicated Black Star promo lane with separate checklist and collecting context.',
    how_to_identify:
      'Look for an HGSS-prefixed promo number and Black Star promo checklist membership.',
    grookai_rule:
      'Grookai models HGSS Black Star Promos as parent promo identities. Exact product or event origin remains card-level enrichment.',
    source_urls: [],
  },
  mega_evolution_promos: {
    family_key: 'mega_evolution_promos',
    family_label: 'Mega Evolution Promo',
    variant_category: 'promo_checklist_identity',
    confidence: 'medium',
    why_it_exists:
      'Mega Evolution Promos are promotional card identities tied to Mega Evolution-era checklist and product lanes rather than ordinary expansion numbering.',
    why_collectors_care:
      'Collectors separate these promo cards because they belong to a promotional lane with different checklist membership and distribution context.',
    how_to_identify:
      'Confirm the Mega Evolution promo set label, printed number, and card name against the promo checklist.',
    grookai_rule:
      'Grookai models Mega Evolution Promos as parent promo identities. This family-level explanation does not assert exact product origin.',
    source_urls: [],
  },
  nintendo_black_star_promos: {
    family_key: 'nintendo_black_star_promos',
    family_label: 'Nintendo Black Star Promo',
    variant_category: 'promo_checklist_identity',
    confidence: 'medium',
    why_it_exists:
      'Nintendo Black Star Promos are promotional checklist cards from the Nintendo-published era, released outside standard booster expansion numbering.',
    why_collectors_care:
      'The Nintendo promo checklist gives these cards separate identity and collecting context from ordinary set cards.',
    how_to_identify:
      'Look for Nintendo-era Black Star promo checklist membership and the printed promo number.',
    grookai_rule:
      'Grookai models Nintendo Black Star Promos as parent promo identities. Exact distribution provenance remains a card-level lane.',
    source_urls: [],
  },
  pop_series: {
    family_key: 'pop_series',
    family_label: 'POP Series Promo',
    variant_category: 'organized_play_promo_identity',
    confidence: 'medium',
    why_it_exists:
      'POP Series cards were promotional Organized Play-era checklist cards distributed through special POP Series products and programs.',
    why_collectors_care:
      'POP Series cards are collected as their own promotional checklist lane, distinct from ordinary expansion copies.',
    how_to_identify:
      'Confirm the POP Series set number, card number, and card name.',
    grookai_rule:
      'Grookai models POP Series rows as promo checklist identities. This family-level copy does not claim the exact event or product for each card.',
    source_urls: [],
  },
  sm_black_star_promos: {
    family_key: 'sm_black_star_promos',
    family_label: 'SM Black Star Promo',
    variant_category: 'promo_checklist_identity',
    confidence: 'medium',
    why_it_exists:
      'SM Black Star Promos are Sun & Moon-era promotional cards released through products, campaigns, events, and other non-booster channels.',
    why_collectors_care:
      'The SM promo number identifies separate Black Star promo checklist membership rather than ordinary expansion membership.',
    how_to_identify:
      'Look for an SM-prefixed promo number and Black Star promo checklist membership.',
    grookai_rule:
      'Grookai models SM Black Star Promos as parent promo identities. Exact product or event origin requires a separate card-level source.',
    source_urls: [],
  },
  sv_black_star_promos: {
    family_key: 'sv_black_star_promos',
    family_label: 'Scarlet & Violet Black Star Promo',
    variant_category: 'promo_checklist_identity',
    confidence: 'medium',
    why_it_exists:
      'Scarlet & Violet Black Star Promos are current-era promotional cards released through products, campaigns, events, and other non-booster channels.',
    why_collectors_care:
      'The SVP promo number places the card in a separate Black Star promo checklist that collectors track apart from expansion copies.',
    how_to_identify:
      'Look for an SVP-prefixed promo number and Black Star promo checklist membership.',
    grookai_rule:
      'Grookai models Scarlet & Violet Black Star Promos as parent promo identities. Exact campaign or product origin remains separate enrichment.',
    source_urls: [],
  },
  swsh_black_star_promos: {
    family_key: 'swsh_black_star_promos',
    family_label: 'Sword & Shield Black Star Promo',
    variant_category: 'promo_checklist_identity',
    confidence: 'medium',
    why_it_exists:
      'Sword & Shield Black Star Promos are Sword & Shield-era promotional cards released through products, campaigns, events, and other non-booster channels.',
    why_collectors_care:
      'The SWSH promo number identifies separate Black Star promo checklist membership rather than ordinary expansion membership.',
    how_to_identify:
      'Look for an SWSH-prefixed promo number and Black Star promo checklist membership.',
    grookai_rule:
      'Grookai models Sword & Shield Black Star Promos as parent promo identities. Exact product or event origin requires a separate card-level source.',
    source_urls: [],
  },
  wizards_black_star_promos: {
    family_key: 'wizards_black_star_promos',
    family_label: 'Wizards Black Star Promo',
    variant_category: 'promo_checklist_identity',
    confidence: 'medium',
    why_it_exists:
      'Wizards Black Star Promos are WOTC-era promotional checklist cards released outside ordinary expansion numbering.',
    why_collectors_care:
      'The Black Star promo symbol and promo checklist number identify a separate collector object from normal set cards.',
    how_to_identify:
      'Look for the Black Star promo symbol, promo checklist number, and card name.',
    grookai_rule:
      'Grookai models Wizards Black Star Promos as parent promo identities. This family-level explanation does not assert exact distribution origin.',
    source_urls: [],
  },
  xy_black_star_promos: {
    family_key: 'xy_black_star_promos',
    family_label: 'XY Black Star Promo',
    variant_category: 'promo_checklist_identity',
    confidence: 'medium',
    why_it_exists:
      'XY Black Star Promos are XY-era promotional cards released through products, campaigns, events, and other non-booster channels.',
    why_collectors_care:
      'The XY promo number identifies a separate Black Star promo checklist object rather than an ordinary expansion card.',
    how_to_identify:
      'Look for an XY-prefixed promo number and Black Star promo checklist membership.',
    grookai_rule:
      'Grookai models XY Black Star Promos as parent promo identities. Exact product or event provenance remains card-level enrichment.',
    source_urls: [],
  },
};

function canonicalizeJson(value) {
  if (Array.isArray(value)) return value.map((entry) => canonicalizeJson(entry));
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value)
    .sort((left, right) => left.localeCompare(right))
    .reduce((acc, key) => {
      acc[key] = canonicalizeJson(value[key]);
      return acc;
    }, {});
}

function proofHash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(canonicalizeJson(value))).digest('hex');
}

function normalizeGvId(value) {
  return String(value ?? '').trim().toUpperCase();
}

function countBy(rows, fn) {
  const counts = {};
  for (const row of rows) {
    const key = fn(row) || 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

function markdownTable(entries) {
  if (entries.length === 0) return '_None._';
  return [
    '| key | count |',
    '| --- | ---: |',
    ...entries.map(([key, count]) => `| ${String(key).replace(/\|/g, '\\|')} | ${count} |`),
  ].join('\n');
}

async function readAcquisitionRows() {
  const raw = await fs.readFile(INPUT_JSONL, 'utf8');
  return raw
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line));
}

function existingPublicCopyRef(row, current) {
  return current.by_gv_id?.[normalizeGvId(row.gv_id)] ?? current.by_card_print_id?.[row.card_print_id] ?? null;
}

function isFamilyLevelCopyCandidate(row) {
  const familyKey = row.proposed_promo_family?.key ?? null;
  if (!PROMO_FAMILY_COPY[familyKey]) return false;
  if (row.confidence !== 'source_candidates_found') return false;
  if (Number(row.source_candidate_count ?? 0) <= 0) return false;
  return true;
}

function isFamilyLevelCopyExportable(row, current) {
  if (!isFamilyLevelCopyCandidate(row)) return false;
  const existing = existingPublicCopyRef(row, current);
  return !existing || existing.origin_family_key === row.proposed_promo_family.key;
}

function rowRef(row) {
  return {
    card_print_id: row.card_print_id,
    gv_id: row.gv_id,
    origin_family_key: row.proposed_promo_family.key,
    variant_key: row.variant_key ?? null,
    printed_identity_modifier: row.printed_identity_modifier ?? null,
  };
}

async function main() {
  const rows = await readAcquisitionRows();
  const current = JSON.parse(await fs.readFile(WEB_PUBLIC_COPY_JSON, 'utf8'));
  const addedRows = rows.filter((row) => isFamilyLevelCopyExportable(row, current));
  const skippedRows = rows.filter((row) => !isFamilyLevelCopyExportable(row, current));

  const families = {
    ...(current.families ?? {}),
  };
  for (const row of addedRows) {
    const familyKey = row.proposed_promo_family.key;
    families[familyKey] = PROMO_FAMILY_COPY[familyKey];
  }

  const byGvId = {
    ...(current.by_gv_id ?? {}),
  };
  const byCardPrintId = {
    ...(current.by_card_print_id ?? {}),
  };
  for (const row of addedRows) {
    const ref = rowRef(row);
    byGvId[normalizeGvId(row.gv_id)] = ref;
    byCardPrintId[row.card_print_id] = ref;
  }

  const output = {
    generated_at: new Date().toISOString(),
    source_fingerprint_sha256: proofHash({
      package_id: PACKAGE_ID,
      added_rows: addedRows.map((row) => ({
        card_print_id: row.card_print_id,
        gv_id: row.gv_id,
        family: row.proposed_promo_family?.key ?? null,
      })),
    }),
    source_version: `${current.source_version ?? 'VARIANT_ORIGIN_INDEX_V1'}+PROMO_ORIGIN_FAMILY_COPY_V1`,
    summary: {
      ...(current.summary ?? {}),
      promo_family_public_copy_rows_added: addedRows.length,
      promo_family_public_copy_families_added: new Set(addedRows.map((row) => row.proposed_promo_family.key)).size,
      public_copy_safe_parent_rows: Object.keys(byCardPrintId).length,
      public_copy_safe_families: Object.keys(families).length,
    },
    families: Object.fromEntries(Object.entries(families).sort(([a], [b]) => a.localeCompare(b))),
    by_gv_id: Object.fromEntries(Object.entries(byGvId).sort(([a], [b]) => a.localeCompare(b))),
    by_card_print_id: Object.fromEntries(Object.entries(byCardPrintId).sort(([a], [b]) => a.localeCompare(b))),
  };

  await fs.writeFile(WEB_PUBLIC_COPY_JSON, `${JSON.stringify(output, null, 2)}\n`, 'utf8');

  const manualReviewRows = skippedRows.filter((row) => row.confidence === 'manual_review_no_search_hits');
  const exactProductOriginRows = skippedRows.filter((row) => {
    const familyKey = row.proposed_promo_family?.key ?? null;
    return !current.by_gv_id?.[normalizeGvId(row.gv_id)]
      && !current.by_card_print_id?.[row.card_print_id]
      && Number(row.source_candidate_count ?? 0) > 0
      && !PROMO_FAMILY_COPY[familyKey];
  });

  const summary = {
    package_id: PACKAGE_ID,
    generated_at: output.generated_at,
    mode: 'static_public_copy_generation_no_db_write',
    db_writes_performed: false,
    migrations_created: false,
    image_writes_performed: false,
    output_json: path.relative(ROOT, WEB_PUBLIC_COPY_JSON),
    metrics: {
      acquisition_rows: rows.length,
      added_public_copy_rows: addedRows.length,
      added_public_copy_families: new Set(addedRows.map((row) => row.proposed_promo_family.key)).size,
      skipped_existing_public_copy_rows: skippedRows.filter((row) =>
        existingPublicCopyRef(row, current),
      ).length,
      skipped_manual_review_rows: manualReviewRows.length,
      skipped_exact_product_origin_rows: exactProductOriginRows.length,
      output_public_copy_rows_total: Object.keys(byCardPrintId).length,
      output_public_copy_families_total: Object.keys(families).length,
    },
    added_by_family: countBy(addedRows, (row) => row.proposed_promo_family?.key),
    skipped_manual_review_rows: manualReviewRows.map((row) => ({
      gv_id: row.gv_id,
      name: row.name,
      set_code: row.set_code,
      number: row.number,
      family: row.proposed_promo_family?.key ?? null,
    })),
    skipped_exact_product_origin_rows: exactProductOriginRows.map((row) => ({
      gv_id: row.gv_id,
      name: row.name,
      set_code: row.set_code,
      number: row.number,
      family: row.proposed_promo_family?.key ?? null,
    })),
  };
  summary.proof_hash = proofHash({
    package_id: summary.package_id,
    metrics: summary.metrics,
    added_by_family: summary.added_by_family,
    skipped_manual_review_rows: summary.skipped_manual_review_rows,
    skipped_exact_product_origin_rows: summary.skipped_exact_product_origin_rows,
  });

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(SUMMARY_JSON, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  await fs.writeFile(SUMMARY_MD, `# ${PACKAGE_ID}

- Generated: ${summary.generated_at}
- Mode: ${summary.mode}
- Proof hash: \`${summary.proof_hash}\`
- Output JSON: \`${summary.output_json}\`
- DB writes performed: ${summary.db_writes_performed}
- Migrations created: ${summary.migrations_created}
- Image writes performed: ${summary.image_writes_performed}

## Metrics

| metric | value |
| --- | ---: |
| acquisition rows | ${summary.metrics.acquisition_rows} |
| added public copy rows | ${summary.metrics.added_public_copy_rows} |
| added public copy families | ${summary.metrics.added_public_copy_families} |
| skipped existing public copy rows | ${summary.metrics.skipped_existing_public_copy_rows} |
| skipped manual review rows | ${summary.metrics.skipped_manual_review_rows} |
| skipped exact product origin rows | ${summary.metrics.skipped_exact_product_origin_rows} |
| output public copy rows total | ${summary.metrics.output_public_copy_rows_total} |
| output public copy families total | ${summary.metrics.output_public_copy_families_total} |

## Added By Family

${markdownTable(Object.entries(summary.added_by_family))}

## Policy

- Static generated-data update only.
- No database writes, storage writes, migrations, image changes, or price writes.
- Adds family-level promo lane explanations only.
- Does not claim exact product, campaign, event, or distribution origin for rows that only have family-level evidence.
- Exact-product rows and source-thin rows remain excluded.
`, 'utf8');

  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    summary_json: path.relative(ROOT, SUMMARY_JSON),
    summary_md: path.relative(ROOT, SUMMARY_MD),
    output_json: path.relative(ROOT, WEB_PUBLIC_COPY_JSON),
    proof_hash: summary.proof_hash,
    metrics: summary.metrics,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
