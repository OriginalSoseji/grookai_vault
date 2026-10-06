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
    id: string;
    label: string;
    storeName: string;
    items: SaleLine[];
    trades: TradeLine[];
    taxMinor: number;
    method: string;
    note: string;
    customerId: string | null;
    customer: Customer;
};
export type SaleRequest = {
    id: string;
    cart: {
        version: number;
        storeName: string;
        items: SaleLine[];
        trades?: TradeLine[];
        taxMinor: number;
        method: string;
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
    drafts: SaleDraft[];
    active: string | null;
    pending: SaleRequest | null;
    catalog: CatalogAttempt | null;
};
export const conditions: string[];
export const methods: string[];
export function money(n: number): string;
export function minor(s: string): number | null;
export function rate(s: string): number | null;
export function tradeCredit(t: TradeLine): number;
export function totals(d: SaleDraft): {
    subtotal: number;
    credit: number;
    total: number;
    balance: number;
};
export function newDraft(id: string, storeName?: string): SaleDraft;
export function addLine(d: SaleDraft, l: SaleLine): SaleDraft;
export function saleRequest(d: SaleDraft, id: string): SaleRequest;
export function customerDeal(d: SaleDraft): {
    storeName: string;
    items: {
        description: string;
        quantity: number;
        unitMinor: number;
        askingMinor: number | null;
        image: string | null;
    }[];
    trades: {
        description: string;
        valueMinor: number;
        quantity: number;
        rateBps: number;
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
    read: () => Journal;
    update: (revision: number, change: (j: Journal) => Journal) => Promise<Journal>;
};
