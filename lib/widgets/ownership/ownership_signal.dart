import 'package:flutter/material.dart';

import '../../models/ownership_state.dart';

enum OwnershipSignalVariant { text, badge }

typedef OwnershipSignalLabelBuilder = String Function(OwnershipState state);

class OwnershipSignal extends StatelessWidget {
  const OwnershipSignal({
    super.key,
    this.ownershipState,
    this.variant = OwnershipSignalVariant.text,
    this.labelBuilder,
    this.textStyle,
    this.padding,
    this.backgroundColor,
    this.borderColor,
    this.alignment = Alignment.centerLeft,
  });

  // PERFORMANCE_P6_OWNERSHIP_SIGNAL_SYNC_ONLY
  // OwnershipSignal is sync-only after all remaining callers moved to precomputed ownership state.
  final OwnershipState? ownershipState;
  final OwnershipSignalVariant variant;
  final OwnershipSignalLabelBuilder? labelBuilder;
  final TextStyle? textStyle;
  final EdgeInsetsGeometry? padding;
  final Color? backgroundColor;
  final Color? borderColor;
  final AlignmentGeometry alignment;

  @override
  Widget build(BuildContext context) {
    final resolvedState = ownershipState;
    return resolvedState == null
        ? const SizedBox.shrink()
        : _buildResolvedState(context, resolvedState);
  }

  Widget _buildResolvedState(BuildContext context, OwnershipState state) {
    if (!state.owned) {
      return const SizedBox.shrink();
    }

    final label = (labelBuilder ?? _defaultLabelBuilder)(state).trim();
    if (label.isEmpty) {
      return const SizedBox.shrink();
    }

    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final resolvedTextStyle =
        textStyle ??
        theme.textTheme.labelSmall?.copyWith(
          color: colorScheme.onSurface.withValues(alpha: 0.64),
          fontWeight: FontWeight.w700,
        );

    if (variant == OwnershipSignalVariant.text) {
      return Align(
        alignment: alignment,
        child: Text(
          label,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: resolvedTextStyle,
        ),
      );
    }

    return Align(
      alignment: alignment,
      child: Container(
        padding:
            padding ?? const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
        decoration: BoxDecoration(
          color:
              backgroundColor ??
              colorScheme.surfaceContainerHighest.withValues(alpha: 0.42),
          borderRadius: BorderRadius.circular(999),
          border: borderColor == null ? null : Border.all(color: borderColor!),
        ),
        child: Text(
          label,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: resolvedTextStyle,
        ),
      ),
    );
  }

  static String _defaultLabelBuilder(OwnershipState state) {
    return state.ownedCount > 1 ? '${state.ownedCount} copies' : 'In Vault';
  }
}
