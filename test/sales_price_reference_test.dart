import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/sales/sales_card_reference.dart';
import 'sales_desk_screen_test.dart' show FakeSalesService, open;

void main() {
  testWidgets(
    'failed reference lookup keeps checkout usable without recording a sale',
    (tester) async {
      final service = FakeSalesService();
      const channel = MethodChannel('plugins.flutter.io/url_launcher');
      final messenger = tester.binding.defaultBinaryMessenger;
      messenger.setMockMethodCallHandler(channel, (_) async => false);
      addTearDown(() => messenger.setMockMethodCallHandler(channel, null));
      await open(tester, service, const Size(1194, 834));
      await tester.tap(find.text('Search TCGplayer'));
      await tester.pumpAndSettle();
      // No launcher is installed in this test: failure must leave the draft usable.
      expect(find.text('Could not open TCGplayer. Try again.'), findsOneWidget);
      expect(find.text('Your price: USD 12.34'), findsOneWidget);
      expect(service.calls, isEmpty);
      expect(tester.takeException(), isNull);
    },
  );
  test(
    'catalog product IDs cannot become arbitrary URLs; search is encoded',
    () {
      const product = SalesCardReference(name: 'Pikachu', productId: ' 12345 ');
      expect(product.uri.toString(), 'https://www.tcgplayer.com/product/12345');
      expect(product.label, 'TCGplayer product');
      for (final id in [
        null,
        '',
        '0',
        '-3',
        '1.5',
        '../evil',
        'https://evil.test',
      ]) {
        final reference = SalesCardReference(
          name: 'Pikachu & Zekrom',
          setName: 'Team Up',
          number: '33/181',
          productId: id,
        );
        expect(reference.hasProduct, false);
        expect(reference.uri.host, 'www.tcgplayer.com');
        expect(reference.uri.path, '/search/all/product');
        expect(
          reference.uri.queryParameters['q'],
          'Pikachu & Zekrom Team Up 33/181',
        );
        expect(reference.label, 'Search TCGplayer');
      }
    },
  );

  for (final size in [const Size(1194, 834), const Size(390, 844)]) {
    testWidgets(
      'asking price stays distinct from negotiated checkout price $size',
      (tester) async {
        final service = FakeSalesService();
        await open(tester, service, size);
        expect(find.text('Your price: USD 12.34'), findsOneWidget);
        expect(find.text('Search TCGplayer'), findsOneWidget);
        await tester.ensureVisible(find.text('Add to sale'));
        if (size.width < 900) {
          await tester.drag(find.byType(GridView), const Offset(0, -260));
          await tester.pumpAndSettle();
        }
        await tester.tap(find.text('Add to sale'));
        await tester.pumpAndSettle();
        if (size.width < 900) {
          await tester.tap(find.textContaining('Cart ('));
          await tester.pumpAndSettle();
        }
        await tester.tap(find.byTooltip('Edit sale line'));
        await tester.pumpAndSettle();
        await tester.enterText(
          find.widgetWithText(TextField, 'Actual sale price (USD)'),
          '10',
        );
        await tester.tap(find.text('Add to cart'));
        await tester.pumpAndSettle();
        expect(find.text('Checkout: 1 × USD 10.00'), findsOneWidget);
        expect(find.text('Your price: USD 12.34'), findsWidgets);
        await tester.tap(find.byTooltip('Edit sale line'));
        await tester.pumpAndSettle();
        expect(find.text('Use asking price: USD 12.34'), findsOneWidget);
        final field = tester.widget<TextField>(
          find.widgetWithText(TextField, 'Actual sale price (USD)'),
        );
        expect(field.controller!.text, '10.00');
        expect(service.calls, isEmpty);
        expect(tester.takeException(), isNull);
      },
    );
  }
}
