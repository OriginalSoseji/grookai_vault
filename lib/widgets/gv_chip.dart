import 'package:flutter/material.dart';

class GvChip extends StatelessWidget {
  const GvChip({
    required this.label,
    required this.selected,
    required this.onSelected,
    this.count,
    this.enabled = true,
    super.key,
  });

  final String label;
  final bool selected;
  final ValueChanged<bool> onSelected;
  final int? count;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final backgroundColor = selected
        ? colorScheme.primary.withValues(alpha: 0.10)
        : colorScheme.surfaceContainerHighest.withValues(alpha: 0.28);
    final borderColor = selected ? colorScheme.primary : Colors.transparent;
    final foregroundColor = selected
        ? colorScheme.primary
        : colorScheme.onSurface.withValues(alpha: 0.68);
    final text = count == null ? label : '$label ($count)';

    return ChoiceChip(
      label: Text(
        text,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: theme.textTheme.labelSmall?.copyWith(
          color: foregroundColor,
          fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
          letterSpacing: 0,
        ),
      ),
      selected: selected,
      onSelected: enabled ? onSelected : null,
      selectedColor: backgroundColor,
      backgroundColor: backgroundColor,
      disabledColor: backgroundColor.withValues(alpha: 0.50),
      side: BorderSide(color: borderColor, width: selected ? 1.0 : 0.0),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
      visualDensity: VisualDensity.compact,
    );
  }
}
