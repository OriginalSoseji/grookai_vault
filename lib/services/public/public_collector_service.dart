import 'package:supabase_flutter/supabase_flutter.dart';

import '../../secrets.dart';
import '../../utils/display_image_contract.dart';
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
    this.variantKey,
    this.printedIdentityModifier,
    this.setIdentityModel,
    this.pricing,
    this.priceDisplayMode,
    this.askingPriceAmount,
    this.askingPriceCurrency,
    this.publicNote,
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
  final String? variantKey;
  final String? printedIdentityModifier;
  final String? setIdentityModel;
  final CardSurfacePricingData? pricing;
  final String? priceDisplayMode;
  final double? askingPriceAmount;
  final String? askingPriceCurrency;
  final String? publicNote;
  final List<PublicCollectorCopy> inPlayCopies;
}

class PublicCollectorSectionSummary {
  const PublicCollectorSectionSummary({
    required this.id,
    required this.name,
    required this.position,
    required this.itemCount,
  });

  final String id;
  final String name;
  final int position;
  final int itemCount;
}

class CollectorWallView {
  const CollectorWallView({
    required this.wallCards,
    required this.sections,
    this.sectionCards = const <String, List<PublicCollectorCard>>{},
  });

  static const empty = CollectorWallView(
    wallCards: <PublicCollectorCard>[],
    sections: <PublicCollectorSectionSummary>[],
  );

  final List<PublicCollectorCard> wallCards;
  final List<PublicCollectorSectionSummary> sections;
  final Map<String, List<PublicCollectorCard>> sectionCards;

  List<PublicCollectorCard> cardsForSection(String sectionId) {
    return sectionCards[PublicCollectorService._normalizeSectionId(
          sectionId,
        )] ??
        const <PublicCollectorCard>[];
  }

  CollectorWallView withSectionCards({
    required String sectionId,
    required List<PublicCollectorCard> cards,
  }) {
    return CollectorWallView(
      wallCards: wallCards,
      sections: sections,
      sectionCards: <String, List<PublicCollectorCard>>{
        ...sectionCards,
        PublicCollectorService._normalizeSectionId(sectionId): cards,
      },
    );
  }
}

class _PublicCollectorWallCardSettings {
  const _PublicCollectorWallCardSettings({
    this.publicNote,
    this.priceDisplayMode,
  });

  final String? publicNote;
  final String? priceDisplayMode;
}

class _PublicCollectorManualPrice {
  const _PublicCollectorManualPrice({
    this.askingPriceAmount,
    this.askingPriceCurrency,
  });

  final double? askingPriceAmount;
  final String? askingPriceCurrency;
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

class PublicCollectorOwnershipSnapshot {
  const PublicCollectorOwnershipSnapshot({
    required this.cardPrintId,
    required this.ownedCount,
    required this.onWall,
    required this.inPlay,
    this.primaryVaultItemId,
    this.primaryGvviId,
  });

  const PublicCollectorOwnershipSnapshot.empty({required this.cardPrintId})
    : ownedCount = 0,
      onWall = false,
      inPlay = false,
      primaryVaultItemId = null,
      primaryGvviId = null;

  final String cardPrintId;
  final int ownedCount;
  final bool onWall;
  final bool inPlay;
  final String? primaryVaultItemId;
  final String? primaryGvviId;
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
    this.wallView = CollectorWallView.empty,
  });

  final PublicCollectorSurfaceState state;
  final PublicCollectorProfile? profile;
  final List<PublicCollectorCard> collectionCards;
  final List<PublicCollectorCard> inPlayCards;
  final CollectorWallView wallView;

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
    CollectorWallView? wallView,
  }) {
    return PublicCollectorSurfaceResult._(
      state: PublicCollectorSurfaceState.success,
      profile: profile,
      collectionCards: collectionCards,
      inPlayCards: inPlayCards,
      wallView:
          wallView ??
          CollectorWallView(
            wallCards: inPlayCards,
            sections: const <PublicCollectorSectionSummary>[],
          ),
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

    final wallView = await loadCollectorWallViewBySlug(
      client: client,
      slug: profile.slug,
    );

    if (wallView.wallCards.isEmpty && wallView.sections.isEmpty) {
      return PublicCollectorSurfaceResult.empty(profile);
    }

    return PublicCollectorSurfaceResult.success(
      profile: profile,
      collectionCards: const <PublicCollectorCard>[],
      inPlayCards: wallView.wallCards,
      wallView: wallView,
    );
  }

  static Future<CollectorWallView> loadCollectorWallViewBySlug({
    required SupabaseClient client,
    required String slug,
  }) async {
    final normalizedSlug = _normalizeSlug(slug);
    if (normalizedSlug.isEmpty) {
      return CollectorWallView.empty;
    }

    final results = await Future.wait<dynamic>([
      loadWallCardsBySlug(client: client, slug: normalizedSlug),
      loadPublicWallSectionsBySlug(client: client, slug: normalizedSlug),
    ]);

    return CollectorWallView(
      wallCards: results[0] as List<PublicCollectorCard>,
      sections: results[1] as List<PublicCollectorSectionSummary>,
    );
  }

  static Future<List<PublicCollectorSectionSummary>>
  loadPublicWallSectionsBySlug({
    required SupabaseClient client,
    required String slug,
  }) async {
    final normalizedSlug = _normalizeSlug(slug);
    if (normalizedSlug.isEmpty) {
      return const <PublicCollectorSectionSummary>[];
    }

    final rows = await client
        .from('v_wall_sections_v1')
        // LOCK: App public rail renders Wall first, then active custom sections only.
        // LOCK: is_public is compatibility data, not a product visibility gate.
        .select('id,name,position,item_count,is_active')
        .eq('owner_slug', normalizedSlug)
        .eq('is_active', true)
        .order('position', ascending: true)
        .limit(20);

    return (rows as List<dynamic>)
        .map((row) => Map<String, dynamic>.from(row as Map))
        .map((row) {
          final id = _normalizeSectionId(row['id']);
          final name = _cleanText(row['name']);
          if (id.isEmpty || name.isEmpty || row['is_active'] != true) {
            return null;
          }

          return PublicCollectorSectionSummary(
            id: id,
            name: name,
            position: _toCount(row['position']),
            itemCount: _toCount(row['item_count']),
          );
        })
        .whereType<PublicCollectorSectionSummary>()
        .toList();
  }

  static Future<List<PublicCollectorCard>> loadWallCardsBySlug({
    required SupabaseClient client,
    required String slug,
  }) async {
    final normalizedSlug = _normalizeSlug(slug);
    if (normalizedSlug.isEmpty) {
      return const <PublicCollectorCard>[];
    }

    final rows = await client
        .from('v_wall_cards_v1')
        // LOCK: Wall cards use public-safe instance rows and display_image_url first.
        .select(
          'instance_id,gv_vi_id,vault_item_id,card_print_id,intent,condition_label,is_graded,grade_company,grade_value,grade_label,created_at,gv_id,name,set_code,set_name,number,image_url,representative_image_url,display_image_url,public_note',
        )
        .eq('owner_slug', normalizedSlug)
        .order('created_at', ascending: false);

    return _mapWallRowsToCards(
      rows: (rows as List<dynamic>)
          .map((row) => Map<String, dynamic>.from(row as Map))
          .toList(),
      client: client,
    );
  }

  static Future<List<PublicCollectorCard>> loadSectionCardsBySlug({
    required SupabaseClient client,
    required String slug,
    required String sectionId,
  }) async {
    final normalizedSlug = _normalizeSlug(slug);
    final normalizedSectionId = _normalizeSectionId(sectionId);
    if (normalizedSlug.isEmpty || normalizedSectionId.isEmpty) {
      return const <PublicCollectorCard>[];
    }

    final rows = await client
        .from('v_section_cards_v1')
        // LOCK: Section cards are exact-copy public rows and load on demand.
        .select(
          'section_id,section_name,section_position,instance_id,gv_vi_id,vault_item_id,card_print_id,intent,condition_label,is_graded,grade_company,grade_value,grade_label,section_added_at,instance_created_at,gv_id,name,set_code,set_name,number,image_url,representative_image_url,display_image_url,public_note',
        )
        .eq('owner_slug', normalizedSlug)
        .eq('section_id', normalizedSectionId)
        .order('section_added_at', ascending: false);

    return _mapSectionRowsToCards(
      rows: (rows as List<dynamic>)
          .map((row) => Map<String, dynamic>.from(row as Map))
          .toList(),
      client: client,
    );
  }

  static Future<PublicCollectorSectionSummary> createOwnerWallSection({
    required SupabaseClient client,
    required String ownerUserId,
    required String name,
  }) async {
    final userId = _cleanText(client.auth.currentUser?.id);
    final normalizedOwnerUserId = _cleanText(ownerUserId);
    final normalizedName = _cleanText(name).replaceAll(RegExp(r'\s+'), ' ');
    if (userId.isEmpty || userId != normalizedOwnerUserId) {
      throw Exception('Sign in required.');
    }
    if (normalizedName.isEmpty) {
      throw Exception('Section name is required.');
    }
    if (normalizedName.toLowerCase() == 'wall') {
      throw Exception('Wall is managed automatically.');
    }

    final existingRows = await client
        .from('wall_sections')
        .select('id,name,position')
        .eq('user_id', userId)
        .order('position', ascending: true);
    final existing = (existingRows as List<dynamic>)
        .map((row) => Map<String, dynamic>.from(row as Map))
        .toList();
    if (existing.any(
      (row) =>
          _cleanText(row['name']).toLowerCase() == normalizedName.toLowerCase(),
    )) {
      throw Exception('You already have a section with that name.');
    }

    final nextPosition =
        existing.fold<int>(-1, (max, row) {
          final position = _toCount(row['position']);
          return position > max ? position : max;
        }) +
        1;

    final inserted = await client
        .from('wall_sections')
        .insert({
          'user_id': userId,
          'name': normalizedName.length > 80
              ? normalizedName.substring(0, 80)
              : normalizedName,
          'position': nextPosition,
          'is_active': true,
          'is_public': true,
        })
        .select('id,name,position')
        .single();
    final row = Map<String, dynamic>.from(inserted as Map);

    return PublicCollectorSectionSummary(
      id: _normalizeSectionId(row['id']),
      name: _cleanText(row['name']),
      position: _toCount(row['position']),
      itemCount: 0,
    );
  }

  static Future<List<PublicCollectorCard>> loadCollectionCardsForUser({
    required SupabaseClient client,
    required String userId,
  }) {
    return _loadCollectionCards(client: client, userId: userId);
  }

  static Future<PublicCollectorOwnershipSnapshot>
  resolvePublicOwnershipSnapshot({
    required SupabaseClient client,
    required String ownerUserId,
    required String cardPrintId,
  }) async {
    final normalizedOwnerUserId = _cleanText(ownerUserId);
    final normalizedCardPrintId = _cleanText(cardPrintId);
    if (normalizedOwnerUserId.isEmpty || normalizedCardPrintId.isEmpty) {
      return PublicCollectorOwnershipSnapshot.empty(
        cardPrintId: normalizedCardPrintId,
      );
    }

    final entry = await resolveOwnEntry(
      client: client,
      userId: normalizedOwnerUserId,
    );
    final slug = _normalizeSlug(entry.slug);
    if (entry.state != PublicCollectorEntryState.ready || slug.isEmpty) {
      return PublicCollectorOwnershipSnapshot.empty(
        cardPrintId: normalizedCardPrintId,
      );
    }

    final surface = await loadBySlug(client: client, slug: slug);
    if (surface.state == PublicCollectorSurfaceState.notFound ||
        surface.state == PublicCollectorSurfaceState.unavailable) {
      return PublicCollectorOwnershipSnapshot.empty(
        cardPrintId: normalizedCardPrintId,
      );
    }

    final wallMatches = surface.wallView.wallCards
        .where((card) => card.cardPrintId == normalizedCardPrintId)
        .toList();
    if (wallMatches.isEmpty) {
      return PublicCollectorOwnershipSnapshot.empty(
        cardPrintId: normalizedCardPrintId,
      );
    }

    final allMatches = <PublicCollectorCard>[...wallMatches];
    final allCopies = allMatches.expand((card) => card.inPlayCopies).toList();

    PublicCollectorCopy? primaryCopy;
    for (final copy in allCopies) {
      if (_cleanText(copy.gvviId).isNotEmpty) {
        primaryCopy = copy;
        break;
      }
    }

    PublicCollectorCard primaryCard = allMatches.first;
    for (final card in allMatches) {
      if (_cleanText(card.gvviId).isNotEmpty) {
        primaryCard = card;
        break;
      }
    }

    final primaryVaultItemId = _normalizeOptionalText(
      primaryCopy?.vaultItemId ?? primaryCard.vaultItemId,
    );
    final primaryGvviId = _normalizeOptionalText(
      primaryCopy?.gvviId ?? primaryCard.gvviId,
    );
    final ownedCount = allCopies.isNotEmpty ? allCopies.length : 1;
    final inPlay =
        wallMatches.isNotEmpty ||
        allCopies.any((copy) => _normalizePublicIntent(copy.intent) != 'hold');

    return PublicCollectorOwnershipSnapshot(
      cardPrintId: normalizedCardPrintId,
      ownedCount: ownedCount,
      onWall: wallMatches.isNotEmpty || primaryGvviId != null,
      inPlay: inPlay,
      primaryVaultItemId: primaryVaultItemId,
      primaryGvviId: primaryGvviId,
    );
  }

  static Future<List<PublicCollectorRelationshipRow>> fetchFollowerCollectors({
    required SupabaseClient client,
    required String userId,
  }) {
    return _fetchRelationshipCollectors(
      client: client,
      userId: userId,
      mode: 'followers',
    );
  }

  static Future<List<PublicCollectorRelationshipRow>> fetchFollowingCollectors({
    required SupabaseClient client,
    required String userId,
  }) {
    return _fetchRelationshipCollectors(
      client: client,
      userId: userId,
      mode: 'following',
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

  static Future<List<PublicCollectorCard>> _mapWallRowsToCards({
    required SupabaseClient client,
    required List<Map<String, dynamic>> rows,
  }) async {
    if (rows.isEmpty) {
      return const <PublicCollectorCard>[];
    }

    final cardPrintIds = rows
        .map((row) => _cleanText(row['card_print_id']))
        .where((value) => value.isNotEmpty)
        .toSet()
        .toList();
    final pricingById = await CardSurfacePricingService.fetchByCardPrintIds(
      client: client,
      cardPrintIds: cardPrintIds,
    );
    final grouped = <String, PublicCollectorCard>{};
    final latestAtByCardId = <String, int>{};

    for (final row in rows) {
      final cardPrintId = _cleanText(row['card_print_id']);
      final gvId = _cleanText(row['gv_id']);
      final intent = _normalizePublicIntent(row['intent']);
      if (cardPrintId.isEmpty || gvId.isEmpty || intent == null) {
        continue;
      }

      final createdAt = _firstNonEmpty([
        row['created_at'],
        row['instance_created_at'],
        row['section_added_at'],
      ]);
      final createdMs =
          DateTime.tryParse(createdAt ?? '')?.millisecondsSinceEpoch ?? -1;
      final copy = _copyFromWallRow(row, intent);
      final existing = grouped[cardPrintId];

      if (existing == null) {
        grouped[cardPrintId] = _cardFromWallRow(
          row,
          pricing: pricingById[cardPrintId],
          copies: copy == null ? const <PublicCollectorCopy>[] : [copy],
        );
        latestAtByCardId[cardPrintId] = createdMs;
        continue;
      }

      final nextCopies = copy == null
          ? existing.inPlayCopies
          : <PublicCollectorCopy>[...existing.inPlayCopies, copy];
      final shouldUsePrimary =
          createdMs > (latestAtByCardId[cardPrintId] ?? -1);
      if (shouldUsePrimary) {
        latestAtByCardId[cardPrintId] = createdMs;
      }

      grouped[cardPrintId] = _cardFromWallRow(
        shouldUsePrimary ? row : _rowFromCard(existing),
        pricing: pricingById[cardPrintId],
        copies: nextCopies,
      );
    }

    final cards = grouped.values.toList();
    cards.sort((left, right) => left.name.compareTo(right.name));
    return cards;
  }

  static Future<List<PublicCollectorCard>> _mapSectionRowsToCards({
    required SupabaseClient client,
    required List<Map<String, dynamic>> rows,
  }) async {
    if (rows.isEmpty) {
      return const <PublicCollectorCard>[];
    }

    final cardPrintIds = rows
        .map((row) => _cleanText(row['card_print_id']))
        .where((value) => value.isNotEmpty)
        .toSet()
        .toList();
    final pricingById = await CardSurfacePricingService.fetchByCardPrintIds(
      client: client,
      cardPrintIds: cardPrintIds,
    );

    return rows
        .map((row) {
          final cardPrintId = _cleanText(row['card_print_id']);
          final intent = _normalizePublicIntent(row['intent']);
          final copy = intent == null ? null : _copyFromWallRow(row, intent);
          return _cardFromWallRow(
            row,
            pricing: pricingById[cardPrintId],
            copies: copy == null ? const <PublicCollectorCopy>[] : [copy],
          );
        })
        .where((card) => card.cardPrintId.isNotEmpty && card.gvId.isNotEmpty)
        .toList();
  }

  static PublicCollectorCard _cardFromWallRow(
    Map<String, dynamic> row, {
    required CardSurfacePricingData? pricing,
    required List<PublicCollectorCopy> copies,
  }) {
    final cardPrintId = _cleanText(row['card_print_id']);
    final gvId = _cleanText(row['gv_id']);
    final intent = _normalizePublicIntent(row['intent']);

    return PublicCollectorCard(
      cardPrintId: cardPrintId,
      gvId: gvId,
      name: _cleanText(row['name']).isEmpty
          ? 'Unknown card'
          : _cleanText(row['name']),
      vaultItemId: _normalizeOptionalText(row['vault_item_id']),
      gvviId: _normalizeOptionalText(row['gv_vi_id']),
      setName:
          _normalizeOptionalText(row['set_name']) ??
          _normalizeOptionalText(row['set_code']),
      setCode: _normalizeOptionalText(row['set_code']),
      number: _cleanText(row['number']).isNotEmpty
          ? _cleanText(row['number'])
          : '—',
      imageUrl: _displayImageUrl(row),
      conditionLabel: _normalizeOptionalText(row['condition_label']),
      intent: intent,
      pricing: pricing,
      publicNote: _normalizeOptionalText(row['public_note']),
      inPlayCopies: copies,
    );
  }

  static PublicCollectorCopy? _copyFromWallRow(
    Map<String, dynamic> row,
    String intent,
  ) {
    final instanceId = _cleanText(row['instance_id']);
    final vaultItemId = _cleanText(row['vault_item_id']);
    if (instanceId.isEmpty || vaultItemId.isEmpty) {
      return null;
    }

    return PublicCollectorCopy(
      instanceId: instanceId,
      vaultItemId: vaultItemId,
      intent: intent,
      gvviId: _normalizeOptionalText(row['gv_vi_id']),
      conditionLabel: _normalizeOptionalText(row['condition_label']),
      isGraded: row['is_graded'] == true,
      gradeCompany: _normalizeOptionalText(row['grade_company']),
      gradeValue: _normalizeOptionalText(row['grade_value']),
      gradeLabel: _normalizeOptionalText(row['grade_label']),
      createdAt: _firstNonEmpty([
        row['section_added_at'],
        row['instance_created_at'],
        row['created_at'],
      ]),
    );
  }

  static Map<String, dynamic> _rowFromCard(PublicCollectorCard card) {
    return <String, dynamic>{
      'card_print_id': card.cardPrintId,
      'gv_id': card.gvId,
      'name': card.name,
      'set_code': card.setCode,
      'set_name': card.setName,
      'number': card.number,
      'image_url': card.imageUrl,
      'condition_label': card.conditionLabel,
      'intent': card.intent,
      'vault_item_id': card.vaultItemId,
      'gv_vi_id': card.gvviId,
      'public_note': card.publicNote,
    };
  }

  static Future<List<PublicCollectorCard>> _loadCollectionCards({
    required SupabaseClient client,
    required String userId,
  }) async {
    final sharedRows = await client
        .from('shared_cards')
        .select('card_id,gv_id,public_note,price_display_mode')
        .eq('user_id', userId)
        .eq('is_shared', true)
        .order('gv_id', ascending: true);

    final normalizedRows = (sharedRows as List<dynamic>)
        .map((row) => Map<String, dynamic>.from(row as Map))
        .map(
          (row) => (
            cardPrintId: _cleanText(row['card_id']),
            gvId: _cleanText(row['gv_id']),
            publicNote: _normalizeOptionalText(row['public_note']),
            priceDisplayMode: _normalizePriceDisplayMode(
              row['price_display_mode'],
            ),
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
            'id,gv_id,name,set_code,number,rarity,variant_key,printed_identity_modifier,image_url,image_alt_url,representative_image_url,set:sets(name,identity_model)',
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
    final manualPriceByGvviId = await _fetchPublicManualPricesByGvviId(
      client: client,
      gvviIds: normalizedRows
          .where((row) => row.priceDisplayMode == 'my_price')
          .map((row) => gvviByCardId[row.cardPrintId])
          .whereType<String>()
          .toList(),
    );

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

          final primaryGvviId = gvviByCardId[row.cardPrintId];
          final manualPrice = primaryGvviId == null
              ? null
              : manualPriceByGvviId[primaryGvviId];

          return PublicCollectorCard(
            cardPrintId: row.cardPrintId,
            gvId: gvId,
            name: _cleanText(cardPrint['name']).isNotEmpty
                ? _cleanText(cardPrint['name'])
                : 'Unknown card',
            gvviId: primaryGvviId,
            setName: _normalizeOptionalText(
              (cardPrint['set'] as Map?)?['name'],
            ),
            setCode: _normalizeOptionalText(cardPrint['set_code']),
            number: _cleanText(cardPrint['number']).isNotEmpty
                ? _cleanText(cardPrint['number'])
                : '—',
            rarity: _normalizeOptionalText(cardPrint['rarity']),
            variantKey: _normalizeOptionalText(cardPrint['variant_key']),
            printedIdentityModifier: _normalizeOptionalText(
              cardPrint['printed_identity_modifier'],
            ),
            setIdentityModel: _normalizeOptionalText(
              (cardPrint['set'] as Map?)?['identity_model'],
            ),
            imageUrl: _displayImageUrl(cardPrint),
            pricing: pricingById[row.cardPrintId],
            priceDisplayMode: row.priceDisplayMode,
            askingPriceAmount: manualPrice?.askingPriceAmount,
            askingPriceCurrency: manualPrice?.askingPriceCurrency,
            publicNote: row.publicNote,
          );
        })
        .whereType<PublicCollectorCard>()
        .toList();
  }

  // Legacy v_card_stream path is retained only for compatibility with older
  // helpers; public profile rendering now uses v_wall_cards_v1.
  // ignore: unused_element
  static Future<List<PublicCollectorCard>> _loadInPlayCards({
    required SupabaseClient client,
    required String ownerUserId,
    required String ownerSlug,
  }) async {
    final rawRows = await client
        .from('v_card_stream_v1')
        // LOCK: Stream rows are compatibility input; display images resolve after card_prints enrichment.
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
          .select(
            'id,rarity,variant_key,printed_identity_modifier,image_url,image_alt_url,representative_image_url,set:sets(identity_model)',
          )
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
      _fetchSharedCardWallSettingsByCardId(
        client: client,
        ownerUserId: ownerUserId,
        cardPrintIds: cardPrintIds,
      ),
      _fetchPrimarySharedGvviByCardId(
        client: client,
        ownerUserId: ownerUserId,
        cardPrintIds: cardPrintIds,
      ),
    ]);

    final cardPrintRows = results[0] as List<dynamic>;
    final pricingById = results[1] as Map<String, CardSurfacePricingData>;
    final copiesByCardPrintId =
        results[2] as Map<String, List<PublicCollectorCopy>>;
    final wallSettingsByCardPrintId =
        results[3] as Map<String, _PublicCollectorWallCardSettings>;
    final primarySharedGvviByCardPrintId = results[4] as Map<String, String>;
    final manualPriceByGvviId = await _fetchPublicManualPricesByGvviId(
      client: client,
      gvviIds: cardPrintIds
          .where(
            (cardPrintId) =>
                wallSettingsByCardPrintId[cardPrintId]?.priceDisplayMode ==
                'my_price',
          )
          .map((cardPrintId) => primarySharedGvviByCardPrintId[cardPrintId])
          .whereType<String>()
          .toList(),
    );

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
      final wallSettings = wallSettingsByCardPrintId[cardPrintId];
      final primaryGvviId = primarySharedGvviByCardPrintId[cardPrintId];
      final manualPrice = primaryGvviId == null
          ? null
          : manualPriceByGvviId[primaryGvviId];

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
        variantKey: _normalizeOptionalText(cardPrint?['variant_key']),
        printedIdentityModifier: _normalizeOptionalText(
          cardPrint?['printed_identity_modifier'],
        ),
        setIdentityModel: _normalizeOptionalText(
          (cardPrint?['set'] as Map?)?['identity_model'],
        ),
        imageUrl: resolveDisplayImageUrl(
          displayImageUrl: row['display_image_url'],
          imageUrl: row['image_url'] ?? cardPrint?['image_url'],
          imageAltUrl: cardPrint?['image_alt_url'],
          representativeImageUrl: cardPrint?['representative_image_url'],
        ),
        conditionLabel: _normalizeOptionalText(row['condition_label']),
        intent: _normalizePublicIntent(row['intent']),
        pricing: pricingById[cardPrintId],
        priceDisplayMode: wallSettings?.priceDisplayMode,
        askingPriceAmount: manualPrice?.askingPriceAmount,
        askingPriceCurrency: manualPrice?.askingPriceCurrency,
        publicNote: wallSettings?.publicNote,
        inPlayCopies: copies,
      );
    }).toList();
  }

  static Future<Map<String, _PublicCollectorWallCardSettings>>
  _fetchSharedCardWallSettingsByCardId({
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
      return const <String, _PublicCollectorWallCardSettings>{};
    }

    final rows = await client
        .from('shared_cards')
        .select('card_id,public_note,price_display_mode')
        .eq('user_id', normalizedOwnerUserId)
        .eq('is_shared', true)
        .inFilter('card_id', normalizedCardIds);

    final out = <String, _PublicCollectorWallCardSettings>{};
    for (final raw in rows as List<dynamic>) {
      final row = Map<String, dynamic>.from(raw as Map);
      final cardPrintId = _cleanText(row['card_id']);
      if (cardPrintId.isEmpty) {
        continue;
      }
      out[cardPrintId] = _PublicCollectorWallCardSettings(
        publicNote: _normalizeOptionalText(row['public_note']),
        priceDisplayMode: _normalizePriceDisplayMode(row['price_display_mode']),
      );
    }
    return out;
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

  static Future<Map<String, _PublicCollectorManualPrice>>
  _fetchPublicManualPricesByGvviId({
    required SupabaseClient client,
    required List<String> gvviIds,
  }) async {
    final normalizedGvviIds = gvviIds
        .map(_cleanText)
        .where((value) => value.isNotEmpty)
        .toSet()
        .toList();
    if (normalizedGvviIds.isEmpty) {
      return const <String, _PublicCollectorManualPrice>{};
    }

    final entries = await Future.wait(
      normalizedGvviIds.map((gvviId) async {
        try {
          final raw = await client.rpc(
            'public_vault_instance_detail_v1',
            params: {'p_gv_vi_id': gvviId},
          );
          if (raw is! Map) {
            return null;
          }
          final data = Map<String, dynamic>.from(raw);
          if (_normalizePricingMode(data['pricing_mode']) != 'asking') {
            return null;
          }
          final amount = _toMoney(data['asking_price_amount']);
          if (amount == null) {
            return null;
          }
          return MapEntry(
            gvviId,
            _PublicCollectorManualPrice(
              askingPriceAmount: amount,
              askingPriceCurrency: _normalizeCurrency(
                data['asking_price_currency'],
              ),
            ),
          );
        } catch (_) {
          return null;
        }
      }),
    );

    final out = <String, _PublicCollectorManualPrice>{};
    for (final entry in entries) {
      if (entry != null) {
        out[entry.key] = entry.value;
      }
    }
    return out;
  }

  static Future<({int followingCount, int followerCount})> _loadFollowCounts({
    required SupabaseClient client,
    required String userId,
  }) async {
    final normalizedUserId = _cleanText(userId);
    if (normalizedUserId.isEmpty) {
      return (followingCount: 0, followerCount: 0);
    }

    // FOLLOWER_COUNT_FIX_V1
    // Fixed public profile relationship counts to use the profile owner's true
    // relationship rows.
    final raw = await client.rpc(
      'public_collector_follow_counts_v1',
      params: {'p_user_id': normalizedUserId},
    );
    final row = switch (raw) {
      final List<dynamic> rows when rows.isNotEmpty && rows.first is Map =>
        Map<String, dynamic>.from(rows.first as Map),
      final Map map => Map<String, dynamic>.from(map),
      _ => const <String, dynamic>{},
    };

    return (
      followingCount: _toCount(row['following_count']),
      followerCount: _toCount(row['follower_count']),
    );
  }

  static Future<List<PublicCollectorRelationshipRow>>
  _fetchRelationshipCollectors({
    required SupabaseClient client,
    required String userId,
    required String mode,
  }) async {
    final normalizedUserId = _cleanText(userId);
    if (normalizedUserId.isEmpty) {
      return const [];
    }

    // PUBLIC_RELATIONSHIP_LIST_FIX_V1
    // Uses a public-safe relationship source so followers/following lists
    // match public profile truth.
    final raw = await client.rpc(
      'public_collector_relationship_rows_v1',
      params: {'p_user_id': normalizedUserId, 'p_mode': mode},
    );
    if (raw is! List) {
      return const [];
    }

    return raw
        .whereType<Map>()
        .map((row) => Map<String, dynamic>.from(row))
        .map((row) {
          final relatedUserId = _cleanText(row['user_id']);
          final slug = _normalizeSlug(row['slug']);
          final displayName = _cleanText(row['display_name']);
          if (slug.isEmpty || displayName.isEmpty) {
            return null;
          }

          return PublicCollectorRelationshipRow(
            userId: relatedUserId,
            slug: slug,
            displayName: displayName,
            avatarUrl: _resolveProfileMediaUrl(row['avatar_path']),
            followedAt: DateTime.tryParse(_cleanText(row['followed_at'])),
          );
        })
        .whereType<PublicCollectorRelationshipRow>()
        .toList();
  }

  static String _normalizeSlug(dynamic value) {
    return _cleanText(value).toLowerCase();
  }

  static String _normalizeSectionId(dynamic value) {
    return _cleanText(value);
  }

  static String? _normalizeOptionalText(dynamic value) {
    final cleaned = _cleanText(value);
    return cleaned.isEmpty ? null : cleaned;
  }

  static String _cleanText(dynamic value) {
    return (value ?? '').toString().trim();
  }

  static String? _firstNonEmpty(Iterable<dynamic> values) {
    for (final value in values) {
      final normalized = _cleanText(value);
      if (normalized.isNotEmpty) {
        return normalized;
      }
    }
    return null;
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

  static String? _normalizePriceDisplayMode(dynamic value) {
    switch (_cleanText(value).toLowerCase()) {
      case 'grookai':
        return 'grookai';
      case 'my_price':
        return 'my_price';
      case 'hidden':
        return 'hidden';
      default:
        return null;
    }
  }

  static String? _normalizePricingMode(dynamic value) {
    switch (_cleanText(value).toLowerCase()) {
      case 'market':
        return 'market';
      case 'asking':
        return 'asking';
      default:
        return null;
    }
  }

  static double? _toMoney(dynamic value) {
    if (value is num) {
      final normalized = value.toDouble();
      return normalized.isFinite
          ? double.parse(normalized.toStringAsFixed(2))
          : null;
    }
    final parsed = double.tryParse(_cleanText(value));
    if (parsed == null || !parsed.isFinite) {
      return null;
    }
    return double.parse(parsed.toStringAsFixed(2));
  }

  static int _toCount(dynamic value) {
    if (value is num) {
      return value.toInt();
    }
    return int.tryParse(_cleanText(value)) ?? 0;
  }

  static String? _normalizeCurrency(dynamic value) {
    final normalized = _cleanText(value).toUpperCase();
    if (normalized.length != 3) {
      return null;
    }
    return normalized;
  }

  static String? _displayImageUrl(Map<String, dynamic>? row) {
    return resolveDisplayImageUrlFromRow(row);
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
