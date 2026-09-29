import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/screens/printing/p21_label_print_screen.dart';
import 'package:grookai_vault/services/printing/p21_label.dart';
import 'package:grookai_vault/services/printing/p21_printer_service.dart';

class FakePrinter extends P21PrinterService {
  int printCalls = 0;
  final sent = Completer<void>();
  @override
  Future<List<P21Device>> scan() async => [
    const P21Device('test-device', 'P21'),
  ];
  @override
  Future<P21Status> connect(P21Device device) async =>
      const P21Status(state: 0, widthMm: 14, lengthMm: 40, paperType: 1);
  @override
  Future<void> printLabel(P21Label label) {
    printCalls++;
    return sent.future;
  }

  @override
  Future<void> disconnect() async {}
}

void main() {
  testWidgets(
    'requires printer selection and prevents duplicate label sends while busy',
    (tester) async {
      final printer = FakePrinter();
      await tester.runAsync(() async {
        await tester.pumpWidget(
          MaterialApp(
            home: P21LabelPrintScreen(
              content: P21LabelContent(
                title: 'Test card',
                setName: 'Test set',
                number: '123',
                qrUri: Uri.parse('https://grookaivault.com/q/TEST'),
              ),
              printer: printer,
            ),
          ),
        );
        await Future<void>.delayed(const Duration(milliseconds: 100));
      });
      await tester.pumpAndSettle();
      FilledButton button() => tester.widget<FilledButton>(
        find.widgetWithText(FilledButton, 'Print 1 label'),
      );
      expect(button().onPressed, isNull);
      await tester.tap(find.text('Find P21'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('P21'));
      await tester.pumpAndSettle();
      expect(find.text('Loaded roll: 14 × 40 mm'), findsOneWidget);
      expect(button().onPressed, isNotNull);
      await tester.ensureVisible(find.text('Print 1 label'));
      await tester.tap(find.text('Print 1 label'));
      await tester.pump();
      expect(printer.printCalls, 1);
      expect(button().onPressed, isNull);
      printer.sent.complete();
      await tester.pumpAndSettle();
      expect(find.textContaining('Label sent to P21'), findsOneWidget);
      expect(printer.printCalls, 1);
      expect(tester.takeException(), isNull);
    },
  );
}
