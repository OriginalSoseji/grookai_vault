export type Tender = {method:string; amountMinor:number; tenderedMinor:number};
export type Payments = {version:1; balanceMinor:number; entries:Tender[]; changeMinor:number};
export const tenderMethods:string[];
export function paymentSnapshot(entries:Tender[],balanceMinor:number):Payments;
export function paymentMethod(entries:Tender[]):string;
export function validatePayments(value:Payments,balanceMinor:number,method:string):Payments;
export type PaymentReceipt = {payments?:Payments;tradeIn?:{balanceMinor:number};totalMinor:number;method:string} | {version:2;kind:'purchase';payments:Payments;purchaseMinor:number;method:string};
export function paymentLines(receipt:PaymentReceipt,money:(minor:number)=>string):string[];
export function receiptTenders(receipt:PaymentReceipt):Tender[];
