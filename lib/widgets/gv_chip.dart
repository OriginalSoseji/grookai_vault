import 'package:flutter/material.dart';

class GvChip extends StatelessWidget {
  const GvChip({
    required this.label,
    this.selected = false,
    this.onSelected,
    this.count,
    this.enabled = true,
    this.tone,
    super.key,
  });

  final String label;
  final bool selected;
  final ValueChanged<bool>? onSelected;
  final int? count;
  final bool enabled;
  final Color? tone;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final resolvedTone = tone ?? colorScheme.onSurface;
    final backgroundColor = selected
        ? (tone ?? colorScheme.primary).withValues(alpha: 0.10)
        : tone == null
        ? colorScheme.surfaceContainerHighest.withValues(alpha: 0.28)
        : resolvedTone.withValues(alpha: 0.08);
    final borderColor = selected
        ? (tone ?? colorScheme.primary)
        : tone == null
        ? Colors.transparent
        : resolvedTone.withValues(alpha: 0.14);
    final foregroundColor = selected
        ? (tone ?? colorScheme.primary)
        : tone == null
        ? colorScheme.onSurface.withValues(alpha: 0.68)
        : resolvedTone;
    final text = count == null ? label : '$label ($count)';
    final textStyle = theme.textTheme.labelSmall?.copyWith(
      color: foregroundColor,
      fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
      letterSpacing: 0,
    );

    if (onSelected == null) {
      return DecoratedBox(
        decoration: BoxDecoration(
          color: backgroundColor,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: borderColor, width: tone == null ? 0 : 1),
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          child: Text(
            text,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: textStyle,
          ),
        ),
      );
    }

    return ChoiceChip(
      label: Text(
        text,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: textStyle,
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
