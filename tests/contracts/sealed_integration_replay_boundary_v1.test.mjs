import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../integration/sealed_owned_instances_v1.mjs',import.meta.url),'utf8');

test('historical migration replay strips transaction wrappers before executing twice',()=>{
  assert.match(source,/const body=stripSealedMigrationTransactionWrapperV1\(sql\);\s*await c\.query\(body\);\s*await c\.query\(body\);/);
  assert.doesNotMatch(source,/await c\.query\((?:migration|reads|revisions|sql)\);/);
});
test('rollback and exact definition comparison precede lifecycle fixtures',()=>{
  const replay=source.indexOf('const functionsBefore=');
  const rollback=source.indexOf("await c.query('rollback');",replay);
  const invariant=source.indexOf('assert.deepEqual((await c.query(functionSql)).rows,functionsBefore);');
  const fixture=source.indexOf("await c.query('insert into auth.users",invariant);
  assert.ok(replay>=0&&rollback>replay&&invariant>rollback&&fixture>invariant);
  assert.match(source.slice(replay,invariant),/finally\s*\{\s*await c\.query\('rollback'\);/);
});
