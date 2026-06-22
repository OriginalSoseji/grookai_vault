import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

String _read(String path) => File(path).readAsStringSync();

void main() {
  test('Search resolves catalog rows from live resolver and Supabase fallback', () {
    final source = _read('lib/models/card_print.dart');

    expect(source, contains("resolve('/api/resolver/search')"));
    expect(source, contains("client.rpc(\n          'search_card_prints_v1'"));
    expect(source, contains("from('card_prints')"));
    expect(source, isNot(contains('rootBundle.loadString')));
  });

  test('Dex uses live Supabase views and vault ownership counts', () {
    final source = _read('lib/services/grookai_dex/grookai_dex_service.dart');

    expect(source, contains("from('v_grookai_dex_species_v1')"));
    expect(source, contains("from('v_grookai_dex_card_prints_v1')"));
    expect(source, contains('VaultCardService.getOwnedCountsByCardPrintIds'));
    expect(source, isNot(contains('rootBundle.loadString')));
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

  test('Variant origin copy is metadata only and cannot gate card existence', () {
    final searchSource = _read('lib/models/card_print.dart');
    final dexSource = _read('lib/services/grookai_dex/grookai_dex_service.dart');
    final vaultSource = _read('lib/services/vault/vault_card_service.dart');
    final detailSource = _read('lib/card_detail_screen.dart');

    expect(searchSource, isNot(contains('variant_origin_public_copy_generated')));
    expect(dexSource, isNot(contains('variant_origin_public_copy_generated')));
    expect(vaultSource, isNot(contains('variant_origin_public_copy_generated')));
    expect(detailSource, contains('getVariantOriginPublicCopy'));
  });
}
