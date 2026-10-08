import 'dart:convert';
import 'dart:io';
import 'package:integration_test/integration_test_driver_extended.dart';

Future<void> main() async {
  final destination = Platform.environment['DISCOUNT_DEVICE_OUTPUT'];
  if (destination == null ||
      !RegExp(
        r'^C:/grookai_vault_operator_artifacts/product_discount_20261008/ui-[0-9]+/phase-[12]$',
      ).hasMatch(destination.replaceAll(r'\', '/'))) {
    throw StateError('An external discount acceptance output is required.');
  }
  await integrationDriver(
    writeResponseOnFailure: true,
    onScreenshot: (name, bytes, [args]) async {
      if (!RegExp(r'^discount-[a-z-]+$').hasMatch(name)) {
        throw StateError('Unexpected screenshot name');
      }
      await File('$destination/$name.png').writeAsBytes(bytes);
      return true;
    },
    responseDataCallback: (data) async {
      final safe = Map<String, dynamic>.from(data ?? {})..remove('screenshots');
      await File(
        '$destination/device-response.json',
      ).writeAsString(const JsonEncoder.withIndent('  ').convert(safe));
    },
  );
}
