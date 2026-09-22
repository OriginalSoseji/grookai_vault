import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test(
    'signed-out Explore limits direct Pokemon reads to unfiltered browse',
    () {
      final repository = File('lib/models/card_print.dart').readAsStringSync();
      final home = File('lib/main.dart').readAsStringSync();

      expect(repository, contains(".like('gv_id', 'GV-PK-%')"));
      expect(repository, contains("request.eq('name', trimmed)"));
      expect(repository, contains("source: 'public_pokemon_direct_fallback'"));
      expect(
        repository,
        matches(
          RegExp(
            r"if \(publicPokemonBrowse &&\s*gameScope == 'pokemon' &&\s*"
            r'trimmed.isEmpty &&\s*options.searchParameters.isEmpty &&\s*'
            r'identityFilter == null\) \{\s*return _searchPublicPokemonFallback',
          ),
        ),
      );
      expect(home, contains('publicPokemonBrowse: widget.signedOutBrowse'));
      expect(home, contains('onSubmitted: _submitSearch'));
    },
  );
}
