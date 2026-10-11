import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/sales/event_report.dart';
import 'package:grookai_vault/services/sales/event_report_loader.dart';

void partial(Map actual, Map expected) {
  for (final entry in expected.entries) {
    if (entry.value is Map) {
      partial(actual[entry.key] as Map, entry.value as Map);
    } else {
      expect(actual[entry.key], entry.value, reason: entry.key as String);
    }
  }
}

Map<String, dynamic> run(Map a) => eventReport(
  state: a['state'],
  ownerId: a['ownerId'] as String,
  eventId: a['eventId'] as String,
  bookRevision: a['bookRevision'] as String,
  receipts: a['receipts'] as List,
  snapshots: a['snapshots'] as List,
  query: a['query'] as String? ?? '',
  costBasis: a['costBasis'] as String,
  correctionStates: a['correctionStates'],
);
void main() {
  final cases =
      (jsonDecode(
                File(
                  'test/fixtures/event_cost_corrections_v1.json',
                ).readAsStringSync(),
              )
              as Map)['cases']
          as List;
  for (final c in cases) {
    test('corrected event: ${c['name']}', () {
      final before = jsonEncode(c['args']);
      if (c['valid'] != true) {
        expect(() => run(c['args'] as Map), throwsA(anything));
      } else {
        partial(run(c['args'] as Map), c['expected'] as Map);
      }
      expect(jsonEncode(c['args']), before);
    });
  }
  test('CSV uses selected basis on every receipt and expense', () {
    final a = Map<String, dynamic>.from(
      jsonDecode(jsonEncode(cases[1]['args'])) as Map,
    );
    final rows = eventReportCsv(run(a)).split('\r\n');
    expect(rows.length, 3);
    expect(rows.first, endsWith('"Cost basis"'));
    expect(
      rows.skip(1).every((r) => r.endsWith('"Later owner corrections"')),
      isTrue,
    );
    expect(rows[1], contains('"20.00","30.00"'));
    a['costBasis'] = 'original';
    expect(eventReportCsv(run(a)), contains('"Original cost at sale"'));
  });
  test(
    'loader validates scope and refuses partial or failed reads and account changes',
    () async {
      final a = Map<String, dynamic>.from(cases.first['args'] as Map);
      final loaded = await loadEventCostCorrections(
        input: a,
        ownerId: a['ownerId'] as String,
        eventId: a['eventId'] as String,
        checkOwner: () {},
        readCorrections: (ids) async {
          expect(ids, (a['receipts'] as List).map((r) => r['id']).toList());
          return a['correctionStates'];
        },
      );
      partial(run(loaded), cases.first['expected'] as Map);
      for (final mode in ['partial', 'failure', 'owner']) {
        var current = true;
        await expectLater(
          loadEventCostCorrections(
            input: a,
            ownerId: a['ownerId'] as String,
            eventId: a['eventId'] as String,
            checkOwner: () {
              if (!current) throw StateError('Account changed');
            },
            readCorrections: (ids) async {
              if (mode == 'failure') throw StateError('Unavailable');
              if (mode == 'owner') current = false;
              return mode == 'partial'
                  ? (a['correctionStates'] as List).take(1).toList()
                  : a['correctionStates'];
            },
          ),
          throwsA(anything),
        );
      }
    },
  );
}
