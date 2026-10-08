import type {Payments,Tender} from './salesPayments.mjs';
export type DiscountedSaleRequest=Readonly<{id:string;cart:Readonly<{
 version:6;storeName:string;method:string;discountMinor:number;taxMinor:number;note:string;customerId:string|null;
 customer:Readonly<{name:string;email:string;phone:string;wants:string;notes:string}>;
 items:readonly Readonly<{instanceId:string|null;description:string;quantity:number;unitMinor:number}>[];payments:readonly Tender[];
}>}>;
export type DiscountedSaleReceipt=Readonly<{
 version:1;id:string;number:string;createdAt:string;storeName:string;customerName:string;method:string;
 items:readonly Readonly<{description:string;quantity:number;unitMinor:number;lineMinor:number}>[];
 subtotalMinor:number;discountMinor:number;taxMinor:number;totalMinor:number;note:string;sourceDispositionId:string|null;payments:Payments;
}>;
export type DiscountedSaleCustomerView=Readonly<Pick<DiscountedSaleReceipt,'number'|'createdAt'|'storeName'|'items'|'subtotalMinor'|'discountMinor'|'taxMinor'|'totalMinor'|'method'|'payments'>>;
export function validateDiscountedSaleRequest(value:unknown):DiscountedSaleRequest;
export function validateDiscountedSaleReceipt(value:unknown):DiscountedSaleReceipt;
export function confirmedDiscountedSale(value:unknown,pending:unknown):DiscountedSaleReceipt;
export type DiscountedSaleCancellation=Readonly<{version:1;request:DiscountedSaleRequest;status:'cancelled'}>;
export function confirmedDiscountedSaleCancellation(value:unknown,pending:unknown):DiscountedSaleCancellation;
export function discountedSaleCustomerView(value:unknown):DiscountedSaleCustomerView;
export function discountedSaleReceiptText(value:unknown,money:(minor:number)=>string):string;
