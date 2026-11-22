# Seasonal Brand System Contract V1

## Status and purpose

Active. Established at the product owner's request on 2026-11-07 to preserve
approved seasonal work and carry it forward across branches and releases.

This contract owns seasonal selection, shared palettes, motion, release records,
and continuity between seasons. It consolidates the owner's October 22 and
November 6 decisions; it does not create a second logo or typography authority.
The [brand contract](BRAND_TYPOGRAPHY_CONTRACT_V1.md) owns the emblem, names, and
typeface. The [visual system contract](APP_VISUAL_SYSTEM_CONTRACT_V1.md) owns
layout, neutral surfaces, geometry, and artwork presentation.

## Scope and precedence

- Brand preservation applies to every platform and branch. The seasonal
  implementation recorded here is the website implementation; it does not
  claim that native seasonal scenes have shipped.
- On the website, the active season owns interaction accents as well as the
  logo treatment. This overrides older fixed-lime website guidance. Lime/deep
  green remains the unthemed baseline.
- A missing implementation in an older checkout is integration drift. It is
  not permission to revert the season, choose a different palette, or publish
  an older visual baseline.
- Historical checkpoints record what was true at their release date. Their
  old deployment IDs and production-theme statements do not select today's
  season. A successful build alone does not prove which source is live.

## Permanent invariants

1. Preserve the original grookai emblem's geometry, internal design, aspect
   ratio, and proportions. Any color, gradient, multicolor treatment, holiday,
   season, or event is allowed. Derive variants from original artwork; never
   substitute a typed `G`, replacement monogram, redraw, crop, or distortion.
2. Keep the emblem intact as a separate layer. Decorative spiders, snowflakes,
   and future effects stay inside the profile frame and do not replace it.
3. Retain bundled/self-hosted Roboto, lowercase `grookai` / `grookai vault`, and
   shared standalone wordmarks at Black / weight 900.
4. Preserve the approved website lockup: 64px avatar canvas, 20px wordmark,
   and a positive 8px gap. Maintain the larger logo's presence and original
   proportions. Do not restore negative-margin overlap or tighten the name
   against the emblem during a seasonal swap.
5. Use one shared theme selection and palette for the logo, primary actions,
   selected states, focus, links, and interaction highlights, including immersive
   scanner controls. Light mode may use an accessible darker shade of the same
   hue. Keep ink/bone neutrals, warm market evidence, and semantic success,
   warning, and destructive colors meaningful.
6. Preserve persistent pause/play and operating-system reduced-motion behavior.
   Reduced motion disables decorative animation even if playback was previously
   enabled. Controls remain accessible; decorative effects stay out of the
   accessibility tree and never intercept interaction.
7. A season changes brand treatment and accents. Carry forward approved layout,
   content, routes, features, and artwork fixes. It grants no database, Storage,
   pricing, identity, authentication, or customer-state mutation authority.

## Season registry

Approved active website season as of 2026-11-07: **Winter**.
It remains selected until the owner deliberately chooses another treatment;
there is no automatic calendar rollover in this implementation.

| Treatment | State | Profile scene | Dark interaction | Light interaction |
| --- | --- | --- | --- | --- |
| Winter | Active | Falling snowflakes around the intact emblem | `#87DDFA` | `#00627D` |
| Halloween | Retained, inactive | Crawling/dangling spiders and web detail inside the avatar | `#FF8A33` | `#A74400` |
| Unthemed | Baseline, inactive | Original emblem without seasonal effects | `#B7F23A` | `#466D00` |

Current retained palette details:

| Role | Winter | Halloween |
| --- | --- | --- |
| Logo fill | `linear-gradient(135deg, #87ddfa, #c7f3fa 50%, #f4f5ed)` | `linear-gradient(135deg, #ffb45c, #ff8a33 45%, #b898f4)` |
| Soft accent | `rgb(135 221 250 / 12%)` | `rgb(255 138 51 / 12%)` |
| Dark container | `#143744` | `#4B2812` |
| Light container | `#C7F3FA` | `#FFDCC0` |

The Winter scene currently contains twelve snowflakes. Halloween retains three
spiders with web detail. These describe the retained implementation, not a
requirement that every future effect use the same particle count. Retain both
themes when selecting a different season; do not erase previous approved work.

## Shared implementation map

Paths are relative to the repository root. Integrate missing canonical files
before publishing an older branch.

- `apps/web/src/components/brand/brandTheme.ts`: `BRAND_THEMES`, the explicit
  `ACTIVE_BRAND_THEME`, `ACTIVE_BRAND_PALETTE`, and shared CSS palette bindings.
- `BrandText.tsx`, `BrandEmblem.tsx`, `BrandAvatar.tsx`,
  `SeasonalLogoEffects.tsx`, and `BrandMotionToggle.tsx` in that directory:
  shared wordmark, original emblem, framed scene, effects, and playback.
- `apps/web/public/grookai-logo-512.png`: original mask source;
  `grookai-logo-64.png`: original image fallback. Preserve their source geometry.
- `apps/web/src/app/layout.tsx`: applies the active theme and shared palette.
- `apps/web/src/app/launch-identity.css`: primary-token bindings for both modes,
  lockup spacing, original-artwork mask, seasonal effects, and motion handling.
- `apps/web/src/app/scan/scan.module.css`: immersive seasonal interaction accents.
- Playback preference: local-storage key `grookai-logo-motion`, synchronized
  through the shared toggle and `data-logo-motion` on the document element.
- `scripts/ci/check_web_visual_contract.mjs`: checked-in hosting guard. The
  Vercel build command is
  `node ../../scripts/ci/check_web_visual_contract.mjs && npm run build`.

## Carry-forward record

These references preserve how the approved system was established. They are
implementation lineage, not permission to redeploy an old snapshot.

| Milestone | Durable reference | What must survive |
| --- | --- | --- |
| Original app typography | Commit `11a430d58`; brand contract | Bundled Roboto, casing, shared Black 900 lockups |
| Halloween website | `docs/checkpoints/2026-10-22_web_halloween_identity.md` | Original emblem, larger avatar, animated spiders, matching orange, motion controls |
| Winter website | [PR #870](https://github.com/OriginalSoseji/grookai_vault/pull/870); `docs/checkpoints/2026-11-06_web_winter_identity.md` | Snowflakes, matching ice blue in both modes, retained accessibility and features |
| Header and set layout repair | [PR #873](https://github.com/OriginalSoseji/grookai_vault/pull/873) | Positive 8px lockup gap, upright compact set grid, readable names, responsive spacing |
| Restored Pokémon set artwork | [PR #876](https://github.com/OriginalSoseji/grookai_vault/pull/876); merge `6621ded5a1eb4e861a5af77626c45eee3c19d90f`; `docs/checkpoints/2026-11-07_set_artwork_restore.md` | Verified set/package art and exact logo fallbacks; no representative-card substitution; preserve other games' governed covers |

The artwork restoration recovered earlier commit `d8f5b70a7`, which had remained
on a feature branch. This is the concrete regression to prevent: a new seasonal
release must not silently discard an already-approved functional or visual fix.

## Changing or releasing a season

1. Read this contract, the two parent contracts, and the latest seasonal
   checkpoint. Establish the actual production source and preserve current
   features before preparing a candidate. Do not deploy a dirty unrelated tree.
2. Record the owner's selected treatment and update the active registry above.
   Define logo fill, dark/light accents, containers, and decorative scene through
   the shared system. Keep previous treatments available. Do not infer activation
   from the date, an old screenshot, or whichever branch is open.
3. Update the hosting guard's expected season together with an approved selector
   change. Retain its shared-accent, positive-spacing, upright-artwork, and
   artwork-selection checks. Do not remove the guard to publish an older branch.
4. Run the existing brand, palette/contrast, original-artwork, and applicable
   layout tests, plus normal checks required by the repository. Inspect the
   candidate at narrow mobile and desktop widths in light and dark modes:
   original silhouette, loaded Roboto Black, spacing, matching accents, decoded
   set images, readable text, keyboard focus, overflow, reduced motion, and
   persistent pause/play. Preserve zero serious/critical accessibility findings.
5. Record source SHA, asset provenance, checks, screenshots, and known limits in
   a dated `docs/checkpoints/YYYY-MM-DD_web_<season>_identity.md` using the
   [seasonal release template](../templates/SEASONAL_RELEASE_TEMPLATE.md).
   Keep durable decisions in Git, not solely in chat or local operator folders.
6. When publication is authorized, build a Vercel candidate without assigning
   live domains, inspect its verification result, then promote that exact
   passing deployment. Read back the actual public domain and source. Capture
   the result and a compatible rollback target that retains current features.
   Do not treat a preview, local screenshot, or merge alone as proof it is live.

Changing a permanent invariant requires an explicit owner decision, an audit,
and a versioned contract amendment under the contract index. Selecting a theme
within these invariants updates the registry and dated release record; it does
not redefine the logo, typography, or visual system.

## Verification references

Retain existing coverage, including:

- `apps/web/src/components/brand/brandTheme.test.ts`: palette contrast and
  original logo asset hashes.
- `tests/contracts/brand_typography_contract_v1.test.mjs`: actual bundled
  Roboto weights, shared casing/weight, seasonal bindings, and scanner accents.
- `test/brand_typography_contract_test.dart`: native typography authority.
- `apps/web/tests/parity/logo-themes.spec.ts`: rendered logo and motion behavior.
- `apps/web/tests/parity/sets-layout.spec.ts` and
  `tests/contracts/web_set_artwork_restore_v1.test.mjs`: retained set layout and
  approved Pokémon artwork selection.
- `scripts/ci/check_web_visual_contract.mjs`: fail-closed deployment protection.

This contract records existing product decisions and implementation lineage.
Creating it does not itself change application code or establish a fresh
production verification receipt.
