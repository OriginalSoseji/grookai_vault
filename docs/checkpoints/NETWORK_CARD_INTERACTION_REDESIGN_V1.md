# NETWORK_CARD_INTERACTION_REDESIGN_V1

## Objective
Make network cards larger, calmer, and interaction-first.

## Current Surface Audit
- network root: `lib/screens/network/network_screen.dart`
- card widget: inline `_NetworkStreamListTile` and `_NetworkStreamGridTile` inside `network_screen.dart`
- default visible actions: primary contact CTA, copy chooser when multiple copies exist, collector/source line, ownership summary, listing signal pill, created-at line
- front-face clutter: artwork is small relative to action chrome, intent + ownership badges compete with title, collector/source details and CTA buttons are always visible
- current CTA model: full card tap immediately navigates to detail/exact copy, while CTAs are also always visible on the face

## Final Design
- card widget: `lib/widgets/network/network_interaction_card.dart`
- front face contents:
  - artwork
  - card title
  - one quiet metadata line
  - one subtle intent badge
  - optional subtle price
- revealed action contents:
  - primary contact action when available
  - `View details`
  - `Choose copy` only when multiple copies make it necessary
  - quiet collector/time/context line moved into revealed state
- interaction trigger:
  - first tap expands inline
  - second tap collapses
  - action buttons perform the existing contact/detail/copy behavior
- files changed:
  - `lib/screens/network/network_screen.dart`
  - `lib/widgets/network/network_interaction_card.dart`
- why this feels cleaner:
  - cards are larger
  - front faces no longer compete with CTA chrome
  - reveal behavior is inline and restrained instead of route-first

## Verification
- analyze:
  - `flutter analyze --no-fatal-infos lib/screens/network/network_screen.dart lib/screens/network/network_discover_screen.dart lib/widgets/network/network_interaction_card.dart`
  - pass
- run:
  - `flutter run -d "iPhone 17 Pro"`
  - pass
- manual result:
  - live build launched successfully
  - simulator resumed on `My Wall`, so the run verified buildability but not a full live navigation capture of the network surface in this pass
- remaining rough edges:
  - `NetworkDiscoverScreen` still uses the older utility-card presentation
  - a second pass could tune expanded action sizing and discover-screen chrome for tighter parity

## Feed V2 Shift
- old model:
  - mixed utility layout with grid-first default, boxed chrome, and cards competing with lane controls and filters
  - first pass interaction model hid actions behind inline expansion
- new model:
  - feed-first default with one dominant card post per row
  - larger artwork, lighter metadata, and visible low-chrome action row on every card
  - grid kept as a secondary browsing mode
- why grid-first felt wrong:
  - cards read like inventory tiles instead of discovery content
  - filter and lane chrome pulled more visual attention than the cards themselves
- why feed-first fits Grookai better:
  - collectors can scroll through cards the way they browse posts
  - image-first reading makes intent and actions clearer without marketplace-dashboard clutter
- files changed:
  - `lib/screens/network/network_screen.dart`
  - `lib/screens/network/network_discover_screen.dart`
  - `lib/widgets/network/network_interaction_card.dart`
- remaining polish opportunities:
  - live Network-tab visual tuning once simulator/device navigation is cooperative
  - tighter motion and spacing tuning for the `Compact` mode after real scrolling review

## Luxury Pass V1
- what generic UI language was removed:
  - heavy rounded-box segmented control styling at the top of the screen
  - standard app-chip treatment for feed filters
  - plain light-gray panel feel around the feed cards and discover rows
  - generic utility-button energy in the visible action row
- what made the feed feel more premium:
  - subtle atmospheric gradients behind the feed instead of a flat app surface
  - card containers now read as staged editorial surfaces with gentler contrast and richer depth
  - typography hierarchy is more assertive for titles and quieter for metadata/support lines
  - controls now recede behind the feed instead of leading the experience
- how the card was staged more intentionally:
  - the hero area now uses a cleaner stage with a soft tonal glow and grounding shadow under the card
  - artwork occupies more visual authority with less competing chrome around it
  - the owner/context row is condensed into a more human editorial line instead of stacked system labels
- action treatment changes:
  - actions remain visible
  - primary action is subtly elevated inside the card footer
  - secondary actions read as quieter inline links rather than generic app buttons
  - the footer is integrated into the card with a lighter divider and calmer spacing
- remaining rough edges:
  - simulator shell automation still tends to reopen on `My Wall`, so the pass is analyzer/run verified but not fully live-captured on the Network tab from terminal automation
  - a final micro-pass could tune exact live spacing/contrast once we can reliably inspect the Network tab on device or simulator

## Full Bleed Feed V1
- what changed:
  - feed posts now use the card image itself as the base layer
  - title, metadata, context, and actions moved into overlays on top of the card
  - main Network chrome was compressed so the first card lands much higher in the viewport
- what container language was removed:
  - outer card shells around feed items
  - stacked card-inside-card presentation
  - section framing that made the stream feel like tiles inside a page
- what makes it feel more like content:
  - each post is nearly screen-width with a tall portrait presence
  - vertical rhythm is tighter, with much less separation between “post” and “page”
  - the card now reads as the content object instead of a child component inside another surface
- overlay treatment:
  - top context row sits directly on the image
  - bottom identity and action layers sit on a readability scrim
  - action footer is integrated into the image treatment rather than placed below it
- remaining rough edges:
  - `NetworkDiscoverScreen` is aligned tonally, but the main experiential leap is concentrated in the feed rather than the collector-search sidecar
  - a final live visual pass on the actual Network tab is still the best next refinement once simulator navigation cooperates

## Media-First Hierarchy Pass
- what overlay UI was removed:
  - the full-width glass header row on top of the card image
  - the bottom action bar that sat directly over the artwork
  - the heavy readability scrim that turned the art into a UI background
- what moved outside the image:
  - collector/avatar context row
  - card title
  - metadata and supporting line
  - visible action row
- how the card became more visible:
  - the image now stands alone as the media block with only a subtle frame and shadow
  - text no longer covers the focal art or border area
  - the feed now reads as profile row, media, caption, then actions
- how the action row changed:
  - actions now sit below the media and content instead of inside an overlay bar
  - primary contact action uses a lighter tonal shell
  - secondary actions read as quieter inline links rather than white overlay controls
- remaining rough edges:
  - a final live pass is still worth doing for exact spacing and footer density on the actual Network tab
  - compact/grid mode could use a dedicated density tune later if it becomes a primary discovery mode again

## Feed Density + Card-Anchored Interaction Pass
- spacing changes:
  - reduced list spacing between feed posts
  - tightened the owner-to-image, image-to-title, and support-to-action gaps inside each card
  - reduced extra bottom breathing room under the action footer
- what was tightened:
  - post-to-post rhythm so the next card peeks sooner
  - internal caption/footer rhythm so the feed reads more continuously
  - action chip density so the footer stays light
- card-anchored interaction CTA added:
  - `Ask about this card`
  - for a direct live copy it opens the same card-owner contact composer
  - for multi-copy rows it routes into copy selection before contact
- existing contact/thread flow reused:
  - `ContactOwnerButton` and `CardInteractionService.sendMessage`
  - messages remain keyed to `vault_item_id` and `card_print_id`
  - existing inbox/thread surfaces continue to own the conversation UI
- why generic comments were rejected:
  - the product interaction is card-specific owner contact, not public discussion
  - a generic social comment layer would add noise without fitting the current collector flow
- remaining rough edges:
  - `View details` is now deprioritized behind direct card tap for most feed posts
  - a live visual pass could still fine-tune the exact footer density on device
