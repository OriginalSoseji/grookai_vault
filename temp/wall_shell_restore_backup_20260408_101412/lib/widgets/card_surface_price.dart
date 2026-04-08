import 'package:flutter/material.dart';

import '../services/public/card_surface_pricing_service.dart';

enum CardSurfacePriceSize { grid, list, dense }

class CardSurfacePricePill extends StatelessWidget {
  const CardSurfacePricePill({
    required this.pricing,
    this.size = CardSurfacePriceSize.dense,
    super.key,
  });

  final CardSurfacePricingData? pricing;
  final CardSurfacePriceSize size;

  @override
  Widget build(BuildContext context) {
    final resolvedPricing = pricing;
    final value = resolvedPricing?.visibleValue;
    if (resolvedPricing == null || value == null) {
      return const SizedBox.shrink();
    }

    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final metrics = switch (size) {
      CardSurfacePriceSize.grid => (horizontal: 6.5, vertical: 3.5, font: 10.4),
      CardSurfacePriceSize.list => (horizontal: 7.0, vertical: 4.0, font: 10.9),
      CardSurfacePriceSize.dense => (
        horizontal: 6.0,
        vertical: 3.0,
        font: 10.2,
      ),
    };

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: metrics.horizontal,
        vertical: metrics.vertical,
      ),
      decoration: BoxDecoration(
        color: colorScheme.primary.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: colorScheme.primary.withValues(alpha: 0.14)),
      ),
      child: Text(
        '${resolvedPricing.compactLabel} ${formatCardSurfaceUsd(value)}',
        style: theme.textTheme.labelSmall?.copyWith(
          color: colorScheme.primary,
          fontWeight: FontWeight.w700,
          fontSize: metrics.font,
          height: 1.0,
        ),
      ),
    );
  }
}

String formatCardSurfaceUsd(double value) {
  if (!value.isFinite) {
    return '—';
  }

  final isNegative = value < 0;
  final absoluteValue = value.abs();
  final precision = absoluteValue >= 100 ? 0 : 2;
  final fixed = absoluteValue.toStringAsFixed(precision);
  final parts = fixed.split('.');
  final whole = parts.first;
  final fractional = parts.length > 1 ? parts.last : null;
  final wholeWithSeparators = _withThousandsSeparators(whole);
  final formatted = fractional == null
      ? '\$$wholeWithSeparators'
      : '\$$wholeWithSeparators.$fractional';

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
