import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export function buildPublicCatalogAccessPlan({ controls, setOverrides }) {
  const targets = ['mtg', 'one_piece'];
  const mutations = targets.map(game => {
    const rows = controls.filter(c => c.game_code === game);
    assert.equal(rows.length, 1, `Missing/duplicate release control: ${game}`);
    assert.ok(['signed_in', 'public'].includes(rows[0].release_status), `Hidden catalog must not be activated: ${game}`);
    return { table: 'catalog_game_release_controls', key: { game_code: game }, expected: rows[0], release_status: 'public' };
  });
  for (const control of setOverrides) {
    if (control.release_status !== 'signed_in') continue;
    assert.ok(control.game === 'one_piece' && control.code === 'OP17' && control.set_id === '9acde490-e4e4-56ce-bffa-b437ceee413a', 'Unexpected account-gated set override; preserve and inspect');
    mutations.push({ table: 'catalog_set_release_controls', key: { set_id: control.set_id }, expected: control, release_status: 'public' });
  }
  const plan = { version: 'PUBLIC_CATALOG_ACCESS_PLAN_V1', mode: 'plan_only', project: 'ycdxbpibncqcchqiihfz',
    mutations: mutations.filter(m => m.expected.release_status !== 'public'),
    preserves: ['canonical identities', 'hidden sets', 'all other games', 'sealed release controls', 'pricing authorization', 'ownership authorization', 'all grants and RLS policies'],
    requires: ['frozen producer commit', 'fresh exact compare-and-swap preflight', 'single atomic transaction', 'anonymous set/search/card readback', 'anonymous pricing denial', 'zero-write idempotency readback'] };
  return { ...plan, fingerprint: createHash('sha256').update(JSON.stringify(plan)).digest('hex') };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const out = process.argv[2]; assert.ok(out, 'Pass the read-only artifact directory');
  const load = file => {
    const result = JSON.parse(fs.readFileSync(path.join(out, file), 'utf8'));
    assert.equal(result.project, 'ycdxbpibncqcchqiihfz'); assert.equal(result.readOnly, true); assert.equal(result.status, 201);
    return result.body[0].evidence;
  };
  const plan = buildPublicCatalogAccessPlan({ controls: load('catalog.sql.result.json').controls, setOverrides: load('finish-and-access.sql.result.json').set_override });
  fs.writeFileSync(path.join(out, 'public-catalog-access-plan.json'), JSON.stringify(plan, null, 2));
  console.log(JSON.stringify({ mutations: plan.mutations.length, fingerprint: plan.fingerprint, writesPerformed: 0 }));
}
