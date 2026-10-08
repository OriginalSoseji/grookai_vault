// Explicit agreed consideration. This model never derives credit from a policy.
import {paymentSnapshot, paymentMethod, validatePayments, paymentLines} from './salesPayments.mjs';
const limit = 100000000;
const fields = ['description', 'valueMinor', 'rateBps', 'quantity', 'cardId', 'printingId', 'condition', 'addToVault', 'creditMinor'];
const recordedFields = [...fields, 'printingGvId', 'instanceId', 'gvviId'];
const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const integer = (value, min, max) => Number.isSafeInteger(value) && value >= min && value <= max;
const keys = (value, expected) => value !== null && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).length === expected.length && expected.every(key => Object.hasOwn(value, key));
const text = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.length <= max && !/[\u0000-\u001f\u007f]/u.test(value);
const check = value => {if (!value) throw Error('Negotiated trade needs review. Preserve the original request or receipt.');};
function freeze(value) {if (value !== null && typeof value === 'object') {Object.values(value).forEach(freeze); Object.freeze(value);} return value;}

export function validateNegotiatedTradeLine(value, recorded = false) {
    check(typeof recorded === 'boolean');
    const expected = recorded ? recordedFields : fields;
    check(keys(value, expected));
    check(text(value.description, 200) && integer(value.quantity, 1, 999) &&
        integer(value.creditMinor, 0, limit) && typeof value.addToVault === 'boolean');
    check(value.valueMinor === null && value.rateBps === null ||
        integer(value.valueMinor, 1, limit) && integer(value.rateBps, 1, 10000) && value.valueMinor * value.quantity <= limit);
    if (value.cardId === null) {
        check(value.printingId === null && value.condition === null && value.addToVault === false);
        if (recorded) check(value.printingGvId === null);
    } else {
        check(uuid(value.cardId) && uuid(value.printingId) && value.quantity === 1 && ['NM', 'LP', 'MP', 'HP', 'DMG'].includes(value.condition));
        if (recorded) check(text(value.printingGvId, 100));
    }
    if (recorded) {
        if (value.addToVault) check(uuid(value.instanceId) && text(value.gvviId, 100) && /^GVVI-[A-Z0-9-]+$/.test(value.gvviId));
        else check(value.instanceId === null && value.gvviId === null);
    }
    return freeze(Object.fromEntries(expected.map(key => [key, value[key]])));
}

export function negotiatedTradeTotals(lines, recorded = false) {
    check(Array.isArray(lines) && lines.length >= 1 && lines.length <= 50);
    let reference = 0, credit = 0, allReferencesKnown = true;
    const instances = new Set(), labels = new Set();
    const items = lines.map(value => {
        const item = validateNegotiatedTradeLine(value, recorded);
        credit += item.creditMinor;
        if (item.valueMinor === null) allReferencesKnown = false;
        else reference += item.valueMinor * item.quantity;
        check(credit <= limit && reference <= limit);
        if (recorded && item.addToVault) {
            const id = item.instanceId.toLowerCase();
            check(!instances.has(id) && !labels.has(item.gvviId));
            instances.add(id); labels.add(item.gvviId);
        }
        return item;
    });
    return freeze({items, totalValueMinor: allReferencesKnown ? reference : null, totalCreditMinor: credit});
}

export function validateNegotiatedTradeReceipt(value, saleTotal) {
    check(keys(value, ['version', 'items', 'totalValueMinor', 'totalCreditMinor', 'balanceMinor']) && value.version === 2 && integer(saleTotal, 1, limit));
    const totals = negotiatedTradeTotals(value.items, true);
    check(value.totalValueMinor === totals.totalValueMinor && value.totalCreditMinor === totals.totalCreditMinor && value.balanceMinor === saleTotal - totals.totalCreditMinor);
    return freeze({version: 2, ...totals, balanceMinor: saleTotal - totals.totalCreditMinor});
}

const cartFields = ['version', 'storeName', 'method', 'items', 'taxMinor', 'note', 'customer', 'customerId', 'trades', 'payments'];
const saleFields = ['instanceId', 'description', 'quantity', 'unitMinor'];
const receiptFields = ['version', 'id', 'number', 'createdAt', 'storeName', 'customerName', 'method', 'items', 'subtotalMinor', 'discountMinor', 'taxMinor', 'totalMinor', 'note', 'sourceDispositionId', 'tradeIn', 'payments'];
const detail = (value, max, required = false) => typeof value === 'string' && value.length <= max &&
    (!required || value.trim().length > 0) && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value);
const same = (a, b) => {
    if (a === b) return true;
    if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false;
    const ka = Object.keys(a), kb = Object.keys(b);
    return ka.length === kb.length && ka.every(key => Object.hasOwn(b, key) && same(a[key], b[key]));
};

/** Validation preserves request values. Builders normalize before saving, never on retry. */
export function validateNegotiatedTradeRequest(value) {
    check(keys(value, ['id', 'cart']) && uuid(value.id) && keys(value.cart, cartFields));
    const cart = value.cart;
    check(cart.version === 5 && detail(cart.storeName, 120, true) && detail(cart.note, 350) &&
        integer(cart.taxMinor, 0, limit) && (cart.customerId === null || uuid(cart.customerId)));
    check(keys(cart.customer, ['name', 'email', 'phone', 'wants', 'notes']));
    for (const [field, max] of Object.entries({name: 120, email: 254, phone: 40, wants: 1000, notes: 2000})) check(detail(cart.customer[field], max));
    check(!/[\r\n]/.test(cart.customer.name) && (!cart.customer.email || /^[^\s@<>\r\n]+@[^\s@<>\r\n]+\.[^\s@<>\r\n]+$/.test(cart.customer.email)) &&
        (!cart.customer.phone || /^\+?[0-9 ()-]{7,40}$/.test(cart.customer.phone)));
    check(Array.isArray(cart.items) && cart.items.length >= 1 && cart.items.length <= 50);
    let subtotal = 0;
    const seen = new Set();
    const items = cart.items.map(item => {
        check(keys(item, saleFields) && detail(item.description, 200, true) && integer(item.quantity, 1, 999) && integer(item.unitMinor, 1, limit));
        if (item.instanceId !== null) {
            check(uuid(item.instanceId) && item.quantity === 1 && !seen.has(item.instanceId.toLowerCase()));
            seen.add(item.instanceId.toLowerCase());
        }
        subtotal += item.quantity * item.unitMinor;
        check(subtotal + cart.taxMinor <= limit);
        return {...item};
    });
    const trades = negotiatedTradeTotals(cart.trades);
    const payments = paymentSnapshot(cart.payments, subtotal + cart.taxMinor - trades.totalCreditMinor);
    check(cart.method === paymentMethod(payments.entries));
    return freeze({id: value.id, cart: {...cart, items, trades: trades.items, payments: payments.entries, customer: {...cart.customer}}});
}

export function isNegotiatedTradeReceipt(value) {return value?.version === 1 && value?.tradeIn?.version === 2;}
export function validateNegotiatedSaleReceipt(value) {
    check(keys(value, receiptFields) && isNegotiatedTradeReceipt(value) && uuid(value.id) &&
        detail(value.storeName, 120, true) && detail(value.customerName, 120) && detail(value.note, 350));
    check(typeof value.createdAt === 'string' && /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/.test(value.createdAt) &&
        !value.createdAt.startsWith('0000-') && Number.isFinite(Date.parse(value.createdAt)) && new Date(value.createdAt).toISOString() === value.createdAt);
    check(value.number === `GV-${value.createdAt.slice(0, 10).replaceAll('-', '')}-${value.id.slice(0, 8).toUpperCase()}`);
    check(Array.isArray(value.items) && value.items.length >= 1 && value.items.length <= 50);
    const items = value.items.map(item => {
        check(keys(item, ['description', 'quantity', 'unitMinor', 'lineMinor']) && detail(item.description, 200, true) &&
            integer(item.quantity, 1, 999) && integer(item.unitMinor, 1, limit) && item.lineMinor === item.quantity * item.unitMinor);
        return {...item};
    });
    const subtotal = items.reduce((sum, item) => sum + item.lineMinor, 0);
    check(value.subtotalMinor === subtotal && value.discountMinor === 0 && integer(value.taxMinor, 0, limit) &&
        value.totalMinor === subtotal + value.taxMinor && integer(value.totalMinor, 1, limit) &&
        (value.sourceDispositionId === null || uuid(value.sourceDispositionId)));
    const tradeIn = validateNegotiatedTradeReceipt(value.tradeIn, value.totalMinor);
    const payments = validatePayments(value.payments, tradeIn.balanceMinor, value.method);
    return freeze({...value, items, tradeIn, payments});
}

/** Full stored-request echo binds outgoing copy IDs absent from the receipt envelope. */
export function confirmedNegotiatedTrade(value, pending) {
    const request = validateNegotiatedTradeRequest(pending);
    check(keys(value, ['version', 'request', 'receipt']) && value.version === 1);
    const echoed = validateNegotiatedTradeRequest(value.request);
    check(echoed.id.toLowerCase() === request.id.toLowerCase() && same(echoed.cart, request.cart));
    const receipt = validateNegotiatedSaleReceipt(value.receipt), cart = request.cart;
    check(receipt.id.toLowerCase() === request.id.toLowerCase() && receipt.storeName === cart.storeName.trim() && receipt.note === cart.note &&
        receipt.taxMinor === cart.taxMinor && receipt.method === cart.method && same(receipt.payments.entries, cart.payments) &&
        receipt.items.length === cart.items.length && receipt.tradeIn.items.length === cart.trades.length &&
        (cart.customerId !== null || receipt.customerName === cart.customer.name) &&
        (receipt.sourceDispositionId !== null) === cart.items.some(item => item.instanceId !== null));
    receipt.items.forEach((item, index) => {
        const expected = cart.items[index];
        check(item.description === expected.description.trim() && item.quantity === expected.quantity && item.unitMinor === expected.unitMinor);
    });
    receipt.tradeIn.items.forEach((item, index) => {
        const expected = cart.trades[index];
        for (const field of fields) {
            if (field === 'description') {if (expected.cardId === null) check(item.description === expected.description.trim());}
            else if (['cardId', 'printingId'].includes(field) && expected[field] !== null) check(item[field]?.toLowerCase() === expected[field].toLowerCase());
            else check(item[field] === expected[field]);
        }
    });
    return receipt;
}

export function negotiatedTradeCustomerView(value) {
    const receipt = validateNegotiatedSaleReceipt(value);
    return freeze({number: receipt.number, createdAt: receipt.createdAt, storeName: receipt.storeName, items: receipt.items,
        subtotalMinor: receipt.subtotalMinor, taxMinor: receipt.taxMinor, totalMinor: receipt.totalMinor,
        trades: receipt.tradeIn.items.map(item => ({description: item.description, quantity: item.quantity, creditMinor: item.creditMinor})),
        totalCreditMinor: receipt.tradeIn.totalCreditMinor, balanceMinor: receipt.tradeIn.balanceMinor, method: receipt.method, payments: receipt.payments});
}
export function negotiatedTradeReceiptText(value, money) {
    const receipt = negotiatedTradeCustomerView(value);
    return [receipt.storeName, 'SALES RECEIPT', receipt.number, receipt.createdAt,
        ...receipt.items.map(item => `${item.quantity} × ${item.description} @ ${money(item.unitMinor)} — ${money(item.lineMinor)}`),
        `Subtotal: ${money(receipt.subtotalMinor)}`, `Tax recorded: ${money(receipt.taxMinor)}`, `TOTAL: ${money(receipt.totalMinor)}`, 'TRADE-INS',
        ...receipt.trades.map(item => `${item.quantity} × ${item.description} — ${money(item.creditMinor)} agreed credit`),
        `Total trade credit: ${money(receipt.totalCreditMinor)}`,
        ...paymentLines({totalMinor: receipt.totalMinor, tradeIn: {balanceMinor: receipt.balanceMinor}, method: receipt.method, payments: receipt.payments}, money),
        'Exchange completed and recorded by the vendor. Grookai did not move money.'].join('\n');
}
