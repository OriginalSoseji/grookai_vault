import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

function readSource(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("E6 day-1 checkpoint matches current mobile onboarding wiring", () => {
  const checkpoint = readSource("docs/checkpoints/e6_onboarding_day1_checkpoint_20260713.md");
  const launch = readSource("docs/checkpoints/launch_readiness_gap_closure_20260713.md");
  const shell = readSource("lib/main_shell.dart");
  const sheet = readSource("lib/widgets/onboarding/onboarding_ladder_sheet.dart");
  const service = readSource("lib/services/onboarding/onboarding_ladder_service.dart");
  const cardDetail = readSource("lib/card_detail_screen.dart");
  const engagement = readSource("lib/services/network/card_engagement_service.dart");

  assert.match(checkpoint, /E6 onboarding UI is no longer a day-1 launch blocker/i);
  assert.match(checkpoint, /OnboardingLadderOverlay/);
  assert.match(checkpoint, /onboarding_ladder_state_v1/);
  assert.match(checkpoint, /onboarding_collector_suggestions_v1/);
  assert.match(checkpoint, /skip scanner work/i);

  assert.match(shell, /OnboardingLadderService/);
  assert.match(shell, /OnboardingLadderOverlay\(/);
  assert.match(shell, /_destination != _ShellDestination\.feed[\s\S]*_destination != _ShellDestination\.search/);
  assert.match(shell, /Onboarding is never allowed to block the shell/);

  assert.match(sheet, /Add a card to your vault/);
  assert.match(sheet, /Search instead/);
  assert.match(sheet, /Add a card you're chasing/);
  assert.match(sheet, /Collectors worth following/);

  assert.match(service, /onboarding_ladder_state_v1/);
  assert.match(service, /onboarding_record_rung_v1/);
  assert.match(service, /onboarding_skip_v1/);
  assert.match(service, /onboarding_collector_suggestions_v1/);
  assert.match(service, /recordOwnedBestEffort/);
  assert.match(service, /recordWantedBestEffort/);

  assert.match(cardDetail, /recordOwnedBestEffort/);
  assert.match(engagement, /recordWantedBestEffort/);

  assert.match(launch, /E6 onboarding day-1 checkpoint/);
  assert.doesNotMatch(launch, /E6 onboarding UI remains the largest product-experience launch gap/i);
});
