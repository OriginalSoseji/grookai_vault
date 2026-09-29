import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:grookai_vault/widgets/grookai_objects/grookai_object_models.dart';
import 'package:grookai_vault/widgets/grookai_objects/grookai_object_skin.dart';
import 'package:grookai_vault/widgets/grookai_objects/lot_card_widgets.dart';

LotListingData lot(List<LotItem> items) => LotListingData(
  skin: GrookaiObjectSkin.onyx,
  listingNo: 'TEST',
  title: 'Two owned copies',
  items: items,
  bundlePrice: 30,
  sellerHandle: 'fixture',
  sellerRating: 0,
  sellerTradeCount: 0,
);

void main() {
  setUpAll(() => GoogleFonts.config.allowRuntimeFetching = false);
  for (final missing in <double?>[null, 0, -1, double.nan, double.infinity]) {
    test(
      'missing or invalid market value never uses the asking amount ($missing)',
      () {
        final data = lot([
          const LotItem(
            cardName: 'Raw',
            condition: 'NM',
            marketPrice: 12,
            price: 18.75,
          ),
          LotItem(
            cardName: 'Slab',
            condition: 'PSA 10',
            marketPrice: missing,
            price: 15,
          ),
        ]);
        expect(data.hasCompleteEstimatedValue, isFalse);
        expect(data.estimatedValue, 12);
        expect(data.items.map((item) => item.price), [18.75, 15]);
        expect(data.bundlePrice, 30);
      },
    );
  }
  for (final complete in [false, true]) {
    testWidgets(
      'export distinguishes market estimates from asking prices (complete=$complete)',
      (tester) async {
        final data = lot([
          LotItem(
            cardName: 'Raw',
            condition: 'NM',
            marketPrice: complete ? 12 : null,
            price: 18.75,
          ),
          LotItem(
            objectKind: 'sealed',
            cardName: 'Box',
            condition: 'sealed',
            marketPrice: complete ? 20 : null,
            price: 15,
          ),
        ]);
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: Center(child: LotCardFront(data: data)),
            ),
          ),
        );
        await tester.pumpAndSettle();
        expect(find.text(r'$33.75 value'), findsNothing);
        expect(
          find.text(r'$32 market estimate'),
          complete ? findsOneWidget : findsNothing,
        );
        expect(find.text(r'$30'), findsOneWidget);
        expect(find.text(r'$18.75'), findsOneWidget);
        expect(find.text(r'$15'), findsOneWidget);
        if (complete) {
          expect(
            tester
                .widget<Text>(find.text(r'$32 market estimate'))
                .style
                ?.decoration,
            isNot(TextDecoration.lineThrough),
          );
        }
        expect(tester.takeException(), isNull);
      },
    );
  }
}
