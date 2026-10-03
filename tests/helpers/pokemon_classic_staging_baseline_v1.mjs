import fs from 'node:fs';
import { ARTIFACTS } from '../../backend/catalog/pokemon_classic_master_staging_v1.mjs';
import { assertClassicMasterProfiles } from '../../backend/catalog/pokemon_classic_master_profile_v1.mjs';

// Test-only pre-admission fixture: retain every current non-Classic fact. After
// source integration, remove exactly the independently profile-checked Classic
// scope in memory so additive staging remains testable. This never writes or
// qualifies production evidence and is not imported by any writer.
export function classicStagingTestBaseline() {
  const root = new URL('../../docs/audits/verified_master_set_index_v1/english_master_index_v1/', import.meta.url);
  const input = Object.fromEntries(Object.entries(ARTIFACTS).map(([key, file]) => [key, JSON.parse(fs.readFileSync(new URL(file, root)))]));
  const classic = row => ['classic-clv', 'classic-clc', 'classic-clb'].includes(row.set_key ?? row.key);
  if (!input.setsArtifact.sets.some(classic)) return input;
  assertClassicMasterProfiles(input);
  const evidence = [...input.cardsArtifact.cards, ...input.printingsArtifact.printings].filter(classic).flatMap(r => r.evidence);
  const counts = new Map();
  for (const row of evidence) counts.set(row.source_key, (counts.get(row.source_key) ?? 0) + 1);
  for (const [artifact, field] of [['setsArtifact', 'sets'], ['cardsArtifact', 'cards'], ['printingsArtifact', 'printings'], ['availabilityArtifact', 'source_availability']])
    input[artifact][field] = input[artifact][field].filter(row => !classic(row));
  input.index.summary.evidence_rows -= evidence.length;
  input.index.summary.source_overlap = input.index.summary.source_overlap.map(row => ({ ...row, evidence_rows: row.evidence_rows - (counts.get(row.source_key) ?? 0) })).filter(row => row.evidence_rows > 0);
  return input;
}
