import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

function read(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

test("MEE live ops readiness verifier checks timer state and human failure routes", () => {
  const scriptPath = "deploy/scripts/verify-mee-live-ops-readiness.sh";
  const script = read(scriptPath);

  assert.equal(existsSync(new URL(`../../${scriptPath}`, import.meta.url)), true);
  assert.match(script, /grookai-mee-reference-refresh\.timer/);
  assert.match(script, /grookai-mee-nightly\.timer/);
  assert.match(script, /grookai-mee-reference-refresh\.service/);
  assert.match(script, /grookai-mee-nightly\.service/);
  assert.match(script, /systemctl is-enabled "\$\{timer_name\}"/);
  assert.match(script, /systemctl is-active "\$\{timer_name\}"/);
  assert.match(script, /NextElapseUSecRealtime/);
  assert.match(script, /LastTriggerUSecRealtime/);
  assert.match(script, /OnFailure/);
  assert.match(script, /FailureAction/);
  assert.match(script, /print_failure_route_units/);
  assert.match(script, /systemctl cat "\$\{unit_name\}"/);
  assert.match(script, /no_human_alert_route_configured/);
  assert.match(script, /MEE_LIVE_OPS_NOT_READY/);
  assert.match(script, /MEE_LIVE_OPS_READY/);
});
