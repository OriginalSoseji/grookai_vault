import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:grookai_vault/models/grookai_sale_listing.dart';
import 'package:grookai_vault/services/grookai_objects/sale_listing_service.dart';
import 'package:grookai_vault/widgets/vault/vault_copy_sale_sheet.dart';

class _Service extends SaleListingService {
  int calls = 0;
  double? savedPrice;
  String status = 'ready';
  bool fail = false;
  Completer<void>? wait;
  @override
  Future<SaleListingSaveResult> saveSingleCardListing({
    required String instanceId,
    required String gvviId,
    required String vaultItemId,
    required String cardPrintId,
    required double price,
    String currency = 'USD',
    String? note,
    bool preserveNote = false,
  }) async {
    calls++;
    savedPrice = price;
    expect(instanceId, 'copy-1');
    expect(currency, 'USD');
    expect(preserveNote, true);
    if (wait != null) await wait!.future;
    if (fail) throw StateError('fixture failure');
    return SaleListingSaveResult(
      instanceId: instanceId,
      gvviId: gvviId,
      vaultItemId: vaultItemId,
      cardPrintId: cardPrintId,
      intent: 'sell',
      price: price,
      currency: currency,
      squareStatus: status,
    );
  }
}

Future<void> _render(WidgetTester tester, _Service service) async {
  tester.view.physicalSize = const Size(360, 800);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  await tester.pumpWidget(
    MaterialApp(
      home: Scaffold(
        body: VaultCopySaleSheet(
          cardName: 'Venusaur ex',
          service: service,
          copy: const SaleListingCopyContext(
            instanceId: 'copy-1',
            gvviId: 'GVVI-065CAB28-003419',
            vaultItemId: 'group-1',
            cardPrintId: 'card-1',
            askingPriceNote: 'Keep this note',
          ),
        ),
      ),
    ),
  );
}

void main() {
  testWidgets('invalid price stays local and focuses the field', (
    tester,
  ) async {
    final service = _Service();
    await _render(tester, service);
    for (final value in ['', '0', '-2', '2.001', '1e2']) {
      await tester.enterText(find.byType(TextField), value);
      await tester.tap(find.text('Make public and For sale'));
      await tester.pump();
      expect(service.calls, 0);
      expect(find.textContaining('Enter a USD price'), findsOneWidget);
    }
  });
  testWidgets(
    'repeated submit waits for one exact-copy write and keeps real Square confirmation visible',
    (tester) async {
      final service = _Service()..wait = Completer<void>();
      await _render(tester, service);
      await tester.enterText(find.byType(TextField), '2');
      await tester.tap(find.text('Make public and For sale'));
      await tester.pump();
      expect(find.text('Saving and syncing…'), findsOneWidget);
      expect(
        tester.widget<FilledButton>(find.byType(FilledButton)).onPressed,
        isNull,
      );
      expect(service.calls, 1);
      service.wait!.complete();
      await tester.pumpAndSettle();
      expect(service.savedPrice, 2);
      expect(
        find.text('For sale saved. Ready to scan in Square.'),
        findsOneWidget,
      );
      expect(
        tester.widget<QrImageView>(find.byType(QrImageView)).semanticsLabel,
        'grookai QR for Venusaur ex',
      );
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets('pending never claims ready and provides a recovery action', (
    tester,
  ) async {
    final service = _Service()..status = 'pending';
    await _render(tester, service);
    await tester.enterText(find.byType(TextField), '20.00');
    await tester.tap(find.text('Make public and For sale'));
    await tester.pumpAndSettle();
    expect(find.textContaining('Square is still syncing'), findsOneWidget);
    expect(find.textContaining('Ready to scan'), findsNothing);
    expect(find.text('Check Square status'), findsOneWidget);
  });
  testWidgets('uncertain save retains price and never invents success', (
    tester,
  ) async {
    final service = _Service()..fail = true;
    await _render(tester, service);
    await tester.enterText(find.byType(TextField), '12.50');
    await tester.tap(find.text('Make public and For sale'));
    await tester.pumpAndSettle();
    expect(find.textContaining('could not be confirmed'), findsOneWidget);
    expect(find.byType(QrImageView), findsNothing);
    expect(
      tester.widget<TextField>(find.byType(TextField)).controller!.text,
      '12.50',
    );
  });
}
