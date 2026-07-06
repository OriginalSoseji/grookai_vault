import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const PACKAGE_ID = 'MASTER-INDEX-PROMO-ORIGIN-03C-EXACT-PUBLIC-COPY-EXPORT';
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
const SUMMARY_JSON = path.join(OUTPUT_DIR, 'master_index_promo_origin_03c_exact_public_copy_export_summary_v1.json');
const SUMMARY_MD = path.join(OUTPUT_DIR, 'master_index_promo_origin_03c_exact_public_copy_export_summary_v1.md');

const EXACT_ROWS = {
  'GV-PK-MISC-001': {
    family_key: 'ancient_mew_power_of_one_movie_promo',
    family_label: 'Ancient Mew The Power of One Promo',
    variant_category: 'movie_theatrical_promo_identity',
    confidence: 'high',
    why_it_exists:
      'Ancient Mew was released as a 2000 theatrical promotional card for The Power of One and distributed through participating cinemas.',
    why_collectors_care:
      'The movie-theater distribution, sealed wrapper, unusual card text, and separate international/Japanese print boundaries make Ancient Mew a distinct promo identity rather than a normal set card.',
    how_to_identify:
      'Confirm the Ancient Mew card, Miscellaneous Promotional card lane, international movie-promo print, and absence of Japanese Nintedo/error-specific governance markers.',
    grookai_rule:
      'Grookai models this English Ancient Mew as an exact movie-promo parent identity. Japanese exclusive, Nintedo/error, and later pamphlet variants remain separate governance lanes.',
    source_urls: [
      'https://bulbapedia.bulbagarden.net/wiki/Ancient_Mew_%28The_Power_of_One_promo%29',
      'https://pkmncards.com/card/ancient-mew-miscellaneous/',
    ],
  },
  'GV-PK-PR-BLW-BW04': {
    family_key: 'new_legends_tins_bw_promo',
    family_label: 'New Legends Tins BW Promo',
    variant_category: 'product_promo_identity',
    confidence: 'high',
    why_it_exists:
      'Reshiram BW04 and Zekrom BW05 were released as BW Black Star Promos with English-exclusive artwork in the New Legends Tins in May 2011.',
    why_collectors_care:
      'These New Legends Tins prints are specific BW promo product identities, separate from the Black & White expansion prints and later box or set reprints.',
    how_to_identify:
      'Confirm Reshiram BW04/BW004 or Zekrom BW05/BW005, BW Black Star Promo membership, and the New Legends Tins artwork.',
    grookai_rule:
      'Grookai models these as exact product-promo parent identities for the New Legends Tins prints, not as generic BW promo family copy.',
    source_urls: [
      'https://bulbapedia.bulbagarden.net/wiki/Reshiram_%28Black_%26_White_26%29',
      'https://bulbapedia.bulbagarden.net/wiki/Zekrom_%28Black_%26_White_47%29',
    ],
  },
  'GV-PK-PR-BLW-BW05': {
    family_key: 'new_legends_tins_bw_promo',
    family_label: 'New Legends Tins BW Promo',
    variant_category: 'product_promo_identity',
    confidence: 'high',
    why_it_exists:
      'Reshiram BW04 and Zekrom BW05 were released as BW Black Star Promos with English-exclusive artwork in the New Legends Tins in May 2011.',
    why_collectors_care:
      'These New Legends Tins prints are specific BW promo product identities, separate from the Black & White expansion prints and later box or set reprints.',
    how_to_identify:
      'Confirm Reshiram BW04/BW004 or Zekrom BW05/BW005, BW Black Star Promo membership, and the New Legends Tins artwork.',
    grookai_rule:
      'Grookai models these as exact product-promo parent identities for the New Legends Tins prints, not as generic BW promo family copy.',
    source_urls: [
      'https://bulbapedia.bulbagarden.net/wiki/Reshiram_%28Black_%26_White_26%29',
      'https://bulbapedia.bulbagarden.net/wiki/Zekrom_%28Black_%26_White_47%29',
    ],
  },
  'GV-PK-PR-SW-SWSH144': {
    family_key: 'celebrations_elite_trainer_box_greninja_star_promo',
    family_label: 'Celebrations Elite Trainer Box Greninja Star Promo',
    variant_category: 'product_promo_identity',
    confidence: 'high',
    why_it_exists:
      'Greninja Star SWSH144 was released as a SWSH Black Star Promo in the Celebrations Elite Trainer Box and Celebrations Pokemon Center Elite Trainer Box from October 8, 2021.',
    why_collectors_care:
      'This card is a modern product-promo revival of Pokemon Star styling, tied specifically to the Celebrations ETB products rather than booster-pack checklist membership.',
    how_to_identify:
      'Confirm Greninja Star, promo number SWSH144, SWSH Black Star Promo membership, and Celebrations ETB product origin.',
    grookai_rule:
      'Grookai models this as an exact Celebrations ETB product-promo parent identity, not as generic SWSH promo family copy.',
    source_urls: [
      'https://bulbapedia.bulbagarden.net/wiki/Greninja_%E2%98%86_%28SWSH_Promo_144%29',
    ],
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

async function readAcquisitionRows() {
  const raw = await fs.readFile(INPUT_JSONL, 'utf8');
  return raw
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line));
}

function rowRef(row, familyKey) {
  return {
    card_print_id: row.card_print_id,
    gv_id: row.gv_id,
    origin_family_key: familyKey,
    variant_key: row.variant_key ?? null,
    printed_identity_modifier: row.printed_identity_modifier ?? null,
  };
}

async function main() {
  const current = JSON.parse(await fs.readFile(WEB_PUBLIC_COPY_JSON, 'utf8'));
  const acquisitionRows = await readAcquisitionRows();
  const targets = acquisitionRows.filter((row) => Object.hasOwn(EXACT_ROWS, row.gv_id));
  const missingTargets = Object.keys(EXACT_ROWS).filter((gvId) => !targets.some((row) => row.gv_id === gvId));
  if (missingTargets.length > 0) {
    throw new Error(`missing_exact_targets:${missingTargets.join(',')}`);
  }

  const families = { ...(current.families ?? {}) };
  const byGvId = { ...(current.by_gv_id ?? {}) };
  const byCardPrintId = { ...(current.by_card_print_id ?? {}) };

  for (const row of targets) {
    const copy = EXACT_ROWS[row.gv_id];
    families[copy.family_key] = copy;
    const ref = rowRef(row, copy.family_key);
    byGvId[normalizeGvId(row.gv_id)] = ref;
    byCardPrintId[row.card_print_id] = ref;
  }

  const output = {
    generated_at: new Date().toISOString(),
    source_fingerprint_sha256: proofHash({
      package_id: PACKAGE_ID,
      exact_rows: targets.map((row) => ({
        card_print_id: row.card_print_id,
        gv_id: row.gv_id,
        family: EXACT_ROWS[row.gv_id].family_key,
        source_urls: EXACT_ROWS[row.gv_id].source_urls,
      })),
    }),
    source_version: `${String(current.source_version ?? 'VARIANT_ORIGIN_INDEX_V1').replace(/\+PROMO_ORIGIN_EXACT_COPY_V1/g, '')}+PROMO_ORIGIN_EXACT_COPY_V1`,
    summary: {
      ...(current.summary ?? {}),
      promo_exact_public_copy_rows_added: targets.length,
      promo_exact_public_copy_families_added: new Set(targets.map((row) => EXACT_ROWS[row.gv_id].family_key)).size,
      public_copy_safe_parent_rows: Object.keys(byCardPrintId).length,
      public_copy_safe_families: Object.keys(families).length,
    },
    families: Object.fromEntries(Object.entries(families).sort(([a], [b]) => a.localeCompare(b))),
    by_gv_id: Object.fromEntries(Object.entries(byGvId).sort(([a], [b]) => a.localeCompare(b))),
    by_card_print_id: Object.fromEntries(Object.entries(byCardPrintId).sort(([a], [b]) => a.localeCompare(b))),
  };

  await fs.writeFile(WEB_PUBLIC_COPY_JSON, `${JSON.stringify(output, null, 2)}\n`, 'utf8');

  const summary = {
    package_id: PACKAGE_ID,
    generated_at: output.generated_at,
    mode: 'static_exact_public_copy_generation_no_db_write',
    db_writes_performed: false,
    migrations_created: false,
    image_writes_performed: false,
    output_json: path.relative(ROOT, WEB_PUBLIC_COPY_JSON),
    metrics: {
      exact_public_copy_rows_added: targets.length,
      exact_public_copy_families_added: new Set(targets.map((row) => EXACT_ROWS[row.gv_id].family_key)).size,
      output_public_copy_rows_total: Object.keys(byCardPrintId).length,
      output_public_copy_families_total: Object.keys(families).length,
    },
    rows: targets.map((row) => ({
      gv_id: row.gv_id,
      name: row.name,
      set_code: row.set_code,
      number: row.number,
      family_key: EXACT_ROWS[row.gv_id].family_key,
      family_label: EXACT_ROWS[row.gv_id].family_label,
      source_urls: EXACT_ROWS[row.gv_id].source_urls,
    })),
  };
  summary.proof_hash = proofHash({
    package_id: summary.package_id,
    metrics: summary.metrics,
    rows: summary.rows,
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
| exact public copy rows added | ${summary.metrics.exact_public_copy_rows_added} |
| exact public copy families added | ${summary.metrics.exact_public_copy_families_added} |
| output public copy rows total | ${summary.metrics.output_public_copy_rows_total} |
| output public copy families total | ${summary.metrics.output_public_copy_families_total} |

## Rows

| GV ID | Name | Family |
| --- | --- | --- |
${summary.rows.map((row) => `| ${row.gv_id} | ${row.name} | ${row.family_label} |`).join('\n')}

## Policy

- Static generated-data update only.
- No database writes, storage writes, migrations, image changes, or price writes.
- Adds exact product/event origin copy only for four source-backed promo rows.
- Ancient Mew adjacent Japanese/error variants remain excluded from this English movie-promo row.
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
