import 'dart:io';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/screens/sales/sales_offer_summary.dart';
import 'package:grookai_vault/theme/gv_tokens.dart';

void main() {
  for (final trade in [false, true]) {
    for (final scale in [1.0, 2.0]) {
      testWidgets(
        'offer comparison retains terms with details at ${trade ? 'trade' : 'cash'} scale $scale',
        (tester) async {
          final render =
              Platform.environment['GROOKAI_OFFER_UI_RENDER'] != null;
          if (render) {
            await tester.runAsync(() async {
              await (FontLoader('MaterialIcons')..addFont(
                    rootBundle.load('fonts/MaterialIcons-Regular.otf'),
                  ))
                  .load();
              final font = Platform.environment['GROOKAI_OFFER_UI_FONT'];
              expect(
                font,
                isNotNull,
                reason:
                    'Readable visual evidence requires an explicit local font.',
              );
              await (FontLoader('OfferVisual')..addFont(
                    Future.value(
                      ByteData.sublistView(File(font!).readAsBytesSync()),
                    ),
                  ))
                  .load();
            });
          }
          tester.view.physicalSize = const Size(390, 844);
          tester.view.devicePixelRatio = 1;
          addTearDown(tester.view.resetPhysicalSize);
          addTearDown(tester.view.resetDevicePixelRatio);
          const boundaryKey = ValueKey('offer-render');
          final amount = trade ? 2400 : 800;
          final label = trade ? 'credit' : 'offer';
          final unit = trade ? 'for this line' : 'per item';
          final agreed = trade
              ? 'Agreed credit: USD 21.00 $unit'
              : 'Agreed price: USD 7.00 $unit';
          await tester.pumpWidget(
            RepaintBoundary(
              key: boundaryKey,
              child: MaterialApp(
                debugShowCheckedModeBanner: false,
                theme: ThemeData(
                  fontFamily: render ? 'OfferVisual' : null,
                  useMaterial3: true,
                  colorScheme: GvPalette.scheme(Brightness.light),
                ),
                builder: (context, child) => MediaQuery(
                  data: MediaQuery.of(
                    context,
                  ).copyWith(textScaler: TextScaler.linear(scale)),
                  child: child!,
                ),
                home: Scaffold(
                  body: SingleChildScrollView(
                    padding: const EdgeInsets.all(16),
                    child: SalesOfferSummary(
                      suggested: amount,
                      agreed: trade ? 2100 : 700,
                      negotiated: trade,
                      proposal: {
                        'status': 'available',
                        'referenceMinor': 1234,
                        'rateBps': 6500,
                        'tierApplied': false,
                        'quantity': trade ? 3 : 1,
                        'calculatedMinor': trade ? 2406 : 802,
                        'rounding': {'mode': 'nearest', 'incrementMinor': 50},
                      },
                    ),
                  ),
                ),
              ),
            ),
          );
          await tester.pumpAndSettle();
          expect(
            find.text(
              'Suggested $label: USD ${trade ? '24.00' : '8.00'} $unit',
            ),
            findsOneWidget,
          );
          expect(find.text(agreed), findsOneWidget);
          expect(
            find.textContaining('Reference USD 12.34 × 65%'),
            findsOneWidget,
          );
          expect(find.textContaining('Calculated USD'), findsNothing);
          expect(tester.takeException(), isNull);
          Future<void> capture(String state) async {
            final out = Platform.environment['GROOKAI_OFFER_UI_RENDER'];
            if (out == null) return;
            expect(
              RegExp(
                r'^C:/grookai_vault_operator_artifacts/product_offer_ui_20261008/visual-v[0-9]+$',
              ).hasMatch(out),
              isTrue,
            );
            await tester.runAsync(() async {
              final boundary = tester.renderObject<RenderRepaintBoundary>(
                find.byKey(boundaryKey),
              );
              final picture = await boundary.toImage(pixelRatio: 1);
              final bytes = await picture.toByteData(
                format: ui.ImageByteFormat.png,
              );
              await Directory(out).create(recursive: true);
              await File(
                '$out/${trade ? 'trade' : 'cash'}-$scale-$state.png',
              ).writeAsBytes(bytes!.buffer.asUint8List());
              picture.dispose();
            });
          }

          await capture('compact');
          await tester.ensureVisible(find.text('Calculation details'));
          await tester.tap(find.text('Calculation details'));
          await tester.pumpAndSettle();
          expect(find.textContaining('Calculated USD'), findsOneWidget);
          if (trade) expect(find.textContaining('3 item(s)'), findsOneWidget);
          expect(find.text(agreed), findsOneWidget);
          expect(tester.takeException(), isNull);
          await capture('expanded');
          await tester.ensureVisible(find.text('Calculation details'));
          await tester.tap(find.text('Calculation details'));
          await tester.pumpAndSettle();
          expect(find.textContaining('Calculated USD'), findsNothing);
          expect(find.text(agreed), findsOneWidget);
        },
      );
    }
  }
}
