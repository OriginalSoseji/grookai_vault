import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('mobile nearby feed uses the governed RPC contract only', () {
    final service = File(
      'lib/services/network/local_community_feed_service.dart',
    ).readAsStringSync();

    expect(service, contains("rpc(\n      'local_community_feed_v2'"));
    expect(service, isNot(contains('collector_local_discovery_settings')));
    expect(service, isNot(contains('wishlist_items')));
    expect(service, isNot(contains('geohash')));
    expect(service, isNot(contains('owner_user_id')));
  });

  test('Nearby screen stays isolated from NetworkStreamService', () {
    final screen = File(
      'lib/screens/network/network_nearby_screen.dart',
    ).readAsStringSync();

    expect(screen, contains('LocalCommunityFeedService'));
    expect(screen, contains('PublicCollectorScreen'));
    expect(screen, contains('CardDetailScreen'));
    expect(screen, contains('class _NearbyCollectorWallLink'));
    expect(screen, contains('NEARBY_COLLECTOR_NAME_WALL_LINK_V1'));
    expect(screen, contains('onPressed: onOpenWall'));
    expect(screen, isNot(contains('NetworkStreamService')));
  });

  test('Nearby Map keeps collectors list-only and reserves map for stores', () {
    final mapScreen = File(
      'lib/screens/network/network_nearby_map_screen.dart',
    ).readAsStringSync();

    expect(mapScreen, contains('class NetworkNearbyMapScreen'));
    expect(mapScreen, contains('LocalCommunityFeedService'));
    expect(
      mapScreen,
      contains('PublicCollectorScreen(slug: collector.ownerSlug)'),
    );
    expect(mapScreen, contains('Verified store map'));
    expect(mapScreen, contains('Nearby collectors'));
    expect(
      mapScreen,
      contains('Collector locations are never shown on the map'),
    );
    expect(mapScreen, contains('Nearby collectors stay list-only'));
    expect(mapScreen, isNot(contains('class _NearbyMapPin')));
    expect(mapScreen, isNot(contains('coarse area markers')));
    expect(mapScreen, isNot(contains('latitude')));
    expect(mapScreen, isNot(contains('longitude')));
    expect(mapScreen, isNot(contains('geohash')));
    expect(mapScreen, isNot(contains('collector_local_discovery_settings')));
  });

  test('Nearby is drawer-only and feature flagged', () {
    final shell = File('lib/main_shell.dart').readAsStringSync();
    final main = File('lib/main.dart').readAsStringSync();
    final service = File(
      'lib/services/network/local_community_feed_service.dart',
    ).readAsStringSync();

    expect(shell, contains('kLocalCommunityFeedV1Enabled'));
    expect(service, contains('defaultValue: true'));
    expect(shell, contains('NetworkNearbyScreen'));
    expect(main, contains("screens/network/network_nearby_map_screen.dart"));
    expect(shell, contains('NetworkNearbyMapScreen'));
    expect(shell, contains("label: 'Nearby'"));
    expect(shell, contains("label: 'Nearby Map'"));
    expect(shell, isNot(contains('_ShellDestination.nearby')));
  });
}
