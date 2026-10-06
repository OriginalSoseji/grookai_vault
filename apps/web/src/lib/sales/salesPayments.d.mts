export type Tender = {method:string; amountMinor:number; tenderedMinor:number};
export type Payments = {version:1; balanceMinor:number; entries:Tender[]; changeMinor:number};
export const tenderMethods:string[];
export function paymentSnapshot(entries:Tender[],balanceMinor:number):Payments;
export function paymentMethod(entries:Tender[]):string;
export function validatePayments(value:Payments,balanceMinor:number,method:string):Payments;
export function paymentLines(receipt:{payments?:Payments;tradeIn?:{balanceMinor:number};totalMinor:number;method:string},money:(minor:number)=>string):string[];
export function receiptTenders(receipt:{payments?:Payments;tradeIn?:{balanceMinor:number};totalMinor:number;method:string}):Tender[];
