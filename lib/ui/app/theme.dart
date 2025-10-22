// lib/ui/app/theme.dart
import 'package:flutter/material.dart';
import '../tokens/colors.dart';
import '../tokens/typography.dart';

class GVTheme extends InheritedWidget {
  final GVPalette colors;
  final GVTypography typography;

  const GVTheme({super.key, required this.colors, required this.typography, required super.child})
      : super();

  static GVTheme of(BuildContext context) {
    final theme = context.dependOnInheritedWidgetOfExactType<GVTheme>();
    assert(theme != null, 'GVTheme not found in context');
    return theme!;
  }

  static Widget adaptive({Key? key, Brightness? overrideBrightness, required Widget child}) =>
      _GVThemeAdaptive(key: key, overrideBrightness: overrideBrightness, child: child);

  @override
  bool updateShouldNotify(GVTheme oldWidget) {
    return colors != oldWidget.colors || typography != oldWidget.typography;
  }
}

class _GVThemeAdaptive extends StatefulWidget {
  final Widget child;
  final Brightness? overrideBrightness;
  const _GVThemeAdaptive({super.key, this.overrideBrightness, required this.child});

  @override
  State<_GVThemeAdaptive> createState() => _GVThemeAdaptiveState();
}

class _GVThemeAdaptiveState extends State<_GVThemeAdaptive> {
  @override
  Widget build(BuildContext context) {
    final brightness = widget.overrideBrightness ?? MediaQuery.platformBrightnessOf(context);
    final palette = brightness == Brightness.dark ? GVPalette.dark : GVPalette.light;
    final type = GVTypography.fromBrightness(brightness);
    return GVTheme(colors: palette, typography: type, child: widget.child);
  }
}

