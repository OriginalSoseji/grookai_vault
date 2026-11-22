import 'dart:async';
import 'dart:convert';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:grookai_vault/services/printing/p21_batch_print_service.dart';
import 'package:grookai_vault/services/printing/p21_label.dart';
import 'package:grookai_vault/services/printing/p21_printer_service.dart';

class _Printer extends P21PrinterService {
  int sent = 0, checks = 0, busyChecks = 0;
  int? failAt;
  Completer<void>? first;
  @override
  Future<P21Status> status() async {
    checks++;
    return P21Status(
      state: checks <= busyChecks ? 2 : 0,
      widthMm: 14,
      lengthMm: 40,
      paperType: 1,
    );
  }

  @override
  Future<void> printLabel(P21Label label) async {
    sent++;
    if (sent == 1 && first != null) await first!.future;
    if (sent == failAt) {
      throw PlatformException(
        code: 'disconnected',
        message: 'Uncertain physical transmission.',
      );
    }
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUp(() => SharedPreferences.setMockInitialValues({}));
  final label = P21Label(previewPng: Uint8List(1), bitmap: Uint8List(3408));
  test(
    'batch waits for readiness and sends each selected label once',
    () async {
      final printer = _Printer()..busyChecks = 2;
      final progress = <int>[];
      await P21BatchPrintService.send(
        labels: [label, label],
        printer: printer,
        onSent: progress.add,
        wait: (_) async {},
      );
      expect(printer.sent, 2);
      expect(printer.checks, 4);
      expect(progress, [1, 2]);
      final receipt =
          jsonDecode(
                (await SharedPreferences.getInstance()).getString(
                  'p21_last_batch_v1',
                )!,
              )
              as Map;
      expect(receipt['state'], 'sent');
      expect(receipt['sent'], 2);
      expect(receipt['total'], 2);
      expect(receipt.keys.toSet(), {
        'id',
        'startedAt',
        'endedAt',
        'total',
        'sent',
        'attemptedIndex',
        'state',
      });
    },
  );
  test(
    'uncertain transmission stops the batch without replaying any label',
    () async {
      final printer = _Printer()..failAt = 2;
      final progress = <int>[];
      await expectLater(
        P21BatchPrintService.send(
          labels: [label, label, label],
          printer: printer,
          onSent: progress.add,
          wait: (_) async {},
        ),
        throwsA(isA<PlatformException>()),
      );
      expect(printer.sent, 2);
      expect(progress, [1]);
      final receipt =
          jsonDecode(
                (await SharedPreferences.getInstance()).getString(
                  'p21_last_batch_v1',
                )!,
              )
              as Map;
      expect(receipt['state'], 'stopped');
      expect(receipt['sent'], 1);
      expect(receipt['attemptedIndex'], 1);
      await Future<void>.delayed(const Duration(milliseconds: 10));
      expect(printer.sent, 2);
    },
  );
  test(
    'duplicate batch requests cannot interleave with an active batch',
    () async {
      final printer = _Printer()..first = Completer<void>();
      final active = P21BatchPrintService.send(
        labels: [label, label],
        printer: printer,
        onSent: (_) {},
        wait: (_) async {},
      );
      for (var i = 0; i < 50 && printer.sent == 0; i++) {
        await Future<void>.delayed(const Duration(milliseconds: 1));
      }
      expect(printer.sent, 1);
      await expectLater(
        P21BatchPrintService.send(
          labels: [label],
          printer: printer,
          onSent: (_) {},
        ),
        throwsA(isA<PlatformException>().having((e) => e.code, 'code', 'busy')),
      );
      printer.first!.complete();
      await active;
      expect(printer.sent, 2);
    },
  );
  test('unready printer never receives label bytes', () async {
    final printer = _Printer()..busyChecks = 30;
    await expectLater(
      P21BatchPrintService.send(
        labels: [label],
        printer: printer,
        onSent: (_) {},
        wait: (_) async {},
      ),
      throwsA(isA<PlatformException>()),
    );
    expect(printer.sent, 0);
  });
}
