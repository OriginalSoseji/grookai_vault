# Collector Integration Fixture

Local route: `/visual-fixtures/collector?view=pulse`.
Other views: `discover`, `empty`. Unknown views return not-found.

Uses the unchanged `isLocalVisualParityFixtureMode` gate: `GROOKAI_VISUAL_TEST_MODE=1`,
non-production `NODE_ENV`, and `VERCEL` not `1`. The root layout supplies the global
`html.gv-collector` styling and suppresses live AppChrome under that existing gate.
The fixture explicitly mounts real `SiteHeader` and `MobileParityDock` components.
Shell props expose authenticated navigation; social controls have signed-out props.
All card, collector, set and binder inputs are synthetic and are not DB records.
The fixture imports no preview code, no data readers and no mutation calls.

## Main-Agent Run

The main agent owns server lifecycle. Do not start a second Next dev/build process
against this worktree's `.next` output. Do not stop either approved preview server.
Stop only the owned real server before starting fixture mode, then restore it after
the test run. Keep Supabase configured to local only; no real login/session is needed.

The separate config **does not start or stop a server**. It expects the gated app on
`http://127.0.0.1:3164` (override with `GROOKAI_COLLECTOR_TEST_PORT`).

From `apps/web`:

```powershell
node --test tests/collector/gate.test.mjs
node --test tests/collector/fixtureTransport.test.mjs
npx playwright test -c playwright.collector.config.ts --list
npx playwright test -c playwright.collector.config.ts
```

Requires the already-installed Playwright Chromium browser and local fixture art:
`public/visual-fixtures/collector/{charizard199,blastoise200,venusaur198}.jpg`.
Only read-only artwork copies from the approved preview are intended here, not its
data, component code or localStorage. Missing images are deliberate test failures,
not a reason to substitute remote URLs or hide the assertions.

`fixtureAssets.ts` supplies three exact, supported `images.pokemontcg.io` URL shapes.
`installCollectorFixtureRoutes(context, baseURL)` from `fixtureSetup.ts` intercepts
each of them and returns its own local WebP bytes (the copied filenames end in `.jpg`). It also intercepts only optimizer
wrappers of those exact URLs; arbitrary optimizer targets fail closed. Both the
visual and accessibility suites install this helper. No CDN request is forwarded.
Use a headed Playwright run for interactive inspection with this local transport;
opening the bare fixture URL outside the harness can request the public CDN images.
No production image-normalization or Next image configuration is changed.

## Coverage And Limits

Eight browser tests across phone/desktop and light/dark (32 cases). Tests cover
all primary/secondary/account destinations, Pulse Discover selection, actual
card/collector links, exact-copy disclosure, signed-out follow/contact links,
the real `ExploreDiscoverySections` composition and its cards/sets/discovery links,
card-grid geometry, real set/binder covers, missing-image states, binder progress,
long labels, theme switching and section/viewport overflow. Artwork must load and
have nonblank rendered screenshot pixels with `object-fit: contain`. Explicit image
counts are 17 in Pulse, 15 in Discover/empty, 8 in catalog discovery, 3 in the standalone
card grid and 2 each in Pulse, set covers and binder covers. Full-page integration and
individual component screenshots are attached to the report, not auto-approved
snapshot baselines.

Fresh isolated contexts reject unmapped external, API and non-GET requests. Only
same-origin POST `/__nextjs_original-stack-frames` is silently aborted (never forwarded)
for the notFound development overlay. Other writes still abort and fail. Tests inspect
real link targets but do not navigate into backend routes or execute mutations.
They do not prove live auth, database policy, pricing, ownership or discover search
reader behavior. The real route orchestration and search forwarding have separate
Node tests in `tests/contracts/pulse_discover_presentation_v1.test.mjs` at repo root.
The fixture path itself is not a real `/network` route, so SiteHeader active-primary
route inference is not simulated; the real Pulse section nav and mobile dock are.

Artifacts: `test-results/collector` and `playwright-report/collector` (ignored output).
Browser execution is delegated to the main agent; static checks are not visual QA.
