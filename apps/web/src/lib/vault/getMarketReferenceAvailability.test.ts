import assert from "node:assert/strict";
import test from "node:test";
import { getMarketReferenceAvailability } from "./getMarketReferenceAvailability.ts";

test("explains why graded copies have no raw market reference", () => {
  const result = getMarketReferenceAvailability({ isGraded: true, cardPrintingId: "printing-1" });
  assert.equal(result?.code, "graded");
  assert.match(result?.description ?? "", /exact raw printings/i);
});

test("calls out a missing exact printing", () => {
  const result = getMarketReferenceAvailability({ isGraded: false, cardPrintingId: null });
  assert.equal(result?.code, "missing_printing");
  assert.match(result?.description ?? "", /linked to a printing/i);
});

test("distinguishes an unavailable reference from zero", () => {
  const result = getMarketReferenceAvailability({ isGraded: false, cardPrintingId: "printing-1" });
  assert.equal(result?.code, "no_fresh_reference");
  assert.match(result?.description ?? "", /not a zero value/i);
});
