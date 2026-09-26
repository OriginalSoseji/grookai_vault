// Offline diagnostic classification; never runs SQL or authorizes an apply.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';

export function compareStorefrontFootprints(production, replay, migrationSource) {
  const index = snapshot => {
    assert.equal(snapshot.transaction_read_only, 'on');
    assert(Array.isArray(snapshot.objects));
    const map = new Map();
    for (const item of snapshot.objects) {
      const key = `${item.kind}:${item.key}`;
      assert(!map.has(key), 'Duplicate footprint object');
      map.set(key, item.value);
    }
    return map;
  };
  const a = index(replay), b = index(production);
  const names = pattern => new Set([...migrationSource.matchAll(pattern)].map(m => m[1]));
  const tables = names(/create table public\.([a-z0-9_]+)/g);
  const functions = names(/create(?: or replace)? function public\.([a-z0-9_]+)/g);
  const triggers = names(/create trigger ([a-z0-9_]+)/g);
  const policies = names(/create policy ([a-z0-9_]+)/g);
  const additions = [], columnOrder = [], unexpected = [], delta = [];
  for (const key of [...new Set([...a.keys(), ...b.keys()])].sort()) {
    if (isDeepStrictEqual(a.get(key), b.get(key))) continue;
    const item = { key, local: a.get(key) ?? null, production: b.get(key) ?? null };
    delta.push(item);
    const colon = key.indexOf(':'), kind = key.slice(0, colon), name = key.slice(colon + 1);
    if (item.local && item.production) {
      const local = { ...item.local }, remote = { ...item.production };
      delete local.position; delete remote.position;
      if (kind === 'column' && /^public\.(card_prints|pricing_jobs|sets)\./.test(name) &&
          isDeepStrictEqual(local, remote)) columnOrder.push(key);
      else unexpected.push(key);
    } else if (!item.local) unexpected.push(key);
    else {
      const parts = name.split('.');
      const scoped = kind === 'function'
        ? parts[0] === 'public' && functions.has(parts[1].split('(')[0])
        : kind === 'trigger' ? parts[0] === 'public' && triggers.has(parts[2])
        : kind === 'policy' ? ['public','storage'].includes(parts[0]) && policies.has(parts[2])
        : ['relation','column','constraint','index'].includes(kind) &&
          parts[0] === 'public' && tables.has(parts[1]);
      (scoped ? additions : unexpected).push(key);
    }
  }
  return {
    status: unexpected.length ? 'unexplained_differences' : 'scoped_diagnostic_comparison_complete',
    applyAuthorized: false, strictPrePushPassed: false,
    productionObjects: b.size, replayObjects: a.size,
    additions, columnOrder, unexpected, delta,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = {};
  for (const arg of process.argv.slice(2)) {
    const match = arg.match(/^--(production|replay|output)=(.+)$/);
    assert(match && !args[match[1]], 'Unknown or duplicate argument');
    args[match[1]] = match[2];
  }
  assert.equal(Object.keys(args).length, 3);
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const pending = ['20260918040000','20260918070000','20260918100000'];
  const files = fs.readdirSync(path.join(root, 'supabase/migrations'))
    .filter(f => pending.some(id => f.startsWith(id + '_')));
  assert.equal(files.length, 3);
  const source = files.map(f => fs.readFileSync(path.join(root, 'supabase/migrations', f), 'utf8')).join('\n');
  const result = compareStorefrontFootprints(JSON.parse(fs.readFileSync(args.production)),
    JSON.parse(fs.readFileSync(args.replay)), source);
  fs.writeFileSync(args.output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ status: result.status, additions: result.additions.length,
    columnOrder: result.columnOrder.length, unexpected: result.unexpected.length, applyAuthorized: false }));
  if (result.unexpected.length) process.exitCode = 1;
}
