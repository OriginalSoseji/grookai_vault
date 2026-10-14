# Grookai App Redesign V2

## Objective

Replace the current collection of locally restyled screens with one coherent
mobile product system. The redesign must improve task clarity, information
hierarchy, and cross-screen consistency—not merely reskin existing widgets.

## Approved visual baseline

- Pulse: `artifacts/mockups/app_redesign_v2/pulse_v2.png`
- Vault: `artifacts/mockups/app_redesign_v2/vault_v2.png`
- Card Detail: `artifacts/mockups/app_redesign_v2/card_detail_v2.png`

## Shared system

- Background: deep graphite, approximately `#0B0F14`
- Raised functional surface: approximately `#131A22`
- Primary text: warm ivory
- Secondary text: muted cool slate
- Accent: restrained mint, approximately `#59D7C1`
- Market emphasis: warm gold, used only for evidence/value
- Dividers: one-pixel cool-gray rules
- Typography: compact high-quality sans; hierarchy comes from weight and
  contrast rather than oversized type
- Spacing: 20dp page inset, 12dp local rhythm, 44dp minimum targets
- Containers: flat sections by default; elevation only for overlays, sheets,
  and sticky controls

## Product model

- Pulse is social activity and discovery.
- Wall is public identity and curation.
- Scan is fast acquisition.
- Vault is private collection management.
- Search is structured discovery.
- Card Detail is the authoritative object and evidence view.

Each route must have one primary purpose. Controls belonging to a different
purpose move to the appropriate route or into progressive disclosure.

## Pulse

- Compact shared top bar; remove the oversized page header.
- Reduce the feed switch to `For you` and `Following`.
- Replace the permanent intent-chip strip with one filter control.
- Post order is collector, intact card, real actions, concise metadata.
- Card artwork uses its natural aspect ratio. No crop, distortion, or masked
  card edges.
- Actions expose only implemented behavior: message, details, and copy choice
  or add-to-vault when valid.
- No fake social metrics.

## Vault

- Lead with value, 30-day direction, total cards, and unique cards.
- Search remains immediately available.
- `Cards`, `Sets`, and `Lists` become the primary content switch.
- Filter, sort, and view controls share one quiet toolbar.
- Default grid items contain only intact artwork, name, and current value.
- Printing, quantity, ownership, and destructive controls move to detail or
  selection mode.

## Card Detail

- Pushed route with back and overflow; no root bottom navigation.
- Intact artwork first, followed by one identity block.
- Market evidence appears as one flat section, not a dashboard card.
- `Overview`, `Collection`, and `Activity` remain the progressive-disclosure
  model.
- Overview shows collection state and card-family navigation as divided rows.
- One sticky primary action: `Manage copy` when owned, otherwise the relevant
  acquisition or contact action.
- Destructive actions never appear in the default overview.

## Non-negotiables

1. Never crop or distort collectible-card artwork.
2. Never duplicate a card title in the same viewport without a navigation
   reason.
3. Never add a visual action without implemented behavior.
4. Never use nested generic cards to group ordinary information.
5. Keep all primary targets at least 44dp.
6. Loading skeletons must match final geometry.
7. Empty and error states must explain the next useful action.
8. The Samsung viewport is the first physical acceptance target.

## Implementation order

1. Establish shared color, type, divider, spacing, icon, and navigation tokens.
2. Rebuild the root shell and destination chrome.
3. Implement Pulse against the approved reference and verify its full states.
4. Implement Vault and its grid/list, filtering, loading, empty, and selection
   states.
5. Implement Card Detail and its three tabs, sticky action, zoom, and overflow.
6. Propagate the system to Wall, Search, Dex, Scan, messages, and sheets.
7. Run large-text, keyboard, screen-reader, Back, and Samsung visual checks.

