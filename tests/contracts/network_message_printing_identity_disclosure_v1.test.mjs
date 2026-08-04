import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const service = fs.readFileSync(
  "lib/services/network/card_interaction_service.dart",
  "utf8",
);
const inbox = fs.readFileSync(
  "lib/screens/network/network_inbox_screen.dart",
  "utf8",
);
const thread = fs.readFileSync(
  "lib/screens/network/network_thread_screen.dart",
  "utf8",
);

test("message cards disclose absent child-printing identity", () => {
  assert.match(
    service,
    /String get printingIdentityLabel => 'Printing not specified';/,
  );
  assert.match(inbox, /group\.printingIdentityLabel/);
  assert.match(thread, /_thread\.printingIdentityLabel/);
});

test("message navigation does not fabricate an exact printing", () => {
  assert.doesNotMatch(thread, /selectedPrintingGvId:/);
  assert.doesNotMatch(thread, /selectedFinishLabel:/);
});
