import type {Payments} from './salesPayments.mjs';
import type {PurchaseReceipt} from './salesPurchase.mjs';
export type SalesReceipt={id:string;number:string;createdAt:string;customerName:string;method:string;payments?:Payments;items:{description:string;quantity:number;unitMinor:number}[];subtotalMinor:number;discountMinor?:number;taxMinor:number;totalMinor:number;tradeIn?:{balanceMinor:number;totalCreditMinor:number;items:{description:string}[]}};
export type RecordedReceipt=SalesReceipt|PurchaseReceipt;
export function recordedReceiptBalance(receipt:RecordedReceipt):number;
export function salesReport(receipts:RecordedReceipt[],options:{start:Date;end:Date;query?:string;method?:string;hour?:(d:Date)=>number}):{rows:RecordedReceipt[];hours:{sales:number;transactions:number}[];payments:Record<string,number>;sales:number;tax:number;received:number;paid:number;credit:number;units:number;purchases:number;purchasedUnits:number;purchaseAmount:number;saleTransactions:number;transactions:number;average:number};
export function reportCsv(receipts:RecordedReceipt[]):string;
