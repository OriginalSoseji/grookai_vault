import 'package:flutter/material.dart';

import '../services/public/card_surface_pricing_service.dart';
import '../theme/gv_tokens.dart';

enum CardSurfacePriceSize { grid, list, dense }

enum CardSurfacePriceMode { automatic, market, manual, hidden }

String cardSurfacePricingProofKey(CardSurfacePricingData pricing) {
  return <String>[
    'tcgplayer-market-v1',
    pricing.pricingScope,
    pricing.cardPrintId,
    pricing.cardPrintingId ?? '',
    pricing.printingGvId ?? '',
    pricing.marketClose?.toString() ?? '',
    pricing.observedAt?.toUtc().toIso8601String() ?? '',
    pricing.publishedAt?.toUtc().toIso8601String() ?? '',
    pricing.provenanceId ?? '',
    pricing.sourceLabel ?? '',
    pricing.isFromPrice ? 'from' : 'exact',
    pricing.proofPricedCopyCount?.toString() ?? '',
    pricing.proofUnpricedCopyCount?.toString() ?? '',
  ].join('|');
}

class CardSurfacePricePill extends StatelessWidget {
  const CardSurfacePricePill({
    this.pricing,
    this.size = CardSurfacePriceSize.dense,
    this.mode = CardSurfacePriceMode.automatic,
    this.manualPrice,
    this.manualCurrency,
    super.key,
  });

  final CardSurfacePricingData? pricing;
  final CardSurfacePriceSize size;
  final CardSurfacePriceMode mode;
  final double? manualPrice;
  final String? manualCurrency;

  @override
  Widget build(BuildContext context) {
    final resolvedPricing = pricing;
    final value = switch (mode) {
      CardSurfacePriceMode.automatic => resolvedPricing?.visibleValue,
      CardSurfacePriceMode.market => resolvedPricing?.visibleValue,
      CardSurfacePriceMode.manual => manualPrice,
      CardSurfacePriceMode.hidden => null,
    };
    if (mode == CardSurfacePriceMode.hidden) {
      return const SizedBox.shrink();
    }

    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final metrics = switch (size) {
      CardSurfacePriceSize.grid => (
        horizontal: 6.5,
        vertical: 3.8,
        font: GvText.minReadable,
      ),
      CardSurfacePriceSize.list => (horizontal: 7.0, vertical: 4.0, font: 12.0),
      CardSurfacePriceSize.dense => (
        horizontal: 6.0,
        vertical: 3.2,
        font: GvText.minReadable,
      ),
    };

    final baseFormattedValue = value == null
        ? '—'
        : formatCardSurfaceMoney(value, currency: manualCurrency);
    final formattedValue =
        (mode == CardSurfacePriceMode.automatic ||
                mode == CardSurfacePriceMode.market) &&
            resolvedPricing?.isFromPrice == true &&
            value != null
        ? 'From $baseFormattedValue'
        : baseFormattedValue;
    final carriesMarketProof =
        mode != CardSurfacePriceMode.manual && resolvedPricing != null;
    return Semantics(
      identifier: !carriesMarketProof
          ? null
          : cardSurfacePricingProofKey(resolvedPricing),
      label: mode == CardSurfacePriceMode.manual
          ? 'Collector asking price'
          : 'TCGPlayer Market',
      value: formattedValue,
      child: Container(
        key: !carriesMarketProof
            ? null
            : ValueKey<String>(cardSurfacePricingProofKey(resolvedPricing)),
        padding: EdgeInsets.symmetric(
          horizontal: metrics.horizontal,
          vertical: metrics.vertical,
        ),
        decoration: BoxDecoration(
          color: colorScheme.surface.withValues(alpha: 0.74),
          borderRadius: BorderRadius.circular(999),
          border: Border.all(
            color: colorScheme.outline.withValues(alpha: 0.08),
          ),
        ),
        child: Text(
          formattedValue,
          style: theme.textTheme.labelSmall?.copyWith(
            color: colorScheme.onSurface.withValues(alpha: 0.76),
            fontWeight: GvText.semibold,
            fontSize: metrics.font,
            height: 1.0,
          ),
        ),
      ),
    );
  }
}

class CardSurfacePriceText extends StatelessWidget {
  const CardSurfacePriceText({
    this.pricing,
    this.size = CardSurfacePriceSize.dense,
    this.mode = CardSurfacePriceMode.automatic,
    this.manualPrice,
    this.manualCurrency,
    this.textAlign,
    super.key,
  });

  final CardSurfacePricingData? pricing;
  final CardSurfacePriceSize size;
  final CardSurfacePriceMode mode;
  final double? manualPrice;
  final String? manualCurrency;
  final TextAlign? textAlign;

  @override
  Widget build(BuildContext context) {
    final resolvedPricing = pricing;
    final value = switch (mode) {
      CardSurfacePriceMode.automatic => resolvedPricing?.visibleValue,
      CardSurfacePriceMode.market => resolvedPricing?.visibleValue,
      CardSurfacePriceMode.manual => manualPrice,
      CardSurfacePriceMode.hidden => null,
    };
    if (mode == CardSurfacePriceMode.hidden) {
      return const SizedBox.shrink();
    }

    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final fontSize = switch (size) {
      CardSurfacePriceSize.grid => 13.0,
      CardSurfacePriceSize.list => 13.0,
      CardSurfacePriceSize.dense => 12.5,
    };

    final baseFormattedValue = value == null
        ? '—'
        : formatCardSurfaceMoney(value, currency: manualCurrency);
    final formattedValue =
        (mode == CardSurfacePriceMode.automatic ||
                mode == CardSurfacePriceMode.market) &&
            resolvedPricing?.isFromPrice == true &&
            value != null
        ? 'From $baseFormattedValue'
        : baseFormattedValue;
    final carriesMarketProof =
        mode != CardSurfacePriceMode.manual && resolvedPricing != null;
    return Semantics(
      identifier: !carriesMarketProof
          ? null
          : cardSurfacePricingProofKey(resolvedPricing),
      label: mode == CardSurfacePriceMode.manual
          ? 'Collector asking price'
          : 'TCGPlayer Market',
      value: formattedValue,
      child: Text(
        formattedValue,
        key: !carriesMarketProof
            ? null
            : ValueKey<String>(cardSurfacePricingProofKey(resolvedPricing)),
        textAlign: textAlign,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: theme.textTheme.labelLarge?.copyWith(
          color: colorScheme.onSurface.withValues(alpha: 0.92),
          fontSize: fontSize,
          fontWeight: GvText.semibold,
          height: 1.05,
          fontFeatures: const [FontFeature.tabularFigures()],
        ),
      ),
    );
  }
}

String formatCardSurfaceMoney(double value, {String? currency}) {
  if (!value.isFinite) {
    return '—';
  }

  final isNegative = value < 0;
  final absoluteValue = value.abs();
  final fixed = absoluteValue.toStringAsFixed(2);
  final parts = fixed.split('.');
  final whole = parts.first;
  final fractional = parts.length > 1 ? parts.last : null;
  final wholeWithSeparators = _withThousandsSeparators(whole);
  final normalizedCurrency = (currency ?? 'USD').trim().toUpperCase();
  final symbol = normalizedCurrency == 'USD' ? r'$' : '$normalizedCurrency ';
  final formatted = fractional == null
      ? '$symbol$wholeWithSeparators'
      : '$symbol$wholeWithSeparators.$fractional';

  return isNegative ? '-$formatted' : formatted;
}

String _withThousandsSeparators(String digits) {
  final buffer = StringBuffer();
  for (var index = 0; index < digits.length; index++) {
    final positionFromEnd = digits.length - index;
    buffer.write(digits[index]);
    if (positionFromEnd > 1 && positionFromEnd % 3 == 1) {
      buffer.write(',');
    }
  }
  return buffer.toString();
}
