import 'dart:async';
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
  test('Pokemon language and image namespace remain isolated from MTG', () {
    final pokemon = _row({
      'game_key': 'pokemon',
      'language_code': 'ja',
      'image_object_path': 'sealed/pokemon/sha256/aa/$_hash.jpg',
    });
    final result = MtgSealedClientV1.classifyRows(
      [pokemon],
      now: now,
      gameKey: 'pokemon',
    );
    expect(result.status, MtgSealedCatalogStatusV1.ready);
    expect(result.rows.single.languageCode, 'ja');
    expect(
      MtgSealedClientV1.classifyRows([pokemon], now: now).status,
      MtgSealedCatalogStatusV1.error,
    );
    expect(
      MtgSealedClientV1.classifyRows(
        [_row()],
        now: now,
        gameKey: 'pokemon',
      ).status,
      MtgSealedCatalogStatusV1.error,
    );
    pokemon['image_object_path'] = 'sealed/mtg/sha256/aa/$_hash.jpg';
    expect(
      MtgSealedClientV1.classifyRows(
        [pokemon],
        now: now,
        gameKey: 'pokemon',
      ).status,
      MtgSealedCatalogStatusV1.missingImage,
    );
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

  test('August 31 source prices expire September 8 without re-dating', () {
    final product = _row({'observed_on': '2026-08-31'});
    expect(
      MtgSealedClientV1.classifyRows([
        product,
      ], now: DateTime.utc(2026, 9, 7)).status,
      MtgSealedCatalogStatusV1.ready,
    );
    expect(
      MtgSealedClientV1.classifyRows([
        product,
      ], now: DateTime.utc(2026, 9, 8)).status,
      MtgSealedCatalogStatusV1.stale,
    );
    expect(product['observed_on'], '2026-08-31');
  });

  test('disabled loader performs no auth, RPC, or Storage call', () async {
    final transport = _FakeTransport();
    final state = await MtgSealedClientV1(
      transport: transport,
      enabled: false,
    ).load();
    expect(state.status, MtgSealedCatalogStatusV1.disabled);
    expect(transport.calls, 0);
  });

  test('enabled loader signs only validated self-hosted images', () async {
    final transport = _FakeTransport();
    final state = await MtgSealedClientV1(
      transport: transport,
      enabled: true,
    ).load(query: 'bundle', limit: 24);
    expect(state.status, MtgSealedCatalogStatusV1.ready);
    expect(state.rows.single.imageUrl, 'https://example.invalid');
    expect(transport.calls, 3);
  });

  test('enabled loader bounds concurrent image signing', () async {
    final rows = List<dynamic>.generate(9, (index) {
      final suffix = (index + 10).toString().padLeft(12, '0');
      return _row(<String, dynamic>{
        'variant_id': '00000000-0000-4000-8000-$suffix',
        'canonical_name': 'Fixture Product ${index + 1}',
      });
    });
    final transport = _FakeTransport(rows: rows, signingDelayMs: 5);

    final state = await MtgSealedClientV1(
      transport: transport,
      enabled: true,
    ).load(limit: 24);

    expect(state.status, MtgSealedCatalogStatusV1.ready);
    expect(state.rows, hasLength(9));
    expect(
      transport.maxConcurrentSigning,
      lessThanOrEqualTo(kMtgSealedImageSigningConcurrencyV1),
    );
    expect(transport.maxConcurrentSigning, greaterThan(1));
    expect(state.rows.first.canonicalName, 'Fixture Product 1');
    expect(state.rows.last.canonicalName, 'Fixture Product 9');
  });

  test(
    'signing advances past a slow image and preserves selected order',
    () async {
      final transport = _ControlledTransport();
      final loading = MtgSealedClientV1(
        transport: transport,
        enabled: true,
      ).load();
      await Future<void>.delayed(Duration.zero);
      expect(transport.pending, hasLength(8));
      transport.pending[1].complete('https://example.invalid/1');
      await Future<void>.delayed(Duration.zero);
      expect(transport.pending, hasLength(9));
      expect(transport.pending[0].isCompleted, isFalse);
      for (var i = 0; i < transport.pending.length; i++) {
        if (!transport.pending[i].isCompleted) {
          transport.pending[i].complete('https://example.invalid/$i');
        }
      }
      final result = await loading;
      expect(result.status, MtgSealedCatalogStatusV1.ready);
      expect(
        result.rows.map((row) => row.imageUrl),
        List.generate(9, (i) => 'https://example.invalid/$i'),
      );
    },
  );

  test(
    'signer rejection stops queued work and withholds the whole page',
    () async {
      final transport = _ControlledTransport();
      final loading = MtgSealedClientV1(
        transport: transport,
        enabled: true,
      ).load();
      await Future<void>.delayed(Duration.zero);
      transport.pending[0].completeError(StateError('image_not_available'));
      await Future<void>.delayed(Duration.zero);
      for (final pending in transport.pending.skip(1)) {
        pending.complete('https://example.invalid');
      }
      final result = await loading;
      expect(transport.pending, hasLength(8));
      expect(result.status, MtgSealedCatalogStatusV1.error);
      expect(result.rows, isEmpty);
    },
  );
}

class _ControlledTransport extends _FakeTransport {
  _ControlledTransport() : super(rows: List.generate(9, (_) => _row()));
  final pending = <Completer<String>>[];

  @override
  Future<String> createSignedImageUrl({
    required String bucket,
    required String objectPath,
    required int expiresInSeconds,
  }) {
    final completion = Completer<String>();
    pending.add(completion);
    return completion.future;
  }
}

class _FakeTransport implements MtgSealedClientTransportV1 {
  _FakeTransport({List<dynamic>? rows, this.signingDelayMs = 0})
    : rows = rows ?? <dynamic>[_row()];

  int calls = 0;
  int activeSigning = 0;
  int maxConcurrentSigning = 0;
  final int signingDelayMs;
  final List<dynamic> rows;

  @override
  Future<String> createSignedImageUrl({
    required String bucket,
    required String objectPath,
    required int expiresInSeconds,
  }) async {
    calls += 1;
    activeSigning += 1;
    if (activeSigning > maxConcurrentSigning) {
      maxConcurrentSigning = activeSigning;
    }
    if (signingDelayMs > 0) {
      await Future<void>.delayed(Duration(milliseconds: signingDelayMs));
    }
    activeSigning -= 1;
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
    return rows;
  }

  @override
  Future<bool> isAuthenticated() async {
    calls += 1;
    return true;
  }
}
