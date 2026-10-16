export type SalesTaxMode = "pass_through" | "include_in_offer";

export type CardProfit = Readonly<{
    netRevenueMinor: number;
    grossProfitMinor: number;
    incomeTaxMinor: number;
    profitAfterTaxMinor: number;
}>;

export function cardProfit(input: Readonly<{
    saleMinor: number;
    costMinor: number;
    incomeTaxBps?: number;
    salesTaxMinor?: number;
    salesTaxMode?: SalesTaxMode;
    sellingFeeMinor?: number;
}>): CardProfit | null;

export function taxInclusivePortion(totalMinor: number, ratePercent: number): number;
