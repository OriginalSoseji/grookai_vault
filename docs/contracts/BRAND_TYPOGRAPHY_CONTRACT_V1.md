# Brand and Typography Contract V1

## Status and scope

Active. Established by the product owner's direction on 2026-10-21.

This is the canonical brand and typography authority for the entire product:
Flutter on Android, iOS, web, and desktop; the Next.js web application; shared
components; user-facing copy, metadata, exports, and generated brand assets.
It applies to all branches and future redesigns.

## Typeface

- Roboto is the official application typeface and must be explicitly applied
  through the global application theme or stylesheet.
- Bundle or self-host the font assets with each client. Installed system fonts
  and runtime font downloads are not the source of application typography.
- Use actual font assets for authored weights, including Roboto Black at 900
  for brand lockups. Preserve font licensing with the assets.
- Component styles must inherit the shared type system rather than introduce
  competing decorative typefaces. Platform glyph fallback may cover characters
  absent from Roboto; it must not replace the primary application typeface.

## Names and branded labels

- Brand name: `grookai`.
- Product name: `grookai vault`.
- The brand token stays lowercase at the start of a sentence, in navigation,
  headings, authentication screens, metadata, and generated user-facing copy.
- Branded feature labels retain their feature casing: `grookai Discovery`,
  `grookai Dex`, and `grookai Objects`.
- Do not mechanically rename code identifiers, database objects, routes,
  package names, or historical evidence to enforce display casing. Apply the
  rule to their user-facing presentation.

## Standalone brand lockups

### Original logo design (owner clarification, 2026-10-22)

- The original grookai emblem is fixed brand artwork. Preserve its original
  design, internal geometry, and proportions across every platform.
- Any logo color is allowed, including monochrome and multicolor treatments.
  The logo is not restricted to its original colors, white, black, or the
  product's lime interaction accent.
- Seasonal, holiday, and event themes are an approved part of the brand.
  Playful themed treatments may vary over time while preserving the original
  emblem's design, internal geometry, proportions, and recognizability.
- Animated profile-logo treatments are allowed: Halloween uses spiders inside
  the avatar and Winter uses falling snowflakes. Keep decorative motion within
  the profile frame and retain the original emblem as a separate, intact layer.
  Honor reduced-motion preferences and provide pause/play for continuous motion.
- Color and theme flexibility do not authorize replacing the logo with a
  typed `G` or another monogram, redrawing it, cropping it, or distorting it.
- Derive themed variants from the original approved artwork. The website's
  default header asset is `/grookai-logo-64.png`; this default does not prohibit
  color or seasonal variants that preserve the original design.
- The Roboto Black rule governs the text wordmark, not the emblem's design.
- This clarification overrides any reference implementation that substitutes
  a plain `G` tile for the original logo.

The website shares `BrandEmblem` across lockups. Set `--gv-logo-fill` to a CSS
color or gradient, or pass the component's `fill` property, to apply a theme.
Its mask uses the original `/grookai-logo-512.png` artwork; the existing PNG
remains the fallback. Never introduce replacement geometry for a color theme.
The development-only `/brand-preview` page offers interactive color examples
and is unavailable in production and Vercel environments.
`BrandAvatar` adds the seasonal profile scene. Website lockups use a 64px
emblem canvas beside the 20px text wordmark so the original logo has greater
visual presence; preserve its proportions and existing artwork when resizing.

### Text wordmarks

- Standalone `grookai` and `grookai vault` lockups always use Roboto Black,
  weight 900, regardless of the surrounding heading style.
- Flutter lockups use the shared `GrookaiBrandText` component backed by
  `GvTypography`. Other clients must use an equivalent shared component with
  the same names, font family, and weight.
- Callers may adjust layout, size, color, and spacing without overriding the
  canonical text, font family, or weight. Do not recreate lockups with ad hoc
  text styles.
- Ordinary prose and feature labels follow the application text hierarchy;
  the mandatory weight 900 rule applies to standalone brand lockups.

## Matching seasonal accents

The active logo theme also owns the interface accent. Halloween uses the logo's
orange `#FF8A33` for primary actions, selected states, focus, and interaction
highlights. Future seasonal themes must supply matching logo and interface
colors together through one shared theme definition. Light mode may use a
darker accessible shade of the same hue. Semantic status colors keep their
meaning. The original emblem geometry remains unchanged.

## Authority and integration

This contract supersedes conflicting font and brand-casing guidance in older
plans, screenshots, checkpoints, local styles, and platform defaults. A branch
without the implementation has an integration gap; it does not define an
alternative brand standard. Integrations and redesigns must preserve these
rules and the associated regression coverage.

Commit `11a430d58` is the initial Flutter implementation reference, including
bundled Roboto weights, global theme configuration, `GvTypography`,
`GrookaiBrandText`, and `test/brand_typography_contract_test.dart`. This
contract's authority comes from the product decision and its Active entry in
the contract index, independently of that commit's presence in a checkout.

Changes to the official font, names, or lockup weight require an explicit
product-owner decision and a corresponding amendment to this contract.

## Verification

When implementing or changing brand presentation:

- Verify the packaged font assets and global theme or stylesheet explicitly
  select Roboto on each affected client.
- Retain contract tests for font family, bundled assets, canonical names, and
  shared lockup weight 900; extend equivalent coverage to other clients.
- Check affected visible labels and lockups for casing, actual rendered font,
  text fit, and weight on the target platform.
- Report verification for the checkout and build actually inspected. Previous
  build or device evidence is not proof for another branch or client.

## Related authority

- [Contract index](../CONTRACT_INDEX.md)
- [Master rulebook](../GROOKAI_RULEBOOK.md)
- [Flutter visual convergence](FLUTTER_VISUAL_CONVERGENCE_V1.md)
