import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

String normalizeSql(String value) => value.replaceAll(RegExp(r'\s+'), ' ');

void main() {
  final migration = File(
    'supabase/migrations/20260422133000_wall_sections_data_model_v1.sql',
  ).readAsStringSync();
  final mediaSurfaceMigration = File(
    'supabase/migrations/20260703170000_vault_instance_media_public_surfaces_v1.sql',
  ).readAsStringSync();
  final mediaStoragePolicyMigration = File(
    'supabase/migrations/20260703173000_vault_instance_public_media_storage_select_policy_v1.sql',
  ).readAsStringSync();
  final normalized = normalizeSql(migration);
  final normalizedMediaSurfaceMigration = normalizeSql(mediaSurfaceMigration);

  test('wall sections create durable section and instance membership tables', () {
    expect(
      migration,
      contains('create table if not exists public.wall_sections'),
    );
    expect(
      migration,
      contains('create table if not exists public.wall_section_memberships'),
    );
    expect(
      normalized,
      contains('primary key (section_id, vault_item_instance_id)'),
    );
    expect(
      migration,
      contains(
        'vault_item_instance_id uuid not null references public.vault_item_instances(id)',
      ),
    );
    expect(migration, isNot(contains('create table public.wall ')));
  });

  test('wall is derived from instance intent and public profile gates', () {
    expect(
      migration,
      contains('create or replace view public.v_wall_cards_v1'),
    );
    expect(migration, contains("vii.intent in ('trade', 'sell', 'showcase')"));
    expect(migration, contains('pp.public_profile_enabled = true'));
    expect(migration, contains('pp.vault_sharing_enabled = true'));
    expect(migration, contains('vii.archived_at is null'));
  });

  test('section read models are public-safe and section scoped', () {
    expect(
      migration,
      contains('create or replace view public.v_wall_sections_v1'),
    );
    expect(
      migration,
      contains('create or replace view public.v_section_cards_v1'),
    );
    expect(migration, contains('ws.is_active = true'));
    expect(migration, contains('ws.is_public = true'));
    expect(migration, contains('wsm.section_id = ws.id'));
    expect(migration, contains('vii.id = wsm.vault_item_instance_id'));
  });

  test('membership is guarded against cross-user and archived instances', () {
    expect(
      migration,
      contains('public.enforce_wall_section_membership_owner_v1'),
    );
    expect(migration, contains('ws.user_id = vii.user_id'));
    expect(migration, contains('vii.archived_at is null'));
    expect(migration, contains('wall_section_membership_owner_mismatch'));
  });

  test(
    'RLS permits owners and public share reads without exposing private profiles',
    () {
      expect(
        migration,
        contains('alter table public.wall_sections enable row level security'),
      );
      expect(
        migration,
        contains(
          'alter table public.wall_section_memberships enable row level security',
        ),
      );
      expect(migration, contains('wall_sections_owner_insert_v1'));
      expect(migration, contains('wall_section_memberships_owner_insert_v1'));
      expect(migration, contains('wall_sections_public_select_v1'));
      expect(migration, contains('wall_section_memberships_public_select_v1'));
      expect(migration, contains('public_profile_enabled = true'));
      expect(migration, contains('vault_sharing_enabled = true'));
    },
  );

  test('shared_cards remains compatibility metadata only', () {
    expect(migration, contains('left join public.shared_cards shared'));
    expect(migration, contains('shared.public_note'));
    expect(migration, contains('shared.price_display_mode'));
    expect(migration, contains('legacy_wall_category'));
    expect(migration, isNot(contains('drop table public.shared_cards')));
    expect(migration, isNot(contains('alter table public.shared_cards drop')));
  });

  test('display image contract is available to wall and section reads', () {
    expect(migration, contains('display_image_url'));
    expect(migration, contains('display_image_kind'));
    expect(migration, contains('representative_image_url'));
    expect(migration, contains("'representative'"));
  });

  test('uploaded instance media is gated by exact-copy image display mode', () {
    expect(
      mediaSurfaceMigration,
      contains('vault_save_instance_media_path_v1'),
    );
    expect(
      normalizedMediaSurfaceMigration,
      contains("image_display_mode = 'uploaded'"),
    );
    expect(
      normalizedMediaSurfaceMigration,
      contains("then 'uploaded' when v_side = 'front' then 'canonical'"),
    );
    expect(mediaSurfaceMigration, contains('v_wall_cards_v1'));
    expect(mediaSurfaceMigration, contains('v_section_cards_v1'));
    expect(mediaSurfaceMigration, contains('v_card_stream_v1'));
  });

  test(
    'uploaded instance media storage reads stay scoped to public copies',
    () {
      expect(mediaStoragePolicyMigration, contains('user-card-images'));
      expect(
        mediaStoragePolicyMigration,
        contains('user_card_images_public_discoverable_instance_select_v1'),
      );
      expect(
        mediaStoragePolicyMigration,
        contains("vii.intent in ('trade', 'sell', 'showcase')"),
      );
      expect(
        mediaStoragePolicyMigration,
        contains("vii.image_display_mode = 'uploaded'"),
      );
      expect(
        mediaStoragePolicyMigration,
        contains('pp.public_profile_enabled = true'),
      );
      expect(
        mediaStoragePolicyMigration,
        contains('pp.vault_sharing_enabled = true'),
      );
    },
  );
}
