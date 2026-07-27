import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

import {
  readVerifiedArtifact,
} from './artifact_rows_v1.mjs';
import {
  buildArtifact,
  contentFingerprint,
  sha256,
  writeJsonArtifact,
} from './deterministic_artifact_v1.mjs';

export const PRESERVED_EVIDENCE_PACKAGE_VERSION =
  'JPN-MASTER-INDEX-PRESERVED-EVIDENCE-PACKAGE-V1';

const DEFAULT_CARDS_ROOT =
  'docs/audits/japanese_master_index_v4/cards';
const DEFAULT_BASELINE_MANIFEST =
  'docs/audits/japanese_master_index_v4/baseline/'
  + 'live_jpn_row_baseline_manifest_v1.json';

const SOURCE_LANES = Object.freeze([
  {
    laneId: 'artofpkm_jp_cards',
    artifactPrefix: 'artofpkm_jp_card',
  },
  {
    laneId: 'limitless_jp_cards',
    artifactPrefix: 'limitless_jp_card',
  },
  {
    laneId: 'official_jp_cards',
    artifactPrefix: 'official_jp_card',
  },
  {
    laneId: 'serebii_jp_cards',
    artifactPrefix: 'serebii_jp_card',
  },
  {
    laneId: 'tcgdex_ja_cards',
    artifactPrefix: 'tcgdex_ja_card',
  },
  {
    laneId: 'bulbapedia_jp_card_lists',
    artifactPrefix: 'bulbapedia_jp_card',
  },
  {
    laneId: 'pokeguardian_release_reports',
    artifactPrefix: 'pokeguardian_jp_card',
  },
]);

function parseArgs(argv) {
  const options = {
    cardsRoot: DEFAULT_CARDS_ROOT,
    baselineManifest: DEFAULT_BASELINE_MANIFEST,
    generatedAt: null,
    cleanSource: false,
    baselineOnly: false,
  };
  for (const arg of argv) {
    if (arg === '--clean-source') {
      options.cleanSource = true;
    } else if (arg === '--baseline-only') {
      options.baselineOnly = true;
    } else if (arg.startsWith('--cards-root=')) {
      options.cardsRoot = arg.slice('--cards-root='.length);
    } else if (arg.startsWith('--baseline-manifest=')) {
      options.baselineManifest = arg.slice('--baseline-manifest='.length);
    } else if (arg.startsWith('--generated-at=')) {
      options.generatedAt = arg.slice('--generated-at='.length);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (!options.generatedAt) {
    throw new Error('--generated-at is required for deterministic packaging');
  }
  return options;
}

function assertInside(parent, child) {
  const relative = path.relative(path.resolve(parent), path.resolve(child));
  if (
    !relative
    || relative.startsWith('..')
    || path.isAbsolute(relative)
  ) {
    throw new Error(`Unsafe package path: ${child}`);
  }
}

function writeTarText(header, offset, length, value) {
  const encoded = Buffer.from(String(value), 'utf8');
  if (encoded.length > length) {
    throw new Error(`Tar field too long: ${value}`);
  }
  encoded.copy(header, offset);
}

function writeTarOctal(header, offset, length, value) {
  const encoded = Math.trunc(value)
    .toString(8)
    .padStart(length - 1, '0');
  writeTarText(header, offset, length, `${encoded}\0`);
}

function splitTarPath(entryPath) {
  const encoded = Buffer.byteLength(entryPath, 'utf8');
  if (encoded <= 100) return { name: entryPath, prefix: '' };
  const parts = entryPath.split('/');
  for (let index = 1; index < parts.length; index += 1) {
    const prefix = parts.slice(0, index).join('/');
    const name = parts.slice(index).join('/');
    if (
      Buffer.byteLength(prefix, 'utf8') <= 155
      && Buffer.byteLength(name, 'utf8') <= 100
    ) {
      return { name, prefix };
    }
  }
  throw new Error(`Raw evidence path exceeds ustar limits: ${entryPath}`);
}

function buildTarHeader(entryPath, size) {
  const header = Buffer.alloc(512, 0);
  const { name, prefix } = splitTarPath(entryPath);
  writeTarText(header, 0, 100, name);
  writeTarOctal(header, 100, 8, 0o644);
  writeTarOctal(header, 108, 8, 0);
  writeTarOctal(header, 116, 8, 0);
  writeTarOctal(header, 124, 12, size);
  writeTarOctal(header, 136, 12, 0);
  header.fill(0x20, 148, 156);
  header[156] = '0'.charCodeAt(0);
  writeTarText(header, 257, 6, 'ustar\0');
  writeTarText(header, 263, 2, '00');
  writeTarText(header, 345, 155, prefix);
  const checksum = header.reduce((sum, value) => sum + value, 0);
  const checksumText = checksum.toString(8).padStart(6, '0');
  writeTarText(header, 148, 8, `${checksumText}\0 `);
  return header;
}

async function listFiles(root) {
  const rows = [];
  async function visit(current) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const absolutePath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await visit(absolutePath);
      } else if (entry.isFile()) {
        rows.push({
          absolutePath,
          entryPath: path.relative(root, absolutePath).replaceAll('\\', '/'),
        });
      }
    }
  }
  await visit(root);
  return rows;
}

async function buildRawArchive(rawRoot, outputPath) {
  const files = await listFiles(rawRoot);
  const chunks = [];
  const entries = [];
  let uncompressedBytes = 0;
  for (const file of files) {
    const body = await fs.readFile(file.absolutePath);
    chunks.push(buildTarHeader(file.entryPath, body.byteLength), body);
    const padding = (512 - (body.byteLength % 512)) % 512;
    if (padding > 0) chunks.push(Buffer.alloc(padding, 0));
    uncompressedBytes += body.byteLength;
    entries.push({
      entry_path: file.entryPath,
      byte_size: body.byteLength,
      sha256: sha256(body),
    });
  }
  chunks.push(Buffer.alloc(1024, 0));
  const tar = Buffer.concat(chunks);
  const archive = zlib.gzipSync(tar, {
    level: zlib.constants.Z_BEST_COMPRESSION,
    mtime: 0,
  });
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, archive);
  return {
    archive_bytes: archive.byteLength,
    archive_sha256: sha256(archive),
    entry_count: entries.length,
    entry_manifest_fingerprint_sha256: contentFingerprint(entries),
    entries,
    raw_bytes: uncompressedBytes,
  };
}

function tarText(header, offset, length) {
  return header
    .subarray(offset, offset + length)
    .toString('utf8')
    .replace(/\0.*$/s, '');
}

function tarOctal(header, offset, length) {
  const value = tarText(header, offset, length).trim();
  return value ? Number.parseInt(value, 8) : 0;
}

async function verifyRawArchive(outputPath, expected) {
  const compressed = await fs.readFile(outputPath);
  if (sha256(compressed) !== expected.archive_sha256) {
    throw new Error(`Raw archive hash mismatch: ${outputPath}`);
  }
  const tar = zlib.gunzipSync(compressed);
  const entries = [];
  let offset = 0;
  while (offset + 512 <= tar.byteLength) {
    const header = tar.subarray(offset, offset + 512);
    if (header.every((value) => value === 0)) break;
    const name = tarText(header, 0, 100);
    const prefix = tarText(header, 345, 155);
    const entryPath = prefix ? `${prefix}/${name}` : name;
    const size = tarOctal(header, 124, 12);
    const bodyStart = offset + 512;
    const body = tar.subarray(bodyStart, bodyStart + size);
    entries.push({
      entry_path: entryPath,
      byte_size: size,
      sha256: sha256(body),
    });
    offset = bodyStart + size + ((512 - (size % 512)) % 512);
  }
  if (
    contentFingerprint(entries)
    !== expected.entry_manifest_fingerprint_sha256
  ) {
    throw new Error(`Raw archive entry proof mismatch: ${outputPath}`);
  }
  return entries;
}

function archiveUri(archivePath, entryPath, repoRoot) {
  const relativeArchive = path
    .relative(repoRoot, archivePath)
    .replaceAll('\\', '/');
  return `tar+gzip://${relativeArchive}#${entryPath}`;
}

function sourceEntryPath(value, laneId) {
  const normalized = String(value ?? '').replaceAll('\\', '/');
  const marker = `/cards/raw/${laneId}/`;
  const markerIndex = normalized.indexOf(marker);
  if (markerIndex >= 0) {
    return normalized.slice(markerIndex + marker.length);
  }
  const relativeMarker = `cards/raw/${laneId}/`;
  const relativeIndex = normalized.indexOf(relativeMarker);
  if (relativeIndex >= 0) {
    return normalized.slice(relativeIndex + relativeMarker.length);
  }
  return null;
}

function rewriteStoredPaths(value, {
  laneId,
  archivePath,
  repoRoot,
  entryMap,
}) {
  if (Array.isArray(value)) {
    return value.map((item) => rewriteStoredPaths(item, {
      laneId,
      archivePath,
      repoRoot,
      entryMap,
    }));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [
        key,
        rewriteStoredPaths(child, {
          laneId,
          archivePath,
          repoRoot,
          entryMap,
        }),
      ]),
    );
  }
  if (typeof value !== 'string') return value;
  const entryPath = sourceEntryPath(value, laneId);
  if (entryPath) {
    if (!entryMap.has(entryPath)) {
      throw new Error(`Raw snapshot absent from archive: ${laneId}/${entryPath}`);
    }
    return archiveUri(archivePath, entryPath, repoRoot);
  }
  const normalized = value.replaceAll('\\', '/');
  const normalizedRepoRoot = repoRoot.replaceAll('\\', '/');
  if (normalized.startsWith(`${normalizedRepoRoot}/`)) {
    return normalized.slice(normalizedRepoRoot.length + 1);
  }
  return value;
}

async function packageSourceLane({
  repoRoot,
  cardsRoot,
  lane,
  cleanSource,
}) {
  const rawRoot = path.join(cardsRoot, 'raw', lane.laneId);
  const archivePath = path.join(
    cardsRoot,
    'raw_archives',
    `${lane.laneId}_raw_evidence_v1.tar.gz`,
  );
  assertInside(cardsRoot, rawRoot);
  assertInside(cardsRoot, archivePath);
  const archive = await buildRawArchive(rawRoot, archivePath);
  const verifiedEntries = await verifyRawArchive(archivePath, archive);
  const entryMap = new Map(
    verifiedEntries.map((entry) => [entry.entry_path, entry]),
  );

  const assertionInputPath = path.join(
    cardsRoot,
    `${lane.artifactPrefix}_assertions_v1.json`,
  );
  const assertionOutputPath = `${assertionInputPath}.gz`;
  const { artifact: assertions } = await readVerifiedArtifact(
    assertionInputPath,
  );
  const rewrittenAssertions = rewriteStoredPaths(assertions.content, {
    laneId: lane.laneId,
    archivePath,
    repoRoot,
    entryMap,
  });
  rewrittenAssertions.summary = {
    ...rewrittenAssertions.summary,
    assertion_fingerprint_sha256:
      contentFingerprint(rewrittenAssertions.assertions ?? []),
  };
  for (const assertion of rewrittenAssertions.assertions ?? []) {
    const prefix =
      `tar+gzip://${path.relative(repoRoot, archivePath).replaceAll('\\', '/')}`
      + '#';
    if (!assertion.raw_snapshot_ref.startsWith(prefix)) {
      throw new Error(`Assertion raw proof not archived: ${assertion.assertion_key}`);
    }
    const entry = entryMap.get(assertion.raw_snapshot_ref.slice(prefix.length));
    if (!entry || entry.sha256 !== assertion.raw_snapshot_sha256) {
      throw new Error(`Assertion raw hash mismatch: ${assertion.assertion_key}`);
    }
  }
  const assertionWrite = await writeJsonArtifact(
    assertionOutputPath,
    buildArtifact({
      packageId: assertions.package_id,
      generatedAt: assertions.generated_at,
      retrieval: assertions.retrieval,
      content: rewrittenAssertions,
    }),
  );

  const healthPath = path.join(
    cardsRoot,
    `${lane.artifactPrefix}_source_health_v1.json`,
  );
  const { artifact: health } = await readVerifiedArtifact(healthPath);
  const healthWrite = await writeJsonArtifact(
    healthPath,
    buildArtifact({
      packageId: health.package_id,
      generatedAt: health.generated_at,
      retrieval: health.retrieval,
      content: rewriteStoredPaths(health.content, {
        laneId: lane.laneId,
        archivePath,
        repoRoot,
        entryMap,
      }),
    }),
  );

  const manifestPath = path.join(
    cardsRoot,
    `${lane.artifactPrefix}_manifest_v1.json`,
  );
  const { artifact: manifest } = await readVerifiedArtifact(manifestPath);
  const manifestContent = rewriteStoredPaths(manifest.content, {
    laneId: lane.laneId,
    archivePath,
    repoRoot,
    entryMap,
  });
  manifestContent.normalized_artifacts = [
    assertionWrite,
    healthWrite,
  ].map((row) => ({
    ...row,
    path: path.relative(repoRoot, row.path).replaceAll('\\', '/'),
  }));
  manifestContent.raw_archive = {
    archive_path: path.relative(repoRoot, archivePath).replaceAll('\\', '/'),
    archive_sha256: archive.archive_sha256,
    archive_bytes: archive.archive_bytes,
    raw_bytes: archive.raw_bytes,
    entry_count: archive.entry_count,
    entry_manifest_fingerprint_sha256:
      archive.entry_manifest_fingerprint_sha256,
    format: 'deterministic_ustar_gzip',
  };
  await writeJsonArtifact(
    manifestPath,
    buildArtifact({
      packageId: manifest.package_id,
      generatedAt: manifest.generated_at,
      retrieval: manifest.retrieval,
      content: manifestContent,
    }),
  );

  if (cleanSource) {
    await fs.rm(rawRoot, { recursive: true });
    await fs.rm(assertionInputPath);
  }
  return {
    source_lane: lane.laneId,
    assertion_path: path
      .relative(repoRoot, assertionOutputPath)
      .replaceAll('\\', '/'),
    assertion_sha256: assertionWrite.sha256,
    assertion_content_fingerprint_sha256:
      assertionWrite.content_fingerprint_sha256,
    manifest_path: path.relative(repoRoot, manifestPath).replaceAll('\\', '/'),
    archive_path: path.relative(repoRoot, archivePath).replaceAll('\\', '/'),
    archive_sha256: archive.archive_sha256,
    archive_bytes: archive.archive_bytes,
    raw_bytes: archive.raw_bytes,
    entry_count: archive.entry_count,
    entry_manifest_fingerprint_sha256:
      archive.entry_manifest_fingerprint_sha256,
    entries: archive.entries,
  };
}

async function compressBaselineRows(repoRoot, manifestPath) {
  const { artifact: manifest } = await readVerifiedArtifact(manifestPath, {
    repoRoot,
    expectedPackageId: 'LIVE-JPN-ROW-BASELINE-MANIFEST-V1',
  });
  const descriptors = [];
  const artifactRecordUpdates = new Map();
  for (const descriptor of manifest.content.datasets) {
    const shardPaths = [];
    for (const shardPath of descriptor.shard_paths) {
      if (shardPath.endsWith('.gz')) {
        const body = await fs.readFile(path.resolve(repoRoot, shardPath));
        const { artifact: shard } = await readVerifiedArtifact(shardPath, {
          repoRoot,
        });
        artifactRecordUpdates.set(shardPath.replace(/\.gz$/u, ''), {
          path: shardPath,
          bytes: body.byteLength,
          sha256: sha256(body),
          content_fingerprint_sha256:
            shard.content_fingerprint_sha256,
        });
        shardPaths.push(shardPath);
        continue;
      }
      const { artifact: shard } = await readVerifiedArtifact(shardPath, {
        repoRoot,
      });
      const compressedPath = `${shardPath}.gz`;
      const write = await writeJsonArtifact(
        path.resolve(repoRoot, compressedPath),
        shard,
      );
      await fs.rm(path.resolve(repoRoot, shardPath));
      artifactRecordUpdates.set(shardPath, {
        ...write,
        path: compressedPath,
      });
      shardPaths.push(compressedPath);
    }
    descriptors.push({
      ...descriptor,
      shard_paths: shardPaths,
    });
  }
  const manifestWrite = await writeJsonArtifact(
    path.resolve(repoRoot, manifestPath),
    buildArtifact({
      packageId: manifest.package_id,
      generatedAt: manifest.generated_at,
      retrieval: manifest.retrieval,
      content: {
        ...manifest.content,
        datasets: descriptors,
      },
    }),
  );
  const baselineRoot = path.dirname(path.resolve(repoRoot, manifestPath));
  const summaryPath = path.join(
    baselineRoot,
    'live_jpn_baseline_summary_v1.md',
  );
  let summary = await fs.readFile(summaryPath, 'utf8');
  const overallManifestPath = path.join(
    baselineRoot,
    'live_jpn_baseline_manifest_v1.json',
  );
  const { artifact: overallManifest } = await readVerifiedArtifact(
    overallManifestPath,
  );
  for (const record of overallManifest.content.artifacts) {
    const replacement = artifactRecordUpdates.get(record.path);
    if (!replacement) continue;
    summary = summary
      .split(`\`${record.path}\` - \`${record.sha256}\``)
      .join(`\`${replacement.path}\` - \`${replacement.sha256}\``);
  }
  await fs.writeFile(summaryPath, summary, 'utf8');
  const summaryBody = await fs.readFile(summaryPath);
  const summaryRecord = {
    path: path.relative(repoRoot, summaryPath).replaceAll('\\', '/'),
    bytes: summaryBody.byteLength,
    sha256: sha256(summaryBody),
    content_fingerprint_sha256: null,
  };
  const rowManifestRecord = {
    ...manifestWrite,
    path: manifestPath.replaceAll('\\', '/'),
  };
  const overallArtifacts = overallManifest.content.artifacts.map((record) => {
    if (record.path === rowManifestRecord.path) return rowManifestRecord;
    if (record.path === summaryRecord.path) return summaryRecord;
    return artifactRecordUpdates.get(record.path) ?? record;
  });
  await writeJsonArtifact(
    overallManifestPath,
    buildArtifact({
      packageId: overallManifest.package_id,
      generatedAt: overallManifest.generated_at,
      retrieval: overallManifest.retrieval,
      content: {
        ...overallManifest.content,
        artifacts: overallArtifacts,
      },
    }),
  );
  return {
    manifest_path: manifestPath.replaceAll('\\', '/'),
    dataset_count: descriptors.length,
    shard_count: descriptors.reduce(
      (sum, descriptor) => sum + descriptor.shard_count,
      0,
    ),
  };
}

export async function packagePreservedEvidence(options) {
  const repoRoot = process.cwd();
  if (options.baselineOnly) {
    return {
      status: 'packaged_baseline_rows_no_write',
      baseline: await compressBaselineRows(
        repoRoot,
        options.baselineManifest,
      ),
      boundary: {
        local_artifact_writes: true,
        source_fetches: false,
        database_access: false,
        database_writes: false,
        storage_writes: false,
      },
    };
  }
  const cardsRoot = path.resolve(repoRoot, options.cardsRoot);
  assertInside(repoRoot, cardsRoot);
  const sourceLanes = [];
  for (const lane of SOURCE_LANES) {
    sourceLanes.push(await packageSourceLane({
      repoRoot,
      cardsRoot,
      lane,
      cleanSource: options.cleanSource,
    }));
  }
  if (options.cleanSource) {
    const rawParent = path.join(cardsRoot, 'raw');
    const remaining = await fs.readdir(rawParent);
    if (remaining.length === 0) await fs.rmdir(rawParent);
  }
  const baseline = await compressBaselineRows(
    repoRoot,
    options.baselineManifest,
  );
  const ledgerPath = path.join(
    cardsRoot,
    'raw_evidence_preservation_ledger_v1.json.gz',
  );
  const ledger = buildArtifact({
    packageId: PRESERVED_EVIDENCE_PACKAGE_VERSION,
    generatedAt: options.generatedAt,
    retrieval: {
      mode: 'local_evidence_packaging',
      database_access: false,
      network_access: false,
      db_writes: false,
      storage_writes: false,
    },
    content: {
      format: 'deterministic_ustar_gzip',
      source_lane_count: sourceLanes.length,
      raw_entry_count: sourceLanes.reduce(
        (sum, lane) => sum + lane.entry_count,
        0,
      ),
      raw_bytes: sourceLanes.reduce(
        (sum, lane) => sum + lane.raw_bytes,
        0,
      ),
      archive_bytes: sourceLanes.reduce(
        (sum, lane) => sum + lane.archive_bytes,
        0,
      ),
      source_lanes: sourceLanes,
      baseline,
      boundary: {
        local_artifact_writes: true,
        source_fetches: false,
        database_access: false,
        database_writes: false,
        storage_writes: false,
        pricing_writes: false,
        identity_writes: false,
        family_promotion_writes: false,
      },
    },
  });
  const write = await writeJsonArtifact(ledgerPath, ledger);
  return {
    status: 'packaged_preserved_evidence_no_write',
    ledger_path: path.relative(repoRoot, ledgerPath).replaceAll('\\', '/'),
    ledger_sha256: write.sha256,
    content_fingerprint_sha256: write.content_fingerprint_sha256,
    source_lane_count: sourceLanes.length,
    raw_entry_count: ledger.content.raw_entry_count,
    raw_bytes: ledger.content.raw_bytes,
    archive_bytes: ledger.content.archive_bytes,
    baseline,
    boundary: ledger.content.boundary,
  };
}

const isMain = process.argv[1]
  && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  const result = await packagePreservedEvidence(parseArgs(process.argv.slice(2)));
  console.log(JSON.stringify(result, null, 2));
}
