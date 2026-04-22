import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  final typesSource = File(
    'apps/web/src/lib/wallSections/wallSectionTypes.ts',
  ).readAsStringSync();
  final readSource = File(
    'apps/web/src/lib/wallSections/getOwnerWallSections.ts',
  ).readAsStringSync();
  final createSource = File(
    'apps/web/src/lib/wallSections/createWallSectionAction.ts',
  ).readAsStringSync();
  final updateSource = File(
    'apps/web/src/lib/wallSections/updateWallSectionAction.ts',
  ).readAsStringSync();
  final componentSource = File(
    'apps/web/src/components/account/WallSectionsSettingsCard.tsx',
  ).readAsStringSync();
  final accountPageSource = File(
    'apps/web/src/app/account/page.tsx',
  ).readAsStringSync();

  test('plan limits fail safe to the Free limit until entitlement exists', () {
    expect(typesSource, contains('free: 3'));
    expect(typesSource, contains('pro: 10'));
    expect(typesSource, contains('vendor: 20'));
    expect(typesSource, contains('source: "fallback_free"'));
    expect(readSource, contains('No stable account-plan source exists yet'));
    expect(readSource, contains('getDefaultWallSectionLimitState()'));
  });

  test('create action writes owner-only custom sections and not Wall', () {
    expect(createSource, contains('client.auth.getUser()'));
    expect(createSource, contains('.from("wall_sections").insert'));
    expect(createSource, contains('user_id: user.id'));
    expect(createSource, contains('is_active: true'));
    expect(createSource, contains('is_public: false'));
    expect(createSource, isNot(contains('.from("shared_cards").insert')));
    expect(createSource, isNot(contains('create table')));
  });

  test(
    'create action validates names and enforces active and stored limits',
    () {
      expect(typesSource, contains('Wall is managed automatically.'));
      expect(typesSource, contains('Section name is required.'));
      expect(typesSource, contains('WALL_SECTION_STORED_LIMIT = 20'));
      expect(createSource, contains('WALL_SECTION_LIMIT_MESSAGE'));
      expect(createSource, contains('WALL_SECTION_STORED_LIMIT_MESSAGE'));
      expect(createSource, contains('countActiveWallSections(sections)'));
      expect(
        createSource,
        contains('hasDuplicateWallSectionName(sections, name)'),
      );
    },
  );

  test('rename and active toggle are owner-scoped and fail closed', () {
    expect(updateSource, contains('.from("wall_sections")'));
    expect(updateSource, contains('.eq("id", sectionId)'));
    expect(updateSource, contains('.eq("user_id", user.id)'));
    expect(updateSource, contains('Section not found.'));
    expect(updateSource, contains('canActivateWallSection'));
    expect(updateSource, contains('Wall is managed automatically.'));
    expect(updateSource, contains('.update(updatePayload)'));
  });

  test('owner UI is wired into account settings only', () {
    expect(componentSource, contains('Wall Sections'));
    expect(componentSource, contains('Create section'));
    expect(componentSource, contains('Rename'));
    expect(componentSource, contains('Deactivate'));
    expect(componentSource, contains('Activate'));
    expect(accountPageSource, contains('getOwnerWallSections(user.id)'));
    expect(
      accountPageSource,
      contains('<WallSectionsSettingsCard initialModel={wallSectionsModel} />'),
    );
  });

  test(
    'section management does not implement membership assignment or public rendering',
    () {
      expect(componentSource, isNot(contains('wall_section_memberships')));
      expect(componentSource, isNot(contains('vault_item_instance_id')));
      expect(accountPageSource, isNot(contains('/section/')));
      expect(createSource, isNot(contains('v_section_cards_v1')));
      expect(updateSource, isNot(contains('v_section_cards_v1')));
    },
  );
}
