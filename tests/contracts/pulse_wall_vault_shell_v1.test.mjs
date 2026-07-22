import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function readSource(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

const expectedOrder = ["Pulse", "Wall", "Vault", "Scan", "Search"];

function assertOrdered(source, labels) {
  let cursor = -1;
  for (const label of labels) {
    const next = source.indexOf(`label: '${label}'`, cursor + 1) >= 0
      ? source.indexOf(`label: '${label}'`, cursor + 1)
      : source.indexOf(`label: "${label}"`, cursor + 1);
    assert.ok(next > cursor, `${label} must appear after the previous primary destination`);
    cursor = next;
  }
}

test("Flutter mobile dock leads with Pulse, Wall, and Vault", () => {
  const shell = readSource("lib/main_shell.dart");
  const dock = shell.match(/Widget _buildMobileBottomDock\([\s\S]*?\n\s*Widget _buildDockButton/)?.[0];
  assert.ok(dock, "mobile dock source must be present");
  assertOrdered(dock, expectedOrder);
  assert.doesNotMatch(dock, /label: 'Dex'/);
});

test("architecture contract preserves distinct pillar responsibilities", () => {
  const contract = readSource("docs/contracts/PULSE_WALL_VAULT_PRODUCT_ARCHITECTURE_V1.md");
  assert.match(contract, /Pulse answers \*\*what changed\*\*/);
  assert.match(contract, /Wall answers \*\*what is worth seeing or sharing\*\*/);
  assert.match(contract, /Vault answers \*\*what I own and what I can do with it\*\*/);
  assert.match(contract, /No production deployment or[\s\S]*irreversible database migration/);
});

test("network surfaces preserve progressive first paint", () => {
  const screen = readSource("lib/screens/network/network_screen.dart");
  const service = readSource("lib/services/network/network_stream_service.dart");
  assert.match(screen, /NETWORK_PROGRESSIVE_FIRST_PAINT_V2/);
  assert.match(screen, /unawaited\(_loadProvisionalCards\(resetGeneration\)\)/);
  assert.match(screen, /PULSE_UNREAD_BEST_EFFORT_V1/);
  assert.match(service, /NETWORK_DISCOVERY_PARALLEL_FETCH_V1/);
  assert.match(service, /NETWORK_DISCOVERY_BOUNDED_OVERFETCH_V1/);
  assert.match(service, /NETWORK_COLLECTOR_FIRST_PAINT_V1/);
  assert.match(service, /timeout\(const Duration\(seconds: 2\)\)/);
  assert.match(service, /_clampedInt\(limit \* 2, 24, 96\)/);
  assert.doesNotMatch(service, /_clampedInt\(limit \* 8, 48, 240\)/);
  assert.match(service, /Future\.wait<List<NetworkStreamRow>>\(\[/);
});

test("Pulse feed success is independent from unread badge failures", () => {
  const screen = readSource("lib/screens/network/network_screen.dart");
  const loadPulse = screen.match(
    /Future<void> _loadPulse\([\s\S]*?Future<PulseUnreadSnapshot\?> _fetchPulseUnreadBestEffort/,
  )?.[0];
  const unreadHelper = screen.match(
    /Future<PulseUnreadSnapshot\?> _fetchPulseUnreadBestEffort\([\s\S]*?Future<void> _applyPulseUnreadWhenReady/,
  )?.[0];

  assert.ok(loadPulse, "Pulse load source must be present");
  assert.ok(unreadHelper, "best-effort unread helper must be present");
  assert.match(loadPulse, /final unreadFuture = older \? null : _fetchPulseUnreadBestEffort\(\)/);
  assert.match(loadPulse, /final page = await pageFuture/);
  assert.match(loadPulse, /unawaited\([\s\S]*?_applyPulseUnreadWhenReady/);
  assert.doesNotMatch(loadPulse, /Future\.wait[\s\S]*?_pulseService\.fetchUnread/);
  assert.match(unreadHelper, /catch \(error\)[\s\S]*?unread_failed[\s\S]*?return null/);
});

test("append pagination cannot invalidate active-page ownership hydration", () => {
  const screen = readSource("lib/screens/network/network_screen.dart");
  const loadRows = screen.match(
    /Future<void> _loadRows\([\s\S]*?Future<void> _loadProvisionalCards/,
  )?.[0];
  const ownershipHelper = screen.match(
    /Future<void> _primeDeferredOwnership\([\s\S]*?void _debugOwnershipPrime/,
  )?.[0];

  assert.ok(loadRows, "network row loader must be present");
  assert.ok(ownershipHelper, "ownership hydration helper must be present");
  assert.match(loadRows, /NETWORK_RESET_GENERATION_V1/);
  assert.match(
    loadRows,
    /final resetGeneration = append\s*\? _resetGeneration\s*:\s*\+\+_resetGeneration/,
  );
  assert.match(loadRows, /resetGeneration: resetGeneration/);
  assert.doesNotMatch(loadRows, /final (?:loadVersion|resetGeneration) = \+\+_resetGeneration/);
  assert.match(
    ownershipHelper,
    /resetGeneration != _resetGeneration/,
  );
});

test("app startup does not prewarm the scanner", () => {
  const shell = readSource("lib/main_shell.dart");
  const init = shell.match(/void initState\(\) \{[\s\S]*?AppBootTiming\.mark\('app_shell_init_state_complete'\);/)?.[0];
  assert.ok(init, "app shell initState must be present");
  assert.match(init, /APP_STARTUP_NO_CAMERA_CONTENTION_V1/);
  assert.doesNotMatch(init, /NativeScannerPhase0Bridge\.startSession/);
  assert.doesNotMatch(init, /_prewarmScanCardSurface/);
});

test("mobile image and off-screen animation budgets stay bounded", () => {
  const main = readSource("lib/main.dart");
  const shell = readSource("lib/main_shell.dart");
  const network = readSource("lib/screens/network/network_screen.dart");
  assert.match(main, /MOBILE_IMAGE_MEMORY_BUDGET_V2/);
  assert.match(main, /cache\.maximumSize = 320/);
  assert.match(main, /cache\.maximumSizeBytes = 64 << 20/);
  assert.match(shell, /TickerMode\([\s\S]*?enabled: index == _destination\.stackIndex/);
  assert.doesNotMatch(network, /class _NetworkRefreshingBanner[\s\S]*?CircularProgressIndicator/);
});
