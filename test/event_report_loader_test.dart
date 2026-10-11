import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/sales/event_report_loader.dart';

dynamic clone(dynamic v) => jsonDecode(jsonEncode(v));

class Harness {
  Harness(Map original) : args = clone(original) as Map {
    book = {
      'revision': 1,
      'book': {
        'receipts': (args['receipts'] as List)
            .map((r) => {'receipt': r})
            .toList(),
      },
    };
    readCosts = (ids) async {
      calls.add(List.of(ids));
      return {'ownerId': args['ownerId'], 'snapshots': []};
    };
  }
  final Map args;
  late Map book;
  bool active = true;
  int bookReads = 0;
  final calls = <List<String>>[];
  late Future<Object?> Function(List<String>) readCosts;
  Future<Map<String, dynamic>> load() => loadEventReportInput(
    ownerId: args['ownerId'] as String,
    eventId: args['eventId'] as String,
    readState: (_) async => args['state'],
    readBook: () async {
      bookReads++;
      return book;
    },
    readCosts: (ids) => readCosts(ids),
    checkOwner: () {
      if (!active) throw StateError('Account changed');
    },
  );
  void resize(int n) {
    final receipts = List.generate(n, (i) {
      final r = clone(args['receipts'][0]) as Map;
      r['id'] =
          '${(i + 1).toRadixString(16).padLeft(8, '0')}-1111-4111-8111-111111111111';
      r['number'] =
          'GV-20261008-${(r['id'] as String).substring(0, 8).toUpperCase()}';
      return r;
    });
    args['state']['selected']['assignments'] = receipts
        .map(
          (r) => {
            'receiptId': r['id'],
            'eventId': args['eventId'],
            'revision': '1',
          },
        )
        .toList();
    book['book']['receipts'] = receipts.map((r) => {'receipt': r}).toList();
  }
}

void main() {
  final original =
      (jsonDecode(File('test/fixtures/event_report_v1.json').readAsStringSync())
              as Map)['cases'][0]['args']
          as Map;
  late Harness x;
  setUp(() => x = Harness(original));
  test(
    'bounded cost batches remain complete when event entry is off',
    () async {
      x.resize(201);
      x.args['state']['entryEnabled'] = false;
      final loaded = await x.load();
      expect(x.calls.map((c) => c.length), [100, 100, 1]);
      expect((loaded['receipts'] as List).length, 201);
      expect(loaded['snapshots'], isEmpty);
    },
  );
  test('failed cost batch cannot become missing historical evidence', () async {
    x.resize(101);
    var calls = 0;
    x.readCosts = (_) async {
      if (++calls == 2) throw StateError('Network');
      return {'ownerId': x.args['ownerId'], 'snapshots': []};
    };
    await expectLater(x.load(), throwsStateError);
    expect(calls, 2);
  });
  test('cloud-off never reads book or costs', () async {
    x.args['state']['entryEnabled'] = false;
    x.args['state']['receiptAccess'] = false;
    x.args['state']['selected']['bookRevision'] = null;
    x.args['state']['selected']['candidates'] = null;
    await expectLater(x.load(), throwsStateError);
    expect(x.bookReads, 0);
    expect(x.calls, isEmpty);
  });
  for (final revision in [2, 9007199254740992, '1']) {
    test('receipt revision mismatch or unsafe revision $revision', () async {
      x.book['revision'] = revision;
      await expectLater(x.load(), throwsFormatException);
      expect(x.calls, isEmpty);
    });
  }
  for (final kind in ['foreign owner', 'foreign receipt', 'duplicates']) {
    test('cost batch refuses $kind', () async {
      final snapshot = x.args['snapshots'][0] as Map;
      x.readCosts = (_) async => {
        'ownerId': kind == 'foreign owner'
            ? snapshot['receiptId']
            : x.args['ownerId'],
        'snapshots': kind == 'foreign receipt'
            ? [
                {
                  ...snapshot,
                  'receiptId': 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
                },
              ]
            : kind == 'duplicates'
            ? [snapshot, snapshot]
            : [snapshot],
      };
      await expectLater(x.load(), throwsFormatException);
    });
  }
  test('account change during cost read invalidates whole report', () async {
    x.readCosts = (_) async {
      x.active = false;
      return {'ownerId': x.args['ownerId'], 'snapshots': []};
    };
    await expectLater(x.load(), throwsStateError);
  });
  test(
    'transport-owned maps cannot mutate data during another batch',
    () async {
      final before = clone(x.book['book']['receipts']) as List;
      x.readCosts = (_) async {
        x.book['revision'] = 2;
        x.book['book']['receipts'][0]['receipt']['note'] = 'Changed';
        x.args['state']['events'][0]['name'] = 'Changed';
        return {'ownerId': x.args['ownerId'], 'snapshots': []};
      };
      final loaded = await x.load();
      expect(loaded['bookRevision'], '1');
      expect(loaded['receipts'], before.map((r) => r['receipt']).toList());
      expect(loaded['state']['events'][0]['name'], 'Card show');
    },
  );
}
