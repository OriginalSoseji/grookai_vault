import type {Payments, Tender} from './salesPayments.mjs';
export type NegotiatedTradeLine = Readonly<{
    description: string;
    valueMinor: number | null;
    rateBps: number | null;
    quantity: number;
    cardId: string | null;
    printingId: string | null;
    condition: 'NM' | 'LP' | 'MP' | 'HP' | 'DMG' | null;
    addToVault: boolean;
    creditMinor: number;
}>;
export type RecordedNegotiatedTradeLine = NegotiatedTradeLine & Readonly<{
    printingGvId: string | null;
    instanceId: string | null;
    gvviId: string | null;
}>;
export type NegotiatedTradeTotals<T = NegotiatedTradeLine> = Readonly<{
    items: readonly T[];
    totalValueMinor: number | null;
    totalCreditMinor: number;
}>;
export type NegotiatedTradeReceipt = NegotiatedTradeTotals<RecordedNegotiatedTradeLine> & Readonly<{
    version: 2;
    balanceMinor: number;
}>;
export function validateNegotiatedTradeLine(value: unknown, recorded: true): RecordedNegotiatedTradeLine;
export function validateNegotiatedTradeLine(value: unknown, recorded?: false): NegotiatedTradeLine;
export function negotiatedTradeTotals(lines: unknown, recorded: true): NegotiatedTradeTotals<RecordedNegotiatedTradeLine>;
export function negotiatedTradeTotals(lines: unknown, recorded?: false): NegotiatedTradeTotals;
export function validateNegotiatedTradeReceipt(value: unknown, saleTotal: number): NegotiatedTradeReceipt;
export type NegotiatedTradeRequest = Readonly<{id: string; cart: Readonly<{
    version: 5; storeName: string; method: string; taxMinor: number; note: string; customerId: string | null;
    customer: Readonly<{name: string; email: string; phone: string; wants: string; notes: string}>;
    items: readonly Readonly<{instanceId: string | null; description: string; quantity: number; unitMinor: number}>[];
    trades: readonly NegotiatedTradeLine[]; payments: readonly Tender[];
}>}>;
export type NegotiatedSaleReceipt = Readonly<{
    version: 1; id: string; number: string; createdAt: string; storeName: string; customerName: string; method: string;
    items: readonly Readonly<{description: string; quantity: number; unitMinor: number; lineMinor: number}>[];
    subtotalMinor: number; discountMinor: 0; taxMinor: number; totalMinor: number; note: string; sourceDispositionId: string | null;
    tradeIn: NegotiatedTradeReceipt; payments: Payments;
}>;
export type NegotiatedTradeCustomerView = Readonly<{
    number: string; createdAt: string; storeName: string; items: NegotiatedSaleReceipt['items'];
    subtotalMinor: number; taxMinor: number; totalMinor: number; method: string; payments: Payments;
    trades: readonly Readonly<{description: string; quantity: number; creditMinor: number}>[];
    totalCreditMinor: number; balanceMinor: number;
}>;
export function validateNegotiatedTradeRequest(value: unknown): NegotiatedTradeRequest;
export function isNegotiatedTradeReceipt(value: unknown): boolean;
export function validateNegotiatedSaleReceipt(value: unknown): NegotiatedSaleReceipt;
export function confirmedNegotiatedTrade(value: unknown, pending: unknown): NegotiatedSaleReceipt;
export function negotiatedTradeCustomerView(value: unknown): NegotiatedTradeCustomerView;
export function negotiatedTradeReceiptText(value: unknown, money: (minor: number) => string): string;
