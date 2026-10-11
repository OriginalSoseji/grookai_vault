import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/sales/event_report.dart';

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
  method: a['method'] as String? ?? '',
);
void main() {
  final fixture =
      jsonDecode(File('test/fixtures/event_report_v1.json').readAsStringSync())
          as Map;
  for (final row in fixture['cases'] as List) {
    final c = row as Map;
    test('event totals: ${c['name']}', () {
      if (c['valid'] != true) {
        expect(() => run(c['args'] as Map), throwsA(anything));
        return;
      }
      final before = jsonEncode(c['args']);
      partial(run(c['args'] as Map), c['expected'] as Map);
      expect(jsonEncode(c['args']), before);
    });
  }
  test('aggregate historical costs remain exact above the Number boundary', () {
    final a = jsonDecode(jsonEncode(fixture['cases'][0]['args'])) as Map,
        first = a['receipts'][0] as Map,
        proof = a['snapshots'][0] as Map;
    final receipts = <Map>[], snapshots = <Map>[], assignments = <Map>[];
    for (var i = 1; i <= 10000; i++) {
      final id =
          '${i.toRadixString(16).padLeft(8, '0')}-1111-4111-8111-111111111111';
      final r = jsonDecode(jsonEncode(first)) as Map;
      r['id'] = id;
      r['number'] = 'GV-20261008-${id.substring(0, 8).toUpperCase()}';
      r['items'][0]['unitMinor'] = 100;
      r['items'][0]['lineMinor'] = 100;
      r['subtotalMinor'] = 100;
      r['totalMinor'] = 100;
      receipts.add(r);
      final s = jsonDecode(jsonEncode(proof)) as Map;
      s['receiptId'] = id;
      s['lines'][0]['salesMinor'] = '100';
      s['lines'][0]['cost'] = {
        'status': 'known',
        'amount': '9999999999.99',
        'minor': '999999999999',
        'currency': 'USD',
      };
      snapshots.add(s);
      assignments.add({
        'receiptId': id,
        'eventId': a['eventId'],
        'revision': '1',
      });
    }
    a['receipts'] = receipts;
    a['snapshots'] = snapshots;
    a['state']['selected']['assignments'] = assignments;
    final result = run(a);
    expect(result['profit']['knownCostMinor'], '9999999999990000');
    expect(result['knownCostEventSubtotalMinor'], '-9999999998991000');
  });
  test(
    'CSV uses visible receipt filter, active expenses and safe text cells',
    () {
      final a = jsonDecode(jsonEncode(fixture['cases'][0]['args'])) as Map;
      a['query'] = 'Card 1';
      a['state']['events'][0]['name'] = '=Event';
      a['state']['selected']['expenses'][0]['description'] = '@Booth, "fee"';
      final csv = eventReportCsv(run(a));
      expect(csv.split('\r\n').length, 3);
      expect(csv, contains(a['receipts'][0]['id']));
      expect(csv, isNot(contains(a['receipts'][1]['id'])));
      expect(csv, contains('"\'=Event"'));
      expect(csv, contains('"\'@Booth, ""fee"""'));
      expect(csv, contains('"60.00","40.00"'));
      expect(csv, contains('"10.00","booth"'));
      a['state']['selected']['expenses'][0]['voided'] = true;
      a['state']['selected']['expenses'][0]['lastReason'] = 'Duplicate';
      expect(eventReportCsv(run(a)).split('\r\n').length, 2);
    },
  );
}
