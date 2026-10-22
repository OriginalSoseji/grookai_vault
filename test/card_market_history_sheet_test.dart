import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/pricing/card_personal_sales_service.dart';
import 'package:grookai_vault/services/pricing/ebay_sold_search_uri.dart';
import 'package:grookai_vault/widgets/pricing/card_market_history_sheet.dart';

void main() {
  test('eBay search targets completed listings with exact-print context', () {
    final uri = buildEbaySoldSearchUri(
      cardName: 'Charizard ex',
      setName: '151',
      collectorNumber: '199/165',
      finish: 'Special Illustration Rare',
    );

    expect(uri.host, 'www.ebay.com');
    expect(uri.queryParameters['LH_Sold'], '1');
    expect(uri.queryParameters['LH_Complete'], '1');
    expect(
      uri.queryParameters['_nkw'],
      contains('Charizard ex 151 199/165 Special Illustration Rare'),
    );
  });

  test('personal sale parser requires a real, positive realized sale', () {
    final sale = CardPersonalSaleRecord.fromJson({
      'id': 'sale-1',
      'created_at': '2026-08-01T12:00:00Z',
      'sale_price_amount': '12.34',
      'sale_price_currency': 'usd',
      'condition_label': 'NM',
      'asking_price_amount': 15,
      'asking_price_currency': 'USD',
    });

    expect(sale, isNotNull);
    expect(sale!.price, 12.34);
    expect(sale.currency, 'USD');
    expect(sale.condition, 'NM');
    expect(sale.askingPrice, 15);
    final differentCurrency = CardPersonalSaleRecord.fromJson({
      'id': 'sale-2',
      'created_at': '2026-08-02T12:00:00Z',
      'sale_price_amount': 12.34,
      'sale_price_currency': 'CAD',
      'asking_price_amount': 15,
      'asking_price_currency': 'USD',
    });
    expect(differentCurrency!.askingPrice, isNull);
    expect(
      CardPersonalSaleRecord.fromJson({
        'id': 'bad-sale',
        'created_at': '2026-08-01T12:00:00Z',
        'sale_price_amount': 0,
        'sale_price_currency': 'USD',
      }),
      isNull,
    );
  });

  test('personal history query is owner and exact-print scoped to sales', () {
    final source = File(
      'lib/services/pricing/card_personal_sales_service.dart',
    ).readAsStringSync();

    expect(source, contains(".eq('user_id', userId)"));
    expect(source, contains(".eq('card_printing_id', printingId)"));
    expect(source, contains(".eq('disposition_type', 'sale')"));
    expect(source, contains(".order('created_at', ascending: false)"));
    expect(source, contains('.limit(boundedLimit)'));
  });

  test(
    'history parser drops malformed values and sorts dated observations',
    () {
      final points = parseCardMarketHistoryRows([
        {'observed_on': '2026-01-03', 'market_price': '12.50'},
        {'observed_on': 'not-a-date', 'market_price': 99},
        {'observed_on': '2026-01-02', 'market_price': 0},
        {'observed_on': '2026-01-01', 'market_price': 10.25},
        {'observed_on': '2026-01-04', 'market_price': 'NaN'},
      ]);

      expect(points, hasLength(2));
      expect(points.first.price, 10.25);
      expect(points.last.price, 12.5);
      expect(points.first.observedOn.isBefore(points.last.observedOn), isTrue);
    },
  );

  testWidgets('sheet shows exact-print history and switches date range', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(360, 800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final requestedDays = <int>[];

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Builder(
            builder: (context) => TextButton(
              onPressed: () => showModalBottomSheet<void>(
                context: context,
                isScrollControlled: true,
                builder: (_) => CardMarketHistorySheet(
                  cardName: 'Test Card',
                  printingLabel: 'Holo',
                  cardPrintingId: 'printing-1',
                  loader: (printingId, days) async {
                    expect(printingId, 'printing-1');
                    requestedDays.add(days);
                    return [
                      {'observed_on': '2026-01-01', 'market_price': 10.0},
                      {'observed_on': '2026-01-10', 'market_price': 12.0},
                    ];
                  },
                ),
              ),
              child: const Text('Open history'),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Open history'));
    await tester.pumpAndSettle();

    expect(find.text('Price history'), findsOneWidget);
    expect(find.text('Test Card · Holo'), findsOneWidget);
    expect(find.text('TCGPlayer Market · exact variant'), findsOneWidget);
    expect(find.text(r'$12.00'), findsOneWidget);
    expect(requestedDays, [30]);

    await tester.tap(find.widgetWithText(ChoiceChip, '90d'));
    await tester.pumpAndSettle();
    expect(requestedDays, [30, 90]);

    await tester.scrollUntilVisible(
      find.textContaining('2 qualified daily observations'),
      240,
      scrollable: find.byType(Scrollable).last,
    );
    expect(
      find.textContaining('2 qualified daily observations'),
      findsOneWidget,
    );
    final salesDisclosure = find.textContaining(
      'not individual completed sales',
    );
    await tester.scrollUntilVisible(
      salesDisclosure,
      240,
      scrollable: find.byType(Scrollable).last,
    );
    expect(salesDisclosure, findsOneWidget);
  });

  testWidgets('empty history is not represented as a zero or a sold comp', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: CardMarketHistorySheet(
            cardName: 'Missing Card',
            printingLabel: 'Reverse holo',
            cardPrintingId: 'printing-2',
            loader: (_, _) async => const [],
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.scrollUntilVisible(
      find.textContaining('not individual completed sales'),
      240,
      scrollable: find.byType(Scrollable).last,
    );
    expect(
      find.textContaining('No qualified TCGPlayer Market history'),
      findsOneWidget,
    );
    expect(find.text(r'$0.00'), findsNothing);
    expect(
      find.textContaining('not individual completed sales'),
      findsOneWidget,
    );
  });

  testWidgets('sheet keeps personal sales separate from marketwide comps', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: CardMarketHistorySheet(
            cardName: 'Test Card',
            printingLabel: 'Holo',
            cardPrintingId: 'printing-1',
            loader: (_, _) async => const [],
            loadPersonalSales: (printingId) async {
              expect(printingId, 'printing-1');
              return [
                CardPersonalSaleRecord(
                  id: 'sale-1',
                  soldAt: DateTime.utc(2026, 8, 1),
                  price: 12.34,
                  currency: 'USD',
                  condition: 'NM',
                  askingPrice: 15,
                  askingPriceCurrency: 'USD',
                ),
              ];
            },
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.scrollUntilVisible(
      find.byKey(const Key('personal_sales_heading')),
      240,
      scrollable: find.byType(Scrollable).last,
    );
    expect(find.text('Your recorded sales'), findsOneWidget);
    expect(find.textContaining('not marketwide comps'), findsOneWidget);
    expect(find.byKey(const Key('personal_sale_sale-1')), findsOneWidget);
    expect(find.text(r'$12.34'), findsOneWidget);
    expect(find.textContaining(r'asking price was $15.00'), findsOneWidget);
  });
}
