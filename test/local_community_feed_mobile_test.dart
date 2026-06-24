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
    expect(screen, isNot(contains('NetworkStreamService')));
  });

  test('Nearby is drawer-only and feature flagged', () {
    final shell = File('lib/main_shell.dart').readAsStringSync();

    expect(shell, contains('kLocalCommunityFeedV1Enabled'));
    expect(shell, contains('NetworkNearbyScreen'));
    expect(shell, contains("label: 'Nearby'"));
    expect(shell, isNot(contains('_ShellDestination.nearby')));
  });
}
