import 'package:flutter/material.dart';

/// Canonical type and wordmark rules for the Grookai product family.
///
/// Keep brand lockups on [GrookaiBrandText] so casing, family, and weight do
/// not drift as new surfaces are added.
abstract final class GvTypography {
  static const String fontFamily = 'Roboto';
  static const FontWeight brandWeight = FontWeight.w900;
  static const String brandName = 'grookai';
  static const String productName = 'grookai vault';

  static TextStyle brandStyle(
    TextStyle? base, {
    Color? color,
    double? letterSpacing,
  }) {
    return (base ?? const TextStyle()).copyWith(
      color: color,
      fontFamily: fontFamily,
      fontWeight: brandWeight,
      letterSpacing: letterSpacing,
    );
  }
}

/// The only text component for a standalone Grookai brand lockup.
class GrookaiBrandText extends StatelessWidget {
  const GrookaiBrandText({
    super.key,
    this.includeVault = false,
    this.style,
    this.textAlign,
    this.maxLines,
    this.overflow,
    this.letterSpacing = -0.8,
  });

  final bool includeVault;
  final TextStyle? style;
  final TextAlign? textAlign;
  final int? maxLines;
  final TextOverflow? overflow;
  final double? letterSpacing;

  @override
  Widget build(BuildContext context) {
    return Text(
      includeVault ? GvTypography.productName : GvTypography.brandName,
      textAlign: textAlign,
      maxLines: maxLines,
      overflow: overflow,
      style: GvTypography.brandStyle(
        style ?? Theme.of(context).textTheme.titleLarge,
        letterSpacing: letterSpacing,
      ),
    );
  }
}
