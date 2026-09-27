import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const source = fs.readFileSync(new URL('../../apps/web/src/app/founder/operations/page.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022,
} }).outputText;
const id = (index) => `00000000-0000-0000-0000-${String(index).padStart(12, '0')}`;
const row = (index) => ({ id: id(index), title: `Work item ${index}`, state: 'ready_for_review',
  summary: 'Fixture', version: 1, expires_at: '2026-10-01T00:00:00Z', scope: {}, exclusions: [] });
const window = Array.from({ length: 100 }, (_, index) => row(101 - index));

function load({ rows = window, target = row(1), denied = false, listError = null, targetError = null } = {}) {
  let authorized = false;
  let reads = 0;
  const targets = [];
  const module = { exports: {} };
  const Container = ({ children, title }) => React.createElement('section', null, title, children);
  vm.runInNewContext(compiled, { module, exports: module.exports, Date, require(name) {
    if (name === 'react/jsx-runtime') return require(name);
    if (name === 'next/link') return { default: ({ children, href }) => React.createElement('a', { href }, children) };
    if (name.startsWith('@/components/layout/')) return { default: Container };
    if (name === '@/lib/founder/requireFounderAccess') return { requireFounderAccess: async (path) => {
      assert.equal(path, '/founder/operations');
      if (denied) throw Error('Founder access denied');
      authorized = true;
    } };
    if (name === '@/lib/supabase/admin') return { createServerAdminClient() {
      assert.equal(authorized, true, 'authorize before any privileged client');
      return { from(table) {
        reads++;
        assert.equal(table, 'founder_work_items');
        const query = {
          select(fields) { assert.ok(fields.includes('operations_agents')); return query; },
          order() { return query; },
          async limit(count) { assert.equal(count, 100); return { data: rows, error: listError }; },
          eq(column, value) { assert.equal(column, 'id'); targets.push(value); return query; },
          async maybeSingle() { return { data: target, error: targetError }; },
        };
        return query;
      } };
    } };
    throw Error(`Unexpected import: ${name}`);
  } });
  return { async render(targetId) { return renderToStaticMarkup(await module.exports.default({ searchParams: Promise.resolve({ work_item_id: targetId }) })); }, targets, reads: () => reads };
}

test('old target outside 100 rows is read directly, first and exactly once', async () => {
  const page = load();
  const html = await page.render(id(1));
  assert.deepEqual(page.targets, [id(1)]);
  assert.equal((html.match(/<article/g) ?? []).length, 101);
  assert.ok(html.indexOf('Work item 1</h2>') < html.indexOf('Work item 101</h2>'));
  assert.equal((html.match(/Work item 1<\/h2>/g) ?? []).length, 1);
});
test('already loaded target is focused without duplicate lookup', async () => {
  const page = load();
  const html = await page.render([id(50), id(1)]);
  assert.deepEqual(page.targets, []);
  assert.equal((html.match(/<article/g) ?? []).length, 100);
  assert.ok(html.indexOf('Work item 50</h2>') < html.indexOf('Work item 101</h2>'));
});
test('missing target is explicit while the queue stays visible', async () => {
  const page = load({ target: null });
  const html = await page.render(id(1));
  assert.ok(html.includes('The linked work item is unavailable.'));
  assert.ok(html.includes('Work item 101'));
});
test('failed target read is distinguishable from missing', async () => {
  const page = load({ target: null, targetError: { message: 'Fixture outage' } });
  assert.ok((await page.render(id(1))).includes('Refresh to try again.'));
});
test('malformed link does not issue an unbounded or malformed target query', async () => {
  const page = load();
  assert.ok((await page.render('invalid-id')).includes('This work item link is invalid.'));
  assert.deepEqual(page.targets, []);
});
test('list errors remain visible without starting another reader', async () => {
  const page = load({ rows: null, listError: { message: 'Fixture unavailable' } });
  assert.ok((await page.render(id(1))).includes('Fixture unavailable'));
  assert.equal(page.reads(), 1);
});
test('guest or collector denial happens before privileged reads', async () => {
  const page = load({ denied: true });
  await assert.rejects(page.render(id(1)), /Founder access denied/);
  assert.equal(page.reads(), 0);
});
test('normal queue remains bounded with no extra lookup', async () => {
  const page = load();
  const html = await page.render(undefined);
  assert.equal((html.match(/<article/g) ?? []).length, 100);
  assert.deepEqual(page.targets, []);
});
