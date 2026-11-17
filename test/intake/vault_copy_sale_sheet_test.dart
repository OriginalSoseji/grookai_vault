import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:grookai_vault/models/grookai_sale_listing.dart';
import 'package:grookai_vault/services/grookai_objects/sale_listing_service.dart';
import 'package:grookai_vault/widgets/vault/vault_copy_sale_sheet.dart';
import 'package:grookai_vault/widgets/vault/vault_add_review_sheet.dart';

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
    bool waitForSquareConfirmation = false,
  }) async {
    calls++;
    savedPrice = price;
    expect(instanceId, 'copy-1');
    expect(currency, 'USD');
    expect(preserveNote, true);
    expect(waitForSquareConfirmation, true);
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

Future<void> _render(
  WidgetTester tester,
  _Service service, {
  bool initiallyPrivate = true,
  void Function(RouteSettings)? onRoute,
  Future<String?>? finish,
}) async {
  tester.view.physicalSize = const Size(360, 800);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  await tester.pumpWidget(
    MaterialApp(
      onGenerateRoute: onRoute == null
          ? null
          : (settings) {
              onRoute(settings);
              return MaterialPageRoute<void>(
                builder: (_) => const Scaffold(body: Text('Add card search')),
              );
            },
      home: Scaffold(
        body: VaultCopySaleSheet(
          cardName: 'Venusaur ex',
          service: service,
          initiallyPrivate: initiallyPrivate,
          printingLabelFuture: finish,
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
      expect(find.byType(TextField), findsNothing);
      expect(find.text(r'$2.00'), findsOneWidget);
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
    expect(
      tester.widget<FilledButton>(find.byType(FilledButton)).onPressed,
      isNull,
    );
    expect(service.calls, 1);
    expect(find.text('Close editor'), findsOneWidget);
  });
  testWidgets('keyboard Done reviews a price without publishing it', (
    tester,
  ) async {
    final service = _Service();
    await _render(tester, service);
    await tester.enterText(find.byType(TextField), '2.00');
    await tester.testTextInput.receiveAction(TextInputAction.done);
    await tester.pumpAndSettle();
    expect(service.calls, 0);
    expect(find.text('Keep private'), findsOneWidget);
    expect(find.text('Saved for sale'), findsNothing);
  });
  testWidgets(
    'an already public copy offers cancellation without implying it becomes private',
    (tester) async {
      final service = _Service();
      await _render(tester, service, initiallyPrivate: false);
      expect(find.text('Keep private'), findsNothing);
      await tester.tap(find.text('Cancel changes'));
      await tester.pumpAndSettle();
      expect(service.calls, 0);
    },
  );
  testWidgets('exact finish read never replaces the price being reviewed', (
    tester,
  ) async {
    final service = _Service();
    final finish = Completer<String?>();
    await _render(tester, service, finish: finish.future);
    expect(find.text('Checking finish…'), findsOneWidget);
    await tester.enterText(find.byType(TextField), '12.50');
    finish.complete('Reverse Holo');
    await tester.pumpAndSettle();
    expect(find.text('Reverse Holo'), findsOneWidget);
    expect(
      tester.widget<TextField>(find.byType(TextField)).controller!.text,
      '12.50',
    );
    expect(service.calls, 0);
  });
  testWidgets(
    'add another enters the registered search route without another inventory write',
    (tester) async {
      final service = _Service();
      RouteSettings? route;
      await _render(tester, service, onRoute: (settings) => route = settings);
      await tester.enterText(find.byType(TextField), '2.00');
      await tester.tap(find.text('Make public and For sale'));
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('Add another card'));
      await tester.tap(find.text('Add another card'));
      await tester.pumpAndSettle();
      expect(route?.name, '/search');
      expect(route?.arguments, '');
      expect(find.text('Add card search'), findsOneWidget);
      expect(service.calls, 1);
    },
  );
  testWidgets(
    'nested intake closes before Add another and holds caller navigation until search ends',
    (tester) async {
      final service = _Service();
      final navigation = VaultAddReviewNavigation();
      var intakeClosed = false, returnedToCaller = false;
      String? result;
      await tester.pumpWidget(
        MaterialApp(
          onGenerateRoute: (settings) {
            expect(settings.name, '/search');
            expect(settings.arguments, '');
            expect(intakeClosed, true);
            return MaterialPageRoute<void>(
              settings: settings,
              builder: (context) => Scaffold(
                body: TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Leave search'),
                ),
              ),
            );
          },
          home: Builder(
            builder: (context) => Scaffold(
              body: TextButton(
                child: const Text('Open intake'),
                onPressed: () async {
                  result = await navigation.complete(
                    context,
                    showModalBottomSheet<String>(
                      context: context,
                      builder: (outer) => TextButton(
                        child: const Text('Review sale'),
                        onPressed: () async {
                          await showModalBottomSheet<bool>(
                            context: outer,
                            isScrollControlled: true,
                            builder: (_) => VaultCopySaleSheet(
                              cardName: 'Venusaur ex',
                              service: service,
                              onAddAnother: navigation.addAnother,
                              copy: const SaleListingCopyContext(
                                instanceId: 'copy-1',
                                gvviId: 'GVVI-065CAB28-003419',
                                vaultItemId: 'group-1',
                                cardPrintId: 'card-1',
                              ),
                            ),
                          );
                          if (outer.mounted) {
                            Navigator.pop(outer, 'GVVI-065CAB28-003419');
                          }
                          intakeClosed = true;
                        },
                      ),
                    ),
                  );
                  returnedToCaller = true;
                },
              ),
            ),
          ),
        ),
      );
      await tester.tap(find.text('Open intake'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Review sale'));
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextField), '2.00');
      await tester.ensureVisible(find.text('Make public and For sale'));
      await tester.tap(find.text('Make public and For sale'));
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('Add another card'));
      await tester.tap(find.text('Add another card'));
      await tester.pumpAndSettle();
      expect(find.text('Leave search'), findsOneWidget);
      expect(find.text('Review sale'), findsNothing);
      expect(returnedToCaller, false);
      expect(service.calls, 1);
      await tester.tap(find.text('Leave search'));
      await tester.pumpAndSettle();
      expect(returnedToCaller, true);
      expect(result, 'GVVI-065CAB28-003419');
    },
  );
}
