import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const SOURCE_PATH = path.join(
  ROOT,
  'docs',
  'audits',
  'variant_origin_index_v1',
  'variant_origin_public_copy_export_v1.json',
);
const OUT_PATH = path.join(
  ROOT,
  'apps',
  'web',
  'src',
  'lib',
  'cards',
  'variantOriginPublicCopy.generated.json',
);

function requiredString(value, label) {
  const text = String(value ?? '').trim();
  if (!text) throw new Error(`Missing required ${label}`);
  return text;
}

async function main() {
  const raw = JSON.parse(await fs.readFile(SOURCE_PATH, 'utf8'));
  const rows = Array.isArray(raw.rows) ? raw.rows : [];
  const families = new Map();
  const byGvId = {};
  const byCardPrintId = {};

  for (const row of rows) {
    if (row.public_copy_safe !== true) continue;
    const familyKey = requiredString(row.origin_family_key, 'origin_family_key');
    const gvId = requiredString(row.gv_id, 'gv_id');
    const cardPrintId = requiredString(row.card_print_id, 'card_print_id');

    if (!families.has(familyKey)) {
      families.set(familyKey, {
        family_key: familyKey,
        family_label: requiredString(row.origin_family_label, 'origin_family_label'),
        variant_category: requiredString(row.variant_category, 'variant_category'),
        confidence: requiredString(row.confidence, 'confidence'),
        why_it_exists: requiredString(row.why_it_exists, 'why_it_exists'),
        why_collectors_care: requiredString(row.why_collectors_care, 'why_collectors_care'),
        how_to_identify: requiredString(row.how_to_identify, 'how_to_identify'),
        grookai_rule: requiredString(row.grookai_rule, 'grookai_rule'),
        source_urls: Array.isArray(row.source_urls) ? row.source_urls.filter(Boolean) : [],
      });
    }

    const rowRef = {
      card_print_id: cardPrintId,
      gv_id: gvId,
      origin_family_key: familyKey,
      variant_key: row.variant_key ?? null,
      printed_identity_modifier: row.printed_identity_modifier ?? null,
    };
    byGvId[gvId.toUpperCase()] = rowRef;
    byCardPrintId[cardPrintId] = rowRef;
  }

  const output = {
    generated_at: new Date().toISOString(),
    source_fingerprint_sha256: raw.fingerprint_sha256,
    source_version: raw.version,
    summary: {
      public_copy_safe_parent_rows: Object.keys(byCardPrintId).length,
      public_copy_safe_families: families.size,
      blocked_parent_rows_excluded: raw.summary?.blocked_parent_rows_excluded ?? null,
    },
    families: Object.fromEntries([...families.entries()].sort(([a], [b]) => a.localeCompare(b))),
    by_gv_id: Object.fromEntries(Object.entries(byGvId).sort(([a], [b]) => a.localeCompare(b))),
    by_card_print_id: Object.fromEntries(Object.entries(byCardPrintId).sort(([a], [b]) => a.localeCompare(b))),
  };

  await fs.writeFile(OUT_PATH, `${JSON.stringify(output, null, 2)}\n`);
  console.log(JSON.stringify({
    output_path: path.relative(ROOT, OUT_PATH),
    public_copy_safe_parent_rows: output.summary.public_copy_safe_parent_rows,
    public_copy_safe_families: output.summary.public_copy_safe_families,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
