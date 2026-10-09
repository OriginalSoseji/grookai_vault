import 'dart:convert';
import 'dart:io';
import 'package:grookai_vault/services/vault/inventory_export.dart';

Future<void> main() async {
  final input = jsonDecode(await stdin.transform(utf8.decoder).join()) as List;
  final results = <Map<String, String>>[];
  for (final value in input) {
    final row = value as Map<String, dynamic>;
    final export = InventoryExport.parse(
      row['ownerId'] as String,
      row['document'],
    );
    results.add({
      'name': row['name'] as String,
      'json': export.toJsonString(),
      'csv': export.toCsvString(),
    });
  }
  stdout.write(jsonEncode(results));
}
