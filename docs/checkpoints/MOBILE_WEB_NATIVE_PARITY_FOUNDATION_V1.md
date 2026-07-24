# MOBILE_WEB_NATIVE_PARITY_FOUNDATION_V1

## Status

Local foundation implemented on
`codex/mobile-web-native-parity-v1`.

- Baseline: `abb42bddb170fe2ac71a21cc7036269c83c8b9dd`
- Push: not performed
- Preview/production deployment: not performed
- Database/migrations: unchanged

## Owner amendment

The approved mobile dock is:

```text
Pulse · Wall · Scan · Vault · Search
```

The Flutter source and its shell contract test now encode Scan in position 3,
Vault in position 4, and Scan as a non-stateful global action. The installed
Samsung APK still contains the previously built order until a separately
authorized app build is installed.

## Foundation artifacts

- Active visual parity contract:
  `docs/contracts/MOBILE_WEB_NATIVE_VISUAL_PARITY_CONTRACT_V1.md`
- Frozen installed-app manifest:
  `docs/audits/mobile_web_native_parity_v1/app_canon_manifest.json`
- Route/state matrix:
  `docs/audits/mobile_web_native_parity_v1/route_state_matrix.json`
- Shared mobile shell manifest:
  `apps/web/src/lib/mobileParity/shellManifest.ts`
- Fail-closed local fixture mode:
  `apps/web/src/lib/visualParity/fixtureMode.ts`
- Sanitized fixture surfaces:
  `apps/web/src/components/visualParity/VisualParityScenario.tsx`
- Candidate canonical dock primitive:
  `apps/web/src/components/mobileParity/MobileParityDock.tsx`
- Playwright visual/accessibility runner:
  `apps/web/playwright.config.ts`
- Pinned web dependency lock:
  `apps/web/package-lock.json`
- Pull-request parity workflow:
  `.github/workflows/mobile-web-parity.yml`

## Sanitized baselines

The initial `384 × 824` baseline covers:

- Pulse empty;
- Wall populated;
- Scan ready;
- Vault populated;
- Search discovery;
- secondary menu open.

Raw Samsung captures containing owner data remain local and are represented
only by content-free hashes in the canon manifest.

## Foundation guarantees

- Visual fixture routes require `GROOKAI_VISUAL_TEST_MODE=1`.
- Fixture routes fail closed when `VERCEL=1` or `NODE_ENV=production`.
- Normal header, dock, footer, analytics, auth lookup, and Supabase reads are
  omitted in fixture mode.
- Browser tests abort non-local requests.
- Golden updates require the explicit `test:parity:update` command.
- CI runs comparison only and never updates baselines.
- Serious/critical axe violations fail.
- Dock order, route targets, Scan selection behavior, touch targets, geometry,
  keyboard focus, and horizontal overflow are enforced.

## Deliberately not implemented in the foundation

The current production mobile-web header and dock have not yet been replaced.
They remain behind the next gated shell phase because:

- the current Scan link targets CSV import rather than a real scanner;
- the current server fallback and client dock disagree;
- replacing them without the route-aware shell would create broken or dishonest
  navigation.

The next safe phase is the route-aware mobile shell and primitive integration.
It must replace client and fallback chrome together, create a genuine `/scan`
capability flow, preserve desktop at `900px+`, and reuse the deterministic
fixtures added here.
