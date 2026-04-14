# OWNERSHIP ROLLOUT P2 CONSISTENCY PASS V1

## P2 Surface Audit
- surface: Compare workspace
  owner file: `lib/screens/compare/compare_screen.dart`
  card type: canonical compare cards (`ComparePublicCard`)
  current ownership awareness: none
- surface: Related versions sheet
  owner file: `lib/card_detail_screen.dart`
  card type: canonical related print rows
  current ownership awareness: none
- surface: Public set detail cards
  owner file: `lib/screens/sets/public_set_detail_screen.dart`
  card type: canonical public set cards (`PublicSetCard`)
  current ownership awareness: none
- surface: Messaging inbox tiles
  owner file: `lib/screens/network/network_inbox_screen.dart`
  card type: card-anchored thread summaries (`CardInteractionThreadSummary`)
  current ownership awareness: none
- surface: Messaging thread header
  owner file: `lib/screens/network/network_thread_screen.dart`
  card type: card-anchored thread header context (`CardInteractionThreadSummary`)
  current ownership awareness: none
- surface: Scanner identify results
  owner file: `lib/screens/scanner/scan_identify_screen.dart`
  card type: identify candidate rows keyed by `card_print_id`
  current ownership awareness: none

## Notes
- `lib/card_detail_screen.dart` already uses `OwnershipResolverAdapter` for the primary card, so the related-versions sheet can reuse that adapter safely.
- All P2 targets are secondary surfaces, so the rollout should stay badge/text-only with no new CTA paths.
