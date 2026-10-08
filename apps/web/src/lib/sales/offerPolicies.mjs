import {validateOfferPresets} from './offerPresets.mjs';

const maxMinor = 100000000;
const conditions = ['NM', 'LP', 'MP', 'HP', 'DMG'];
const sources = ['manual', 'tcgplayer_market'];
const increments = [1, 5, 10, 25, 50, 100];
const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const integer = (value, min, max) => Number.isSafeInteger(value) && value >= min && value <= max;
const keys = (value, fields) => value && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).length === fields.length && Object.keys(value).every(key => fields.includes(key));
const fail = () => {throw Error('Offer policies need review. Your saved settings have been kept.');};
function freeze(value) {if (value && typeof value === 'object') {Object.values(value).forEach(freeze); Object.freeze(value);} return value;}
export function validateOfferPolicy(value) {
    if (!keys(value, ['id', 'name', 'intent', 'rateBps', 'source', 'conditionBasis', 'rounding', 'lowValueTier']) ||
        !uuid(value.id) || typeof value.name !== 'string' || !value.name.trim() || value.name.trim().length > 80 ||
        /[\u0000-\u001f\u007f]/u.test(value.name) || !['cash', 'trade'].includes(value.intent) ||
        !integer(value.rateBps, 1, 10000) || !sources.includes(value.source) ||
        !['selected', 'unspecified', ...conditions].includes(value.conditionBasis) ||
        !keys(value.rounding, ['incrementMinor', 'mode']) || !increments.includes(value.rounding.incrementMinor) ||
        !['nearest', 'down'].includes(value.rounding.mode)) fail();
    const tier = value.lowValueTier;
    if (tier !== null && (!keys(tier, ['ceilingMinor', 'rateBps']) || !integer(tier.ceilingMinor, 1, maxMinor) || !integer(tier.rateBps, 1, 10000))) fail();
    return freeze({id: value.id.toLowerCase(), name: value.name.trim(), intent: value.intent, rateBps: value.rateBps,
        source: value.source, conditionBasis: value.conditionBasis, rounding: {...value.rounding}, lowValueTier: tier === null ? null : {...tier}});
}
export function validateOfferPolicies(value) {
    if (value?.version === 1) {
        const old = validateOfferPresets(value);
        return validateOfferPolicies({version: 2, revision: old.revision, defaults: {cash: null, trade: null},
            presets: old.presets.map(preset => ({...preset, intent: 'cash', source: 'manual', conditionBasis: 'unspecified',
                rounding: {incrementMinor: 1, mode: 'nearest'}, lowValueTier: null}))});
    }
    if (!keys(value, ['version', 'revision', 'presets', 'defaults']) || value.version !== 2 ||
        !integer(value.revision, 0, 1000000000) || !Array.isArray(value.presets) || value.presets.length > 20 ||
        !keys(value.defaults, ['cash', 'trade'])) fail();
    const presets = value.presets.map(validateOfferPolicy), ids = new Set(presets.map(policy => policy.id));
    if (ids.size !== presets.length) fail();
    const defaults = {};
    for (const intent of ['cash', 'trade']) {
        const id = value.defaults[intent];
        if (id !== null && (!uuid(id) || !presets.some(policy => policy.id === id.toLowerCase() && policy.intent === intent))) fail();
        defaults[intent] = id === null ? null : id.toLowerCase();
    }
    return freeze({version: 2, revision: value.revision, presets, defaults});
}
export function readOfferPolicies(raw) {
    if (raw === null) return validateOfferPolicies({version: 2, revision: 0, presets: [], defaults: {cash: null, trade: null}});
    if (typeof raw !== 'string' || raw.length > 20000) fail();
    return validateOfferPolicies(JSON.parse(raw));
}
export function removeOfferPolicy(book, id) {
    const value = validateOfferPolicies(book);
    if (!uuid(id)) fail();
    id = id.toLowerCase();
    return validateOfferPolicies({...value, presets: value.presets.filter(policy => policy.id !== id),
        defaults: Object.fromEntries(Object.entries(value.defaults).map(([intent, selected]) => [intent, selected === id ? null : selected]))});
}
export function offerPolicyStore(storage, owner, lock, currentOwner) {
    if (!uuid(owner)) throw Error('Sign in again to use offer policies.');
    const key = 'grookai.offer-presets.v1.' + owner.toLowerCase();
    const check = () => {if (currentOwner() !== owner) throw Error('Your account changed. Reopen the sales desk.');};
    const read = () => {check(); const value = readOfferPolicies(storage.getItem(key)); check(); return value;};
    return {key, read, save: async (expected, presets, defaults) => {
        const next = validateOfferPolicies({version: 2, revision: expected + 1, presets, defaults});
        check();
        return lock(key, async () => {
            const current = read();
            if (current.revision !== expected) throw Error('Offer policies changed in another screen. Reload policies before editing.');
            check(); const encoded = JSON.stringify(next); storage.setItem(key, encoded);
            if (storage.getItem(key) !== encoded) throw Error('Offer policies could not be verified. Reload before retrying.');
            check(); return next;
        });
    }};
}
const unavailable = reason => freeze({status: 'unavailable', reason});
function timestamp(value) {
    if (typeof value !== 'string') return null;
    const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,6}))?(Z|([+-])(\d{2}):(\d{2}))$/.exec(value);
    if (!match || match[3] !== 'Z' && (Number(match[5]) > 23 || Number(match[6]) > 59)) return null;
    const parsed = Date.parse(value);
    const offset = match[3] === 'Z' ? 0 : (Number(match[5]) * 60 + Number(match[6])) * (match[4] === '-' ? -1 : 1);
    // Validate the original wall date, retaining PostgreSQL microseconds for boundary checks.
    if (!Number.isFinite(parsed) || new Date(parsed + offset * 60000).toISOString().slice(0, 19) !== match[1]) return null;
    return BigInt(parsed) * 1000n + BigInt((match[2] ?? '').padEnd(6, '0').slice(3));
}
/** Draft proposal only. The transaction writer remains the agreed-amount authority. */
export function quoteOfferPolicy(input, context, reference, now) {
    const policy = validateOfferPolicy(input);
    if (!keys(context, ['intent', 'quantity', 'cardId', 'printingId', 'condition']) || !['cash', 'trade'].includes(context.intent) ||
        !integer(context.quantity, 1, 999) || context.condition !== null && !conditions.includes(context.condition) ||
        context.cardId === null && context.printingId !== null || context.cardId !== null && (!uuid(context.cardId) || !uuid(context.printingId))) fail();
    if (context.intent !== policy.intent) return unavailable('wrong_intent');
    if (reference === null) return unavailable('reference_missing');
    if (!keys(reference, ['source', 'amountMinor', 'currency', 'cardId', 'printingId', 'condition', 'observedAt', 'publishedAt', 'provenanceId']) ||
        !sources.includes(reference.source) || !integer(reference.amountMinor, 1, maxMinor) ||
        reference.condition !== null && !conditions.includes(reference.condition)) return unavailable('reference_invalid');
    if (reference.currency !== 'USD') return unavailable('currency_unsupported');
    if (reference.source !== policy.source) return unavailable('source_mismatch');
    if ((reference.cardId === null ? null : typeof reference.cardId === 'string' ? reference.cardId.toLowerCase() : false) !== (context.cardId === null ? null : context.cardId.toLowerCase()) ||
        (reference.printingId === null ? null : typeof reference.printingId === 'string' ? reference.printingId.toLowerCase() : false) !== (context.printingId === null ? null : context.printingId.toLowerCase())) return unavailable('printing_mismatch');
    if (reference.source === 'tcgplayer_market') {
        if (context.cardId === null || !uuid(reference.provenanceId) || reference.condition !== null) return unavailable('reference_unqualified');
        const observed = timestamp(reference.observedAt), published = timestamp(reference.publishedAt);
        if (!integer(now, 0, 8640000000000000) || observed === null || published === null)
            return unavailable('timestamp_invalid');
        const nowMicros = BigInt(now) * 1000n;
        if (observed > published || published > nowMicros || observed > nowMicros) return unavailable('timestamp_invalid');
        if (nowMicros - observed > 129600000000n) return unavailable('reference_stale');
    } else if (reference.observedAt !== null || reference.publishedAt !== null || reference.provenanceId !== null) return unavailable('manual_provenance_invalid');
    const basis = policy.conditionBasis === 'selected' ? context.condition : policy.conditionBasis === 'unspecified' ? null : policy.conditionBasis;
    if (policy.conditionBasis === 'selected' && basis === null) return unavailable('condition_unknown');
    if (reference.condition !== basis) return unavailable('condition_mismatch');
    const tierApplied = policy.lowValueTier !== null && reference.amountMinor <= policy.lowValueTier.ceilingMinor;
    const rateBps = tierApplied ? policy.lowValueTier.rateBps : policy.rateBps;
    const units = policy.intent === 'trade' ? context.quantity : 1;
    if (reference.amountMinor * units > maxMinor) return unavailable('amount_limit');
    const numerator = BigInt(reference.amountMinor) * BigInt(units) * BigInt(rateBps);
    const denominator = 10000n * BigInt(policy.rounding.incrementMinor);
    const calculatedMinor = Number((numerator + 5000n) / 10000n);
    const suggestedMinor = Number((numerator + (policy.rounding.mode === 'nearest' ? denominator / 2n : 0n)) / denominator) * policy.rounding.incrementMinor;
    const lineMinor = suggestedMinor * (policy.intent === 'cash' ? context.quantity : 1);
    if (!integer(lineMinor, 0, maxMinor)) return unavailable('amount_limit');
    return freeze({status: 'available', policyId: policy.id, intent: policy.intent, source: reference.source, referenceMinor: reference.amountMinor,
        basisCondition: basis, requiresConditionReview: basis !== context.condition, rateBps, tierApplied,
        scope: policy.intent === 'cash' ? 'unit' : 'line', quantity: context.quantity, calculatedMinor, suggestedMinor, lineMinor,
        rounding: {...policy.rounding}});
}

/** Project one exact governed RPC result. Never fall back to parent or asking prices. */
export function projectOfferMarketReference(rows, cardId, printingId, now) {
    if (!uuid(cardId) || !uuid(printingId)) fail();
    if (!Array.isArray(rows) || rows.length !== 1 || !rows[0] || typeof rows[0] !== 'object' || Array.isArray(rows[0]))
        return unavailable('reference_missing_or_ambiguous');
    const row = rows[0];
    if (row.pricing_scope !== 'card_printing' || row.status !== 'available' || row.currency !== 'USD' ||
        row.source_name !== 'tcgplayer' || row.source_label !== 'TCGPlayer Market' || row.freshness !== 'fresh' ||
        row.is_from_price !== false || row.unavailable_reason != null) return unavailable('reference_unqualified');
    // Convert a canonical decimal once. No float multiplication or invented fractional cents.
    const decimal = typeof row.market_close === 'number' && Number.isFinite(row.market_close) ? String(row.market_close) : '';
    const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(decimal);
    if (!match) return unavailable('reference_amount_invalid');
    const cents = BigInt(match[1]) * 100n + BigInt((match[2] ?? '').padEnd(2, '0'));
    if (cents < 1n || cents > BigInt(maxMinor)) return unavailable('reference_amount_invalid');
    const reference = {source: 'tcgplayer_market', amountMinor: Number(cents), currency: row.currency,
        cardId: row.card_print_id, printingId: row.card_printing_id, condition: null,
        observedAt: row.observed_at, publishedAt: row.published_at, provenanceId: row.provenance_id};
    const result = quoteOfferPolicy({id: printingId, name: 'Market reference validation', intent: 'cash', rateBps: 10000,
        source: 'tcgplayer_market', conditionBasis: 'unspecified', rounding: {incrementMinor: 1, mode: 'nearest'}, lowValueTier: null},
        {intent: 'cash', quantity: 1, cardId, printingId, condition: null}, reference, now);
    if (result.status !== 'available') return result;
    return freeze({status: 'available', reference: {...reference, cardId: cardId.toLowerCase(), printingId: printingId.toLowerCase(), provenanceId: reference.provenanceId.toLowerCase()}});
}
