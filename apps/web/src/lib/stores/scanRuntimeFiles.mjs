// Next cannot discover dynamic imports made inside a disposable child process.
// Include the installed runtime dependency closure, using this build's platform.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

export function scanRuntimePackageDirectories(webRoot) {
  const found = new Map();
  function visit(name, from, optional = false) {
    const require = createRequire(path.join(from, 'package.json'));
    // Native packages may export subpaths only, without a resolvable main.
    const dir = (require.resolve.paths(name) ?? []).map(base => path.join(base, name)).find(candidate => fs.existsSync(path.join(candidate, 'package.json')));
    if (!dir) { if (optional) return; throw new Error('Cannot locate scan runtime package: ' + name); }
    const metadata = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
    if (metadata.name !== name) throw new Error('Unexpected scan runtime package.');
    if (found.has(dir)) return;
    found.set(dir, metadata.name);
    for (const dependency of Object.keys(metadata.dependencies ?? {})) visit(dependency, dir, Boolean(metadata.optionalDependencies?.[dependency]));
    for (const dependency of Object.keys(metadata.optionalDependencies ?? {})) visit(dependency, dir, true);
  }
  for (const name of ['sharp', 'tesseract.js', '@tesseract.js-data/eng', '@techstark/opencv-js']) visit(name, webRoot);
  return [...found.keys()].sort();
}
export function scanRuntimeTracePatterns(webRoot) {
  return scanRuntimePackageDirectories(webRoot).map(dir => './' + path.relative(webRoot, dir).replaceAll('\\', '/') + '/**');
}
