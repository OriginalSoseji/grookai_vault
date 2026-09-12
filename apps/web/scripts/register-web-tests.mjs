import { registerHooks } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import ts from 'typescript';

const source = fileURLToPath(new URL('../src/', import.meta.url));
registerHooks({
  resolve(specifier, context, nextResolve) {
    const rewritten = specifier.startsWith('@/') ? pathToFileURL(path.join(source, specifier.slice(2))).href : specifier;
    try { return nextResolve(rewritten, context); }
    catch (error) {
      if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
      for (const extension of ['.ts', '.tsx', '.js', '.mjs']) {
        try { return nextResolve(rewritten + extension, context); } catch { /* Try the next source extension. */ }
      }
      throw error;
    }
  },
  load(url, context, nextLoad) {
    if (url.startsWith('file:') && /\.(ts|tsx)$/.test(url) && !url.includes('/node_modules/')) {
      const file = fileURLToPath(url);
      if (existsSync(file)) return { format: 'module', shortCircuit: true, source: ts.transpileModule(readFileSync(file, 'utf8'), {
        fileName: file, compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
      }).outputText };
    }
    return nextLoad(url, context);
  },
});
