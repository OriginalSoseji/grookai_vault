import test from "node:test";
import assert from "node:assert/strict";
import { equalSplit, weightedSplit } from "./acquisitionAllocation.mjs";

test("equal split reconciles a 50-card $300 lot", () => {
  const values = equalSplit(30000, 50);
  assert.equal(values.length, 50);
  assert.equal(values.every(value => value === 600), true);
  assert.equal(values.reduce((sum, value) => sum + value, 0), 30000);
});

test("equal split preserves remainder cents", () => {
  const values = equalSplit(100, 3);
  assert.deepEqual(values, [34, 33, 33]);
  assert.equal(values.reduce((sum, value) => sum + value, 0), 100);
});

test("weighted split reconciles without floating point drift", () => {
  const values = weightedSplit(1000, [1, 9]);
  assert.deepEqual(values, [100, 900]);
  assert.equal(values.reduce((sum, value) => sum + value, 0), 1000);
});
