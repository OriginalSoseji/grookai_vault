import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

import {
  buildArtifact,
  contentFingerprint,
  sha256,
  stableJson,
  writeJsonArtifact,
} from './deterministic_artifact_v1.mjs';

export const NORMALIZE_RELEASE_PATHS_VERSION =
  'JPN-MASTER-INDEX-NORMALIZE-RELEASE-PATHS-V1';

const AUDIT_ROOT = 'docs/audits/japanese_master_index_v4';
const CARDS_ROOT = `${AUDIT_ROOT}/cards`;
const SETS_ROOT = `${AUDIT_ROOT}/sets`;

const SOURCE_LANES = Object.freeze([
  ['artofpkm_jp_cards', 'artofpkm_jp_card'],
  ['limitless_jp_cards', 'limitless_jp_card'],
  ['official_jp_cards', 'official_jp_card'],
  ['serebii_jp_cards', 'serebii_jp_card'],
  ['tcgdex_ja_cards', 'tcgdex_ja_card'],
  ['bulbapedia_jp_card_lists', 'bulbapedia_jp_card'],
  ['pokeguardian_release_reports', 'pokeguardian_jp_card'],
]);

function normalizeString(value, repoRoot) {
  const normalized = value.replaceAll('\\', '/');
  const normalizedRoot = repoRoot.replaceAll('\\', '/');
  if (normalized.startsWith(`${normalizedRoot}/`)) {
    return normalized.slice(normalizedRoot.length + 1);
  }
  return value;
}

function normalizeValue(value, repoRoot) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeValue(item, repoRoot));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [
        key,
        normalizeValue(child, repoRoot),
      ]),
    );
  }
  return typeof value === 'string'
    ? normalizeString(value, repoRoot)
    : value;
}

async function listJsonFiles(root) {
  const files = [];
  async function visit(current) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await visit(absolutePath);
      } else if (
        entry.isFile()
        && (
          entry.name.endsWith('.json')
          || entry.name.endsWith('.json.gz')
        )
        && !entry.name.endsWith('.tar.gz')
      ) {
        files.push(absolutePath);
      }
    }
  }
  await visit(root);
  return files.sort();
}

async function readJson(filename) {
  const body = await fs.readFile(filename);
  return JSON.parse(
    filename.endsWith('.gz')
      ? zlib.gunzipSync(body).toString('utf8')
      : body.toString('utf8'),
  );
}

function isVerifiedArtifact(value) {
  return Boolean(
    value
    && typeof value === 'object'
    && value.package_id
    && value.artifact_version
    && value.content_fingerprint_sha256
    && Object.prototype.hasOwnProperty.call(value, 'content'),
  );
}

async function normalizeFile(filename, repoRoot) {
  const original = await readJson(filename);
  const normalized = normalizeValue(original, repoRoot);
  if (stableJson(original) === stableJson(normalized)) return false;
  if (isVerifiedArtifact(normalized)) {
    await writeJsonArtifact(filename, buildArtifact({
      packageId: normalized.package_id,
      generatedAt: normalized.generated_at,
      retrieval: normalized.retrieval,
      content: normalized.content,
    }));
  } else {
    await fs.writeFile(filename, stableJson(normalized), 'utf8');
  }
  return true;
}

async function artifactDescriptor(filename, repoRoot) {
  const body = await fs.readFile(filename);
  const value = await readJson(filename);
  return {
    path: path.relative(repoRoot, filename).replaceAll('\\', '/'),
    bytes: body.byteLength,
    sha256: sha256(body),
    content_fingerprint_sha256: isVerifiedArtifact(value)
      ? value.content_fingerprint_sha256
      : null,
  };
}

async function rewriteCardManifests(repoRoot) {
  const results = [];
  for (const [laneId, prefix] of SOURCE_LANES) {
    const manifestPath = path.resolve(
      repoRoot,
      CARDS_ROOT,
      `${prefix}_manifest_v1.json`,
    );
    const assertionPath = path.resolve(
      repoRoot,
      CARDS_ROOT,
      `${prefix}_assertions_v1.json.gz`,
    );
    const healthPath = path.resolve(
      repoRoot,
      CARDS_ROOT,
      `${prefix}_source_health_v1.json`,
    );
    const manifest = await readJson(manifestPath);
    const content = {
      ...manifest.content,
      normalized_artifacts: await Promise.all([
        artifactDescriptor(assertionPath, repoRoot),
        artifactDescriptor(healthPath, repoRoot),
      ]),
    };
    await writeJsonArtifact(manifestPath, buildArtifact({
      packageId: manifest.package_id,
      generatedAt: manifest.generated_at,
      retrieval: normalizeValue(manifest.retrieval, repoRoot),
      content,
    }));
    results.push({
      source_lane: laneId,
      manifest_path: path
        .relative(repoRoot, manifestPath)
        .replaceAll('\\', '/'),
    });
  }
  return results;
}

async function rewriteSetManifest(repoRoot) {
  const manifestPath = path.resolve(
    repoRoot,
    SETS_ROOT,
    'source_manifest_v1.json',
  );
  const manifest = await readJson(manifestPath);
  const normalizedPaths = [
    'source_set_assertions_v1.json',
    'source_health_v1.json',
    'source_policy_v1.json',
  ].map((filename) => path.resolve(repoRoot, SETS_ROOT, filename));
  await writeJsonArtifact(manifestPath, buildArtifact({
    packageId: manifest.package_id,
    generatedAt: manifest.generated_at,
    retrieval: normalizeValue(manifest.retrieval, repoRoot),
    content: {
      ...manifest.content,
      normalized_artifacts:
        await Promise.all(normalizedPaths.map(
          (filename) => artifactDescriptor(filename, repoRoot),
        )),
    },
  }));
  return path.relative(repoRoot, manifestPath).replaceAll('\\', '/');
}

async function rewritePreservationLedger(repoRoot) {
  const ledgerPath = path.resolve(
    repoRoot,
    CARDS_ROOT,
    'raw_evidence_preservation_ledger_v1.json.gz',
  );
  const ledger = await readJson(ledgerPath);
  const sourceLanes = [];
  for (const lane of ledger.content.source_lanes) {
    const assertion = await artifactDescriptor(
      path.resolve(repoRoot, lane.assertion_path),
      repoRoot,
    );
    sourceLanes.push({
      ...lane,
      assertion_sha256: assertion.sha256,
      assertion_content_fingerprint_sha256:
        assertion.content_fingerprint_sha256,
    });
  }
  await writeJsonArtifact(ledgerPath, buildArtifact({
    packageId: ledger.package_id,
    generatedAt: ledger.generated_at,
    retrieval: normalizeValue(ledger.retrieval, repoRoot),
    content: {
      ...ledger.content,
      source_lanes: sourceLanes,
    },
  }));
  return artifactDescriptor(ledgerPath, repoRoot);
}

export async function normalizeReleasePaths() {
  const repoRoot = process.cwd();
  const roots = [
    path.resolve(repoRoot, CARDS_ROOT),
    path.resolve(repoRoot, SETS_ROOT),
  ];
  const changedFiles = [];
  for (const root of roots) {
    for (const filename of await listJsonFiles(root)) {
      if (await normalizeFile(filename, repoRoot)) {
        changedFiles.push(
          path.relative(repoRoot, filename).replaceAll('\\', '/'),
        );
      }
    }
  }
  const cardManifests = await rewriteCardManifests(repoRoot);
  const setManifest = await rewriteSetManifest(repoRoot);
  const ledger = await rewritePreservationLedger(repoRoot);
  return {
    status: 'release_paths_normalized_no_write',
    changed_file_count: changedFiles.length,
    changed_files: changedFiles,
    card_manifests: cardManifests,
    set_manifest: setManifest,
    preservation_ledger: ledger,
    boundary: {
      local_artifact_writes: true,
      source_fetches: false,
      database_access: false,
      database_writes: false,
      storage_writes: false,
      identity_writes: false,
      pricing_writes: false,
    },
  };
}

const isMain = process.argv[1]
  && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  console.log(JSON.stringify(await normalizeReleasePaths(), null, 2));
}
