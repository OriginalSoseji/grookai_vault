import type { SellerCopy, SellerListingInput, SellerLocalDraft } from './sellerTypes';

export const sellerRecoveryKey = (owner: string, instanceId: string) => `grookai:ebay-listing:v1:${owner}:${instanceId}`;
export function emptySellerListing(copy: SellerCopy | null): SellerListingInput {
  return { title: copy ? [copy.name, copy.number, copy.setCode].filter(Boolean).join(' ').slice(0, 80) : '',
    description: '', categoryId: '', priceCents: 0, locationKey: '',
    policies: { fulfillment: '', payment: '', return: '' }, aspects: {},
    condition: { conditionId: '', description: '', descriptors: [] } };
}
export function readSellerRecovery(raw: string | null): SellerLocalDraft | null {
  if (!raw || raw.length > 150000) return null;
  try {
    const value = JSON.parse(raw);
    const input = value.input;
    if (value.version !== 1 || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(value.draftId)
        || !Number.isSafeInteger(value.revision) || value.revision < 0
        || typeof value.dirty !== 'boolean' || !input || typeof input.title !== 'string'
        || typeof input.description !== 'string' || typeof input.categoryId !== 'string'
        || !Number.isSafeInteger(input.priceCents) || typeof input.locationKey !== 'string'
        || !input.policies || !['fulfillment', 'payment', 'return'].every(k => typeof input.policies[k] === 'string')
        || !input.aspects || typeof input.aspects !== 'object' || Array.isArray(input.aspects)
        || !Object.values(input.aspects).every(v => Array.isArray(v) && v.every(s => typeof s === 'string'))
        || !input.condition || typeof input.condition.conditionId !== 'string'
        || typeof input.condition.description !== 'string' || !Array.isArray(input.condition.descriptors)
        || !input.condition.descriptors.every((d: Record<string, unknown>) => d && typeof d.id === 'string'
          && (d.values === undefined || Array.isArray(d.values) && d.values.every(v => typeof v === 'string'))
          && (d.additionalInfo === undefined || typeof d.additionalInfo === 'string'))) return null;
    if (value.pending && (typeof value.pending.requestId !== 'string'
      || typeof value.pending.action !== 'string' || !Number.isSafeInteger(value.pending.revision))) return null;
    if (value.pendingPhoto && (typeof value.pendingPhoto.id !== 'string'
      || typeof value.pendingPhoto.filename !== 'string' || !/^[a-f0-9]{64}$/.test(value.pendingPhoto.sha256))) return null;
    return value as SellerLocalDraft;
  } catch { return null; }
}
