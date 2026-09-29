import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

export async function latestReferenceAcquisitionsBySourceV1(directory) {
  const patterns = [
    /^mee_06a_pokemontcg_io_reference_evidence_.*\.json$/,
    /^mee_06b_tcgcsv_reference_evidence_.*\.json$/,
  ];
  const entries = await readdir(directory, { withFileTypes: true });
  const selected = [];
  for (const pattern of patterns) {
    const candidates = [];
    for (const entry of entries) {
      if (!entry.isFile() || !pattern.test(entry.name)) continue;
      const fullPath = path.join(directory, entry.name);
      candidates.push({ fullPath, mtimeMs: (await stat(fullPath)).mtimeMs });
    }
    candidates.sort((a, b) => b.mtimeMs - a.mtimeMs || a.fullPath.localeCompare(b.fullPath));
    if (!candidates.length) throw new Error(`Missing reference acquisition for ${pattern.source}`);
    selected.push(candidates[0].fullPath);
  }
  return selected;
}

export async function latestNormalizedReferenceArtifactV1(directory, source, {
  readJsonFile = async (file) => JSON.parse(await readFile(file, "utf8")),
} = {}) {
  const entries = await readdir(directory, { withFileTypes: true });
  const candidates = [];
  for (const entry of entries) {
    if (!entry.isFile() || !/^mee_06c_normalized_reference_evidence_.*\.json$/.test(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    const info = await stat(fullPath);
    candidates.push({ fullPath, mtimeMs: info.mtimeMs });
  }
  // Sort metadata first; retaining every historical payload can exhaust the worker.
  candidates.sort((left, right) => right.mtimeMs - left.mtimeMs);
  for (const candidate of candidates) {
    const artifact = await readJsonFile(candidate.fullPath);
    if (Object.hasOwn(artifact?.counts?.source_counts ?? {}, source)) {
      return { ...candidate, artifact };
    }
  }
  return null;
}
