import test from "node:test";
import assert from "node:assert/strict";
import {parsePublicPlayables, applyPlayableSignals} from "./publicPlayables.ts";

const now = Date.parse("2026-11-18T12:00:00Z");
const member = {card_print_id: "11111111-1111-4111-8111-111111111111", gv_id: "GV-PK-TEST-1", lists: 12, events: 3};
const fixture = () => ({version: "pokemon_playables_public:v1", game: "pokemon", format: "standard", platform: "paper",
  state: "ready", snapshot_id: "a".repeat(64), as_of: "2026-11-18T11:00:00Z", valid_until: "2026-11-19T11:00:00Z", rows: [member]});

test('public manifest validates scope and bounded freshness and strips private fields', () => {
  const value = {...fixture(), receipts: ["private"]};
  const parsed = parsePublicPlayables(value, now);
  assert(parsed);
  assert(!("receipts" in parsed));
  assert.equal(parsePublicPlayables(value, Date.parse(value.valid_until)), null);
  assert.equal(parsePublicPlayables(value, Date.parse(value.as_of) - 1), null);
  assert.equal(parsePublicPlayables({...value, valid_until: "2026-11-20T11:00:00Z"}, now), null);
  assert.equal(parsePublicPlayables({...value, platform: "online"}, now), null);
  assert.equal(parsePublicPlayables({...value, rows: [member, member]}, now), null);
  assert.equal(parsePublicPlayables({...value, rows: [{...member, lists: 0}]}, now), null);
});

test('badges require exact canonical ID and GVID and disappear at expiry', () => {
  const snapshot = parsePublicPlayables(fixture(), now);
  const cards = [{id: member.card_print_id, gv_id: member.gv_id},
    {id: member.card_print_id, gv_id: "GV-PK-DIFFERENT-1"},
    {id: "22222222-2222-4222-8222-222222222222", gv_id: member.gv_id}];
  const result = applyPlayableSignals(cards, snapshot, now);
  assert.equal(result[0].playable?.lists, 12);
  assert.equal(result[1].playable, undefined);
  assert.equal(result[2].playable, undefined);
  assert(applyPlayableSignals(result, snapshot, Date.parse(fixture().valid_until)).every(row => !row.playable));
});
