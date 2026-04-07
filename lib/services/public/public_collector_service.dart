import 'package:supabase_flutter/supabase_flutter.dart';

import '../../secrets.dart';
import 'card_surface_pricing_service.dart';

enum PublicCollectorSurfaceState { notFound, unavailable, empty, success }

enum PublicCollectorEntryState { ready, missingProfile, unavailable }

class PublicCollectorProfile {
  const PublicCollectorProfile({
    required this.userId,
    required this.slug,
    required this.displayName,
    required this.vaultSharingEnabled,
    required this.followingCount,
    required this.followerCount,
    this.avatarUrl,
  });

  final String userId;
  final String slug;
  final String displayName;
  final bool vaultSharingEnabled;
  final int followingCount;
  final int followerCount;
  final String? avatarUrl;
}

class PublicCollectorRelationshipRow {
  const PublicCollectorRelationshipRow({
    required this.userId,
    required this.slug,
    required this.displayName,
    this.avatarUrl,
    this.followedAt,
  });

  final String userId;
  final String slug;
  final String displayName;
  final String? avatarUrl;
  final DateTime? followedAt;
}

class PublicCollectorDiscoverRow {
  const PublicCollectorDiscoverRow({
    required this.userId,
    required this.slug,
    required this.displayName,
    this.avatarUrl,
    this.createdAt,
  });

  final String userId;
  final String slug;
  final String displayName;
  final String? avatarUrl;
  final String? createdAt;
}

class PublicCollectorCard {
  const PublicCollectorCard({
    required this.cardPrintId,
    required this.gvId,
    required this.name,
    required this.number,
    this.vaultItemId,
    this.gvviId,
    this.setName,
    this.setCode,
    this.rarity,
    this.imageUrl,
    this.conditionLabel,
    this.intent,
    this.pricing,
    this.inPlayCopies = const <PublicCollectorCopy>[],
  });

  final String cardPrintId;
  final String gvId;
  final String name;
  final String number;
  final String? vaultItemId;
  final String? gvviId;
  final String? setName;
  final String? setCode;
  final String? rarity;
  final String? imageUrl;
  final String? conditionLabel;
  final String? intent;
  final CardSurfacePricingData? pricing;
  final List<PublicCollectorCopy> inPlayCopies;
}

class PublicCollectorCopy {
  const PublicCollectorCopy({
    required this.instanceId,
    required this.vaultItemId,
    required this.intent,
    this.gvviId,
    this.conditionLabel,
    this.isGraded = false,
    this.gradeCompany,
    this.gradeValue,
    this.gradeLabel,
    this.certNumber,
    this.createdAt,
  });

  final String instanceId;
  final String vaultItemId;
  final String intent;
  final String? gvviId;
  final String? conditionLabel;
  final bool isGraded;
  final String? gradeCompany;
  final String? gradeValue;
  final String? gradeLabel;
  final String? certNumber;
  final String? createdAt;
}

class PublicCollectorEntryResult {
  const PublicCollectorEntryResult._({required this.state, this.slug});

  final PublicCollectorEntryState state;
  final String? slug;

  factory PublicCollectorEntryResult.ready({required String slug}) {
    return PublicCollectorEntryResult._(
      state: PublicCollectorEntryState.ready,
      slug: slug,
    );
  }

  factory PublicCollectorEntryResult.missingProfile() {
    return const PublicCollectorEntryResult._(
      state: PublicCollectorEntryState.missingProfile,
    );
  }

  factory PublicCollectorEntryResult.unavailable() {
    return const PublicCollectorEntryResult._(
      state: PublicCollectorEntryState.unavailable,
    );
  }
}

class PublicCollectorSurfaceResult {
  const PublicCollectorSurfaceResult._({
    required this.state,
    this.profile,
    this.collectionCards = const [],
    this.inPlayCards = const [],
  });

  final PublicCollectorSurfaceState state;
  final PublicCollectorProfile? profile;
  final List<PublicCollectorCard> collectionCards;
  final List<PublicCollectorCard> inPlayCards;

  factory PublicCollectorSurfaceResult.notFound() {
    return const PublicCollectorSurfaceResult._(
      state: PublicCollectorSurfaceState.notFound,
    );
  }

  factory PublicCollectorSurfaceResult.unavailable() {
    return const PublicCollectorSurfaceResult._(
      state: PublicCollectorSurfaceState.unavailable,
    );
  }

  factory PublicCollectorSurfaceResult.empty(PublicCollectorProfile profile) {
    return PublicCollectorSurfaceResult._(
      state: PublicCollectorSurfaceState.empty,
      profile: profile,
    );
  }

  factory PublicCollectorSurfaceResult.success({
    required PublicCollectorProfile profile,
    required List<PublicCollectorCard> collectionCards,
    required List<PublicCollectorCard> inPlayCards,
  }) {
    return PublicCollectorSurfaceResult._(
      state: PublicCollectorSurfaceState.success,
      profile: profile,
      collectionCards: collectionCards,
      inPlayCards: inPlayCards,
    );
  }
}

class PublicCollectorService {
  static const _profileMediaBucket = 'profile-media';

  static Future<List<PublicCollectorDiscoverRow>> discoverCollectors({
    required SupabaseClient client,
    String? query,
    int limit = 30,
  }) async {
    final normalizedQuery = _cleanText(query).toLowerCase();
    dynamic request = client
        .from('public_profiles')
        .select(
          'user_id,slug,display_name,avatar_path,created_at,public_profile_enabled,vault_sharing_enabled',
        )
        .eq('public_profile_enabled', true)
        .eq('vault_sharing_enabled', true)
        .order('created_at', ascending: false)
        .limit(limit);

    if (normalizedQuery.isNotEmpty) {
      final escaped = normalizedQuery
          .replaceAll(r'\', r'\\')
          .replaceAll('%', r'\%')
          .replaceAll('_', r'\_');
      final pattern = '%$escaped%';
      request = request.or('display_name.ilike.$pattern,slug.ilike.$pattern');
    }

    final rows = await request;

    return (rows as List<dynamic>)
        .map((row) => Map<String, dynamic>.from(row as Map))
        .map((row) {
          final userId = _cleanText(row['user_id']);
          final slug = _normalizeSlug(row['slug']);
          if (userId.isEmpty || slug.isEmpty) {
            return null;
          }

          final displayName = _cleanText(row['display_name']);
          return PublicCollectorDiscoverRow(
            userId: userId,
            slug: slug,
            displayName: displayName.isEmpty ? slug : displayName,
            avatarUrl: _resolveProfileMediaUrl(row['avatar_path']),
            createdAt: _normalizeOptionalText(row['created_at']),
          );
        })
        .whereType<PublicCollectorDiscoverRow>()
        .toList();
  }

  static Future<PublicCollectorEntryResult> resolveOwnEntry({
    required SupabaseClient client,
    required String userId,
  }) async {
    final normalizedUserId = _cleanText(userId);
    if (normalizedUserId.isEmpty) {
      return PublicCollectorEntryResult.missingProfile();
    }

    final rawProfile = await client
        .from('public_profiles')
        .select('slug,public_profile_enabled,vault_sharing_enabled')
        .eq('user_id', normalizedUserId)
        .maybeSingle();

    if (rawProfile == null) {
      return PublicCollectorEntryResult.missingProfile();
    }

    final profileRow = Map<String, dynamic>.from(rawProfile);
    final slug = _normalizeSlug(profileRow['slug']);
    final isPublicProfileEnabled = profileRow['public_profile_enabled'] == true;
    final isVaultSharingEnabled = profileRow['vault_sharing_enabled'] == true;

    if (slug.isEmpty) {
      return PublicCollectorEntryResult.missingProfile();
    }

    if (!isPublicProfileEnabled || !isVaultSharingEnabled) {
      return PublicCollectorEntryResult.unavailable();
    }

    return PublicCollectorEntryResult.ready(slug: slug);
  }

  static Future<PublicCollectorProfile?> loadPublicProfileBySlug({
    required SupabaseClient client,
    required String slug,
  }) async {
    final normalizedSlug = _normalizeSlug(slug);
    if (normalizedSlug.isEmpty) {
      return null;
    }

    final rawProfile = await client
        .from('public_profiles')
        .select(
          'user_id,slug,display_name,public_profile_enabled,vault_sharing_enabled,avatar_path',
        )
        .eq('slug', normalizedSlug)
        .maybeSingle();

    if (rawProfile == null) {
      return null;
    }

    final profileRow = Map<String, dynamic>.from(rawProfile);
    final userId = _cleanText(profileRow['user_id']);
    final resolvedSlug = _normalizeSlug(profileRow['slug']) == ''
        ? normalizedSlug
        : _normalizeSlug(profileRow['slug']);
    final displayName = _cleanText(profileRow['display_name']);
    final isPublicProfileEnabled = profileRow['public_profile_enabled'] == true;

    if (!isPublicProfileEnabled || userId.isEmpty) {
      return null;
    }

    final followCounts = await _loadFollowCounts(
      client: client,
      userId: userId,
    );

    return PublicCollectorProfile(
      userId: userId,
      slug: resolvedSlug,
      displayName: displayName.isEmpty ? resolvedSlug : displayName,
      vaultSharingEnabled: profileRow['vault_sharing_enabled'] == true,
      followingCount: followCounts.followingCount,
      followerCount: followCounts.followerCount,
      avatarUrl: _resolveProfileMediaUrl(profileRow['avatar_path']),
    );
  }

  static Future<PublicCollectorSurfaceResult> loadBySlug({
    required SupabaseClient client,
    required String slug,
  }) async {
    final normalizedSlug = _normalizeSlug(slug);
    if (normalizedSlug.isEmpty) {
      return PublicCollectorSurfaceResult.notFound();
    }

    final profile = await loadPublicProfileBySlug(
      client: client,
      slug: normalizedSlug,
    );

    if (profile == null) {
      return PublicCollectorSurfaceResult.notFound();
    }

    if (!profile.vaultSharingEnabled) {
      return PublicCollectorSurfaceResult.unavailable();
    }

    final results = await Future.wait<dynamic>([
      _loadCollectionCards(client: client, userId: profile.userId),
      _loadInPlayCards(
        client: client,
        ownerUserId: profile.userId,
        ownerSlug: profile.slug,
      ),
    ]);

    final collectionCards = results[0] as List<PublicCollectorCard>;
    final inPlayCards = results[1] as List<PublicCollectorCard>;

    if (collectionCards.isEmpty && inPlayCards.isEmpty) {
      return PublicCollectorSurfaceResult.empty(profile);
    }

    return PublicCollectorSurfaceResult.success(
      profile: profile,
      collectionCards: collectionCards,
      inPlayCards: inPlayCards,
    );
  }

  static Future<List<PublicCollectorCard>> loadCollectionCardsForUser({
    required SupabaseClient client,
    required String userId,
  }) {
    return _loadCollectionCards(client: client, userId: userId);
  }

  static Future<List<PublicCollectorRelationshipRow>> fetchFollowerCollectors({
    required SupabaseClient client,
    required String userId,
  }) {
    return _fetchRelationshipCollectors(
      client: client,
      userId: userId,
      ownerColumn: 'followed_user_id',
      relatedColumn: 'follower_user_id',
    );
  }

  static Future<List<PublicCollectorRelationshipRow>> fetchFollowingCollectors({
    required SupabaseClient client,
    required String userId,
  }) {
    return _fetchRelationshipCollectors(
      client: client,
      userId: userId,
      ownerColumn: 'follower_user_id',
      relatedColumn: 'followed_user_id',
    );
  }

  static String normalizePokemonSlug(String value) {
    return _normalizePokemonMatchValue(value);
  }

  static String formatPokemonSlugLabel(String value) {
    final normalized = normalizePokemonSlug(value);
    if (normalized.isEmpty) {
      return 'Pokemon';
    }

    return normalized
        .split(' ')
        .where((token) => token.isNotEmpty)
        .map(
          (token) =>
              '${token.substring(0, 1).toUpperCase()}${token.substring(1)}',
        )
        .join(' ');
  }

  static List<PublicCollectorCard> filterCardsByPokemonSlug({
    required List<PublicCollectorCard> cards,
    required String pokemonSlug,
  }) {
    final normalizedPokemon = normalizePokemonSlug(pokemonSlug);
    if (normalizedPokemon.isEmpty) {
      return const [];
    }

    return cards.where((card) {
      return _normalizePokemonMatchValue(card.name).contains(normalizedPokemon);
    }).toList();
  }

  static Future<List<PublicCollectorCard>> _loadCollectionCards({
    required SupabaseClient client,
    required String userId,
  }) async {
    final sharedRows = await client
        .from('shared_cards')
        .select('card_id,gv_id')
        .eq('user_id', userId)
        .eq('is_shared', true)
        .order('gv_id', ascending: true);

    final normalizedRows = (sharedRows as List<dynamic>)
        .map((row) => Map<String, dynamic>.from(row as Map))
        .map(
          (row) => (
            cardPrintId: _cleanText(row['card_id']),
            gvId: _cleanText(row['gv_id']),
          ),
        )
        .where((row) => row.cardPrintId.isNotEmpty && row.gvId.isNotEmpty)
        .toList();

    if (normalizedRows.isEmpty) {
      return const [];
    }

    final cardPrintIds = normalizedRows
        .map((row) => row.cardPrintId)
        .toSet()
        .toList();
    final results = await Future.wait<dynamic>([
      client
          .from('card_prints')
          .select(
            'id,gv_id,name,set_code,number,rarity,image_url,image_alt_url',
          )
          .inFilter('id', cardPrintIds),
      CardSurfacePricingService.fetchByCardPrintIds(
        client: client,
        cardPrintIds: cardPrintIds,
      ),
      _fetchPrimarySharedGvviByCardId(
        client: client,
        ownerUserId: userId,
        cardPrintIds: cardPrintIds,
      ),
    ]);

    final cardPrintRows = results[0] as List<dynamic>;
    final pricingById = results[1] as Map<String, CardSurfacePricingData>;
    final gvviByCardId = results[2] as Map<String, String>;

    final cardPrintById = <String, Map<String, dynamic>>{};
    for (final rawRow in cardPrintRows) {
      final row = Map<String, dynamic>.from(rawRow as Map);
      final id = _cleanText(row['id']);
      if (id.isNotEmpty) {
        cardPrintById[id] = row;
      }
    }

    return normalizedRows
        .map((row) {
          final cardPrint = cardPrintById[row.cardPrintId];
          if (cardPrint == null) {
            return null;
          }

          final gvId = _cleanText(cardPrint['gv_id']).isNotEmpty
              ? _cleanText(cardPrint['gv_id'])
              : row.gvId;

          if (gvId.isEmpty) {
            return null;
          }

          return PublicCollectorCard(
            cardPrintId: row.cardPrintId,
            gvId: gvId,
            name: _cleanText(cardPrint['name']).isNotEmpty
                ? _cleanText(cardPrint['name'])
                : 'Unknown card',
            gvviId: gvviByCardId[row.cardPrintId],
            setCode: _normalizeOptionalText(cardPrint['set_code']),
            number: _cleanText(cardPrint['number']).isNotEmpty
                ? _cleanText(cardPrint['number'])
                : '—',
            rarity: _normalizeOptionalText(cardPrint['rarity']),
            imageUrl: _bestPublicImageUrl(
              primary: cardPrint['image_url'],
              fallback: cardPrint['image_alt_url'],
            ),
            pricing: pricingById[row.cardPrintId],
          );
        })
        .whereType<PublicCollectorCard>()
        .toList();
  }

  static Future<List<PublicCollectorCard>> _loadInPlayCards({
    required SupabaseClient client,
    required String ownerUserId,
    required String ownerSlug,
  }) async {
    final rawRows = await client
        .from('v_card_stream_v1')
        .select(
          'vault_item_id,card_print_id,intent,condition_label,created_at,gv_id,name,set_code,set_name,number,image_url',
        )
        .eq('owner_slug', ownerSlug)
        .order('created_at', ascending: false)
        .order('vault_item_id', ascending: false);

    final streamRows = (rawRows as List<dynamic>)
        .map((row) => Map<String, dynamic>.from(row as Map))
        .where(
          (row) =>
              _cleanText(row['card_print_id']).isNotEmpty &&
              _cleanText(row['gv_id']).isNotEmpty,
        )
        .toList();

    if (streamRows.isEmpty) {
      return const [];
    }

    final cardPrintIds = streamRows
        .map((row) => _cleanText(row['card_print_id']))
        .where((value) => value.isNotEmpty)
        .toSet()
        .toList();

    final results = await Future.wait<dynamic>([
      client
          .from('card_prints')
          .select('id,rarity,image_url,image_alt_url')
          .inFilter('id', cardPrintIds),
      CardSurfacePricingService.fetchByCardPrintIds(
        client: client,
        cardPrintIds: cardPrintIds,
      ),
      _fetchPublicDiscoverableCopiesByCardId(
        client: client,
        ownerUserIds: <String>[ownerUserId],
        cardPrintIds: cardPrintIds,
      ),
    ]);

    final cardPrintRows = results[0] as List<dynamic>;
    final pricingById = results[1] as Map<String, CardSurfacePricingData>;
    final copiesByCardPrintId =
        results[2] as Map<String, List<PublicCollectorCopy>>;

    final cardPrintById = <String, Map<String, dynamic>>{};
    for (final rawRow in cardPrintRows) {
      final row = Map<String, dynamic>.from(rawRow as Map);
      final id = _cleanText(row['id']);
      if (id.isNotEmpty) {
        cardPrintById[id] = row;
      }
    }

    return streamRows.map((row) {
      final cardPrintId = _cleanText(row['card_print_id']);
      final gvId = _cleanText(row['gv_id']);
      final cardPrint = cardPrintById[cardPrintId];
      final copies = copiesByCardPrintId[cardPrintId] ?? const [];
      String? primaryGvviId;
      for (final copy in copies) {
        final gvviId = _normalizeOptionalText(copy.gvviId);
        if (gvviId != null) {
          primaryGvviId = gvviId;
          break;
        }
      }

      return PublicCollectorCard(
        cardPrintId: cardPrintId,
        gvId: gvId,
        name: _cleanText(row['name']).isNotEmpty
            ? _cleanText(row['name'])
            : 'Unknown card',
        vaultItemId: _normalizeOptionalText(row['vault_item_id']),
        gvviId: primaryGvviId,
        setName: _normalizeOptionalText(row['set_name']),
        setCode: _normalizeOptionalText(row['set_code']),
        number: _cleanText(row['number']).isNotEmpty
            ? _cleanText(row['number'])
            : '—',
        rarity: _normalizeOptionalText(cardPrint?['rarity']),
        imageUrl: _bestPublicImageUrl(
          primary: row['image_url'] ?? cardPrint?['image_url'],
          fallback: cardPrint?['image_alt_url'],
        ),
        conditionLabel: _normalizeOptionalText(row['condition_label']),
        intent: _normalizePublicIntent(row['intent']),
        pricing: pricingById[cardPrintId],
        inPlayCopies: copies,
      );
    }).toList();
  }

  static Future<Map<String, String>> _fetchPrimarySharedGvviByCardId({
    required SupabaseClient client,
    required String ownerUserId,
    required List<String> cardPrintIds,
  }) async {
    final normalizedOwnerUserId = _cleanText(ownerUserId);
    final normalizedCardIds = cardPrintIds
        .map(_cleanText)
        .where((value) => value.isNotEmpty)
        .toSet()
        .toList();
    if (normalizedOwnerUserId.isEmpty || normalizedCardIds.isEmpty) {
      return const <String, String>{};
    }

    try {
      final rows = await client.rpc(
        'public_shared_card_primary_gvvi_v1',
        params: {
          'p_owner_user_id': normalizedOwnerUserId,
          'p_card_print_ids': normalizedCardIds,
        },
      );

      final out = <String, String>{};
      for (final raw in rows as List<dynamic>) {
        final row = Map<String, dynamic>.from(raw as Map);
        final cardPrintId = _cleanText(row['card_print_id']);
        final gvviId = _cleanText(row['gv_vi_id']);
        if (cardPrintId.isEmpty || gvviId.isEmpty) {
          continue;
        }
        out[cardPrintId] = gvviId;
      }
      return out;
    } catch (_) {
      return const <String, String>{};
    }
  }

  static Future<Map<String, List<PublicCollectorCopy>>>
  _fetchPublicDiscoverableCopiesByCardId({
    required SupabaseClient client,
    required List<String> ownerUserIds,
    required List<String> cardPrintIds,
  }) async {
    final normalizedOwnerUserIds = ownerUserIds
        .map(_cleanText)
        .where((value) => value.isNotEmpty)
        .toSet()
        .toList();
    final normalizedCardIds = cardPrintIds
        .map(_cleanText)
        .where((value) => value.isNotEmpty)
        .toSet()
        .toList();

    if (normalizedOwnerUserIds.isEmpty || normalizedCardIds.isEmpty) {
      return const <String, List<PublicCollectorCopy>>{};
    }

    try {
      final rows = await client.rpc(
        'public_discoverable_card_copies_v1',
        params: {
          'p_owner_user_ids': normalizedOwnerUserIds,
          'p_card_print_ids': normalizedCardIds,
        },
      );

      final copiesByCardId = <String, List<PublicCollectorCopy>>{};
      for (final raw in rows as List<dynamic>) {
        final row = Map<String, dynamic>.from(raw as Map);
        final cardPrintId = _cleanText(row['card_print_id']);
        final instanceId = _cleanText(row['instance_id']);
        final vaultItemId = _cleanText(row['legacy_vault_item_id']);
        final intent = _normalizePublicIntent(row['intent']);
        if (cardPrintId.isEmpty ||
            instanceId.isEmpty ||
            vaultItemId.isEmpty ||
            intent == null) {
          continue;
        }

        final copies = copiesByCardId[cardPrintId] ?? <PublicCollectorCopy>[];
        copies.add(
          PublicCollectorCopy(
            instanceId: instanceId,
            vaultItemId: vaultItemId,
            intent: intent,
            gvviId: _normalizeOptionalText(row['gv_vi_id']),
            conditionLabel: _normalizeOptionalText(row['condition_label']),
            isGraded: row['is_graded'] == true,
            gradeCompany: _normalizeOptionalText(row['grade_company']),
            gradeValue: _normalizeOptionalText(row['grade_value']),
            gradeLabel: _normalizeOptionalText(row['grade_label']),
            certNumber: _normalizeOptionalText(row['cert_number']),
            createdAt: _normalizeOptionalText(row['created_at']),
          ),
        );
        copiesByCardId[cardPrintId] = copies;
      }

      for (final entry in copiesByCardId.entries) {
        entry.value.sort((left, right) {
          final leftTime = DateTime.tryParse(
            left.createdAt ?? '',
          )?.millisecondsSinceEpoch;
          final rightTime = DateTime.tryParse(
            right.createdAt ?? '',
          )?.millisecondsSinceEpoch;
          return (rightTime ?? -1).compareTo(leftTime ?? -1);
        });
      }

      return copiesByCardId;
    } catch (_) {
      return const <String, List<PublicCollectorCopy>>{};
    }
  }

  static Future<({int followingCount, int followerCount})> _loadFollowCounts({
    required SupabaseClient client,
    required String userId,
  }) async {
    final normalizedUserId = _cleanText(userId);
    if (normalizedUserId.isEmpty) {
      return (followingCount: 0, followerCount: 0);
    }

    final results = await Future.wait<dynamic>([
      client
          .from('collector_follows')
          .select('id')
          .eq('follower_user_id', normalizedUserId),
      client
          .from('collector_follows')
          .select('id')
          .eq('followed_user_id', normalizedUserId),
    ]);

    final followingRows = results[0] as List<dynamic>;
    final followerRows = results[1] as List<dynamic>;

    return (
      followingCount: followingRows.length,
      followerCount: followerRows.length,
    );
  }

  static Future<List<PublicCollectorRelationshipRow>>
  _fetchRelationshipCollectors({
    required SupabaseClient client,
    required String userId,
    required String ownerColumn,
    required String relatedColumn,
  }) async {
    final normalizedUserId = _cleanText(userId);
    if (normalizedUserId.isEmpty) {
      return const [];
    }

    final followRows = await client
        .from('collector_follows')
        .select('$relatedColumn,created_at')
        .eq(ownerColumn, normalizedUserId)
        .order('created_at', ascending: false);

    final normalizedRows = (followRows as List<dynamic>)
        .map((row) => Map<String, dynamic>.from(row as Map))
        .toList();

    final relatedUserIds = normalizedRows
        .map((row) => _cleanText(row[relatedColumn]))
        .where((value) => value.isNotEmpty)
        .toSet()
        .toList();

    if (relatedUserIds.isEmpty) {
      return const [];
    }

    final profileRows = await client
        .from('public_profiles')
        .select('user_id,slug,display_name,public_profile_enabled,avatar_path')
        .inFilter('user_id', relatedUserIds)
        .eq('public_profile_enabled', true);

    final profileByUserId = <String, Map<String, dynamic>>{};
    for (final rawRow in profileRows as List<dynamic>) {
      final row = Map<String, dynamic>.from(rawRow as Map);
      final relatedUserId = _cleanText(row['user_id']);
      final slug = _normalizeSlug(row['slug']);
      if (relatedUserId.isEmpty || slug.isEmpty) {
        continue;
      }
      profileByUserId[relatedUserId] = row;
    }

    return normalizedRows
        .map((row) {
          final relatedUserId = _cleanText(row[relatedColumn]);
          final profile = profileByUserId[relatedUserId];
          if (relatedUserId.isEmpty || profile == null) {
            return null;
          }

          final slug = _normalizeSlug(profile['slug']);
          final displayName = _cleanText(profile['display_name']);
          if (slug.isEmpty || displayName.isEmpty) {
            return null;
          }

          return PublicCollectorRelationshipRow(
            userId: relatedUserId,
            slug: slug,
            displayName: displayName,
            avatarUrl: _resolveProfileMediaUrl(profile['avatar_path']),
            followedAt: DateTime.tryParse(_cleanText(row['created_at'])),
          );
        })
        .whereType<PublicCollectorRelationshipRow>()
        .toList();
  }

  static String _normalizeSlug(dynamic value) {
    return _cleanText(value).toLowerCase();
  }

  static String? _normalizeOptionalText(dynamic value) {
    final cleaned = _cleanText(value);
    return cleaned.isEmpty ? null : cleaned;
  }

  static String _cleanText(dynamic value) {
    return (value ?? '').toString().trim();
  }

  static String _normalizePokemonMatchValue(String value) {
    return value
        .trim()
        .toLowerCase()
        .replaceAll(RegExp(r'[-_]+'), ' ')
        .replaceAll(RegExp(r'[^a-z0-9\s]+'), ' ')
        .replaceAll(RegExp(r'\s+'), ' ')
        .trim();
  }

  static String? _normalizePublicIntent(dynamic value) {
    final normalized = _cleanText(value).toLowerCase();
    switch (normalized) {
      case 'trade':
      case 'sell':
      case 'showcase':
        return normalized;
      default:
        return null;
    }
  }

  static String? _bestPublicImageUrl({
    required dynamic primary,
    required dynamic fallback,
  }) {
    final primaryUrl = _normalizeHttpUrl(primary);
    if (primaryUrl != null) {
      return primaryUrl;
    }

    return _normalizeHttpUrl(fallback);
  }

  static String? _normalizeHttpUrl(dynamic value) {
    final url = _cleanText(value);
    if (url.isEmpty) {
      return null;
    }

    final parsed = Uri.tryParse(url);
    if (parsed == null) {
      return null;
    }

    if (parsed.scheme != 'http' && parsed.scheme != 'https') {
      return null;
    }

    return url;
  }

  static String? _resolveProfileMediaUrl(dynamic rawPath) {
    final normalizedPath = _cleanText(rawPath).replaceFirst(RegExp(r'^/+'), '');
    final baseUrl = supabaseUrl.replaceFirst(RegExp(r'/+$'), '');

    if (normalizedPath.isEmpty || baseUrl.isEmpty) {
      return null;
    }

    final encodedPath = normalizedPath
        .split('/')
        .where((segment) => segment.isNotEmpty)
        .map(Uri.encodeComponent)
        .join('/');

    return '$baseUrl/storage/v1/object/public/${Uri.encodeComponent(_profileMediaBucket)}/$encodedPath';
  }
}
