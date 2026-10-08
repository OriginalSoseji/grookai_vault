import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/screens/vault/portfolio_history_panel.dart';
import 'package:grookai_vault/services/vault/portfolio_history_service.dart';
import 'package:grookai_vault/theme/gv_tokens.dart';
import 'support/trade_controls.dart';

class DropCommittedPortfolio implements PortfolioGateway {
  DropCommittedPortfolio(this.inner);
  final PortfolioGateway inner;
  bool drop = false;
  final sent = <Map<String, dynamic>>[];
  @override
  String? get ownerId => inner.ownerId;
  @override
  Stream<String?> get ownerChanges => inner.ownerChanges;
  @override
  Future<Object?> capabilities() => inner.capabilities();
  @override
  Future<Object?> list(String? before, String? watermark, int limit) =>
      inner.list(before, watermark, limit);
  @override
  Future<Object?> compare(String beforeId, String afterId) =>
      inner.compare(beforeId, afterId);
  @override
  Future<Object?> export(String pointId, String? afterCopy) =>
      inner.export(pointId, afterCopy);
  @override
  Future<Object?> recover(Map<String, dynamic> request) =>
      inner.recover(request);
  @override
  Future<Object?> cancel(Map<String, dynamic> request) => inner.cancel(request);
  @override
  Future<Object?> capture(Map<String, dynamic> request) async {
    sent.add(Map<String, dynamic>.from(jsonDecode(jsonEncode(request)) as Map));
    final outcome = await inner.capture(request);
    if (drop) {
      drop = false;
      throw const SocketException('Acceptance: committed response lost');
    }
    return outcome;
  }
}

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets(
    'actual portfolio history survives process loss with recording disabled',
    (tester) async {
      const url = String.fromEnvironment('SUPABASE_URL'),
          email = String.fromEnvironment('PORTFOLIO_TEST_EMAIL');
      expect(url, 'http://127.0.0.1:35521');
      expect(email.endsWith('@offer-market.invalid'), isTrue);
      final client = SupabaseClient(
        url,
        const String.fromEnvironment('SUPABASE_PUBLISHABLE_KEY'),
      );
      addTearDown(client.dispose);
      await client.auth.signInWithPassword(
        email: email,
        password: const String.fromEnvironment('PORTFOLIO_TEST_PASSWORD'),
      );
      final owner = client.auth.currentUser!.id,
          prefs = await SharedPreferences.getInstance(),
          marker = 'grookai.portfolio-runtime.v1.$owner',
          previous = prefs.getString(marker);
      final gateway = DropCommittedPortfolio(SupabasePortfolioGateway(client))
        ..drop = previous == null;
      final service = PortfolioHistoryService(
        gateway: gateway,
        allowNewRecordings: previous == null,
      );
      addTearDown(service.dispose);
      expect((await service.capabilities())['enabled'], previous == null);
      final before = await service.journal();
      await tester.pumpWidget(
        MaterialApp(
          theme: ThemeData(
            useMaterial3: true,
            colorScheme: GvPalette.scheme(Brightness.light),
          ),
          home: Scaffold(
            appBar: AppBar(title: const Text('Collection history')),
            body: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: PortfolioHistoryPanel(ownerId: owner, service: service),
            ),
          ),
        ),
      );
      if (Platform.isAndroid) {
        await binding.convertFlutterSurfaceToImage();
        await tester.pump();
      }
      Future<void> waitFor(Finder finder) async {
        for (var i = 0; i < 150 && finder.evaluate().isEmpty; i++) {
          await tester.pump(const Duration(milliseconds: 200));
        }
        expect(finder, findsWidgets);
      }

      Future<void> ready() async {
        for (var i = 0; i < 150; i++) {
          final finder = find.widgetWithText(OutlinedButton, 'Refresh history');
          if (finder.evaluate().isNotEmpty &&
              tester.widget<OutlinedButton>(finder).onPressed != null) {
            return;
          }
          await tester.pump(const Duration(milliseconds: 200));
        }
        fail('History remained busy');
      }

      Future<void> tap(Finder finder) async {
        await revealTradeControl(tester, finder);
        await tester.tap(finder);
        await tester.pumpAndSettle();
      }

      Future<void> picture(String name, Finder target) async {
        await revealTradeControl(tester, target);
        await binding.takeScreenshot(name);
      }

      Future<void> select(String label, String stamp) async {
        final field = find.byWidgetPredicate(
          (w) =>
              w is DropdownButtonFormField<String> &&
              w.decoration.labelText == label,
        );
        await tap(field);
        await tap(
          find
              .text(DateTime.parse(stamp).toLocal().toString().substring(0, 16))
              .last,
        );
      }

      await ready();
      if (previous == null) {
        expect(before, isNull);
        await waitFor(find.text('Recording needs confirmation'));
        expect(find.text('USD 12.34'), findsWidgets);
        await picture(
          'portfolio-history-pending',
          find.text('Recording needs confirmation'),
        );
        final journal = await service.journal();
        expect(journal!['pending'], gateway.sent.single);
        final outcome = await gateway.inner.recover(
          Map<String, dynamic>.from(journal['pending'] as Map),
        );
        expect((outcome as Map)['status'], 'captured');
        expect(outcome['summary']['sequence'], '41');
        final page = await service.list(),
            pointBefore =
                (page['points'] as List).firstWhere(
                      (p) =>
                          p['snapshotId'] ==
                          const String.fromEnvironment(
                            'PORTFOLIO_TEST_POINT_BEFORE',
                          ),
                    )
                    as Map;
        await select(
          'Earlier observation',
          pointBefore['capturedAt'] as String,
        );
        await select(
          'Later observation',
          outcome['summary']['capturedAt'] as String,
        );
        await tap(find.widgetWithText(OutlinedButton, 'Compare'));
        await ready();
        expect(find.text('USD -1.66 reference value change'), findsOneWidget);
        await picture(
          'portfolio-history-comparison',
          find.text('USD -1.66 reference value change'),
        );
        final export = await service.export(outcome['pointId'] as String);
        expect(export['rows'], hasLength(2));
        expect(export['point']['totals']['USD']['exact'], '12.34');
        await tap(
          find.widgetWithText(OutlinedButton, 'Load older observations'),
        );
        await ready();
        expect(
          find.widgetWithText(OutlinedButton, 'Export details'),
          findsNWidgets(41),
        );
        final currencies = find.byWidgetPredicate(
          (w) =>
              w is DropdownButton<String> &&
              (w.items?.any((item) => item.value == 'CAD') ?? false),
        );
        await tap(currencies);
        await tap(find.text('CAD').last);
        await picture(
          'portfolio-history-currency',
          find.text('Observed range: CAD 25.00 – 25.00'),
        );
        await tap(currencies);
        await tap(find.text('USD').last);
        await picture(
          'portfolio-history-timeline',
          find.text('Recorded reference value'),
        );
        expect((await service.journal())!['pending'], journal['pending']);
        await prefs.setString(
          marker,
          jsonEncode({'journal': journal, 'sent': gateway.sent}),
        );
        binding.reportData = {
          ...?binding.reportData,
          'phase': 'portfolio_history_pending',
          'owner': owner,
          'journal': journal,
          'sent': gateway.sent,
          'result': outcome,
          'completeExportCopies': 2,
          'loadedObservations': 41,
          'processId': pid,
        };
      } else {
        final saved = jsonDecode(previous) as Map;
        expect(before, saved['journal']);
        await waitFor(
          find.textContaining('New recordings are currently unavailable.'),
        );
        expect((await service.journal())!['pending'], null);
        expect(gateway.sent, isEmpty);
        expect(find.text('USD 12.34'), findsWidgets);
        await picture(
          'portfolio-history-recovered',
          find.textContaining('New recordings are currently unavailable.'),
        );
        await client.auth.signOut();
        await tester.pumpAndSettle();
        expect(
          find.text(
            'Your account changed. Reopen Vault to view collection history.',
          ),
          findsOneWidget,
        );
        expect(find.text('USD 12.34'), findsNothing);
        await picture(
          'portfolio-history-account-closed',
          find.text(
            'Your account changed. Reopen Vault to view collection history.',
          ),
        );
        binding.reportData = {
          ...?binding.reportData,
          'phase': 'portfolio_history_recovered',
          'owner': owner,
          'exactJournalRetained': true,
          'pendingCleared': true,
          'noSecondCapture': gateway.sent.isEmpty,
          'accountClosed': true,
          'processId': pid,
        };
      }
      expect(tester.takeException(), null);
    },
  );
}
