import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/widgets/scanner/scanner_state_notice_dialog.dart';

void main() {
  Future<void> openDialog(
    WidgetTester tester,
    ValueChanged<ScannerStateNoticeDecision?> onDecision,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Builder(
          builder: (context) => Scaffold(
            body: TextButton(
              onPressed: () async {
                onDecision(await showScannerStateNoticeDialog(context));
              },
              child: const Text('Open scanner'),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Open scanner'));
    await tester.pumpAndSettle();
  }

  testWidgets('explains scanner limitations and proceeds explicitly', (
    tester,
  ) async {
    ScannerStateNoticeDecision? decision;
    await openDialog(tester, (value) => decision = value);

    expect(
      find.byKey(const Key('scanner_state_notice_dialog')),
      findsOneWidget,
    );
    expect(find.text('Scanner status'), findsOneWidget);
    expect(find.textContaining('not perfect yet'), findsOneWidget);
    expect(
      find.textContaining('cards, printings, and variants'),
      findsOneWidget,
    );
    expect(find.text('Do not show again'), findsOneWidget);
    expect(find.text('Go back'), findsOneWidget);
    expect(find.text('OK'), findsOneWidget);

    await tester.tap(
      find.byKey(const Key('scanner_state_notice_do_not_show_again')),
    );
    await tester.tap(find.byKey(const Key('scanner_state_notice_ok')));
    await tester.pumpAndSettle();

    expect(decision?.proceed, isTrue);
    expect(decision?.doNotShowAgain, isTrue);
  });

  testWidgets('go back returns without opening the scanner', (tester) async {
    ScannerStateNoticeDecision? decision;
    await openDialog(tester, (value) => decision = value);

    await tester.tap(find.byKey(const Key('scanner_state_notice_go_back')));
    await tester.pumpAndSettle();

    expect(decision?.proceed, isFalse);
    expect(decision?.doNotShowAgain, isFalse);
  });

  testWidgets('system back cannot bypass the explicit decision', (
    tester,
  ) async {
    ScannerStateNoticeDecision? decision;
    await openDialog(tester, (value) => decision = value);

    await tester.binding.handlePopRoute();
    await tester.pumpAndSettle();

    expect(
      find.byKey(const Key('scanner_state_notice_dialog')),
      findsOneWidget,
    );
    expect(decision, isNull);

    await tester.tap(find.byKey(const Key('scanner_state_notice_go_back')));
    await tester.pumpAndSettle();
    expect(decision?.proceed, isFalse);
  });
}
