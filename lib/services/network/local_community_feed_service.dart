import 'package:supabase_flutter/supabase_flutter.dart';

import '../identity/catalog_artwork_resolution.dart';
import '../identity/display_identity.dart';
import '../../utils/display_image_contract.dart';

const bool kLocalCommunityFeedV1Enabled = bool.fromEnvironment(
  'LOCAL_COMMUNITY_FEED_V1_ENABLED',
  defaultValue: true,
);

class LocalCommunityFeedPage {
  const LocalCommunityFeedPage({
    required this.rows,
    required this.isAuthenticated,
  });

  const LocalCommunityFeedPage.unauthenticated()
    : rows = const [],
      isAuthenticated = false;

  final List<LocalCommunityFeedRow> rows;
  final bool isAuthenticated;
}

class LocalCommunityFeedRow {
  const LocalCommunityFeedRow({
    required this.feedItemId,
    required this.sourceType,
    required this.ownerSlug,
    required this.ownerDisplayName,
    required this.gvId,
    required this.cardName,
    required this.setCode,
    required this.setName,
    required this.cardNumber,
    required this.intent,
    required this.imageUrl,
    required this.displayImageKind,
    required this.localityLabel,
    required this.distanceBucket,
    required this.relationshipContext,
    required this.viewerWishlistMatch,
    required this.matchReason,
    required this.createdAt,
    required this.routeTarget,
  });

  final String feedItemId;
  final String sourceType;
  final String ownerSlug;
  final String ownerDisplayName;
  final String gvId;
  final String cardName;
  final String setCode;
  final String setName;
  final String cardNumber;
  final String intent;
  final String? imageUrl;
  final String displayImageKind;
  final String localityLabel;
  final String distanceBucket;
  final String relationshipContext;
  final bool viewerWishlistMatch;
  final String matchReason;
  final DateTime? createdAt;
  final String routeTarget;

  CatalogArtworkResolution get artwork {
    final sourceImageUrl = normalizeDisplayImageUrl(imageUrl);
    if (isCollectorUploadedCardImage(sourceImageUrl)) {
      return CatalogArtworkResolution(
        primaryImageUrl: sourceImageUrl,
        fallbackImageUrl: buildCanonicalCardImageUrl(gvId),
      );
    }
    return resolveCatalogArtwork(gvId: gvId, providerImageUrl: sourceImageUrl);
  }

  String get sourceLabel {
    switch (sourceType.toLowerCase()) {
      case 'wall_card':
        return 'Wall';
      case 'trade':
        return 'Trade';
      case 'sell':
        return 'Sell';
      case 'showcase':
        return 'Showcase';
      default:
        final normalizedIntent = intent.trim().toLowerCase();
        if (normalizedIntent == 'trade') return 'Trade';
        if (normalizedIntent == 'sell') return 'Sell';
        if (normalizedIntent == 'showcase') return 'Showcase';
        if (normalizedIntent == 'wall') return 'Wall';
        return 'Network';
    }
  }

  bool get isFollowing => relationshipContext.toLowerCase() == 'following';

  String get displaySetLine {
    final parts = <String>[
      if (setName.isNotEmpty) setName,
      if (cardNumber.isNotEmpty) '#$cardNumber',
    ];
    return parts.join(' • ');
  }

  static LocalCommunityFeedRow? fromJson(Map<String, dynamic> json) {
    final ownerSlug = _text(json['owner_slug']).toLowerCase();
    final gvId = _text(json['gv_id']);
    final cardName = _text(json['card_name']);
    if (ownerSlug.isEmpty || gvId.isEmpty || cardName.isEmpty) {
      return null;
    }

    final ownerName = _text(json['owner_display_name']);
    return LocalCommunityFeedRow(
      feedItemId: _text(json['feed_item_id']),
      sourceType: _text(json['source_type']),
      ownerSlug: ownerSlug,
      ownerDisplayName: ownerName.isEmpty ? ownerSlug : ownerName,
      gvId: gvId,
      cardName: cardName,
      setCode: _text(json['set_code']),
      setName: _text(json['set_name']),
      cardNumber: _text(json['card_number']),
      intent: _text(json['intent']),
      imageUrl: resolveDisplayImageUrlFromRow(json),
      displayImageKind: _text(json['display_image_kind']),
      localityLabel: _text(json['locality_label']),
      distanceBucket: _text(json['distance_bucket']),
      relationshipContext: _text(json['relationship_context']),
      viewerWishlistMatch: json['viewer_wishlist_match'] == true,
      matchReason: _text(json['match_reason']),
      createdAt: _date(json['created_at']),
      routeTarget: _text(json['route_target']),
    );
  }
}

class LocalCommunityFeedService {
  const LocalCommunityFeedService({required SupabaseClient client})
    : _client = client;

  final SupabaseClient _client;

  Future<LocalCommunityFeedPage> fetchNearby({int limit = 40}) async {
    if (_client.auth.currentUser == null) {
      return const LocalCommunityFeedPage.unauthenticated();
    }

    final normalizedLimit = limit.clamp(1, 80).toInt();
    final response = await _client.rpc(
      'local_community_feed_v2',
      params: <String, dynamic>{'p_limit': normalizedLimit},
    );

    if (response is! List) {
      return const LocalCommunityFeedPage(rows: [], isAuthenticated: true);
    }

    final rawRows = response
        .whereType<Map>()
        .map((row) => Map<String, dynamic>.from(row))
        .toList(growable: false);
    final identityByGvId = await _loadIdentityByGvId(rawRows);
    final rows = rawRows
        .map((row) {
          final gvId = _text(row['gv_id']);
          final identity = identityByGvId[gvId];
          if (identity != null) {
            row['card_name'] = resolveDisplayIdentityFromFields(
              name: identity['name'] ?? row['card_name'],
              variantKey: _text(identity['variant_key']),
              printedIdentityModifier: _text(
                identity['printed_identity_modifier'],
              ),
            ).displayName;
          } else if (gvId.isNotEmpty) {
            final baseName = _text(row['card_name']);
            row['card_name'] = baseName.isEmpty ? gvId : '$baseName · $gvId';
          }
          return LocalCommunityFeedRow.fromJson(row);
        })
        .whereType<LocalCommunityFeedRow>()
        .toList(growable: false);

    return LocalCommunityFeedPage(rows: rows, isAuthenticated: true);
  }

  Future<Map<String, Map<String, dynamic>>> _loadIdentityByGvId(
    List<Map<String, dynamic>> rows,
  ) async {
    final gvIds = rows
        .map((row) => _text(row['gv_id']))
        .where((value) => value.isNotEmpty)
        .toSet()
        .toList(growable: false);
    if (gvIds.isEmpty) return const <String, Map<String, dynamic>>{};
    try {
      final result = await _client
          .from('card_prints')
          .select('gv_id,name,variant_key,printed_identity_modifier')
          .inFilter('gv_id', gvIds);
      return <String, Map<String, dynamic>>{
        for (final raw in result.whereType<Map>())
          if (_text(raw['gv_id']).isNotEmpty)
            _text(raw['gv_id']): Map<String, dynamic>.from(raw),
      };
    } catch (_) {
      return const <String, Map<String, dynamic>>{};
    }
  }
}

String _text(dynamic value) => (value ?? '').toString().trim();

DateTime? _date(dynamic value) {
  final normalized = _text(value);
  if (normalized.isEmpty) return null;
  return DateTime.tryParse(normalized);
}
