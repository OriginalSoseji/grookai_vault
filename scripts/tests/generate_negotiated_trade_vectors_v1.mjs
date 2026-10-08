import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as model from '../../apps/web/src/lib/sales/negotiatedTrade.mjs';
import {cases} from '../../tests/fixtures/negotiated_trade_cases_v1.mjs';
const source = new URL('../../apps/web/src/lib/sales/negotiatedTrade.mjs', import.meta.url);
const vectors = cases.map(row => {
    let expected;
    try {expected = {ok: true, value: model[row.fn](...row.args)};} catch {expected = {ok: false};}
    if (expected.ok !== row.valid) throw Error('Declared expectation failed: ' + row.name);
    return {name: row.name, fn: row.fn, args: row.args, expected};
});
fs.writeFileSync(new URL('../../test/fixtures/negotiated_trade_web_v1.json', import.meta.url), JSON.stringify({sourceSha256: createHash('sha256').update(fs.readFileSync(source)).digest('hex'), cases: vectors}, null, 2) + '\n');
console.log(JSON.stringify({cases: vectors.length}));
