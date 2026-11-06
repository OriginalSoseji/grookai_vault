import 'package:flutter/material.dart';

import '../../models/binders/binder_grid_layout.dart';
import '../../models/binders/binder_models.dart';
import '../../services/binders/binder_display_identity.dart';
import '../../theme/gv_typography.dart';
import 'binder_widgets.dart';

/// The image contains checklist goals only, never members or owned-copy data.
/// Fixed logical width and type scaling make the PNG independent of the phone.
class BinderPageImage extends StatelessWidget {
  const BinderPageImage({
    super.key,
    required this.slots,
    required this.artworkUrls,
    required this.layout,
    required this.page,
    required this.totalPages,
  });

  static const double width = 540;
  final List<BinderCustomSlotDraft> slots;
  final List<String?> artworkUrls;
  final BinderGridLayout layout;
  final int page;
  final int totalPages;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final total = slots.fold<int>(
      0,
      (sum, slot) => sum + slot.requiredQuantity,
    );
    return MediaQuery.withClampedTextScaling(
      minScaleFactor: 1,
      maxScaleFactor: 1,
      child: DefaultTextStyle(
        style: TextStyle(
          fontFamily: GvTypography.fontFamily,
          fontSize: 12,
          color: theme.colorScheme.onSurface,
        ),
        child: ColoredBox(
          color: theme.colorScheme.surface,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              mainAxisSize: MainAxisSize.min,
              children: [
                const GrookaiBrandText(
                  includeVault: true,
                  style: TextStyle(fontSize: 18),
                ),
                const SizedBox(height: 8),
                Text(
                  'Binder checklist · Page ${page + 1} of $totalPages',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '${layout.label} · ${slots.length} requirements · $total required ${total == 1 ? 'copy' : 'copies'}',
                ),
                const SizedBox(height: 16),
                for (var row = 0; row < layout.rows; row++) ...[
                  if (row > 0) const SizedBox(height: 9),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      for (
                        var column = 0;
                        column < layout.columns;
                        column++
                      ) ...[
                        if (column > 0) const SizedBox(width: 9),
                        Expanded(
                          child: _cell(context, row * layout.columns + column),
                        ),
                      ],
                    ],
                  ),
                ],
                const SizedBox(height: 16),
                Text(
                  'Checklist requirements · Ownership not shown',
                  style: TextStyle(
                    fontSize: 11,
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _cell(BuildContext context, int offset) {
    final slot = offset < slots.length ? slots[offset] : null;
    final colors = Theme.of(context).colorScheme;
    final pocket = page * layout.pockets + offset + 1;
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        AspectRatio(
          aspectRatio: 5 / 7,
          child: slot == null
              ? DecoratedBox(
                  decoration: BoxDecoration(
                    border: Border.all(color: colors.outlineVariant),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Center(
                    child: Text(
                      'Unused',
                      style: TextStyle(color: colors.onSurfaceVariant),
                    ),
                  ),
                )
              : BinderArtwork(
                  imageUrl: artworkUrls[offset],
                  semanticLabel: resolveBinderCatalogCardIdentity(
                    slot.card,
                  ).displayName,
                ),
        ),
        const SizedBox(height: 5),
        Text(
          'Pocket $pocket',
          style: TextStyle(fontSize: 11, color: colors.onSurfaceVariant),
        ),
        if (slot != null) ...[
          Text(
            resolveBinderCatalogCardIdentity(slot.card).displayName,
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
          ),
          Text(
            [
              if (slot.card.setLabel.isNotEmpty) slot.card.setLabel,
              if ((slot.card.number ?? '').isNotEmpty) '#${slot.card.number}',
            ].join(' · '),
            style: TextStyle(fontSize: 11, color: colors.onSurfaceVariant),
          ),
          Text(
            '${slot.finish.label} · ${slot.requiredQuantity} ${slot.requiredQuantity == 1 ? 'copy' : 'copies'} required',
            style: const TextStyle(fontSize: 11),
          ),
        ],
      ],
    );
  }
}
