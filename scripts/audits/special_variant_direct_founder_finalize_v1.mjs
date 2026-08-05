import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

import {
  FOUNDER_ARTIFACT_VERSION,
  MANIFEST_PATH,
  validateFounderArtifact,
} from './special_variant_printing_review_gate_v1.mjs';

const ROOT = process.cwd();
const FIRST_PASS_VERSION = 'SPECIAL_VARIANT_FIRST_PASS_DECISIONS_V1';
const VERSION = 'SPECIAL_VARIANT_DIRECT_FOUNDER_FINALIZE_V1';
const DEFAULT_OUTPUT_DIR = path.join(
  ROOT,
  'docs',
  'audits',
  'special_variant_printing_self_hosted_evidence_v1',
  'founder_review_v1',
);
const VALID_FIRST_PASS_DECISIONS = new Set([
  'exact_match',
  'needs_more_evidence',
  'wrong_card_identity',
  'wrong_variant_marker',
  'wrong_finish',
  'image_unusable',
]);

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function parseFlag(argv, name, fallback = null) {
  const prefix = `--${name}=`;
  const inline = argv.find((value) => value.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = argv.indexOf(`--${name}`);
  return index >= 0 ? argv[index + 1] : fallback;
}

export function founderDecision(firstPassDecision) {
  if (firstPassDecision === 'exact_match') return 'confirmed';
  if (firstPassDecision === 'needs_more_evidence') return 'needs_more_evidence';
  return 'rejected';
}

function increment(record, key) {
  record[key] = (record[key] ?? 0) + 1;
}

export async function finalizeDirectFounderReview({ firstPassFile, outputDir = DEFAULT_OUTPUT_DIR }) {
  if (!firstPassFile) throw new Error('--first-pass-file is required.');
  const sourcePath = path.resolve(ROOT, firstPassFile);
  const targetDir = path.resolve(ROOT, outputDir);
  const [firstPassText, manifestText] = await Promise.all([
    fs.readFile(sourcePath, 'utf8'),
    fs.readFile(MANIFEST_PATH, 'utf8'),
  ]);
  const firstPass = JSON.parse(firstPassText);
  const manifest = JSON.parse(manifestText);

  if (firstPass.version !== FIRST_PASS_VERSION) throw new Error('First-pass version mismatch.');
  if (firstPass.reviewer !== 'founder') throw new Error('Direct first-pass reviewer must be founder.');
  if (firstPass.packet_fingerprint !== manifest.packet_fingerprint) throw new Error('Packet fingerprint mismatch.');
  if (firstPass.server_writes_performed !== false) throw new Error('First-pass write boundary mismatch.');
  if (!Array.isArray(firstPass.decisions) || firstPass.decision_count !== firstPass.decisions.length) {
    throw new Error('First-pass decision count mismatch.');
  }
  if (firstPass.decisions.length + Number(firstPass.remaining_count) !== manifest.rows.length) {
    throw new Error('First-pass remaining count mismatch.');
  }

  const evidenceById = new Map(manifest.rows.map((row) => [row.evidence_id, row]));
  const seen = new Set();
  const firstPassCounts = {};
  for (const decision of firstPass.decisions) {
    const evidence = evidenceById.get(decision.evidence_id);
    if (!evidence || seen.has(decision.evidence_id)) throw new Error('Unknown or duplicate first-pass evidence.');
    if (decision.card_printing_id !== evidence.card_printing_id
      || decision.source_image_sha256 !== evidence.source_image.sha256) {
      throw new Error(`First-pass evidence binding mismatch:${decision.evidence_id}`);
    }
    if (!VALID_FIRST_PASS_DECISIONS.has(decision.decision)) {
      throw new Error(`Invalid first-pass decision:${decision.evidence_id}`);
    }
    seen.add(decision.evidence_id);
    increment(firstPassCounts, decision.decision);
  }

  const decisions = firstPass.decisions.map((decision) => ({
    evidence_id: decision.evidence_id,
    card_printing_id: decision.card_printing_id,
    source_image_sha256: decision.source_image_sha256,
    first_pass_decision: decision.decision,
    first_pass_decided_at: decision.decided_at,
    founder_decision: founderDecision(decision.decision),
    publication_authorized: false,
    pricing_authorized: false,
    notes: decision.notes ?? '',
    decided_at: decision.decided_at,
  }));
  const founderArtifact = {
    version: FOUNDER_ARTIFACT_VERSION,
    packet_fingerprint: manifest.packet_fingerprint,
    source_first_pass_sha256: sha256(firstPassText),
    source_first_pass_reviewer: 'founder',
    reviewer: 'founder',
    exported_at: firstPass.exported_at,
    decision_count: decisions.length,
    remaining_count: manifest.rows.length - decisions.length,
    server_writes_performed: false,
    decisions,
  };
  validateFounderArtifact(manifest, founderArtifact);

  const founderCounts = {};
  for (const decision of decisions) increment(founderCounts, decision.founder_decision);
  const reconciliationBase = {
    version: VERSION,
    packet_fingerprint: manifest.packet_fingerprint,
    source_first_pass_sha256: founderArtifact.source_first_pass_sha256,
    source_rows: firstPass.decisions.length,
    founder_rows: founderArtifact.decisions.length,
    remaining_rows: founderArtifact.remaining_count,
    evidence_binding_errors: 0,
    duplicate_evidence_ids: 0,
    first_pass_decisions: firstPassCounts,
    founder_decisions: founderCounts,
    publication_authorized: 0,
    pricing_authorized: 0,
    server_writes_performed: false,
    database_writes_performed: false,
  };
  const reconciliation = {
    ...reconciliationBase,
    proof_hash: sha256(stable(reconciliationBase)),
  };

  await fs.mkdir(targetDir, { recursive: true });
  const firstPassTarget = path.join(targetDir, 'special_variant_first_pass_founder_143_of_143.json');
  const founderTarget = path.join(targetDir, 'special_variant_founder_143_of_143.json');
  const reconciliationTarget = path.join(targetDir, 'special_variant_founder_reconciliation_v1.json');
  const founderText = `${JSON.stringify(founderArtifact, null, 2)}\n`;
  const reconciliationText = `${JSON.stringify(reconciliation, null, 2)}\n`;
  await Promise.all([
    fs.writeFile(firstPassTarget, firstPassText, 'utf8'),
    fs.writeFile(founderTarget, founderText, 'utf8'),
    fs.writeFile(reconciliationTarget, reconciliationText, 'utf8'),
  ]);
  const hashLines = [
    [sha256(firstPassText), firstPassTarget],
    [sha256(founderText), founderTarget],
    [sha256(reconciliationText), reconciliationTarget],
  ].map(([hash, file]) => `${hash}  ${path.relative(ROOT, file).replaceAll('\\', '/')}`);
  await fs.writeFile(path.join(targetDir, 'artifact_hashes.sha256'), `${hashLines.join('\n')}\n`, 'utf8');

  return {
    source_first_pass: path.relative(ROOT, firstPassTarget),
    founder_artifact: path.relative(ROOT, founderTarget),
    reconciliation: path.relative(ROOT, reconciliationTarget),
    source_first_pass_sha256: founderArtifact.source_first_pass_sha256,
    founder_artifact_sha256: sha256(founderText),
    counts: reconciliation.founder_decisions,
    publication_authorized: 0,
    pricing_authorized: 0,
    server_writes_performed: false,
  };
}

export async function main(argv = process.argv.slice(2)) {
  const result = await finalizeDirectFounderReview({
    firstPassFile: parseFlag(argv, 'first-pass-file'),
    outputDir: parseFlag(argv, 'output-dir', DEFAULT_OUTPUT_DIR),
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(`[${VERSION}] ${String(error?.message ?? error)}`);
    process.exitCode = 1;
  });
}
