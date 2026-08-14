import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import zlib from 'node:zlib';
import { pathToFileURL } from 'node:url';

export const MTG_IMAGE_READINESS_VERSION = 'MTG_SELF_HOSTED_IMAGE_READINESS_V1';
export const TARGET_PATH_ROOT = 'warehouse-derived/self-hosted-images-v1/card_prints/mtg';
export const PROPOSED_STORAGE_BUCKET = 'user-card-images';
export const TRUSTED_SCRYFALL_IMAGE_HOST = 'cards.scryfall.io';
export const SOURCE_QUALITY_ORDER = Object.freeze(['png', 'large', 'normal']);

const REQUIRED_PAYLOAD_ROW_KEYS = Object.freeze([
  'card_prints',
  'card_print_identity',
  'external_mappings',
]);

export function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => (
      `${JSON.stringify(key)}:${stableJson(value[key])}`
    )).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function text(value) {
  const normalized = String(value ?? '').trim();
  return normalized || null;
}

function byText(left, right) {
  return String(left ?? '').localeCompare(String(right ?? ''));
}

function increment(record, key, amount = 1) {
  record[key] = (record[key] ?? 0) + amount;
}

function sortedRecord(record) {
  return Object.fromEntries(Object.entries(record).sort(([left], [right]) => byText(left, right)));
}

export function faceRoleForIndex(faceIndex) {
  if (!Number.isInteger(faceIndex) || faceIndex < 0) {
    throw new Error(`Invalid face index: ${faceIndex}`);
  }
  if (faceIndex === 0) return 'front';
  if (faceIndex === 1) return 'back';
  return `additional_${faceIndex}`;
}

function expectedScryfallFaceSegment(faceIndex) {
  return faceIndex === 0 ? 'front' : 'back';
}

function expectedExtension(quality) {
  return quality === 'png' ? 'png' : 'jpg';
}

export function inspectScryfallImageUrl(rawUrl, { scryfallPrintId, faceIndex, quality }) {
  const findings = [];
  const expectedFace = expectedScryfallFaceSegment(faceIndex);
  const expectedExt = expectedExtension(quality);
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return {
      valid: false,
      trusted: false,
      normalized_url: null,
      findings: ['invalid_url'],
    };
  }

  if (parsed.protocol !== 'https:') findings.push('non_https_url');
  if (parsed.hostname.toLowerCase() !== TRUSTED_SCRYFALL_IMAGE_HOST) {
    findings.push('untrusted_host');
  }
  if (parsed.username || parsed.password) findings.push('url_contains_credentials');
  if (parsed.hash) findings.push('url_contains_fragment');

  const segments = parsed.pathname.split('/').filter(Boolean);
  const expectedSegments = [quality, expectedFace];
  if (segments.length !== 5
    || segments[0] !== expectedSegments[0]
    || segments[1] !== expectedSegments[1]) {
    findings.push('unexpected_scryfall_path');
  }
  const filename = segments[4] ?? '';
  const expectedFilename = `${scryfallPrintId}.${expectedExt}`;
  if (filename.toLowerCase() !== expectedFilename.toLowerCase()) {
    findings.push('scryfall_print_identity_mismatch');
  }
  if (!/^[0-9a-f]$/i.test(segments[2] ?? '')
    || !/^[0-9a-f]$/i.test(segments[3] ?? '')) {
    findings.push('unexpected_scryfall_shard');
  }

  const trusted = parsed.protocol === 'https:'
    && parsed.hostname.toLowerCase() === TRUSTED_SCRYFALL_IMAGE_HOST
    && !parsed.username
    && !parsed.password;
  return {
    valid: findings.length === 0,
    trusted,
    normalized_url: parsed.toString(),
    findings,
  };
}

function assertSafePathSegment(value, label) {
  if (!/^[a-z0-9][a-z0-9._-]*$/i.test(value)) {
    throw new Error(`Unsafe ${label}: ${value}`);
  }
}

export function proposeSelfHostedPath({
  setCode,
  scryfallPrintId,
  faceIndex,
  selectedSourceUrl,
  selectedQuality,
}) {
  assertSafePathSegment(setCode, 'set code');
  assertSafePathSegment(scryfallPrintId, 'Scryfall print ID');
  const faceRole = faceRoleForIndex(faceIndex);
  const extension = expectedExtension(selectedQuality);
  const sourceIdentityHash = sha256(selectedSourceUrl).slice(0, 24);
  return `${TARGET_PATH_ROOT}/${setCode.toLowerCase()}/${scryfallPrintId.toLowerCase()}`
    + `/${faceRole}/${sourceIdentityHash}.${extension}`;
}

function issue({ code, severity = 'blocking', batch, parent, mapping, faceIndex = null, detail = null }) {
  return {
    code,
    severity,
    set_code: batch.code,
    card_print_id: parent?.id ?? mapping?.card_print_id ?? null,
    scryfall_print_id: mapping?.external_id ?? null,
    face_index: faceIndex,
    detail,
  };
}

export function planImageMapping({ batch, payload, mapping }) {
  const issues = [];
  const parents = new Map(payload.rows.card_prints.map((row) => [row.id, row]));
  const identities = new Map(
    payload.rows.card_print_identity.map((row) => [row.card_print_id, row]),
  );
  const parent = parents.get(mapping.card_print_id) ?? null;
  const identity = identities.get(mapping.card_print_id) ?? null;

  if (!parent) issues.push(issue({ code: 'missing_card_print', batch, mapping }));
  if (!identity) issues.push(issue({ code: 'missing_card_print_identity', batch, mapping, parent }));
  if (mapping.source !== 'scryfall') {
    issues.push(issue({ code: 'unexpected_mapping_source', batch, mapping, parent }));
  }
  if (parent?.external_ids?.scryfall !== mapping.external_id
    || identity?.identity_payload?.scryfall_print_id !== mapping.external_id) {
    issues.push(issue({
      code: 'scryfall_identity_mismatch',
      batch,
      mapping,
      parent,
      detail: {
        parent_scryfall_id: parent?.external_ids?.scryfall ?? null,
        identity_scryfall_id: identity?.identity_payload?.scryfall_print_id ?? null,
      },
    }));
  }

  const sourceImages = Array.isArray(mapping.meta?.source_images)
    ? [...mapping.meta.source_images]
    : [];
  if (!sourceImages.length) {
    return {
      parent,
      assets: [],
      gaps: [{
        gap_code: 'missing_source_images',
        set_code: batch.code,
        set_name: batch.name,
        card_print_id: mapping.card_print_id,
        gv_id: parent?.gv_id ?? null,
        card_name: parent?.name ?? null,
        collector_number: parent?.number ?? null,
        scryfall_print_id: mapping.external_id,
      }],
      issues,
    };
  }

  sourceImages.sort((left, right) => left.face_index - right.face_index);
  const seenFaceIndices = new Set();
  const assets = [];
  const gaps = [];
  for (const sourceImage of sourceImages) {
    const faceIndex = sourceImage.face_index;
    if (!Number.isInteger(faceIndex) || faceIndex < 0 || seenFaceIndices.has(faceIndex)) {
      issues.push(issue({
        code: seenFaceIndices.has(faceIndex) ? 'duplicate_face_index' : 'invalid_face_index',
        batch,
        mapping,
        parent,
        faceIndex,
      }));
      continue;
    }
    seenFaceIndices.add(faceIndex);

    const sourceUrls = {};
    const diagnostics = [];
    for (const quality of SOURCE_QUALITY_ORDER) {
      const rawUrl = text(sourceImage[quality]);
      if (!rawUrl) {
        diagnostics.push({ quality, valid: false, trusted: false, findings: ['missing_url'] });
        issues.push(issue({
          code: 'missing_source_url',
          batch,
          mapping,
          parent,
          faceIndex,
          detail: { quality },
        }));
        continue;
      }
      const inspected = inspectScryfallImageUrl(rawUrl, {
        scryfallPrintId: mapping.external_id,
        faceIndex,
        quality,
      });
      sourceUrls[quality] = inspected.normalized_url ?? rawUrl;
      diagnostics.push({ quality, ...inspected });
      for (const finding of inspected.findings) {
        issues.push(issue({
          code: finding,
          batch,
          mapping,
          parent,
          faceIndex,
          detail: { quality, url: rawUrl },
        }));
      }
    }

    const selected = diagnostics.find((row) => row.valid && row.trusted);
    if (!selected) {
      gaps.push({
        gap_code: 'no_trusted_valid_source_url',
        set_code: batch.code,
        set_name: batch.name,
        card_print_id: mapping.card_print_id,
        gv_id: parent?.gv_id ?? null,
        card_name: parent?.name ?? null,
        collector_number: parent?.number ?? null,
        scryfall_print_id: mapping.external_id,
        face_index: faceIndex,
        face_role: faceRoleForIndex(faceIndex),
      });
      continue;
    }

    const selectedSourceUrl = selected.normalized_url;
    assets.push({
      plan_version: MTG_IMAGE_READINESS_VERSION,
      set_ordinal: batch.ordinal,
      set_code: batch.code,
      set_name: batch.name,
      card_print_id: mapping.card_print_id,
      gv_id: parent?.gv_id ?? null,
      card_name: parent?.name ?? null,
      collector_number: parent?.number ?? null,
      scryfall_print_id: mapping.external_id,
      scryfall_oracle_id: mapping.meta?.oracle_id ?? null,
      face_index: faceIndex,
      face_role: faceRoleForIndex(faceIndex),
      source_urls: sourceUrls,
      selected_source_quality: selected.quality,
      selected_source_url: selectedSourceUrl,
      selected_source_url_sha256: sha256(selectedSourceUrl),
      proposed_storage_bucket: PROPOSED_STORAGE_BUCKET,
      proposed_storage_path: proposeSelfHostedPath({
        setCode: batch.code,
        scryfallPrintId: mapping.external_id,
        faceIndex,
        selectedSourceUrl,
        selectedQuality: selected.quality,
      }),
      source_identity_status: 'exact_scryfall_print',
      source_url_validation: diagnostics.every((row) => row.valid && row.trusted)
        ? 'all_candidates_trusted_and_valid'
        : 'selected_candidate_trusted_and_valid',
      content_hash_sha256: null,
      content_hash_status: 'not_downloaded',
      content_dedupe_status: 'deferred_until_download_and_exact_readback',
      cross_print_dedupe_allowed: false,
      database_access_performed: false,
      storage_access_performed: false,
      network_access_performed: false,
    });
  }

  return { parent, assets, gaps, issues };
}

export function findPathCollisions(assets) {
  const owners = new Map();
  const collisions = [];
  for (const asset of assets) {
    const owner = `${asset.card_print_id}:${asset.scryfall_print_id}:${asset.face_index}`;
    const previous = owners.get(asset.proposed_storage_path);
    if (previous && previous.owner !== owner) {
      collisions.push({
        collision_code: 'proposed_path_collision',
        proposed_storage_path: asset.proposed_storage_path,
        first_owner: previous.owner,
        second_owner: owner,
      });
    } else if (!previous) {
      owners.set(asset.proposed_storage_path, { owner });
    }
  }
  return collisions;
}

function parseArgs(argv) {
  const args = {};
  for (const argument of argv) {
    if (argument === '--help') return { help: true };
    const match = /^--([a-z-]+)=(.+)$/.exec(argument);
    if (!match || !['manifest', 'payload-dir', 'out-dir'].includes(match[1])) {
      throw new Error(`Unsupported argument: ${argument}`);
    }
    args[match[1]] = match[2];
  }
  for (const required of ['manifest', 'payload-dir', 'out-dir']) {
    if (!text(args[required])) throw new Error(`Missing required --${required}=PATH`);
  }
  return {
    manifestPath: path.resolve(args.manifest),
    payloadDir: path.resolve(args['payload-dir']),
    outDir: path.resolve(args['out-dir']),
  };
}

function usage() {
  return [
    'Usage:',
    '  node scripts/audits/mtg_self_hosted_image_readiness_v1.mjs',
    '    --manifest=PATH --payload-dir=PATH --out-dir=PATH',
    '',
    'Offline only: performs no network, database, or Storage access.',
  ].join('\n');
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function rowsToJsonl(rows) {
  return rows.map((row) => stableJson(row)).join('\n') + (rows.length ? '\n' : '');
}

async function writeJsonl(filePath, rows) {
  const body = rowsToJsonl(rows);
  await fs.writeFile(filePath, body, 'utf8');
  return { row_count: rows.length, logical_sha256: sha256(body) };
}

async function writeGzipJsonl(filePath, rows) {
  const body = rowsToJsonl(rows);
  const compressed = zlib.gzipSync(Buffer.from(body, 'utf8'), { level: 9, mtime: 0 });
  await fs.writeFile(filePath, compressed);
  return {
    row_count: rows.length,
    logical_sha256: sha256(body),
    compressed_sha256: sha256(compressed),
    uncompressed_bytes: Buffer.byteLength(body),
    compressed_bytes: compressed.length,
  };
}

async function fileHash(filePath) {
  return sha256(await fs.readFile(filePath));
}

function buildSetCoverage({ batch, parentCount, assets, gaps, issues }) {
  const cardsWithImages = new Set(assets.map((row) => row.card_print_id));
  const cardsWithGaps = new Set(gaps.map((row) => row.card_print_id));
  const facesByRole = {};
  for (const asset of assets) increment(facesByRole, asset.face_role);
  return {
    ordinal: batch.ordinal,
    source_set_id: batch.source_set_id,
    set_code: batch.code,
    set_name: batch.name,
    set_type: batch.set_type,
    released_at: batch.released_at,
    card_print_count: parentCount,
    cards_with_planned_images: cardsWithImages.size,
    cards_with_image_gaps: cardsWithGaps.size,
    planned_face_count: assets.length,
    faces_by_role: sortedRecord(facesByRole),
    issue_count: issues.length,
    card_coverage_ratio: parentCount ? cardsWithImages.size / parentCount : 1,
  };
}

function reportMarkdown(summary) {
  const topGaps = Object.entries(summary.gaps.by_code)
    .map(([key, count]) => `| ${key} | ${count} |`)
    .join('\n') || '| none | 0 |';
  const faceRows = Object.entries(summary.coverage.faces_by_role)
    .map(([key, count]) => `| ${key} | ${count} |`)
    .join('\n') || '| none | 0 |';
  return `# MTG Self-Hosted Image Readiness V1

Status: **${summary.status}**

## Scope

- Frozen manifest sets: ${summary.inputs.manifest_set_count}
- Exact MTG card prints inventoried: ${summary.coverage.card_prints}
- Card prints with at least one planned image: ${summary.coverage.cards_with_planned_images}
- Card prints with image gaps: ${summary.coverage.cards_with_image_gaps}
- Planned face assets: ${summary.coverage.planned_face_assets}
- Proposed Storage bucket: \`${summary.target.storage_bucket}\`
- Proposed path collisions: ${summary.collisions.proposed_path_collisions}
- Blocking input/URL issues: ${summary.issues.blocking}
- Network requests: 0
- Database reads/writes: 0 / 0
- Storage reads/writes: 0 / 0

## Faces

| Face role | Count |
| --- | ---: |
${faceRows}

## Gaps

| Gap | Count |
| --- | ---: |
${topGaps}

## Identity And Dedupe Policy

Every planned asset preserves both the Grookai \`card_print_id\` and exact Scryfall print ID.
Front, back, and future additional faces have independent rows and paths. Distinct print IDs are
never deduplicated from source URLs or filenames. Content-hash deduplication is explicitly deferred
until a later download, image inspection, hash, and exact readback gate.

## Proposed Path Contract

\`${TARGET_PATH_ROOT}/{set_code}/{scryfall_print_id}/{face_role}/{source_url_hash_24}.{ext}\`

These paths are proposals only. No object was uploaded and no database pointer was changed.

The bucket is compatible with \`CANON_IMAGE_RESOLUTION_CONTRACT_V1\` and the existing
self-hosted image tooling, which uses \`SELF_HOSTED_IMAGES_STORAGE_BUCKET\` with
\`user-card-images\` as its canonical default.

## Source Format Economics Gate

PNG remains the preferred source in this offline inventory because the current order is frozen as
\`png > large > normal\`. A bounded download canary must measure bytes, dimensions, visual quality,
decode behavior, and projected Storage/egress cost for PNG versus large JPEG before any permanent
acquisition plan. This readiness result is not evidence that PNG is the economical permanent format.

## Artifacts

- \`summary.json\`: complete aggregate result and plan fingerprint.
- \`image_assets.jsonl.gz\`: deterministic one-row-per-face plan (gzip-compressed JSONL).
- \`set_coverage.jsonl\`: coverage by set and face role.
- \`image_gaps.jsonl\`: cards/faces without a trusted usable source.
- \`url_and_identity_issues.jsonl\`: invalid, untrusted, or inconsistent source evidence.
- \`path_collisions.jsonl\`: proposed target collisions.
- \`payload_inventory.jsonl\`: exact payload hash verification.
- \`artifact_hashes.json\`: SHA-256 manifest for all generated artifacts.
`;
}

export async function buildFullOfflinePlan({ manifestPath, payloadDir, outDir }) {
  const manifestBytes = await fs.readFile(manifestPath);
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  if (manifest.version !== 'MTG_CANONICAL_CATALOG_BATCH_MANIFEST_V1'
    || manifest.status !== 'full_catalog_batches_frozen'
    || !Array.isArray(manifest.batches)) {
    throw new Error('Manifest is not the frozen MTG catalog batch manifest.');
  }

  const batches = [...manifest.batches].sort((left, right) => left.ordinal - right.ordinal);
  const expectedFiles = new Set(batches.map((batch) => path.basename(batch.payload_file)));
  const observedFiles = (await fs.readdir(payloadDir))
    .filter((name) => name.toLowerCase().endsWith('.json'))
    .sort(byText);
  const unexpectedFiles = observedFiles.filter((name) => !expectedFiles.has(name));
  const missingFiles = [...expectedFiles].filter((name) => !observedFiles.includes(name));
  if (unexpectedFiles.length || missingFiles.length) {
    throw new Error(`Payload directory drift: missing=${missingFiles.length}, unexpected=${unexpectedFiles.length}`);
  }

  const assets = [];
  const gaps = [];
  const issues = [];
  const setCoverage = [];
  const payloadInventory = [];
  const allCardPrintIds = new Set();
  const allScryfallPrintIds = new Set();

  for (const batch of batches) {
    const payloadFile = path.join(payloadDir, path.basename(batch.payload_file));
    const payloadBytes = await fs.readFile(payloadFile);
    const observedHash = sha256(payloadBytes);
    const payload = JSON.parse(payloadBytes.toString('utf8'));
    const payloadFindings = [];
    if (observedHash !== batch.payload_file_sha256) payloadFindings.push('payload_file_hash_mismatch');
    if (payload.writer_payload_fingerprint !== batch.writer_payload_fingerprint) {
      payloadFindings.push('writer_payload_fingerprint_mismatch');
    }
    for (const key of REQUIRED_PAYLOAD_ROW_KEYS) {
      if (!Array.isArray(payload.rows?.[key])) payloadFindings.push(`missing_rows_${key}`);
    }
    if (payload.selected_set?.source_set_id !== batch.source_set_id
      || payload.selected_set?.code !== batch.code) {
      payloadFindings.push('selected_set_mismatch');
    }
    payloadInventory.push({
      ordinal: batch.ordinal,
      set_code: batch.code,
      source_set_id: batch.source_set_id,
      payload_file: path.basename(payloadFile),
      expected_sha256: batch.payload_file_sha256,
      observed_sha256: observedHash,
      hash_verified: observedHash === batch.payload_file_sha256,
      writer_payload_fingerprint: payload.writer_payload_fingerprint ?? null,
      findings: payloadFindings,
    });
    if (payloadFindings.length) {
      throw new Error(`${batch.code}: payload integrity failed: ${payloadFindings.join(',')}`);
    }

    const batchAssets = [];
    const batchGaps = [];
    const batchIssues = [];
    for (const mapping of [...payload.rows.external_mappings].sort((left, right) => (
      byText(left.card_print_id, right.card_print_id)
    ))) {
      if (allCardPrintIds.has(mapping.card_print_id)) {
        batchIssues.push(issue({ code: 'duplicate_card_print_id', batch, mapping }));
      }
      if (allScryfallPrintIds.has(mapping.external_id)) {
        batchIssues.push(issue({ code: 'duplicate_scryfall_print_id', batch, mapping }));
      }
      allCardPrintIds.add(mapping.card_print_id);
      allScryfallPrintIds.add(mapping.external_id);
      const planned = planImageMapping({ batch, payload, mapping });
      batchAssets.push(...planned.assets);
      batchGaps.push(...planned.gaps);
      batchIssues.push(...planned.issues);
    }
    if (payload.rows.external_mappings.length !== payload.rows.card_prints.length) {
      batchIssues.push({
        code: 'card_print_mapping_count_mismatch',
        severity: 'blocking',
        set_code: batch.code,
        card_print_count: payload.rows.card_prints.length,
        mapping_count: payload.rows.external_mappings.length,
      });
    }
    assets.push(...batchAssets);
    gaps.push(...batchGaps);
    issues.push(...batchIssues);
    setCoverage.push(buildSetCoverage({
      batch,
      parentCount: payload.rows.card_prints.length,
      assets: batchAssets,
      gaps: batchGaps,
      issues: batchIssues,
    }));
  }

  const collisions = findPathCollisions(assets);
  const facesByRole = {};
  for (const asset of assets) increment(facesByRole, asset.face_role);
  const gapsByCode = {};
  for (const gap of gaps) increment(gapsByCode, gap.gap_code);
  const issuesByCode = {};
  for (const row of issues) increment(issuesByCode, row.code);
  const cardsWithImages = new Set(assets.map((row) => row.card_print_id));
  const cardsWithGaps = new Set(gaps.map((row) => row.card_print_id));

  await fs.mkdir(outDir, { recursive: true });
  const assetDescriptor = await writeGzipJsonl(path.join(outDir, 'image_assets.jsonl.gz'), assets);
  const coverageDescriptor = await writeJsonl(path.join(outDir, 'set_coverage.jsonl'), setCoverage);
  const gapDescriptor = await writeJsonl(path.join(outDir, 'image_gaps.jsonl'), gaps);
  const issueDescriptor = await writeJsonl(path.join(outDir, 'url_and_identity_issues.jsonl'), issues);
  const collisionDescriptor = await writeJsonl(path.join(outDir, 'path_collisions.jsonl'), collisions);
  const inventoryDescriptor = await writeJsonl(
    path.join(outDir, 'payload_inventory.jsonl'),
    payloadInventory,
  );

  const blockingIssues = issues.filter((row) => row.severity === 'blocking').length;
  const planFingerprint = sha256(stableJson({
    version: MTG_IMAGE_READINESS_VERSION,
    manifest_sha256: sha256(manifestBytes),
    payload_inventory_logical_sha256: inventoryDescriptor.logical_sha256,
    image_assets_logical_sha256: assetDescriptor.logical_sha256,
    set_coverage_logical_sha256: coverageDescriptor.logical_sha256,
    image_gaps_logical_sha256: gapDescriptor.logical_sha256,
    issues_logical_sha256: issueDescriptor.logical_sha256,
    collisions_logical_sha256: collisionDescriptor.logical_sha256,
  }));
  const status = blockingIssues || collisions.length
    ? 'blocked_by_input_or_path_findings'
    : 'offline_readiness_plan_complete';
  const summary = {
    version: MTG_IMAGE_READINESS_VERSION,
    status,
    source_recorded_at: manifest.recorded_at ?? null,
    plan_fingerprint_sha256: planFingerprint,
    inputs: {
      manifest_path: manifestPath,
      manifest_sha256: sha256(manifestBytes),
      manifest_set_count: batches.length,
      payload_directory: payloadDir,
      payload_file_count: payloadInventory.length,
      payload_inventory_logical_sha256: inventoryDescriptor.logical_sha256,
    },
    target: {
      storage_bucket: PROPOSED_STORAGE_BUCKET,
      path_root: TARGET_PATH_ROOT,
      compatibility_contract: 'CANON_IMAGE_RESOLUTION_CONTRACT_V1',
      existing_tooling_environment_key: 'SELF_HOSTED_IMAGES_STORAGE_BUCKET',
    },
    coverage: {
      card_prints: allCardPrintIds.size,
      cards_with_planned_images: cardsWithImages.size,
      cards_with_image_gaps: cardsWithGaps.size,
      planned_face_assets: assets.length,
      faces_by_role: sortedRecord(facesByRole),
      sets: setCoverage.length,
      card_coverage_ratio: allCardPrintIds.size
        ? cardsWithImages.size / allCardPrintIds.size
        : 1,
    },
    gaps: { total: gaps.length, by_code: sortedRecord(gapsByCode) },
    issues: { total: issues.length, blocking: blockingIssues, by_code: sortedRecord(issuesByCode) },
    collisions: { proposed_path_collisions: collisions.length },
    datasets: {
      image_assets: assetDescriptor,
      set_coverage: coverageDescriptor,
      image_gaps: gapDescriptor,
      url_and_identity_issues: issueDescriptor,
      path_collisions: collisionDescriptor,
      payload_inventory: inventoryDescriptor,
    },
    dedupe_policy: {
      source_url_dedupe_performed: false,
      cross_print_dedupe_allowed: false,
      content_hash_dedupe_performed: false,
      next_gate: 'download_inspect_hash_exact_readback_then_review_content_hash_equivalence',
    },
    source_format_policy: {
      current_preference_order: SOURCE_QUALITY_ORDER,
      preference_frozen_without_economic_claim: true,
      permanent_acquisition_requires_bounded_png_vs_large_jpeg_canary: true,
    },
    execution_boundaries: {
      network_reads: 0,
      network_writes: 0,
      database_reads: 0,
      database_writes: 0,
      storage_reads: 0,
      storage_writes: 0,
      image_pointer_updates: 0,
      pricing_writes: 0,
      release_control_writes: 0,
    },
  };
  await writeJson(path.join(outDir, 'summary.json'), summary);
  await fs.writeFile(path.join(outDir, 'REPORT.md'), reportMarkdown(summary), 'utf8');

  const artifactNames = [
    'summary.json',
    'image_assets.jsonl.gz',
    'set_coverage.jsonl',
    'image_gaps.jsonl',
    'url_and_identity_issues.jsonl',
    'path_collisions.jsonl',
    'payload_inventory.jsonl',
    'REPORT.md',
  ];
  const artifactHashes = {
    version: MTG_IMAGE_READINESS_VERSION,
    plan_fingerprint_sha256: planFingerprint,
    files: [],
  };
  for (const name of artifactNames) {
    const filePath = path.join(outDir, name);
    const stat = await fs.stat(filePath);
    artifactHashes.files.push({ name, size_bytes: stat.size, sha256: await fileHash(filePath) });
  }
  await writeJson(path.join(outDir, 'artifact_hashes.json'), artifactHashes);

  if (status !== 'offline_readiness_plan_complete') {
    throw new Error(`MTG image readiness blocked: issues=${blockingIssues}, collisions=${collisions.length}`);
  }
  return summary;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }
  const summary = await buildFullOfflinePlan(args);
  process.stdout.write(`${JSON.stringify({
    status: summary.status,
    plan_fingerprint_sha256: summary.plan_fingerprint_sha256,
    card_prints: summary.coverage.card_prints,
    planned_face_assets: summary.coverage.planned_face_assets,
    image_gaps: summary.gaps.total,
    output_dir: args.outDir,
  }, null, 2)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
