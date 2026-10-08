import 'dart:async';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/vault/portfolio_history_service.dart';
import 'helpers/portfolio_history_fakes.dart';

void main() {
  late PortfolioFakeGateway gateway;
  late PortfolioMemoryStore store;
  late PortfolioHistoryService service;
  var serial = 100;
  PortfolioHistoryService make({bool enabled = true}) =>
      PortfolioHistoryService(
        gateway: gateway,
        store: store,
        newId: () => portfolioTestId(serial++),
        allowNewRecordings: enabled,
      );
  setUp(() {
    gateway = PortfolioFakeGateway();
    store = PortfolioMemoryStore();
    service = make();
  });
  tearDown(() async {
    service.dispose();
    await gateway.changes.close();
  });
  test('storage failure prevents any capture', () async {
    store.failStage = true;
    await expectLater(service.begin(portfolioTestDay, null), throwsStateError);
    expect(gateway.captures, 0);
  });
  test(
    'lost committed response survives a service restart without a duplicate write',
    () async {
      gateway.loseResponse = true;
      expect(
        (await service.begin(portfolioTestDay, null)).status,
        'unconfirmed',
      );
      final pending = portfolioCopy(store.row!['pending']);
      service.dispose();
      service = make(enabled: false);
      expect((await service.recover()).status, 'captured');
      expect(store.row!['lastOutcome']['request'], pending);
      expect(store.row!['pending'], null);
      expect(gateway.captures, 1);
    },
  );
  test('missing recovery never discards the exact pending request', () async {
    gateway.loseResponse = true;
    await service.begin(portfolioTestDay, null);
    gateway.outcome = null;
    final before = portfolioCopy(store.row);
    expect((await service.recover()).status, 'unconfirmed');
    expect(store.row, before);
    expect(gateway.captures, 1);
  });
  test('entry off allows cancellation but prevents another capture', () async {
    gateway.loseResponse = true;
    await service.begin(portfolioTestDay, null);
    gateway.outcome = null;
    service.dispose();
    service = make(enabled: false);
    expect((await service.retry()).status, 'unconfirmed');
    expect(gateway.captures, 1);
    expect((await service.cancel()).status, 'cancelled');
    expect(store.row!['pending'], null);
    expect((await service.capabilities())['enabled'], false);
  });
  test(
    'failed acknowledgement storage preserves recoverable server success',
    () async {
      store.failAck = true;
      expect(
        (await service.begin(portfolioTestDay, null)).status,
        'unconfirmed',
      );
      expect(store.row!['pending'], isNotNull);
      store.failAck = false;
      expect((await service.recover()).status, 'captured');
      expect(gateway.captures, 1);
    },
  );
  test(
    'terminal failure retains the day and error without an owned point',
    () async {
      gateway.failure = 'pricing_unavailable';
      expect((await service.begin(portfolioTestDay, null)).status, 'failed');
      expect(store.row!['pending'], null);
      expect(store.row!['lastOutcome']['request']['day'], portfolioTestDay);
      expect(gateway.points, isEmpty);
    },
  );
  test(
    'owner switch during delayed recovery cannot acknowledge or display old values',
    () async {
      gateway.delayed = Completer<Object?>();
      final operation = service.begin(portfolioTestDay, null);
      await Future<void>.delayed(Duration.zero);
      gateway.switchOwner();
      gateway.delayed!.complete(null);
      await expectLater(operation, throwsStateError);
      expect(gateway.captures, 0);
      expect(store.row!['pending'], isNotNull);
      await expectLater(service.list(), throwsStateError);
    },
  );
  test('parallel writes cannot stage a second request', () async {
    gateway.delayed = Completer<Object?>();
    final first = service.begin(portfolioTestDay, null);
    await Future<void>.delayed(Duration.zero);
    await expectLater(service.begin(portfolioTestDay, null), throwsStateError);
    gateway.delayed!.complete(null);
    expect((await first).status, 'captured');
    expect(gateway.captures, 1);
  });
  test('complete empty observation exports successfully', () async {
    expect((await service.export(portfolioTestId(2)))['rows'], isEmpty);
  });
  test('complete ordered export follows all pages', () async {
    final point = portfolioTestPoint(owned: 101);
    var calls = 0;
    gateway.exportHandler = (pointId, after) async {
      calls++;
      expect(after, calls == 1 ? null : portfolioTestId(599));
      final start = calls == 1 ? 500 : 600, end = calls == 1 ? 600 : 601;
      return {
        'version': 1,
        'ownerId': gateway.ownerId,
        'point': point,
        'rows': [
          for (var n = start; n < end; n++)
            {
              'copy': {'copyId': portfolioTestId(n)},
              'evidence': {'copyId': portfolioTestId(n)},
            },
        ],
        'nextAfterCopy': calls == 1 ? portfolioTestId(599) : null,
      };
    };
    expect((await service.export(portfolioTestId(2)))['rows'], hasLength(101));
    expect(calls, 2);
  });
  for (final mode in [
    'missing',
    'wrongOwner',
    'wrongPoint',
    'badCursor',
    'duplicate',
    'ownerSwitch',
  ]) {
    test('partial export is withheld: $mode', () async {
      gateway.exportHandler = (pointId, after) async {
        if (mode == 'ownerSwitch') gateway.switchOwner();
        final row = {
          'copy': {'copyId': portfolioTestId(500)},
          'evidence': {'copyId': portfolioTestId(500)},
        };
        return {
          'version': 1,
          'ownerId': mode == 'wrongOwner'
              ? portfolioTestId(9)
              : portfolioTestId(1),
          'point': {
            ...portfolioTestPoint(owned: 2),
            if (mode == 'wrongPoint') 'snapshotId': portfolioTestId(9),
          },
          'rows': mode == 'duplicate' ? [row, row] : [row],
          'nextAfterCopy': mode == 'badCursor' ? portfolioTestId(500) : null,
        };
      };
      await expectLater(
        service.export(portfolioTestId(2)),
        throwsA(anyOf(isA<FormatException>(), isA<StateError>())),
      );
    });
  }
}
