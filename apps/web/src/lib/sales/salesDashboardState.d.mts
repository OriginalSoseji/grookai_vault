import type {SalesReceipt} from './salesReport.mjs';
export const SALES_REPORT_PAGE_SIZE:number;
export type SalesDashboardState={from:string;to:string;query:string;method:string;page:number};
export function readSalesDashboardParams(input:string|URLSearchParams,today:string,allowedMethods?:string[]):SalesDashboardState;
export function writeSalesDashboardParams(input:string|URLSearchParams,state:SalesDashboardState):URLSearchParams;
export function paginateSalesRows(rows:SalesReceipt[],requestedPage:number,pageSize?:number):{page:number;pageCount:number;start:number;end:number;rows:SalesReceipt[]};
