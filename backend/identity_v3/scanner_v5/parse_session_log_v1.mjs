import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function parseArgs(argv) {
  const args = {
    input: null,
    out: null,
    help: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const raw = argv[i];
    const [name, inline] = raw.includes('=') ? raw.split(/=(.*)/s, 2) : [raw, null];
    const next = () => {
      if (inline !== null) return inline;
      i += 1;
      return argv[i] ?? '';
    };
    if (name === '--out') args.out = next() || null;
    else if (name === '--help' || name === '-h') args.help = true;
    else if (!args.input) args.input = raw;
  }
  return args;
}

function usage() {
  return [
    'Usage:',
    '  node backend/identity_v3/scanner_v5/parse_session_log_v1.mjs <session-log.jsonl|json> [--out summary.json]',
    '',
    'Input can be JSONL, a JSON array, or an object with rows/events/scans.',
  ].join('\n');
}

async function readEvents(inputPath) {
  const text = await readFile(path.resolve(inputPath), 'utf8');
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed;
      for (const key of ['rows', 'events', 'scans', 'session']) {
        if (Array.isArray(parsed?.[key])) return parsed[key];
      }
      return [parsed];
    } catch (error) {
      if (trimmed.startsWith('[')) throw error;
    }
  }
  return trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function summarize(events) {
  const scans = events
    .map(normalizeEvent)
    .filter((event) => event.scan_id || event.mode || event.confirmed_gv_id || event.confirmed_card_id);
  const modeCounts = new Map();
  const nonRank1 = [];
  const rows = [];

  for (const scan of scans) {
    modeCounts.set(scan.mode ?? 'unknown', (modeCounts.get(scan.mode ?? 'unknown') ?? 0) + 1);
    if (scan.confirmed_rank != null && scan.confirmed_rank !== 1) nonRank1.push(scan);
    rows.push(scan);
  }

  const latencies = rows
    .map((row) => row.shutter_to_confirm_ms)
    .filter((value) => Number.isFinite(value));
  const retakes = rows
    .map((row) => row.retakes)
    .filter((value) => Number.isFinite(value));

  return {
    generated_at: new Date().toISOString(),
    scan_count: rows.length,
    mode_counts: Object.fromEntries([...modeCounts.entries()].sort((a, b) => a[0].localeCompare(b[0]))),
    confirmed_rank_not_1_count: nonRank1.length,
    average_retakes: average(retakes),
    shutter_to_confirm_ms: {
      p50: percentile(latencies, 0.5),
      p90: percentile(latencies, 0.9),
      max: latencies.length ? Math.max(...latencies) : null,
    },
    non_rank_1_confirmations: nonRank1.map((row) => ({
      session_id: row.session_id,
      scan_id: row.scan_id,
      mode: row.mode,
      confirmed_rank: row.confirmed_rank,
      confirmed_gv_id: row.confirmed_gv_id,
      confirmed_card_id: row.confirmed_card_id,
      top_candidate: row.top_candidate,
    })),
    rows,
  };
}

function normalizeEvent(event) {
  const candidates = Array.isArray(event?.candidates)
    ? event.candidates
    : Array.isArray(event?.response?.candidates)
      ? event.response.candidates
      : Array.isArray(event?.result?.candidates)
        ? event.result.candidates
      : [];
  const response = event?.response ?? event?.result ?? {};
  const confirmedRank = numberOrNull(
    event?.confirmed_rank ??
    event?.confirmedRank ??
    event?.confirmation?.rank ??
    rankForConfirmedCandidate({ event, candidates }),
  );
  const shutterMs = timestampOrMs(event?.shutter_ms ?? event?.shutterAtMs ?? event?.shutter_at ?? event?.shutterAt);
  const confirmMs = timestampOrMs(event?.confirm_ms ?? event?.confirmedAtMs ?? event?.confirmed_at ?? event?.confirmedAt);
  return {
    session_id: stringOrNull(event?.session_id ?? event?.sessionId),
    scan_id: stringOrNull(
      event?.scan_id ??
      event?.scanId ??
      event?.request_id ??
      event?.requestId ??
      response?.request_id ??
      response?.requestId,
    ),
    mode: stringOrNull(event?.mode ?? response?.mode),
    ocr: response?.ocr ?? event?.ocr ?? null,
    rectification: response?.rectification ?? event?.rectification ?? null,
    upload_debug_path: stringOrNull(response?.upload_debug_path ?? event?.upload_debug_path),
    rectified_debug_path: stringOrNull(response?.rectified_debug_path ?? event?.rectified_debug_path),
    ocr_debug_dir: stringOrNull(response?.ocr_debug_dir ?? event?.ocr_debug_dir),
    confirmed_rank: confirmedRank,
    retakes: numberOrNull(event?.retakes ?? event?.retake_count ?? event?.retakeCount) ?? 0,
    shutter_to_confirm_ms: Number.isFinite(shutterMs) && Number.isFinite(confirmMs)
      ? Math.max(0, Math.round(confirmMs - shutterMs))
      : numberOrNull(event?.shutter_to_confirm_ms ?? event?.shutterToConfirmMs),
    confirmed_gv_id: stringOrNull(
      event?.confirmed_gv_id ??
      event?.confirmedGvId ??
      event?.confirmation?.gv_id ??
      event?.confirmation?.gvId,
    ),
    confirmed_card_id: stringOrNull(
      event?.confirmed_card_id ??
      event?.confirmedCardId ??
      event?.confirmation?.card_id ??
      event?.confirmation?.cardId,
    ),
    top_candidate: normalizeCandidate(candidates[0]),
    candidate_count: candidates.length,
    candidates: candidates.map(normalizeCandidate),
  };
}

function rankForConfirmedCandidate({ event, candidates }) {
  const confirmedGvId = stringOrNull(event?.confirmed_gv_id ?? event?.confirmedGvId ?? event?.confirmation?.gv_id);
  const confirmedCardId = stringOrNull(event?.confirmed_card_id ?? event?.confirmedCardId ?? event?.confirmation?.card_id);
  if (!confirmedGvId && !confirmedCardId) return null;
  const match = candidates.find((candidate) => {
    const gvId = stringOrNull(candidate?.gv_id ?? candidate?.gvId ?? candidate?.id);
    const cardId = stringOrNull(candidate?.card_id ?? candidate?.cardId);
    return (confirmedGvId && gvId === confirmedGvId) || (confirmedCardId && cardId === confirmedCardId);
  });
  return match?.rank ?? (match ? candidates.indexOf(match) + 1 : null);
}

function normalizeCandidate(candidate) {
  if (!candidate) return null;
  return {
    rank: numberOrNull(candidate.rank),
    gv_id: stringOrNull(candidate.gv_id ?? candidate.gvId ?? candidate.id),
    card_id: stringOrNull(candidate.card_id ?? candidate.cardId),
    name: stringOrNull(candidate.display_name ?? candidate.name),
    mode: stringOrNull(candidate.mode),
  };
}

function timestampOrMs(value) {
  if (value == null) return null;
  const number = Number(value);
  if (Number.isFinite(number)) return number;
  const dateMs = Date.parse(String(value));
  return Number.isFinite(dateMs) ? dateMs : null;
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function stringOrNull(value) {
  const text = String(value ?? '').trim();
  return text ? text : null;
}

function average(values) {
  if (!values.length) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 1000) / 1000;
}

function percentile(values, fraction) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * fraction) - 1));
  return sorted[index];
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.input) {
    console.log(usage());
    process.exitCode = args.help ? 0 : 1;
    return;
  }
  const events = await readEvents(args.input);
  const summary = summarize(events);
  const body = JSON.stringify(summary, null, 2);
  if (args.out) {
    await mkdir(path.dirname(path.resolve(args.out)), { recursive: true });
    await writeFile(path.resolve(args.out), body);
  }
  console.log(body);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error?.stack || error?.message || String(error));
    process.exitCode = 1;
  });
}
