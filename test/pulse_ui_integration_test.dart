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
    expect(
      networkScreen,
      contains('if (_segment == _NetworkHomeSegment.pulse)'),
    );

    expect(pulseService, contains('PULSE_SURFACE_ENABLED'));
    expect(pulseService, contains('pulse_items_v1'));
    expect(pulseService, contains('pulse_unread_count_v1'));
    expect(pulseService, contains('pulse_mark_seen_v1'));

    expect(mainShell, contains('onPulseUnreadChanged'));
    expect(mainShell, contains('_DockUnreadBadge'));
    expect(mainShell, contains('GrookaiCanonicalRouteKind.feed'));
    expect(mainShell, contains('openPulse'));
  });
}
