import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('Pulse UI is finite, feature flagged, and wired to unread state', () {
    final networkScreen = File(
      'lib/screens/network/network_screen.dart',
    ).readAsStringSync();
    final pulseService = File(
      'lib/services/network/pulse_service.dart',
    ).readAsStringSync();
    final mainShell = File('lib/main_shell.dart').readAsStringSync();

    expect(networkScreen, contains('_NetworkHomeSegment.pulse'));
    expect(networkScreen, contains('_NetworkHomeSegment.discover'));
    expect(networkScreen, contains('_NetworkHomeSegment.following'));
    expect(networkScreen, contains('Show older Pulse'));
    expect(networkScreen, contains("You're caught up"));
    expect(networkScreen, contains('openPulse()'));
    expect(networkScreen, contains('_PulseArtworkTile(item: item)'));
    expect(networkScreen, contains('width: 58'));
    expect(networkScreen, contains('height: 84'));
    expect(networkScreen, isNot(contains('height: 106')));
    expect(networkScreen, isNot(contains('_PulseProgressTile')));
    expect(networkScreen, contains('Icons.swap_horiz_rounded'));
    expect(networkScreen, contains("parts.join(' · ')"));
    expect(networkScreen, contains("const Color(0xFFE9EBED)"));
    expect(networkScreen, contains("const Color(0xFF182838)"));
    expect(
      networkScreen,
      contains('if (_segment == _NetworkHomeSegment.pulse)'),
    );

    expect(pulseService, contains('PULSE_SURFACE_ENABLED'));
    expect(pulseService, contains('pulse_items_v1'));
    expect(pulseService, contains('pulse_unread_count_v1'));
    expect(pulseService, contains('pulse_mark_seen_v1'));
    expect(pulseService, contains('includeSeen = false'));
    expect(pulseService, contains("'p_include_seen': includeSeen"));
    expect(pulseService, contains('_pulseDisplayImageUrl'));
    expect(pulseService, contains("payload['display_image_url']"));

    expect(mainShell, contains('onPulseUnreadChanged'));
    expect(mainShell, contains('_DockUnreadBadge'));
    expect(mainShell, contains('GrookaiCanonicalRouteKind.feed'));
    expect(mainShell, contains('openCanonicalSegment(route.value)'));
  });

  test('canonical network links dispatch supported segments to Network', () {
    final networkScreen = File(
      'lib/screens/network/network_screen.dart',
    ).readAsStringSync();
    final mainShell = File('lib/main_shell.dart').readAsStringSync();

    expect(
      mainShell,
      contains('_networkKey.currentState?.openCanonicalSegment(route.value);'),
    );
    expect(
      networkScreen,
      contains("'discover' => _NetworkHomeSegment.discover"),
    );
    expect(
      networkScreen,
      contains("'following' => _NetworkHomeSegment.following"),
    );
    expect(networkScreen, contains('_ => _NetworkHomeSegment.pulse'));
  });

  test('Pulse navigation copy does not regress to Feed labels', () {
    final mainShell = File('lib/main_shell.dart').readAsStringSync();
    final main = File('lib/main.dart').readAsStringSync();
    final networkScreen = File(
      'lib/screens/network/network_screen.dart',
    ).readAsStringSync();

    expect(mainShell, contains("title: 'Pulse'"));
    expect(mainShell, contains("label: 'Pulse'"));
    expect(
      mainShell,
      contains('Use one Grookai identity across your vault, wall, and Pulse.'),
    );
    expect(main, contains('Hide Pulse debug overlay'));
    expect(main, contains('Show Pulse debug overlay'));
    expect(networkScreen, contains('Refreshing Pulse'));
    expect(networkScreen, contains('Show older Pulse'));
    expect(networkScreen, contains('Unable to load Pulse'));

    expect(mainShell, isNot(contains("title: 'Feed'")));
    expect(mainShell, isNot(contains("label: 'Feed'")));
    expect(mainShell, isNot(contains('collector feed')));
    expect(main, isNot(contains('Hide feed debug overlay')));
    expect(main, isNot(contains('Show feed debug overlay')));
    expect(networkScreen, isNot(contains('Refreshing feed')));
  });
}
