import 'dart:convert';
import 'dart:io';
import 'package:integration_test/integration_test_driver_extended.dart';

Future<void> main() async {
  final output = Platform.environment['COLLECTOR_DEVICE_OUTPUT'];
  if (output == null ||
      !RegExp(
        r'^C:/grookai_vault_operator_artifacts/product_collector_home_20261008/ui-[0-9]+/device-[0-9]+$',
      ).hasMatch(output.replaceAll(r'\', '/'))) {
    throw StateError('Dedicated collector proof output required');
  }
  await integrationDriver(
    writeResponseOnFailure: true,
    onScreenshot: (name, bytes, [args]) async {
      if (!RegExp(r'^collector-home-[a-z-]+$').hasMatch(name)) {
        throw StateError('Unexpected screenshot name');
      }
      await File('$output/$name.png').writeAsBytes(bytes);
      return true;
    },
    responseDataCallback: (data) async {
      final safe = Map<String, dynamic>.from(data ?? {})..remove('screenshots');
      await File(
        '$output/device-response.json',
      ).writeAsString(const JsonEncoder.withIndent('  ').convert(safe));
    },
  );
}
