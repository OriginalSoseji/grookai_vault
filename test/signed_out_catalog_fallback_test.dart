import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('signed-out Explore uses a public Pokemon fallback', () {
    final repository = File('lib/models/card_print.dart').readAsStringSync();
    final home = File('lib/main.dart').readAsStringSync();

    expect(repository, contains(".like('gv_id', 'GV-PK-%')"));
    expect(repository, contains("request.eq('name', trimmed)"));
    expect(repository, contains("source: 'public_pokemon_direct_fallback'"));
    expect(
      repository.indexOf('directResult = await _searchPublicPokemonFallback'),
      lessThan(
        repository.indexOf(
          'final resolved = await _searchCardPrintsViaWebResolver',
        ),
      ),
    );
    expect(home, contains('publicPokemonBrowse: widget.signedOutBrowse'));
    expect(home, contains('onSubmitted: _submitSearch'));
  });
}
