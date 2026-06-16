import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const OUTPUT_DIR = 'docs/audits/image_truth_v1';
const ASSET_MANIFEST_JSON = path.join(OUTPUT_DIR, 'image_truth_missing_display_asset_manifest_v1.json');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'image_truth_mep_tcgcsv_finish_image_audit_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'image_truth_mep_tcgcsv_finish_image_audit_v1.md');
const CATEGORY_ID = 3;
const TCGCSV_BASE_URL = `https://tcgcsv.com/tcgplayer/${CATEGORY_ID}`;
const TCGCSV_GROUP_ID = 24451;
const TCGCSV_GROUP_NAME = 'ME: Mega Evolution Promo';

function clean(value) {
  const normalized = String(value ?? '').trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeText(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeNumber(value) {
  return String(value ?? '').trim().toLowerCase().replace(/^0+(?=\d)/, '');
}

function extendedValue(product, name) {
  return product.extendedData?.find((entry) => entry.name === name || entry.displayName === name)?.value ?? null;
}

function productCardName(product) {
  return String(product.name ?? '')
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .split(/\s+-\s+/)[0]
    .replace(/\s*\[[^\]]+\]\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasModifier(product) {
  const name = normalizeText(product.name);
  if (name.includes('staff')) return 'staff_modifier';
  if (name.includes('pokemon center exclusive')) return 'pokemon_center_exclusive_modifier';
  return null;
}

function hasCosmosLabel(product) {
  return normalizeText(product.name).includes('cosmos holo');
}

async function fetchJson(url) {
  const { stdout } = await execFileAsync('curl.exe', [
    '--ssl-no-revoke',
    '--silent',
    '--show-error',
    '--location',
    '--max-time',
    '120',
    '--user-agent',
    'Grookai Image Truth Audit/1.0',
    url,
  ], { timeout: 140000, maxBuffer: 80 * 1024 * 1024 });
  return JSON.parse(stdout);
}

async function imageExists(url) {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'user-agent': 'GrookaiImageTruthAudit/1.0 (+audit-only; mep-tcgcsv-image-audit)',
        accept: 'image/*',
      },
    });
    return response.ok && String(response.headers.get('content-type') ?? '').toLowerCase().includes('image/');
  } catch {
    try {
      const { stdout } = await execFileAsync('curl.exe', [
        '--ssl-no-revoke',
        '--silent',
        '--show-error',
        '--location',
        '--max-time',
        '30',
        '--head',
        '--user-agent',
        'Grookai Image Truth Audit/1.0',
        url,
      ], { timeout: 40000, maxBuffer: 512 * 1024 });
      return /^HTTP\/\S+\s+200\b/m.test(stdout)
        && /content-type:\s*image\//im.test(stdout);
    } catch {
      return false;
    }
  }
}

function blockedMepRows(manifest) {
  return (manifest.rows ?? manifest.asset_rows ?? [])
    .filter((row) => row.image_scope === 'english_physical')
    .filter((row) => row.target_table === 'card_printings')
    .filter((row) => row.parent_overwrite_allowed === false)
    .filter((row) => row.set_code === 'mep' || row.set_key === 'mep')
    .filter((row) => row.finish_key === 'holo')
    .filter((row) => !['source_image_url_preserved', 'representative_image_url_preserved'].includes(row.asset_status));
}

function buildProductIndex(products, prices) {
  const pricesByProductId = new Map();
  for (const price of prices) {
    const key = String(price.productId);
    const existing = pricesByProductId.get(key) ?? [];
    existing.push(price);
    pricesByProductId.set(key, existing);
  }
  return products.map((product) => {
    const number = normalizeNumber(String(extendedValue(product, 'Number') ?? '').split('/')[0]);
    const name = productCardName(product);
    const productPrices = pricesByProductId.get(String(product.productId)) ?? [];
    return {
      product,
      number,
      name,
      name_key: normalizeText(name),
      price_subtypes: [...new Set(productPrices.map((price) => clean(price.subTypeName)).filter(Boolean))],
      modifier: hasModifier(product),
      has_cosmos_label: hasCosmosLabel(product),
      image_urls: [
        `https://tcgplayer-cdn.tcgplayer.com/product/${product.productId}_200w.jpg`,
        `https://product-images.tcgplayer.com/${product.productId}.jpg`,
      ],
    };
  });
}

function classify(row, candidates) {
  if (candidates.length === 0) return { status: 'no_tcgcsv_product_match', selected: null, reason: 'No live TCGCSV product matched set, card number, and card name.' };

  const baseCandidates = candidates.filter((candidate) => !candidate.modifier);
  const usablePool = baseCandidates.length ? baseCandidates : candidates;
  const cleanHolo = usablePool.filter((candidate) => {
    return !candidate.modifier
      && !candidate.has_cosmos_label
      && candidate.price_subtypes.includes('Holofoil');
  });

  if (cleanHolo.length === 1) {
    return {
      status: 'representative_candidate',
      selected: cleanHolo[0],
      reason: 'Live TCGCSV product matches card identity with Holofoil subtype and no modifier/cosmos label.',
    };
  }

  if (cleanHolo.length > 1) {
    return {
      status: 'needs_manual_review',
      selected: null,
      reason: 'Multiple unmodified Holofoil products matched the same card identity.',
    };
  }

  if (usablePool.some((candidate) => candidate.has_cosmos_label)) {
    return {
      status: 'finish_label_conflict_cosmos_vs_holo',
      selected: null,
      reason: 'Live TCGCSV product title says Cosmos Holo while the current missing-display target is finish_key=holo.',
    };
  }

  if (usablePool.some((candidate) => candidate.modifier)) {
    return {
      status: 'modifier_variant_excluded',
      selected: null,
      reason: 'Only modifier products matched, such as Staff or Pokemon Center Exclusive.',
    };
  }

  return {
    status: 'finish_subtype_not_usable',
    selected: null,
    reason: 'Matched product did not provide an unmodified Holofoil image candidate.',
  };
}

function markdownTable(rows, columns) {
  if (rows.length === 0) return '_None._';
  const header = `| ${columns.map((column) => column.label).join(' | ')} |`;
  const divider = `| ${columns.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => {
    const cells = columns.map((column) => String(column.value(row) ?? '').replace(/\|/g, '\\|'));
    return `| ${cells.join(' | ')} |`;
  });
  return [header, divider, ...body].join('\n');
}

function buildMarkdown(report) {
  return `# Image Truth V1 MEP TCGCSV Finish/Image Audit

This is a read-only source discovery report. It does not upload images, update card_printings, update parent card_prints, create migrations, or promote image truth.

## Safety

- db_writes_performed: ${report.db_writes_performed}
- storage_uploads_performed: ${report.storage_uploads_performed}
- migrations_created: ${report.migrations_created}
- parent_overwrite_allowed: ${report.parent_overwrite_allowed}
- target_table: ${report.target_table}

## Summary

- source: ${report.source.source_name}
- source_url: ${report.source.source_url}
- target_rows: ${report.target_rows}
- representative_candidates: ${report.summary.by_status.representative_candidate ?? 0}
- finish_label_conflict_cosmos_vs_holo: ${report.summary.by_status.finish_label_conflict_cosmos_vs_holo ?? 0}
- modifier_variant_excluded: ${report.summary.by_status.modifier_variant_excluded ?? 0}
- no_tcgcsv_product_match: ${report.summary.by_status.no_tcgcsv_product_match ?? 0}
- needs_manual_review: ${report.summary.by_status.needs_manual_review ?? 0}

## Representative Candidates

${markdownTable(report.rows.filter((row) => row.status === 'representative_candidate'), [
  { label: 'set', value: (row) => row.set_code },
  { label: 'number', value: (row) => row.number },
  { label: 'card', value: (row) => row.card_name },
  { label: 'finish', value: (row) => row.finish_key },
  { label: 'product', value: (row) => row.selected_product_name },
  { label: 'image exists', value: (row) => row.selected_image_exists },
  { label: 'source', value: (row) => row.selected_source_url },
])}

## Blocked Or Review

${markdownTable(report.rows.filter((row) => row.status !== 'representative_candidate'), [
  { label: 'status', value: (row) => row.status },
  { label: 'number', value: (row) => row.number },
  { label: 'card', value: (row) => row.card_name },
  { label: 'finish', value: (row) => row.finish_key },
  { label: 'reason', value: (row) => row.reason },
  { label: 'matched products', value: (row) => row.matched_products.map((product) => product.name).join('; ') },
])}

## Rule

Rows with product titles that say Cosmos Holo, Staff, or Pokemon Center Exclusive are not promoted into base holo image coverage. They require a finish/modifier governance decision first.
`;
}

async function main() {
  const manifest = JSON.parse(await fs.readFile(ASSET_MANIFEST_JSON, 'utf8'));
  const targetRows = blockedMepRows(manifest);
  const [productsPayload, pricesPayload] = await Promise.all([
    fetchJson(`${TCGCSV_BASE_URL}/${TCGCSV_GROUP_ID}/products`),
    fetchJson(`${TCGCSV_BASE_URL}/${TCGCSV_GROUP_ID}/prices`),
  ]);
  const products = productsPayload.results ?? [];
  const prices = pricesPayload.results ?? [];
  const productIndex = buildProductIndex(products, prices);

  const rows = [];
  for (const row of targetRows) {
    const candidates = productIndex.filter((candidate) => {
      return candidate.number === normalizeNumber(row.number)
        && candidate.name_key === normalizeText(row.card_name);
    });
    const classification = classify(row, candidates);
    const selected = classification.selected;
    const selectedImageUrl = selected
      ? (await (async () => {
          for (const imageUrl of selected.image_urls) {
            if (await imageExists(imageUrl)) return imageUrl;
          }
          return null;
        })())
      : null;
    const selectedImageExists = selected ? Boolean(selectedImageUrl) : null;
    rows.push({
      card_printing_id: row.card_printing_id,
      card_print_id: row.card_print_id,
      set_code: row.set_code,
      set_name: row.set_name,
      number: row.number,
      card_name: row.card_name,
      finish_key: row.finish_key,
      status: selected && !selectedImageExists ? 'image_url_unavailable' : classification.status,
      reason: selected && !selectedImageExists ? 'TCGplayer product matched, but product image URL did not return an image.' : classification.reason,
      selected_product_id: selected?.product.productId ?? null,
      selected_product_name: selected?.product.name ?? null,
      selected_source_url: selected?.product.url ?? null,
      selected_image_url: selectedImageUrl,
      selected_image_exists: selectedImageExists,
      matched_products: candidates.map((candidate) => ({
        product_id: candidate.product.productId,
        name: candidate.product.name,
        source_url: candidate.product.url,
        number: candidate.number,
        price_subtypes: candidate.price_subtypes,
        modifier: candidate.modifier,
        has_cosmos_label: candidate.has_cosmos_label,
        image_urls: candidate.image_urls,
      })),
    });
  }

  const byStatus = {};
  for (const row of rows) byStatus[row.status] = (byStatus[row.status] ?? 0) + 1;

  const report = {
    generated_at: new Date().toISOString(),
    audit_only: true,
    db_writes_performed: false,
    storage_uploads_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    target_table: 'card_printings',
    parent_overwrite_allowed: false,
    source: {
      source_name: 'TCGCSV live TCGplayer catalog',
      source_url: `${TCGCSV_BASE_URL}/${TCGCSV_GROUP_ID}/products`,
      group_id: TCGCSV_GROUP_ID,
      group_name: TCGCSV_GROUP_NAME,
    },
    target_rows: targetRows.length,
    source_products: products.length,
    source_prices: prices.length,
    summary: {
      by_status: byStatus,
    },
    rows,
  };

  await fs.writeFile(OUTPUT_JSON, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(OUTPUT_MD, buildMarkdown(report));
  console.log(JSON.stringify({
    generated: [OUTPUT_JSON, OUTPUT_MD],
    target_rows: report.target_rows,
    by_status: report.summary.by_status,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
