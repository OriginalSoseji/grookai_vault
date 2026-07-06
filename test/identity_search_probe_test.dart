import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/models/card_print.dart';
import 'package:grookai_vault/services/identity/display_identity.dart';
import 'package:grookai_vault/services/identity/identity_search.dart';

void main() {
  CardPrint buildCard({
    required String id,
    required String name,
    required String setCode,
    required String setName,
    required String number,
    String? variantKey,
    String? printedIdentityModifier,
    String? setIdentityModel,
  }) {
    return CardPrint(
      id: id,
      name: name,
      setCode: setCode,
      setName: setName,
      number: number,
      variantKey: variantKey,
      printedIdentityModifier: printedIdentityModifier,
      setIdentityModel: setIdentityModel,
    );
  }

  test('identity filter and display helpers stay aligned', () {
    final pikachuStamp = buildCard(
      id: 'pikachu-stamp',
      name: 'Pikachu',
      setCode: 'sv3pt5',
      setName: '151',
      number: '025',
      variantKey: 'pokemon_together_stamp',
      setIdentityModel: 'standard',
    );
    final umbreonAlt = buildCard(
      id: 'umbreon-alt',
      name: 'Umbreon VMAX',
      setCode: 'evs',
      setName: 'Evolving Skies',
      number: '215',
      variantKey: 'alt',
      setIdentityModel: 'standard',
    );
    final umbreonCc = buildCard(
      id: 'umbreon-cc',
      name: 'Umbreon ★',
      setCode: 'cel25c',
      setName: 'Celebrations',
      number: '17',
      variantKey: 'cc',
      setIdentityModel: 'reprint_anthology',
    );
    final unownA = buildCard(
      id: 'unown-a',
      name: 'Unown',
      setCode: 'uf',
      setName: 'Unseen Forces',
      number: 'A',
      variantKey: 'A',
      setIdentityModel: 'standard',
    );
    final zapdos = buildCard(
      id: 'zapdos',
      name: 'Zapdos',
      setCode: 'base1',
      setName: 'Base Set',
      number: '16',
      setIdentityModel: 'standard',
    );

    expect(
      resolveDisplayName(pikachuStamp),
      'Pikachu · Pokémon Together Stamp',
    );
    expect(
      matchesIdentityFilter(pikachuStamp, kIdentityFilterPokemonTogetherStamp),
      isTrue,
    );
    expect(getIdentitySearchTokens(pikachuStamp), contains('stamp'));

    expect(resolveDisplayName(umbreonAlt), 'Umbreon VMAX · Alternate Art');
    expect(
      matchesIdentityFilter(umbreonAlt, kIdentityFilterAlternateArt),
      isTrue,
    );
    expect(getIdentitySearchTokens(umbreonAlt), contains('alt art'));

    expect(resolveDisplayName(umbreonCc), 'Umbreon ★ · Classic Collection');
    expect(
      matchesIdentityFilter(umbreonCc, kIdentityFilterClassicCollection),
      isTrue,
    );
    expect(getIdentitySearchTokens(umbreonCc), contains('classic collection'));

    expect(getIdentitySearchTokens(unownA), contains('a'));
    expect(resolveDisplayName(zapdos), 'Zapdos');
    expect(getCardIdentityFilterKeys(zapdos), isEmpty);
  });

  test('governed finish and identity labels are displayable', () {
    expect(formatFinishLabel(finishKey: 'cosmos'), 'Cosmos Holo');
    expect(formatFinishLabel(finishKey: 'cracked_ice'), 'Cracked Ice Holo');
    expect(
      formatFinishLabel(finishKey: 'rocket_reverse'),
      'Rocket Reverse Holo',
    );
    expect(formatPrintedIdentityModifier('first_edition'), 'First Edition');
    expect(formatVariantKey('play_pokemon_stamp'), 'Play Pokémon Stamp');
  });

  test(
    'Japanese printed names use English primary display with printed name secondary',
    () {
      final pikachu = CardPrint.fromJson(<String, dynamic>{
        'id': 'jpn-pikachu',
        'gv_id': 'GV-PK-JPN-SV8-033',
        'name': 'ピカチュウex',
        'set_code': 'jpn-sv8',
        'number': '033',
      });
      final magnemite = CardPrint.fromJson(<String, dynamic>{
        'id': 'jpn-magnemite',
        'gv_id': 'GV-PK-JPN-BW7-023',
        'name': 'コイル',
        'set_code': 'jpn-bw7',
        'number': '023',
      });

      final pikachuIdentity = resolveCardPrintDisplayIdentity(pikachu);
      final magnemiteIdentity = resolveCardPrintDisplayIdentity(magnemite);

      expect(pikachuIdentity.displayName, 'Pikachu ex');
      expect(pikachuIdentity.printedName, 'ピカチュウex');
      expect(resolveDisplayName(pikachu), 'Pikachu ex');
      expect(magnemiteIdentity.displayName, 'Magnemite');
      expect(magnemiteIdentity.printedName, 'コイル');
    },
  );

  test('child printing search contract displays selected finish context', () {
    final espurrReverse = CardPrint.fromJson(<String, dynamic>{
      'id': 'card-print-me03-033',
      'gv_id': 'GV-PK-ME03-033',
      'name': 'Espurr',
      'set_code': 'me03',
      'set_name': 'Mega Evolution',
      'number': '033',
      'search_object_type': 'child_printing',
      'search_card_printing_id': 'GV-PK-ME03-033-RH',
      'printing_gv_id': 'GV-PK-ME03-033-RH',
      'selected_printing_gv_id': 'GV-PK-ME03-033-RH',
      'finish_key': 'reverse',
      'finish_label': 'Reverse Holo',
      'display_discriminator': 'Reverse Holo',
      'route_query': 'printing=GV-PK-ME03-033-RH',
    });

    expect(resolveDisplayName(espurrReverse), 'Espurr · Reverse Holo');
    expect(espurrReverse.printingGvId, 'GV-PK-ME03-033-RH');
    expect(espurrReverse.selectedPrintingGvId, 'GV-PK-ME03-033-RH');
    expect(espurrReverse.routeQuery, 'printing=GV-PK-ME03-033-RH');
  });

  test('resolver search context displays before generic identity labels', () {
    final stampedPikachu = CardPrint.fromJson(<String, dynamic>{
      'id': 'card-print-pikachu-stamp',
      'gv_id': 'GV-PK-ME03-025-POKEMON-TOGETHER-STAMP',
      'name': 'Pikachu',
      'set_code': 'me03',
      'number': '025',
      'variant_key': 'pokemon_together_stamp',
      'search_object_type': 'child_printing',
      'printing_gv_id': 'GV-PK-ME03-025-POKEMON-TOGETHER-STAMP-RH',
      'finish_key': 'reverse',
      'finish_label': 'Reverse Holo',
      'display_discriminator': 'Reverse Holo',
    });
    final cameoTrainer = CardPrint.fromJson(<String, dynamic>{
      'id': 'card-print-arcade-game',
      'gv_id': 'GV-PK-N1-83',
      'name': 'Arcade Game',
      'set_code': 'n1',
      'number': '83',
      'variant_key': 'alt',
      'search_object_type': 'parent_print',
      'display_discriminator': 'Cameo: Pikachu · picture',
    });

    expect(resolveDisplayName(stampedPikachu), 'Pikachu · Reverse Holo');
    expect(
      resolveDisplayName(cameoTrainer),
      'Arcade Game · Cameo: Pikachu · picture',
    );
  });

  test('mobile resolver search falls back to deterministic local search', () {
    final modelSource = File('lib/models/card_print.dart').readAsStringSync();
    final mainSource = File('lib/main.dart').readAsStringSync();
    final vaultSource = File('lib/main_vault.dart').readAsStringSync();

    expect(modelSource, contains('_searchCardPrintsViaWebResolver'));
    expect(modelSource, contains('_searchCardPrintsResolvedFallback'));
    expect(modelSource, contains("source: 'local_resolver_fallback'"));
    expect(modelSource, contains('search:web_resolver_failed fallback=local'));
    expect(
      RegExp(
        r'try\s*\{[\s\S]*_searchCardPrintsViaWebResolver[\s\S]*\}\s*catch',
      ).hasMatch(modelSource),
      isTrue,
    );
    expect(mainSource, contains('_formatSearchFailure(error)'));
    expect(vaultSource, contains('_formatSearchFailure(error)'));
    expect(
      mainSource,
      contains('Search is temporarily limited. Showing local results'),
    );
  });
}
