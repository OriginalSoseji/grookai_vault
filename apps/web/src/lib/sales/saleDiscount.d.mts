export const discountAllocationMethod:'proportional_largest_remainder_v1';
export type SaleDiscountAllocation={readonly version:1;readonly method:typeof discountAllocationMethod;readonly subtotalMinor:string;readonly discountMinor:string;readonly netSalesMinor:string;readonly lines:readonly {readonly index:number;readonly grossMinor:string;readonly discountMinor:string;readonly netMinor:string}[]};
export function saleDiscountAllocation(items:readonly {quantity:number;unitMinor:number}[],discountMinor:number):SaleDiscountAllocation;
export function validateSaleDiscountAllocation(value:unknown,items:readonly {quantity:number;unitMinor:number}[],discountMinor:number):SaleDiscountAllocation;
