import 'package:flutter/material.dart';

/// The three visual treatments a generated card object (Memory / For Sale /
/// Lot) can use. Chosen per-object at creation time — NOT a persisted global
/// preference (per product decision).
enum GrookaiObjectSkin { onyx, ivory, kraft }

/// Shape of the accent badge pill (e.g. "FOR SALE", "LOT · 9 SIR") and the
/// primary CTA button. Differs by skin to match the approved mockup exactly.
enum AccentShape { pill, rect }

/// How the card's decorative border/corner treatment is drawn.
enum CardCornerStyle {
  /// Onyx — four L-shaped gold corner brackets over a plain 1px border.
  brackets,

  /// Ivory — a plain inset border plus a fainter inset border 4px further in.
  doubleBorder,

  /// Kraft — a dashed inset border. Sale/Lot objects additionally get a
  /// circular "hole punch" at top-center (see GrookaiObjectFrame.holePunch).
  dashedBorder,
}

@immutable
class GrookaiObjectTokens {
  final Gradient background;
  final Color borderColor;
  final double borderWidth;
  final double cornerRadius;
  final List<BoxShadow> shadow;
  final CardCornerStyle cornerStyle;
  final Color cornerAccent; // bracket / dashed-border / inner-border color

  final Color primaryText; // titles, high-emphasis values
  final Color mutedText; // labels, footers, dividers (opacity already baked in)
  final Color accent; // gold / brown / rust — price, links, CTA fill
  final Color accentOnAccent; // text/icon color drawn on top of [accent] fills

  final AccentShape badgeShape;
  final AccentShape ctaShape;

  final String
  titleFontFamily; // pass straight to GoogleFonts.instrumentSerif() etc
  final bool titleItalic; // only Onyx italicizes its serif title
  final String monoFontFamily;

  const GrookaiObjectTokens({
    required this.background,
    required this.borderColor,
    required this.borderWidth,
    required this.cornerRadius,
    required this.shadow,
    required this.cornerStyle,
    required this.cornerAccent,
    required this.primaryText,
    required this.mutedText,
    required this.accent,
    required this.accentOnAccent,
    required this.badgeShape,
    required this.ctaShape,
    required this.titleFontFamily,
    required this.titleItalic,
    required this.monoFontFamily,
  });
}

// ── ONYX — dark museum vitrine plaque ───────────────────────────────────────
const onyxTokens = GrookaiObjectTokens(
  background: LinearGradient(
    begin: Alignment(-0.3, -1),
    end: Alignment(0.3, 1),
    colors: [Color(0xFF1C1E23), Color(0xFF0A0B0D)],
  ),
  borderColor: Color(0x17FFFFFF), // rgba(255,255,255,0.09)
  borderWidth: 1,
  cornerRadius: 26,
  shadow: [
    BoxShadow(color: Color(0x8C000000), blurRadius: 90, offset: Offset(0, 40)),
  ],
  cornerStyle: CardCornerStyle.brackets,
  cornerAccent: Color(0x8CC9A961), // rgba(201,169,97,0.55)
  primaryText: Color(0xFFF5F1EA),
  mutedText: Color(0xB3F5F1EA), // tune opacity per use-site; ~0.4-0.45 typical
  accent: Color(0xFFE3C578),
  accentOnAccent: Color(0xFF191408),
  badgeShape: AccentShape.pill,
  ctaShape: AccentShape.pill,
  titleFontFamily: 'Instrument Serif',
  titleItalic: true,
  monoFontFamily: 'Spline Sans Mono',
);

// ── IVORY — archival certificate / bill of sale ─────────────────────────────
const ivoryTokens = GrookaiObjectTokens(
  background: LinearGradient(colors: [Color(0xFFF7F2E5), Color(0xFFF7F2E5)]),
  borderColor: Color(0xB3231E14), // rgba(35,30,20,0.7) drawn as inset overlay
  borderWidth: 1,
  cornerRadius: 10,
  shadow: [
    BoxShadow(color: Color(0x59000000), blurRadius: 70, offset: Offset(0, 30)),
  ],
  cornerStyle: CardCornerStyle.doubleBorder,
  cornerAccent: Color(0x38231E14), // rgba(35,30,20,0.22) inner border
  primaryText: Color(0xFF23201B),
  mutedText: Color(0x80231E14),
  accent: Color(0xFF8C6A28),
  accentOnAccent: Color(0xFFF7F2E5),
  badgeShape: AccentShape.rect,
  ctaShape: AccentShape.rect,
  titleFontFamily: 'Instrument Serif',
  titleItalic: false,
  monoFontFamily: 'Spline Sans Mono',
);

// ── KRAFT — flea-market hang tag / field log ────────────────────────────────
const kraftTokens = GrookaiObjectTokens(
  background: LinearGradient(
    begin: Alignment(-0.2, -1),
    end: Alignment(0.2, 1),
    colors: [Color(0xFFCBA871), Color(0xFFB08C56)],
  ),
  borderColor: Color(0x592E2013), // dashed inset border, rgba(46,32,19,0.35)
  borderWidth: 1.5,
  cornerRadius: 8,
  shadow: [
    BoxShadow(color: Color(0x66281A0A), blurRadius: 70, offset: Offset(0, 30)),
  ],
  cornerStyle: CardCornerStyle.dashedBorder,
  cornerAccent: Color(0x592E2013),
  primaryText: Color(0xFF2E2013),
  mutedText: Color(0x992E2013),
  accent: Color(0xFFB85C38),
  accentOnAccent: Color(0xFFF7F2E5),
  badgeShape: AccentShape.rect,
  ctaShape: AccentShape.pill,
  titleFontFamily: 'Instrument Serif',
  titleItalic: false,
  monoFontFamily: 'Spline Sans Mono',
);

const Map<GrookaiObjectSkin, GrookaiObjectTokens> grookaiObjectTokens = {
  GrookaiObjectSkin.onyx: onyxTokens,
  GrookaiObjectSkin.ivory: ivoryTokens,
  GrookaiObjectSkin.kraft: kraftTokens,
};
