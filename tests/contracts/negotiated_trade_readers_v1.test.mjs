import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {receipt} from '../fixtures/negotiated_trade_cases_v1.mjs';
import {emptyBook, parseBackup, receiptText, receiptHtml} from '../../apps/web/src/lib/receipts/receiptBook.mjs';
import {parseCloudWrite, openCloudReceiptBook} from '../../apps/web/src/lib/receipts/receiptCloud.mjs';
import {salesReport, reportCsv} from '../../apps/web/src/lib/sales/salesReport.mjs';
import {salesProfit} from '../../apps/web/src/lib/sales/salesProfit.mjs';
const range = {start: new Date('2026-10-07T00:00:00Z'), end: new Date('2026-10-09T00:00:00Z'), hour: d => d.getUTCHours()};
function unknown() {const r = receipt(); r.tradeIn.items[0].valueMinor = null; r.tradeIn.items[0].rateBps = null; r.tradeIn.totalValueMinor = null; return r;}
function oldTrade() {
    const r = receipt(); r.id = '22222222-2222-4222-8222-222222222222'; r.number = 'GV-20261008-22222222'; r.sourceDispositionId = null;
    r.tradeIn.version = 1; r.tradeIn.items[0].creditMinor = 600; r.tradeIn.totalCreditMinor = 600; r.tradeIn.balanceMinor = 400;
    r.payments.entries[0].amountMinor = 400; r.payments.balanceMinor = 400; r.payments.changeMinor = 100; return r;
}
function mixedBook() {
    const fixtures = JSON.parse(fs.readFileSync(new URL('../../test/fixtures/sales_purchase_web_v1.json', import.meta.url)));
    const purchase = structuredClone(fixtures.cases.find(c => c.name === 'exact receipt').args[0]);
    purchase.id = '44444444-4444-4444-8444-444444444444'; purchase.number = `GVB-${purchase.createdAt.slice(0,10).replaceAll('-','')}-44444444`;
    return {...emptyBook(), receipts: [unknown(), oldTrade(), purchase].map(receipt => ({receipt, customerId: null}))};
}
test('mixed old trade, explicit-credit trade and purchase backup retains all evidence', () => {
    const book = mixedBook();
    assert.deepEqual(parseBackup(JSON.stringify(book)), book);
    const write = parseCloudWrite({revision: 3, requestId: '55555555-5555-4555-8555-555555555555', book});
    assert.deepEqual(write.book, book);
    const bad = structuredClone(book); bad.receipts[1].receipt.tradeIn.items[0].creditMinor = 650;
    assert.throws(() => parseBackup(JSON.stringify(bad)), /Invalid trade/);
});
test('cloud read and save round-trip nullable reference with exact acknowledgement', async () => {
    const book = mixedBook();
    const seen = [];
    const cloud = await openCloudReceiptBook(async (_path, init) => {
        if (init.method === 'PUT') {const body = JSON.parse(init.body); seen.push(body); return Response.json({revision: body.revision + 1, book: body.book});}
        return Response.json({revision: 3, book});
    });
    await cloud.save(cloud.book); assert.deepEqual(seen[0].book, book);
});
test('new trade share and print omit reference, contact, notes and copy metadata', () => {
    const r = unknown(), share = receiptText(r), html = receiptHtml(r);
    assert.match(share, /\$6.50 agreed credit/); assert.match(share, /Cash change: \$1.50/);
    for (const privateText of ['PRIVATE', 'Private buyer', 'sourceDispositionId', 'rateBps', 'valueMinor']) {assert.ok(!share.includes(privateText)); assert.ok(!html.includes(privateText));}
    r.tradeIn.items[0].description = '<img src=x onerror=alert(1)>';
    assert.doesNotMatch(receiptHtml(r), /<img src=x/); assert.match(receiptHtml(r), /&lt;img/);
});
test('agreed credit is consideration and does not increase sales or fabricate profit', () => {
    const r = unknown(), data = salesReport([r], range);
    assert.equal(data.sales, 1000); assert.equal(data.credit, 650); assert.equal(data.received, 350); assert.equal(data.units, 1);
    assert.equal(data.payments.Cash, 350); assert.equal(salesProfit([r], []).knownProfitMinor, null);
    assert.match(reportCsv([r]), /"10.00","0.00","6.50","3.50"/);
    assert.doesNotMatch(reportCsv([r]), /NaN|undefined/);
});
test('malformed or future new trade snapshots cannot reach reports or backups', () => {
    for (const edit of [r => r.tradeIn.totalCreditMinor++, r => r.tradeIn.version = 3, r => r.payments.changeMinor++, r => r.tradeIn.totalValueMinor = 0]) {
        const r = unknown(); edit(r);
        assert.throws(() => parseBackup(JSON.stringify({...emptyBook(), receipts: [{receipt: r, customerId: null}]})));
        assert.throws(() => salesReport([r], range)); assert.throws(() => salesProfit([r], [])); assert.throws(() => reportCsv([r]));
    }
});
