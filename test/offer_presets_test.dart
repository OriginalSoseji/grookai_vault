import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:shared_preferences_platform_interface/shared_preferences_platform_interface.dart';
import 'package:grookai_vault/services/sales/offer_presets.dart';
import 'package:grookai_vault/services/sales/sales_cart_service.dart';
import 'sales_purchase_service_test.dart'
    show PurchaseHarness, UnreliablePreferences, ownerId;

const preset = {
  'id': 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  'name': 'Standard cash',
  'rateBps': 6500,
};
const key = 'grookai.offer-presets.v1.$ownerId';
Map<String, dynamic> book(List<dynamic> presets) => {
  'version': 1,
  'revision': 0,
  'presets': presets,
};
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  late PurchaseHarness h;
  setUp(() {
    SharedPreferences.setMockInitialValues({});
    h = PurchaseHarness();
  });
  tearDown(() => h.client.dispose());
  test('no implicit defaults; normalized snapshots are immutable', () {
    expect(readOfferPresets(null), book([]));
    final source = book([
      {...preset, 'name': ' Standard cash '},
    ]);
    final value = validateOfferPresets(source);
    expect(value['presets'][0]['name'], 'Standard cash');
    expect(source['presets'][0]['name'], ' Standard cash ');
    expect(() => value['presets'][0]['rateBps'] = 100, throwsUnsupportedError);
  });
  final rejected = <String, dynamic>{
    'future': {...book([]), 'version': 2},
    'extra': {...book([]), 'market': true},
    'negative revision': {...book([]), 'revision': -1},
    'zero': book([
      {...preset, 'rateBps': 0},
    ]),
    'high rate': book([
      {...preset, 'rateBps': 10001},
    ]),
    'fractional': book([
      {...preset, 'rateBps': 1.5},
    ]),
    'duplicate': book([
      preset,
      {...preset, 'id': (preset['id'] as String).toUpperCase()},
    ]),
    'blank': book([
      {...preset, 'name': ' '},
    ]),
    'control': book([
      {...preset, 'name': 'Unsafe\nName'},
    ]),
    'extra field': book([
      {...preset, 'wallet': 100},
    ]),
    'over limit': book(
      List.generate(
        21,
        (n) => {
          ...preset,
          'id': 'cccccccc-cccc-4ccc-8ccc-${n.toString().padLeft(12, '0')}',
        },
      ),
    ),
  };
  for (final entry in rejected.entries) {
    test(
      'reject ${entry.key}',
      () => expect(
        () => readOfferPresets(jsonEncode(entry.value)),
        throwsFormatException,
      ),
    );
  }
  test(
    'two service instances reject stale edits and retain accepted value',
    () async {
      await h.open();
      final second = SalesCartService(client: h.client);
      await second.load();
      final results = await Future.wait([
        h.service
            .saveOfferPresets(0, [preset])
            .then<Object>((v) => v, onError: (Object e) => e),
        second
            .saveOfferPresets(0, [
              {...preset, 'rateBps': 7000},
            ])
            .then<Object>((v) => v, onError: (Object e) => e),
      ]);
      expect(results.whereType<Map>().length, 1);
      expect(results.whereType<StateError>().length, 1);
      expect((await second.loadOfferPresets())['presets'][0]['rateBps'], 6500);
      expect((await second.saveOfferPresets(1, []))['revision'], 2);
    },
  );
  test('malformed raw settings cannot be silently replaced', () async {
    await h.open();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(key, '{broken');
    await expectLater(h.service.loadOfferPresets(), throwsFormatException);
    await expectLater(
      h.service.saveOfferPresets(0, [preset]),
      throwsFormatException,
    );
    expect(prefs.getString(key), '{broken');
  });
  test(
    'settings writes never touch pending deals, held offers or server',
    () async {
      await h.open();
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(
        'grookai.pending-sale.v1.$ownerId',
        'retained pending',
      );
      await prefs.setString(
        'grookai.sales-drafts.v1.$ownerId',
        'retained held',
      );
      h.calls.clear();
      await h.service.saveOfferPresets(0, [preset]);
      expect(
        prefs.getString('grookai.pending-sale.v1.$ownerId'),
        'retained pending',
      );
      expect(
        prefs.getString('grookai.sales-drafts.v1.$ownerId'),
        'retained held',
      );
      expect(h.calls, isEmpty);
    },
  );
  for (final acknowledge in [true, false]) {
    test(
      'storage acknowledge $acknowledge without readback never confirms',
      () async {
        await h.open();
        final previous = SharedPreferencesStorePlatform.instance;
        SharedPreferencesStorePlatform.instance = UnreliablePreferences(
          acknowledge: acknowledge,
        );
        addTearDown(() => SharedPreferencesStorePlatform.instance = previous);
        await expectLater(
          h.service.saveOfferPresets(0, [preset]),
          throwsStateError,
        );
      },
    );
  }
  test(
    'account change closes the original service and isolates new owner',
    () async {
      await h.open();
      await h.service.saveOfferPresets(0, [preset]);
      h.owner = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
      await h.signIn();
      await expectLater(h.service.loadOfferPresets(), throwsStateError);
      await expectLater(h.service.saveOfferPresets(1, []), throwsStateError);
      final second = SalesCartService(client: h.client);
      await second.load();
      expect((await second.loadOfferPresets())['presets'], isEmpty);
    },
  );
}
