import 'dart:convert';
import 'dart:io';
import 'package:integration_test/integration_test_driver_extended.dart';

Future<void> main() async {
  final output = Directory(
    'artifacts/native_condition_pricing_v1/20261118/device',
  );
  await output.create(recursive: true);
  await integrationDriver(
    onScreenshot: (name, bytes, [args]) async {
      if (!RegExp(
        r'^condition-price-(dark|light)-(nm|lp|dmg)$',
      ).hasMatch(name)) {
        return false;
      }
      await File('${output.path}/$name.png').writeAsBytes(bytes, flush: true);
      return true;
    },
    responseDataCallback: (data) async {
      // Screenshots are already preserved individually; avoid duplicate blobs.
      final receipt = Map<String, dynamic>.from(data ?? {})
        ..remove('screenshots');
      await File(
        '${output.path}/receipt.json',
      ).writeAsString('${jsonEncode(receipt)}\n');
    },
  );
}
