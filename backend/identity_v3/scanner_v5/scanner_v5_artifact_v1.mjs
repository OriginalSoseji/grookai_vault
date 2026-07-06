import { createReadStream } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline/promises';

import { EMBEDDING_INDEX_V1, embedImageBuffer } from '../lib/embedding_index_v1.mjs';

const VECTOR_DTYPE = 'float32le';
const DEFAULT_VIEW_TYPE = 'full_card';
const PRINTED_TOTAL_SET_ALIASES = new Map([
  ['088', ['me03', 'por']],
  ['217', ['me02.5', 'asc']],
]);
const SET_CODE_ALIASES = new Map([
  ['asc', ['asc', 'me02.5']],
  ['por', ['por', 'me03']],
]);

export async function loadScannerV5Artifact(artifactDir) {
  const resolvedDir = path.resolve(artifactDir);
  const manifest = JSON.parse(await readFile(path.join(resolvedDir, 'manifest.json'), 'utf8'));
  const dimensions = positiveInt(
    manifest.storage?.vector_dimensions ?? manifest.embedding?.dimensions,
    EMBEDDING_INDEX_V1.dimensions,
  );
  const metadataByCard = await loadReferenceMetadataByCard(resolvedDir);
  const shards = new Map();
  const rowsByNumber = new Map();
  const rowsByGvId = new Map();
  const rowsByCardId = new Map();
  const setCodeVocabulary = new Set();

  for (const shardInfo of manifest.index?.shards ?? []) {
    if (shardInfo.vector_file && shardInfo.metadata_file) {
      const shard = await loadCompactShard({ artifactDir: resolvedDir, shardInfo, dimensions });
      for (const row of shard.metadataRows) {
        const extra = metadataByCard.get(row.card_id);
        if (extra) {
          row.source_path ??= extra.source_path;
          row.image_url ??= extra.image_url;
          row.image_status ??= extra.image_status;
          row.image_kind ??= extra.image_kind;
          row.image_is_representative ??= extra.image_is_representative;
        }
        indexReferenceRow({ rowsByNumber, rowsByGvId, rowsByCardId, row });
        indexSetCodeVocabulary({ setCodeVocabulary, row });
      }
      shards.set(shard.viewType, shard);
    }
  }

  return {
    artifactDir: resolvedDir,
    manifest,
    dimensions,
    shards,
    rowsByNumber,
    rowsByGvId,
    rowsByCardId,
    setCodeVocabulary: [...setCodeVocabulary].sort((a, b) => b.length - a.length || a.localeCompare(b)),
    referenceCount: rowsByCardId.size,
  };
}

export function lookupByNumber(artifact, { number, setTotal, setCodeGuess } = {}) {
  const normalizedNumber = normalizeNumber(number);
  if (!normalizedNumber) return [];
  const normalizedTotal = normalizeNumber(setTotal);
  const normalizedSet = normalizeSetCode(setCodeGuess);
  const looseRows = artifact.rowsByNumber.get(normalizedNumber) ?? [];
  return dedupeByCard(
    looseRows.filter((row) => {
      if (normalizedTotal) {
        const rowTotal = normalizeTotalFromRow(row);
        if (rowTotal && rowTotal !== normalizedTotal) return false;
        if (!rowTotal) {
          const aliases = PRINTED_TOTAL_SET_ALIASES.get(normalizedTotal);
          if (aliases?.length) {
            const rowSet = normalizeSetCode(row.set_code);
            const gvSet = normalizeSetCode(gvSetToken(row.gv_id));
            if (!aliases.includes(rowSet) && !aliases.includes(gvSet)) return false;
          }
        }
      }
      if (normalizedSet) {
        const rowSet = normalizeSetCode(row.set_code);
        const gvSet = normalizeSetCode(gvSetToken(row.gv_id));
        const setAliases = SET_CODE_ALIASES.get(normalizedSet) ?? [normalizedSet];
        if (!setAliases.includes(rowSet) && !setAliases.includes(gvSet)) return false;
      }
      return true;
    }),
  ).map((row) => publicCandidate(row));
}

export function lookupByGvId(artifact, gvId) {
  const row = artifact.rowsByGvId.get(String(gvId ?? '').trim().toUpperCase());
  return row ? publicCandidate(row) : null;
}

export async function embedAndSearchFullCard({ imageBuffer, artifact, topK = 10, model }) {
  const embedding = await embedImageBuffer(imageBuffer, { model: model ?? artifact.manifest.model });
  const candidates = searchFullCardEmbedding({
    artifact,
    queryEmbedding: embedding.embedding,
    topK,
  });
  return {
    embedding_ms: embedding.elapsed_ms,
    model: embedding.model,
    candidates,
  };
}

export function searchFullCardEmbedding({ artifact, queryEmbedding, topK = 10 }) {
  const shard = artifact.shards.get(DEFAULT_VIEW_TYPE);
  if (!shard) return [];
  const queryNorm = vectorNorm(queryEmbedding);
  const ranked = [];
  for (let rowIndex = 0; rowIndex < shard.metadataRows.length; rowIndex += 1) {
    const row = shard.metadataRows[rowIndex];
    const distance = cosineDistanceToCompact({
      query: queryEmbedding,
      queryNorm,
      shard,
      rowIndex,
    });
    ranked.push({
      ...publicCandidate(row),
      distance: round6(distance),
    });
  }
  return dedupeByCard(
    ranked.sort((a, b) => {
      if (a.distance !== b.distance) return a.distance - b.distance;
      return String(a.id).localeCompare(String(b.id));
    }),
  ).slice(0, topK).map((candidate, index) => ({
    ...candidate,
    rank: index + 1,
  }));
}

export function publicCandidate(row) {
  return {
    id: row.gv_id ?? row.card_id ?? null,
    card_id: row.card_id ?? null,
    gv_id: row.gv_id ?? null,
    name: row.name ?? null,
    set: row.set_code ?? gvSetToken(row.gv_id) ?? null,
    set_code: row.set_code ?? null,
    number: row.number ?? row.number_plain ?? null,
    image_url: row.image_url ?? null,
  };
}

function indexReferenceRow({ rowsByNumber, rowsByGvId, rowsByCardId, row }) {
  if (!row?.card_id) return;
  rowsByCardId.set(row.card_id, row);
  if (row.gv_id) rowsByGvId.set(String(row.gv_id).trim().toUpperCase(), row);
  const number = normalizeNumber(row.number ?? row.number_plain ?? numberFromGvId(row.gv_id));
  if (!number) return;
  if (!rowsByNumber.has(number)) rowsByNumber.set(number, []);
  rowsByNumber.get(number).push(row);
}

function indexSetCodeVocabulary({ setCodeVocabulary, row }) {
  for (const value of [row?.set_code, gvSetToken(row?.gv_id)]) {
    const normalized = normalizeSetCode(value);
    if (normalized) setCodeVocabulary.add(normalized);
  }
}

async function loadReferenceMetadataByCard(artifactDir) {
  try {
    const rows = await readJsonlRows(path.join(artifactDir, 'metadata.jsonl'));
    return new Map(rows.filter((row) => row?.card_id).map((row) => [row.card_id, row]));
  } catch {
    return new Map();
  }
}

async function loadCompactShard({ artifactDir, shardInfo, dimensions }) {
  const metadataRows = await readJsonlRows(path.join(artifactDir, shardInfo.metadata_file));
  const vectorBuffer = await readFile(path.join(artifactDir, shardInfo.vector_file));
  const expectedBytes = metadataRows.length * dimensions * 4;
  if (vectorBuffer.length < expectedBytes) {
    throw new Error(`scanner_v5_vector_shard_too_small:${shardInfo.view_type}`);
  }
  const vectorFloat32 = compactFloat32View(vectorBuffer);
  const vectorNorms = compactVectorNorms({
    vectorBuffer,
    vectorFloat32,
    vectorCount: metadataRows.length,
    dimensions,
  });
  return {
    viewType: shardInfo.view_type,
    vectorDtype: VECTOR_DTYPE,
    dimensions,
    metadataRows,
    vectorBuffer,
    vectorFloat32,
    vectorNorms,
  };
}

async function readJsonlRows(filePath) {
  const rows = [];
  const reader = createInterface({
    input: createReadStream(filePath, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });
  for await (const line of reader) {
    if (!line.trim()) continue;
    rows.push(JSON.parse(line));
  }
  return rows;
}

function compactFloat32View(vectorBuffer) {
  if (vectorBuffer.byteOffset % 4 !== 0 || vectorBuffer.byteLength % 4 !== 0) {
    return null;
  }
  try {
    return new Float32Array(
      vectorBuffer.buffer,
      vectorBuffer.byteOffset,
      vectorBuffer.byteLength / 4,
    );
  } catch {
    return null;
  }
}

function compactVectorNorms({ vectorBuffer, vectorFloat32, vectorCount, dimensions }) {
  const norms = new Float32Array(vectorCount);
  for (let rowIndex = 0; rowIndex < vectorCount; rowIndex += 1) {
    let squares = 0;
    const vectorOffset = rowIndex * dimensions;
    const byteOffset = vectorOffset * 4;
    for (let i = 0; i < dimensions; i += 1) {
      const value = vectorFloat32
        ? vectorFloat32[vectorOffset + i]
        : vectorBuffer.readFloatLE(byteOffset + (i * 4));
      squares += value * value;
    }
    norms[rowIndex] = squares > 0 ? Math.sqrt(squares) : 0;
  }
  return norms;
}

function cosineDistanceToCompact({ query, queryNorm, shard, rowIndex }) {
  let dot = 0;
  const dimensions = shard.dimensions;
  const vectorOffset = rowIndex * dimensions;
  const byteOffset = vectorOffset * 4;
  for (let i = 0; i < dimensions; i += 1) {
    const value = shard.vectorFloat32
      ? shard.vectorFloat32[vectorOffset + i]
      : shard.vectorBuffer.readFloatLE(byteOffset + (i * 4));
    dot += query[i] * value;
  }
  const denom = queryNorm * (shard.vectorNorms[rowIndex] || 1);
  if (!Number.isFinite(denom) || denom === 0) return 1;
  return 1 - (dot / denom);
}

function vectorNorm(vector) {
  let squares = 0;
  for (const value of vector) squares += Number(value) * Number(value);
  return Math.sqrt(squares) || 1;
}

function dedupeByCard(rows) {
  const seen = new Set();
  const out = [];
  for (const row of rows) {
    const key = row.card_id ?? row.id;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

function normalizeNumber(value) {
  const text = String(value ?? '').trim();
  if (!text) return '';
  const match = text.match(/\d+/);
  if (!match) return '';
  return String(Number.parseInt(match[0], 10)).padStart(3, '0');
}

function normalizeTotalFromRow(row) {
  const printed = String(row.number ?? '').trim();
  const slash = printed.match(/\d+\s*\/\s*(\d+)/);
  if (slash) return normalizeNumber(slash[1]);
  return '';
}

function normalizeSetCode(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9.]+/g, '');
}

function gvSetToken(gvId) {
  const text = String(gvId ?? '').trim();
  const parts = text.split('-');
  return parts.length >= 4 ? parts.slice(2, -1).join('-') : null;
}

function numberFromGvId(gvId) {
  const text = String(gvId ?? '').trim();
  const match = text.match(/-(\d{1,4})$/);
  return match?.[1] ?? null;
}

function positiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function round6(value) {
  return Number.isFinite(value) ? Math.round(value * 1_000_000) / 1_000_000 : null;
}
