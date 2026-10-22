import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/network/network_stream_service.dart';

void main() {
  test('hero rows prefer different collectors, card families, and sets', () {
    final rows = <NetworkStreamRow>[
      _row('pika-1', 'Pikachu', 'owner-a', 'set-a', 1),
      _row('pika-2', 'Pikachu V', 'owner-a', 'set-a', 2),
      _row('pika-3', 'Pikachu ex', 'owner-b', 'set-b', 3),
      _row('zard-1', 'Charizard', 'owner-b', 'set-b', 4),
      _row('mew-1', 'Mew ex', 'owner-c', 'set-c', 5),
      _row('bulba-1', 'Bulbasaur', 'owner-d', 'set-d', 6),
    ];

    final selected = NetworkStreamService.selectDiverseHeroRowsForTesting(
      rows,
      budget: 3,
      seed: 731,
    );

    expect(selected, hasLength(3));
    expect(selected.map((row) => row.ownerUserId).toSet(), hasLength(3));
    expect(selected.map((row) => row.setCode).toSet(), hasLength(3));
    expect(
      selected.map((row) => row.name.split(' ').first).toSet(),
      hasLength(3),
    );
  });

  test('recent cards, collectors, families, and sets are demoted next', () {
    final repeated = _row('pika-1', 'Pikachu', 'owner-a', 'set-a', 1);
    final rows = <NetworkStreamRow>[
      repeated,
      _row('pika-2', 'Pikachu ex', 'owner-b', 'set-b', 2),
      _row('zard-1', 'Charizard', 'owner-a', 'set-c', 3),
      _row('mew-1', 'Mew', 'owner-c', 'set-a', 4),
      _row('bulba-1', 'Bulbasaur', 'owner-d', 'set-d', 5),
    ];

    final selected = NetworkStreamService.selectDiverseHeroRowsForTesting(
      rows,
      budget: 3,
      seed: 731,
      recentRows: <NetworkStreamRow>[repeated],
    );

    expect(selected.first.cardPrintId, 'bulba-1');
  });

  test('feed alternates its lead lane and limits collector bursts', () {
    final collectors = <NetworkStreamRow>[
      for (var index = 1; index <= 5; index += 1)
        _row(
          'collector-$index',
          'Card $index',
          'owner-$index',
          'set-$index',
          index,
        ),
    ];
    final discovery = <NetworkStreamRow>[
      _row(
        'discovery-1',
        'Discovery One',
        'catalog',
        'catalog-a',
        11,
        sourceType: NetworkStreamSourceType.dbHighEnd,
      ),
      _row(
        'discovery-2',
        'Discovery Two',
        'catalog',
        'catalog-b',
        12,
        sourceType: NetworkStreamSourceType.dbRandomExplore,
      ),
    ];

    final afterCollectorLead = NetworkStreamService.mixFeedRowsForTesting(
      collectors: collectors,
      discovery: discovery,
      previousLeadWasCollector: true,
      limit: 7,
    );
    expect(afterCollectorLead.first.isDiscoverySource, isTrue);

    final firstSession = NetworkStreamService.mixFeedRowsForTesting(
      collectors: collectors,
      discovery: discovery,
      limit: 7,
    );
    expect(firstSession.take(2).every((row) => row.isCollectorSource), isTrue);
    expect(firstSession[2].isDiscoverySource, isTrue);
  });

  test('canonical explore does not block first paint on pricing', () {
    final source = File(
      'lib/services/network/network_stream_service.dart',
    ).readAsStringSync();
    final start = source.indexOf(
      'static Future<List<NetworkStreamRow>> _fetchRandomExploreRows',
    );
    final end = source.indexOf(
      'static NetworkStreamRow? _buildDiscoveryRow',
      start,
    );
    final randomExplore = source.substring(start, end);

    expect(randomExplore, contains('NETWORK_DISCOVERY_FAST_CANONICAL_LANE_V1'));
    expect(randomExplore, isNot(contains('CardSurfacePricingService')));
    expect(randomExplore, isNot(contains('imageUrl != null')));
  });

  test('tapping the selected social feed tab refreshes its session', () {
    final source = File(
      'lib/screens/network/network_screen.dart',
    ).readAsStringSync();
    final sameSegment = source.substring(
      source.indexOf('if (_segment == segment)'),
      source.indexOf('final nextMode = switch (segment)'),
    );

    expect(sameSegment, contains('_loadPulse(reset: true)'));
    expect(sameSegment, contains('_loadRows(resetSession: true)'));
    expect(source, isNot(contains('onTap: selected ? null : onPressed')));
  });

  test('catalog game choices map to stable complete-catalog prefixes', () {
    expect(NetworkCatalogGame.all.label, 'All');
    expect(NetworkCatalogGame.pokemon.catalogPrefix, 'GV-PK-%');
    expect(NetworkCatalogGame.mtg.catalogPrefix, 'GV-MTG-%');
    expect(NetworkCatalogGame.onePiece.catalogPrefix, 'GV-OP-%');
  });

  test('For you uses cursor pagination and exposes every TCG toggle', () {
    final service = File(
      'lib/services/network/network_stream_service.dart',
    ).readAsStringSync();
    final screen = File(
      'lib/screens/network/network_screen.dart',
    ).readAsStringSync();

    expect(service, contains('CATALOG_STREAM_CURSOR_V1'));
    expect(service, contains("query.gt('gv_id', normalizedCursor)"));
    expect(service, contains(".gte('gv_id', lowerBound)"));
    expect(service, contains(".lt('gv_id', upperBound)"));
    expect(service, contains('_catalogLaneAlphabet'));
    expect(service, contains('_catalogLaneLowerBound'));
    expect(service, contains('_catalogLaneUpperBound'));
    expect(service, contains('game == NetworkCatalogGame.pokemon'));
    expect(screen, contains('NetworkFeedMode.catalog'));
    expect(screen, contains('class _CatalogGameToggle'));
    expect(screen, contains('NetworkCatalogGame.onePiece'));
  });

  test('For you mixes collector activity into complete-catalog lanes', () {
    final service = File(
      'lib/services/network/network_stream_service.dart',
    ).readAsStringSync();
    final mixedCatalog = service.substring(
      service.indexOf('static Future<NetworkStreamPage> _fetchCatalogPage'),
      service.indexOf('static Future<NetworkStreamPage> _fetchCatalogOnlyPage'),
    );

    expect(mixedCatalog, contains('_fetchCollectorCandidates('));
    expect(mixedCatalog, contains('_fetchCatalogOnlyPage('));
    expect(mixedCatalog, contains('_injectDiscoveryRows('));
    expect(mixedCatalog, contains("context: 'catalog_mixed'"));
  });

  test('catalog lead prioritizes rarity without repeating the recent lead', () {
    final shroodle = _row(
      'shroodle',
      'Shroodle',
      'catalog',
      'sv1',
      1,
      sourceType: NetworkStreamSourceType.dbRandomExplore,
      rarity: 'Illustration Rare',
      releaseDate: '2023-03-31',
    );
    final manga = _row(
      'manga-luffy',
      'Monkey D. Luffy',
      'catalog',
      'op09',
      2,
      sourceType: NetworkStreamSourceType.dbRandomExplore,
      rarity: 'Manga Rare',
      releaseDate: '2024-12-13',
      catalogGame: NetworkCatalogGame.onePiece,
    );
    final common = _row(
      'common',
      'Caterpie',
      'catalog',
      'base1',
      3,
      sourceType: NetworkStreamSourceType.dbRandomExplore,
      rarity: 'Common',
      releaseDate: '1999-01-09',
    );

    final ranked = NetworkStreamService.prioritizeCatalogRowsForTesting(
      <NetworkStreamRow>[shroodle, common, manga],
      recentRows: <NetworkStreamRow>[shroodle],
    );

    expect(ranked.first.cardPrintId, 'manga-luffy');
    expect(ranked.last.cardPrintId, 'shroodle');
  });

  test('catalog era labels make release generations visible', () {
    final classic = _row(
      'classic',
      'Charizard',
      'catalog',
      'base1',
      4,
      sourceType: NetworkStreamSourceType.dbRandomExplore,
      releaseDate: '1999-01-09',
    );
    final current = _row(
      'current',
      'Mew ex',
      'catalog',
      'sv3pt5',
      5,
      sourceType: NetworkStreamSourceType.dbRandomExplore,
      releaseDate: '2023-09-22',
    );
    final datedSetName = _row(
      'dated-set',
      'Blaziken',
      'catalog',
      '2004 World Championships Deck',
      6,
      sourceType: NetworkStreamSourceType.dbRandomExplore,
    );

    expect(NetworkStreamService.catalogEraLabel(classic), 'Classic era');
    expect(
      NetworkStreamService.catalogEraLabel(current),
      'Scarlet & Violet era',
    );
    expect(NetworkStreamService.catalogEraLabel(datedSetName), 'EX era');
  });

  test('TCG switcher remains available after the header scrolls away', () {
    final screen = File(
      'lib/screens/network/network_screen.dart',
    ).readAsStringSync();

    expect(screen, contains('position.pixels > 88'));
    expect(screen, contains('class _FloatingCatalogSwitcher'));
    expect(screen, contains('PopupMenuButton<NetworkCatalogGame>'));
    expect(screen, contains("tooltip: 'Change TCG'"));
    expect(screen, contains('_showFloatingCatalogSwitcher = false'));
  });
}

NetworkStreamRow _row(
  String cardPrintId,
  String name,
  String ownerUserId,
  String setCode,
  int sequence, {
  NetworkStreamSourceType sourceType = NetworkStreamSourceType.collectorInPlay,
  String? rarity,
  String? releaseDate,
  NetworkCatalogGame catalogGame = NetworkCatalogGame.pokemon,
}) {
  return NetworkStreamRow(
    sourceType: sourceType,
    vaultItemId: 'vault-$cardPrintId',
    ownerUserId: ownerUserId,
    ownerSlug: ownerUserId,
    ownerDisplayName: ownerUserId,
    cardPrintId: cardPrintId,
    quantity: 1,
    inPlayCount: 1,
    tradeCount: 1,
    sellCount: 0,
    showcaseCount: 0,
    rawCount: 1,
    slabCount: 0,
    gvId: 'GV-PK-TEST-$sequence',
    name: name,
    setCode: setCode,
    setName: setCode,
    number: '$sequence',
    createdAt: '2026-10-${20 - sequence}T12:00:00Z',
    imageUrl: 'https://example.test/$cardPrintId.webp',
    rarity: rarity,
    releaseDate: releaseDate,
    catalogGame: catalogGame,
  );
}
