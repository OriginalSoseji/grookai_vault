import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const req = createRequire(new URL('../../apps/web/package.json', import.meta.url)), ts = req('typescript');
function compile(text, context = {}) {
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(text, { compilerOptions: { module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022 } }).outputText, { module, exports: module.exports, Map, Set, ...context });
  return module.exports;
}
function readers(file, names, context) {
  const source = fs.readFileSync(file, 'utf8'), parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const text = parsed.statements.filter(node =>
    (ts.isFunctionDeclaration(node) && names.includes(node.name?.text)) ||
    (ts.isVariableStatement(node) && node.declarationList.declarations.some(d => names.includes(d.name.getText(parsed)))))
    .map(node => node.getText(parsed)).join('\n');
  return compile(text + `\nexport {${names.join(',')}};`, context);
}
const knownDate = { release_date: '2025-12-01', release_year: 2025,
  release_date_scope: 'individual_print', release_date_source: 'scryfall' };
const base = { id: 'known', gv_id: 'GV-MTG-SF-KNOWN', identity_domain: 'mtg_eng_paper_print',
  game_id: 'magic', name: 'Known', number: '1', set_code: 'rolling',
  games: { code: 'mtg', name: 'Magic' }, sets: { name: 'Rolling', release_date: '2020-01-01' } };
const datesFor = async (_client, rows) => new Map(rows.filter(r => r.identity_domain === 'mtg_eng_paper_print')
  .map(r => [r.id, r.id === 'known' ? knownDate : { release_date: null, release_year: null, release_date_scope: 'individual_print' }]));
function client(rows) {
  const q = { select() { return q; }, in() { return q; }, limit() { return q; },
    then(resolve) { resolve({ data: rows, error: null }); } };
  return { from() { return q; } };
}

test('display date failures retain an unknown print scope while search stays strict and other games do not request private evidence', async () => {
  let adminCalls = 0; const logs = [];
  const helper = compile(fs.readFileSync('apps/web/src/lib/cards/mtgPrintReleaseDates.ts', 'utf8'), {
    console: { error: (...args) => logs.push(args) },
    require(name) {
      if (name === 'server-only') return {};
      if (name === '@/lib/supabase/admin') return { createServerAdminClient() { adminCalls++; return {}; } };
      if (name.endsWith('mtg_print_release_service_v1.mjs')) return {
        loadMtgPrintReleaseDatesV1: async () => { throw Error('private sensitive error'); },
      };
      throw Error('Unexpected dependency: ' + name);
    },
  });
  assert.equal((await helper.getMtgCardReleaseDates({}, [{ id: 'pokemon', identity_domain: 'pokemon_eng_standard' }])).size, 0);
  assert.equal(adminCalls, 0);
  const result = await helper.getMtgCardReleaseDates({}, [base]);
  assert.equal(result.get('known').release_date, null);
  assert.equal(result.get('known').release_date_scope, 'individual_print');
  assert.ok(!JSON.stringify(logs).includes('private sensitive error'));
  await assert.rejects(helper.withMtgPrintReleaseDates({}, [{ id: 'known' }]), /private sensitive error/);
});

test('actual card detail reader uses the print date, preserves unknown and keeps non-Magic set behavior', async () => {
  for (const row of [base, { ...base, id: 'held' }, { ...base, id: 'pokemon', identity_domain: 'pokemon_eng_standard' }]) {
    const { getPublicCardByGvId: get } = readers('apps/web/src/lib/getPublicCardByGvId.ts',
      ['getPublicCardByGvId', 'getReleaseYear', 'assertCanonicalCardRouteRow'], {
        cache: fn => fn, createServerSupabase: async () => client([row]),
        getCompatiblePublicGvIdCandidates: id => [id], pickResolvedPublicGvIdRow: rows => rows[0],
        getSetDetailsByCode: async () => ({ releaseDate: '2020-01-01' }),
        resolveCardImageFieldsV1: async () => ({}), getActiveIdentityByCardPrintId: async () => null,
        getPublicCardPrintingOptions: async () => [], getPublicCardTraits: async () => null,
        getCardImageFaces: async () => undefined, getMtgCardReleaseDates: datesFor,
        mapCardPrintings: async rows => rows, getCatalogSetPresentation: () => ({ name: 'Rolling' }),
        normalizePublicSetDisplayName: value => value, resolveCollectorPrintedCoordinates: () => ({}),
        extractTcgdexExternalId: () => undefined, resolveDisplayPrintings: (_row, rows) => rows,
      });
    const result = await get(row.gv_id, { includeRelatedPrints: false, includeCameos: false });
    assert.equal(result.release_date, row.id === 'known' ? '2025-12-01' : row.id === 'held' ? undefined : '2020-01-01');
    assert.equal(result.release_date_scope, row.id === 'pokemon' ? undefined : 'individual_print');
    assert.equal(result.gv_id, row.gv_id); assert.equal(result.name, row.name);
  }
});

test('related print records use qualified dates and retain explicit unknowns alongside original identities', async () => {
  const rows = [base, { ...base, id: 'held', gv_id: 'GV-MTG-HELD' },
    { ...base, id: 'pokemon', gv_id: 'GV-PK-TEST', identity_domain: 'pokemon_eng_standard' }];
  const { mapRelatedPrints: map } = readers('apps/web/src/lib/getPublicCardByGvId.ts', ['mapRelatedPrints', 'getReleaseYear'], {
    resolveCardImageFieldsV1: async () => ({}), extractTcgdexExternalId: () => undefined,
  });
  const output = await map(rows, new Map(), await datesFor({}, rows));
  assert.deepEqual(Array.from(output, r => r.release_year), [2025, undefined, 2020]);
  assert.deepEqual(Array.from(output, r => r.gv_id), rows.map(r => r.gv_id));
});

test('actual comparison reader uses identical per-print years without replacing unknown with set launch', async () => {
  const rows = [base, { ...base, id: 'held', gv_id: 'GV-MTG-HELD' },
    { ...base, id: 'pokemon', gv_id: 'GV-PK-TEST', identity_domain: 'pokemon_eng_standard' }];
  const { getPublicCardsByGvIds: get } = readers('apps/web/src/lib/cards/getPublicCardsByGvIds.ts', ['getPublicCardsByGvIds', 'getReleaseYear'], {
    normalizeCompareCardsParam: ids => ids, getCompatiblePublicGvIdCandidates: id => [id],
    createPublicServerClient: () => client(rows),
    pickResolvedPublicGvIdRow: (candidates, id) => candidates.find(r => r.gv_id === id),
    getChildDisplayImageFallbacks: async () => new Map(), getMtgCardReleaseDates: datesFor,
    resolveCardImageFieldsV1: async () => ({}),
  });
  const output = await get(rows.map(r => r.gv_id));
  assert.deepEqual(Array.from(output, r => r.release_year), [2025, undefined, 2020]);
  assert.deepEqual(Array.from(output, r => r.gv_id), rows.map(r => r.gv_id));
});
