// Export-sized writer proof in the qualified local upgrade lab. All writes roll
// back; this neither migrates/resets a lab nor consumes a physical-device fixture.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

test('export-sized Collectr writer preserves source and exact copies on retry', {
  skip: process.env.GV_COLLECTR_SCALE_PROOF !== '1', timeout: 180000,
}, async () => {
  const root = path.resolve(import.meta.dirname, '../..');
  assert.equal(root.replaceAll('\\', '/'), 'C:/gv_collectr_import_20260930');
  const out = 'C:/grookai_vault_operator_artifacts/collectr_iphone_import_20260929';
  const fixture = out + '/upgrade-410';
  const project = 'collectr-import-upgrade-410-20260930';
  const sha = value => createHash('sha256').update(value).digest('hex');
  const freeze = JSON.parse(fs.readFileSync(fixture + '/freeze.json'));
  assert.equal(freeze.project, project);
  assert.equal(Object.keys(freeze.sourceHashes).length, 410);
  assert.ok(!fs.existsSync(fixture + '/supabase/.temp/project-ref'));
  assert.equal(sha(fs.readFileSync(fixture + '/supabase/config.toml')), freeze.configSha256);
  for (const [name, hash] of Object.entries(freeze.sourceHashes)) {
    assert.equal(sha(fs.readFileSync(root + '/supabase/migrations/' + name)), hash);
    assert.equal(sha(fs.readFileSync(fixture + '/supabase/migrations/' + name)), hash);
  }
  const inspect = (...args) => JSON.parse(execFileSync('docker', args, { encoding: 'utf8', windowsHide: true }));
  assert.equal(inspect('network', 'inspect', project)[0].Internal, true);
  assert.deepEqual(Object.keys(inspect('inspect', 'supabase_db_' + project)[0].NetworkSettings.Networks), [project]);
  for (const binding of Object.values(inspect('inspect', project + '-relay')[0].NetworkSettings.Ports).flat()) {
    assert.equal(binding.HostIp, '127.0.0.1');
  }
  const require = createRequire(path.join(root, 'package.json'));
  const { Client } = require('pg');
  const db = new Client({ host: '127.0.0.1', port: 58240, user: 'postgres', password: 'postgres', database: 'postgres', statement_timeout: 60000 });
  const run = out + '/scale-v2-' + Date.now();
  fs.mkdirSync(run);
  fs.writeFileSync(run + '/intent.json', JSON.stringify({ project, scope: 'rollback-only synthetic export', sourceHash: sha(fs.readFileSync(import.meta.filename)), at: new Date().toISOString() }), { flag: 'wx' });
  await db.connect();
  const tables = ['vault_collection_import_documents_v2', 'vault_collection_import_groups_v2', 'vault_collection_import_receipts_v2', 'vault_item_instances', 'vault_items', 'vault_owners'];
  const snapshot = async () => {
    const rows = {};
    for (const name of tables) rows[name] = (await db.query('select * from public.' + name + ' order by 1,2')).rows;
    return rows;
  };
  let inTransaction = false;
  try {
    assert.equal((await db.query('show max_worker_processes')).rows[0].max_worker_processes, '0');
    assert.deepEqual((await db.query('select version from supabase_migrations.schema_migrations order by version')).rows.map(r => r.version), Object.keys(freeze.sourceHashes).sort().map(n => n.split('_')[0]));
    const before = await snapshot();
    const user = randomUUID(), set = randomUUID();
    const cards = Array.from({ length: 400 }, (_, index) => ({ id: randomUUID(), name: 'Scale fixture ' + index, number: String(index + 1), gv_id: 'GV-PK-SCALE-' + randomUUID() }));
    const printings = cards.flatMap(card => ['reverse', 'holo'].map(finish_key => ({ id: randomUUID(), card_print_id: card.id, finish_key })));
    const source = [], targets = [];
    for (let i = 0; i < 1872; i++) {
      const ready = i < 799, quantity = ready ? (i < 140 ? 2 : 1) : (i < 1066 ? 2 : 1);
      const card = cards[i % 400], finish = i < 400 ? 'reverse' : 'holo';
      const printing = printings.find(p => p.card_print_id === card.id && p.finish_key === finish);
      source.push({ 'Product Name': card.name, Category: 'Pokemon', Set: 'Scale fixture', 'Card Number': card.number, Variance: finish === 'reverse' ? 'Reverse Holofoil' : 'Holofoil', Grade: !ready && i < 863 ? 'PSA 10' : 'Ungraded', Quantity: String(quantity), 'Card Condition': 'LP', 'Average Cost Paid': '4.25', 'Price Override': '0', 'Portfolio Name': 'Private fixture', Notes: 'Source row ' + i });
      if (ready) targets.push({ sourceIndices: [i], cardId: card.id, gvId: card.gv_id, cardPrintingId: printing.id, finishKey: finish, desiredQuantity: quantity, condition: 'LP', acquisitionCost: 4.25, createdAt: null, notes: 'Source row ' + i });
    }
    assert.equal(source.reduce((sum, row) => sum + Number(row.Quantity), 0), 2279);
    assert.equal(targets.reduce((sum, row) => sum + row.desiredQuantity, 0), 939);
    const sourceJson = JSON.stringify(source), targetJson = JSON.stringify(targets), fileHash = sha(sourceJson);
    assert.ok(Buffer.byteLength(sourceJson + targetJson) < 2097152);
    await db.query('begin'); inTransaction = true;
    await db.query("insert into auth.users(id,aud,role,email) values($1,'authenticated','authenticated',$2)", [user, user + '@collectr-scale.invalid']);
    await db.query("insert into sets(id,code,name,game) values($1::uuid,$1::text,'Scale fixture','pokemon')", [set]);
    await db.query("insert into card_prints(id,set_id,name,number,gv_id,game_id) select x.id,$1,x.name,x.number,x.gv_id,(select id from games where code='pokemon') from jsonb_to_recordset($2) as x(id uuid,name text,number text,gv_id text)", [set, JSON.stringify(cards)]);
    await db.query('insert into card_printings(id,card_print_id,finish_key) select * from jsonb_to_recordset($1) as x(id uuid,card_print_id uuid,finish_key text)', [JSON.stringify(printings)]);
    const save = async request => (await db.query('select admin_import_vault_collection_v2($1,$2,$3,$4,$5) as result', [user, request, fileHash, sourceJson, targetJson])).rows[0].result;
    const request = randomUUID(), started = performance.now();
    const first = await save(request), saveMs = Math.round(performance.now() - started);
    assert.equal(first.success, true, JSON.stringify(first));
    assert.equal(first.importedCards, 939); assert.equal(first.importedEntries, 799); assert.equal(first.reviewRows, 1073);
    assert.equal(first.targets.length, 799);
    assert.equal(new Set(first.targets.flatMap(group => group.instanceIds)).size, 939);
    const copies = (await db.query('select id,card_print_id,card_printing_id,condition_label,acquisition_cost,notes,is_graded from vault_item_instances where user_id=$1 order by id', [user])).rows;
    assert.equal(copies.length, 939);
    const byId = new Map(copies.map(copy => [copy.id, copy]));
    for (const group of first.targets) {
      const expected = targets[group.sourceIndices[0]];
      assert.equal(group.instanceIds.length, expected.desiredQuantity);
      for (const id of group.instanceIds) {
        const copy = byId.get(id); assert.ok(copy);
        assert.equal(copy.card_print_id, expected.cardId); assert.equal(copy.card_printing_id, expected.cardPrintingId);
        assert.equal(copy.condition_label, 'LP'); assert.equal(Number(copy.acquisition_cost), 4.25);
        assert.equal(copy.notes, expected.notes); assert.notEqual(copy.is_graded, true);
      }
    }
    assert.deepEqual((await db.query('select source_rows from vault_collection_import_documents_v2 where user_id=$1', [user])).rows[0].source_rows, source);
    assert.deepEqual(await save(request), first);
    const retryStarted = performance.now(), reopened = await save(randomUUID());
    const reopenMs = Math.round(performance.now() - retryStarted);
    assert.equal(reopened.success, true); assert.equal(reopened.importedCards, 0); assert.equal(reopened.reviewRows, 1073);
    assert.deepEqual((await db.query('select id,card_print_id,card_printing_id,condition_label,acquisition_cost,notes,is_graded from vault_item_instances where user_id=$1 order by id', [user])).rows, copies);
    await db.query('rollback'); inTransaction = false;
    assert.deepEqual(await snapshot(), before);
    assert.equal((await db.query('select id from auth.users where id=$1', [user])).rows.length, 0);
    assert.equal((await db.query('select id from sets where id=$1', [set])).rows.length, 0);
    const result = { status: 'passed', kind: 'SQL-only rollback scale proof; not phone or hosted Edge acceptance', sourceRows: 1872, sourceQuantity: 2279, groups: 799, copies: 939, reviewRows: 1073, saveMs, reopenMs, priorRowsUnchanged: true, productionWrites: 0 };
    fs.writeFileSync(run + '/result.json', JSON.stringify(result, null, 2), { flag: 'wx' });
    console.log(JSON.stringify(result));
  } finally {
    if (inTransaction) await db.query('rollback');
    await db.end();
  }
});
