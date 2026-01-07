// export_border_failures_dataset.mjs
// PowerShell (Windows) example:
//   $env:SUPABASE_URL="<url>"; $env:SUPABASE_SECRET_KEY="<service_role>"; node backend/tools/export_border_failures_dataset.mjs --limit 50 --since-hours 72

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBackendClient } from '../supabase_backend_client.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseArgs(argv) {
  const out = { limit: 100, sinceHours: 72 };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--limit') {
      out.limit = Number(argv[i + 1]) || out.limit;
      i += 1;
    } else if (arg === '--since-hours') {
      out.sinceHours = Number(argv[i + 1]) || out.sinceHours;
      i += 1;
    }
  }
  return out;
}

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

async function downloadToFile(supabase, bucket, storagePath, outFile) {
  const { data, error } = await supabase.storage.from(bucket).download(storagePath);
  if (error) return { error };
  if (!data) return { error: new Error('empty_download') };
  const buf = Buffer.from(await data.arrayBuffer());
  await ensureDir(path.dirname(outFile));
  await fs.writeFile(outFile, buf);
  return { size: buf.length };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const sinceIso = new Date(Date.now() - args.sinceHours * 3600 * 1000).toISOString();
  const supabase = createBackendClient();

  console.log(`[export] fetching failed border_not_detected analyses since ${sinceIso}, limit ${args.limit}`);
  const { data: analyses, error: analysesErr } = await supabase
    .from('condition_snapshot_analyses')
    .select('snapshot_id, created_at')
    .filter('scan_quality->>analysis_status', 'eq', 'failed')
    .filter('scan_quality->>failure_reason', 'eq', 'border_not_detected')
    .gte('created_at', sinceIso)
    .order('created_at', { ascending: false })
    .limit(args.limit * 3);

  if (analysesErr) {
    throw new Error(`analyses query failed: ${analysesErr.message}`);
  }
  if (!analyses || analyses.length === 0) {
    console.log('[export] no matching analyses found');
    return;
  }

  const dedup = new Map();
  for (const row of analyses) {
    if (!dedup.has(row.snapshot_id)) {
      dedup.set(row.snapshot_id, row);
    }
    if (dedup.size >= args.limit) break;
  }

  const snapshotIds = Array.from(dedup.keys());
  console.log(`[export] snapshot count=${snapshotIds.length}`);

  const { data: snaps, error: snapsErr } = await supabase
    .from('condition_snapshots')
    .select('id, images, created_at')
    .in('id', snapshotIds);

  if (snapsErr) {
    throw new Error(`snapshots query failed: ${snapsErr.message}`);
  }

  const datasetRoot = path.join(__dirname, '..', '_datasets', 'border_not_detected');
  await ensureDir(datasetRoot);
  const manifest = [];

  for (const snap of snaps || []) {
    const images = snap.images || {};
    const bucket = images.bucket || 'condition-scans';
    const frontPath = images.front?.path ?? images.front;
    const backPath = images.back?.path ?? images.back;
    const entry = {
      snapshot_id: snap.id,
      created_at: snap.created_at,
      bucket,
      front_path: frontPath || null,
      back_path: backPath || null,
      front_saved: false,
      back_saved: false,
    };

    const faceDir = path.join(datasetRoot, snap.id);

    if (typeof frontPath === 'string' && frontPath.length > 0) {
      const outFile = path.join(faceDir, 'front.jpg');
      const dl = await downloadToFile(supabase, bucket, frontPath, outFile);
      if (!dl.error) entry.front_saved = true;
    }

    if (typeof backPath === 'string' && backPath.length > 0) {
      const outFile = path.join(faceDir, 'back.jpg');
      const dl = await downloadToFile(supabase, bucket, backPath, outFile);
      if (!dl.error) entry.back_saved = true;
    }

    manifest.push(entry);
  }

  const manifestPath = path.join(datasetRoot, 'manifest.json');
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`[export] wrote manifest ${manifestPath} (${manifest.length} entries)`);
}

main().catch((err) => {
  console.error('[export] failed', err);
  process.exit(1);
});
