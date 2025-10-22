// lib/ui/tokens/typography.dart
import 'package:flutter/cupertino.dart';

class GVTypography {
  final TextStyle largeTitle;
  final TextStyle title;
  final TextStyle body;
  final TextStyle footnote;
  final TextStyle caption;

  const GVTypography({
    required this.largeTitle,
    required this.title,
    required this.body,
    required this.footnote,
    required this.caption,
  });

  static GVTypography fromBrightness(Brightness b) {
    final cupertino = CupertinoThemeData(brightness: b).textTheme;
    return GVTypography(
      largeTitle: cupertino.navLargeTitleTextStyle,
      title: cupertino.textStyle.copyWith(fontSize: 20, fontWeight: FontWeight.w600),
      body: cupertino.textStyle.copyWith(fontSize: 16),
      footnote: cupertino.textStyle.copyWith(fontSize: 14, color: cupertino.textStyle.color?.withValues(alpha: 0.85)),
      caption: cupertino.textStyle.copyWith(fontSize: 12, color: cupertino.textStyle.color?.withValues(alpha: 0.72)),
    );
  }
}



