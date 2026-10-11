import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {scannedCopyId} from '../../apps/web/src/lib/sales/salesScanner.mjs';
const cases = JSON.parse(fs.readFileSync(new URL('../../test/fixtures/sales_scanner.json',import.meta.url)));
for (const row of cases) test(`scanner payload: ${row.input || 'empty'}`, () => assert.equal(scannedCopyId(row.input),row.expected));
test('scanner bounds untrusted input', () => { for(const raw of [null, undefined, {}, 'x'.repeat(1025)]) assert.equal(scannedCopyId(raw), null); });
