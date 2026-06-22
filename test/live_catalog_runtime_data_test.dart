import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

String _read(String path) => File(path).readAsStringSync();

void main() {
  test(
    'Search resolves catalog rows from live resolver and Supabase fallback',
    () {
      final source = _read('lib/models/card_print.dart');

      expect(source, contains("resolve('/api/resolver/search')"));
      expect(
        source,
        contains("client.rpc(\n          'search_card_prints_v1'"),
      );
      expect(source, contains("from('card_prints')"));
      expect(source, isNot(contains('rootBundle.loadString')));
    },
  );

  test('Dex uses live Supabase views and vault ownership counts', () {
    final source = _read('lib/services/grookai_dex/grookai_dex_service.dart');

    expect(source, contains("from('v_grookai_dex_species_v1')"));
    expect(source, contains("from('v_grookai_dex_card_prints_v1')"));
    expect(source, contains("from('card_prints')"));
    expect(
      source,
      contains('image_url,representative_image_url,image_status,image_note'),
    );
    expect(source, contains('imageStatus: _optional'));
    expect(source, contains('imageNote: _optional'));
    expect(source, contains('VaultCardService.getOwnedCountsByCardPrintIds'));
    expect(source, isNot(contains('rootBundle.loadString')));
  });

  test('Dex card tiles render explicit image honesty badges', () {
    final source = _read('lib/screens/dex/grookai_dex_species_screen.dart');

    expect(source, contains('resolveImagePresentationFromFields'));
    expect(
      source,
      contains('imageTruthLabel: imagePresentation.compactBadgeLabel'),
    );
    expect(
      source,
      contains('imageTruthStrong: imagePresentation.isCollisionRepresentative'),
    );
  });

  test('Dex falls back to child and canonical alias images for image gaps', () {
    final source = _read('lib/services/grookai_dex/grookai_dex_service.dart');

    expect(source, contains('_fetchChildImageMetadata'));
    expect(
      source,
      contains(
        'printing_gv_id,finish_key,image_path,image_url,image_alt_url,image_status,image_note',
      ),
    );
    expect(source, contains('_resolvePublicMediaUrl'));
    expect(source, contains('_buildAliasImageFallbacks'));
    expect(source, contains('trainer-kit-latias'));
    expect(source, contains('mcdonalds-2021'));
    expect(source, contains('_isKnownBrokenImageUrl'));
    expect(source, contains('_sourceBackedImageFallback'));
    expect(source, contains('TorchicCreatorContest3.png'));
    expect(source, contains('images.pokemontcg.io/mcd21'));
    expect(source, contains('assets.tcgdex.net/en/tk/'));
  });

  test('Dex blocks known mismatched Legendary Treasures RC5 child image', () {
    final source = _read('lib/services/grookai_dex/grookai_dex_service.dart');

    expect(source, contains('_isKnownWrongLegendaryTreasuresRc5ChildImage'));
    expect(source, contains('efa15a49-a1f9-46b0-bd69-85111388328e'));
    expect(source, contains('gv-pk-ltr-rc5-'));
    expect(source, contains('00484a4e28a235d9f4a8edcc'));
    expect(source, contains('images.pokemontcg.io/bw11/5_hires.png'));
  });

  test('Vault uses live RPC rows instead of a bundled collection snapshot', () {
    final source = _read('lib/services/vault/vault_card_service.dart');

    expect(source, contains("client.rpc('vault_mobile_collector_rows_v1')"));
    expect(source, contains("client.rpc(\n      'vault_owned_counts_v1'"));
    expect(source, isNot(contains('rootBundle.loadString')));
  });

  test('Card detail reads canonical parent and child rows at runtime', () {
    final source = _read('lib/card_detail_screen.dart');

    expect(source, contains("from('card_prints')"));
    expect(source, contains("from('card_printings')"));
    expect(source, contains("from('v_card_pricing_ui_v1')"));
    expect(source, isNot(contains('rootBundle.loadString')));
  });

  test(
    'Variant origin copy is metadata only and cannot gate card existence',
    () {
      final searchSource = _read('lib/models/card_print.dart');
      final dexSource = _read(
        'lib/services/grookai_dex/grookai_dex_service.dart',
      );
      final vaultSource = _read('lib/services/vault/vault_card_service.dart');
      final detailSource = _read('lib/card_detail_screen.dart');

      expect(
        searchSource,
        isNot(contains('variant_origin_public_copy_generated')),
      );
      expect(
        dexSource,
        isNot(contains('variant_origin_public_copy_generated')),
      );
      expect(
        vaultSource,
        isNot(contains('variant_origin_public_copy_generated')),
      );
      expect(detailSource, contains('getVariantOriginPublicCopy'));
    },
  );
}
