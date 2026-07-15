import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:grookai_vault/models/grookai_sale_listing.dart';
import 'package:grookai_vault/screens/grookai_objects/for_sale_terms_screen.dart';
import 'package:grookai_vault/services/grookai_objects/sale_listing_service.dart';

void main() {
  setUpAll(() {
    GoogleFonts.config.allowRuntimeFetching = false;
  });

  testWidgets('terms flow validates asking price before saving', (
    tester,
  ) async {
    _useTallViewport(tester);
    final service = _FakeSaleListingService();
    await tester.pumpWidget(
      MaterialApp(
        home: ForSaleTermsScreen(
          gvviId: 'GVVI-123',
          source: const GrookaiSaleListingSource(
            cardName: 'Umbreon VMAX',
            setLine: 'Evolving Skies #215',
          ),
          service: service,
          initialCopy: const SaleListingCopyContext(
            instanceId: 'INSTANCE-123',
            gvviId: 'GVVI-123',
            vaultItemId: 'VAULT-123',
            cardPrintId: 'CARD-123',
          ),
        ),
      ),
    );

    await tester.tap(find.text('Save sale card'));
    await tester.pump();

    expect(find.text('Enter an asking price greater than 0.'), findsOneWidget);
    expect(service.saveCalls, 0);
  });

  testWidgets('terms flow saves exact-copy sale listing', (tester) async {
    _useTallViewport(tester);
    final service = _FakeSaleListingService();
    await tester.pumpWidget(
      MaterialApp(
        home: ForSaleTermsScreen(
          gvviId: 'GVVI-123',
          source: const GrookaiSaleListingSource(
            cardName: 'Umbreon VMAX',
            setLine: 'Evolving Skies #215',
            sellerHandle: 'Casey',
          ),
          service: service,
          initialCopy: const SaleListingCopyContext(
            instanceId: 'INSTANCE-123',
            gvviId: 'GVVI-123',
            vaultItemId: 'VAULT-123',
            cardPrintId: 'CARD-123',
            conditionLabel: 'PSA 10',
          ),
        ),
      ),
    );

    await tester.enterText(find.byType(TextField).first, '42.50');
    await tester.tap(find.text('Save sale card'));
    await tester.pumpAndSettle();

    expect(service.saveCalls, 1);
    expect(service.lastInstanceId, 'INSTANCE-123');
    expect(service.lastGvviId, 'GVVI-123');
    expect(service.lastVaultItemId, 'VAULT-123');
    expect(service.lastPrice, 42.5);
    expect(find.text('Sale listing saved.'), findsOneWidget);
  });

  testWidgets('terms flow accepts short raw vault condition labels', (
    tester,
  ) async {
    _useTallViewport(tester);
    await tester.pumpWidget(
      MaterialApp(
        home: ForSaleTermsScreen(
          gvviId: 'GVVI-123',
          source: const GrookaiSaleListingSource(
            cardName: 'Umbreon VMAX',
            setLine: 'Evolving Skies #215',
          ),
          service: _FakeSaleListingService(),
          initialCopy: const SaleListingCopyContext(
            instanceId: 'INSTANCE-123',
            gvviId: 'GVVI-123',
            vaultItemId: 'VAULT-123',
            cardPrintId: 'CARD-123',
            conditionLabel: 'NM',
          ),
        ),
      ),
    );

    expect(tester.takeException(), isNull);
    expect(find.text('Condition'), findsOneWidget);
    expect(find.text('Raw NM'), findsWidgets);
  });
}

void _useTallViewport(WidgetTester tester) {
  tester.view.physicalSize = const Size(900, 1600);
  tester.view.devicePixelRatio = 1;
  addTearDown(() {
    tester.view.resetPhysicalSize();
    tester.view.resetDevicePixelRatio();
  });
}

class _FakeSaleListingService extends SaleListingService {
  _FakeSaleListingService() : super(currentUserId: 'user-1');

  int saveCalls = 0;
  String? lastInstanceId;
  String? lastGvviId;
  String? lastVaultItemId;
  double? lastPrice;

  @override
  Future<SaleListingSaveResult> saveSingleCardListing({
    required String instanceId,
    required String gvviId,
    required String vaultItemId,
    required String cardPrintId,
    required double price,
    String currency = 'USD',
    String? note,
  }) async {
    saveCalls += 1;
    lastInstanceId = instanceId;
    lastGvviId = gvviId;
    lastVaultItemId = vaultItemId;
    lastPrice = price;
    return SaleListingSaveResult(
      instanceId: instanceId,
      gvviId: gvviId,
      vaultItemId: vaultItemId,
      cardPrintId: cardPrintId,
      intent: 'sell',
      price: price,
      currency: currency,
      note: note,
    );
  }
}
