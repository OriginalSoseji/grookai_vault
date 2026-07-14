import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

function readSource(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("top one percent launch hardening checkpoint records device proof and remaining gates", () => {
  const checkpoint = readSource("docs/checkpoints/top_one_percent_launch_hardening_session_20260713.md");
  const launch = readSource("docs/checkpoints/launch_readiness_gap_closure_20260713.md");

  assert.match(checkpoint, /Samsung `SM-S908U`/);
  assert.match(checkpoint, /R5CT3291F6E/);
  assert.match(checkpoint, /GROOKAI_CRASH_REPORTING_SELF_TEST/);
  assert.match(checkpoint, /FirebaseCrashlyticsTestCrash/);
  assert.match(checkpoint, /crashlyticsreports-pa\.googleapis\.com/);
  assert.match(checkpoint, /Norton SSL\/TLS inspection/i);
  assert.match(checkpoint, /No repo Gradle settings or Android Studio JBR files were changed/i);
  assert.match(checkpoint, /20260709100000/);
  assert.match(checkpoint, /20260709110000/);
  assert.match(checkpoint, /20260713190000/);
  assert.match(checkpoint, /Firebase console must show/i);
  assert.match(checkpoint, /Scanner V5 real-device recognition proof remains deferred/i);

  assert.match(launch, /Samsung Crashlytics[\s\S]*self-test proof/i);
  assert.match(launch, /20260713190000/);
});
