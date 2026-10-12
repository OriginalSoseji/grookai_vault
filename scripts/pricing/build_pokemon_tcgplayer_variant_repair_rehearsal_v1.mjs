import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { buildPokemonTcgplayerVariantRepairRehearsalV1 } from
  '../../backend/pricing/pokemon_tcgplayer_variant_repair_rehearsal_v1.mjs';

const root = process.cwd();
const read = async relative => fs.readFile(path.join(root, relative));
const json = async relative => JSON.parse(await read(relative));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

const paths = {
  authority: 'docs/audits/pricing/pokemon_tcgplayer_variant_repair_20261012/batch_02/authority.json',
  snapshot: 'artifacts/pokemon_tcgplayer_identity_repair_20261012/batch_01/next_variant_structure_readonly.json',
  gymProducts: 'docs/audits/pricing/pokemon_tcgplayer_identity_repair_20261012/batch_01/authority/gym2/sources/1440-products.json',
  historical: 'docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_pkg10bb_first_edition_parent_identity_bulk_real_apply_v1.json',
  output: 'docs/audits/pricing/pokemon_tcgplayer_variant_repair_20261012/batch_02/rehearsal.json',
};

const [authority, snapshotBytes, gymProductBytes, historical] = await Promise.all([
  json(paths.authority), read(paths.snapshot), read(paths.gymProducts), json(paths.historical),
]);
for (const evidence of authority.evidence) {
  const bytes = await read(evidence.path);
  if (sha256(bytes) !== evidence.sha256) {
    throw new Error(`authority evidence drift: ${evidence.path}`);
  }
}
const snapshot = JSON.parse(snapshotBytes);
const gymProductPayload = JSON.parse(gymProductBytes);
const gymProductRows = gymProductPayload.results
  .filter(row => [85720, 85721].includes(row.productId))
  .map(row => ({
    product_id: row.productId,
    product_sha256: sha256(JSON.stringify(row)),
  }));
const historicalParents = historical.inserted_rows.parent_rows.filter(row =>
  row.set_code === 'gym2' && ['75', '76'].includes(row.number));
const historicalChildren = historical.inserted_rows.child_rows.filter(row =>
  row.set_code === 'gym2' && ['75', '76'].includes(row.number));
const historicalGymIds = [
  ...historicalParents.map(row => row.id),
  ...historicalChildren.map(row => row.id),
];

const result = buildPokemonTcgplayerVariantRepairRehearsalV1({
  authority,
  snapshot,
  snapshotSha256: sha256(snapshotBytes),
  gymProducts: {
    source_payload_sha256: sha256(gymProductBytes),
    rows: gymProductRows,
  },
  historicalGymIds,
});
const output = path.join(root, paths.output);
await fs.mkdir(path.dirname(output), { recursive: true });
await fs.writeFile(output, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({
  output: paths.output,
  rehearsal_fingerprint: result.rehearsal_fingerprint,
  covered_price_observations: result.combined_read_only_price_evaluation.length,
  production_database_writes: result.production_database_writes,
  pricing_publication_writes: result.pricing_publication_writes,
}, null, 2));
