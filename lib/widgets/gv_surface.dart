import 'dart:ui';

import 'package:flutter/material.dart';

import '../theme/gv_tokens.dart';

enum GvSurfaceVariant { resting, grouped, floating, glass }

class GvSurface extends StatelessWidget {
  const GvSurface({
    required this.child,
    this.variant = GvSurfaceVariant.resting,
    this.padding = const EdgeInsets.all(GvSpacing.lg),
    this.borderRadius,
    this.color,
    super.key,
  });

  final Widget child;
  final GvSurfaceVariant variant;
  final EdgeInsetsGeometry padding;
  final double? borderRadius;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final radius = BorderRadius.circular(
      borderRadius ??
          switch (variant) {
            GvSurfaceVariant.floating ||
            GvSurfaceVariant.glass => GvRadii.floating,
            GvSurfaceVariant.grouped ||
            GvSurfaceVariant.resting => GvRadii.surface,
          },
    );
    final decoration = BoxDecoration(
      color: color ?? _surfaceColor(colorScheme),
      borderRadius: radius,
      border: _border(colorScheme),
      boxShadow: _shadows(colorScheme),
    );
    final content = Container(
      decoration: decoration,
      padding: padding,
      child: child,
    );

    if (variant != GvSurfaceVariant.glass) {
      return content;
    }

    return ClipRRect(
      borderRadius: radius,
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
        child: content,
      ),
    );
  }

  Color _surfaceColor(ColorScheme colorScheme) {
    return switch (variant) {
      GvSurfaceVariant.resting => colorScheme.surfaceContainerLow,
      GvSurfaceVariant.grouped => colorScheme.surfaceContainer,
      GvSurfaceVariant.floating => colorScheme.surfaceContainerHigh,
      GvSurfaceVariant.glass => colorScheme.surfaceContainerHigh.withValues(
        alpha: 0.94,
      ),
    };
  }

  Border? _border(ColorScheme colorScheme) {
    return switch (variant) {
      GvSurfaceVariant.resting => Border.all(
        color: colorScheme.outlineVariant.withValues(alpha: 0.28),
      ),
      GvSurfaceVariant.grouped => Border.all(
        color: colorScheme.outlineVariant.withValues(alpha: 0.38),
      ),
      GvSurfaceVariant.floating => Border.all(
        color: colorScheme.outlineVariant.withValues(alpha: 0.52),
      ),
      GvSurfaceVariant.glass => Border.all(
        color: colorScheme.outlineVariant.withValues(alpha: 0.56),
      ),
    };
  }

  List<BoxShadow>? _shadows(ColorScheme colorScheme) {
    return switch (variant) {
      GvSurfaceVariant.resting || GvSurfaceVariant.grouped => null,
      GvSurfaceVariant.floating || GvSurfaceVariant.glass => [
        BoxShadow(
          color: colorScheme.shadow.withValues(alpha: 0.22),
          blurRadius: 24,
          offset: const Offset(0, 12),
        ),
      ],
    };
  }
}
