import type {NegotiatedDraft} from './negotiatedDraft.mjs';
import type {NegotiatedSaleReceipt, NegotiatedTradeRequest} from './negotiatedTrade.mjs';
import type {Tender} from './salesPayments.mjs';
import type {PurchaseDraft} from './purchaseDraft.mjs';
import type {PurchaseRequest} from './salesPurchase.mjs';
import type {DiscountedDraft} from './discountedDraft.mjs';
import type {DiscountedSaleRequest,DiscountedSaleReceipt,DiscountedSaleCancellation} from './discountedSale.mjs';
export type SaleLine = {
    instanceId?: string | null;
    gvviId?: string;
    description: string;
    quantity: number;
    unitMinor: number;
    askingMinor?: number | null;
    image?: string | null;
};
export type TradeLine = {
    description: string;
    quantity: number;
    valueMinor: number;
    rateBps: number;
    cardId: string | null;
    printingId: string | null;
    condition: string | null;
    addToVault: boolean;
};
export type Customer = {
    name: string;
    email: string;
    phone: string;
    wants: string;
    notes: string;
};
export type SaleDraft = {
    kind?: undefined;
    id: string;
    label: string;
    storeName: string;
    items: SaleLine[];
    trades: TradeLine[];
    taxMinor: number;
    method: string;
    payments?: Tender[];
    note: string;
    customerId: string | null;
    customer: Customer;
};
export type SaleRequest = {
    id: string;
    cart: {
        version: 1 | 2 | 3;
        storeName: string;
        items: SaleLine[];
        trades?: TradeLine[];
        taxMinor: number;
        method: string;
    payments?: Tender[];
        note: string;
        customerId: string | null;
        customer: Customer;
    };
};
export type CatalogAttempt = {
    id: string;
    card: {
        cardId: string;
        printingId: string;
        condition: string;
        intent: string;
        priceMinor: number | null;
    };
    draftId: string;
    line: SaleLine;
};
export type Journal = {
    version: number;
    revision: number;
    drafts: (SaleDraft | PurchaseDraft | NegotiatedDraft | DiscountedDraft)[];
    active: string | null;
    pending: SaleRequest | PurchaseRequest | NegotiatedTradeRequest | DiscountedSaleRequest | null;
    catalog: CatalogAttempt | null;
};
export const conditions: string[];
export const methods: string[];
export function money(n: number): string;
export function minor(s: string): number | null;
export function rate(s: string): number | null;
export function tradeCredit(t: TradeLine): number;
export function totals(d: SaleDraft | NegotiatedDraft | DiscountedDraft): {
    discount?: number;
    subtotal: number;
    credit: number;
    total: number;
    balance: number;
};
export function newDraft(id: string, storeName?: string): SaleDraft;
export function addLine<T extends SaleDraft | NegotiatedDraft | DiscountedDraft>(d: T, l: SaleLine): T;
export function saleRequest(d: SaleDraft, id: string): SaleRequest;
export function customerDeal(d: SaleDraft | NegotiatedDraft | DiscountedDraft): {
    discount?: number;
    storeName: string;
    items: {
        description: string;
        quantity: number;
        unitMinor: number;
        askingMinor?: number | null;
        image?: string | null;
    }[];
    trades: {
        description: string;
        valueMinor?: number;
        quantity: number;
        rateBps?: number;
        creditMinor: number;
    }[];
    taxMinor: number;
    subtotal: number;
    credit: number;
    total: number;
    balance: number;
};
export function draftJournal(storage: Pick<Storage, 'getItem' | 'setItem'>, owner: string, lock: <T>(name: string, fn: () => Promise<T>) => Promise<T>): {
    key: string;
    confirmNegotiated: (acknowledgement: unknown, pending: unknown) => NegotiatedSaleReceipt;
    confirmDiscounted: (acknowledgement: unknown, pending: unknown) => DiscountedSaleReceipt;
    confirmDiscountedCancellation: (acknowledgement: unknown, pending: unknown) => DiscountedSaleCancellation;
    read: () => Journal;
    update: (revision: number, change: (j: Journal) => Journal) => Promise<Journal>;
};
