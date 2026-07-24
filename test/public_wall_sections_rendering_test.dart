import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  final profilePageSource = File(
    'apps/web/src/app/u/[slug]/page.tsx',
  ).readAsStringSync();
  final sectionPageSource = File(
    'apps/web/src/app/u/[slug]/section/[section_id]/page.tsx',
  ).readAsStringSync();
  final collectionCompatibilityPageSource = File(
    'apps/web/src/app/u/[slug]/collection/page.tsx',
  ).readAsStringSync();
  final contentSource = File(
    'apps/web/src/components/public/PublicCollectorProfileContent.tsx',
  ).readAsStringSync();
  final sectionContentSource = File(
    'apps/web/src/components/public/PublicSectionShareContent.tsx',
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
  final sectionShareModelSource = File(
    'apps/web/src/lib/wallSections/getPublicSectionBySlugAndId.ts',
  ).readAsStringSync();
  final orchestrationSource = File(
    'apps/web/src/lib/wallSections/getPublicCollectorWallSectionsBySlug.ts',
  ).readAsStringSync();
  final wallSectionTypesSource = File(
    'apps/web/src/lib/wallSections/wallSectionTypes.ts',
  ).readAsStringSync();
  final mappingSource = File(
    'apps/web/src/lib/wallSections/publicWallSectionCardMapping.ts',
  ).readAsStringSync();
  final networkStreamSource = File(
    'apps/web/src/lib/network/getCardStreamRows.ts',
  ).readAsStringSync();
  final revalidateSource = File(
    'apps/web/src/lib/wallSections/revalidateWallSectionPaths.ts',
  ).readAsStringSync();
  final webRouteServiceSource = File(
    'lib/services/navigation/grookai_web_route_service.dart',
  ).readAsStringSync();
  final migrationSource = File(
    'supabase/migrations/20260422133000_wall_sections_data_model_v1.sql',
  ).readAsStringSync();

  test(
    'public profile uses Wall and Sections read model instead of legacy split',
    () {
      expect(profilePageSource, contains('getPublicCollectorWallViewBySlug'));
      expect(profilePageSource, contains('sections={sectionViews}'));
      expect(profilePageSource, isNot(contains('getSharedCardsBySlug')));
      expect(profilePageSource, isNot(contains('getInPlayCardsBySlug')));
      expect(
        contentSource,
        contains('getPublicSectionShareHref(slug, section.id)'),
      );
      expect(contentSource, isNot(contains('{ value: "collection"')));
      expect(contentSource, isNot(contains('label: "Visible"')));
      expect(contentSource, isNot(contains('Visible cards')));
    },
  );

  test('public helpers read only the new Wall and selected Section views', () {
    expect(wallCardsSource, contains('.from("v_wall_cards_v1")'));
    expect(sectionsSource, contains('.from("wall_sections")'));
    expect(sectionsSource, contains('getPublicProfileBySlug(normalizedSlug)'));
    expect(sectionsSource, contains('.eq("user_id", profile.user_id)'));
    expect(sectionsSource, isNot(contains('v_wall_sections_v1')));
    expect(sectionsSource, isNot(contains('createServerAdminClient')));
    expect(sectionCardsSource, contains('.from("v_section_cards_v1")'));
    expect(sectionCardsSource, contains('.eq("section_id", proof.sectionId)'));
    expect(sectionCardsSource, contains('.eq("owner_slug", proof.ownerSlug)'));
    expect(
      sectionCardsSource,
      contains('.eq("owner_user_id", proof.ownerUserId)'),
    );
    expect(
      sectionCardsSource,
      contains('const proof = await provePublicSectionRead(slug, sectionId)'),
    );
    expect(sectionShareModelSource, contains('.from("wall_sections")'));
    expect(
      sectionShareModelSource,
      contains('.eq("user_id", profile.user_id)'),
    );
    expect(sectionShareModelSource, isNot(contains('v_wall_sections_v1')));
    expect(sectionShareModelSource, isNot(contains('createServerAdminClient')));
    expect(sectionShareModelSource, contains('.eq("id", normalizedSectionId)'));
    expect(
      sectionShareModelSource,
      contains('getPublicSectionCardsBySlug(profile.slug, section.id)'),
    );
    expect(wallCardsSource, isNot(contains('.from("shared_cards")')));
    expect(sectionCardsSource, isNot(contains('.from("shared_cards")')));
  });

  test(
    'canonical section route is path based with query compatibility only',
    () {
      expect(wallSectionTypesSource, contains('getPublicSectionShareHref'));
      expect(wallSectionTypesSource, contains('/section/'));
      expect(sectionPageSource, contains('getPublicSectionBySlugAndId'));
      expect(sectionPageSource, contains('notFound()'));
      expect(sectionPageSource, contains('redirect(sectionPath)'));
      expect(
        collectionCompatibilityPageSource,
        contains(r'redirect(`/u/${profile.slug}`)'),
      );
    },
  );

  test('Wall is always first and custom sections follow in order', () {
    expect(orchestrationSource, contains('PUBLIC_WALL_SECTION_ID'));
    expect(orchestrationSource, contains('name: "Wall"'));
    expect(orchestrationSource, contains('...customSections'));
    expect(contentSource, contains('return [wall, ...customSections];'));
  });

  test('inactive and private sections fail closed through public views', () {
    expect(migrationSource, contains('where ws.is_active = true'));
    expect(migrationSource, contains('and ws.is_public = true'));
    expect(sectionsSource, contains('.from("wall_sections")'));
    expect(sectionsSource, contains('!profile.vault_sharing_enabled'));
    expect(sectionShareModelSource, contains('!profile.vault_sharing_enabled'));
    expect(
      sectionShareModelSource,
      contains(
        'Section share routes expose active custom sections automatically.',
      ),
    );
    expect(
      sectionShareModelSource,
      contains(
        'Do not leak inactive or unrelated sections through share rendering.',
      ),
    );
  });

  test('section route renders only selected section cards', () {
    expect(sectionPageSource, contains('getPublicSectionBySlugAndId'));
    expect(
      sectionPageSource,
      contains('cards: section.id === model.section.id ? model.cards : []'),
    );
    expect(sectionContentSource, contains('PublicCollectionGrid'));
    expect(sectionContentSource, contains('PUBLIC_SECTION_SHARE_COPY.empty'));
    expect(
      sectionPageSource,
      isNot(contains('getPublicCollectorWallSectionsBySlug')),
    );
    expect(
      sectionShareModelSource,
      isNot(contains('getPublicCollectorWallSectionsBySlug')),
    );
  });

  test('card rendering keeps display image precedence and exact-copy keys', () {
    expect(mappingSource, contains('display_image_url'));
    expect(mappingSource, contains('representative_image_url'));
    expect(mappingSource, contains('resolveDisplayImageUrl'));
    expect(mappingSource, contains('resolveVaultInstanceMediaUrl'));
    expect(mappingSource, contains('isVaultInstanceMediaStoragePath'));
    expect(mappingSource, contains('existing.image_url = card.image_url'));
    expect(gridSource, contains('card.gv_vi_id ?? card.vault_item_id'));
    expect(gridSource, contains('key={cardKey}'));
  });

  test('Pulse selects and resolves instance display images', () {
    expect(networkStreamSource, contains('display_image_url'));
    expect(networkStreamSource, contains('display_image_kind'));
    expect(networkStreamSource, contains('resolveVaultInstanceMediaUrl'));
    expect(networkStreamSource, contains('isVaultInstanceMediaStoragePath'));
  });

  test(
    'public copy remains short and old labels do not reappear on web section surfaces',
    () {
      expect(
        wallSectionTypesSource,
        contains(
          'Public section share language must remain short, calm, and collector-friendly',
        ),
      );
      expect(wallSectionTypesSource, contains('Back to wall'));
      expect(wallSectionTypesSource, contains('Copy link'));
      expect(sectionPageSource, isNot(contains('Visible')));
      expect(sectionContentSource, isNot(contains('Visible')));
      expect(sectionContentSource, isNot(contains('Visible cards')));
      expect(sectionContentSource, isNot(contains('title="Collection"')));
    },
  );

  test('owner and app surfaces can reach canonical section links', () {
    expect(
      revalidateSource,
      contains(r'revalidatePath(`/u/${slug}/section/${section.id}`)'),
    );
    expect(webRouteServiceSource, contains('collectorSection'));
    expect(
      webRouteServiceSource,
      contains("segments[2].toLowerCase() == 'section'"),
    );
  });
}
