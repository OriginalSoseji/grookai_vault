import type {Tender as PaymentEntry,Payments} from './salesPayments.mjs';
export type PurchaseItem=Readonly<{
 description:string;quantity:number;unitMinor:number;referenceMinor:number|null;rateBps:number|null;
 cardId:string|null;printingId:string|null;condition:string|null;addToVault:boolean;
}>;
export type PurchaseRequest=Readonly<{id:string;cart:Readonly<{
 version:4;kind:'purchase';storeName:string;items:readonly PurchaseItem[];payments:readonly PaymentEntry[];
 note:string;customerId:string|null;customer:Readonly<{name:string;email:string;phone:string;wants:string;notes:string}>;
}>}>;
export type PurchaseReceipt=Readonly<{
 version:2;kind:'purchase';id:string;number:string;createdAt:string;storeName:string;customerName:string;currency:'USD';
 items:readonly Readonly<PurchaseItem&{lineMinor:number;printingGvId:string|null;instanceId:string|null;gvviId:string|null}>[];
 purchaseMinor:number;method:string;payments:Payments;note:string;
}>;
export function purchaseOffer(referenceMinor:unknown,rateBps:unknown):number;
export function purchaseRequest(input:unknown,id:string):PurchaseRequest;
export function validatePurchaseReceipt(value:unknown):PurchaseReceipt;
export function isPurchaseReceipt(value:unknown):value is PurchaseReceipt;
export function purchaseReceiptText(value:unknown,money:(minor:number)=>string):string;
export function confirmedPurchaseReceipt(value:unknown,request:unknown):PurchaseReceipt;
export function purchaseCustomerView(value:unknown):Readonly<{
 kind:'purchase';number:string;createdAt:string;storeName:string;currency:'USD';
 items:readonly Readonly<{description:string;quantity:number;unitMinor:number;lineMinor:number}>[];
 purchaseMinor:number;method:string;payments:Payments;
}>;
