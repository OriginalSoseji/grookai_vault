import test from "node:test";
import assert from "node:assert/strict";
import { readIncomeTaxBps, writeIncomeTaxBps } from "./cardProfitSettings.mjs";

function storage() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}

test("round-trips a valid income tax assumption", () => {
  const s = storage();
  assert.equal(writeIncomeTaxBps(s, 2750), true);
  assert.equal(readIncomeTaxBps(s), 2750);
});

test("rejects invalid tax assumptions and uses the fallback", () => {
  const s = storage();
  s.setItem("grookai.card-profit.settings.v1", "10100");
  assert.equal(readIncomeTaxBps(s), 2500);
  assert.equal(writeIncomeTaxBps(s, -1), false);
});
