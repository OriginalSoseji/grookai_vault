import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/sales/sale_cost_report.dart';

void main() {
  final rows =
      jsonDecode(
            File('test/fixtures/sale_cost_report_v1.json').readAsStringSync(),
          )
          as List;
  for (final r in rows) {
    test('private CSV ${r['basis']}: ${r['name']}', () {
      final before = jsonEncode(r);
      expect(
        saleCostReportCsv(
          [r['receipt']],
          r['snapshots'] as List,
          basis: r['basis'] as String,
          states: r['states'] as List,
          ownerId: r['ownerId'] as String,
        ),
        r['csv'],
      );
      expect(jsonEncode(r), before);
    });
  }
  test('corrected export cannot silently use missing state', () {
    final r = rows.first;
    expect(
      () => saleCostReportCsv(
        [r['receipt']],
        r['snapshots'] as List,
        basis: 'owner_corrected',
        ownerId: r['ownerId'] as String,
      ),
      throwsFormatException,
    );
  });
}
