import test from 'node:test';
import assert from 'node:assert/strict';
import {readOfferPresets, validateOfferPresets, offerPresetStore} from '../../apps/web/src/lib/sales/offerPresets.mjs';
const owner = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', other = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const preset = {id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', name: 'Standard cash', rateBps: 6500};
const book = presets => ({version: 1, revision: 0, presets});
function harness() {
    const data = new Map(); let active = owner; let queue = Promise.resolve();
    const storage = {getItem: key => data.get(key) ?? null, setItem: (key, value) => {data.set(key, value);}};
    const lock = (_key, run) => {const work = queue.then(run); queue = work.catch(() => {}); return work;};
    const repo = offerPresetStore(storage, owner, lock, () => active);
    return {data, storage, repo, lock, switch: () => {active = other;}};
}
test('empty settings have no implicit default; returned values cannot mutate saved snapshots', () => {
    assert.deepEqual(readOfferPresets(null), book([]));
    const original = book([{...preset, name: '  Standard cash  '}]); const value = validateOfferPresets(original);
    assert.equal(value.presets[0].name, preset.name); assert.equal(original.presets[0].name, '  Standard cash  ');
    assert.throws(() => {value.presets[0].rateBps = 100;});
});
for (const [name, value] of Object.entries({
    future: {...book([]), version: 2}, extra: {...book([]), market: true}, negativeRevision: {...book([]), revision: -1},
    zeroRate: book([{...preset, rateBps: 0}]), highRate: book([{...preset, rateBps: 10001}]), fractionalRate: book([{...preset, rateBps: 1.5}]),
    duplicate: book([preset, {...preset, id: preset.id.toUpperCase()}]), blank: book([{...preset, name: ' '}]),
    control: book([{...preset, name: 'Unsafe\nName'}]), extraField: book([{...preset, wallet: 100}]),
    overLimit: book(Array.from({length: 21}, (_, n) => ({...preset, id: `cccccccc-cccc-4ccc-8ccc-${String(n).padStart(12, '0')}`}))),
})) test(`rejects ${name} without rewriting raw settings`, () => {
    const h = harness(), raw = JSON.stringify(value); h.data.set(h.repo.key, raw);
    assert.throws(() => h.repo.read()); assert.equal(h.data.get(h.repo.key), raw);
});
test('competing edits reject a stale revision and keep the accepted preference', async () => {
    const h = harness(); const results = await Promise.allSettled([h.repo.save(0, [preset]), h.repo.save(0, [{...preset, rateBps: 7000}])]);
    assert.equal(results[0].status, 'fulfilled'); assert.equal(results[1].status, 'rejected');
    assert.equal(h.repo.read().presets[0].rateBps, 6500);
    const next = await h.repo.save(1, []); assert.equal(next.revision, 2); assert.deepEqual(next.presets, []);
});
test('queued writes reject account change and never reach another owner key', async () => {
    const h = harness(); const pending = h.repo.save(0, [preset]); h.switch();
    await assert.rejects(pending, /account changed/); assert.equal(h.data.size, 0); assert.throws(() => h.repo.read());
});
test('snapshot is captured before waiting and owner keys stay isolated', async () => {
    const h = harness(), mutable = {...preset}; const pending = h.repo.save(0, [mutable]); mutable.rateBps = 1;
    await pending; assert.equal(h.repo.read().presets[0].rateBps, 6500);
    assert.deepEqual(offerPresetStore(h.storage, other, h.lock, () => other).read().presets, []);
});
test('storage failure and false acknowledgement cannot report a saved preset', async () => {
    for (const fail of [true, false]) {
        const storage = {getItem: () => null, setItem: () => {if (fail) throw Error('disk full');}};
        const repo = offerPresetStore(storage, owner, (_key, run) => run(), () => owner);
        await assert.rejects(repo.save(0, [preset]));
    }
});
test('malformed or exhausted settings cannot be replaced by a new save', async () => {
    const h = harness(); h.data.set(h.repo.key, '{broken'); await assert.rejects(h.repo.save(0, [preset]));
    assert.equal(h.data.get(h.repo.key), '{broken');
    h.data.set(h.repo.key, JSON.stringify({...book([]), revision: 1000000000}));
    await assert.rejects(h.repo.save(1000000000, [preset]));
});
