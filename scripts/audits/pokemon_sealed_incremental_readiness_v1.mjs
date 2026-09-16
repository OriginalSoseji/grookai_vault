import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { buildPokemonSealedIncrementalReadinessV1 } from '../../backend/pricing/pokemon_sealed_incremental_readiness_v1.mjs';
import { buildPokemonSealedWorldPlanV1, validatePokemonSealedWorldPlanV1, pokemonSealedHashV1 } from '../../backend/pricing/pokemon_sealed_world_v1.mjs';

const args = Object.fromEntries(process.argv.slice(2).map(arg => {
  const match = /^--(snapshot|out)=(.+)$/.exec(arg);
  assert.ok(match, 'Only --snapshot and --out are supported; no apply mode');
  return [match[1], match[2]];
}));
assert.ok(args.snapshot && args.out, '--snapshot and --out required');
const bytes = await fs.readFile(args.snapshot);
const snapshot = JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, ''));
const report = buildPokemonSealedIncrementalReadinessV1(snapshot);
const source = snapshot.source.filter(s => !snapshot.mappings.some(m => Number(m.source_product_id) === Number(s.product_id)));
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const patch = execFileSync('git', ['diff', '--', 'backend/pricing/pokemon_sealed_world_v1.mjs'], { encoding: 'utf8' });
const plan = buildPokemonSealedWorldPlanV1({ sourceRows: source, latestPriceRows: snapshot.prices,
  latestSync: snapshot.sync, producerCommit: commit });
const validation = validatePokemonSealedWorldPlanV1(plan);
assert.equal(validation.valid, true, validation.findings.join(','));
await fs.mkdir(args.out, { recursive: true });
const files = {
  'readiness.json': JSON.stringify(report, null, 2) + '\n',
  'candidate-plan.json.gz': gzipSync(JSON.stringify(plan)),
  'source_products.jsonl.gz': gzipSync(source.map(s => JSON.stringify(s)).join('\n') + '\n'),
  'READINESS.md': ['# Anniversary Sealed Readiness', '',
    `Observed: ${snapshot.at}. Selected: ${report.selected_count}.`,
    `Existing mappings: ${report.existing_mappings}; new identities: ${report.new_identities}.`,
    `Active paired members: ${report.active_paired_members}; changed mappings: ${report.changed_mappings}.`,
    `Fresh positive source prices: ${report.fresh_positive_prices}.`, '',
    'This is preparation, not a production apply or a claim of app visibility.',
    'The candidate plan has an existing family collision and cannot be sent to the',
    'initial hidden-lane writer. It must be reconciled by an additive writer, with',
    'all existing paired release members preserved and refresh baseline amended.', '',
    '| Product | ID | Current disposition |', '| --- | --- | --- |',
    ...report.rows.map(r => `| ${r.name.replaceAll('|', '/')} | ${r.product_id} | ${r.reasons.join('; ') || r.disposition} |`), ''].join('\n'),
  'preparation.json': JSON.stringify({ base_commit: commit, working_policy_patch_sha256: pokemonSealedHashV1(patch),
    snapshot_sha256: pokemonSealedHashV1(bytes), candidate_plan_fingerprint: plan.plan_fingerprint_sha256,
    validation, counts: plan.counts, apply_ready: false, database_writes: 0, storage_writes: 0 }, null, 2) + '\n',
};
const hashes = {};
for (const [name, value] of Object.entries(files)) {
  await fs.writeFile(path.join(args.out, name), value, { flag: 'wx' });
  hashes[name] = pokemonSealedHashV1(value);
}
await fs.writeFile(path.join(args.out, 'artifact_hashes.json'), JSON.stringify(hashes, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ selected: report.selected_count, existing: report.existing_mappings,
  active: report.active_paired_members, changed: report.changed_mappings, new: report.new_identities,
  plan_counts: plan.counts, apply_ready: false, database_writes: 0, storage_writes: 0 }));
