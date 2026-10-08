import type {Customer} from './salesDesk.mjs';
import type {Tender} from './salesPayments.mjs';
import type {PurchaseItem, PurchaseRequest} from './salesPurchase.mjs';
export type PurchaseDraft = {
    kind: 'purchase'; id: string; label: string; storeName: string; items: PurchaseItem[];
    method: string; payments?: Tender[]; note: string; customerId: string | null; customer: Customer;
};
export function validatePurchaseDraft(value: unknown): PurchaseDraft;
export function isPurchaseDraft(value: unknown): value is PurchaseDraft;
export function purchaseDraftTotal(draft: PurchaseDraft): number;
export function newPurchaseDraft(id: string, storeName?: string): PurchaseDraft;
export function addPurchaseItem(draft: PurchaseDraft, item: PurchaseItem): PurchaseDraft;
export function purchaseDraftRequest(draft: PurchaseDraft, id: string, confirmed: boolean): PurchaseRequest;
export function purchaseOfferView(draft: PurchaseDraft): {
    kind: 'purchase'; storeName: string; purchaseMinor: number;
    items: {description: string; quantity: number; unitMinor: number}[];
};
