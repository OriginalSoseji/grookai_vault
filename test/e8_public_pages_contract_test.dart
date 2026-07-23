import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

String normalizeSql(String value) => value.replaceAll(RegExp(r'\s+'), ' ');

void main() {
  final migration = File(
    'supabase/migrations/20260709120000_product_evolution_e8_public_counts_v1.sql',
  ).readAsStringSync();
  final normalized = normalizeSql(migration);
  final e5Migration = File(
    'supabase/migrations/20260708170000_product_evolution_e5_card_journeys_query_contracts_v1.sql',
  ).readAsStringSync();
  final cardPage = File(
    'apps/web/src/app/card/[gv_id]/page.tsx',
  ).readAsStringSync();
  final publicProfilePage = File(
    'apps/web/src/app/u/[slug]/page.tsx',
  ).readAsStringSync();
  final publicPokemonPage = File(
    'apps/web/src/app/u/[slug]/pokemon/[pokemon]/page.tsx',
  ).readAsStringSync();
  final wallOpenGraphImage = File(
    'apps/web/src/app/u/[slug]/opengraph-image.tsx',
  ).readAsStringSync();
  final cardDetailScreen = File(
    'lib/card_detail_screen.dart',
  ).readAsStringSync();
  final publicCollectorScreen = File(
    'lib/screens/public_collector/public_collector_screen.dart',
  ).readAsStringSync();

  test('public counts RPC is aggregate-only and anon safe', () {
    expect(
      migration,
      contains(
        'create or replace function public.card_journey_public_counts_v1',
      ),
    );
    expect(migration, contains('security definer'));
    expect(migration, contains('set search_path = public'));
    expect(
      normalized,
      contains(
        'returns table ( card_print_id uuid, public_owner_count integer, public_trade_count integer, public_sale_count integer, public_want_count integer, has_public_activity boolean )',
      ),
    );
    expect(
      normalized,
      contains(
        'grant execute on function public.card_journey_public_counts_v1(uuid) to anon, authenticated, service_role',
      ),
    );
  });

  test('public counts reuse public profile and vault-sharing gates', () {
    expect(
      migration,
      contains('public.interest_graph_collector_public_v1(vii.user_id)'),
    );
    expect(migration, contains('pp.public_profile_enabled is true'));
    expect(migration, contains('vii.archived_at is null'));
    expect(migration, contains('count(distinct c.user_id)'));
    expect(migration, contains("filter (where c.intent = 'trade')"));
    expect(migration, contains("filter (where c.intent = 'sell')"));
  });

  test('public counts return shape does not expose people or locations', () {
    final returnShape = normalized
        .split('returns table (')
        .last
        .split(') language sql')
        .first;

    expect(returnShape, isNot(contains('owner_user_id')));
    expect(returnShape, isNot(contains('owner_slug')));
    expect(returnShape, isNot(contains('display_name')));
    expect(returnShape, isNot(contains('locality')));
    expect(returnShape, isNot(contains('area_label')));
    expect(returnShape, isNot(contains('payload')));
    expect(returnShape, isNot(contains('vault_item')));
    expect(returnShape, isNot(contains('instance_id')));
  });

  test('E5 authenticated Journey RPCs remain non-anon', () {
    expect(
      normalizeSql(e5Migration),
      contains(
        'revoke all on function public.card_journey_snapshot_v1(uuid) from public, anon',
      ),
    );
    expect(
      normalizeSql(e5Migration),
      contains(
        'grant execute on function public.card_journey_snapshot_v1(uuid) to authenticated, service_role',
      ),
    );
    expect(
      normalizeSql(e5Migration),
      isNot(
        contains(
          'grant execute on function public.card_journey_snapshot_v1(uuid) to anon',
        ),
      ),
    );
  });

  test(
    'card page uses public counts without rebuilding card metadata images',
    () {
      expect(cardPage, contains('getPublicCardJourneyCounts'));
      expect(cardPage, contains('formatPublicJourneyCountsLine'));
      expect(cardPage, contains('Claim your vault'));
      expect(cardPage, contains('/login?next='));
      expect(cardPage, contains('publicJourneyCountsLine ?? undefined'));
      expect(cardPage, isNot(contains('card_journey_snapshot_v1')));
    },
  );

  test('public Wall page fails closed when vault sharing is disabled', () {
    expect(
      publicProfilePage,
      contains('!profile || !profile.vault_sharing_enabled'),
    );
    expect(publicProfilePage, contains('notFound();'));
    expect(publicProfilePage, contains('/opengraph-image'));
    expect(publicProfilePage, contains('summary_large_image'));
    expect(
      publicPokemonPage,
      contains(
        '!profile || !profile.vault_sharing_enabled || !normalizedPokemon',
      ),
    );
  });

  test('Wall Open Graph image validates the public profile and serves stable local artwork', () {
    expect(wallOpenGraphImage, contains('getPublicProfileBySlug'));
    expect(wallOpenGraphImage, contains('profile.vault_sharing_enabled'));
    expect(wallOpenGraphImage, contains('notFound();'));
    expect(wallOpenGraphImage, contains('grookai-logo-512.png'));
    expect(wallOpenGraphImage, contains('new Response(new Uint8Array(image)'));
    expect(wallOpenGraphImage, isNot(contains('from "next/og"')));
    expect(wallOpenGraphImage, isNot(contains('getPublicCollectorWallViewBySlug')));
    expect(wallOpenGraphImage, isNot(contains('card_journey_collectors_v1')));
    expect(wallOpenGraphImage, isNot(contains('card_journey_moments_v1')));
  });

  test('app sharing uses canonical public card and Wall URLs', () {
    expect(cardDetailScreen, contains("'/card/\${Uri.encodeComponent(gvId)}'"));
    expect(cardDetailScreen, contains('SharePlus.instance.share'));
    expect(cardDetailScreen, contains('ShareParams(uri: shareUri'));

    expect(
      publicCollectorScreen,
      contains("GrookaiWebRouteService.buildUri('/u/\${profile.slug}')"),
    );
    expect(publicCollectorScreen, contains('SharePlus.instance.share'));
    expect(publicCollectorScreen, contains('ShareParams(uri: shareUri'));
    expect(
      publicCollectorScreen,
      isNot(contains('Profile link copied to clipboard.')),
    );
  });
}
