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
        filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
        child: content,
      ),
    );
  }

  Color _surfaceColor(ColorScheme colorScheme) {
    return switch (variant) {
      GvSurfaceVariant.resting => Colors.transparent,
      GvSurfaceVariant.grouped => colorScheme.surfaceContainerLow.withValues(
        alpha: 0.22,
      ),
      GvSurfaceVariant.floating => colorScheme.surfaceContainer.withValues(
        alpha: 0.84,
      ),
      GvSurfaceVariant.glass => colorScheme.surface.withValues(alpha: 0.72),
    };
  }

  Border? _border(ColorScheme colorScheme) {
    return switch (variant) {
      GvSurfaceVariant.resting => null,
      GvSurfaceVariant.grouped => Border.all(
        color: colorScheme.outlineVariant.withValues(alpha: 0.16),
      ),
      GvSurfaceVariant.floating => Border.all(
        color: colorScheme.outlineVariant.withValues(alpha: 0.20),
      ),
      GvSurfaceVariant.glass => Border.all(
        color: colorScheme.outlineVariant.withValues(alpha: 0.22),
      ),
    };
  }

  List<BoxShadow>? _shadows(ColorScheme colorScheme) {
    return switch (variant) {
      GvSurfaceVariant.resting || GvSurfaceVariant.grouped => null,
      GvSurfaceVariant.floating || GvSurfaceVariant.glass => [
        BoxShadow(
          color: colorScheme.shadow.withValues(alpha: 0.14),
          blurRadius: 26,
          offset: const Offset(0, 12),
        ),
      ],
    };
  }
}
