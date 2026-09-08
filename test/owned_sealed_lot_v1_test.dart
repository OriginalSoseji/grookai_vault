import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:grookai_vault/widgets/grookai_objects/grookai_object_renderer.dart';
import 'package:grookai_vault/services/sealed/owned_sealed_service_v1.dart';
import 'package:grookai_vault/services/sealed/owned_sealed_lot_v1.dart';
import 'package:grookai_vault/models/grookai_sale_listing.dart';
import 'package:grookai_vault/widgets/grookai_objects/grookai_object_models.dart';
import 'package:grookai_vault/widgets/grookai_objects/grookai_object_skin.dart';

Map<String, dynamic> copy() => {
  'object_kind': 'sealed',
  'instance_id': '11111111-1111-4111-8111-111111111111',
  'sealed_product_variant_id': '22222222-2222-4222-8222-222222222222',
  'gv_vi_id': 'GVVI-FIXTURE-000001',
  'name': 'Japanese booster box',
  'package_form': 'booster_box',
  'language_code': 'ja',
  'edition': 'First edition',
  'seal_state': 'factory_sealed',
  'package_condition': 'undamaged',
  'owned_market_price': 12.34,
  'asking_price_amount': 10.5,
  'asking_price_currency': 'USD',
};
void main() {
  setUpAll(() => GoogleFonts.config.allowRuntimeFetching = false);
  for (final front in [true, false]) {
    for (final includeEligible in [false, true]) {
      testWidgets(
        'asking-only sealed value stays incomplete (mixed=$includeEligible, front=$front)',
        (tester) async {
          await tester.binding.setSurfaceSize(const Size(440, 620));
          addTearDown(() => tester.binding.setSurfaceSize(null));
          final object = GrookaiLotListingAdapter.fromTerms(
            source: GrookaiLotListingSource(
              title: 'Asking-only sealed lot',
              items: [
                sealedLotItem(
                  OwnedSealedCopy.fromJson({
                    ...copy(),
                    'seal_state': 'opened',
                    'package_condition': 'damaged',
                    'owned_market_price': null,
                    'asking_price_amount': 25,
                  }),
                ),
                if (includeEligible)
                  sealedLotItem(OwnedSealedCopy.fromJson(copy())),
              ],
            ),
            skin: GrookaiObjectSkin.onyx,
            bundlePrice: 35,
            metadata: const {},
          );
          final data = LotListingData.fromFields(object.skin, object.fields);
          expect(data.hasCompleteEstimatedValue, isFalse);
          expect(data.estimatedValue, includeEligible ? 12.34 : 0);
          expect(data.items.first.marketPrice, isNull);
          expect(data.items.first.price, 25);
          await tester.pumpWidget(
            MaterialApp(
              home: Scaffold(
                body: GrookaiObjectRenderer(object: object, showFront: front),
              ),
            ),
          );
          await tester.pumpAndSettle();
          expect(find.text('\$25'), findsOneWidget);
          expect(find.textContaining(' value'), findsNothing);
          expect(tester.takeException(), isNull);
        },
      );
    }
    testWidgets(
      'priced lots retain exact cents (${front ? 'front' : 'back'})',
      (tester) async {
        await tester.binding.setSurfaceSize(const Size(440, 620));
        addTearDown(() => tester.binding.setSurfaceSize(null));
        final object = GrookaiLotListingAdapter.fromTerms(
          source: GrookaiLotListingSource(
            title: 'Priced lot',
            items: [
              sealedLotItem(
                OwnedSealedCopy.fromJson({
                  ...copy(),
                  'asking_price_amount': 0.49,
                  'owned_market_price': 0.75,
                }),
              ),
            ],
          ),
          skin: GrookaiObjectSkin.onyx,
          bundlePrice: 1,
          metadata: const {},
        );
        expect(
          LotListingData.fromFields(
            object.skin,
            object.fields,
          ).hasCompleteEstimatedValue,
          isTrue,
        );
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: GrookaiObjectRenderer(object: object, showFront: front),
            ),
          ),
        );
        await tester.pumpAndSettle();
        expect(find.text('\$0.49'), findsOneWidget);
        expect(find.text('Unpriced'), findsNothing);
        if (front) expect(find.text('\$0.75 value'), findsOneWidget);
        expect(tester.takeException(), isNull);
      },
    );
    for (final count in [2, 12]) {
      testWidgets(
        '$count unpriced sealed copies never export zero prices (${front ? 'front' : 'back'})',
        (tester) async {
          await tester.binding.setSurfaceSize(const Size(440, 620));
          addTearDown(() => tester.binding.setSurfaceSize(null));
          final item = sealedLotItem(
            OwnedSealedCopy.fromJson({
              ...copy(),
              'owned_market_price': null,
              'asking_price_amount': null,
            }),
          );
          final object = GrookaiLotListingAdapter.fromTerms(
            source: GrookaiLotListingSource(
              title: 'Unpriced lot',
              items: List.generate(count, (_) => item),
            ),
            skin: GrookaiObjectSkin.onyx,
            bundlePrice: 35,
            metadata: const {},
          );
          final data = LotListingData.fromFields(object.skin, object.fields);
          expect(data.hasCompleteEstimatedValue, isFalse);
          await tester.pumpWidget(
            MaterialApp(
              home: Scaffold(
                body: GrookaiObjectRenderer(object: object, showFront: front),
              ),
            ),
          );
          await tester.pumpAndSettle();
          expect(find.text('Unpriced'), findsNWidgets(count));
          expect(find.text('\$0'), findsNothing);
          expect(find.textContaining(' value'), findsNothing);
          expect(tester.takeException(), isNull);
        },
      );
    }
  }
  test('partial lot estimate is not presented as a complete value', () {
    final object = GrookaiLotListingAdapter.fromTerms(
      source: GrookaiLotListingSource(
        title: 'Mixed prices',
        items: [
          sealedLotItem(OwnedSealedCopy.fromJson(copy())),
          sealedLotItem(
            OwnedSealedCopy.fromJson({
              ...copy(),
              'owned_market_price': null,
              'asking_price_amount': null,
            }),
          ),
        ],
      ),
      skin: GrookaiObjectSkin.onyx,
      bundlePrice: 20,
      metadata: const {},
    );
    final data = LotListingData.fromFields(object.skin, object.fields);
    expect(data.estimatedValue, 12.34);
    expect(data.hasCompleteEstimatedValue, isFalse);
  });
  for (final includeSealed in [false, true]) {
    test('legacy card estimates are preserved (mixed=$includeSealed)', () {
      final data = LotListingData(
        skin: GrookaiObjectSkin.onyx,
        listingNo: 'test',
        title: 'Mixed estimate',
        items: [
          const LotItem(cardName: 'Card', condition: 'NM', price: 7.5),
          if (includeSealed)
            const LotItem(
              objectKind: 'sealed',
              cardName: 'Box',
              condition: 'opened',
              price: 25,
            ),
        ],
        bundlePrice: 30,
        sellerHandle: 'fixture',
        sellerRating: 0,
        sellerTradeCount: 0,
      );
      expect(data.estimatedValue, 7.5);
      expect(data.hasCompleteEstimatedValue, !includeSealed);
    });
  }
  test('a sealed lot cannot carry a card anchor', () {
    expect(
      () => GrookaiLotListingAdapter.fromTerms(
        source: const GrookaiLotListingSource(
          title: 'Invalid',
          items: [
            GrookaiLotListingItemSource(
              objectKind: 'sealed',
              sealedVariantId: 'sealed',
              gvviId: 'copy',
              cardPrintId: 'card',
              cardName: 'Invalid',
              condition: 'unknown',
              price: 1,
            ),
          ],
        ),
        skin: GrookaiObjectSkin.onyx,
        bundlePrice: 1,
        metadata: const {},
      ),
      throwsStateError,
    );
  });
  for (final front in [true, false]) {
    testWidgets(
      'five sealed copies render ${front ? 'front' : 'back'} without overflow',
      (tester) async {
        await tester.binding.setSurfaceSize(const Size(440, 620));
        addTearDown(() => tester.binding.setSurfaceSize(null));
        final object = GrookaiLotListingAdapter.fromTerms(
          source: GrookaiLotListingSource(
            title: 'Sealed lot',
            items: List.generate(
              5,
              (_) => sealedLotItem(OwnedSealedCopy.fromJson(copy())),
            ),
          ),
          skin: GrookaiObjectSkin.onyx,
          bundlePrice: 50,
          metadata: const {},
        );
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: GrookaiObjectRenderer(object: object, showFront: front),
            ),
          ),
        );
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
        expect(
          find.text(front ? 'LOT · 5 ITEMS' : 'BUNDLE PRICE · 5 ITEMS'),
          findsOneWidget,
        );
      },
    );
  }
  test(
    'sealed lot preserves full product identity and separates asking from market',
    () {
      final item = sealedLotItem(OwnedSealedCopy.fromJson(copy()));
      expect(item.cardPrintId, isNull);
      expect(item.sealedVariantId, copy()['sealed_product_variant_id']);
      expect(item.setAndNumberLine, 'booster box - JA - First edition');
      expect(item.marketPrice, 12.34);
      expect(item.price, 10.5);
      expect(item.condition, 'factory sealed / undamaged');
    },
  );
  test('mixed lot round-trip retains typed identity and exact GVVI', () {
    final sealed = sealedLotItem(OwnedSealedCopy.fromJson(copy()));
    final object = GrookaiLotListingAdapter.fromTerms(
      source: GrookaiLotListingSource(
        title: 'Mixed collection',
        sellerHandle: 'Fixture',
        items: [
          sealed,
          const GrookaiLotListingItemSource(
            cardName: 'Card fixture',
            cardPrintId: 'card-fixture',
            price: 5,
            condition: 'Raw NM',
          ),
        ],
      ),
      skin: GrookaiObjectSkin.onyx,
      bundlePrice: 15.5,
      metadata: const {},
    );
    final lot = LotListingData.fromFields(object.skin, object.fields);
    final restored = LotItem.fromFields(lot.items.first.toFields());
    expect(restored.objectKind, 'sealed');
    expect(restored.cardPrintId, isNull);
    expect(restored.sealedVariantId, sealed.sealedVariantId);
    expect(restored.gvviId, sealed.gvviId);
    expect(restored.setAndNumberLine, contains('First edition'));
    expect(lot.items.last.objectKind, 'card');
  });
  test(
    'unpriced sealed lot never invents a market value or card condition',
    () {
      final item = sealedLotItem(
        OwnedSealedCopy.fromJson({
          ...copy(),
          'owned_market_price': null,
          'asking_price_amount': null,
          'seal_state': 'unknown',
          'package_condition': 'unknown',
        }),
      );
      expect(item.marketPrice, isNull);
      expect(item.condition, 'unknown / unknown');
    },
  );
  test('foreign asking currencies are never silently treated as USD', () {
    expect(
      () => sealedLotItem(
        OwnedSealedCopy.fromJson({...copy(), 'asking_price_currency': 'JPY'}),
      ),
      throwsStateError,
    );
  });
}
