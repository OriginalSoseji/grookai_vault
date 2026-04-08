import 'package:flutter/material.dart';

enum AppCardViewMode { grid, compactList, comfortableList }

extension AppCardViewModePresentation on AppCardViewMode {
  String get label {
    switch (this) {
      case AppCardViewMode.grid:
        return 'Grid';
      case AppCardViewMode.compactList:
        return 'Compact';
      case AppCardViewMode.comfortableList:
        return 'Comfortable';
    }
  }

  String get longLabel {
    switch (this) {
      case AppCardViewMode.grid:
        return 'Grid';
      case AppCardViewMode.compactList:
        return 'Compact list';
      case AppCardViewMode.comfortableList:
        return 'Comfortable list';
    }
  }

  IconData get icon {
    switch (this) {
      case AppCardViewMode.grid:
        return Icons.grid_view_rounded;
      case AppCardViewMode.compactList:
        return Icons.density_small_rounded;
      case AppCardViewMode.comfortableList:
        return Icons.view_agenda_outlined;
    }
  }

  bool get isGrid => this == AppCardViewMode.grid;
}

class SharedCardViewModeButton extends StatelessWidget {
  const SharedCardViewModeButton({
    required this.value,
    required this.onChanged,
    super.key,
  });

  final AppCardViewMode value;
  final ValueChanged<AppCardViewMode> onChanged;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return PopupMenuButton<AppCardViewMode>(
      tooltip: 'Card view',
      onSelected: onChanged,
      itemBuilder: (context) => AppCardViewMode.values
          .map(
            (mode) => PopupMenuItem<AppCardViewMode>(
              value: mode,
              child: Row(
                children: [
                  Icon(mode.icon, size: 18),
                  const SizedBox(width: 10),
                  Expanded(child: Text(mode.longLabel)),
                  if (mode == value) ...[
                    const SizedBox(width: 10),
                    Icon(
                      Icons.check_rounded,
                      size: 18,
                      color: colorScheme.primary,
                    ),
                  ],
                ],
              ),
            ),
          )
          .toList(),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(
          color: colorScheme.surface.withValues(alpha: 0.88),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: colorScheme.outline.withValues(alpha: 0.10),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              value.icon,
              size: 16,
              color: colorScheme.onSurface.withValues(alpha: 0.72),
            ),
            const SizedBox(width: 6),
            Text(
              value.label,
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                fontWeight: FontWeight.w700,
                color: colorScheme.onSurface.withValues(alpha: 0.84),
              ),
            ),
            const SizedBox(width: 4),
            Icon(
              Icons.unfold_more_rounded,
              size: 15,
              color: colorScheme.onSurface.withValues(alpha: 0.48),
            ),
          ],
        ),
      ),
    );
  }
}

int resolveSharedCardGridColumns(
  BuildContext context, {
  int preferredColumns = 3,
  double minTileWidth = 106,
  double horizontalPadding = 32,
  double spacing = 8,
}) {
  final availableWidth = MediaQuery.sizeOf(context).width - horizontalPadding;
  if (preferredColumns <= 2) {
    return 2;
  }
  final threeColumnWidth =
      (availableWidth - (spacing * (preferredColumns - 1))) / preferredColumns;
  return threeColumnWidth >= minTileWidth ? preferredColumns : 2;
}
