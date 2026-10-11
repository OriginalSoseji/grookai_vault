import 'package:flutter/material.dart';
import '../services/gvvi/vendor_pricing_workspace_service.dart';
import 'card_surface_artwork.dart';
import 'card_surface_price.dart';

/// Compact browsing over one physical copy. Editing remains in the existing row.
class VendorInventorySummary extends StatelessWidget {
  const VendorInventorySummary({
    super.key,
    required this.row,
    required this.onEdit,
    this.busy = false,
    this.error,
    this.saved = false,
  });
  final VendorPricingWorkspaceRow row;
  final VoidCallback onEdit;
  final bool busy;
  final bool saved;
  final String? error;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    final condition = row.isGraded
        ? [row.gradeCompany, row.gradeLabel].whereType<String>().join(' ')
        : row.conditionLabel;
    final price = row.askingPrice == null
        ? 'Set price'
        : formatCardSurfaceMoney(row.askingPrice!, currency: row.currency);
    return Material(
      color: colors.surfaceContainerLow,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        key: Key('vendor_edit_${row.instanceId}'),
        borderRadius: BorderRadius.circular(14),
        onTap: onEdit,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(
                    width: 48,
                    height: 67,
                    child:
                        (row.imageUrl ?? '').trim().isEmpty &&
                            (row.fallbackImageUrl ?? '').trim().isEmpty
                        ? Icon(
                            Icons.image_not_supported_outlined,
                            color: colors.outline,
                            semanticLabel: 'Artwork unavailable',
                          )
                        : CardSurfaceArtwork(
                            label: row.displayName,
                            imageUrl: row.imageUrl,
                            fallbackImageUrl: row.fallbackImageUrl,
                            borderRadius: 5,
                            padding: EdgeInsets.zero,
                            showShadow: false,
                          ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          row.displayName,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: theme.textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          [
                                row.setName ?? row.setCode,
                                '#${row.number}',
                                row.printingLabel,
                              ]
                              .whereType<String>()
                              .where((v) => v.isNotEmpty)
                              .join(' · '),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: theme.textTheme.bodySmall,
                        ),
                        const SizedBox(height: 6),
                        Text(
                          '$condition · ${row.onWall ? 'On Wall' : 'Private'}',
                          style: theme.textTheme.labelSmall?.copyWith(
                            color: colors.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  Icon(
                    busy ? Icons.sync : Icons.tune,
                    size: 20,
                    color: colors.primary,
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Wrap(
                spacing: 16,
                runSpacing: 6,
                children: [
                  Text(
                    'Asking  $price',
                    style: theme.textTheme.labelLarge?.copyWith(
                      color: colors.primary,
                    ),
                  ),
                  Text(
                    row.marketPrice == null
                        ? 'No exact market'
                        : 'Market  ${formatCardSurfaceMoney(row.marketPrice!, currency: 'USD')}',
                    style: theme.textTheme.bodySmall,
                  ),
                ],
              ),
              const SizedBox(height: 5),
              Text(
                row.gvviId,
                style: theme.textTheme.labelSmall?.copyWith(
                  color: colors.onSurfaceVariant,
                ),
              ),
              if (busy || saved || error != null)
                Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Text(
                    error ?? (busy ? 'Saving…' : 'Saved'),
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: error != null ? colors.error : colors.primary,
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
