import 'package:flutter/widgets.dart';
import 'grookai_object_skin.dart';
import 'grookai_object_models.dart';
import 'memory_card_widgets.dart';
import 'sale_card_widgets.dart';
import 'lot_card_widgets.dart';

/// Renders one side of a card object given its skin + raw field map.
/// [onPrimaryAction] is only used by layouts with a CTA (sale/lot); layouts
/// without one (memory) simply ignore it.
typedef CardLayoutBuilder =
    Widget Function(
      GrookaiObjectSkin skin,
      Map<String, dynamic> fields, {
      VoidCallback? onPrimaryAction,
    });

class CardLayout {
  final CardLayoutBuilder front;
  final CardLayoutBuilder back;
  const CardLayout({required this.front, required this.back});
}

/// Every known layout, keyed by [GrookaiObject.layout]. This is the
/// ONLY place that needs an entry when a new publishable object ships —
/// Trade, Looking For, Showcase, New Pickup, Completed Set, Tournament Win,
/// Vault Milestone, Store Inventory, etc. each get one line here plus their
/// own typed field-schema class (see grookai_object_models.dart's pattern).
/// The renderer, frame, tokens, and shared atoms never change.
final Map<String, CardLayout> grookaiObjectLayouts = {
  'memory.v1': CardLayout(
    front: (skin, fields, {onPrimaryAction}) =>
        MemoryCardFront(data: MemoryCardData.fromFields(skin, fields)),
    back: (skin, fields, {onPrimaryAction}) =>
        MemoryCardBack(data: MemoryCardData.fromFields(skin, fields)),
  ),
  'sale.v1': CardLayout(
    front: (skin, fields, {onPrimaryAction}) =>
        SaleCardFront(data: SaleListingData.fromFields(skin, fields)),
    back: (skin, fields, {onPrimaryAction}) => SaleCardBack(
      data: SaleListingData.fromFields(skin, fields),
      onMessageToBuy: onPrimaryAction,
    ),
  ),
  'lot.v1': CardLayout(
    front: (skin, fields, {onPrimaryAction}) =>
        LotCardFront(data: LotListingData.fromFields(skin, fields)),
    back: (skin, fields, {onPrimaryAction}) => LotCardBack(
      data: LotListingData.fromFields(skin, fields),
      onMessageToBuy: onPrimaryAction,
    ),
  ),
};
