import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:google_fonts/google_fonts.dart';
import 'grookai_object_skin.dart';

const String _grookaiLogoAsset =
    'ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-1024x1024@1x.png';

/// Small mono label used for header tags, section labels, and footers.
/// [color] defaults to the skin's muted text token.
TextStyle monoLabel(
  GrookaiObjectTokens t, {
  double size = 9.5,
  Color? color,
  double letterSpacing = 0.14,
  FontWeight weight = FontWeight.w600,
}) {
  if (!GoogleFonts.config.allowRuntimeFetching) {
    return TextStyle(
      fontSize: size,
      color: color ?? t.mutedText,
      letterSpacing: size * letterSpacing,
      fontWeight: weight,
      fontFamily: t.monoFontFamily,
    );
  }
  return GoogleFonts.splineSansMono(
    fontSize: size,
    color: color ?? t.mutedText,
    letterSpacing: size * letterSpacing,
    fontWeight: weight,
  );
}

/// Card/collector name treatment — italic serif on Onyx, upright on
/// Ivory/Kraft per the approved mockup.
TextStyle serifTitle(GrookaiObjectTokens t, {double size = 28, Color? color}) {
  final base = GoogleFonts.config.allowRuntimeFetching
      ? GoogleFonts.instrumentSerif(
          fontSize: size,
          color: color ?? t.primaryText,
        )
      : TextStyle(
          fontSize: size,
          color: color ?? t.primaryText,
          fontFamily: t.titleFontFamily,
        );
  return t.titleItalic ? base.copyWith(fontStyle: FontStyle.italic) : base;
}

/// "FOR SALE" / "LOT · 9 SIR" header badge. [rotationDeg] is used on Kraft's
/// front badge only (+3deg, per mockup).
class CardBadge extends StatelessWidget {
  final GrookaiObjectTokens tokens;
  final String label;
  final double rotationDeg;
  const CardBadge({
    super.key,
    required this.tokens,
    required this.label,
    this.rotationDeg = 0,
  });

  @override
  Widget build(BuildContext context) {
    final child = Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(
        color: tokens.accent,
        borderRadius: tokens.badgeShape == AccentShape.pill
            ? BorderRadius.circular(999)
            : BorderRadius.circular(3),
      ),
      child: Text(
        label,
        style: monoLabel(
          tokens,
          size: 9.5,
          color: tokens.accentOnAccent,
          weight: FontWeight.w700,
          letterSpacing: 0.1,
        ),
      ),
    );
    return rotationDeg == 0
        ? child
        : Transform.rotate(angle: rotationDeg * 3.14159 / 180, child: child);
  }
}

/// The primary call-to-action pill/rect ("Message to Buy", etc).
/// [onTap] null renders it visually disabled — wire it to null when
/// allowDms is false or no contact channel is resolvable (see PR3 notes).
class CardCta extends StatelessWidget {
  final GrookaiObjectTokens tokens;
  final String label;
  final IconData icon;
  final VoidCallback? onTap;
  const CardCta({
    super.key,
    required this.tokens,
    required this.label,
    required this.icon,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(999),
        onTap: onTap,
        child: Opacity(
          opacity: onTap == null ? 0.5 : 1,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 11),
            decoration: BoxDecoration(
              color: tokens.accent,
              borderRadius: tokens.ctaShape == AccentShape.pill
                  ? BorderRadius.circular(999)
                  : BorderRadius.circular(3),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(icon, size: 18, color: tokens.accentOnAccent),
                const SizedBox(width: 8),
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w700,
                    color: tokens.accentOnAccent,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class CardDivider extends StatelessWidget {
  final GrookaiObjectTokens tokens;
  const CardDivider({super.key, required this.tokens});
  @override
  Widget build(BuildContext context) =>
      Container(height: 1, color: tokens.mutedText.withValues(alpha: 0.16));
}

/// Footer brand row shown on every card back — logo + wordmark, plus the
/// small watermark used again on the flattened export (PR5).
class CardFooterBrand extends StatelessWidget {
  final GrookaiObjectTokens tokens;
  const CardFooterBrand({super.key, required this.tokens});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: Image.asset(
            _grookaiLogoAsset,
            width: 16,
            height: 16,
            fit: BoxFit.cover,
          ),
        ),
        const SizedBox(width: 7),
        Expanded(
          child: Text(
            'Grookai Vault',
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: tokens.primaryText.withValues(alpha: 0.75),
            ),
          ),
        ),
        const SizedBox(width: 8),
        Flexible(
          flex: 2,
          child: Text(
            'CREATED WITH GROOKAI VAULT',
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            textAlign: TextAlign.right,
            style: monoLabel(
              tokens,
              size: 8,
              color: tokens.mutedText.withValues(alpha: 0.32),
              letterSpacing: 0.06,
              weight: FontWeight.w500,
            ),
          ),
        ),
      ],
    );
  }
}

/// Seller row shown on For Sale / Lot backs. Rating/trade-count are
/// currently cosmetic placeholders — see plan doc "Explicit Non-Goals."
class CardSellerRow extends StatelessWidget {
  final GrookaiObjectTokens tokens;
  final String handle;
  final double rating;
  final int tradeCount;
  const CardSellerRow({
    super.key,
    required this.tokens,
    required this.handle,
    required this.rating,
    required this.tradeCount,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 32,
          height: 32,
          decoration: const BoxDecoration(
            shape: BoxShape.circle,
            gradient: LinearGradient(
              colors: [Color(0xFF82B4EE), Color(0xFF4A6FA5)],
            ),
          ),
        ),
        const SizedBox(width: 10),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '@$handle',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: tokens.primaryText,
              ),
            ),
            Text(
              '★ $rating · $tradeCount trades',
              style: TextStyle(fontSize: 11, color: tokens.mutedText),
            ),
          ],
        ),
      ],
    );
  }
}

/// Row label + value pair used for the itemized detail block on card backs
/// (ASKING PRICE / CONDITION / AVAILABLE / BUNDLE PRICE, etc).
class CardDetailRow extends StatelessWidget {
  final GrookaiObjectTokens tokens;
  final String label;
  final String value;
  final Color? valueColor;
  final double valueSize;
  const CardDetailRow({
    super.key,
    required this.tokens,
    required this.label,
    required this.value,
    this.valueColor,
    this.valueSize = 14,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      crossAxisAlignment: CrossAxisAlignment.baseline,
      textBaseline: TextBaseline.alphabetic,
      children: [
        Expanded(
          child: Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: monoLabel(tokens, size: 9.5, letterSpacing: 0.14),
          ),
        ),
        const SizedBox(width: 10),
        Flexible(
          child: Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            textAlign: TextAlign.right,
            style: TextStyle(
              fontSize: valueSize,
              fontWeight: FontWeight.w700,
              color: valueColor ?? tokens.primaryText,
            ),
          ),
        ),
      ],
    );
  }
}

/// Price badge — bordered pill (Onyx), underline (Ivory), or marker-style
/// rotated text (Kraft). All three read from the same tokens field so this
/// one widget covers all skins; rotation/border are switched internally.
class CardPriceTag extends StatelessWidget {
  final GrookaiObjectTokens tokens;
  final GrookaiObjectSkin skin;
  final double price;
  const CardPriceTag({
    super.key,
    required this.tokens,
    required this.skin,
    required this.price,
  });

  @override
  Widget build(BuildContext context) {
    final text = Text(
      '\$${price.toStringAsFixed(0)}',
      style: monoLabel(
        tokens,
        size: 22,
        color: tokens.accent,
        weight: FontWeight.w700,
        letterSpacing: 0,
      ),
    );

    switch (skin) {
      case GrookaiObjectSkin.onyx:
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
          decoration: BoxDecoration(
            border: Border.all(color: tokens.accent.withValues(alpha: 0.4)),
            borderRadius: BorderRadius.circular(10),
          ),
          child: text,
        );
      case GrookaiObjectSkin.ivory:
        return Container(
          padding: const EdgeInsets.only(bottom: 2),
          decoration: BoxDecoration(
            border: Border(
              bottom: BorderSide(color: tokens.accent, width: 1.5),
            ),
          ),
          child: Text(
            '\$${price.toStringAsFixed(0)}',
            style: serifTitle(tokens, size: 24, color: tokens.accent),
          ),
        );
      case GrookaiObjectSkin.kraft:
        return Transform.rotate(angle: -2 * 3.14159 / 180, child: text);
    }
  }
}

/// Condition/quantity chip ("PSA 10", etc) — pill on Onyx, rect on Ivory/Kraft.
class CardConditionChip extends StatelessWidget {
  final GrookaiObjectTokens tokens;
  final String label;
  const CardConditionChip({
    super.key,
    required this.tokens,
    required this.label,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: tokens.primaryText.withValues(alpha: 0.08),
        borderRadius: tokens.badgeShape == AccentShape.pill
            ? BorderRadius.circular(999)
            : BorderRadius.circular(3),
      ),
      child: Text(
        label,
        style: monoLabel(
          tokens,
          size: 10.5,
          color: tokens.primaryText.withValues(alpha: 0.85),
          weight: FontWeight.w600,
          letterSpacing: 0.06,
        ),
      ),
    );
  }
}

class CardArtPlaceholder extends StatelessWidget {
  final double width;
  final double height;
  const CardArtPlaceholder({
    super.key,
    required this.width,
    required this.height,
  });
  @override
  Widget build(BuildContext context) => Container(
    width: width,
    height: height,
    decoration: BoxDecoration(
      color: Colors.white10,
      borderRadius: BorderRadius.circular(8),
    ),
  );
}

class GrookaiObjectNetworkImage extends StatelessWidget {
  final String imageUrl;
  final String? fallbackImageUrl;
  final double width;
  final double? height;
  final BoxFit fit;
  final BorderRadius borderRadius;

  const GrookaiObjectNetworkImage({
    super.key,
    required this.imageUrl,
    this.fallbackImageUrl,
    required this.width,
    this.height,
    this.fit = BoxFit.contain,
    this.borderRadius = const BorderRadius.all(Radius.circular(8)),
  });

  @override
  Widget build(BuildContext context) {
    final resolvedHeight = height;
    final normalizedPrimary = imageUrl.trim();
    final normalizedFallback = fallbackImageUrl?.trim();
    final hasUsableFallback =
        normalizedFallback != null &&
        normalizedFallback.isNotEmpty &&
        normalizedFallback != normalizedPrimary;
    Widget placeholder() =>
        CardArtPlaceholder(width: width, height: resolvedHeight ?? width * 1.4);

    return ClipRRect(
      borderRadius: borderRadius,
      child: CachedNetworkImage(
        imageUrl: imageUrl,
        width: width,
        height: resolvedHeight,
        fit: fit,
        placeholder: (context, url) => placeholder(),
        errorWidget: (context, url, error) => hasUsableFallback
            ? CachedNetworkImage(
                imageUrl: normalizedFallback,
                width: width,
                height: resolvedHeight,
                fit: fit,
                placeholder: (context, url) => placeholder(),
                errorWidget: (context, url, error) => placeholder(),
              )
            : placeholder(),
      ),
    );
  }
}
