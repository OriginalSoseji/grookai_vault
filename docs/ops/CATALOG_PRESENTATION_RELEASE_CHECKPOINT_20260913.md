# Catalog Presentation Release Checkpoint

Date: September 13, 2026. Status: candidate under verification, not deployed.

Base main/live: `4624a4517ffd81d46c8ad12e072306ff6ed7cf04`.
Branch: `fix/catalog-presentation-release-20260913`.
Tree: `C:/grookai_vault_catalog_presentation_release_20260913`.
Preserved design: `C:/grookai_vault_collector_release`.
Import manifest and original bytes: operator artifacts `catalog_presentation_20260913/import.json`
and `preserved-files/`. Existing main runtime matched the source base before import.

## Scope

- 119 self-hosted official package covers; verified exact-set representative
  card covers where admitted in the existing manifest.
- English display titles with separate Japanese names where source-backed.
- Readable display references; canonical UUID/GV-ID/routes remain unchanged.
- Card detail reads its own canonical printed abbreviation and total, which the
  old projection omitted. It no longer needs a hash-named set fallback for M4/M5/M6.
- Missing finish evidence says Finish not confirmed. Existing verified Normal,
  Reverse Holo and other choices are preserved, not inferred or generated.
- Public MTG/One Piece access repair is preserved from current main.
- No database, Storage, identity, price, ownership, worker or native-app change.

The local gallery is staging-only; it is not a production route. Keep every
existing navigation tab and the approved visual design. This is not a redesign.

## Limits And Remaining Work

All 343 recent Japanese image pointers completed previously stay live. Eight M6
source exceptions are prepared separately and are NOT published by this release.
Wider Japanese image coverage, missing bilingual sources, residual set covers,
authoritative child-printing creation and global numeric set pagination remain
separate. Do not represent this bounded presentation release as completing the
entire Japanese catalog or resolving every missing image.

## Release Gates

First frozen producer `0d5985b1a942140bab5916069a41639f45e4dd6d` passed
normal commit/push checks. PR 462 exposed a pre-existing visual-test environment
gap: the local Playwright server did not select a collector test mode and was
rejected by the production guard. The follow-up explicitly uses local read-only
mode and strips inherited production credentials. No production guard, screenshot
baseline, or application permission is relaxed. Attempt 1 was aborted with the
original deployment retained and automatic domain assignment restored.
The actual local run then exposed collector-theme inheritance in the native
fixture pages. The root collector class is now excluded only in the existing
local visual fixture mode, which is disabled in production and Vercel. Existing
goldens remain unchanged; normal collector pages retain their approved theme.
Local verification then passed all 104 existing visual/accessibility tests.
Detailed logs and preserved failure images: operator artifacts
`catalog_presentation_20260913/local-parity-03.log` and `parity-failure-02/`.

Require normal managed shipcheck, preserved live deployment/rollback, exact
source/main reconciliation, one staged production candidate, actual candidate
image/catalog/anonymous and signed-in smoke before promotion, then live readback.
Never repoint a dev build to production or bypass a failed critical check.
Use new execution artifacts, not the completed search-hotfix release authority.
