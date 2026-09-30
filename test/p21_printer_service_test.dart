import 'dart:convert';

import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/printing/p21_label.dart';
import 'package:grookai_vault/services/printing/p21_printer_service.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  const channel = MethodChannel('grookai/p21');
  const service = P21PrinterService();
  setUp(() => SharedPreferences.setMockInitialValues({}));
  tearDown(
    () => TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, null),
  );

  test(
    'transport failure persists one failed attempt and never resends',
    () async {
      var calls = 0;
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(channel, (call) async {
            calls++;
            final prefs = await SharedPreferences.getInstance();
            expect(
              jsonDecode(prefs.getString('p21_last_print_v1')!)['state'],
              'started',
            );
            expect(call.method, 'printLabel');
            throw PlatformException(
              code: 'disconnected',
              message: 'Check the label before retrying.',
            );
          });
      await expectLater(
        service.printLabel(
          P21Label(previewPng: Uint8List(0), bitmap: Uint8List(3408)),
        ),
        throwsA(isA<PlatformException>()),
      );
      expect(calls, 1);
      final prefs = await SharedPreferences.getInstance();
      final receipt = jsonDecode(prefs.getString('p21_last_print_v1')!);
      expect(receipt['state'], 'failed');
      expect(receipt['errorCode'], 'disconnected');
      expect(receipt.containsKey('bitmap'), isFalse);
    },
  );

  test(
    'successful transmission records sent, not physically printed',
    () async {
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(channel, (call) async => {'state': 'sent'});
      await service.printLabel(
        P21Label(previewPng: Uint8List(0), bitmap: Uint8List(3408)),
      );
      final prefs = await SharedPreferences.getInstance();
      expect(
        jsonDecode(prefs.getString('p21_last_print_v1')!)['state'],
        'sent',
      );
    },
  );

  test(
    'status rejects closed-over errors, missing paper, and mismatched rolls',
    () {
      P21Status status(
        int state, {
        int width = 14,
        int length = 40,
        int paperType = 1,
      }) => P21Status(
        state: state,
        widthMm: width,
        lengthMm: length,
        paperType: paperType,
      );
      expect(status(0).problem, isNull);
      expect(status(1).problem, contains('lid'));
      expect(status(4).problem, contains('Load labels'));
      expect(status(32).problem, contains('busy'));
      expect(status(0, length: 50).problem, contains('14 × 40'));
      expect(status(0, paperType: 0).supportedRoll, isFalse);
    },
  );
}
