import type {RecordedReceipt as SalesReceipt} from './salesReport.mjs';
import type {SaleDiscountAllocation} from './saleDiscount.mjs';
export type CostSnapshot={version:number;receiptId:string;soldAt:string;salesCurrency:string;allocation?:SaleDiscountAllocation;lines:{index:number;instanceId:string|null;quantity:number;salesMinor:string;status:string;cost:{amount:string|null;currency:string|null;minor:string|null;status:string}}[]};
export type ProfitDetail={receiptId:string;knownLines:number;totalLines:number;knownSalesMinor:string;knownCostMinor:string;knownProfitMinor:string|null;reasons:string[]};
export type ProfitReport={currency:string;receipts:number;totalLines:number;knownLines:number;totalUnits:string;knownUnits:string;itemSalesMinor:string;knownSalesMinor:string;unknownSalesMinor:string;knownCostMinor:string;knownProfitMinor:string|null;coverageBps:number|null;reasons:{reason:string;receipts:number;lines:number;units:string;salesMinor:string}[];details:ProfitDetail[]};
export function salesProfit(receipts:SalesReceipt[],snapshots:CostSnapshot[]):ProfitReport;
export function profitMoney(minor:string):string;
export function costGapLabel(reason:string):string;
