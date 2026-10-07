import 'dart:convert';
import 'dart:io';
import 'package:integration_test/integration_test_driver_extended.dart';

Future<void> main() async {
  final destination = Platform.environment['COST_DEVICE_OUTPUT'];
  if (destination == null ||
      !destination
          .replaceAll(r'\', '/')
          .startsWith(
            'C:/grookai_vault_operator_artifacts/product_native_cost_20261007/device-',
          )) {
    throw StateError('An external acceptance output directory is required.');
  }
  await Directory(destination).create(recursive: true);
  await integrationDriver(
    writeResponseOnFailure: true,
    onScreenshot: (name, bytes, [args]) async {
      if (!RegExp(r'^native-cost-[a-z-]+$').hasMatch(name)) {
        throw StateError('Unexpected screenshot name');
      }
      await File('$destination/$name.png').writeAsBytes(bytes);
      return true;
    },
    responseDataCallback: (data) async {
      final safe = Map<String, dynamic>.from(data ?? {});
      safe.remove('screenshots');
      await File(
        '$destination/device-response.json',
      ).writeAsString(const JsonEncoder.withIndent('  ').convert(safe));
    },
  );
}
