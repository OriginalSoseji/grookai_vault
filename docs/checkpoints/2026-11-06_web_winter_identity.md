# Website Winter identity — November 6, 2026

## Candidate and authority

The owner requested activating the Winter website version. This isolated
`release/winter-brand-20261106` candidate starts from main
`b34a2d47b93d853ce7c301e2b7faec82cdb9d84e` and switches the shared logo theme
from Halloween to Winter. The original emblem and its 64px header canvas,
bundled Roboto, lowercase wordmark and weight 900 remain unchanged. Twelve
snowflakes replace the spiders; persistent pause/play and reduced motion remain.
The owner explicitly selected ice-blue buttons and highlights matching Winter.
The shared palette supplies `#87DDFA` in dark mode and accessible `#00627D` in
light mode. Winter logo colors are ice blue and bone. The brand contract,
visual contract, rulebook and agent entry point now record this owner decision.

## Verification

Eleven Playwright brand/layout checks pass, including original-logo silhouette
at 320/390/1440px, actual bundled Roboto Black, Winter header, twelve snowflakes,
motion, persistent pause/play, reduced motion, dark/light modes, accessibility,
and homepage geometry through 1920px. Seven targeted brand/font/asset/scanner checks pass.
Local browser tests use loopback read-only fixtures and no production secrets.
The original candidate passed the complete managed gate: 8,579 contract checks,
12 backend checks, typecheck, lint, strict build, Flutter analysis and 1,982
Flutter tests. Matching-blue source also passed the managed commit gate.
Refreshed visual references retain their image dimensions, with Winter artwork
and blue interactions. Full parity and final managed integration receipts are
recorded in the operator artifact folder.

All 159 default web parity checks pass against the refreshed references,
including accessibility, navigation, collector flows and bounded pagination.
Twenty-five screenshot references were refreshed; their dimensions are unchanged.

## Production baseline reconciliation

The initial domain readback resolved to manual deployment
`dpl_AiYpvmpM4ikxqNbeyWNHhfes5VtM`, created November 6, 2026, rather than the
latest successful GitHub/main deployment `7612033511`. The uploaded manual
deployment source differs from main across unrelated application features.
Do not replace that live feature baseline as an incidental seasonal change.
The owner did not have a technical preference between release sources. Preserve
the live feature baseline and apply only the seasonal update. A fresh check found
the newer manual deployment `dpl_ooY2WXDcVbR6etFvgrFRqLCZtTL3`; its archived
source parts have been hash-verified and the deployable source reconstructed in
`C:/grookai_web_winter_current_20261106`. Preserve its newer eBay fixes. Three
application files change: the shared theme definition, interaction CSS variables
and immersive scanner accents. All other deployable source/assets remain
unchanged, as recorded in the production patch manifest. The dirty development
root is not the deployment source. Keep this feature baseline separate from
main's canonical seasonal integration.

Eleven browser checks also pass on this exact live-source candidate, along with
typecheck, lint and the packaging guard. The scanner's dark immersive controls,
frame and spinner now follow the seasonal accent, including when the surrounding
application is in light mode. Its ink foreground retains the bright accent's
tested contrast.

Build the source in the existing Vercel production environment with
`--prod --skip-domain`, verify the candidate, then promote that exact deployment.
Do not upload loopback environment files or promote a local fixture build.
## Live production verification

Winter production deployment `dpl_5NeVV65RGPLjkNNurB27SaENK1Kk` was built from
the preserved live source in Vercel's existing production environment, qualified
while staged, then promoted to `https://grookaivault.com`. Its deployment URL is
`https://grookai-vault-9gie335q3-sosejis-projects.vercel.app`.

The production manifest verifies 2,542 baseline source/asset files, with exactly
three seasonal file changes and 2,539 unchanged files. Current eBay features,
backend routing, production release guards and original logo assets are retained.

Fresh anonymous browser checks passed on the actual domain at 390px and 1440px:
twelve animated Winter snowflakes, matching dark/light blue actions, original
64px emblem, loaded Roboto Black 900, lowercase wordmark, persistent pause/play,
reduced motion, no horizontal overflow, and zero serious/critical accessibility
violations. The development-only brand preview returns 404 in production.
Wait for theme transitions to finish before auditing stable-mode contrast.

The canonical branch contains the owner decision and regression protection.
Preserve the manual production feature baseline when integrating this branch:
stage any Git-triggered main deployment without assigning custom domains, retain
the verified Winter deployment and restore the original automatic-domain setting
after the main build is terminal. A main merge must not replace live eBay fixes.

Readback manifests, logs and screenshots are retained outside the repository at
`C:/grookai_vault_operator_artifacts/web_winter_20261106`.
