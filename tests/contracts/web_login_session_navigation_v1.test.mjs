import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('password authentication uses a fresh document instead of pre-auth router cache',()=>{
  const source=fs.readFileSync(new URL('../../apps/web/src/app/login/page.tsx',import.meta.url),'utf8');
  assert.match(source,/await supabase\.auth\.signInWithPassword/);
  assert.match(source,/if \(signInError\) throw signInError/);
  assert.match(source,/return getSafePostAuthPath\(nextParam\)/);
  assert.match(source,/window\.location\.replace\(nextPath\)/);
  assert.doesNotMatch(source,/router\.replace\(nextPath\)/);
});
