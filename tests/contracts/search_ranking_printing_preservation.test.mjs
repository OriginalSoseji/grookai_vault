import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import vm from 'node:vm';

const ts = createRequire(import.meta.url)('typescript');
const source = ts.createSourceFile('getExploreRows.ts', readFileSync(
  'apps/web/src/lib/explore/getExploreRows.ts', 'utf8'), ts.ScriptTarget.Latest, true);
const declaration = source.statements.find(node =>
  ts.isFunctionDeclaration(node) && node.name?.text === 'promoteDecoratedFamilyRows');
assert.ok(declaration);
const normalize = value => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const promote = vm.runInNewContext(ts.transpileModule(
  `${declaration.getText(source)}\npromoteDecoratedFamilyRows;`,
  { compilerOptions: { target: ts.ScriptTarget.ES2022 } },
).outputText, {
  getPrimaryFamilyTokensFromTokens: tokens => tokens,
  queryContainsNameDecoratorTokens: () => false,
  rowMatchesNameFamily: (name, tokens) => tokens.every(token => normalize(name).includes(token)),
  normalizeTextForMatch: normalize,
  FAMILY_DIVERSITY_PROMOTION_LIMIT: 3,
});
const query = { textTokens: ['cynthia'], normalized: 'cynthia', hasStrongDisambiguator: false };
const child = (id, name, finish) => ({ id, name, printing_gv_id: `${id}-${finish}` });

test('family ranking preserves different finishes of a promoted parent', () => {
  const rows = [child('a', 'Cynthia & Caitlin', 'holo'), child('a', 'Cynthia & Caitlin', 'reverse'),
    child('b', 'Cynthia & Caitlin', 'reverse')];
  const result = promote(rows, query);
  assert.equal(result.length, rows.length);
  assert.deepEqual(new Set(result.map(row => row.printing_gv_id)), new Set(rows.map(row => row.printing_gv_id)));
});

test('exact lead and decorated promotion keep all printings without duplicates', () => {
  const rows = [child('a', 'Cynthia', 'holo'), child('a', 'Cynthia', 'reverse'),
    child('b', 'Cynthia & Caitlin', 'holo'), child('b', 'Cynthia & Caitlin', 'reverse')];
  const result = promote(rows, query);
  assert.equal(result[0], rows[0]);
  assert.equal(result[1], rows[2]);
  assert.equal(result.length, rows.length);
  assert.deepEqual(new Set(result), new Set(rows));
});
