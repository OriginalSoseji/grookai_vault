import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/sealed/mtg_sealed_client_v1.dart';

const _hash =
    'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

Map<String, dynamic> _row([Map<String, dynamic> overrides = const {}]) {
  return <String, dynamic>{
    'price_release_id': '00000000-0000-4000-8000-000000000001',
    'image_release_id': '00000000-0000-4000-8000-000000000002',
    'family_id': '00000000-0000-4000-8000-000000000003',
    'variant_id': '00000000-0000-4000-8000-000000000004',
    'game_key': 'mtg',
    'canonical_name': 'Fixture Booster Box',
    'package_form': 'box',
    'language_code': 'en',
    'region_code': 'US',
    'source_provider': 'tcgplayer',
    'observed_on': '2026-09-03',
    'currency': 'USD',
    'market_price': '125.50',
    'image_storage_bucket': 'user-card-images',
    'image_object_path': 'sealed/mtg/sha256/aa/$_hash.jpg',
    'image_content_sha256': _hash,
    'image_mime': 'image/jpeg',
    'image_width': 600,
    'image_height': 1000,
    'image_bytes': 12000,
    ...overrides,
  };
}

void main() {
  final now = DateTime.utc(2026, 9, 4, 12);

  test('valid exact self-hosted rows classify as ready', () {
    final state = MtgSealedClientV1.classifyRows(<dynamic>[_row()], now: now);
    expect(state.status, MtgSealedCatalogStatusV1.ready);
    expect(state.rows.single.marketPrice, 125.5);
    expect(state.rows.single.imageUrl, isNull);
  });

  test('stale, future, and missing image evidence is withheld', () {
    expect(
      MtgSealedClientV1.classifyRows(<dynamic>[
        _row(<String, dynamic>{'observed_on': '2026-08-20'}),
      ], now: now).status,
      MtgSealedCatalogStatusV1.stale,
    );
    expect(
      MtgSealedClientV1.classifyRows(<dynamic>[
        _row(<String, dynamic>{'observed_on': '2026-09-05'}),
      ], now: now).status,
      MtgSealedCatalogStatusV1.stale,
    );
    expect(
      MtgSealedClientV1.classifyRows(<dynamic>[
        _row(<String, dynamic>{
          'image_content_sha256': List<String>.filled(64, 'b').join(),
        }),
      ], now: now).status,
      MtgSealedCatalogStatusV1.missingImage,
    );
    expect(
      MtgSealedClientV1.classifyRows(<dynamic>[
        _row(<String, dynamic>{
          'image_object_path': 'sealed/mtg/sha256/bb/$_hash.jpg',
        }),
      ], now: now).status,
      MtgSealedCatalogStatusV1.missingImage,
    );
    expect(
      MtgSealedClientV1.classifyRows(<dynamic>[
        _row(<String, dynamic>{'image_mime': 'image/png'}),
      ], now: now).status,
      MtgSealedCatalogStatusV1.missingImage,
    );
  });

  test('external image authority and wrong game fail closed', () {
    expect(
      MtgSealedClientV1.classifyRows(<dynamic>[
        _row(<String, dynamic>{
          'selected_source_url': 'https://example.invalid/image.jpg',
        }),
      ], now: now).status,
      MtgSealedCatalogStatusV1.error,
    );
    expect(
      MtgSealedClientV1.classifyRows(<dynamic>[
        _row(<String, dynamic>{'game_key': 'pokemon'}),
      ], now: now).status,
      MtgSealedCatalogStatusV1.error,
    );
    expect(
      MtgSealedClientV1.classifyRows(<dynamic>[
        _row(<String, dynamic>{'market_price': true}),
      ], now: now).status,
      MtgSealedCatalogStatusV1.error,
    );
  });

  test('hard-disabled loader performs no auth, RPC, or Storage call', () async {
    final transport = _FakeTransport();
    final state = await MtgSealedClientV1(transport: transport).load();
    expect(state.status, MtgSealedCatalogStatusV1.disabled);
    expect(transport.calls, 0);
  });
}

class _FakeTransport implements MtgSealedClientTransportV1 {
  int calls = 0;

  @override
  Future<String> createSignedImageUrl({
    required String bucket,
    required String objectPath,
    required int expiresInSeconds,
  }) async {
    calls += 1;
    return 'https://example.invalid';
  }

  @override
  Future<dynamic> fetchRows({
    required String gameKey,
    required String? query,
    required int limit,
    required int offset,
  }) async {
    calls += 1;
    return <dynamic>[_row()];
  }

  @override
  Future<bool> isAuthenticated() async {
    calls += 1;
    return true;
  }
}
