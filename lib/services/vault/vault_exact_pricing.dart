import '../public/card_surface_pricing_service.dart';

class VaultExactPricingTarget {
  const VaultExactPricingTarget({
    required this.cardPrintId,
    required this.cardPrintingId,
  });

  final String cardPrintId;
  final String? cardPrintingId;
}

class VaultExactPricingSummary {
  const VaultExactPricingSummary({
    required this.totalMarketValue,
    required this.pricedCopyCount,
    required this.unpricedCopyCount,
    required this.latestObservedAt,
    required this.latestPublishedAt,
  });

  final double? totalMarketValue;
  final int pricedCopyCount;
  final int unpricedCopyCount;
  final DateTime? latestObservedAt;
  final DateTime? latestPublishedAt;

  int get totalRawCopyCount => pricedCopyCount + unpricedCopyCount;

  CardSurfacePricingData? asSurfacePricing(String cardPrintId) {
    final marketValue = totalMarketValue;
    if (marketValue == null || cardPrintId.trim().isEmpty) {
      return null;
    }
    return CardSurfacePricingData(
      cardPrintId: cardPrintId.trim(),
      pricingScope: 'vault_exact_total',
      marketClose: marketValue,
      primarySource: 'tcgplayer',
      sourceLabel: 'TCGPlayer Market',
      observedAt: latestObservedAt,
      publishedAt: latestPublishedAt,
      proofPricedCopyCount: pricedCopyCount,
      proofUnpricedCopyCount: unpricedCopyCount,
    );
  }
}

String vaultExactPricingTotalProofKey(VaultExactPricingSummary summary) {
  return <String>[
    'tcgplayer-market-vault-total-v1',
    summary.totalMarketValue?.toString() ?? '',
    summary.pricedCopyCount.toString(),
    summary.unpricedCopyCount.toString(),
    summary.latestObservedAt?.toUtc().toIso8601String() ?? '',
    summary.latestPublishedAt?.toUtc().toIso8601String() ?? '',
  ].join('|');
}

VaultExactPricingSummary summarizeVaultExactPricing({
  required Iterable<VaultExactPricingTarget> targets,
  required Map<String, CardSurfacePricingData> pricingByCardPrintingId,
}) {
  var total = 0.0;
  var pricedCopyCount = 0;
  var unpricedCopyCount = 0;
  DateTime? latestObservedAt;
  DateTime? latestPublishedAt;

  for (final target in targets) {
    final cardPrintingId = target.cardPrintingId?.trim();
    if (cardPrintingId == null || cardPrintingId.isEmpty) {
      unpricedCopyCount += 1;
      continue;
    }

    final pricing = pricingByCardPrintingId[cardPrintingId];
    final marketClose = pricing?.marketClose;
    if (pricing == null ||
        pricing.pricingScope != 'card_printing' ||
        pricing.cardPrintingId != cardPrintingId ||
        pricing.cardPrintId != target.cardPrintId ||
        marketClose == null ||
        !marketClose.isFinite) {
      unpricedCopyCount += 1;
      continue;
    }

    total += marketClose;
    pricedCopyCount += 1;
    latestObservedAt = _latest(latestObservedAt, pricing.observedAt);
    latestPublishedAt = _latest(latestPublishedAt, pricing.publishedAt);
  }

  return VaultExactPricingSummary(
    totalMarketValue: pricedCopyCount == 0
        ? null
        : double.parse(total.toStringAsFixed(2)),
    pricedCopyCount: pricedCopyCount,
    unpricedCopyCount: unpricedCopyCount,
    latestObservedAt: latestObservedAt,
    latestPublishedAt: latestPublishedAt,
  );
}

DateTime? _latest(DateTime? left, DateTime? right) {
  if (left == null) return right;
  if (right == null) return left;
  return left.isAfter(right) ? left : right;
}
