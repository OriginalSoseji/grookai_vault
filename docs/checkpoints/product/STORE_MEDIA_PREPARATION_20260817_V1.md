# Store Media Preparation - 2026-08-17 V1

## Context

The launch-readiness audit had valid store metadata but no prepared submission
media. This gate prepared truthful, dimension-checked media from existing
Grookai production and device evidence without fabricating product views or
claiming that either store console was ready.

Work was performed on `agent/launch-readiness-store-qa-v1` from commit
`05371c9db0a96ec965f34b6bd9ff820d54643d3c`.

## Decisions

- Store media is generated deterministically from captured product evidence.
- Google Play uses only native Android build 297 screenshots. Responsive web
  captures are not presented as Android app screenshots.
- The Google package contains the required minimum of two phone screenshots:
  exact-name search results and exact card detail.
- The iPhone 6.5 asset uses a physical iPhone Search capture. The source build
  is 286; no material Search redesign occurred through release build 297.
- The iPad screenshot is a native render from the current Grookai commit on an
  exact iPad Pro 12.9-inch simulator running iPadOS 26.5.
- A nonempty file is not sufficient evidence. The readiness audit now parses
  PNG headers and verifies every declared asset dimension.

## Current Truths

### Prepared media

- Google Play app icon: `512 x 512`.
- Google Play feature graphic: `1024 x 500`.
- Google Play Search screenshot: `1080 x 2160`.
- Google Play card-detail screenshot: `1080 x 2160`.
- App Store iPhone 6.5 Search screenshot: `1242 x 2688`.
- App Store iPad Pro 12.9 sign-in screenshot: `2048 x 2732`.
- Invalid asset dimensions: `0`.
- Missing declared assets: `0`.

### iPad provenance

- Asset: `artifacts/app_store/screenshots/prepared/ipad_pro_129_01_signin.png`.
- Source commit: `a69a3c55c02a7737b399e52fe50b5743be7e5f8a`.
- Runtime: iPadOS 26.5 on iPad Pro 12.9-inch (3rd generation) simulator.
- The screenshot shows the native signed-out entry experience; it is not
  labeled or represented as Search.

### Submission state

- Repository store contract: valid.
- Store submission ready: no.
- App Store Connect listing: not authenticated or verified.
- App Review credentials: not verified.
- Google Play developer account: unavailable in the observed account.
- Google Play Console is authenticated but stopped at developer-account owner
  type selection (`organization` or `personal`).
- Google Play listing: not verified.

## Artifact Hashes

- Google icon:
  `1e1b648bc2210fe8b46c56cad5b79a24941957ad7533cb9dfea7a7aa67893651`.
- Google feature graphic:
  `99b6aa9ef01582746a17d1c13cefb8934920efb863a651d95655e5b6cb88db1e`.
- Google Search screenshot:
  `78b87ee5f28cdcdcbb8f9e4a0ebc9d57eb8d12f2296fa2e7fdef482054a97b2d`.
- Google card-detail screenshot:
  `9254db16fe8414b82b53ff4e9caa2e3bd2bbef77016d1f9d1630f452e6e4cfad`.
- App Store iPhone screenshot:
  `7d43d8d5ac456d7303ac85681230d53d018dff98ae3ccb031871f086595c68de`.
- App Store iPad screenshot: recorded in the regenerated permanent manifest.

The permanent hash and provenance manifest is
`docs/audits/store_release_readiness_v1/store_media_manifest_v1.json`.

## Verification

- Store media generator: passed.
- Store media visual inspection: passed for all six prepared assets.
- Store readiness contract tests: `3/3` passed.
- Store readiness status: `EXTERNAL_OR_ASSET_BLOCKED`.
- Repository findings: `0`.
- Invalid asset dimensions: `0`.

## Invariants

1. Prepared media is not equivalent to an uploaded or approved store listing.
2. Web captures must not be represented as native Android screenshots.
3. A screenshot from an obsolete product experience must not be silently
   carried forward after a material redesign.
4. An iPad screenshot must come from a real current iPad render.
5. Store review credentials must never be written to repository artifacts.
6. `--require-ready` must continue to fail until every asset and external gate
   is verified.

## Exact Next Gate

1. Authenticate App Store Connect and verify the listing, build 297, privacy
   answers, review account, and screenshot sets.
2. Select the legal Google Play developer-account ownership type, complete
   account creation, then verify the listing,
   app access, Data Safety answers, and uploaded assets.
3. Run `npm run release:store:require`. Only a zero-blocker result authorizes
   the submission handoff.
