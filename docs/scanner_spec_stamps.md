# Grookai Vault — Stamp/Overlay Scanner Spec

## Crops (relative % on full card image)
- Number/rarity/set zone: left 0.62, top 0.84, width 0.35, height 0.12
- Artwork overlay zone:    left 0.18, top 0.28, width 0.64, height 0.30

## OCR Patterns
- Collector: `(\\d{1,3})\\s*/\\s*(\\d{2,3})`
- Year: `20\\d{2}`

## Variant Labels (initial)
- NONE
- PRERELEASE
- STAFF
- WINNERS_2025
- WORLDS_2024
- WORLDS_2025
- POKEMON_CENTER
- CHAMPIONSHIP_2025

## Decision Order
1) Classifier on artwork overlay zone → label + confidence
2) OCR text-stamp fallback (PRERELEASE/STAFF/WINNER(S)/WORLD(S)/POKEMON CENTER/CHAMPIONSHIP + year)
3) Normalize → `WINNERS_YYYY`, `WORLDS_YYYY`, `CHAMPIONSHIP_YYYY`, etc.
4) If both fail → `NONE` with low confidence

## DB Contract
- cards.variant_tag TEXT DEFAULT 'NONE'
- cards.has_overlay BOOLEAN DEFAULT false
- cards.stamp_confidence NUMERIC

