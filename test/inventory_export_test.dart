import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/vault/inventory_export.dart';

void main() {
  final corpus =
      jsonDecode(
            File(
              'test/fixtures/inventory_export_cases.json',
            ).readAsStringSync(),
          )
          as Map<String, dynamic>;
  final owner = corpus['ownerId'] as String;
  for (final value in corpus['cases'] as List) {
    final example = value as Map<String, dynamic>;
    test('shared inventory corpus: ${example['name']}', () {
      InventoryExport parse() =>
          InventoryExport.parse(owner, example['document']);
      if (example['valid'] == true) {
        expect(jsonDecode(parse().toJsonString()), example['document']);
      } else {
        expect(parse, throwsFormatException);
      }
    });
  }
  test(
    'detached record and exact spreadsheet values survive later SDK changes',
    () {
      final source =
          jsonDecode(jsonEncode(corpus['cases'][0]['document']))
              as Map<String, dynamic>;
      final export = InventoryExport.parse(owner, source);
      source['copies'][0]['record']['notes'] = 'Changed';
      export.document['copies'][0]['record']['notes'] = 'Also changed';
      expect(
        export.document['copies'][0]['record']['notes'],
        isNot(contains('changed')),
      );
      expect(export.cardCount, 2);
      expect(export.slabCount, 1);
      expect(export.sealedCount, 1);
      expect(export.toCsvString(), contains('"9999999999.9900000001"'));
      expect(export.toCsvString(), contains('"00123","10.00"'));
      expect(export.toCsvString(), startsWith('\uFEFF"Copy ID","Kind"'));
      expect(
        export.fileName('json'),
        'grookai-inventory-20261009050000123456.json',
      );
    },
  );
  for (final value in [
    '=SUM(A1:A9)',
    ' +1',
    '\t-2',
    '\r\n@formula',
    '\u0001=1',
  ]) {
    test('spreadsheet formula text is neutralized: ${jsonEncode(value)}', () {
      expect(InventoryExport.csvCell(value), '"\'$value"');
    });
  }
  test(
    'CSV quotes commas, quotes and line breaks without editing the source',
    () {
      expect(InventoryExport.csvCell('a,"b"\nc'), '"a,""b""\nc"');
    },
  );
}
