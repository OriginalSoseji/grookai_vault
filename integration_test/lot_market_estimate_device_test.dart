import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:grookai_vault/models/grookai_sale_listing.dart';
import 'package:grookai_vault/screens/grookai_objects/lot_pricing_screen.dart';
import 'package:grookai_vault/services/grookai_objects/grookai_object_export_service.dart';
import 'package:grookai_vault/widgets/grookai_objects/grookai_object_destination_export_renderer.dart';
import 'package:grookai_vault/widgets/grookai_objects/grookai_object_models.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets(
    'native lot exports keep market estimates separate from asking prices',
    (tester) async {
      for (final state in ['unknown', 'partial', 'complete']) {
        await tester.pumpWidget(
          MaterialApp(
            home: LotPricingScreen(
              key: ValueKey(state),
              source: GrookaiLotListingSource(
                title: 'Two distinct copies',
                items: [
                  GrookaiLotListingItemSource(
                    cardName: 'Card A',
                    cardPrintId: 'same-parent',
                    gvviId: 'GVVI-A',
                    condition: 'Raw NM',
                    price: 18.75,
                    marketPrice: state == 'unknown' ? null : 12,
                  ),
                  GrookaiLotListingItemSource(
                    cardName: 'Card B',
                    cardPrintId: 'same-parent',
                    gvviId: 'GVVI-B',
                    condition: 'Raw NM',
                    price: 15,
                    marketPrice: state == 'complete' ? 20 : null,
                  ),
                ],
              ),
              metadata: const {
                'gvvi_ids': ['GVVI-A', 'GVVI-B'],
              },
            ),
          ),
        );
        await tester.pumpAndSettle();
        final bundle = find.byWidgetPredicate(
          (w) => w is TextField && w.decoration?.labelText == 'Bundle price',
        );
        await tester.ensureVisible(bundle);
        await tester.pumpAndSettle();
        await tester.enterText(bundle, '30.00');
        FocusManager.instance.primaryFocus?.unfocus();
        await tester.pumpAndSettle();
        expect(find.text(r'$33.75 value'), findsNothing);
        expect(
          find.text(r'$32 market estimate'),
          state == 'complete' ? findsWidgets : findsNothing,
        );
        final renderers = tester
            .widgetList<GrookaiObjectDestinationExportRenderer>(
              find.byType(GrookaiObjectDestinationExportRenderer),
            )
            .toList();
        expect(renderers.length, 2);
        for (final renderer in renderers) {
          final data = LotListingData.fromFields(
            renderer.object.skin,
            renderer.object.fields,
          );
          expect(data.hasCompleteEstimatedValue, state == 'complete');
          expect(data.items.map((i) => i.price), [18.75, 15]);
          expect(data.items.map((i) => i.gvviId), ['GVVI-A', 'GVVI-B']);
          expect(data.bundlePrice, 30);
          final export = const GrookaiObjectExportService().exportObjectPng(
            object: renderer.object,
            destination: renderer.destination,
            repaintBoundaryKey: renderer.repaintBoundaryKey,
          );
          await tester.pump();
          await tester.pump();
          await tester.pump();
          final bytes = await export;
          expect(bytes.take(8), [137, 80, 78, 71, 13, 10, 26, 10]);
          // Private runner extracts artifacts; nothing is shared externally.
          // ignore: avoid_print
          print(
            'LOT_MARKET_IMAGE:${Platform.operatingSystem}-$state-${renderer.showFront ? 'front' : 'back'}:${base64Encode(bytes)}',
          );
        }
        expect(tester.takeException(), isNull);
      }
      // ignore: avoid_print
      print(
        'LOT_MARKET_PASS:${Platform.operatingSystem}:unknown,partial,complete',
      );
    },
  );
}
