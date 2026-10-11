import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/sales/sale_cost_corrections.dart';
import 'package:grookai_vault/services/sales/sales_profit.dart';

void main() {
  final fixtures =
      jsonDecode(
            File(
              'test/fixtures/sale_cost_corrections_v1.json',
            ).readAsStringSync(),
          )
          as Map;
  final owner = fixtures['ownerId'] as String;
  for (final r in fixtures['requests'] as List) {
    test('correction request: ${r['name']}', () {
      final before = jsonEncode(r);
      if (r['valid'] == true) {
        expect(validateSaleCostCorrectionRequest(r['request']), r['request']);
      } else {
        expect(
          () => validateSaleCostCorrectionRequest(r['request']),
          throwsA(isA<FormatException>()),
        );
      }
      expect(jsonEncode(r), before);
    });
  }
  for (final f in fixtures['profits'] as List) {
    test('corrected profit: ${f['name']}', () {
      final before = jsonEncode(f),
          snapshots = f['snapshot'] == null ? <dynamic>[] : [f['snapshot']];
      final original = salesProfit([f['receipt']], snapshots);
      final report = salesProfitCorrected(
        [f['receipt']],
        snapshots,
        [f['state']],
        owner,
      );
      for (final e in (f['want'] as Map).entries) {
        expect(report[e.key], e.value, reason: e.key as String);
      }
      expect(report['basis'], 'owner_corrected');
      expect(
        (report['reasons'] as List).map((r) => r['reason']).toList(),
        f['reasons'],
      );
      expect(
        BigInt.parse(report['knownSalesMinor'] as String) +
            BigInt.parse(report['unknownSalesMinor'] as String),
        BigInt.parse(report['itemSalesMinor'] as String),
      );
      expect(salesProfit([f['receipt']], snapshots), original);
      expect(jsonEncode(f), before);
    });
  }
  test('exact terminal acknowledgement and private owner isolation', () {
    final f = fixtures['profits'][0],
        outcome = f['outcome'] as Map,
        request = outcome['request'];
    expect(confirmedSaleCostCorrection(request, outcome, owner), outcome);
    expect(
      () => confirmedSaleCostCorrection(request, {
        ...outcome,
        'revision': '2',
      }, owner),
      throwsFormatException,
    );
    expect(
      () => confirmedSaleCostCorrection(
        request,
        outcome,
        'd1000000-0000-4000-8000-000000000002',
      ),
      throwsFormatException,
    );
    expect(
      () => confirmedSaleCostCorrection(request, null, owner),
      throwsFormatException,
    );
    final cancel = {
      ...outcome,
      'status': 'cancelled',
      'revision': null,
      'source': null,
    };
    expect(confirmedSaleCostCorrection(request, cancel, owner), cancel);
    expect(
      () => validateSaleCostCorrectionStates([], owner, [f['receipt']['id']]),
      throwsFormatException,
    );
    expect(
      () => validateSaleCostCorrectionStates(
        [f['state'], f['state']],
        owner,
        [f['receipt']['id']],
      ),
      throwsFormatException,
    );
    expect(
      () => validateSaleCostCorrectionHistory(
        [outcome, outcome],
        owner,
        f['receipt']['id'] as String,
        1,
      ),
      throwsFormatException,
    );
  });
}
