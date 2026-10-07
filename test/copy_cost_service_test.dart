import 'dart:async';
import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/services/vault/copy_cost_models.dart';
import 'package:grookai_vault/services/vault/copy_cost_journal.dart';
import 'package:grookai_vault/services/vault/copy_cost_service.dart';

import 'support/copy_cost_fakes.dart';

void main() {
  late List<String> events;
  late MemoryCostStore store;
  late FakeCostGateway gateway;
  late CopyCostService service;
  late int ids;
  CopyCostDraft draft() => CopyCostDraft.create(
    ownerId: owner,
    instanceId: instance,
    gvviId: 'GVVI-TEST',
    title: 'Sample copy',
    cost: unknown,
  ).withValues({'amountText': '12', 'currencyText': 'USD'});
  setUp(() {
    events = [];
    store = MemoryCostStore(events);
    gateway = FakeCostGateway(events);
    ids = 0;
    service = CopyCostService(
      gateway: gateway,
      store: store,
      newRequestId: () {
        ids++;
        return ids == 1 ? requestId : other;
      },
    );
  });
  tearDown(() async {
    service.dispose();
    await gateway.changes.close();
  });

  test('journal commits before dispatch, then confirms exact result', () async {
    final result = await service.beginSave(draft());
    expect(events, ['persist', 'write', 'persist']);
    expect(result.state, CopyCostAttemptState.saved);
    expect(store.value!.pending, isNull);
    expect(store.value!.expectedAmount, '12.00');
    expect(ids, 1);
  });
  test('device storage failure sends no request', () async {
    store.fail = true;
    await expectLater(service.beginSave(draft()), throwsStateError);
    expect(gateway.requests, isEmpty);
    expect(store.value, isNull);
  });
  test(
    'lost successful response recovers by read without a second write',
    () async {
      gateway.loseResponse = true;
      expect(
        (await service.beginSave(draft())).state,
        CopyCostAttemptState.unconfirmed,
      );
      expect(store.value!.pending!.requestId, requestId);
      expect(
        (await service.recover(instance))!.state,
        CopyCostAttemptState.saved,
      );
      expect(gateway.requests, hasLength(1));
      expect(store.value!.pending, isNull);
    },
  );
  test('retry preserves the entire payload and request identifier', () async {
    gateway.loseResponse = true;
    await service.beginSave(draft());
    gateway.loseResponse = false;
    expect((await service.retry(instance)).state, CopyCostAttemptState.saved);
    expect(jsonEncode(gateway.requests[0]), jsonEncode(gateway.requests[1]));
    expect(ids, 1);
  });
  test(
    'failed current read cannot strand a recoverable saved request',
    () async {
      gateway.loseResponse = true;
      await service.beginSave(draft());
      gateway.failRead = true;
      final loaded = await service.open(
        instanceId: instance,
        gvviId: 'GVVI-TEST',
        title: 'Sample copy',
      );
      expect(loaded.current, isNull);
      expect(loaded.readError, isNotNull);
      expect(loaded.draft!.pending, isNotNull);
      expect(
        (await service.recover(instance))!.state,
        CopyCostAttemptState.saved,
      );
    },
  );
  test('a result for another owner remains unconfirmed', () async {
    gateway.wrongResult = true;
    expect(
      (await service.beginSave(draft())).state,
      CopyCostAttemptState.unconfirmed,
    );
    expect(store.value!.pending, isNotNull);
  });
  test(
    'account change rejects late confirmation and stays closed on return',
    () async {
      gateway.hold = Completer<void>();
      final pending = service.beginSave(draft());
      await Future<void>.delayed(Duration.zero);
      gateway.ownerId = other;
      gateway.changes.add(other);
      gateway.hold!.complete();
      await expectLater(pending, throwsStateError);
      expect(store.value!.pending, isNotNull);
      gateway.ownerId = owner;
      gateway.changes.add(owner);
      expect(service.checkOwner, throwsStateError);
    },
  );
  test(
    'definitive conflict retains proposal and requires explicit review',
    () async {
      gateway.error = const PostgrestException(
        message: 'Cost changed; review the current value',
        code: 'PT409',
      );
      final result = await service.beginSave(draft());
      expect(result.state, CopyCostAttemptState.rejected);
      expect(result.draft.amountText, '12');
      expect(result.draft.pending, isNull);
      expect(result.draft.needsReview, isTrue);
      await expectLater(service.beginSave(result.draft), throwsStateError);
      gateway.error = null;
      gateway.cost = const CopyCostEvidence(
        amount: '17.00',
        currency: 'USD',
        minor: '1700',
        status: 'known',
      );
      final reviewed = await service.reviewCurrent(result.draft);
      expect(reviewed.amountText, '12');
      expect(reviewed.expectedAmount, '17.00');
      expect(reviewed.needsReview, isFalse);
      await service.beginSave(reviewed);
      expect(gateway.requests.last['requestId'], other);
    },
  );
  for (final error in [
    const PostgrestException(message: 'Permission denied', code: '42501'),
    const PostgrestException(message: 'Cost request changed', code: '22023'),
    const PostgrestException(message: 'Invalid cost request', code: '22023'),
  ]) {
    test('${error.message} does not clear an unresolved request', () async {
      gateway.error = error;
      expect(
        (await service.beginSave(draft())).state,
        CopyCostAttemptState.unconfirmed,
      );
      expect(store.value!.pending, isNotNull);
    });
  }
  test('failed recovery read preserves pending identity', () async {
    gateway.loseResponse = true;
    await service.beginSave(draft());
    gateway.failRecovery = true;
    expect(
      (await service.recover(instance))!.state,
      CopyCostAttemptState.unconfirmed,
    );
    expect(store.value!.pending!.requestId, requestId);
  });
  test(
    'failed acknowledgment remains recoverable without another write',
    () async {
      gateway.afterWrite = () {
        store.fail = true;
      };
      expect(
        (await service.beginSave(draft())).state,
        CopyCostAttemptState.unconfirmed,
      );
      expect(store.value!.pending, isNotNull);
      store.fail = false;
      expect(
        (await service.recover(instance))!.state,
        CopyCostAttemptState.saved,
      );
      expect(gateway.requests, hasLength(1));
    },
  );
  test('acknowledgment preserves a newer accepted proposal', () async {
    gateway.afterWrite = () {
      store.value = store.value!.withValues({
        'amountText': '13',
        'revision': store.value!.revision + 1,
      });
    };
    final result = await service.beginSave(draft());
    expect(result.state, CopyCostAttemptState.saved);
    expect(result.draft.amountText, '13');
    expect(result.draft.expectedAmount, '12.00');
  });
  test(
    'failed acknowledgment during recovery keeps the request recoverable',
    () async {
      gateway.loseResponse = true;
      await service.beginSave(draft());
      store.fail = true;
      expect(
        (await service.recover(instance))!.state,
        CopyCostAttemptState.unconfirmed,
      );
      expect(store.value!.pending!.requestId, requestId);
      store.fail = false;
      expect(
        (await service.recover(instance))!.state,
        CopyCostAttemptState.saved,
      );
      expect(gateway.requests, hasLength(1));
    },
  );
  test(
    'pending edits cannot be replaced and stale editors cannot write',
    () async {
      gateway.loseResponse = true;
      await service.beginSave(draft());
      await expectLater(
        service.edit(store.value!, '55', 'USD'),
        throwsStateError,
      );
      await expectLater(service.beginSave(draft()), throwsStateError);
      expect(gateway.requests, hasLength(1));
    },
  );
  test(
    'a failed initial read is unavailable, not a zero or unknown cost',
    () async {
      gateway.failRead = true;
      final loaded = await service.open(
        instanceId: instance,
        gvviId: 'GVVI-TEST',
        title: 'Sample copy',
      );
      expect(loaded.current, isNull);
      expect(loaded.draft, isNull);
      expect(loaded.readError, isNotNull);
    },
  );
}
