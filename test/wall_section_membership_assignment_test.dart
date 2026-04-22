import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  final readSource = File(
    'apps/web/src/lib/wallSections/getOwnerWallSectionMemberships.ts',
  ).readAsStringSync();
  final assignSource = File(
    'apps/web/src/lib/wallSections/assignWallSectionMembershipAction.ts',
  ).readAsStringSync();
  final removeSource = File(
    'apps/web/src/lib/wallSections/removeWallSectionMembershipAction.ts',
  ).readAsStringSync();
  final componentSource = File(
    'apps/web/src/components/vault/VaultInstanceSectionMembershipCard.tsx',
  ).readAsStringSync();
  final pageSource = File(
    'apps/web/src/app/vault/gvvi/[gvvi_id]/page.tsx',
  ).readAsStringSync();
  final migrationSource = File(
    'supabase/migrations/20260422133000_wall_sections_data_model_v1.sql',
  ).readAsStringSync();

  test('membership read model is exact-copy and owner scoped', () {
    expect(readSource, contains('.from("vault_item_instances")'));
    expect(readSource, contains('.eq("id", normalizedInstanceId)'));
    expect(readSource, contains('.eq("user_id", normalizedUserId)'));
    expect(readSource, contains('.is("archived_at", null)'));
    expect(readSource, contains('.from("wall_sections")'));
    expect(readSource, contains('.eq("user_id", normalizedUserId)'));
    expect(readSource, contains('.from("wall_section_memberships")'));
    expect(
      readSource,
      contains('.eq("vault_item_instance_id", normalizedInstanceId)'),
    );
    expect(readSource, isNot(contains('shared_cards')));
    expect(readSource, isNot(contains('card_print_id')));
    expect(readSource, isNot(contains('gv_id')));
  });

  test('assign action verifies owned section and owned GVVI before insert', () {
    expect(assignSource, contains('client.auth.getUser()'));
    expect(assignSource, contains('.from("wall_sections")'));
    expect(assignSource, contains('.eq("id", input.sectionId)'));
    expect(assignSource, contains('.eq("user_id", input.userId)'));
    expect(assignSource, contains('.from("vault_item_instances")'));
    expect(assignSource, contains('.eq("id", input.vaultItemInstanceId)'));
    expect(assignSource, contains('.eq("user_id", input.userId)'));
    expect(assignSource, contains('.is("archived_at", null)'));
    expect(assignSource, contains('.from("wall_section_memberships").insert'));
    expect(
      assignSource,
      contains('vault_item_instance_id: vaultItemInstanceId'),
    );
  });

  test(
    'remove action verifies ownership and deletes exact-copy membership only',
    () {
      expect(removeSource, contains('client.auth.getUser()'));
      expect(removeSource, contains('.from("wall_sections")'));
      expect(removeSource, contains('.from("vault_item_instances")'));
      expect(removeSource, contains('.from("wall_section_memberships")'));
      expect(removeSource, contains('.delete()'));
      expect(removeSource, contains('.eq("section_id", sectionId)'));
      expect(
        removeSource,
        contains('.eq("vault_item_instance_id", vaultItemInstanceId)'),
      );
      expect(removeSource, isNot(contains('.eq("card_print_id"')));
      expect(removeSource, isNot(contains('.eq("gv_id"')));
    },
  );

  test('duplicate assignment is safe and multi-membership remains allowed', () {
    expect(assignSource, contains('.maybeSingle()'));
    expect(assignSource, contains('error.code !== "23505"'));
    expect(
      migrationSource,
      contains('primary key (section_id, vault_item_instance_id)'),
    );
    expect(migrationSource, isNot(contains('unique (vault_item_instance_id)')));
  });

  test('Wall and grouped assignment paths are blocked', () {
    expect(assignSource, contains('isWallSectionSystemId(sectionId)'));
    expect(removeSource, contains('isWallSectionSystemId(sectionId)'));
    expect(assignSource, contains('Wall is managed automatically.'));
    expect(removeSource, contains('Wall is managed automatically.'));
    expect(assignSource, isNot(contains('legacy_vault_item_id')));
    expect(assignSource, isNot(contains('shared_cards')));
    expect(removeSource, isNot(contains('legacy_vault_item_id')));
    expect(removeSource, isNot(contains('shared_cards')));
  });

  test('GVVI owner page renders membership UI and no public section route', () {
    expect(
      pageSource,
      contains('getOwnerWallSectionMemberships(user.id, detail.instanceId)'),
    );
    expect(pageSource, contains('VaultInstanceSectionMembershipCard'));
    expect(componentSource, contains('Add this exact copy to custom sections'));
    expect(componentSource, contains('Wall stays automatic'));
    expect(componentSource, contains('Create section'));
    expect(componentSource, isNot(contains('/section/')));
  });

  test('actions revalidate owner readback surfaces', () {
    expect(assignSource, contains('revalidateOwnerWallSectionPaths(user.id)'));
    expect(removeSource, contains('revalidateOwnerWallSectionPaths(user.id)'));
    expect(assignSource, contains(r'revalidatePath(`/vault/gvvi/${gvviId}`)'));
    expect(removeSource, contains(r'revalidatePath(`/vault/gvvi/${gvviId}`)'));
    expect(
      assignSource,
      contains('getOwnerWallSectionMemberships(user.id, vaultItemInstanceId)'),
    );
    expect(
      removeSource,
      contains('getOwnerWallSectionMemberships(user.id, vaultItemInstanceId)'),
    );
  });
}
