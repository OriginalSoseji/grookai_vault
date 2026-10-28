import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:grookai_vault/services/ebay/ebay_seller_draft_store.dart';

const owner = 'ee000000-0000-4000-8000-000000000001';
const otherOwner = 'ee000000-0000-4000-8000-000000000002';
const instance = 'ee000000-0000-4000-8000-000000000003';
const draftId = 'ee000000-0000-4000-8000-000000000004';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUp(() => SharedPreferences.setMockInitialValues({}));
  test(
    'draft input and uncertain operation identity survive a new store instance',
    () async {
      const draft = EbaySellerLocalDraft(
        ownerId: owner,
        instanceId: instance,
        draftId: draftId,
        input: {'title': 'My exact copy', 'priceCents': 1250},
        revision: 7,
        pending: {
          'action': 'publish',
          'requestId': 'stable-request',
          'revision': 7,
          'reviewHash': 'frozen-review',
        },
      );
      await EbaySellerDraftStore().save(draft);
      final restored = await EbaySellerDraftStore().load(owner, instance);
      expect(restored?.input, draft.input);
      expect(restored?.draftId, draftId);
      expect(restored?.revision, 7);
      expect(restored?.pending, draft.pending);
    },
  );
  test('another account cannot load or clear the first owner draft', () async {
    final store = EbaySellerDraftStore();
    await store.save(
      const EbaySellerLocalDraft(
        ownerId: owner,
        instanceId: instance,
        draftId: draftId,
        input: {'title': 'Owner private input'},
      ),
    );
    expect(await store.load(otherOwner, instance), isNull);
    expect(
      (await store.load(owner, instance))?.input['title'],
      'Owner private input',
    );
  });
  test(
    'provider tokens and OAuth launch material cannot enter a persisted pending operation',
    () async {
      final store = EbaySellerDraftStore();
      await store.save(
        const EbaySellerLocalDraft(
          ownerId: owner,
          instanceId: instance,
          draftId: draftId,
          input: {},
          pending: {
            'action': 'publish',
            'requestId': 'request',
            'accessToken': 'private-fixture',
            'refreshToken': 'private-fixture',
            'launchUrl': 'private-fixture',
            'code': 'private-fixture',
          },
        ),
      );
      final raw = (await SharedPreferences.getInstance()).getString(
        store.key(owner, instance),
      )!;
      expect(raw, isNot(contains('private-fixture')));
      expect((jsonDecode(raw) as Map)['pending'], {
        'action': 'publish',
        'requestId': 'request',
      });
    },
  );
  test(
    'malformed stored identity is ignored without deleting the retained recovery bytes',
    () async {
      final store = EbaySellerDraftStore();
      final prefs = await SharedPreferences.getInstance();
      const raw = '{"version":1,"ownerId":"different-owner"}';
      await prefs.setString(store.key(owner, instance), raw);
      expect(await store.load(owner, instance), isNull);
      expect(prefs.getString(store.key(owner, instance)), raw);
    },
  );
}
