import assert from "node:assert/strict";
import test from "node:test";

import {
  assertTcgplayerMarketSourceRunwayV1,
  evaluateTcgplayerMarketSourceRunwayV1,
  TCGPLAYER_MARKET_MINIMUM_SOURCE_RUNWAY_HOURS_V1,
} from "../../backend/pricing/tcgplayer_market_source_runway_v1.mjs";

const NOW = new Date("2026-10-28T20:00:00.000Z");

test("write runs retain four hours of freshness runway", () => {
  const result = assertTcgplayerMarketSourceRunwayV1(
    { finished_at: "2026-10-27T12:00:00.000Z" },
    { now: NOW, freshnessHours: 36 },
  );
  assert.equal(TCGPLAYER_MARKET_MINIMUM_SOURCE_RUNWAY_HOURS_V1, 4);
  assert.equal(result.source_age_hours, 32);
  assert.equal(result.remaining_hours, 4);
  assert.equal(result.valid, true);
});

test("a source that can expire during publication fails before writes", () => {
  const result = evaluateTcgplayerMarketSourceRunwayV1(
    { finished_at: "2026-10-27T08:12:00.000Z" },
    { now: NOW, freshnessHours: 36 },
  );
  assert.equal(result.valid, false);
  assert.ok(result.remaining_hours < 4);
  assert.throws(
    () => assertTcgplayerMarketSourceRunwayV1(
      { finished_at: "2026-10-27T08:12:00.000Z" },
      { now: NOW, freshnessHours: 36 },
    ),
    /source_freshness_runway_insufficient.*rerun current warehouse sync/,
  );
});

test("future and malformed source timestamps fail closed", () => {
  assert.equal(evaluateTcgplayerMarketSourceRunwayV1(
    { finished_at: "2026-10-28T20:01:00.000Z" },
    { now: NOW, freshnessHours: 36 },
  ).valid, false);
  assert.throws(
    () => evaluateTcgplayerMarketSourceRunwayV1(
      { finished_at: "not-a-date" },
      { now: NOW, freshnessHours: 36 },
    ),
    /source_freshness_runway_invalid_timestamp/,
  );
});
