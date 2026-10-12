import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getPublicCardPrintIdentityAliases,
  preferCanonicalCardCandidates,
} from '../../apps/web/src/lib/cards/getPublicCardPrintIdentityAliases.ts';

const migration = fs.readFileSync(
  new URL('../../supabase/migrations/20261012010000_card_print_identity_aliases_v1.sql', import.meta.url),
  'utf8',
);
const authorityMigration = fs.readFileSync(
  new URL('../../supabase/migrations/20261012013000_card_print_identity_alias_authority_v1.sql', import.meta.url),
  'utf8',
);
const preview = fs.readFileSync(
  new URL('../../apps/web/src/lib/import/collectionPreviewV2.ts', import.meta.url),
  'utf8',
);

test('card identity aliases preserve parents and expose only a bounded visible read model', () => {
  assert.match(migration, /create table if not exists public\.card_print_identity_aliases/);
  assert.match(migration, /legacy_card_print_id uuid not null references public\.card_prints\(id\) on delete restrict/);
  assert.match(migration, /canonical_card_print_id uuid not null references public\.card_prints\(id\) on delete restrict/);
  assert.match(migration, /where active = true/);
  assert.match(migration, /v_pair_count <> 647/);
  for (const count of [25, 88, 245, 99, 180, 10]) {
    assert.match(migration, new RegExp(',' + count + '\\)'));
  }
  assert.match(migration, /card_print_identity_aliases_distinct_cards/);
  assert.match(migration, /card_print_identity_aliases_active_legacy_uidx/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /get_public_card_print_identity_aliases_v1/);
  assert.match(migration, /cardinality\(v_card_print_ids\) > 250/);
  assert.equal((migration.match(/catalog_card_print_visible_to_request_v1/g) ?? []).length, 2);
  assert.doesNotMatch(migration, /delete\s+from\s+public\.card_prints/i);
  assert.doesNotMatch(migration, /update\s+public\.(card_prints|vault_items|card_printings)/i);
});
test('active aliases require explicit source-backed authority evidence', () => {
  for (const source of [
    'pokemon_tcg_api_set_coordinate',
    'tcgdex_set_coordinate',
    'grookai_release_metadata',
  ]) {
    assert.match(authorityMigration, new RegExp(source));
  }
  assert.match(authorityMigration, /87c1916e78103667c75a5b68e1bd235dd41257852597107b2298b1d6a69fa0b7/);
  assert.match(authorityMigration, /3d558f036afb0d0080819c6976b1343018c9750585ba4ada9f6383a16823cfc4/);
  assert.match(authorityMigration, /v_updated<>647/);
  for (const count of [25, 88, 245, 99, 180, 10]) {
    assert.match(authorityMigration, new RegExp(',' + count + '\\)'));
  }
  assert.match(authorityMigration, /card_print_identity_aliases_authority_status/);
  assert.match(authorityMigration, /card_print_identity_aliases_active_authority/);
  assert.match(authorityMigration, /not active or \([\s\S]*authority_status='approved'/);
  assert.match(authorityMigration, /alias\.authority_status='approved'/);
  assert.doesNotMatch(authorityMigration, /delete\s+from\s+public\.(card_prints|vault_items|card_printings)/i);
  assert.doesNotMatch(authorityMigration, /update\s+public\.(card_prints|vault_items|card_printings)/i);
});
test('preview resolves aliases before cross-set conflicts and finish selection', () => {
  const alias = preview.indexOf('preferCanonicalCardCandidates(candidates, aliases)');
  const conflict = preview.indexOf('collectionCatalogConflictIds(candidates.map');
  const finish = preview.indexOf('const compatible = candidates.filter');
  assert.ok(alias > 0 && alias < conflict && conflict < finish);
});
test('candidate preference removes a legacy duplicate only when its canonical candidate is present', () => {
  const alias = {
    legacy_card_print_id: 'legacy',
    canonical_card_print_id: 'canonical',
    legacy_set_code: 'old',
    canonical_set_code: 'new',
  };
  assert.deepEqual(
    preferCanonicalCardCandidates([{id: 'legacy'}, {id: 'canonical'}, {id: 'variant'}], [alias]),
    [{id: 'canonical'}, {id: 'variant'}],
  );
  assert.deepEqual(preferCanonicalCardCandidates([{id: 'legacy'}], [alias]), [{id: 'legacy'}]);
});
test('alias reader chunks requests and rejects malformed rows', async () => {
  const ids = Array.from({length: 251}, (_, index) => 'id-' + index);
  const calls = [];
  const client = {rpc: async (name, args) => {
    calls.push([name, args.p_card_print_ids.length]);
    return {data: [], error: null};
  }};
  assert.deepEqual(await getPublicCardPrintIdentityAliases(client, ids), []);
  assert.deepEqual(calls, [
    ['get_public_card_print_identity_aliases_v1', 250],
    ['get_public_card_print_identity_aliases_v1', 1],
  ]);

  const malformed = {rpc: async () => ({data: [{
    legacy_card_print_id: 'outside-request',
    canonical_card_print_id: 'canonical',
    legacy_set_code: 'old',
    canonical_set_code: 'new',
  }], error: null})};
  await assert.rejects(
    getPublicCardPrintIdentityAliases(malformed, ['legacy']),
    /aliases are incomplete/,
  );
});
