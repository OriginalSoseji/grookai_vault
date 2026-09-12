// Local-only dependency resolution; no mocks, source transforms or hook bypass.
import assert from 'node:assert/strict';
import {readFileSync, realpathSync} from 'node:fs';
import {createRequire, registerHooks} from 'node:module';
import {fileURLToPath, pathToFileURL} from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
const dependencyRoot = realpathSync('C:/grookai_vault_sealed_apply_baseline');
assert.equal(readFileSync(path.join(root, 'package-lock.json'), 'utf8'),
  readFileSync(path.join(dependencyRoot, 'package-lock.json'), 'utf8'), 'Dependency locks must match exactly');
const require = createRequire(path.join(dependencyRoot, 'package.json'));
for (const name of ['client', 'migra', 'schemainspect']) {
  assert.equal(JSON.parse(readFileSync(path.join(dependencyRoot, 'node_modules/@pgkit', name, 'package.json'), 'utf8')).version, '0.6.1');
}
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (/^@pgkit\/(client|migra|schemainspect)(\/|$)/.test(specifier)) {
      return {url: pathToFileURL(require.resolve(specifier)).href, shortCircuit: true};
    }
    return nextResolve(specifier, context);
  },
});
