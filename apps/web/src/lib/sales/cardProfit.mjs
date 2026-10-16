export function cardProfit({ saleMinor, costMinor, incomeTaxBps = 2500, salesTaxMinor = 0, salesTaxMode = "pass_through" }) {
  if (!Number.isInteger(saleMinor) || !Number.isInteger(costMinor)) return null;
  const netRevenueMinor = salesTaxMode === "include_in_offer" ? saleMinor - salesTaxMinor : saleMinor;
  const grossProfitMinor = netRevenueMinor - costMinor;
  const incomeTaxMinor = grossProfitMinor > 0 ? Math.round(grossProfitMinor * incomeTaxBps / 10000) : 0;
  return { netRevenueMinor, grossProfitMinor, incomeTaxMinor, profitAfterTaxMinor: grossProfitMinor - incomeTaxMinor };
}

export function taxInclusivePortion(totalMinor, ratePercent) {
  if (!Number.isInteger(totalMinor) || !Number.isFinite(ratePercent) || ratePercent < 0) return 0;
  return Math.round(totalMinor - totalMinor / (1 + ratePercent / 100));
}
