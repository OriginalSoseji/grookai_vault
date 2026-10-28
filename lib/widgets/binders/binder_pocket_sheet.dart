import 'package:flutter/material.dart';

import '../../models/binders/binder_models.dart';
import '../../services/binders/binder_display_identity.dart';
import '../../theme/gv_tokens.dart';
import '../card_surface_artwork.dart';
import '../pricing/card_marketplace_sheet.dart';
import '../pricing/ebay_listing_links.dart';

enum BinderPocketAction { edit }

Future<BinderPocketAction?> showBinderPocketSheet(
  BuildContext context, {
  required BinderCustomSlotDraft slot,
  required int pocketNumber,
  bool canEdit = false,
}) {
  FocusManager.instance.primaryFocus?.unfocus();
  return showModalBottomSheet<BinderPocketAction>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    constraints: BoxConstraints(
      maxWidth: 560,
      maxHeight: MediaQuery.sizeOf(context).height * .9,
    ),
    builder: (_) => BinderPocketSheet(
      slot: slot,
      pocketNumber: pocketNumber,
      canEdit: canEdit,
    ),
  );
}

/// A checklist requirement is not an owned copy. Marketplace controls reuse
/// their existing qualified navigation boundaries without inferring condition.
class BinderPocketSheet extends StatelessWidget {
  const BinderPocketSheet({
    super.key,
    required this.slot,
    required this.pocketNumber,
    this.canEdit = false,
  });

  final BinderCustomSlotDraft slot;
  final int pocketNumber;
  final bool canEdit;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final card = slot.card;
    final identity = resolveBinderCatalogCardIdentity(card);
    final printingId = slot.finish.cardPrintingId?.trim();
    final exact = printingId != null && printingId.isNotEmpty;
    final requirement =
        '${slot.finish.label} · ${slot.requiredQuantity} ${slot.requiredQuantity == 1 ? 'copy' : 'copies'} required';
    return SafeArea(
      top: false,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 4, 0),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    'Pocket $pocketNumber',
                    style: theme.textTheme.titleMedium,
                  ),
                ),
                IconButton(
                  tooltip: 'Close card inspection',
                  constraints: const BoxConstraints(
                    minWidth: 48,
                    minHeight: 48,
                  ),
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close_rounded),
                ),
              ],
            ),
          ),
          Flexible(
            child: SingleChildScrollView(
              key: const ValueKey('binder-pocket-inspection-scroll'),
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  LayoutBuilder(
                    builder: (context, constraints) {
                      final stacked =
                          constraints.maxWidth < 340 ||
                          MediaQuery.textScalerOf(context).scale(14) > 16.1;
                      final artwork = CardSurfaceArtwork(
                        label: identity.displayName,
                        imageUrl: card.hostedImageUrl,
                        fallbackImageUrl: card.fallbackImageUrl,
                        width: stacked ? 120 : 140,
                        height: (stacked ? 120 : 140) / .69,
                        borderRadius: GvRadii.artwork,
                        showShadow: false,
                        showZoomAffordance: true,
                      );
                      final details = Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            identity.displayName,
                            style: theme.textTheme.titleMedium,
                          ),
                          const SizedBox(height: 4),
                          if (card.setLabel.isNotEmpty) Text(card.setLabel),
                          if ((card.number ?? '').isNotEmpty)
                            Text('#${card.number}'),
                          const SizedBox(height: 12),
                          Text(
                            'Checklist requirement',
                            style: theme.textTheme.labelSmall?.copyWith(
                              color: theme.colorScheme.onSurfaceVariant,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(requirement, style: theme.textTheme.labelLarge),
                        ],
                      );
                      if (stacked) {
                        return Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Center(child: artwork),
                            const SizedBox(height: 16),
                            details,
                          ],
                        );
                      }
                      return Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          artwork,
                          const SizedBox(width: 16),
                          Expanded(child: details),
                        ],
                      );
                    },
                  ),
                  const SizedBox(height: 20),
                  if (exact)
                    CardMarketplaceSheet(
                      key: ValueKey('binder-pocket-market-${slot.displayKey}'),
                      cardPrintId: card.cardPrintId,
                      cardPrintingId: printingId,
                      identity: identity.displayName,
                      inline: true,
                    )
                  else ...[
                    Text('TCGplayer', style: theme.textTheme.titleSmall),
                    const SizedBox(height: 4),
                    const Text('Choose a finish for exact condition links.'),
                  ],
                  const SizedBox(height: 20),
                  Text('eBay searches', style: theme.textTheme.titleSmall),
                  const SizedBox(height: 4),
                  Text(
                    'Search results may include other printings.',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(height: 8),
                  EbayListingLinks(
                    cardName: identity.displayName.replaceAll(' · ', ' '),
                    setName: card.setLabel,
                    collectorNumber: card.number,
                    finish: exact ? slot.finish.label : null,
                    outlined: true,
                  ),
                  if (canEdit) ...[
                    const SizedBox(height: 16),
                    Align(
                      alignment: Alignment.centerLeft,
                      child: TextButton.icon(
                        key: const ValueKey('binder-pocket-edit'),
                        style: TextButton.styleFrom(
                          minimumSize: const Size(0, 48),
                        ),
                        onPressed: () =>
                            Navigator.pop(context, BinderPocketAction.edit),
                        icon: const Icon(Icons.edit_outlined),
                        label: Text(
                          exact
                              ? 'Edit requirement'
                              : 'Choose requirement finish',
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
