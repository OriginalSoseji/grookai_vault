import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const require = createRequire(import.meta.url);
const dotenv = require('dotenv');
const pg = require('pg');

for (const envPath of ['.env.local', '.env']) {
  dotenv.config({ path: path.join(ROOT, envPath), override: false, quiet: true });
}

export const VERSION = 'SPECIAL_VARIANT_PRINTING_REVIEW_GATE_V1';
export const FOUNDER_ARTIFACT_VERSION = 'SPECIAL_VARIANT_FOUNDER_DECISIONS_V1';
export const MAX_BATCH_SIZE = 25;
export const VALID_GATES = new Set(['image', 'publication', 'pricing']);
export const MANIFEST_PATH = path.join(ROOT, 'apps', 'web', 'src', 'data', 'review', 'specialVariantPrintingEvidenceV1.json');
const OUTPUT_DIR = path.join(ROOT, 'docs', 'audits', 'special_variant_printing_self_hosted_evidence_v1', 'review_gate_runs');
const STORAGE_PREFIX = 'warehouse-derived/special-variant-printing-evidence-v1/';
const CREATED_BY = 'special_variant_printing_review_gate_v1';
const SUPABASE_CA_PATH = path.join(ROOT, 'scripts', 'certificates', 'supabase-prod-ca-2021.crt');
const SUPABASE_ROOT_CA_SHA256 = '807025ad50d4ed219d2c9c7d299c004f824eb00cf7f65afef607d07b72e6cafa';

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

export function parseIntegerFlag(argv, name, fallback) {
  const raw = parseFlag(argv, name, String(fallback));
  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value)) throw new Error(`${name} must be an integer.`);
  return value;
}

export function expectedApprovalToken(gate, commitSha, packetFingerprint, decisionSha, offset, size) {
  return [VERSION, gate, commitSha, packetFingerprint, decisionSha, offset, size].join(':');
}

export function validateFounderArtifact(manifest, artifact) {
  if (artifact?.version !== FOUNDER_ARTIFACT_VERSION) throw new Error('Founder artifact version mismatch.');
  if (artifact?.packet_fingerprint !== manifest.packet_fingerprint) throw new Error('Founder artifact packet mismatch.');
  if (artifact?.reviewer !== 'founder' || artifact?.server_writes_performed !== false) {
    throw new Error('Founder artifact authority boundary mismatch.');
  }
  if (!Array.isArray(artifact.decisions) || artifact.decision_count !== artifact.decisions.length) {
    throw new Error('Founder artifact decision count mismatch.');
  }
  if (artifact.decisions.length + Number(artifact.remaining_count) !== manifest.rows.length) {
    throw new Error('Founder artifact remaining count mismatch.');
  }
  if (!/^[0-9a-f]{64}$/.test(artifact.source_first_pass_sha256 ?? '')) {
    throw new Error('Founder artifact first-pass hash missing.');
  }
  if (!['PokeJavi', 'founder'].includes(artifact.source_first_pass_reviewer)) {
    throw new Error('Founder artifact is not linked to an authorized first-pass reviewer.');
  }

  const manifestByEvidence = new Map(manifest.rows.map((row) => [row.evidence_id, row]));
  const seen = new Set();
  for (const decision of artifact.decisions) {
    const evidence = manifestByEvidence.get(decision.evidence_id);
    if (!evidence || seen.has(decision.evidence_id)) throw new Error('Unknown or duplicate founder decision evidence.');
    if (decision.card_printing_id !== evidence.card_printing_id
      || decision.source_image_sha256 !== evidence.source_image.sha256) {
      throw new Error(`Founder decision evidence binding mismatch:${decision.evidence_id}`);
    }
    if (!['exact_match', 'needs_more_evidence', 'wrong_card_identity', 'wrong_variant_marker', 'wrong_finish', 'image_unusable'].includes(decision.first_pass_decision)) {
      throw new Error(`Invalid first-pass decision:${decision.evidence_id}`);
    }
    if (!['confirmed', 'needs_more_evidence', 'rejected'].includes(decision.founder_decision)) {
      throw new Error(`Invalid founder decision:${decision.evidence_id}`);
    }
    if (decision.founder_decision !== 'confirmed'
      && (decision.publication_authorized || decision.pricing_authorized)) {
      throw new Error(`Authorization without confirmation:${decision.evidence_id}`);
    }
    if (decision.pricing_authorized && !decision.publication_authorized) {
      throw new Error(`Pricing authorization without publication authorization:${decision.evidence_id}`);
    }
    seen.add(decision.evidence_id);
  }
  return artifact;
}

export function selectAuthorizedRows(manifest, artifact, gate, offset, size) {
  if (!VALID_GATES.has(gate)) throw new Error('gate must be image, publication, or pricing.');
  if (!Number.isInteger(offset) || offset < 0) throw new Error('batch-offset must be zero or greater.');
  if (!Number.isInteger(size) || size < 1 || size > MAX_BATCH_SIZE) {
    throw new Error(`batch-size must be between 1 and ${MAX_BATCH_SIZE}.`);
  }
  const evidenceById = new Map(manifest.rows.map((row) => [row.evidence_id, row]));
  const eligible = artifact.decisions.filter((decision) => {
    if (decision.founder_decision !== 'confirmed') return false;
    if (gate === 'publication') return decision.publication_authorized === true;
    if (gate === 'pricing') return decision.publication_authorized === true && decision.pricing_authorized === true;
    return true;
  });
  const selected = eligible.slice(offset, offset + size).map((decision) => ({
    ...evidenceById.get(decision.evidence_id),
    decision,
  }));
  if (selected.length !== size) throw new Error(`Selected ${selected.length} authorized rows; expected ${size}.`);
  return selected;
}

function currentCommitSha() {
  return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
}

function assertCleanTrackedTree() {
  const status = execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], { cwd: ROOT, encoding: 'utf8' }).trim();
  if (status) throw new Error('Apply mode requires a clean tracked working tree.');
}

async function connect() {
  const connectionString = process.env.SUPABASE_DB_URL
    ?? process.env.DATABASE_URL
    ?? process.env.POSTGRES_URL;
  if (!connectionString) throw new Error('Missing direct Supabase database URL.');
  const database = new URL(connectionString);
  const project = new URL(process.env.SUPABASE_URL ?? '');
  const projectRef = project.hostname.match(/^([a-z0-9]+)\.supabase\.co$/i)?.[1];
  const expectedHost = projectRef ? `db.${projectRef}.supabase.co` : null;
  if (!expectedHost || database.hostname.toLowerCase() !== expectedHost.toLowerCase()) {
    throw new Error('Supabase database host does not match the project-scoped API origin.');
  }

  const ca = await fs.readFile(SUPABASE_CA_PATH, 'utf8');
  const certificate = new crypto.X509Certificate(ca);
  if (sha256(certificate.raw) !== SUPABASE_ROOT_CA_SHA256
    || !certificate.subject.includes('CN=Supabase Root 2021 CA')) {
    throw new Error('Pinned Supabase database CA validation failed.');
  }
  const client = new pg.Client({
    connectionString,
    ssl: {
      ca,
      rejectUnauthorized: true,
      servername: database.hostname,
    },
    connectionTimeoutMillis: 30_000,
    statement_timeout: 120_000,
  });
  await client.connect();
  if (client.connection?.stream?.authorized !== true) {
    await client.end().catch(() => {});
    throw new Error('Supabase PostgreSQL TLS peer was not authorized.');
  }
  return client;
}

async function createTargets(client, rows) {
  await client.query(`
    create temporary table special_variant_review_targets_v1 (
      evidence_id text primary key,
      card_print_id uuid not null,
      card_printing_id uuid unique not null,
      truth_review_id uuid unique not null,
      printing_gv_id text unique not null,
      finish_key text not null,
      source_product_id integer not null,
      source_product_payload_hash text not null,
      source_provider text not null,
      source_page_url text not null,
      source_image_sha256 text not null,
      source_image_size integer not null,
      storage_bucket text not null,
      storage_path text not null,
      founder_decision text not null,
      publication_authorized boolean not null,
      pricing_authorized boolean not null,
      founder_notes text not null,
      founder_decided_at timestamptz not null
    ) on commit drop
  `);
  const targets = rows.map((row) => ({
    evidence_id: row.evidence_id,
    card_print_id: row.card_print_id,
    card_printing_id: row.card_printing_id,
    truth_review_id: row.truth_review_id,
    printing_gv_id: row.printing_gv_id,
    finish_key: row.finish_key,
    source_product_id: row.source_product_id,
    source_product_payload_hash: row.source_product_payload_hash,
    source_provider: row.source_provider,
    source_page_url: row.source_page_url,
    source_image_sha256: row.source_image.sha256,
    source_image_size: row.source_image.size_bytes,
    storage_bucket: row.storage_bucket,
    storage_path: row.storage_path,
    founder_decision: row.decision.founder_decision,
    publication_authorized: row.decision.publication_authorized,
    pricing_authorized: row.decision.pricing_authorized,
    founder_notes: row.decision.notes ?? '',
    founder_decided_at: row.decision.decided_at,
  }));
  await client.query(`
    insert into special_variant_review_targets_v1
    select * from jsonb_to_recordset($1::jsonb) as t(
      evidence_id text, card_print_id uuid, card_printing_id uuid, truth_review_id uuid,
      printing_gv_id text, finish_key text, source_product_id integer,
      source_product_payload_hash text, source_provider text, source_page_url text,
      source_image_sha256 text, source_image_size integer, storage_bucket text,
      storage_path text, founder_decision text, publication_authorized boolean,
      pricing_authorized boolean, founder_notes text, founder_decided_at timestamptz
    )
  `, [JSON.stringify(targets)]);
}

async function guardTargets(client, gate, expectedCount) {
  const result = await client.query(`
    select
      (select count(*)::int from special_variant_review_targets_v1) as target_count,
      (select count(*)::int
         from special_variant_review_targets_v1 target
         join public.card_printings child
           on child.id = target.card_printing_id
          and child.card_print_id = target.card_print_id
          and child.printing_gv_id = target.printing_gv_id
          and child.finish_key = target.finish_key) as exact_child_count,
      (select count(*)::int
         from special_variant_review_targets_v1 target
         join public.card_printing_truth_reviews review
           on review.id = target.truth_review_id
          and review.card_printing_id = target.card_printing_id
          and review.active = true) as exact_review_count,
      (select count(*)::int from special_variant_review_targets_v1
        where founder_decision = 'confirmed'
          and storage_bucket = 'user-card-images'
          and storage_path like '${STORAGE_PREFIX}%'
          and source_image_sha256 ~ '^[0-9a-f]{64}$') as exact_evidence_count,
      (select count(*)::int
         from special_variant_review_targets_v1 target
         join public.card_printings child on child.id = target.card_printing_id
         join public.card_printing_truth_reviews review on review.id = target.truth_review_id
        where $1 = 'image'
          and review.public_visibility = 'hidden_pending_review'
          and review.review_status in ('quarantined_candidate', 'verified')
          and coalesce(child.image_source, 'identity') = 'identity'
          and (child.image_path is null or child.image_path = target.storage_path)
          and child.image_url is null and child.image_alt_url is null
          and coalesce(child.image_status, 'missing') in ('missing', 'representative_shared_stamp', 'exact')) as image_gate_ready_count,
      (select count(*)::int
         from special_variant_review_targets_v1 target
         join public.card_printings child on child.id = target.card_printing_id
         join public.card_printing_truth_reviews review on review.id = target.truth_review_id
        where $1 = 'publication'
          and target.publication_authorized = true
          and review.review_status = 'verified'
          and review.public_visibility in ('hidden_pending_review', 'visible')
          and child.image_source = 'identity'
          and child.image_path = target.storage_path
          and child.image_status = 'exact') as publication_gate_ready_count,
      (select count(*)::int
         from special_variant_review_targets_v1 target
         join public.card_printings child on child.id = target.card_printing_id
         join public.card_printing_truth_reviews review on review.id = target.truth_review_id
        where $1 = 'pricing'
          and target.publication_authorized = true
          and target.pricing_authorized = true
          and review.review_status = 'verified'
          and review.public_visibility = 'visible'
          and child.image_source = 'identity'
          and child.image_path = target.storage_path
          and child.image_status = 'exact') as pricing_gate_ready_count,
      (select count(*)::int
         from special_variant_review_targets_v1 target
         join public.external_mappings mapping
           on mapping.source = 'tcgplayer'
          and mapping.external_id = target.source_product_id::text
          and mapping.active = true
        where mapping.card_print_id <> target.card_print_id) as conflicting_mapping_count
  `, [gate]);
  const guard = result.rows[0];
  for (const key of ['target_count', 'exact_child_count', 'exact_review_count', 'exact_evidence_count']) {
    if (guard[key] !== expectedCount) throw new Error(`Gate guard failed:${key}:${guard[key]}:${expectedCount}`);
  }
  const readinessKey = `${gate}_gate_ready_count`;
  if (guard[readinessKey] !== expectedCount) throw new Error(`Gate guard failed:${readinessKey}:${guard[readinessKey]}:${expectedCount}`);
  if (gate === 'pricing' && guard.conflicting_mapping_count !== 0) {
    throw new Error(`Conflicting TCGplayer mappings:${guard.conflicting_mapping_count}`);
  }
  return guard;
}

async function parentSnapshot(client) {
  const result = await client.query(`
    select parent.id::text, parent.gv_id, parent.name, parent.number, parent.set_code,
           parent.variant_key, parent.image_source, parent.image_path, parent.image_url,
           parent.image_alt_url, parent.image_status, parent.image_note
      from public.card_prints parent
      join (select distinct card_print_id from special_variant_review_targets_v1) target
        on target.card_print_id = parent.id
     order by parent.id
  `);
  return { rows: result.rows, fingerprint: sha256(stable(result.rows)) };
}

async function executeGate(client, gate, packetFingerprint, decisionSha) {
  if (gate === 'image') {
    const child = await client.query(`
      update public.card_printings child
         set image_source = 'identity', image_path = target.storage_path,
             image_url = null, image_alt_url = null, image_status = 'exact',
             image_note = concat('Founder-confirmed self-hosted exact variant evidence. Packet ', $1::text,
               '; image ', target.source_image_sha256, '; source product ', target.source_product_id::text, '.')
        from special_variant_review_targets_v1 target
       where child.id = target.card_printing_id
      returning child.id::text
    `, [packetFingerprint]);
    const review = await client.query(`
      update public.card_printing_truth_reviews review
         set review_status = 'verified', public_visibility = 'hidden_pending_review',
             reason = 'Founder-confirmed exact self-hosted variant image; publication remains separately gated.',
             confidence = 'high', reviewed_by = 'founder', reviewed_at = target.founder_decided_at,
             evidence_sources_checked = array(select distinct unnest(review.evidence_sources_checked || array[target.source_provider])),
             evidence_sources_for_finish = array(select distinct unnest(review.evidence_sources_for_finish || array[target.source_provider])),
             evidence = review.evidence || jsonb_build_object(
               'self_hosted_image_gate_version', $1::text,
               'packet_fingerprint', $2::text,
               'founder_decision_artifact_sha256', $3::text,
               'evidence_id', target.evidence_id,
               'source_product_id', target.source_product_id,
               'source_product_payload_hash', target.source_product_payload_hash,
               'source_page_url', target.source_page_url,
               'source_image_sha256', target.source_image_sha256,
               'source_image_size_bytes', target.source_image_size,
               'storage_bucket', target.storage_bucket,
               'storage_path', target.storage_path,
               'founder_notes', target.founder_notes
             )
        from special_variant_review_targets_v1 target
       where review.id = target.truth_review_id
      returning review.id::text
    `, [VERSION, packetFingerprint, decisionSha]);
    return { child_image_updates: child.rowCount, truth_review_updates: review.rowCount, publication_updates: 0, pricing_mapping_inserts: 0 };
  }
  if (gate === 'publication') {
    const review = await client.query(`
      update public.card_printing_truth_reviews review
         set public_visibility = 'visible', reviewed_by = 'founder', reviewed_at = target.founder_decided_at,
             evidence = review.evidence || jsonb_build_object(
               'publication_gate_version', $1::text,
               'publication_authorized', true,
               'founder_decision_artifact_sha256', $2::text,
               'publication_authorized_at', target.founder_decided_at
             )
        from special_variant_review_targets_v1 target
       where review.id = target.truth_review_id
      returning review.id::text
    `, [VERSION, decisionSha]);
    return { child_image_updates: 0, truth_review_updates: 0, publication_updates: review.rowCount, pricing_mapping_inserts: 0 };
  }
  const mapping = await client.query(`
    insert into public.external_mappings (card_print_id, source, external_id, meta, synced_at, active)
    select target.card_print_id, 'tcgplayer', target.source_product_id::text,
           jsonb_build_object(
             'mapping_method', 'founder_confirmed_exact_variant_evidence',
             'confidence', 'high',
             'review_gate_version', $1::text,
             'packet_fingerprint', $2::text,
             'founder_decision_artifact_sha256', $3::text,
             'card_printing_id', target.card_printing_id,
             'printing_gv_id', target.printing_gv_id,
             'finish_key', target.finish_key,
             'source_product_payload_hash', target.source_product_payload_hash,
             'source_image_sha256', target.source_image_sha256,
             'created_by', $4::text
           ), now(), true
      from special_variant_review_targets_v1 target
     where not exists (
       select 1 from public.external_mappings existing
        where existing.source = 'tcgplayer'
          and existing.external_id = target.source_product_id::text
          and existing.active = true
     )
    returning id
  `, [VERSION, packetFingerprint, decisionSha, CREATED_BY]);
  return { child_image_updates: 0, truth_review_updates: 0, publication_updates: 0, pricing_mapping_inserts: mapping.rowCount };
}

async function readback(client, gate) {
  const result = await client.query(`
    select target.evidence_id, target.card_printing_id::text, target.printing_gv_id,
           child.image_source, child.image_path, child.image_status,
           review.review_status, review.public_visibility, review.reviewed_by,
           mapping.id as tcgplayer_mapping_id, mapping.card_print_id::text as mapped_card_print_id
      from special_variant_review_targets_v1 target
      join public.card_printings child on child.id = target.card_printing_id
      join public.card_printing_truth_reviews review on review.id = target.truth_review_id and review.active = true
      left join public.external_mappings mapping
        on mapping.source = 'tcgplayer'
       and mapping.external_id = target.source_product_id::text
       and mapping.active = true
     order by target.evidence_id
  `);
  for (const row of result.rows) {
    if (row.image_source !== 'identity' || row.image_status !== 'exact') throw new Error(`Image readback mismatch:${row.evidence_id}`);
    if (row.review_status !== 'verified') throw new Error(`Review readback mismatch:${row.evidence_id}`);
    if (gate === 'image' && row.public_visibility !== 'hidden_pending_review') throw new Error(`Image gate leaked visibility:${row.evidence_id}`);
    if (['publication', 'pricing'].includes(gate) && row.public_visibility !== 'visible') throw new Error(`Publication readback mismatch:${row.evidence_id}`);
    if (gate === 'pricing' && (!row.tcgplayer_mapping_id || row.mapped_card_print_id === null)) throw new Error(`Pricing mapping missing:${row.evidence_id}`);
  }
  return result.rows;
}

async function runTransaction(client, { gate, rows, packetFingerprint, decisionSha, apply }) {
  let started = false;
  try {
    await client.query('begin');
    started = true;
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");
    await client.query("select pg_advisory_xact_lock(hashtext('special_variant_printing_review_gate_v1'))");
    await createTargets(client, rows);
    const guard = await guardTargets(client, gate, rows.length);
    const parentBefore = await parentSnapshot(client);
    const writes = await executeGate(client, gate, packetFingerprint, decisionSha);
    const readbackRows = await readback(client, gate);
    const parentAfter = await parentSnapshot(client);
    if (parentBefore.fingerprint !== parentAfter.fingerprint) throw new Error('Canonical parent boundary changed.');
    if (readbackRows.length !== rows.length) throw new Error(`Readback count mismatch:${readbackRows.length}:${rows.length}`);
    if (apply) {
      await client.query('commit');
      started = false;
    } else {
      await client.query('rollback');
      started = false;
    }
    return {
      guard,
      writes,
      readback_rows: readbackRows,
      canonical_parent_fingerprint_before: parentBefore.fingerprint,
      canonical_parent_fingerprint_after: parentAfter.fingerprint,
      canonical_parent_rows_changed: 0,
      committed: apply,
    };
  } finally {
    if (started) await client.query('rollback');
  }
}

function outputPath(gate, mode, offset, size) {
  return path.join(OUTPUT_DIR, `${gate}_${mode}_${String(offset).padStart(3, '0')}_${String(size).padStart(3, '0')}.json`);
}

export async function main(argv = process.argv.slice(2)) {
  const gate = parseFlag(argv, 'gate');
  const mode = parseFlag(argv, 'mode', 'dry-run');
  const decisionFile = parseFlag(argv, 'decision-file');
  const manifestFile = parseFlag(argv, 'manifest-file', MANIFEST_PATH);
  if (!VALID_GATES.has(gate)) throw new Error('gate must be image, publication, or pricing.');
  if (!['dry-run', 'apply'].includes(mode)) throw new Error('mode must be dry-run or apply.');
  if (!decisionFile) throw new Error('--decision-file is required.');

  const [manifestText, decisionText] = await Promise.all([
    fs.readFile(path.resolve(ROOT, manifestFile), 'utf8'),
    fs.readFile(path.resolve(ROOT, decisionFile), 'utf8'),
  ]);
  const manifest = JSON.parse(manifestText);
  const artifact = validateFounderArtifact(manifest, JSON.parse(decisionText));
  const decisionSha = sha256(decisionText);
  const offset = parseIntegerFlag(argv, 'batch-offset', 0);
  const size = parseIntegerFlag(argv, 'batch-size', Math.min(MAX_BATCH_SIZE, artifact.decision_count));
  const rows = selectAuthorizedRows(manifest, artifact, gate, offset, size);
  const commitSha = currentCommitSha();
  const apply = mode === 'apply';

  if (apply) {
    assertCleanTrackedTree();
    if (process.env.SPECIAL_VARIANT_REVIEW_EXPECTED_SHA !== commitSha) throw new Error('Frozen commit SHA mismatch.');
    if (process.env.SPECIAL_VARIANT_REVIEW_EXPECTED_PACKET_FINGERPRINT !== manifest.packet_fingerprint) throw new Error('Packet fingerprint mismatch.');
    if (process.env.SPECIAL_VARIANT_REVIEW_EXPECTED_DECISION_SHA !== decisionSha) throw new Error('Decision artifact SHA mismatch.');
    if (process.env.SPECIAL_VARIANT_REVIEW_APPROVAL_TOKEN
      !== expectedApprovalToken(gate, commitSha, manifest.packet_fingerprint, decisionSha, offset, size)) {
      throw new Error('Review gate approval token mismatch.');
    }
  }

  const client = await connect();
  let transaction;
  try {
    transaction = await runTransaction(client, {
      gate,
      rows,
      packetFingerprint: manifest.packet_fingerprint,
      decisionSha,
      apply,
    });
  } finally {
    await client.end();
  }

  const reportBase = {
    version: VERSION,
    generated_at: new Date().toISOString(),
    gate,
    mode,
    commit_sha: commitSha,
    packet_fingerprint: manifest.packet_fingerprint,
    manifest_path: path.relative(ROOT, path.resolve(ROOT, manifestFile)),
    founder_decision_artifact_path: decisionFile,
    founder_decision_artifact_sha256: decisionSha,
    batch: { offset, size },
    selected_evidence_ids: rows.map((row) => row.evidence_id),
    transaction,
    database_changes_committed: apply,
    approvals_performed: apply && gate === 'image',
    public_visibility_changed: apply && gate === 'publication',
    pricing_mappings_changed: apply && gate === 'pricing',
    embeddings_created: false,
    canonical_parent_rows_changed: 0,
  };
  const report = { ...reportBase, proof_hash: sha256(stable(reportBase)) };
  const out = outputPath(gate, mode.replace('-', '_'), offset, size);
  await fs.mkdir(path.dirname(out), { recursive: true });
  await fs.writeFile(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify({
    gate,
    mode,
    batch: report.batch,
    committed: transaction.committed,
    readback_count: transaction.readback_rows.length,
    canonical_parent_rows_changed: 0,
    artifact: path.relative(ROOT, out),
    proof_hash: report.proof_hash,
  }, null, 2)}\n`);
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(`[${VERSION}] ${String(error?.message ?? error).replace(/postgres(?:ql)?:\/\/[^\s]+/gi, '[database-url-redacted]')}`);
    process.exitCode = 1;
  });
}
