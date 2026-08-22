import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync, gzipSync } from 'node:zlib';

import dotenv from 'dotenv';
import pg from 'pg';

import {
  MTG_ELIGIBLE_CARD_PRINT_COUNT,
  MTG_FACE_COUNT,
  MTG_GAME_ID,
  buildMtgImagePointerPlanV1,
  buildMtgPointerAggregateV1,
  hashMtgImagePointerV1,
  inspectMtgImagePointerPlanV1,
  inspectMtgPointerAggregateV1,
  mtgParentImageSnapshotV1,
  mtgParentImageUnpopulatedV1,
} from '../../backend/pricing/mtg_card_image_pointer_v1.mjs';

const { Client } = pg;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CHUNK = 5_000;

function git(...args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

function parseArgs(argv) {
  const args = { mode: null, sourceDir: null, outDir: null, expectedHeadSha: null,
    expectedAggregateFingerprint: null, envFile: 'C:\\grookai_vault\\.env.local' };
  for (const argument of argv) {
    const match = /^--([a-z-]+)=(.+)$/.exec(argument);
    if (!match) throw new Error(`Unsupported argument: ${argument}`);
    const [, key, value] = match;
    if (key === 'mode') args.mode = value;
    else if (key === 'source-dir') args.sourceDir = path.resolve(value);
    else if (key === 'out-dir') args.outDir = path.resolve(value);
    else if (key === 'expected-head-sha') args.expectedHeadSha = value.toLowerCase();
    else if (key === 'expected-aggregate-fingerprint') {
      args.expectedAggregateFingerprint = value.toLowerCase();
    } else if (key === 'env-file') args.envFile = path.resolve(value);
    else throw new Error(`Unsupported argument: ${argument}`);
  }
  if (!['aggregate', 'plan', 'rollback-canary', 'apply', 'readback'].includes(args.mode)) {
    throw new Error('--mode=aggregate|plan|rollback-canary|apply|readback required');
  }
  if (!args.sourceDir || !args.outDir || !/^[0-9a-f]{40}$/.test(args.expectedHeadSha ?? '')) {
    throw new Error('Exact source directory, output directory, and producer SHA are required');
  }
  if (!args.expectedAggregateFingerprint && args.mode !== 'aggregate') {
    throw new Error('Exact aggregate fingerprint is required');
  }
  return args;
}

function repository(args) {
  const value = { branch: git('branch', '--show-current'), commit_sha: git('rev-parse', 'HEAD'),
    tracked_worktree_clean: git('status', '--porcelain', '--untracked-files=no') === '' };
  if (value.commit_sha !== args.expectedHeadSha || !value.tracked_worktree_clean) {
    throw new Error('Repository is not the exact clean producer');
  }
  return value;
}

async function walk(directory, name, output = []) {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(full, name, output);
    else if (entry.name === name) output.push(full);
  }
  return output;
}

async function loadChunks(sourceDir) {
  const summaries = await walk(sourceDir, 'summary.json');
  const chunks = [];
  for (const summaryPath of summaries) {
    const summary = JSON.parse(await fs.readFile(summaryPath, 'utf8'));
    if (summary.operation !== 'upload') continue;
    if (summary.status !== 'storage_upload_complete_and_verified'
      || summary.verified !== summary.selected_assets
      || summary.created + summary.reused_verified !== summary.selected_assets
      || (summary.failures ?? []).length) throw new Error(`Invalid upload summary: ${summaryPath}`);
    const manifestPath = path.join(path.dirname(summaryPath), 'image_pointers.jsonl.gz');
    const body = gunzipSync(await fs.readFile(manifestPath)).toString('utf8').trimEnd();
    const pointers = body ? body.split('\n').map((line) => JSON.parse(line)) : [];
    if (pointers.length !== summary.selected_assets) throw new Error('Manifest row mismatch');
    const runId = path.dirname(path.dirname(summaryPath)).match(/-(\d+)$/)?.[1];
    if (!runId) throw new Error(`Storage run ID is missing from ${summaryPath}`);
    chunks.push({ run_id: runId, summary, pointers, manifest_path: manifestPath });
  }
  chunks.sort((left, right) => left.summary.start_index - right.summary.start_index);
  let cursor = 0;
  for (const chunk of chunks) {
    if (chunk.summary.start_index !== cursor) throw new Error(`Image range gap at ${cursor}`);
    cursor += chunk.summary.selected_assets;
  }
  if (cursor !== MTG_FACE_COUNT) throw new Error(`Image range coverage ${cursor}/${MTG_FACE_COUNT}`);
  return chunks;
}

async function writeArtifacts(directory, files, repositoryState) {
  await fs.mkdir(directory, { recursive: true });
  const hashes = {};
  for (const [name, value] of Object.entries(files)) {
    const body = Buffer.isBuffer(value) ? value : Buffer.from(name.endsWith('.json')
      ? `${JSON.stringify(value, null, 2)}\n` : String(value));
    await fs.writeFile(path.join(directory, name), body);
    hashes[name] = { bytes: body.length, sha256: hashMtgImagePointerV1(body) };
  }
  await fs.writeFile(path.join(directory, 'artifact_hashes.json'),
    `${JSON.stringify({ hash_algorithm: 'sha256', producer: repositoryState,
      artifacts: hashes }, null, 2)}\n`);
}

function dbOptions(connectionString, applicationName) {
  return { connectionString, ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 20_000, query_timeout: 1_200_000,
    statement_timeout: 1_200_000, application_name: applicationName };
}

async function captureState(client, lock = false) {
  const rows = (await client.query(`select cp.id::text,cp.gv_id,cp.game_id::text,
      mapping.external_id scryfall_print_id,cp.image_url,cp.image_alt_url,
      cp.image_source,cp.image_hash,cp.image_status,cp.image_res,
      cp.image_last_checked_at,cp.image_path,cp.image_note,
      cp.representative_image_url
    from public.card_prints cp
    left join public.external_mappings mapping on mapping.card_print_id=cp.id
      and mapping.source='scryfall' and mapping.active
    where cp.game_id=$1::uuid order by cp.id ${lock ? 'for update of cp' : ''}`,
  [MTG_GAME_ID])).rows;
  const faces = (await client.query(`select face.id::text,face.card_print_id::text,
      face.face_index,face.face_role,face.image_source,face.image_status,
      face.image_path,face.image_url,face.image_hash,face.content_type,
      face.width,face.height,face.size_bytes,face.source_quality,face.source_url,
      face.source_print_id::text,face.evidence,face.created_at
    from public.card_print_image_faces face
    join public.card_prints card on card.id=face.card_print_id
    where card.game_id=$1::uuid order by face.card_print_id,face.face_index`,
  [MTG_GAME_ID])).rows;
  return { rows, faces };
}

async function boundarySnapshot(client) {
  return (await client.query(`select jsonb_build_object(
    'non_mtg_image_fingerprint',(
      select md5(coalesce(string_agg(concat_ws('|',cp.id::text,
        coalesce(cp.image_url,''),coalesce(cp.image_alt_url,''),
        coalesce(cp.image_path,''),coalesce(cp.image_hash,''),
        coalesce(cp.image_source,''),coalesce(cp.image_status,''),
        coalesce(cp.image_note,'')),E'\n' order by cp.id),''))
      from public.card_prints cp where cp.game_id<>$1::uuid),
    'pokemon_card_count',(
      select count(*) from public.card_prints cp join public.games g on g.id=cp.game_id
      where g.code='pokemon'),
    'mtg_release_control',(
      select to_jsonb(control) from public.catalog_game_release_controls control
      where control.game_code='mtg')) as value`, [MTG_GAME_ID])).rows[0].value;
}

function buildPlan(aggregate, state, checkedAt, producerCommit, boundary) {
  if (state.rows.length !== MTG_ELIGIBLE_CARD_PRINT_COUNT) {
    throw new Error(`MTG catalog count ${state.rows.length}/${MTG_ELIGIBLE_CARD_PRINT_COUNT}`);
  }
  const fronts = new Set(aggregate.rows.filter((row) => row.face_role === 'front')
    .map((row) => row.card_print_id));
  const gapRows = state.rows.filter((row) => !fronts.has(row.id));
  return buildMtgImagePointerPlanV1({ aggregate, currentRows: state.rows,
    existingFaceRows: state.faces, gapRows, checkedAt, producerCommit, boundarySnapshot: boundary });
}

function evaluateState(plan, state, boundary) {
  const findings = [];
  const parents = new Map(state.rows.map((row) => [row.id, row]));
  const faces = new Map(state.faces.map((row) => [`${row.card_print_id}:${row.face_index}`, row]));
  for (const row of plan.parent_rows) {
    const current = mtgParentImageSnapshotV1(parents.get(row.card_print_id));
    if (hashMtgImagePointerV1(current) !== row.after_hash_sha256) {
      findings.push(`parent_readback:${row.gv_id}`);
    }
  }
  for (const expected of plan.face_rows) {
    const current = faces.get(`${expected.card_print_id}:${expected.face_index}`);
    if (!current) findings.push(`face_missing:${expected.card_print_id}:${expected.face_index}`);
    else {
      const comparable = { ...current };
      delete comparable.id;
      delete comparable.created_at;
      if (hashMtgImagePointerV1(comparable) !== hashMtgImagePointerV1(expected)) {
        findings.push(`face_readback:${expected.card_print_id}:${expected.face_index}`);
      }
    }
  }
  if (state.faces.length !== plan.counts.face_rows) findings.push('face_count');
  for (const id of plan.gap_card_print_ids) {
    const snapshot = mtgParentImageSnapshotV1(parents.get(id));
    if (!mtgParentImageUnpopulatedV1(snapshot)) {
      findings.push(`gap_mutated:${id}`);
    }
  }
  if (hashMtgImagePointerV1(boundary) !== hashMtgImagePointerV1(plan.boundary_snapshot)) {
    findings.push('non_mtg_boundary_changed');
  }
  return findings;
}

async function insertFaces(client, rows) {
  let inserted = 0;
  for (let index = 0; index < rows.length; index += CHUNK) {
    const selected = rows.slice(index, index + CHUNK);
    const result = await client.query(`insert into public.card_print_image_faces (
      card_print_id,face_index,face_role,image_source,image_status,image_path,
      image_url,image_hash,content_type,width,height,size_bytes,source_quality,
      source_url,source_print_id,evidence)
    select x.card_print_id,x.face_index,x.face_role,x.image_source,x.image_status,
      x.image_path,x.image_url,x.image_hash,x.content_type,x.width,x.height,
      x.size_bytes,x.source_quality,x.source_url,x.source_print_id,x.evidence
    from jsonb_to_recordset($1::jsonb) as x(card_print_id uuid,face_index smallint,
      face_role text,image_source text,image_status text,image_path text,
      image_url text,image_hash text,content_type text,width integer,height integer,
      size_bytes integer,source_quality text,source_url text,source_print_id uuid,
      evidence jsonb)
    on conflict (card_print_id,face_index) do nothing`, [JSON.stringify(selected)]);
    inserted += result.rowCount;
  }
  return inserted;
}

async function updateParents(client, rows) {
  let updated = 0;
  const selectedRows = rows.filter((row) => row.disposition === 'update_required');
  for (let index = 0; index < selectedRows.length; index += CHUNK) {
    const selected = selectedRows.slice(index, index + CHUNK)
      .map((row) => ({ card_print_id: row.card_print_id, ...row.after }));
    const result = await client.query(`update public.card_prints card set
      image_url=x.image_url,image_alt_url=x.image_alt_url,image_source=x.image_source,
      image_hash=x.image_hash,image_status=x.image_status,image_res=x.image_res,
      image_last_checked_at=x.image_last_checked_at,image_path=x.image_path,
      image_note=x.image_note,representative_image_url=x.representative_image_url,
      updated_at=now()
    from jsonb_to_recordset($1::jsonb) as x(card_print_id uuid,image_url text,
      image_alt_url text,image_source text,image_hash text,image_status text,
      image_res jsonb,image_last_checked_at timestamptz,image_path text,
      image_note text,representative_image_url text)
    where card.id=x.card_print_id`, [JSON.stringify(selected)]);
    updated += result.rowCount;
  }
  return updated;
}

function canaryPlan(plan) {
  const step = plan.parent_rows.length / 25;
  const parentRows = Array.from({ length: 25 }, (_, index) =>
    plan.parent_rows[Math.min(plan.parent_rows.length - 1, Math.floor(index * step))]);
  const ids = new Set(parentRows.map((row) => row.card_print_id));
  const faceRows = plan.face_rows.filter((row) => ids.has(row.card_print_id));
  return { ...plan, counts: { ...plan.counts, parent_pointers: parentRows.length,
    face_rows: faceRows.length, coverage_gaps: 0 }, parent_rows: parentRows,
  face_rows: faceRows, gap_card_print_ids: [] };
}

async function mutate(connectionString, plan, aggregate, mode) {
  const activePlan = mode === 'rollback-canary' ? canaryPlan(plan) : plan;
  const client = new Client(dbOptions(connectionString, `mtg-image-pointer-${mode}-v1`));
  await client.connect();
  let open = false;
  try {
    await client.query('begin');
    open = true;
    await client.query("set local lock_timeout='30s'");
    const locked = await captureState(client, true);
    const lockedBoundary = await boundarySnapshot(client);
    const currentPlan = buildPlan(aggregate, locked, plan.checked_at,
      plan.producer_commit, lockedBoundary);
    if (!inspectMtgImagePointerPlanV1(currentPlan).valid
      || currentPlan.pointer_plan_fingerprint_sha256 !== plan.pointer_plan_fingerprint_sha256) {
      throw new Error('Compare-and-swap pointer plan changed under lock');
    }
    const insertedFaces = await insertFaces(client, activePlan.face_rows);
    const updatedParents = await updateParents(client, activePlan.parent_rows);
    const inTransaction = await captureState(client);
    const inTransactionBoundary = await boundarySnapshot(client);
    const expected = mode === 'rollback-canary' ? activePlan : plan;
    const readbackFindings = evaluateState(expected, {
      rows: inTransaction.rows.filter((row) => expected.parent_rows.some((item) =>
        item.card_print_id === row.id) || expected.gap_card_print_ids.includes(row.id)),
      faces: inTransaction.faces.filter((row) => expected.face_rows.some((item) =>
        item.card_print_id === row.card_print_id && item.face_index === row.face_index)),
    }, inTransactionBoundary).filter((finding) => finding !== 'face_count');
    if (readbackFindings.length) throw new Error(readbackFindings.join(','));
    if (mode === 'rollback-canary') await client.query('rollback');
    else await client.query('commit');
    open = false;
    return { parent_rows_selected: activePlan.parent_rows.length,
      face_rows_selected: activePlan.face_rows.length, updated_parents: updatedParents,
      inserted_faces: insertedFaces, committed: mode === 'apply' };
  } catch (error) {
    if (open) await client.query('rollback').catch(() => {});
    throw error;
  } finally { await client.end(); }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repo = repository(args);
  const chunks = await loadChunks(args.sourceDir);
  const aggregate = buildMtgPointerAggregateV1(chunks);
  const aggregateInspection = inspectMtgPointerAggregateV1(aggregate.rows);
  if (!aggregateInspection.valid) throw new Error(aggregateInspection.findings.join(','));
  if (args.expectedAggregateFingerprint
    && aggregate.aggregate_fingerprint_sha256 !== args.expectedAggregateFingerprint) {
    throw new Error('Aggregate fingerprint mismatch');
  }
  if (args.mode === 'aggregate') {
    const summary = { status: 'complete_no_database_aggregate', repository: repo,
      aggregate_fingerprint_sha256: aggregate.aggregate_fingerprint_sha256,
      source_runs: aggregate.source_runs, counts: aggregate.counts,
      database_reads: 0, database_writes: 0, findings: [] };
    await writeArtifacts(args.outDir, { 'summary.json': summary,
      'aggregate.json.gz': gzipSync(Buffer.from(`${JSON.stringify(aggregate)}\n`)) }, repo);
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    return;
  }

  dotenv.config({ path: args.envFile, quiet: true });
  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) throw new Error('SUPABASE_DB_URL required');
  const client = new Client(dbOptions(connectionString, `mtg-image-pointer-${args.mode}-plan-v1`));
  await client.connect();
  let state;
  let boundary;
  try {
    await client.query('begin read only');
    state = await captureState(client);
    boundary = await boundarySnapshot(client);
    await client.query('commit');
  } finally { await client.end(); }
  const plan = buildPlan(aggregate, state, new Date().toISOString(), repo.commit_sha, boundary);
  const inspection = inspectMtgImagePointerPlanV1(plan);
  if (!inspection.valid) throw new Error(inspection.findings.join(','));

  if (args.mode === 'plan') {
    const summary = { status: 'pointer_plan_frozen_read_only', repository: repo,
      aggregate_fingerprint_sha256: aggregate.aggregate_fingerprint_sha256,
      pointer_plan_fingerprint_sha256: plan.pointer_plan_fingerprint_sha256,
      counts: plan.counts, findings: [], database_reads: MTG_ELIGIBLE_CARD_PRINT_COUNT,
      database_writes: 0 };
    await writeArtifacts(args.outDir, { 'summary.json': summary,
      'pointer_plan.json.gz': gzipSync(Buffer.from(`${JSON.stringify(plan)}\n`)) }, repo);
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    return;
  }

  let mutation = null;
  if (args.mode === 'rollback-canary' || args.mode === 'apply') {
    mutation = await mutate(connectionString, plan, aggregate, args.mode);
  }
  const verifyClient = new Client(dbOptions(connectionString,
    `mtg-image-pointer-${args.mode}-readback-v1`));
  await verifyClient.connect();
  let after;
  let afterBoundary;
  try {
    await verifyClient.query('begin read only');
    after = await captureState(verifyClient);
    afterBoundary = await boundarySnapshot(verifyClient);
    await verifyClient.query('commit');
  } finally { await verifyClient.end(); }
  const findings = args.mode === 'rollback-canary'
    ? [
      ...(after.faces.length !== state.faces.length ? ['canary_face_residue'] : []),
      ...(after.rows.some((row, index) => hashMtgImagePointerV1(mtgParentImageSnapshotV1(row))
        !== hashMtgImagePointerV1(mtgParentImageSnapshotV1(state.rows[index])))
        ? ['canary_parent_residue'] : []),
      ...(hashMtgImagePointerV1(afterBoundary) !== hashMtgImagePointerV1(boundary)
        ? ['canary_boundary_changed'] : []),
    ]
    : evaluateState(plan, after, afterBoundary);
  const status = findings.length ? `${args.mode}_failed`
    : args.mode === 'rollback-canary' ? 'rollback_canary_passed_zero_residue'
      : args.mode === 'apply' ? 'pointer_apply_committed_and_verified'
        : 'independent_pointer_readback_passed';
  const summary = { status, repository: repo,
    aggregate_fingerprint_sha256: aggregate.aggregate_fingerprint_sha256,
    pointer_plan_fingerprint_sha256: plan.pointer_plan_fingerprint_sha256,
    counts: plan.counts, mutation, findings,
    database_writes: args.mode === 'apply'
      ? (mutation?.updated_parents ?? 0) + (mutation?.inserted_faces ?? 0) : 0 };
  await writeArtifacts(args.outDir, { 'summary.json': summary }, repo);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  if (findings.length) throw new Error(findings.join(','));
}

await main();
