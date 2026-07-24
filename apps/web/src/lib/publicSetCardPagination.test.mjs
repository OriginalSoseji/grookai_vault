import assert from "node:assert/strict";
import test from "node:test";
import {
  dedupePublicSetCards,
  mergePublicSetCardPage,
} from "./publicSetCardPagination.ts";

function card(gvId) {
  return { gv_id: gvId };
}

test("dedupes cards without changing first-seen display order", () => {
  assert.deepEqual(
    dedupePublicSetCards([card("GV-1"), card("GV-2"), card("GV-1")]),
    [card("GV-1"), card("GV-2")],
  );
});

test("advances the server offset by every returned row, including duplicates", () => {
  const result = mergePublicSetCardPage({
    currentCards: [card("GV-1"), card("GV-2")],
    pageItems: [card("GV-2"), card("GV-3")],
    rawOffset: 2,
    pageSize: 2,
    totalCount: 8,
  });

  assert.deepEqual(result.cards, [card("GV-1"), card("GV-2"), card("GV-3")]);
  assert.equal(result.nextOffset, 4);
  assert.equal(result.hasReachedEnd, false);
});

test("a full duplicate-only page does not prematurely exhaust pagination", () => {
  const result = mergePublicSetCardPage({
    currentCards: [card("GV-1"), card("GV-2")],
    pageItems: [card("GV-1"), card("GV-2")],
    rawOffset: 2,
    pageSize: 2,
    totalCount: 8,
  });

  assert.deepEqual(result.cards, [card("GV-1"), card("GV-2")]);
  assert.equal(result.nextOffset, 4);
  assert.equal(result.hasReachedEnd, false);
});

test("stops when the raw page is short or consumes the declared row count", () => {
  const shortPage = mergePublicSetCardPage({
    currentCards: [card("GV-1")],
    pageItems: [card("GV-2")],
    rawOffset: 1,
    pageSize: 2,
    totalCount: 10,
  });
  const finalFullPage = mergePublicSetCardPage({
    currentCards: [card("GV-1"), card("GV-2")],
    pageItems: [card("GV-3"), card("GV-4")],
    rawOffset: 2,
    pageSize: 2,
    totalCount: 4,
  });

  assert.equal(shortPage.hasReachedEnd, true);
  assert.equal(finalFullPage.hasReachedEnd, true);
});
