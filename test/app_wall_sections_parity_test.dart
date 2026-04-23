import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  final collectorService = File(
    'lib/services/public/public_collector_service.dart',
  ).readAsStringSync();
  final collectorScreen = File(
    'lib/screens/public_collector/public_collector_screen.dart',
  ).readAsStringSync();
  final routeService = File(
    'lib/services/navigation/grookai_web_route_service.dart',
  ).readAsStringSync();
  final mainShell = File('lib/main_shell.dart').readAsStringSync();
  final gvviService = File(
    'lib/services/vault/vault_gvvi_service.dart',
  ).readAsStringSync();
  final gvviScreen = File(
    'lib/screens/vault/vault_gvvi_screen.dart',
  ).readAsStringSync();
  final manageCardScreen = File(
    'lib/screens/vault/vault_manage_card_screen.dart',
  ).readAsStringSync();

  test(
    'app public collector service loads Wall and sections from parity views',
    () {
      expect(collectorService, contains('class CollectorWallView'));
      expect(collectorService, contains("from('v_wall_cards_v1')"));
      expect(collectorService, contains("from('v_wall_sections_v1')"));
      expect(collectorService, contains("from('v_section_cards_v1')"));
      expect(collectorService, contains('loadSectionCardsBySlug'));
      expect(collectorService, contains('display_image_url'));
    },
  );

  test(
    'app public collector rail renders Wall first and lazy-loads sections',
    () {
      expect(collectorScreen, contains("const String _wallSectionId = 'wall'"));
      expect(collectorScreen, contains('class _CollectorWallSectionRail'));
      expect(collectorScreen, contains("label: 'Wall'"));
      expect(collectorScreen, contains('for (final section in sections)'));
      expect(collectorScreen, contains('_loadSectionCards'));
      expect(collectorScreen, contains('GridView.builder'));
      expect(collectorScreen, isNot(contains("label: 'Visible'")));
      expect(collectorScreen, isNot(contains("label: 'Collection'")));
    },
  );

  test('app owner can add section from the collector rail', () {
    expect(collectorScreen, contains('+ Add Section'));
    expect(collectorScreen, contains('New section name'));
    expect(collectorScreen, contains('createOwnerWallSection'));
    expect(collectorService, contains("from('wall_sections')"));
    expect(collectorService, contains("'is_active': true"));
    expect(collectorService, contains("'is_public': true"));
  });

  test('collector section deep links select the requested section', () {
    expect(
      routeService,
      contains('GrookaiCanonicalRouteKind.collectorSection'),
    );
    expect(routeService, contains("segments[2].toLowerCase() == 'section'"));
    expect(mainShell, contains('initialSectionId: route.sectionId'));
    expect(collectorScreen, contains('widget.initialSectionId'));
  });

  test('GVVI section membership is exact-copy based', () {
    expect(gvviService, contains('class VaultGvviSectionMembership'));
    expect(gvviService, contains("from('wall_section_memberships')"));
    expect(
      gvviService,
      contains("'vault_item_instance_id': normalizedInstanceId"),
    );
    expect(gvviScreen, contains('class _VaultSectionMembershipSurface'));
    expect(gvviScreen, contains("title: 'Add to'"));
    expect(gvviScreen, contains('assignSectionMembership'));
    expect(gvviScreen, contains('removeSectionMembership'));
  });

  test(
    'grouped card screen no longer mounts legacy wall curation controls',
    () {
      expect(manageCardScreen, isNot(contains("Tab(text: 'Wall')")));
      expect(
        manageCardScreen,
        isNot(
          contains(
            "label: Text(data.isShared ? 'Remove from Wall' : 'Add to Wall')",
          ),
        ),
      );
      expect(manageCardScreen, contains("Tab(text: 'Overview')"));
      expect(manageCardScreen, contains("Tab(text: 'Copies')"));
    },
  );
}
