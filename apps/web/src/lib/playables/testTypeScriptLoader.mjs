import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';

const src = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const modules = new Map();
export function loadTestTypeScript(relative) {
  const file = path.resolve(src, relative);
  if (modules.has(file)) return modules.get(file).exports;
  const testModule = {exports: {}};
  modules.set(file, testModule);
  const require = createRequire(file);
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  }}).outputText;
  const resolve = specifier => {
    if (!specifier.startsWith('@/') && !specifier.startsWith('.')) return require(specifier);
    const base = specifier.startsWith('@/') ? path.join(src, specifier.slice(2)) : path.resolve(path.dirname(file), specifier);
    const target = [base, `${base}.ts`, `${base}.tsx`].find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
    if (!target) throw Error(`Missing test dependency ${specifier}`);
    return target.endsWith('.json') ? require(target) : loadTestTypeScript(path.relative(src, target));
  };
  vm.runInNewContext(source, {module: testModule, exports: testModule.exports, require: resolve,
    URL, URLSearchParams, Map, Set, Date, Promise, Buffer, console, process, performance, AbortController, AbortSignal});
  return testModule.exports;
}
