// Recorded external tender only. This never calls a payment processor.
export const tenderMethods = ['Cash', 'Card (external terminal)', 'Bank / payment app', 'Other'];
export function paymentSnapshot(entries, balanceMinor) {
  const fail = () => { throw Error('Payments must cover the exact balance. Only incoming cash can include change.'); };
  if (!Number.isSafeInteger(balanceMinor) || Math.abs(balanceMinor) > 100000000 || !Array.isArray(entries) || entries.length > 4) fail();
  const seen = new Set(); let applied = 0, change = 0;
  for (const e of entries) {
    if (!e || Object.keys(e).sort().join(',') !== 'amountMinor,method,tenderedMinor' || !tenderMethods.includes(e.method) || seen.has(e.method) ||
        !Number.isSafeInteger(e.amountMinor) || e.amountMinor < 1 || e.amountMinor > 100000000 ||
        !Number.isSafeInteger(e.tenderedMinor) || e.tenderedMinor < e.amountMinor || e.tenderedMinor > 100000000 ||
        (e.method !== 'Cash' || balanceMinor <= 0) && e.tenderedMinor !== e.amountMinor) fail();
    seen.add(e.method); applied += e.amountMinor; change += e.tenderedMinor - e.amountMinor;
  }
  if (applied !== Math.abs(balanceMinor) || balanceMinor === 0 && entries.length !== 0) fail();
  return {version: 1, balanceMinor, entries: entries.map(e => ({...e})), changeMinor: change};
}
export function validatePayments(value, balanceMinor, method) {
  if (!value || Object.keys(value).sort().join(',') !== 'balanceMinor,changeMinor,entries,version' || value.version !== 1 || value.balanceMinor !== balanceMinor) throw Error('Invalid payment snapshot.');
  const expected = paymentSnapshot(value.entries, balanceMinor);
  if (value.changeMinor !== expected.changeMinor || method !== paymentMethod(expected.entries)) throw Error('Payment totals do not match.');
  return expected;
}
export const paymentMethod = entries => entries.length > 1 ? 'Split payment' : entries[0]?.method ?? 'Other';
export function paymentLines(receipt, money) {
  if (!receipt.payments) return [];
  const p = validatePayments(receipt.payments, receipt.tradeIn?.balanceMinor ?? receipt.totalMinor, receipt.method);
  return [p.balanceMinor < 0 ? 'Paid to customer:' : p.balanceMinor === 0 ? 'Even trade — no money exchanged.' : 'Payment received:',
    ...p.entries.map(e => `${e.method}: ${money(e.amountMinor)}`),
    ...(p.changeMinor > 0 ? [`Cash tendered: ${money(p.entries.find(e => e.method === 'Cash').tenderedMinor)}`, `Cash change: ${money(p.changeMinor)}`] : [])];
}
export function receiptTenders(r) {
  const balance = r.tradeIn?.balanceMinor ?? r.totalMinor;
  if (!r.payments) return [{method: r.method, amountMinor: Math.abs(balance), tenderedMinor: Math.abs(balance)}];
  return validatePayments(r.payments, balance, r.method).entries;
}
