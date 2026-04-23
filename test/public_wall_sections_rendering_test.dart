import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  final profilePageSource = File(
    'apps/web/src/app/u/[slug]/page.tsx',
  ).readAsStringSync();
  final collectionCompatibilityPageSource = File(
    'apps/web/src/app/u/[slug]/collection/page.tsx',
  ).readAsStringSync();
  final contentSource = File(
    'apps/web/src/components/public/PublicCollectorProfileContent.tsx',
  ).readAsStringSync();
  final gridSource = File(
    'apps/web/src/components/public/PublicCollectionGrid.tsx',
  ).readAsStringSync();
  final wallCardsSource = File(
    'apps/web/src/lib/wallSections/getPublicWallCardsBySlug.ts',
  ).readAsStringSync();
  final sectionsSource = File(
    'apps/web/src/lib/wallSections/getPublicWallSectionsBySlug.ts',
  ).readAsStringSync();
  final sectionCardsSource = File(
    'apps/web/src/lib/wallSections/getPublicSectionCardsBySlug.ts',
  ).readAsStringSync();
  final orchestrationSource = File(
    'apps/web/src/lib/wallSections/getPublicCollectorWallSectionsBySlug.ts',
  ).readAsStringSync();
  final mappingSource = File(
    'apps/web/src/lib/wallSections/publicWallSectionCardMapping.ts',
  ).readAsStringSync();
  final migrationSource = File(
    'supabase/migrations/20260422133000_wall_sections_data_model_v1.sql',
  ).readAsStringSync();

  test('public profile uses Wall and Sections read model instead of legacy split', () {
    expect(profilePageSource, contains('getPublicCollectorWallSectionsBySlug'));
    expect(profilePageSource, contains('sections={sectionViews}'));
    expect(profilePageSource, isNot(contains('getSharedCardsBySlug')));
    expect(profilePageSource, isNot(contains('getInPlayCardsBySlug')));
    expect(contentSource, isNot(contains('{ value: "collection"')));
    expect(contentSource, isNot(contains('label: "Visible"')));
    expect(contentSource, isNot(contains('Visible cards')));
  });

  test('public helpers read only the new Wall and Section views', () {
    expect(wallCardsSource, contains('.from("v_wall_cards_v1")'));
    expect(sectionsSource, contains('.from("v_wall_sections_v1")'));
    expect(sectionCardsSource, contains('.from("v_section_cards_v1")'));
    expect(sectionCardsSource, contains('.eq("section_id", normalizedSectionId)'));
    expect(sectionCardsSource, contains('.eq("owner_slug", normalizedSlug)'));
    expect(wallCardsSource, isNot(contains('.from("shared_cards")')));
    expect(sectionCardsSource, isNot(contains('.from("shared_cards")')));
  });

  test('Wall is always first and custom sections follow in order', () {
    expect(orchestrationSource, contains('PUBLIC_WALL_SECTION_ID'));
    expect(orchestrationSource, contains('name: "Wall"'));
    expect(orchestrationSource, contains('...customSections'));
    expect(contentSource, contains('return [wall, ...customSections];'));
  });

  test('inactive and private sections fail closed through public views', () {
    expect(migrationSource, contains('where ws.is_active = true'));
    expect(migrationSource, contains('and ws.is_public = true'));
    expect(sectionsSource, contains('.from("v_wall_sections_v1")'));
    expect(sectionsSource, contains('section.item_count > 0'));
  });

  test('card rendering keeps display image precedence and exact-copy keys', () {
    expect(mappingSource, contains('display_image_url'));
    expect(mappingSource, contains('representative_image_url'));
    expect(mappingSource, contains('resolveDisplayImageUrl'));
    expect(gridSource, contains('card.gv_vi_id ?? card.vault_item_id'));
    expect(gridSource, contains('key={cardKey}'));
  });

  test('old collection route is compatibility-only and no section share route is added', () {
    expect(collectionCompatibilityPageSource, contains(r'redirect(`/u/${profile.slug}`)'));
    expect(profilePageSource, isNot(contains('/section/')));
    expect(contentSource, isNot(contains('/section/')));
    expect(orchestrationSource, isNot(contains('/section/')));
  });
}
