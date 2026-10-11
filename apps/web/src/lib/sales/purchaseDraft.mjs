import {validatePurchaseItem, purchaseRequest} from './salesPurchase.mjs';
import {tenderMethods} from './salesPayments.mjs';

const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const text = (value, limit) => typeof value === 'string' && value.length <= limit;
const integer = (value, min, max) => Number.isSafeInteger(value) && value >= min && value <= max;
const fields = ['kind', 'id', 'label', 'storeName', 'items', 'method', 'note', 'customerId', 'customer'];

// Editable fields may be incomplete. Completion applies the stricter request rules.
export function validatePurchaseDraft(value) {
    const fail = () => { throw Error('Saved purchase needs review. Preserve this browser data.'); };
    if (!value || Array.isArray(value) || value.kind !== 'purchase' ||
        Object.keys(value).some(key => ![...fields, 'payments'].includes(key)) ||
        fields.some(key => !Object.hasOwn(value, key)) || !uuid(value.id) ||
        !text(value.label, 120) || !text(value.storeName, 120) || !text(value.note, 500) ||
        !tenderMethods.includes(value.method) || (value.customerId !== null && !uuid(value.customerId)) ||
        !Array.isArray(value.items) || value.items.length > 50) fail();
    const customer = value.customer;
    const limits = {name: 120, email: 254, phone: 40, wants: 1000, notes: 2000};
    if (!customer || Array.isArray(customer) || Object.keys(customer).length !== 5 ||
        !Object.entries(limits).every(([key, limit]) => text(customer[key], limit))) fail();
    for (const line of value.items) validatePurchaseItem(line);
    if (!integer(purchaseDraftTotal(value), 0, 100000000)) fail();
    if (value.payments !== undefined && (!Array.isArray(value.payments) || value.payments.length > 4 ||
        !value.payments.every(entry => entry && !Array.isArray(entry) &&
            Object.keys(entry).sort().join(',') === 'amountMinor,method,tenderedMinor' &&
            tenderMethods.includes(entry.method) && integer(entry.amountMinor, 0, 100000000) &&
            integer(entry.tenderedMinor, 0, 100000000)))) fail();
    return value;
}

export const isPurchaseDraft = value => value?.kind === 'purchase';
export const purchaseDraftTotal = draft => draft.items.reduce((total, line) => total + line.unitMinor * line.quantity, 0);
export function newPurchaseDraft(id, storeName = '') {
    return validatePurchaseDraft({kind: 'purchase', id, label: 'Walk-up seller', storeName, items: [],
        method: 'Cash', note: '', customerId: null, customer: {name: '', email: '', phone: '', wants: '', notes: ''}});
}
export function addPurchaseItem(draft, line) {
    validatePurchaseDraft(draft);
    return validatePurchaseDraft({...draft, items: [...draft.items, validatePurchaseItem(line)]});
}
export function purchaseDraftRequest(draft, id, confirmed) {
    validatePurchaseDraft(draft);
    const total = purchaseDraftTotal(draft);
    return purchaseRequest({storeName: draft.storeName, items: draft.items,
        payments: draft.payments ?? [{method: draft.method, amountMinor: total, tenderedMinor: total}],
        note: draft.note, customerId: draft.customerId, customer: draft.customer, confirmed}, id);
}
// Preview is an offer, never a completed receipt. No private notes, contacts or reference rates.
export function purchaseOfferView(draft) {
    validatePurchaseDraft(draft);
    return {kind: 'purchase', storeName: draft.storeName, purchaseMinor: purchaseDraftTotal(draft),
        items: draft.items.map(({description, quantity, unitMinor}) => ({description, quantity, unitMinor}))};
}
