import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/screens/sales/sales_reports_screen.dart';
import 'package:grookai_vault/screens/sales/event_edit_panel.dart';
import 'package:grookai_vault/services/sales/sales_cart_service.dart';
import 'package:grookai_vault/services/sales/event_service.dart';
import 'package:grookai_vault/theme/gv_tokens.dart';
import 'support/trade_controls.dart';

// Forward every real RPC. Only lose the response after the server commits close.
class DropCommittedClose implements EventGateway {
  DropCommittedClose(this.inner);
  final EventGateway inner;
  bool drop = false;
  final sent = <Map<String, dynamic>>[];
  @override
  String? get ownerId => inner.ownerId;
  @override
  Stream<String?> get ownerChanges => inner.ownerChanges;
  @override
  Future<Object?> read(String? eventId) => inner.read(eventId);
  @override
  Future<Object?> recover(String requestId) => inner.recover(requestId);
  @override
  Future<Object?> mutate(Map<String, dynamic> request) async {
    sent.add(jsonDecode(jsonEncode(request)) as Map<String, dynamic>);
    final result = await inner.mutate(request);
    if (drop && request['operation']['type'] == 'event_close') {
      drop = false;
      throw const SocketException('Acceptance: committed response lost');
    }
    return result;
  }
}

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets(
    'actual event closeout survives process loss and disabled entry',
    (tester) async {
      tester.testTextInput.register();
      addTearDown(tester.testTextInput.unregister);
      const url = String.fromEnvironment('SUPABASE_URL');
      const email = String.fromEnvironment('EVENT_TEST_EMAIL');
      const date = String.fromEnvironment('EVENT_TEST_DATE');
      expect(url, 'http://127.0.0.1:34061');
      expect(email.endsWith('@event-ui.invalid'), isTrue);
      final client = SupabaseClient(
        url,
        const String.fromEnvironment('SUPABASE_PUBLISHABLE_KEY'),
      );
      addTearDown(client.dispose);
      await client.auth.signInWithPassword(
        email: email,
        password: const String.fromEnvironment('EVENT_TEST_PASSWORD'),
      );
      final owner = client.auth.currentUser!.id;
      final gateway = DropCommittedClose(SupabaseEventGateway(client));
      final events = EventService(gateway: gateway);
      addTearDown(events.dispose);
      final cart = SalesCartService(client: client);
      final prefs = await SharedPreferences.getInstance();
      final marker = 'grookai.event-runtime-proof.v1.$owner';
      final previous = prefs.getString(marker);
      final before = await events.read();
      expect(before['entryEnabled'], previous == null);
      await tester.pumpWidget(
        MaterialApp(
          theme: ThemeData(
            useMaterial3: true,
            colorScheme: GvPalette.scheme(Brightness.light),
          ),
          home: SalesReportsScreen(
            service: cart,
            eventService: events,
            eventsEnabled: previous == null,
            profitEnabled: true,
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

      Future<void> button(String label) =>
          tap(find.widgetWithText(OutlinedButton, label));
      Future<void> section(String label) =>
          tap(find.widgetWithText(ChoiceChip, label));
      Future<void> fill(String label, String value) async {
        final field = find.widgetWithText(TextField, label);
        await revealTradeControl(tester, field);
        await tester.enterText(field, value);
        FocusManager.instance.primaryFocus?.unfocus();
        await tester.pumpAndSettle();
      }

      Future<void> save(String label) async {
        await tap(find.widgetWithText(FilledButton, label));
        for (
          var i = 0;
          i < 150 && find.byType(EventEditPanel).evaluate().isNotEmpty;
          i++
        ) {
          await tester.pump(const Duration(milliseconds: 200));
        }
        expect(find.byType(EventEditPanel), findsNothing);
        await waitFor(find.text('Event change saved.'));
      }

      Future<void> screenshot(String name, Finder target) async {
        await revealTradeControl(tester, target);
        await binding.takeScreenshot(name);
      }

      await waitFor(
        find.widgetWithText(
          ChoiceChip,
          previous == null ? 'Events' : 'Saved event edit',
        ),
      );
      await section(previous == null ? 'Events' : 'Saved event edit');
      if (previous == null) {
        expect(await events.journal(), isNull);
        await waitFor(find.widgetWithText(FilledButton, 'Create event'));
        await tap(find.widgetWithText(FilledButton, 'Create event'));
        await fill('Event name', 'Samsung card weekend');
        await fill('Event time zone', 'UTC');
        await fill('Start date', date);
        await fill('End date', date);
        await fill('Private notes', 'Synthetic Samsung proof');
        await save('Create event');
        final eventId =
            (await events.read())['events'].single['eventId'] as String;
        await section('Expenses');
        await button('Add expense');
        await fill('Expense description', 'Booth fee');
        await fill('Amount (USD)', '10.00');
        await save('Add expense');
        await section('Receipts');
        for (final number in [
          const String.fromEnvironment('EVENT_SALE_NUMBER'),
          const String.fromEnvironment('EVENT_UNKNOWN_NUMBER'),
        ]) {
          await tap(find.widgetWithText(CheckboxListTile, number));
        }
        await button('Add selected to event');
        await waitFor(find.text('Event change saved.'));
        await section('Totals');
        await screenshot(
          'event-partial-cost',
          find.text('Known-cost event subtotal'),
        );
        expect(find.text(r'$30.00'), findsOneWidget);
        expect(
          find.textContaining(r'$50.00 in item sales remains uncovered.'),
          findsOneWidget,
        );
        await section('Expenses');
        await button('Amend Booth fee');
        await fill('Amount (USD)', '0.00');
        await fill('Reason for this change', 'Organizer waived the fee');
        await save('Amend expense');
        await section('Totals');
        await revealTradeControl(
          tester,
          find.text('Known-cost event subtotal'),
        );
        expect(find.text(r'$40.00'), findsOneWidget);
        await section('Expenses');
        await button('Void Booth fee');
        await fill('Reason for this change', 'Duplicate expense');
        await save('Void expense');
        await screenshot(
          'event-void-retained',
          find.text('Booth fee · Voided'),
        );
        await button('Add expense');
        await fill('Expense description', 'Travel');
        await fill('Amount (USD)', '10.00');
        await save('Add expense');
        await section('History');
        await screenshot('event-history', find.text('Duplicate expense'));
        await button('Close event');
        await fill('Reason for this change', 'Show complete');
        await save('Close event');
        await button('Reopen event');
        await fill('Reason for this change', 'Review later receipts');
        await save('Reopen event');
        await section('Receipts');
        for (final number in [
          const String.fromEnvironment('EVENT_BUY_NUMBER'),
          const String.fromEnvironment('EVENT_TRADE_NUMBER'),
        ]) {
          await tap(find.widgetWithText(CheckboxListTile, number));
        }
        await button('Add selected to event');
        await waitFor(find.text('Event change saved.'));
        await section('Totals');
        await screenshot(
          'event-mixed-totals',
          find.text('Known-cost event subtotal'),
        );
        expect(find.text(r'$30.00'), findsOneWidget);
        expect(
          find.textContaining(r'$60.00 in item sales remains uncovered.'),
          findsOneWidget,
        );
        gateway.drop = true;
        await button('Close event');
        await fill('Reason for this change', 'Final closeout');
        await tap(find.widgetWithText(FilledButton, 'Close event'));
        await waitFor(find.text('An event save needs checking'));
        final journal = await events.journal();
        expect(journal?['pending'], isNotNull);
        expect(
          (await events.read(eventId))['events'].single['status'],
          'closed',
        );
        await prefs.setString(
          marker,
          jsonEncode({
            'eventId': eventId,
            'journal': journal,
            'mutations': gateway.sent,
          }),
        );
        await screenshot(
          'event-pending-close',
          find.text('An event save needs checking'),
        );
        binding.reportData = {
          ...?binding.reportData,
          'phase': 'event_pending',
          'owner': owner,
          'eventId': eventId,
          'journal': journal,
          'mutations': gateway.sent,
        };
      } else {
        final saved = jsonDecode(previous) as Map;
        expect(await events.journal(), saved['journal']);
        await waitFor(find.text('An event save needs checking'));
        await button('Check saved result');
        await waitFor(find.text('Event change saved.'));
        expect((await events.journal())?['pending'], isNull);
        expect(gateway.sent, isEmpty);
        final selector = find.byWidgetPredicate(
          (w) =>
              w is DropdownButtonFormField<String> &&
              w.decoration.labelText == 'Event',
        );
        await tap(selector);
        await tap(find.text('Samsung card weekend · Closed').last);
        await screenshot(
          'event-recovered-entry-off',
          find.text('Known-cost event subtotal'),
        );
        expect(find.text(r'$30.00'), findsOneWidget);
        await revealTradeControl(
          tester,
          find.widgetWithText(OutlinedButton, 'Reopen event'),
        );
        expect(
          tester
              .widget<OutlinedButton>(
                find.widgetWithText(OutlinedButton, 'Reopen event'),
              )
              .onPressed,
          isNull,
        );
        await client.auth.signOut();
        await tester.pumpAndSettle();
        expect(
          find.text('Your account changed. Reopen reports.'),
          findsOneWidget,
        );
        await binding.takeScreenshot('event-account-closed');
        binding.reportData = {
          ...?binding.reportData,
          'phase': 'event_recovered',
          'owner': owner,
          'eventId': saved['eventId'],
          'exactJournalRetained': true,
          'noSecondMutation': true,
          'accountClosed': true,
        };
      }
    },
  );
}
