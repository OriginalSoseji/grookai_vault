import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/public/card_surface_pricing_service.dart';
import 'package:grookai_vault/services/vault/vault_exact_pricing.dart';

CardSurfacePricingData exactPrice({
  required String cardPrintId,
  required String cardPrintingId,
  required double marketClose,
  DateTime? observedAt,
  DateTime? publishedAt,
}) {
  return CardSurfacePricingData(
    cardPrintId: cardPrintId,
    pricingScope: 'card_printing',
    cardPrintingId: cardPrintingId,
    marketClose: marketClose,
    primarySource: 'tcgplayer',
    sourceLabel: 'TCGPlayer Market',
    observedAt: observedAt,
    publishedAt: publishedAt,
  );
}

void main() {
  test('duplicate exact raw copies are each included in the total', () {
    final observedAt = DateTime.utc(2026, 7, 28, 10);
    final publishedAt = DateTime.utc(2026, 7, 28, 11);
    final summary = summarizeVaultExactPricing(
      targets: const [
        VaultExactPricingTarget(
          cardPrintId: 'parent-1',
          cardPrintingId: 'printing-holo',
        ),
        VaultExactPricingTarget(
          cardPrintId: 'parent-1',
          cardPrintingId: 'printing-holo',
        ),
      ],
      pricingByCardPrintingId: {
        'printing-holo': exactPrice(
          cardPrintId: 'parent-1',
          cardPrintingId: 'printing-holo',
          marketClose: 12.34,
          observedAt: observedAt,
          publishedAt: publishedAt,
        ),
      },
    );

    expect(summary.totalMarketValue, 24.68);
    expect(summary.pricedCopyCount, 2);
    expect(summary.unpricedCopyCount, 0);
    expect(summary.latestObservedAt, observedAt);
    expect(summary.latestPublishedAt, publishedAt);
  });

  test('mixed exact printings sum independently', () {
    final summary = summarizeVaultExactPricing(
      targets: const [
        VaultExactPricingTarget(
          cardPrintId: 'parent-1',
          cardPrintingId: 'printing-normal',
        ),
        VaultExactPricingTarget(
          cardPrintId: 'parent-1',
          cardPrintingId: 'printing-reverse',
        ),
      ],
      pricingByCardPrintingId: {
        'printing-normal': exactPrice(
          cardPrintId: 'parent-1',
          cardPrintingId: 'printing-normal',
          marketClose: 1.11,
        ),
        'printing-reverse': exactPrice(
          cardPrintId: 'parent-1',
          cardPrintingId: 'printing-reverse',
          marketClose: 4.56,
        ),
      },
    );

    expect(summary.totalMarketValue, 5.67);
    expect(summary.pricedCopyCount, 2);
    expect(summary.unpricedCopyCount, 0);
  });

  test('unresolved printing identity remains unpriced', () {
    final summary = summarizeVaultExactPricing(
      targets: const [
        VaultExactPricingTarget(
          cardPrintId: 'parent-1',
          cardPrintingId: null,
        ),
      ],
      pricingByCardPrintingId: const {},
    );

    expect(summary.totalMarketValue, isNull);
    expect(summary.pricedCopyCount, 0);
    expect(summary.unpricedCopyCount, 1);
    expect(summary.asSurfacePricing('parent-1'), isNull);
  });

  test('parent scope and mismatched parent identity are rejected', () {
    final summary = summarizeVaultExactPricing(
      targets: const [
        VaultExactPricingTarget(
          cardPrintId: 'parent-1',
          cardPrintingId: 'printing-parent-scope',
        ),
        VaultExactPricingTarget(
          cardPrintId: 'parent-1',
          cardPrintingId: 'printing-other-parent',
        ),
      ],
      pricingByCardPrintingId: {
        'printing-parent-scope': const CardSurfacePricingData(
          cardPrintId: 'parent-1',
          pricingScope: 'parent',
          cardPrintingId: 'printing-parent-scope',
          marketClose: 2,
        ),
        'printing-other-parent': exactPrice(
          cardPrintId: 'parent-2',
          cardPrintingId: 'printing-other-parent',
          marketClose: 3,
        ),
      },
    );

    expect(summary.totalMarketValue, isNull);
    expect(summary.pricedCopyCount, 0);
    expect(summary.unpricedCopyCount, 2);
  });

  test('aggregate surface data is explicitly not a parent From price', () {
    final summary = summarizeVaultExactPricing(
      targets: const [
        VaultExactPricingTarget(
          cardPrintId: 'parent-1',
          cardPrintingId: 'printing-1',
        ),
      ],
      pricingByCardPrintingId: {
        'printing-1': exactPrice(
          cardPrintId: 'parent-1',
          cardPrintingId: 'printing-1',
          marketClose: 7.89,
        ),
      },
    );

    final surface = summary.asSurfacePricing('parent-1');
    expect(surface, isNotNull);
    expect(surface!.pricingScope, 'vault_exact_total');
    expect(surface.isFromPrice, isFalse);
    expect(surface.marketClose, 7.89);
  });
}
