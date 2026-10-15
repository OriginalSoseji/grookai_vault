import type {RecordedReceipt} from './salesReport.mjs';
export const SALES_REPORT_PAGE_SIZE:number;
export type SalesDashboardState={from:string;to:string;query:string;method:string;page:number};
export type SalesDashboardParams=string|URLSearchParams|Record<string,string|string[]|undefined>;
export function readSalesDashboardParams(input:SalesDashboardParams,today:string,allowedMethods?:string[]):SalesDashboardState;
export function writeSalesDashboardParams(input:SalesDashboardParams,state:SalesDashboardState):URLSearchParams;
export function salesDashboardDestination(input:SalesDashboardParams,allowedMethods?:string[]):string;
export function paginateSalesRows(rows:RecordedReceipt[],requestedPage:number,pageSize?:number):{page:number;pageCount:number;start:number;end:number;rows:RecordedReceipt[]};
