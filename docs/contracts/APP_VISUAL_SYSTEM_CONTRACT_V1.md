# App Visual System Contract V1

## Status and scope

Active. Product-owner decision dated 2026-10-22: transfer the native app's
launch visuals to the website as the new product direction.

This contract governs the shared visual system across native and web clients,
including desktop web. The native implementation through `11a430d58` is the
reference, including the preceding launch identity, content priority, card
grid, activity inbox, and floating TCG switcher work. Typography and naming
are governed by [BRAND_TYPOGRAPHY_CONTRACT_V1](BRAND_TYPOGRAPHY_CONTRACT_V1.md).

## Canonical palette

| Role | Dark | Light |
| --- | --- | --- |
| Canvas | Ink `#080B09` | Bone `#F4F5ED` |
| Primary text | Bone `#F4F5ED` | Ink `#080B09` |
| Primary interaction | Electric lime `#B7F23A` | Deep green `#466D00` |
| Text on primary interaction | Ink `#080B09` | White `#FFFFFF` |
| Low surface | `#101310` | `#EEEFE7` |
| Surface container | `#151915` | `#E6E8DE` |
| Elevated surface | `#1B201B` | `#DCDED3` |
| Secondary text | `#B7BCAE` | `#50564C` |
| Divider / outline variant | `#343A32` | `#C2C6B9` |
| Market evidence | Warm `#F0AF6E` | `#8B4F13` |

Lime communicates interaction and selection. Market highlights use the warm
evidence color. Destructive, warning, and success states retain their semantic
meaning. Card artwork supplies the remaining visual color.

Any logo color or multicolor treatment is allowed, including playful seasonal,
holiday, and event themes, provided the original design and proportions remain
intact. The active seasonal website palette overrides interaction colors as
specified below; the neutral and semantic palette remains unchanged.

## Seasonal artwork and interface authority (owner clarification, 2026-11-06)

The owner explicitly selected ice-blue buttons and highlights to match the
Winter logo and reaffirmed that active seasonal website accents match the logo.
Use one shared theme definition for the emblem fill, primary actions, selected
states, focus and interaction highlights. Winter uses `#87DDFA` in dark mode
and accessible `#00627D` in light mode. The unthemed baseline remains electric
lime/deep green. Ink/bone neutrals, market evidence and semantic success,
warning and destructive states retain their meaning. This supersedes the
October27 fixed-lime website interaction rule. Original logo geometry and
proportions remain fixed across all seasonal treatments.

## Typography and hierarchy

- Preserve the original grookai emblem's design and proportions. Any color
  and seasonal theme is allowed; substituting a plain `G`, redrawing, cropping,
  or distorting the logo is not. The native reference's letter tile is not
  logo authority.
- Roboto is bundled and applied globally. Standalone lowercase wordmarks use
  Roboto Black / 900 through shared components.
- Headers are compact. Content, search, and collector actions take precedence
  over oversized page titles, repeated headings, and explanatory banners.
- Use weight, contrast, spacing, and thin dividers to establish hierarchy.
- Desktop layouts adapt to their width without changing the brand system.

## Geometry and surfaces

- Control radius: 8px. Functional surface radius: 8px.
- Artwork/tap radius: 10px. Floating surface radius: 16px.
- Card grid spacing: 9px in both directions across densities and route families.
- Native compact app bar: 48 logical pixels; web chrome remains compact and
  may accommodate desktop navigation and browser-safe controls.
- Flat functional surfaces and open sections are the default. Elevation is
  reserved for overlays, menus, and floating controls.
- Set grids use the native upright 5:7 artwork frame, 10px artwork inset, and
  compact title/metadata spacing. Keep at least two columns on phone widths
  and increase density on desktop. Do not rotate or add decorative shadows
  to set artwork. Preserve governed media selection, bilingual names, and
  game-specific routes; long titles use a readable two-line slot.
- Website Pokemon set-gallery artwork uses verified set/package art, then the matching set
  logo. Do not substitute representative, rare, or random card artwork. Restore
  the October 15 selection fix (`d8f5b70a7`) when integrating older branches.
  Missing set-level artwork remains explicit rather than showing another image.
  Other games retain their existing governed cover rules and media coverage.
- Avoid decorative blue washes, large rounded panels, and gradients behind
  ordinary information. Preserve intact artwork and stable loading geometry.

## Navigation and controls

- Keep `Pulse · Wall · Scan · Vault · Search` in the mobile dock.
- Scan is the prominent central theme-accent action. Selected roots use theme-accent icon/text
  and a quiet indicator. Slots and persistent labels do not shift on selection.
- Preserve functional route semantics, authentication, and existing actions.
- Use the branded activity entry and floating TCG switcher where the client
  supports the corresponding real behavior; do not add inert visual controls.
- Preserve keyboard access, visible focus, safe areas, readable contrast,
  enlarged text, reduced motion, and at least 44px web action targets.

## Precedence and verification

This product-wide direction supersedes conflicting older visual values,
including blue/mint palettes, larger corner radii, 6px grid gaps, and earlier
desktop-preservation clauses. It does not change data, pricing, identity,
privacy, or mutation authority.

Verify affected native/web surfaces at mobile and desktop widths, in dark and
light modes. Check actual rendered fonts, wordmark casing/weight, grid rhythm,
contrast, focus, loading/error states, and horizontal overflow. Preserve
existing nonvisual behavior. Local implementation does not itself authorize
publication or production activation.
