// Draft estimates only. Authenticated database writers validate final amounts.
export const conditions = ['NM', 'LP', 'MP', 'HP', 'DMG'];
export const methods = ['Cash', 'Card (external terminal)', 'Bank / payment app', 'Other'];
const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const text = (value, limit) => typeof value === 'string' && value.length <= limit;
const integer = (value, min, max) => Number.isSafeInteger(value) && value >= min && value <= max;
const customerValid = c => c && text(c.name, 120) && text(c.email, 254) && text(c.phone, 40) && text(c.wants, 1000) && text(c.notes, 2000);
function draftValid(d) {
    return d && uuid(d.id) && text(d.label, 120) && text(d.storeName, 120) && text(d.note, 500) &&
        methods.includes(d.method) && integer(d.taxMinor, 0, 100000000) && (d.customerId === null || uuid(d.customerId)) && customerValid(d.customer) &&
        Array.isArray(d.items) && d.items.length <= 50 && d.items.every(l => text(l.description, 200) && integer(l.unitMinor, 1, 100000000) && integer(l.quantity, 1, 999) && (!l.instanceId || uuid(l.instanceId) && l.quantity === 1)) &&
        Array.isArray(d.trades) && d.trades.length <= 50 && d.trades.every(t => text(t.description, 200) && integer(t.valueMinor, 1, 100000000) && integer(t.quantity, 1, 999) && integer(t.rateBps, 1, 10000));
}
function validateJournal(b) {
    if (!b || b.version !== 2 || !integer(b.revision, 0, Number.MAX_SAFE_INTEGER - 1) || !Array.isArray(b.drafts) || b.drafts.length > 20 ||
        !b.drafts.every(draftValid) || new Set(b.drafts.map(d => d.id)).size !== b.drafts.length ||
        (b.active !== null && !b.drafts.some(d => d.id === b.active)) ||
        (b.pending !== null && (!b.pending || !uuid(b.pending.id) || !b.pending.cart || ![1, 2].includes(b.pending.cart.version))) ||
        (b.catalog !== null && (!b.catalog || !uuid(b.catalog.id) || !b.drafts.some(d => d.id === b.catalog.draftId) || !uuid(b.catalog.card?.cardId) || !uuid(b.catalog.card?.printingId) || !conditions.includes(b.catalog.card?.condition) || b.catalog.card?.intent !== 'hold' || b.catalog.card?.priceMinor !== null || !b.catalog.line)) ||
        (b.pending && b.catalog))
        throw Error('Saved deals could not be read. Preserve this browser data.');
    return b;
}
export const money = n => (n / 100).toFixed(2);
export function minor(value) {
    if (!/^\d{1,7}(?:\.\d{1,2})?$/.test(String(value).trim()))
        return null;
    const [whole, part = ''] = String(value).trim().split('.');
    const n = Number(whole) * 100 + Number(part.padEnd(2, '0'));
    return Number.isSafeInteger(n) && n <= 100000000 ? n : null;
}
export function rate(value) { const n = minor(value); return n !== null && n > 0 && n <= 10000 ? n : null; }
export function tradeCredit(t) { return Math.floor((t.valueMinor * t.quantity * t.rateBps + 5000) / 10000); }
export function totals(d) {
    const subtotal = d.items.reduce((n, l) => n + l.unitMinor * l.quantity, 0);
    const credit = d.trades.reduce((n, t) => n + tradeCredit(t), 0);
    return { subtotal, credit, total: subtotal + d.taxMinor, balance: subtotal + d.taxMinor - credit };
}
export function newDraft(id, storeName = '') {
    return { id, label: 'Walk-up customer', storeName, items: [], trades: [], taxMinor: 0, method: 'Cash', note: '', customerId: null,
        customer: { name: '', email: '', phone: '', wants: '', notes: '' } };
}
export function addLine(d, line) {
    if (d.items.length >= 50)
        throw Error('This deal has 50 sale lines.');
    if (line.instanceId && d.items.some(l => l.instanceId === line.instanceId))
        throw Error('That exact copy is already in this deal.');
    if (!text(line.description, 200) || !line.description.trim() || !Number.isInteger(line.unitMinor) || line.unitMinor <= 0 || line.unitMinor > 100000000 || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 999 || line.instanceId && (!uuid(line.instanceId) || line.quantity !== 1))
        throw Error('Check description, price and quantity.');
    const next = { ...d, items: [...d.items, line] };
    if (totals(next).total > 100000000)
        throw Error('Deal exceeds the supported total.');
    return next;
}
export function saleRequest(d, id) {
    const amount = totals(d);
    if (!uuid(id) || !draftValid(d) || !d.storeName.trim() || !d.items.length || amount.total > 100000000 || amount.credit > 100000000 || d.trades.length && d.note.length > 350)
        throw Error('Check store name, items, tax and totals.');
    const seen = new Set();
    for (const l of d.items) {
        if (l.instanceId && seen.has(l.instanceId))
            throw Error('Duplicate physical copy.');
        seen.add(l.instanceId);
        addLine({ ...d, items: [], trades: [], taxMinor: 0 }, l);
    }
    for (const t of d.trades) {
        if (!t.description.trim() || !integer(t.valueMinor * t.quantity, 1, 100000000) || t.cardId && (!uuid(t.cardId) || !uuid(t.printingId) || !conditions.includes(t.condition) || t.quantity !== 1) || !t.cardId && (t.printingId !== null || t.condition !== null) || t.addToVault && !t.cardId)
            throw Error('Check trade value, percentage and printing.');
    }
    return { id, cart: { version: d.trades.length ? 2 : 1, storeName: d.storeName.trim(), items: d.items.map(({ instanceId = null, description, quantity, unitMinor }) => ({ instanceId, description, quantity, unitMinor })),
            ...(d.trades.length ? { trades: d.trades.map(({ description, valueMinor, rateBps, quantity, cardId, printingId, condition, addToVault }) => ({ description, valueMinor, rateBps, quantity, cardId, printingId, condition, addToVault })) } : {}), taxMinor: d.taxMinor, method: d.method, note: d.note.trim(), customerId: d.customerId, customer: { ...d.customer } } };
}
// Explicit projection: never pass customer contacts, private notes or costs.
export function customerDeal(d) {
    return { storeName: d.storeName, items: d.items.map(l => ({ description: l.description, quantity: l.quantity, unitMinor: l.unitMinor, askingMinor: l.askingMinor ?? null, image: l.image ?? null })),
        trades: d.trades.map(t => ({ description: t.description, valueMinor: t.valueMinor, quantity: t.quantity, rateBps: t.rateBps, creditMinor: tradeCredit(t) })), taxMinor: d.taxMinor, ...totals(d) };
}
export function draftJournal(storage, owner, lock) {
    if (!uuid(owner))
        throw Error('Sign in again.');
    const key = 'grookai.sales-desk.v2.' + owner;
    const read = () => {
        const raw = storage.getItem(key);
        if (!raw)
            return { version: 2, revision: 0, drafts: [], active: null, pending: null, catalog: null };
        if (raw.length > 2000000)
            throw Error('Saved deals are too large.');
        const b = JSON.parse(raw);
        return validateJournal(b);
    };
    return { key, read, update: async (expected, change) => lock(key, async () => {
            const current = read();
            if (current.revision !== expected)
                throw Error('Deals changed in another tab. Reload saved deals before editing.');
            const next = change(structuredClone(current));
            if (next.drafts.length > 20)
                throw Error('Resume a held deal before creating another.');
            if (current.pending && JSON.stringify(next.pending) !== JSON.stringify(current.pending) && next.pending !== null)
                throw Error('Recover the pending sale before changing it.');
            if (current.catalog && JSON.stringify(next.catalog) !== JSON.stringify(current.catalog) && next.catalog !== null)
                throw Error('Recover the pending catalog add before changing it.');
            if ((current.pending && next.pending || current.catalog && next.catalog) && JSON.stringify([current.active, current.drafts]) !== JSON.stringify([next.active, next.drafts]))
                throw Error('Recover the pending request before editing deals.');
            next.revision = current.revision + 1;
            validateJournal(next);
            const encoded = JSON.stringify(next);
            if (encoded.length > 2000000)
                throw Error('Saved deals are too large.');
            storage.setItem(key, encoded);
            return next;
        }) };
}
