import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:shared_preferences_platform_interface/shared_preferences_platform_interface.dart';
import 'package:grookai_vault/services/sales/sales_cart_service.dart';
import 'package:grookai_vault/services/sales/offer_policies.dart';
import 'sales_purchase_service_test.dart'
    show PurchaseHarness, UnreliablePreferences, ownerId;

const id = '11111111-1111-4111-8111-111111111111';
const key = 'grookai.offer-presets.v1.$ownerId';
const defaults = {'cash': id, 'trade': null};
Map<String, dynamic> policy() => {
  'id': id,
  'name': 'Standard',
  'intent': 'cash',
  'rateBps': 6500,
  'source': 'manual',
  'conditionBasis': 'selected',
  'rounding': {'incrementMinor': 1, 'mode': 'nearest'},
  'lowValueTier': null,
};
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  late PurchaseHarness h;
  setUp(() {
    SharedPreferences.setMockInitialValues({});
    h = PurchaseHarness();
  });
  tearDown(() => h.client.dispose());
  test(
    'legacy read preserves bytes; explicit save upgrades and older reader refuses',
    () async {
      await h.open();
      final prefs = await SharedPreferences.getInstance();
      final raw = jsonEncode({
        'version': 1,
        'revision': 9,
        'presets': [
          {'id': id, 'name': 'Old', 'rateBps': 6000},
        ],
      });
      await prefs.setString(key, raw);
      final book = await h.service.loadOfferPolicies();
      expect(prefs.getString(key), raw);
      expect(book['defaults']['cash'], isNull);
      final saved = await h.service.saveOfferPolicies(
        9,
        (book['presets'] as List).cast<Map<String, dynamic>>(),
        defaults,
      );
      expect(saved['version'], 2);
      expect(saved['revision'], 10);
      expect(saved['defaults']['cash'], id);
      await expectLater(h.service.loadOfferPresets(), throwsFormatException);
    },
  );
  for (final oldFirst in [true, false]) {
    test(
      'legacy/policy writes serialize in order oldFirst=$oldFirst',
      () async {
        await h.open();
        final second = SalesCartService(client: h.client);
        await second.load();
        Future<Map<String, dynamic>> legacy() => h.service.saveOfferPresets(0, [
          {'id': id, 'name': 'Old', 'rateBps': 5000},
        ]);
        Future<Map<String, dynamic>> rich() =>
            second.saveOfferPolicies(0, [policy()], defaults);
        final results = await Future.wait(
          (oldFirst ? [legacy(), rich()] : [rich(), legacy()]).map(
            (work) => work.then<Object>(
              (value) => value,
              onError: (Object error) => error,
            ),
          ),
        );
        expect(results[0], isA<Map>());
        expect(results[1], isNot(isA<Map>()));
        expect(
          (await h.service.loadOfferPolicies())['presets'][0]['rateBps'],
          oldFirst ? 5000 : 6500,
        );
      },
    );
  }
  test('two policy screens cannot replace a newer selection', () async {
    await h.open();
    final second = SalesCartService(client: h.client);
    await second.load();
    await h.service.saveOfferPolicies(0, [policy()], defaults);
    await expectLater(
      second.saveOfferPolicies(0, [], {'cash': null, 'trade': null}),
      throwsStateError,
    );
    final book = await second.loadOfferPolicies();
    final removed = removeOfferPolicy(book, id);
    await second.saveOfferPolicies(
      1,
      (removed['presets'] as List).cast<Map<String, dynamic>>(),
      Map<String, dynamic>.from(removed['defaults'] as Map),
    );
    expect((await h.service.loadOfferPolicies())['defaults']['cash'], isNull);
  });
  for (final acknowledge in [false, true]) {
    test(
      'failed or false storage acknowledgement $acknowledge cannot confirm settings',
      () async {
        await h.open();
        final previous = SharedPreferencesStorePlatform.instance;
        SharedPreferencesStorePlatform.instance = UnreliablePreferences(
          acknowledge: acknowledge,
        );
        addTearDown(() => SharedPreferencesStorePlatform.instance = previous);
        await expectLater(
          h.service.saveOfferPolicies(0, [policy()], defaults),
          throwsStateError,
        );
      },
    );
  }
  test(
    'malformed saved book and unrelated deal journals remain untouched',
    () async {
      await h.open();
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(key, '{broken');
      await prefs.setString(
        'grookai.pending-sale.v1.$ownerId',
        'original pending',
      );
      h.calls.clear();
      await expectLater(
        h.service.saveOfferPolicies(0, [policy()], defaults),
        throwsFormatException,
      );
      expect(prefs.getString(key), '{broken');
      expect(
        prefs.getString('grookai.pending-sale.v1.$ownerId'),
        'original pending',
      );
      expect(h.calls, isEmpty);
    },
  );
  test(
    'account change rejects queued save and does not expose original policies',
    () async {
      await h.open();
      await h.service.saveOfferPolicies(0, [policy()], defaults);
      h.owner = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
      await h.signIn();
      await expectLater(h.service.loadOfferPolicies(), throwsStateError);
      await expectLater(
        h.service.saveOfferPolicies(1, [], {'cash': null, 'trade': null}),
        throwsStateError,
      );
      final second = SalesCartService(client: h.client);
      await second.load();
      expect((await second.loadOfferPolicies())['presets'], isEmpty);
    },
  );
}
