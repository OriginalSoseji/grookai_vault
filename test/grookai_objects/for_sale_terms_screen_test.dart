import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:grookai_vault/models/grookai_sale_listing.dart';
import 'package:grookai_vault/screens/grookai_objects/for_sale_terms_screen.dart';
import 'package:grookai_vault/services/grookai_objects/sale_listing_service.dart';
import 'package:grookai_vault/services/grookai_objects/grookai_object_export_service.dart';
import 'package:grookai_vault/services/grookai_objects/sale_card_handoff_store.dart';
import 'package:grookai_vault/widgets/pricing/ebay_seller_button.dart';
import 'package:grookai_vault/widgets/grookai_objects/grookai_object_skin.dart';
import 'package:grookai_vault/widgets/grookai_objects/grookai_object_skin_picker.dart';

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
    const ownerId = '22222222-2222-4222-8222-222222222222';
    final service = _FakeSaleListingService(currentUserId: ownerId);
    final handoffStore = _TrackingHandoffStore();
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
          handoffStore: handoffStore,
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
    expect(handoffStore.clearedOwners, [ownerId]);
    expect(find.text('Sale listing saved.'), findsOneWidget);
  });

  testWidgets('ordinary editor opening never applies an old eBay handoff', (
    tester,
  ) async {
    _useTallViewport(tester);
    final handoffStore = _TrackingHandoffStore();
    await tester.pumpWidget(
      MaterialApp(
        home: ForSaleTermsScreen(
          gvviId: 'GVVI-123',
          source: const GrookaiSaleListingSource(
            cardName: 'Umbreon VMAX',
            setLine: 'Evolving Skies #215',
          ),
          service: _FakeSaleListingService(),
          handoffStore: handoffStore,
          initialCopy: const SaleListingCopyContext(
            instanceId: 'INSTANCE-123',
            gvviId: 'GVVI-123',
            vaultItemId: 'VAULT-123',
            cardPrintId: 'CARD-123',
            askingPriceAmount: 80,
            askingPriceNote: 'New Vault terms',
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(handoffStore.loadCalls, 0);
    expect(
      tester.widget<TextField>(find.byType(TextField).first).controller!.text,
      '80.00',
    );
    expect(
      tester.widget<TextField>(find.byType(TextField).last).controller!.text,
      'New Vault terms',
    );
  });

  testWidgets('sale card is distinct from the exact-copy eBay listing path', (
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
            instanceId: '11111111-1111-4111-8111-111111111111',
            gvviId: 'GVVI-123',
            vaultItemId: 'VAULT-123',
            cardPrintId: 'CARD-123',
          ),
        ),
      ),
    );

    expect(find.text('Create sale card'), findsOneWidget);
    expect(
      find.textContaining('Create a shareable grookai sale card'),
      findsOneWidget,
    );
    expect(find.text('Save sale card'), findsOneWidget);
    expect(find.text('List on eBay'), findsOneWidget);
  });

  testWidgets('exact-copy eBay action is visible above the editor on phone', (
    tester,
  ) async {
    const instanceId = '11111111-1111-4111-8111-111111111111';
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(
      MaterialApp(
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(
            context,
          ).copyWith(textScaler: const TextScaler.linear(1.5)),
          child: child!,
        ),
        home: ForSaleTermsScreen(
          gvviId: 'GVVI-123',
          source: const GrookaiSaleListingSource(
            cardName: 'Umbreon VMAX',
            setLine: 'Evolving Skies #215',
          ),
          service: _FakeSaleListingService(),
          initialCopy: const SaleListingCopyContext(
            instanceId: instanceId,
            gvviId: 'GVVI-123',
            vaultItemId: 'VAULT-123',
            cardPrintId: 'CARD-123',
          ),
        ),
      ),
    );

    final button = tester.widget<EbaySellerButton>(
      find.byType(EbaySellerButton),
    );
    expect(button.instanceId, instanceId);
    expect(find.text('List on eBay'), findsOneWidget);
    expect(tester.getTopLeft(find.text('List on eBay')).dy, lessThan(400));
    expect(
      tester.getBottomLeft(find.byType(EbaySellerButton)).dy,
      lessThan(tester.view.physicalSize.height / tester.view.devicePixelRatio),
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets('cold OAuth return resumes the unfinished exact-copy sale card', (
    tester,
  ) async {
    _useTallViewport(tester);
    const instanceId = '11111111-1111-4111-8111-111111111111';
    const draft = SaleCardHandoff(
      ownerId: '22222222-2222-4222-8222-222222222222',
      copy: SaleListingCopyContext(
        instanceId: instanceId,
        gvviId: 'GVVI-123',
        vaultItemId: '33333333-3333-4333-8333-333333333333',
        cardPrintId: '44444444-4444-4444-8444-444444444444',
      ),
      source: GrookaiSaleListingSource(
        cardName: 'Umbreon VMAX',
        setLine: 'Evolving Skies #215',
      ),
      skin: GrookaiObjectSkin.kraft,
      condition: 'Raw LP',
      priceText: '42.50',
      note: 'Ship in a sleeve',
      firm: false,
      allowDms: true,
      showFront: false,
      destination: GrookaiObjectExportDestination.story,
      savedAtMillis: 1,
    );
    await tester.pumpWidget(
      MaterialApp(
        home: ForSaleTermsScreen(
          gvviId: 'GVVI-123',
          source: draft.source,
          service: _FakeSaleListingService(),
          initialCopy: draft.copy,
          initialDraft: draft,
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Create sale card'), findsOneWidget);
    expect(
      tester.widget<TextField>(find.byType(TextField).first).controller!.text,
      '42.50',
    );
    expect(
      tester.widget<TextField>(find.byType(TextField).last).controller!.text,
      'Ship in a sleeve',
    );
    expect(
      tester
          .widget<GrookaiObjectSkinPicker>(find.byType(GrookaiObjectSkinPicker))
          .selected,
      GrookaiObjectSkin.kraft,
    );
    expect(
      tester
          .widget<DropdownButtonFormField<String>>(
            find.byType(DropdownButtonFormField<String>),
          )
          .initialValue,
      'Raw LP',
    );
    expect(find.text('Resume sale card'), findsNothing);
    expect(tester.takeException(), isNull);
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
  _FakeSaleListingService({String currentUserId = 'user-1'})
    : super(currentUserId: currentUserId);

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

class _TrackingHandoffStore extends SaleCardHandoffStore {
  int loadCalls = 0;
  final clearedOwners = <String>[];

  @override
  Future<SaleCardHandoffRecord?> load(String ownerId) async {
    loadCalls += 1;
    return null;
  }

  @override
  Future<void> clear(String ownerId) async {
    clearedOwners.add(ownerId);
  }
}
