# Grookai Objects — Flutter reference implementation

Literal Dart, not a visual reference. Copy this folder into the app repo at
`lib/widgets/grookai_objects/` (or wherever PR1's plan puts it), then wire
PR2–PR4's forms to build objects and hand them to `GrookaiObjectRenderer`.
This is PR1 from `Memory & For Sale Cards - Codex Implementation Plan.dc.html`
already implemented — Codex should integrate/adapt it, not re-derive it from
the HTML mockups.

## Architecture — this is shared publishing infrastructure, not "Memory Cards"

Every object (Memory, For Sale, Lot, and future ones) flows through one
generic envelope and one renderer:

```
GrookaiObject { type, skin, layout, fields, metadata }
                              │
                              ▼
                   GrookaiObjectRenderer
                  (looks up `layout` in the
                   registry, has no per-type
                   branching of its own)
                              │
                              ▼
              grookaiObjectLayouts[layout]
        { 'memory.v1': ..., 'sale.v1': ..., 'lot.v1': ... }
```

`fields` is a plain `Map<String, dynamic>` — the renderer never knows or
cares whether a human filled it in a form or an AI assistant generated it.
Typed classes (`MemoryCardData`, `SaleListingData`, `LotListingData`) exist
purely as an ergonomic layer for the engineers building capture forms —
`.toFields()` / `.fromFields()` convert to and from the map the object
actually carries. Persist/transmit `GrookaiObject.fields`, not the
typed class.

**Adding a future object (Trade, Looking For, Showcase, New Pickup,
Completed Set, Tournament Win, Vault Milestone, Store Inventory, ...) is
additive only:**
1. A new typed data class with `.toFields()` / `.fromFields()` (copy the
   pattern in `grookai_object_models.dart`).
2. Two new layout widgets (front/back), reusing `GrookaiObjectFrame` and the
   shared atoms — copy the pattern in `memory_card_widgets.dart` /
   `sale_card_widgets.dart`.
3. One new entry in `grookai_object_layout_registry.dart`.

Nothing in `grookai_object.dart`, `grookai_object_renderer.dart`,
`grookai_object_frame.dart`, `grookai_object_skin.dart`, or
`grookai_object_atoms.dart` changes. An unrecognized `layout` id renders a
placeholder instead of crashing, so older clients degrade gracefully if a
newer object type ships ahead of them.

## Files

- `grookai_object_skin.dart` — `GrookaiObjectSkin` enum (onyx/ivory/kraft)
  and the `GrookaiObjectTokens` for each: exact colors, gradients, shadows,
  corner treatment, badge/CTA shape, font choices.
- `grookai_object_frame.dart` — `GrookaiObjectFrame`, the fixed 400×560
  decorative shell shared by every layout and skin.
- `grookai_object_atoms.dart` — reusable pieces used by more than one
  layout: `CardBadge`, `CardCta`, `CardDivider`, `CardFooterBrand`,
  `CardSellerRow`, `CardDetailRow`, `CardPriceTag`, `CardConditionChip`,
  `CardArtPlaceholder`, plus the `monoLabel()` / `serifTitle()` helpers.
- `grookai_object.dart` — `GrookaiObject`, the generic envelope
  described above, with `toJson()`/`fromJson()`.
- `grookai_object_models.dart` — typed field-schema convenience classes:
  `CardObjectRef`, `MemoryCardData`, `SaleListingData`, `LotListingData` +
  `LotItem`, each with `toFields()` / `fromFields()`.
- `grookai_object_layout_registry.dart` — the `layout` → widget-builder map.
  **This is the file you extend for every new object type.**
- `grookai_object_renderer.dart` — `GrookaiObjectRenderer`, the single
  widget every publish/share/post surface should render through.
- `memory_card_widgets.dart` — `MemoryCardFront` / `MemoryCardBack`.
- `sale_card_widgets.dart` — `SaleCardFront` / `SaleCardBack` (single card).
- `lot_card_widgets.dart` — `LotCardFront` / `LotCardBack` (multi-card
  bundle, per-card price tags on the front grid, itemized list on the back).

## Wiring notes for Codex

1. **Fonts** — assumes `google_fonts` (`GoogleFonts.instrumentSerif`,
   `GoogleFonts.splineSansMono`). Add to `pubspec.yaml` if missing, or swap
   `monoLabel()`/`serifTitle()` in `grookai_object_atoms.dart`.
2. **Icons** — uses stock `Icons.*` (`calendar_month`, `location_on`,
   `chat_bubble`) as a close substitute for the mockup's "Material Symbols
   Rounded." Swap if the app already loads a rounded icon font.
3. **Images** — `Image.network(...)` is a placeholder; replace with the
   repo's existing cached image widget for card art.
4. **Logo** — `CardFooterBrand` draws a solid-color placeholder box instead
   of the real Grookai Vault mark. Swap in the real asset.
5. **Flip (in-app)** — `GrookaiObjectRenderer` renders one side at a time
   via `showFront`; wrap two instances in whatever flip/PageView pattern is
   idiomatic in the repo. Not included here since it's pure interaction.
6. **Flattened export (PR5)** — not included in this folder. PR5's shared
   export service should render through `GrookaiObjectRenderer` (both
   sides) into one composited image per the flattened examples in
   `Card For Sale.dc.html` Rows 2 and 5 — reuse this same renderer/registry,
   don't rebuild the visuals a second time.
7. **Golden tests** — construct fixed `GrookaiObject` fixtures (one
   per layout × skin) in `test/grookai_objects/` and snapshot
   `GrookaiObjectRenderer` for both `showFront: true/false`.

## What this deliberately does NOT include

No service layer, no persistence, no multi-select UI, no ContactOwnerButton
wiring, no post/Pulse attachment, and no future object types beyond the three
in scope (Memory, Sale, Lot) — those are noted as future work in the plan
doc's appendix, not built here.
