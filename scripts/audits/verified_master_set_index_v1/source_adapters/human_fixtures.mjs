import fs from 'node:fs/promises';
import path from 'node:path';
import { HUMAN_SOURCE_KINDS, normalizeFinishKey } from '../shared.mjs';

const EXACT_FINISH_EVIDENCE_TYPES = new Set(['finish_presence', 'finish_absence']);
const EXCLUDED_FIXTURE_DIR_NAMES = new Set([
  // Bulk ReverseHolo acquisition is useful for discovery but too volatile as a direct
  // fixture lane. Promoted rows are carried by generated_reverseholo_preservation_v1,
  // and new reviewed rows are carried by generated_source_delta_acceptance_v1.
  'generated_reverseholo_v1',
]);

async function listJsonFilesRecursive(rootDir) {
  let entries = [];
  try {
    entries = await fs.readdir(rootDir, { withFileTypes: true });
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }

  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      if (EXCLUDED_FIXTURE_DIR_NAMES.has(entry.name)) continue;
      files.push(...await listJsonFilesRecursive(entryPath));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push(entryPath);
    }
  }
  return files.sort();
}

function assertSourceUrl(file, value) {
  if (!String(value ?? '').trim()) {
    throw new Error(`Human source fixture ${file} has an evidence row missing source_url.`);
  }
}

function validateFinishProfileEvidence(file, setConfig, record, finishKey) {
  const profile = setConfig?.finish_profile;
  if (!profile || !finishKey) return;

  const focusFinishes = new Set(profile.focus_finishes ?? []);
  const notApplicableFinishes = new Set(profile.not_applicable_finishes ?? []);

  if (notApplicableFinishes.has(finishKey) && record.evidence_type === 'finish_presence') {
    throw new Error(`Human source fixture ${file} attempts finish_presence for not-applicable finish ${finishKey}.`);
  }

  if (!focusFinishes.has(finishKey) && !notApplicableFinishes.has(finishKey)) {
    throw new Error(`Human source fixture ${file} uses finish ${finishKey}, which is not in the source-backed finish_profile.`);
  }

  if (
    record.card_number
    && record.card_name
    && finishKey
    && !EXACT_FINISH_EVIDENCE_TYPES.has(record.evidence_type)
  ) {
    return;
  }

  if (record.evidence_type === 'finish_presence' && !profile.source_backed) {
    throw new Error(`Human source fixture ${file} cannot assert exact finish_presence without a source-backed finish_profile.`);
  }
}

export async function collectHumanFixtureEvidence(setConfigs, options) {
  const files = await listJsonFilesRecursive(options.fixtureDir);
  const allowedSetKeys = new Set(setConfigs.flatMap((set) => [set.key, set.tcgdex, set.pokemontcg]));
  const setConfigByKey = new Map(setConfigs.flatMap((set) => [
    [set.key, set],
    set.tcgdex ? [set.tcgdex, set] : null,
    set.pokemontcg ? [set.pokemontcg, set] : null,
  ].filter(Boolean)));
  const records = [];

  for (const fixturePath of files) {
    const file = path.relative(options.fixtureDir, fixturePath);
    const fixture = JSON.parse(await fs.readFile(fixturePath, 'utf8'));
    if (fixture?.source_status === 'unavailable' && (!fixture.records || fixture.records.length === 0)) {
      continue;
    }
    if (!fixture?.source_url) {
      throw new Error(`Human source fixture ${file} is missing source_url.`);
    }
    if (!HUMAN_SOURCE_KINDS.has(fixture?.source_kind)) {
      throw new Error(`Human source fixture ${file} has unsupported source_kind=${fixture?.source_kind}.`);
    }
    for (const record of fixture.records ?? []) {
      const recordSetKey = record.set_key ?? fixture.set_key;
      if (!allowedSetKeys.has(recordSetKey)) continue;
      const setConfig = setConfigByKey.get(recordSetKey);
      const sourceUrl = record.source_url ?? fixture.source_url;
      const finishKey = normalizeFinishKey(record.finish_key);
      assertSourceUrl(file, sourceUrl);
      validateFinishProfileEvidence(file, setConfig, record, finishKey);

      records.push({
        source_key: record.source_key ?? fixture.source_key,
        source_kind: record.source_kind ?? fixture.source_kind,
        source_url: sourceUrl,
        set_key: recordSetKey,
        set_name: record.set_name ?? fixture.set_name,
        card_number: record.card_number,
        card_name: record.card_name,
        finish_key: finishKey,
        finish_key_raw: record.finish_key ?? null,
        rarity: record.rarity ?? null,
        evidence_type: record.evidence_type,
        evidence_label: record.evidence_text_or_label ?? record.evidence_label,
        language: 'en',
        retrieved_at: fixture.retrieved_at ?? options.retrievedAt,
        raw_snapshot_ref: fixture.raw_snapshot_ref ?? `fixture:${file}`,
        notes: record.notes ?? null,
      });
    }
  }

  return records;
}
