import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import tls from 'node:tls';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

import {
  STORAGE_BUCKET,
  STORAGE_PREFIX,
  buildPacketFingerprint,
  buildStoragePath,
  observeImage,
  sha256,
  validateImageObservation,
} from './special_variant_printing_self_hosted_evidence_v1.mjs';
import {
  FOUNDER_ARTIFACT_VERSION,
  MANIFEST_PATH as BASE_MANIFEST_PATH,
  validateFounderArtifact,
} from './special_variant_printing_review_gate_v1.mjs';

dotenv.config({ path: process.env.SPECIAL_VARIANT_ENV_FILE ?? '.env.local', quiet: true });
dotenv.config({ quiet: true });
tls.setDefaultCACertificates([
  ...tls.getCACertificates('default'),
  ...tls.getCACertificates('system'),
]);

const ROOT = process.cwd();
export const VERSION = 'SPECIAL_VARIANT_REPAIR_AMENDMENT_V1';
export const MANIFEST_VERSION = 'SPECIAL_VARIANT_PRINTING_REPAIR_AMENDMENT_MANIFEST_V1';
export const EXPECTED_REPAIR_COUNT = 10;
export const NORMALIZED_WIDTH = 750;
export const NORMALIZED_HEIGHT = 1050;
export const APPROVAL_PHRASE = 'UPLOAD_SPECIAL_VARIANT_REPAIR_AMENDMENT_V1';
export const ORIGINAL_FOUNDER_PATH = path.join(
  ROOT,
  'docs',
  'audits',
  'special_variant_printing_self_hosted_evidence_v1',
  'founder_review_v1',
  'special_variant_founder_143_of_143.json',
);
export const OUTPUT_DIR = path.join(
  ROOT,
  'docs',
  'audits',
  'special_variant_printing_self_hosted_evidence_v1',
  'founder_amendment_v1',
);
export const REPAIR_MANIFEST_PATH = path.join(OUTPUT_DIR, 'special_variant_repair_manifest_10.json');
export const FOUNDER_AMENDMENT_PATH = path.join(OUTPUT_DIR, 'special_variant_founder_amendment_10.json');
const NORMALIZER_PATH = path.join(ROOT, 'scripts', 'audits', 'normalize_special_variant_card_image_v1.py');
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export const REPAIR_DEFINITIONS = Object.freeze([
  {
    card_printing_id: 'b4646204-1bef-5624-8ced-3e474ece55a0',
    repair_class: 'authority_nomenclature_correction',
    acquisition: 'external_exact',
    source_provider: 'ebay_exact_listing_photo',
    source_page_url: 'https://www.ebay.com/itm/227455465972',
    source_page_title: 'Sawsbuck 016/236 Cosmic Eclipse Non-Holo Deck Exclusive',
    source_image_url: 'https://i.ebayimg.com/images/g/7LEAAeSwDTBqa73H/s-l1600.jpg',
    visual_marker_expectation: 'no_prerelease_stamp_expected',
    authority_urls: [
      'https://bulbapedia.bulbagarden.net/wiki/Cosmic_Eclipse_Build_%26_Battle_Box_%28TCG%29',
    ],
    amendment_note: 'The exact printing is the Build & Battle-exclusive non-Holofoil Sawsbuck. The stable GV-ID says PRERELEASE-STAMP, but the authoritative product evidence establishes that this deck-exclusive printing has no visible prerelease stamp.',
  },
  {
    card_printing_id: '3eb3112f-707f-5af3-b1b7-b4157e0cf74a',
    repair_class: 'replacement_exact_marker_image',
    acquisition: 'external_exact',
    source_provider: 'pricecharting_exact_product_page',
    source_page_url: 'https://www.pricecharting.com/game/pokemon-paradox-rift/zekrom-stamped-66',
    source_page_title: 'Zekrom Stamped 66 Prices | Pokemon Paradox Rift',
    source_image_url: 'https://storage.googleapis.com/images.pricecharting.com/nolxewocui64w7zp/1600.jpg',
    visual_marker_expectation: 'paradox_rift_logo_visible',
    authority_urls: [
      'https://www.pricecharting.com/game/pokemon-paradox-rift/zekrom-stamped-66',
    ],
    amendment_note: 'Replacement image visibly shows the Paradox Rift logo in the illustration and the Cosmos Holo printing.',
  },
  {
    card_printing_id: '6cfa7bda-521f-57b9-82d1-762ef2c7defc',
    repair_class: 'replacement_exact_marker_image',
    acquisition: 'external_exact',
    source_provider: 'pricecharting_exact_product_page',
    source_page_url: 'https://www.pricecharting.com/game/pokemon-promo/torchic-8',
    source_page_title: 'Torchic 8 Prices | Pokemon Promo',
    source_image_url: 'https://storage.googleapis.com/images.pricecharting.com/53715b230d6ef0005c684adf481d2d60f2d9e9511607f6cd1b4176a64cdcfa5f/1600.jpg',
    visual_marker_expectation: 'e_league_logo_visible',
    authority_urls: [
      'https://bulbapedia.bulbagarden.net/wiki/Pok%C3%A9mon_League_Rewards_%28TCG%29',
    ],
    amendment_note: 'Replacement image visibly shows the e-League logo and the reverse-Holo printing.',
  },
  {
    card_printing_id: '3fefb4bd-6a61-5c8c-8f21-b7190d8b3ec0',
    repair_class: 'replacement_exact_marker_image',
    acquisition: 'external_exact',
    source_provider: 'pricecharting_exact_product_page',
    source_page_url: 'https://www.pricecharting.com/game/pokemon-promo/combusken-9',
    source_page_title: 'Combusken 9 Prices | Pokemon Promo',
    source_image_url: 'https://storage.googleapis.com/images.pricecharting.com/n2vyvluw7kz7pqy3/1600.jpg',
    visual_marker_expectation: 'winner_stamp_visible',
    authority_urls: [
      'https://bulbapedia.bulbagarden.net/wiki/Pok%C3%A9mon_League_Rewards_%28TCG%29',
    ],
    amendment_note: 'Replacement image visibly shows the Winner stamp required by the stable printing identity.',
  },
  {
    card_printing_id: 'd18a30ea-47d1-5dfd-98cf-b018a698f41f',
    repair_class: 'replacement_exact_marker_image',
    acquisition: 'external_exact',
    source_provider: 'pricecharting_exact_product_page',
    source_page_url: 'https://www.pricecharting.com/game/pokemon-promo/mudkip-10',
    source_page_title: 'Mudkip 10 Prices | Pokemon Promo',
    source_image_url: 'https://storage.googleapis.com/images.pricecharting.com/5e55b4976306842ed9c327002a43e216c71090505e3ce067b6e2a9529f09a84b/1600.jpg',
    visual_marker_expectation: 'e_league_logo_visible',
    authority_urls: [
      'https://bulbapedia.bulbagarden.net/wiki/Pok%C3%A9mon_League_Rewards_%28TCG%29',
    ],
    amendment_note: 'Replacement image visibly shows the e-League logo and the reverse-Holo printing.',
  },
  {
    card_printing_id: '39dc7fa9-36dc-57f4-bdee-af422fc77af3',
    repair_class: 'authority_nomenclature_correction',
    acquisition: 'external_exact',
    source_provider: 'pricecharting_exact_product_page',
    source_page_url: 'https://www.pricecharting.com/game/pokemon-promo/beldum-22',
    source_page_title: 'Beldum 22 Prices | Pokemon Promo',
    source_image_url: 'https://storage.googleapis.com/images.pricecharting.com/corrhhtwjw22weeijbl5/1600.jpg',
    visual_marker_expectation: 'non_holo_participant_printing_no_winner_stamp',
    authority_urls: [
      'https://bulbapedia.bulbagarden.net/wiki/Pok%C3%A9mon_League_Rewards_%28TCG%29',
    ],
    amendment_note: 'The exact participant printing is Non-Holofoil without a Winner stamp. The stable E-LEAGUE-STAMP GV-ID is retained for compatibility and must not be interpreted as requiring the separate Winner mark.',
  },
  {
    card_printing_id: 'ec573555-d4a4-5e3c-890d-f9e1cb711eb0',
    repair_class: 'authority_nomenclature_correction',
    acquisition: 'external_exact',
    source_provider: 'ebay_exact_listing_photo',
    source_page_url: 'https://www.ebay.com/itm/396915188465',
    source_page_title: 'Chimecho 024 Nintendo Promo Non-Winner',
    source_image_url: 'https://i.ebayimg.com/images/g/HssAAeSwmsloisUg/s-l1600.jpg',
    visual_marker_expectation: 'non_holo_participant_printing_no_winner_stamp',
    authority_urls: [
      'https://bulbapedia.bulbagarden.net/wiki/Pok%C3%A9mon_League_Rewards_%28TCG%29',
    ],
    amendment_note: 'The exact participant printing is Non-Holofoil without a Winner stamp. The stable E-LEAGUE-STAMP GV-ID is retained for compatibility and must not be interpreted as requiring the separate Winner mark.',
  },
  {
    card_printing_id: 'bd8dcb6b-e789-54e4-9839-8df2795f85b8',
    repair_class: 'authority_nomenclature_correction',
    acquisition: 'reuse_current',
    visual_marker_expectation: 'non_holo_participant_printing_no_winner_stamp',
    authority_urls: [
      'https://bulbapedia.bulbagarden.net/wiki/Pok%C3%A9mon_League_Rewards_%28TCG%29',
    ],
    amendment_note: 'The exact participant printing is Non-Holofoil without a Winner stamp. The stable E-LEAGUE-STAMP GV-ID is retained for compatibility and must not be interpreted as requiring the separate Winner mark.',
  },
  {
    card_printing_id: '7f3d5aae-40f8-5663-a55a-3ea785a259b7',
    repair_class: 'normalized_exact_image',
    acquisition: 'storage_normalized',
    corners: [[53, 52], [1153, 29], [1088, 1452], [121, 1436]],
    visual_marker_expectation: 'staff_and_crimson_invasion_marks_visible',
    amendment_note: 'The already reviewed exact listing image is perspective-normalized without generative edits. Both STAFF and Crimson Invasion marks remain visible.',
  },
  {
    card_printing_id: '78372fe9-59bc-535a-acde-2b7a98d1487b',
    repair_class: 'normalized_exact_image',
    acquisition: 'storage_normalized',
    corners: [[192, 36], [851, 38], [846, 961], [198, 961]],
    visual_marker_expectation: 'twilight_masquerade_logo_visible',
    amendment_note: 'The already reviewed exact image is cropped from its padded square canvas without generative edits. The Twilight Masquerade logo remains visible.',
  },
]);

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function proofHash(value) {
  return sha256(stable(value));
}

function parseFlag(argv, name, fallback = null) {
  const prefix = `--${name}=`;
  const inline = argv.find((value) => value.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = argv.indexOf(`--${name}`);
  return index >= 0 ? argv[index + 1] : fallback;
}

function currentCommitSha() {
  return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
}

function assertCleanTrackedTree() {
  const status = execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], { cwd: ROOT, encoding: 'utf8' }).trim();
  if (status) throw new Error('Upload mode requires a clean tracked working tree.');
}

function createSupabase() {
  const url = String(process.env.SUPABASE_URL ?? '').trim();
  const key = String(process.env.SUPABASE_SECRET_KEY ?? '').trim();
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function fetchExternalBuffer(url) {
  const parsed = new URL(url);
  const allowedHosts = new Set(['i.ebayimg.com', 'storage.googleapis.com']);
  if (parsed.protocol !== 'https:' || !allowedHosts.has(parsed.hostname)) {
    throw new Error('Replacement source host is not allowed.');
  }
  const response = await fetch(parsed, {
    redirect: 'follow',
    signal: AbortSignal.timeout(45_000),
    headers: { 'user-agent': 'GrookaiSpecialVariantRepair/1.0', accept: 'image/jpeg,image/png;q=0.9' },
  });
  if (!response.ok || !response.body) throw new Error(`Replacement image HTTP ${response.status}.`);
  const finalUrl = new URL(response.url);
  if (finalUrl.protocol !== 'https:' || !allowedHosts.has(finalUrl.hostname)) {
    throw new Error('Replacement source redirected outside the allowed host.');
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body) {
    const buffer = Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_IMAGE_BYTES) throw new Error('Replacement image exceeds size ceiling.');
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

async function downloadStorage(supabase, bucket, storagePath) {
  const { data, error } = await supabase.storage.from(bucket).download(storagePath);
  if (error) throw new Error(`Storage download failed:${error.message}`);
  return Buffer.from(await data.arrayBuffer());
}

async function normalizeBuffer(buffer, definition) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'grookai-special-variant-repair-v1-'));
  const sourcePath = path.join(tempDir, `${definition.card_printing_id}-source.jpg`);
  const outputPath = path.join(tempDir, `${definition.card_printing_id}-normalized.jpg`);
  try {
    await fs.writeFile(sourcePath, buffer);
    execFileSync('py', [
      '-3',
      NORMALIZER_PATH,
      '--input', sourcePath,
      '--output', outputPath,
      '--corners', JSON.stringify(definition.corners),
    ], { cwd: ROOT, stdio: 'pipe' });
    return await fs.readFile(outputPath);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

async function uploadAndVerify(supabase, row, buffer, apply) {
  if (apply) {
    const { error } = await supabase.storage
      .from(row.storage_bucket)
      .upload(row.storage_path, buffer, {
        contentType: row.source_image.content_type,
        cacheControl: '31536000',
        upsert: false,
      });
    if (error && !/already exists|duplicate/i.test(error.message)) {
      throw new Error(`Storage upload failed:${row.evidence_id}:${error.message}`);
    }
  }
  if (!apply && row.repair.acquisition !== 'reuse_current') {
    return { storage_status: 'not_uploaded_dry_run', storage_readback: null };
  }
  const readback = await downloadStorage(supabase, row.storage_bucket, row.storage_path);
  const observed = observeImage(readback);
  if (observed.sha256 !== row.source_image.sha256
    || observed.size_bytes !== row.source_image.size_bytes
    || observed.width !== row.source_image.width
    || observed.height !== row.source_image.height) {
    throw new Error(`Storage readback mismatch:${row.evidence_id}`);
  }
  return {
    storage_status: row.repair.acquisition === 'reuse_current' ? 'verified_existing' : 'uploaded_and_verified',
    storage_readback: observed,
  };
}

export function validateRepairDefinitions(baseManifest, originalFounder) {
  const failures = [];
  const rowsByPrinting = new Map(baseManifest.rows.map((row) => [row.card_printing_id, row]));
  const decisionsByEvidence = new Map(originalFounder.decisions.map((row) => [row.evidence_id, row]));
  if (REPAIR_DEFINITIONS.length !== EXPECTED_REPAIR_COUNT) failures.push('repair_count_mismatch');
  if (new Set(REPAIR_DEFINITIONS.map((row) => row.card_printing_id)).size !== EXPECTED_REPAIR_COUNT) {
    failures.push('duplicate_repair_card_printing_id');
  }
  for (const definition of REPAIR_DEFINITIONS) {
    const row = rowsByPrinting.get(definition.card_printing_id);
    const decision = row ? decisionsByEvidence.get(row.evidence_id) : null;
    if (!row) failures.push(`unknown_card_printing:${definition.card_printing_id}`);
    if (!decision || decision.founder_decision !== 'rejected') {
      failures.push(`repair_not_bound_to_rejected_founder_row:${definition.card_printing_id}`);
    }
    if (!['reuse_current', 'external_exact', 'external_normalized', 'storage_normalized'].includes(definition.acquisition)) {
      failures.push(`invalid_acquisition:${definition.card_printing_id}`);
    }
    if (definition.acquisition.endsWith('_normalized') && definition.corners?.length !== 4) {
      failures.push(`missing_normalization_corners:${definition.card_printing_id}`);
    }
    if (!definition.authority_urls?.length && definition.repair_class === 'authority_nomenclature_correction') {
      failures.push(`missing_authority_source:${definition.card_printing_id}`);
    }
  }
  return failures;
}

async function buildRepairRow({ baseRow, definition, supabase }) {
  let buffer = null;
  let sourceObservation = baseRow.source_image;
  let sourceProvider = baseRow.source_provider;
  let sourcePageUrl = baseRow.source_page_url;
  let sourcePageTitle = baseRow.source_product_title;
  let sourceImageUrl = baseRow.source_image_url;

  if (definition.acquisition === 'external_normalized' || definition.acquisition === 'external_exact') {
    const external = await fetchExternalBuffer(definition.source_image_url);
    sourceObservation = observeImage(external);
    buffer = definition.acquisition === 'external_normalized'
      ? await normalizeBuffer(external, definition)
      : external;
    sourceProvider = definition.source_provider;
    sourcePageUrl = definition.source_page_url;
    sourcePageTitle = definition.source_page_title;
    sourceImageUrl = definition.source_image_url;
  } else if (definition.acquisition === 'storage_normalized') {
    const source = await downloadStorage(supabase, baseRow.storage_bucket, baseRow.storage_path);
    sourceObservation = observeImage(source);
    if (sourceObservation.sha256 !== baseRow.source_image.sha256) {
      throw new Error(`Original storage evidence drift:${baseRow.evidence_id}`);
    }
    buffer = await normalizeBuffer(source, definition);
    sourceProvider = `${baseRow.source_provider}_normalized`;
  }

  const finalObservation = buffer ? observeImage(buffer) : baseRow.source_image;
  const imageFailures = validateImageObservation(finalObservation);
  if (imageFailures.length) throw new Error(`Invalid repaired image:${baseRow.evidence_id}:${imageFailures.join(',')}`);
  const deterministicallyNormalized = definition.acquisition.endsWith('_normalized');
  if (deterministicallyNormalized
    && (finalObservation.width !== NORMALIZED_WIDTH || finalObservation.height !== NORMALIZED_HEIGHT)) {
    throw new Error(`Normalized dimensions mismatch:${baseRow.evidence_id}`);
  }
  const storagePath = buffer
    ? buildStoragePath({ card_printing_id: baseRow.card_printing_id }, finalObservation)
    : baseRow.storage_path;

  return {
    ...baseRow,
    source_provider: sourceProvider,
    source_page_url: sourcePageUrl,
    source_product_title: sourcePageTitle,
    source_image_url: sourceImageUrl,
    source_image: finalObservation,
    storage_bucket: STORAGE_BUCKET,
    storage_path: storagePath,
    claim_role: 'confirmed_exact_variant_front',
    evidence_strength: 'founder_confirmed_exact_image_amendment',
    review_flags: [
      ...(baseRow.review_flags ?? []),
      'founder_repair_amendment',
      definition.repair_class,
    ],
    self_hosted_verified: true,
    automatic_approval_permitted: false,
    automatic_publication_permitted: false,
    automatic_pricing_mapping_permitted: false,
    repair: {
      amendment_version: VERSION,
      repair_class: definition.repair_class,
      acquisition: definition.acquisition,
      original_evidence_id: baseRow.evidence_id,
      original_source_image_sha256: baseRow.source_image.sha256,
      acquisition_source_sha256: sourceObservation.sha256,
      deterministic_normalization: deterministicallyNormalized,
      normalization_corners: definition.corners ?? null,
      normalized_dimensions: buffer ? { width: NORMALIZED_WIDTH, height: NORMALIZED_HEIGHT } : null,
      visual_marker_expectation: definition.visual_marker_expectation,
      authority_urls: definition.authority_urls ?? [],
      amendment_note: definition.amendment_note,
    },
    _buffer: buffer,
  };
}

function withoutBuffer(row) {
  const { _buffer, ...serializable } = row;
  return serializable;
}

export async function runRepair({ mode }) {
  if (!['dry-run', 'apply'].includes(mode)) throw new Error('mode must be dry-run or apply.');
  const apply = mode === 'apply';
  const commitSha = currentCommitSha();
  if (apply) {
    assertCleanTrackedTree();
    if (process.env.SPECIAL_VARIANT_REPAIR_EXPECTED_SHA !== commitSha) throw new Error('Frozen commit SHA mismatch.');
    if (process.env.SPECIAL_VARIANT_REPAIR_APPROVAL !== APPROVAL_PHRASE) throw new Error('Repair upload approval mismatch.');
  }

  const [baseManifestText, originalFounderText] = await Promise.all([
    fs.readFile(BASE_MANIFEST_PATH, 'utf8'),
    fs.readFile(ORIGINAL_FOUNDER_PATH, 'utf8'),
  ]);
  const baseManifest = JSON.parse(baseManifestText);
  const originalFounder = validateFounderArtifact(baseManifest, JSON.parse(originalFounderText));
  const definitionFailures = validateRepairDefinitions(baseManifest, originalFounder);
  if (definitionFailures.length) throw new Error(`Repair definition failures:${definitionFailures.join(',')}`);

  const baseByPrinting = new Map(baseManifest.rows.map((row) => [row.card_printing_id, row]));
  const originalDecisionByEvidence = new Map(originalFounder.decisions.map((row) => [row.evidence_id, row]));
  const supabase = createSupabase();
  const prepared = [];
  for (const definition of REPAIR_DEFINITIONS) {
    prepared.push(await buildRepairRow({
      baseRow: baseByPrinting.get(definition.card_printing_id),
      definition,
      supabase,
    }));
  }

  const rows = prepared.map(withoutBuffer);
  const packetFingerprint = buildPacketFingerprint(rows);
  const generatedAt = new Date().toISOString();
  const uploadRows = [];
  for (const row of prepared) {
    uploadRows.push({
      evidence_id: row.evidence_id,
      ...(await uploadAndVerify(supabase, row, row._buffer, apply)),
    });
  }
  const uploadedAndVerified = uploadRows.filter((row) => row.storage_status === 'uploaded_and_verified').length;
  const verifiedExisting = uploadRows.filter((row) => row.storage_status === 'verified_existing').length;

  const manifest = {
    version: MANIFEST_VERSION,
    generated_at: generatedAt,
    packet_fingerprint: packetFingerprint,
    original_packet_fingerprint: baseManifest.packet_fingerprint,
    original_founder_artifact_sha256: sha256(originalFounderText),
    storage_bucket: STORAGE_BUCKET,
    self_hosted_only: true,
    server_writes_performed_by_review_portal: false,
    rows,
    summary: {
      total: rows.length,
      replacement_or_normalized_images: rows.filter((row) => row.repair.acquisition !== 'reuse_current').length,
      deterministically_normalized_images: rows.filter((row) => row.repair.deterministic_normalization).length,
      authority_nomenclature_corrections: rows.filter((row) => row.repair.repair_class === 'authority_nomenclature_correction').length,
      self_hosted_verified: apply ? uploadedAndVerified + verifiedExisting : verifiedExisting,
      publication_authorized: 0,
      pricing_authorized: 0,
    },
  };

  const decisions = rows.map((row) => {
    const originalDecision = originalDecisionByEvidence.get(row.evidence_id);
    return {
      evidence_id: row.evidence_id,
      card_printing_id: row.card_printing_id,
      source_image_sha256: row.source_image.sha256,
      first_pass_decision: originalDecision.first_pass_decision,
      first_pass_decided_at: originalDecision.first_pass_decided_at,
      founder_decision: 'confirmed',
      publication_authorized: false,
      pricing_authorized: false,
      notes: row.repair.amendment_note,
      decided_at: generatedAt,
      amendment_from_founder_decision: originalDecision.founder_decision,
      original_source_image_sha256: row.repair.original_source_image_sha256,
      authority_urls: row.repair.authority_urls,
    };
  });
  const founderArtifact = {
    version: FOUNDER_ARTIFACT_VERSION,
    amendment_version: VERSION,
    packet_fingerprint: packetFingerprint,
    original_packet_fingerprint: baseManifest.packet_fingerprint,
    original_founder_artifact_sha256: sha256(originalFounderText),
    source_first_pass_sha256: sha256(originalFounderText),
    source_first_pass_reviewer: 'founder',
    reviewer: 'founder',
    exported_at: generatedAt,
    decision_count: decisions.length,
    remaining_count: 0,
    server_writes_performed: false,
    decisions,
  };
  validateFounderArtifact(manifest, founderArtifact);

  const resultBase = {
    version: VERSION,
    mode,
    generated_at: generatedAt,
    commit_sha: commitSha,
    packet_fingerprint: packetFingerprint,
    selected_rows: rows.length,
    replacement_or_normalized_images: rows.filter((row) => row.repair.acquisition !== 'reuse_current').length,
    deterministically_normalized_images: rows.filter((row) => row.repair.deterministic_normalization).length,
    authority_nomenclature_corrections: rows.filter((row) => row.repair.repair_class === 'authority_nomenclature_correction').length,
    uploaded_and_verified: uploadedAndVerified,
    verified_existing: verifiedExisting,
    storage_readback_matches: uploadRows.filter((row) => row.storage_readback !== null).length,
    database_writes_performed: false,
    publication_authorized: 0,
    pricing_authorized: 0,
    canonical_identity_changed: false,
    upload_rows: uploadRows,
  };
  const result = { ...resultBase, proof_hash: proofHash(resultBase) };

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const planPath = path.join(OUTPUT_DIR, `special_variant_repair_${mode.replace('-', '_')}_plan_v1.json`);
  const resultPath = path.join(OUTPUT_DIR, `special_variant_repair_${mode.replace('-', '_')}_result_v1.json`);
  await Promise.all([
    fs.writeFile(planPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8'),
    fs.writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8'),
  ]);
  if (apply) {
    await Promise.all([
      fs.writeFile(REPAIR_MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8'),
      fs.writeFile(FOUNDER_AMENDMENT_PATH, `${JSON.stringify(founderArtifact, null, 2)}\n`, 'utf8'),
    ]);
    const permanentFiles = [REPAIR_MANIFEST_PATH, FOUNDER_AMENDMENT_PATH, resultPath];
    const hashLines = [];
    for (const file of permanentFiles) {
      hashLines.push(`${sha256(await fs.readFile(file))}  ${path.relative(ROOT, file).replaceAll('\\', '/')}`);
    }
    await fs.writeFile(path.join(OUTPUT_DIR, 'artifact_hashes.sha256'), `${hashLines.join('\n')}\n`, 'utf8');
  }

  return {
    mode,
    commit_sha: commitSha,
    selected_rows: rows.length,
    uploaded_and_verified: uploadedAndVerified,
    verified_existing: verifiedExisting,
    storage_readback_matches: result.storage_readback_matches,
    packet_fingerprint: packetFingerprint,
    artifact: path.relative(ROOT, resultPath),
  };
}

export async function main(argv = process.argv.slice(2)) {
  const result = await runRepair({ mode: parseFlag(argv, 'mode', 'dry-run') });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(`[${VERSION}] ${String(error?.message ?? error)}`);
    process.exitCode = 1;
  });
}
