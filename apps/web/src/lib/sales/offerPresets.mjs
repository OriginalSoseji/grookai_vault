// Private editing preferences. Never a transaction, receipt or market-price authority.
const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const keys = (value, allowed) => value && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).length === allowed.length && Object.keys(value).every(key => allowed.includes(key));
export function validateOfferPresets(value) {
    if (!keys(value, ['version', 'revision', 'presets']) || value.version !== 1 || !Number.isSafeInteger(value.revision) ||
        value.revision < 0 || value.revision > 1000000000 || !Array.isArray(value.presets) || value.presets.length > 20)
        throw Error('Saved offer presets could not be read. Your saved data has been kept.');
    const seen = new Set();
    const presets = value.presets.map(preset => {
        if (!keys(preset, ['id', 'name', 'rateBps']) || !uuid(preset.id) || typeof preset.name !== 'string' ||
            !preset.name.trim() || preset.name.trim().length > 80 || /[\u0000-\u001f\u007f]/u.test(preset.name) ||
            !Number.isSafeInteger(preset.rateBps) || preset.rateBps < 1 || preset.rateBps > 10000 || seen.has(preset.id.toLowerCase()))
            throw Error('Check each preset name and percentage (0.01–100%). Keep at most 20 presets.');
        seen.add(preset.id.toLowerCase());
        return Object.freeze({id: preset.id.toLowerCase(), name: preset.name.trim(), rateBps: preset.rateBps});
    });
    return Object.freeze({version: 1, revision: value.revision, presets: Object.freeze(presets)});
}
export function readOfferPresets(raw) {
    if (raw === null) return validateOfferPresets({version: 1, revision: 0, presets: []});
    if (typeof raw !== 'string' || raw.length > 20000) throw Error('Saved offer presets could not be read. Your saved data has been kept.');
    return validateOfferPresets(JSON.parse(raw));
}
export function offerPresetStore(storage, owner, lock, currentOwner) {
    if (!uuid(owner)) throw Error('Sign in again to use offer presets.');
    const key = 'grookai.offer-presets.v1.' + owner.toLowerCase();
    const check = () => {if (currentOwner() !== owner) throw Error('Your account changed. Reopen the sales desk.');};
    const read = () => {check(); const book = readOfferPresets(storage.getItem(key)); check(); return book;};
    return {key, read, save: async (expected, presets) => {
        // Capture before waiting for another tab. Caller edits cannot alter this write.
        const next = validateOfferPresets({version: 1, revision: expected + 1, presets});
        check();
        return lock(key, async () => {
            const current = read();
            if (current.revision !== expected) throw Error('Offer presets changed in another screen. Reload presets before editing.');
            const encoded = JSON.stringify(next);
            check(); storage.setItem(key, encoded);
            if (storage.getItem(key) !== encoded) throw Error('Offer presets could not be verified. Reload before retrying.');
            check(); return next;
        });
    }};
}
