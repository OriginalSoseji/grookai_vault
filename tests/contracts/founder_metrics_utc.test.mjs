import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const source = fs.readFileSync(new URL('../../apps/web/src/app/founder/metrics/page.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

function fixturePage(rollups, denied = false) {
  let authorized = false;
  let reads = 0;
  const Container = ({ children, title, description, actions }) => React.createElement('section', null, title, description, children, actions);
  const module = { exports: {} };
  vm.runInNewContext(compiled, { module, exports: module.exports, Date, require(id) {
    if (id === 'react/jsx-runtime') return require(id);
    if (id === 'next/link') return { default: Container };
    if (id === '@/lib/founder/requireFounderAccess') return { requireFounderAccess: async (route) => {
      assert.equal(route, '/founder/metrics');
      if (denied) throw new Error('fixture founder access denied');
      authorized = true;
    } };
    if (id === '@/lib/supabase/admin') return { createServerAdminClient: () => {
      assert.equal(authorized, true, 'access must be checked before creating the admin reader');
      return { from(table) {
        assert.ok(['north_star_weekly_rollups', 'north_star_weekly_breakdowns', 'notification_type_delivery_recommendations'].includes(table));
        reads++;
        const query = { select: () => query, order: () => query, limit: async () => ({ data: table === 'north_star_weekly_rollups' ? rollups : [], error: null }) };
        return query;
      } };
    } };
    if (id === '@/components/founder/WarehouseReviewPrimitives') return { WarehouseBadge: Container };
    if (id.startsWith('@/components/layout/')) return { default: Container };
    throw new Error(`Unexpected import: ${id}`);
  } });
  return { render: async () => renderToStaticMarkup(await module.exports.default()), reads: () => reads };
}

const windows = [
  ['2026-09-14', '2026-09-21', 'Sep 14, 2026', 'Sep 21, 2026'],
  ['2026-03-09', '2026-03-16', 'Mar 9, 2026', 'Mar 16, 2026'],
  ['2026-11-02', '2026-11-09', 'Nov 2, 2026', 'Nov 9, 2026'],
  ['2026-12-28', '2027-01-04', 'Dec 28, 2026', 'Jan 4, 2027'],
];

for (const timezone of ['UTC', 'America/Denver', 'America/Los_Angeles', 'Asia/Tokyo', 'Pacific/Kiritimati']) {
  test(`actual metrics page retains UTC reporting dates on a ${timezone} server`, async () => {
    const previous = process.env.TZ;
    process.env.TZ = timezone;
    try {
      // Prove the test changed the host default, including a negative-offset day shift.
      if (timezone === 'America/Denver') assert.equal(new Date('2026-09-14T00:00:00Z').getDate(), 13);
      for (const [start, end, startLabel, endLabel] of windows) {
        const fixture = [{ week_start: start, week_end: end, source_window_start: `${start}T00:00:00+00:00`, source_window_end: `${end}T00:00:00Z`, generated_at: `${end}T23:30:00Z` }];
        const before = JSON.stringify(fixture);
        const page = fixturePage(fixture);
        const html = await page.render();
        const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
        assert.ok(text.includes(`Latest week: ${startLabel}`), text.slice(0, 450));
        assert.ok(text.includes(`Completed UTC week ${startLabel} through ${endLabel}.`));
        const history = text.slice(text.indexOf('Rollup History'));
        assert.ok(history.includes(startLabel), 'history week stays in UTC');
        assert.ok(history.includes(endLabel), 'generated date stays in UTC, even on positive-offset servers');
        assert.equal(page.reads(), 3);
        assert.equal(JSON.stringify(fixture), before, 'presentation must not change stored boundaries');
      }
    } finally {
      if (previous === undefined) delete process.env.TZ;
      else process.env.TZ = previous;
    }
  });
}

test('founder access denial prevents all metric reads', async () => {
  const page = fixturePage([], true);
  await assert.rejects(page.render(), /founder access denied/);
  assert.equal(page.reads(), 0);
});
