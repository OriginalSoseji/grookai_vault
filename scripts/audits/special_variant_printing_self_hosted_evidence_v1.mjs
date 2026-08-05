import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import tls from 'node:tls';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: process.env.SPECIAL_VARIANT_ENV_FILE ?? '.env.local', quiet: true });
dotenv.config({ quiet: true });

tls.setDefaultCACertificates([
  ...tls.getCACertificates('default'),
  ...tls.getCACertificates('system'),
]);

export const PACKAGE_ID = 'SPECIAL-VARIANT-PRINTING-SELF-HOSTED-EVIDENCE-V1';
export const PACKET_VERSION = 'SPECIAL_VARIANT_PRINTING_SELF_HOSTED_REVIEW_PACKET_V1';
export const STORAGE_BUCKET = process.env.SPECIAL_VARIANT_STORAGE_BUCKET ?? 'user-card-images';
export const STORAGE_PREFIX = 'warehouse-derived/special-variant-printing-evidence-v1/';
export const REVIEW_QUEUE_PATH = 'docs/audits/special_variant_printing_operations_v1/special_variant_printing_human_review_queue_v1.json';
export const OUTPUT_DIR = 'docs/audits/special_variant_printing_self_hosted_evidence_v1';
export const PLAN_PATH = `${OUTPUT_DIR}/special_variant_printing_self_hosted_evidence_plan_v1.json`;
export const RESULT_PATH = `${OUTPUT_DIR}/special_variant_printing_self_hosted_evidence_result_v1.json`;
export const REVIEW_MANIFEST_PATH = 'apps/web/src/data/review/specialVariantPrintingEvidenceV1.json';
export const EXPECTED_ROW_COUNT = 143;
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const FETCH_CONCURRENCY = Math.max(1, Math.min(Number(process.env.SPECIAL_VARIANT_IMAGE_CONCURRENCY ?? 8), 12));
export const UPLOAD_APPROVAL_PHRASE = 'UPLOAD_SPECIAL_VARIANT_SELF_HOSTED_EVIDENCE_V1';

export const EXACT_IMAGE_FALLBACKS = new Map([
  [232881, {
    provider: 'pricecharting_exact_product_page',
    page_url: 'https://www.pricecharting.com/game/pokemon-majestic-dawn/mothim-prerelease-42',
    page_title: 'Mothim [Prerelease] #42 Prices | Pokemon Majestic Dawn | Pokemon Cards',
    image_url: 'https://storage.googleapis.com/images.pricecharting.com/jcjmcpyeazpt3tvc/1600.jpg',
  }],
  [655977, {
    provider: 'pricecharting_exact_product_page',
    page_url: 'https://www.pricecharting.com/game/pokemon-mega-evolution/xerneas-stamped-64',
    page_title: 'Xerneas [Stamped] #64 Prices | Pokemon Mega Evolution | Pokemon Cards',
    image_url: 'https://storage.googleapis.com/images.pricecharting.com/kigapcsehggtceul/1600.jpg',
  }],
  [659592, {
    provider: 'pricecharting_exact_product_page',
    page_url: 'https://www.pricecharting.com/game/pokemon-mega-evolution/yveltal-stamped-88',
    page_title: 'Yveltal [Stamped] #88 Prices | Pokemon Mega Evolution | Pokemon Cards',
    image_url: 'https://storage.googleapis.com/images.pricecharting.com/prsuizx6zobctmio/1600.jpg',
  }],
  [664140, {
    provider: 'pricecharting_exact_product_page',
    page_url: 'https://www.pricecharting.com/game/pokemon-paradox-rift/zekrom-cosmos-holo-66',
    page_title: 'Zekrom [Cosmos Holo] #66 Prices | Pokemon Paradox Rift | Pokemon Cards',
    image_url: 'https://storage.googleapis.com/images.pricecharting.com/iwbbof6rr3zz4xn6/1600.jpg',
  }],
  [664144, {
    provider: 'pricecharting_exact_product_page',
    page_url: 'https://www.pricecharting.com/game/pokemon-stellar-crown/meltan-stamped-102',
    page_title: 'Meltan [Stamped] #102 Prices | Pokemon Stellar Crown | Pokemon Cards',
    image_url: 'https://storage.googleapis.com/images.pricecharting.com/lzjo2yzqubg3hq7y/1600.jpg',
  }],
  [664145, {
    provider: 'pricecharting_exact_product_page',
    page_url: 'https://www.pricecharting.com/game/pokemon-stellar-crown/melmetal-ex-stamped-105',
    page_title: 'Melmetal Ex [Stamped] #105 Prices | Pokemon Stellar Crown | Pokemon Cards',
    image_url: 'https://storage.googleapis.com/images.pricecharting.com/6nny6crqp43ydufw/1600.jpg',
  }],
  [151708, {
    provider: 'pricecharting_exact_product_page',
    page_url: 'https://www.pricecharting.com/game/pokemon-promo/alolan-raichu-staff-sm72',
    page_title: 'Alolan Raichu [Staff] #SM72 Prices | Pokemon Promo | Pokemon Cards',
    image_url: 'https://storage.googleapis.com/images.pricecharting.com/19a2d1731e71251dbc52e4a5b2e08560b4df79de1810a059956833eb4140a47f/1600.jpg',
  }],
  [151706, {
    provider: 'ebay_exact_listing_photo',
    page_url: 'https://www.ebay.com/itm/336588086108',
    page_title: 'Salazzle - SM73 - (Staff) Pre-Release Promo LP',
    image_url: 'https://i.ebayimg.com/images/g/X2QAAeSwyXRqCd-E/s-l1600.jpg',
  }],
  [151707, {
    provider: 'pricecharting_exact_product_page',
    page_url: 'https://www.pricecharting.com/game/pokemon-promo/regirock-staff-sm74',
    page_title: 'Regirock [Prerelease Staff] #SM74 Prices | Pokemon Promo | Pokemon Cards',
    image_url: 'https://storage.googleapis.com/images.pricecharting.com/4f500d3b0570884343ae5c09d237ef2bd28143f8369fc4fd94b96230cd92eac4/1600.jpg',
  }],
]);

function clean(value) {
  const normalized = String(value ?? '').trim();
  return normalized || null;
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value).sort().reduce((output, key) => {
    output[key] = canonicalize(value[key]);
    return output;
  }, {});
}

export function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function proofHash(value) {
  return sha256(JSON.stringify(canonicalize(value)));
}

function pngDimensions(buffer) {
  if (buffer.length < 24 || buffer[0] !== 0x89 || buffer[1] !== 0x50 || buffer[2] !== 0x4e || buffer[3] !== 0x47) return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20), format: 'png', content_type: 'image/png' };
}

function jpegDimensions(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    if (marker === 0xd8 || marker === 0xd9) {
      offset += 2;
      continue;
    }
    const length = buffer.readUInt16BE(offset + 2);
    if (length < 2) return null;
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5), format: 'jpg', content_type: 'image/jpeg' };
    }
    offset += 2 + length;
  }
  return null;
}

export function observeImage(buffer) {
  const dimensions = pngDimensions(buffer) ?? jpegDimensions(buffer);
  if (!dimensions) throw new Error('unsupported_or_invalid_image');
  return {
    sha256: sha256(buffer),
    size_bytes: buffer.length,
    ...dimensions,
  };
}

export function validateImageObservation(observation) {
  const failures = [];
  if (!/^[0-9a-f]{64}$/.test(observation?.sha256 ?? '')) failures.push('invalid_sha256');
  if (!['image/jpeg', 'image/png'].includes(observation?.content_type)) failures.push('invalid_content_type');
  if (!Number.isInteger(observation?.width) || !Number.isInteger(observation?.height)) failures.push('missing_dimensions');
  if (Number(observation?.width) < 180 || Number(observation?.height) < 250) failures.push('below_review_resolution_floor');
  if (Number(observation?.size_bytes) <= 10_000 || Number(observation?.size_bytes) > MAX_IMAGE_BYTES) failures.push('invalid_size');
  return failures;
}

export function parseTcgplayerProductIdFromImageUrl(value) {
  const match = clean(value)?.match(/(?:product-images\.tcgplayer\.com\/(?:fit-in\/\d+x\d+\/)?|tcgplayer-cdn\.tcgplayer\.com\/product\/)(\d+)/i);
  return match ? Number(match[1]) : null;
}

export function highResolutionSourceUrl(productId) {
  return `https://product-images.tcgplayer.com/${Number(productId)}.jpg`;
}

export function validateCatalogBinding(queueRow, product) {
  const failures = [];
  if (!product) return ['tcgcsv_product_missing'];
  if (Number(product.product_id) !== Number(queueRow.source_product_id)) failures.push('product_id_mismatch');
  if (clean(product.name) !== clean(queueRow.source_product_title)) failures.push('product_title_mismatch');
  if (clean(product.source_url) !== clean(queueRow.source_url)) failures.push('product_source_url_mismatch');
  if (clean(product.payload_hash) !== clean(queueRow.source_product_payload_hash)) failures.push('product_payload_hash_mismatch');
  if (product.source_active !== true) failures.push('product_not_active');
  if (parseTcgplayerProductIdFromImageUrl(product.image_url) !== Number(queueRow.source_product_id)) failures.push('tcgcsv_image_product_id_mismatch');
  if (parseTcgplayerProductIdFromImageUrl(highResolutionSourceUrl(queueRow.source_product_id)) !== Number(queueRow.source_product_id)) failures.push('high_resolution_image_product_id_mismatch');
  return failures;
}

export function buildStoragePath(row, observation) {
  const extension = observation.format === 'png' ? 'png' : 'jpg';
  return `${STORAGE_PREFIX}${row.card_printing_id}/${observation.sha256}.${extension}`;
}

export function buildPacketFingerprint(rows) {
  return proofHash(rows.map((row) => ({
    evidence_id: row.evidence_id,
    card_printing_id: row.card_printing_id,
    source_product_id: row.source_product_id,
    source_product_payload_hash: row.source_product_payload_hash,
    source_image_sha256: row.source_image.sha256,
    storage_bucket: row.storage_bucket,
    storage_path: row.storage_path,
  })));
}

export function buildReviewManifest(plan, uploadRows) {
  const uploadedByEvidence = new Map(uploadRows.map((row) => [row.evidence_id, row]));
  const rows = plan.rows.map((row) => {
    const upload = uploadedByEvidence.get(row.evidence_id);
    if (!upload || !['uploaded_and_verified', 'verified_existing'].includes(upload.storage_status)) {
      throw new Error(`missing_verified_self_hosted_evidence:${row.evidence_id}`);
    }
    return {
      evidence_id: row.evidence_id,
      queue_id: row.queue_id,
      card_print_id: row.card_print_id,
      card_printing_id: row.card_printing_id,
      truth_review_id: row.truth_review_id,
      parent_gv_id: row.parent_gv_id,
      printing_gv_id: row.printing_gv_id,
      name: row.name,
      number: row.number,
      set_code: row.set_code,
      variant_key: row.variant_key,
      finish_key: row.finish_key,
      source_provider: row.source_provider,
      source_product_id: row.source_product_id,
      source_product_title: row.source_product_title,
      source_page_url: row.source_page_url,
      source_product_payload_hash: row.source_product_payload_hash,
      source_image_url: row.source_image_url,
      source_image: row.source_image,
      storage_bucket: row.storage_bucket,
      storage_path: row.storage_path,
      claim_role: row.claim_role,
      evidence_strength: row.evidence_strength,
      review_flags: row.review_flags,
      self_hosted_verified: true,
      automatic_approval_permitted: false,
      automatic_publication_permitted: false,
      automatic_pricing_mapping_permitted: false,
    };
  });
  return {
    version: PACKET_VERSION,
    generated_at: new Date().toISOString(),
    packet_fingerprint: plan.packet_fingerprint,
    source_queue_fingerprint: plan.source_queue_fingerprint,
    storage_bucket: STORAGE_BUCKET,
    self_hosted_only: true,
    server_writes_performed_by_review_portal: false,
    rows,
    summary: {
      total: rows.length,
      self_hosted_verified: rows.filter((row) => row.self_hosted_verified).length,
      low_resolution: rows.filter((row) => row.review_flags.includes('low_resolution_source')).length,
      duplicate_hash_review: rows.filter((row) => row.review_flags.includes('duplicate_source_image_hash')).length,
    },
  };
}

async function mapLimit(values, limit, mapper) {
  const output = new Array(values.length);
  let cursor = 0;
  async function worker() {
    while (cursor < values.length) {
      const index = cursor++;
      output[index] = await mapper(values[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, worker));
  return output;
}

function createSupabase() {
  const url = clean(process.env.SUPABASE_URL);
  const key = clean(process.env.SUPABASE_SECRET_KEY);
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function fetchBufferWithLimit(url) {
  const parsed = new URL(url);
  const allowedHosts = new Set([
    'product-images.tcgplayer.com',
    'tcgplayer-cdn.tcgplayer.com',
    'storage.googleapis.com',
    'i.ebayimg.com',
  ]);
  if (parsed.protocol !== 'https:' || !allowedHosts.has(parsed.hostname)) throw new Error('source_image_host_not_allowed');
  const response = await fetch(parsed, {
    redirect: 'follow',
    signal: AbortSignal.timeout(45_000),
    headers: { 'user-agent': 'GrookaiSpecialVariantEvidence/1.0', accept: 'image/jpeg,image/png;q=0.9' },
  });
  const finalUrl = new URL(response.url);
  if (finalUrl.protocol !== 'https:' || !allowedHosts.has(finalUrl.hostname)) throw new Error('source_image_redirect_not_allowed');
  if (!response.ok || !response.body) throw new Error(`source_image_http_${response.status}`);
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body) {
    const buffer = Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_IMAGE_BYTES) throw new Error('source_image_too_large');
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

async function fetchCandidateImage(row, product) {
  const attempts = [
    {
      provider: 'tcgcsv_tcgplayer_catalog',
      page_url: row.source_url,
      page_title: row.source_product_title,
      image_url: highResolutionSourceUrl(row.source_product_id),
      review_flags: [],
    },
  ];
  if (product?.image_url) {
    attempts.push({
      provider: 'tcgcsv_tcgplayer_catalog_thumbnail',
      page_url: row.source_url,
      page_title: row.source_product_title,
      image_url: product.image_url,
      review_flags: ['catalog_thumbnail_fallback'],
    });
  }
  const exactFallback = EXACT_IMAGE_FALLBACKS.get(Number(row.source_product_id));
  if (exactFallback) {
    attempts.push({
      ...exactFallback,
      review_flags: [
        'secondary_source_fallback',
        ...(exactFallback.provider === 'ebay_exact_listing_photo' ? ['marketplace_listing_photo'] : []),
      ],
    });
  }

  const failures = [];
  for (const attempt of attempts) {
    try {
      const buffer = await fetchBufferWithLimit(attempt.image_url);
      return { ...attempt, buffer, failed_attempts: failures };
    } catch (error) {
      failures.push({
        provider: attempt.provider,
        image_url: attempt.image_url,
        failure: String(error.message),
      });
    }
  }
  const lastFailure = failures.at(-1)?.failure ?? 'no_candidate_source';
  throw new Error(`${lastFailure};attempts=${failures.map((failure) => `${failure.provider}:${failure.failure}`).join('|')}`);
}

async function fetchProducts(supabase, productIds) {
  const rows = [];
  for (let index = 0; index < productIds.length; index += 100) {
    const { data, error } = await supabase
      .from('tcgcsv_source_products')
      .select('product_id,name,image_url,source_url,payload_hash,source_modified_on,source_active')
      .in('product_id', productIds.slice(index, index + 100));
    if (error) throw new Error(`tcgcsv_product_read_failed:${error.message}`);
    rows.push(...(data ?? []));
  }
  return rows;
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export async function buildPlan() {
  const queue = await readJson(REVIEW_QUEUE_PATH);
  if (queue.rows?.length !== EXPECTED_ROW_COUNT) throw new Error(`review_queue_count_mismatch:${queue.rows?.length}`);
  if (queue.rows.some((row) => row.automatic_approval_permitted !== false || row.durable_state?.public_visibility !== 'hidden_pending_review')) {
    throw new Error('review_queue_boundary_mismatch');
  }
  const supabase = createSupabase();
  const products = await fetchProducts(supabase, queue.rows.map((row) => row.source_product_id));
  const productById = new Map(products.map((row) => [Number(row.product_id), row]));
  const fetched = await mapLimit(queue.rows, FETCH_CONCURRENCY, async (row) => {
    const product = productById.get(Number(row.source_product_id));
    const bindingFailures = validateCatalogBinding(row, product);
    if (bindingFailures.length) return { row, product, buffer: null, observation: null, failures: bindingFailures };
    try {
      const candidate = await fetchCandidateImage(row, product);
      const { buffer } = candidate;
      const observation = observeImage(buffer);
      const imageFailures = validateImageObservation(observation);
      return { row, product, candidate, buffer, observation, failures: imageFailures };
    } catch (error) {
      return { row, product, candidate: null, buffer: null, observation: null, failures: [`source_fetch_failed:${error.message}`] };
    }
  });
  const hashCounts = new Map();
  for (const item of fetched) {
    if (item.observation) hashCounts.set(item.observation.sha256, (hashCounts.get(item.observation.sha256) ?? 0) + 1);
  }
  const rows = fetched.map(({ row, product, candidate, observation, failures }) => {
    const lowResolution = observation && (observation.width < 600 || observation.height < 825);
    const ratio = observation ? observation.width / observation.height : null;
    const paddedCanvas = Number.isFinite(ratio) && (ratio < 0.62 || ratio > 0.78);
    const duplicate = observation && (hashCounts.get(observation.sha256) ?? 0) > 1;
    const reviewFlags = [
      ...(lowResolution ? ['low_resolution_source'] : []),
      ...(paddedCanvas ? ['padded_or_nonstandard_canvas'] : []),
      ...(duplicate ? ['duplicate_source_image_hash'] : []),
      ...(candidate?.review_flags ?? []),
    ];
    const hardFailures = failures;
    const evidenceId = `svpi:${row.card_printing_id}:${row.source_product_id}`;
    return {
      evidence_id: evidenceId,
      queue_id: row.queue_id,
      card_print_id: row.card_print_id,
      card_printing_id: row.card_printing_id,
      truth_review_id: row.truth_review_id,
      parent_gv_id: row.parent_gv_id,
      printing_gv_id: row.printing_gv_id,
      name: row.name,
      number: row.number,
      set_code: row.set_code,
      variant_key: row.variant_key,
      finish_key: row.finish_key,
      source_provider: candidate?.provider ?? 'tcgcsv_tcgplayer_catalog',
      source_product_id: row.source_product_id,
      source_product_title: row.source_product_title,
      source_page_url: candidate?.page_url ?? row.source_url,
      source_page_title: candidate?.page_title ?? row.source_product_title,
      source_product_payload_hash: row.source_product_payload_hash,
      source_product_modified_on: product?.source_modified_on ?? null,
      tcgcsv_source_image_url: product?.image_url ?? null,
      source_image_url: candidate?.image_url ?? null,
      failed_source_attempts: candidate?.failed_attempts ?? [],
      source_image: observation,
      storage_bucket: STORAGE_BUCKET,
      storage_path: observation ? buildStoragePath(row, observation) : null,
      claim_role: 'candidate_exact_variant_front',
      evidence_strength: 'product_bound_human_confirmation_required',
      review_flags: reviewFlags,
      validation_failures: hardFailures,
      ready_for_self_hosting: Boolean(observation) && hardFailures.length === 0,
      automatic_approval_permitted: false,
    };
  });
  const readyRows = rows.filter((row) => row.ready_for_self_hosting);
  const fingerprintRows = readyRows.map((row) => row);
  const plan = {
    package_id: PACKAGE_ID,
    generated_at: new Date().toISOString(),
    mode: 'plan_only',
    source_queue_path: REVIEW_QUEUE_PATH,
    source_queue_fingerprint: queue.fingerprint_sha256,
    storage_bucket: STORAGE_BUCKET,
    storage_prefix: STORAGE_PREFIX,
    selected_rows: rows.length,
    ready_rows: readyRows.length,
    blocked_rows: rows.length - readyRows.length,
    storage_writes_performed: false,
    db_writes_performed: false,
    approvals_performed: false,
    publication_performed: false,
    pricing_mappings_performed: false,
    rows,
    packet_fingerprint: buildPacketFingerprint(fingerprintRows),
  };
  plan.plan_fingerprint = proofHash({
    package_id: plan.package_id,
    source_queue_fingerprint: plan.source_queue_fingerprint,
    packet_fingerprint: plan.packet_fingerprint,
    rows: fingerprintRows,
  });
  return plan;
}

async function storageReadback(supabase, storagePath) {
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).download(storagePath);
  if (error || !data) return { exists: false, buffer: null, observation: null, error: error?.message ?? 'missing' };
  const buffer = Buffer.from(await data.arrayBuffer());
  return { exists: true, buffer, observation: observeImage(buffer), error: null };
}

function observationsEqual(left, right) {
  return proofHash(left) === proofHash(right);
}

export async function uploadPlan(plan, approvalPhrase) {
  if (approvalPhrase !== UPLOAD_APPROVAL_PHRASE) throw new Error('upload_approval_phrase_mismatch');
  if (plan.selected_rows !== EXPECTED_ROW_COUNT || plan.ready_rows !== EXPECTED_ROW_COUNT || plan.blocked_rows !== 0) {
    throw new Error('plan_not_complete');
  }
  const rebuilt = await buildPlan();
  if (rebuilt.plan_fingerprint !== plan.plan_fingerprint) throw new Error('plan_fingerprint_drift');
  const supabase = createSupabase();
  const staged = await mapLimit(plan.rows, FETCH_CONCURRENCY, async (row) => {
    const buffer = await fetchBufferWithLimit(row.source_image_url);
    const observation = observeImage(buffer);
    if (!observationsEqual(observation, row.source_image)) throw new Error(`source_image_drift:${row.evidence_id}`);
    const existing = await storageReadback(supabase, row.storage_path);
    if (existing.exists && !observationsEqual(existing.observation, row.source_image)) {
      throw new Error(`existing_storage_integrity_mismatch:${row.evidence_id}`);
    }
    return { row, buffer, existing };
  });
  const results = [];
  for (const entry of staged) {
    let storageStatus = 'verified_existing';
    if (!entry.existing.exists) {
      const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(entry.row.storage_path, entry.buffer, {
        upsert: false,
        contentType: entry.row.source_image.content_type,
        cacheControl: '31536000',
      });
      if (error) throw new Error(`storage_upload_failed:${entry.row.evidence_id}:${error.message}`);
      storageStatus = 'uploaded_and_verified';
    }
    const readback = await storageReadback(supabase, entry.row.storage_path);
    if (!readback.exists || !observationsEqual(readback.observation, entry.row.source_image)) {
      throw new Error(`storage_readback_failed:${entry.row.evidence_id}`);
    }
    results.push({
      evidence_id: entry.row.evidence_id,
      card_printing_id: entry.row.card_printing_id,
      storage_bucket: STORAGE_BUCKET,
      storage_path: entry.row.storage_path,
      storage_status: storageStatus,
      source_image: entry.row.source_image,
      storage_readback: readback.observation,
    });
  }
  const manifest = buildReviewManifest(plan, results);
  const result = {
    package_id: PACKAGE_ID,
    generated_at: new Date().toISOString(),
    mode: 'storage_upload_result',
    plan_fingerprint: plan.plan_fingerprint,
    packet_fingerprint: plan.packet_fingerprint,
    selected_rows: plan.selected_rows,
    uploaded_and_verified: results.filter((row) => row.storage_status === 'uploaded_and_verified').length,
    verified_existing: results.filter((row) => row.storage_status === 'verified_existing').length,
    failures: 0,
    storage_writes_performed: results.some((row) => row.storage_status === 'uploaded_and_verified'),
    db_writes_performed: false,
    approvals_performed: false,
    publication_performed: false,
    pricing_mappings_performed: false,
    rows: results,
    review_manifest_path: REVIEW_MANIFEST_PATH,
  };
  result.proof_hash = proofHash(result);
  return { result, manifest };
}

function parseArgs(argv) {
  const args = { mode: 'plan', planFingerprint: null, approvalPhrase: null };
  for (let index = 2; index < argv.length; index += 1) {
    const [key, inline] = argv[index].split('=', 2);
    const value = inline ?? argv[index + 1];
    if (key === '--mode') {
      args.mode = value;
      if (inline === undefined) index += 1;
    } else if (key === '--plan-fingerprint') {
      args.planFingerprint = value;
      if (inline === undefined) index += 1;
    } else if (key === '--approval-phrase') {
      args.approvalPhrase = value;
      if (inline === undefined) index += 1;
    } else {
      throw new Error(`Unknown argument: ${argv[index]}`);
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  if (!['plan', 'upload'].includes(args.mode)) throw new Error('mode_must_be_plan_or_upload');
  if (args.mode === 'plan') {
    const plan = await buildPlan();
    await writeJson(PLAN_PATH, plan);
    console.log(JSON.stringify({
      package_id: PACKAGE_ID,
      mode: 'plan',
      selected_rows: plan.selected_rows,
      ready_rows: plan.ready_rows,
      blocked_rows: plan.blocked_rows,
      packet_fingerprint: plan.packet_fingerprint,
      plan_fingerprint: plan.plan_fingerprint,
      plan_path: PLAN_PATH,
    }, null, 2));
    if (plan.blocked_rows > 0) process.exitCode = 1;
    return;
  }
  const plan = await readJson(PLAN_PATH);
  if (args.planFingerprint !== plan.plan_fingerprint) throw new Error('provided_plan_fingerprint_mismatch');
  const { result, manifest } = await uploadPlan(plan, args.approvalPhrase);
  await writeJson(RESULT_PATH, result);
  await writeJson(REVIEW_MANIFEST_PATH, manifest);
  console.log(JSON.stringify(result, null, 2));
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    console.error(`[${PACKAGE_ID}] ${error.stack ?? error.message}`);
    process.exitCode = 1;
  });
}
