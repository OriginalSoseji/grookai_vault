import test from "node:test";
import assert from "node:assert/strict";
import { cardProfit } from "./cardProfit.mjs";

test("calculates the requested $100 cost, $80 paid, $90 offer example", () => {
  assert.deepEqual(cardProfit({ saleMinor: 9000, costMinor: 8000, incomeTaxBps: 2500 }), {
    netRevenueMinor: 9000, grossProfitMinor: 1000, incomeTaxMinor: 250, profitAfterTaxMinor: 750,
  });
});

test("treats sales tax as pass-through by default", () => {
  assert.equal(cardProfit({ saleMinor: 9000, costMinor: 8000, salesTaxMinor: 720 }).profitAfterTaxMinor, 750);
});

test("can subtract sales tax when the offer includes it", () => {
  assert.deepEqual(cardProfit({ saleMinor: 9000, costMinor: 8000, salesTaxMinor: 667, salesTaxMode: "include_in_offer" }), {
    netRevenueMinor: 8333, grossProfitMinor: 333, incomeTaxMinor: 83, profitAfterTaxMinor: 250,
  });
});
