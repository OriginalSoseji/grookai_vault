import 'dart:async';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/sales/sales_profit_service.dart';

const owner = '11111111-1111-4111-8111-111111111111';
String receipt(int n) =>
    '22222222-2222-4222-8222-${n.toString().padLeft(12, '0')}';

class Gateway implements SalesProfitGateway {
  @override
  String? ownerId = owner;
  final changes = StreamController<String?>.broadcast(sync: true);
  final calls = <List<String>>[];
  Future<Object?> Function(List<String>)? response;
  @override
  Stream<String?> get ownerChanges => changes.stream;
  @override
  Future<Object?> read(List<String> ids) async {
    calls.add(ids);
    return response != null
        ? response!(ids)
        : {
            'ownerId': ownerId,
            'snapshots': [
              for (final id in ids) {'receiptId': id},
            ],
          };
  }

  void switchOwner(String? id) {
    ownerId = id;
    changes.add(id);
  }
}

void main() {
  late Gateway gateway;
  late SalesProfitService service;
  setUp(() {
    gateway = Gateway();
    service = SalesProfitService(gateway: gateway);
  });
  tearDown(() async {
    await service.dispose();
    await gateway.changes.close();
  });
  test('reads all requested history in bounded batches', () async {
    final ids = List.generate(201, receipt);
    final result = await service.read(ids);
    expect(gateway.calls.map((e) => e.length), [100, 100, 1]);
    expect(result.map((e) => e['receiptId']), ids);
    expect(() => result.clear(), throwsUnsupportedError);
  });
  test('failed later batch never publishes partial history', () async {
    gateway.response = (ids) async {
      if (gateway.calls.length == 2) {
        throw TimeoutException('private provider detail');
      }
      return {
        'ownerId': owner,
        'snapshots': [
          {'receiptId': ids.first},
        ],
      };
    };
    await expectLater(
      service.read(List.generate(101, receipt)),
      throwsA(isA<SalesProfitUnavailable>()),
    );
    expect(gateway.calls.length, 2);
  });
  test('empty successful report needs no RPC', () async {
    expect(await service.read([]), isEmpty);
    expect(gateway.calls, isEmpty);
  });
  test(
    'a superseded report stops before dispatching remaining batches',
    () async {
      var current = true;
      gateway.response = (ids) async {
        current = false;
        return {
          'ownerId': owner,
          'snapshots': [
            {'receiptId': ids.first},
          ],
        };
      };
      await expectLater(
        service.read(List.generate(201, receipt), isCurrent: () => current),
        throwsA(isA<SalesProfitUnavailable>()),
      );
      expect(gateway.calls.length, 1);
    },
  );
  test('invalid, duplicate and excessive IDs reject before dispatch', () async {
    for (final ids in [
      ['invalid'],
      [receipt(1), receipt(1)],
      List.generate(10001, receipt),
    ]) {
      await expectLater(
        service.read(ids),
        throwsA(isA<SalesProfitUnavailable>()),
      );
    }
    expect(gateway.calls, isEmpty);
  });
  for (final kind in [
    'wrong owner',
    'unrequested receipt',
    'duplicate snapshot',
    'malformed response',
  ]) {
    test('$kind cannot become a complete successful read', () async {
      gateway.response = (ids) async => switch (kind) {
        'wrong owner' => {'ownerId': receipt(9), 'snapshots': []},
        'unrequested receipt' => {
          'ownerId': owner,
          'snapshots': [
            {'receiptId': receipt(9)},
          ],
        },
        'duplicate snapshot' => {
          'ownerId': owner,
          'snapshots': [
            {'receiptId': ids.first},
            {'receiptId': ids.first},
          ],
        },
        _ => {'ownerId': owner, 'snapshots': null},
      };
      await expectLater(
        service.read([receipt(1), receipt(2)]),
        throwsA(isA<SalesProfitUnavailable>()),
      );
    });
  }
  test('late response after account change is discarded permanently', () async {
    final pending = Completer<Object?>();
    gateway.response = (_) => pending.future;
    final read = service.read([receipt(1)]);
    final rejected = expectLater(read, throwsA(isA<SalesProfitUnavailable>()));
    gateway.switchOwner(null);
    gateway.switchOwner(owner);
    pending.complete({
      'ownerId': owner,
      'snapshots': [
        {'receiptId': receipt(1)},
      ],
    });
    await rejected;
    await expectLater(service.read([]), throwsA(isA<SalesProfitUnavailable>()));
    expect(gateway.calls.length, 1);
  });
  test(
    'observed account mismatch invalidates even without a stream event',
    () async {
      gateway.ownerId = receipt(9);
      expect(service.isValid, isFalse);
      gateway.ownerId = owner;
      await expectLater(
        service.read([]),
        throwsA(isA<SalesProfitUnavailable>()),
      );
    },
  );
  test('disposal discards a pending read', () async {
    final pending = Completer<Object?>();
    gateway.response = (_) => pending.future;
    final read = service.read([receipt(1)]);
    final rejected = expectLater(read, throwsA(isA<SalesProfitUnavailable>()));
    await service.dispose();
    pending.complete({'ownerId': owner, 'snapshots': []});
    await rejected;
  });
}
