import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/screens/sales/sales_reports_screen.dart';
import 'package:grookai_vault/services/sales/cost_correction_service.dart';
import 'package:grookai_vault/services/sales/sales_cart_service.dart';
import 'package:grookai_vault/theme/gv_tokens.dart';
import 'support/trade_controls.dart';

class DropCommittedCorrection implements CostCorrectionGateway {
  DropCommittedCorrection(this.inner);
  final CostCorrectionGateway inner;
  bool drop = false;
  final sent = <Map<String, dynamic>>[];
  @override
  String? get ownerId => inner.ownerId;
  @override
  Stream<String?> get ownerChanges => inner.ownerChanges;
  @override
  Future<Object?> available() => inner.available();
  @override
  Future<Object?> read(List<String> ids) => inner.read(ids);
  @override
  Future<Object?> history(String id, int line, String? before) =>
      inner.history(id, line, before);
  @override
  Future<Object?> recover(Map<String, dynamic> request) =>
      inner.recover(request);
  @override
  Future<Object?> cancel(Map<String, dynamic> request) => inner.cancel(request);
  @override
  Future<Object?> apply(Map<String, dynamic> request) async {
    sent.add(jsonDecode(jsonEncode(request)) as Map<String, dynamic>);
    final result = await inner.apply(request);
    if (drop) {
      drop = false;
      throw const SocketException('Acceptance: committed response lost');
    }
    return result;
  }
}

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets('actual cost history survives process loss and entry rollback', (
    tester,
  ) async {
    tester.testTextInput.register();
    addTearDown(tester.testTextInput.unregister);
    const url = String.fromEnvironment('SUPABASE_URL'),
        email = String.fromEnvironment('COST_HISTORY_TEST_EMAIL');
    expect(url, 'http://127.0.0.1:35001');
    expect(email.endsWith('@cost-history-ui.invalid'), isTrue);
    final client = SupabaseClient(
      url,
      const String.fromEnvironment('SUPABASE_PUBLISHABLE_KEY'),
    );
    addTearDown(client.dispose);
    await client.auth.signInWithPassword(
      email: email,
      password: const String.fromEnvironment('COST_HISTORY_TEST_PASSWORD'),
    );
    final owner = client.auth.currentUser!.id,
        gateway = DropCommittedCorrection(
          SupabaseCostCorrectionGateway(client),
        ),
        service = CostCorrectionService(gateway: gateway),
        prefs = await SharedPreferences.getInstance();
    addTearDown(service.dispose);
    final marker = 'grookai.cost-history-runtime.v1.$owner',
        previous = prefs.getString(marker);
    expect(await service.available(), previous == null);
    final before = await service.journal();
    await tester.pumpWidget(
      MaterialApp(
        theme: ThemeData(
          useMaterial3: true,
          colorScheme: GvPalette.scheme(Brightness.light),
        ),
        home: SalesReportsScreen(
          service: SalesCartService(client: client),
          costCorrectionService: service,
          costCorrectionsEnabled: previous == null,
          profitEnabled: previous == null,
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

    Future<void> tap(Finder finder) async {
      await revealTradeControl(tester, finder);
      await tester.tap(finder);
      await tester.pumpAndSettle();
    }

    Future<void> fill(String label, String value) async {
      final field = find.widgetWithText(TextField, label);
      await revealTradeControl(tester, field);
      await tester.enterText(field, value);
      FocusManager.instance.primaryFocus?.unfocus();
      await tester.pumpAndSettle();
    }

    Future<void> picture(String name, Finder target) async {
      await revealTradeControl(tester, target);
      await binding.takeScreenshot(name);
    }

    Future<void> basis(String value) async {
      final selector = find.byWidgetPredicate(
        (w) =>
            w is DropdownButtonFormField<String> &&
            w.decoration.labelText == 'Cost basis',
      );
      await tap(selector);
      await tap(find.text(value).last);
    }

    Future<void> editor() async {
      const number = String.fromEnvironment('COST_HISTORY_UNKNOWN_NUMBER');
      final tile = find.widgetWithText(ExpansionTile, number);
      await revealTradeControl(tester, tile);
      if (find
          .descendant(of: tile, matching: find.text('Correct cost'))
          .evaluate()
          .isEmpty) {
        await tap(tile);
      }
      await tap(
        find.descendant(of: tile, matching: find.text('Correct cost')).first,
      );
      await waitFor(find.text('Total cost for this line'));
    }

    Future<void> save() async {
      await tap(find.widgetWithText(FilledButton, 'Save cost revision'));
      await waitFor(
        find.text('Cost revision saved. Original sale evidence is retained.'),
      );
      for (var i = 0; i < 150; i++) {
        final button = find.widgetWithText(
          OutlinedButton,
          'Refresh cost history',
        );
        if (button.evaluate().isNotEmpty &&
            tester.widget<OutlinedButton>(button).onPressed != null) {
          break;
        }
        await tester.pump(const Duration(milliseconds: 200));
      }
    }

    final label = previous == null ? 'Cost history' : 'Saved cost correction';
    await waitFor(find.widgetWithText(ChoiceChip, label));
    await tap(find.widgetWithText(ChoiceChip, label));
    if (previous == null) {
      expect(before, isNull);
      await waitFor(find.text(r'$40.00'));
      await picture(
        'cost-history-original',
        find.text('Profit on covered sales'),
      );
      await editor();
      await fill('Total cost for this line', '20.00');
      await fill('Reason for this correction', 'Invoice covers both copies');
      await picture(
        'cost-history-editor',
        find.text(
          'Revision being reviewed: 0. The amount covers all units on this line.',
        ),
      );
      await save();
      expect(gateway.sent.single['receipt']['items'][0]['quantity'], 2);
      expect(gateway.sent.single['cost']['minor'], '2000');
      await basis('Later owner corrections');
      await picture(
        'cost-history-corrected',
        find.text('Profit on covered sales'),
      );
      expect(find.text(r'$70.00'), findsOneWidget);
      await editor();
      final change = find.byWidgetPredicate(
        (w) =>
            w is DropdownButtonFormField<String> &&
            w.decoration.labelText == 'Change',
      );
      await tap(change);
      await tap(find.text('Restore original evidence').last);
      await fill(
        'Reason for this correction',
        'Invoice belongs to another lot',
      );
      await save();
      await picture(
        'cost-history-restored',
        find.text('Profit on covered sales'),
      );
      expect(find.text(r'$40.00'), findsOneWidget);
      await editor();
      await fill('Total cost for this line', '0');
      await fill('Reason for this correction', 'Copies were gifts');
      await save();
      await picture('cost-history-zero', find.text('Profit on covered sales'));
      expect(find.text(r'$90.00'), findsOneWidget);
      gateway.drop = true;
      await editor();
      await fill('Total cost for this line', '25');
      await fill('Reason for this correction', 'Final complete invoice');
      await tap(find.widgetWithText(FilledButton, 'Save cost revision'));
      await waitFor(find.text('Saved correction needs an outcome'));
      final journal = await service.journal();
      expect(journal!['pending'], gateway.sent.last);
      expect(gateway.sent.length, 4);
      final result = await gateway.inner.recover(
        Map<String, dynamic>.from(journal['pending'] as Map),
      );
      expect((result as Map)['status'], 'applied');
      await prefs.setString(
        marker,
        jsonEncode({'journal': journal, 'sent': gateway.sent}),
      );
      await picture(
        'cost-history-pending',
        find.text('Saved correction needs an outcome'),
      );
      binding.reportData = {
        ...?binding.reportData,
        'phase': 'cost_history_pending',
        'owner': owner,
        'journal': journal,
        'sent': gateway.sent,
        'result': result,
      };
    } else {
      final saved = jsonDecode(previous) as Map;
      expect(before, saved['journal']);
      await waitFor(find.text('Saved correction needs an outcome'));
      await tap(find.widgetWithText(OutlinedButton, 'Check saved correction'));
      await waitFor(
        find.text('Cost revision saved. Original sale evidence is retained.'),
      );
      expect((await service.journal())!['pending'], isNull);
      expect(gateway.sent, isEmpty);
      await basis('Later owner corrections');
      await picture(
        'cost-history-recovered',
        find.text('Profit on covered sales'),
      );
      expect(find.text(r'$65.00'), findsOneWidget);
      await client.auth.signOut();
      await tester.pumpAndSettle();
      expect(
        find.text('Your account changed. Reopen reports.'),
        findsOneWidget,
      );
      await binding.takeScreenshot('cost-history-account-closed');
      binding.reportData = {
        ...?binding.reportData,
        'phase': 'cost_history_recovered',
        'owner': owner,
        'exactJournalRetained': true,
        'pendingCleared': true,
        'noSecondApply': true,
        'accountClosed': true,
      };
    }
  });
}
