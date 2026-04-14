import 'package:supabase_flutter/supabase_flutter.dart';

import '../../secrets.dart';

class FollowingCollector {
  const FollowingCollector({
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

class FollowingService {
  static const _profileMediaBucket = 'profile-media';

  static Future<List<FollowingCollector>> fetchFollowingCollectors({
    required SupabaseClient client,
    required String userId,
  }) async {
    final normalizedUserId = _clean(userId);
    if (normalizedUserId.isEmpty) {
      return const [];
    }

    final followRows = await client
        .from('collector_follows')
        .select('followed_user_id,created_at')
        .eq('follower_user_id', normalizedUserId)
        .order('created_at', ascending: false);

    final normalizedRows = (followRows as List<dynamic>)
        .map((row) => Map<String, dynamic>.from(row as Map))
        .toList();

    final followedUserIds = normalizedRows
        .map((row) => _clean(row['followed_user_id']))
        .where((value) => value.isNotEmpty)
        .toSet()
        .toList();

    if (followedUserIds.isEmpty) {
      return const [];
    }

    final profileRows = await client
        .from('public_profiles')
        .select('user_id,slug,display_name,public_profile_enabled,avatar_path')
        .inFilter('user_id', followedUserIds)
        .eq('public_profile_enabled', true);

    final profileByUserId = <String, Map<String, dynamic>>{};
    for (final rawRow in profileRows as List<dynamic>) {
      final row = Map<String, dynamic>.from(rawRow as Map);
      final userId = _clean(row['user_id']);
      final slug = _clean(row['slug']);
      final displayName = _clean(row['display_name']);
      if (userId.isEmpty || slug.isEmpty || displayName.isEmpty) {
        continue;
      }
      profileByUserId[userId] = row;
    }

    return normalizedRows
        .map((row) {
          final followedUserId = _clean(row['followed_user_id']);
          final profile = profileByUserId[followedUserId];
          if (followedUserId.isEmpty || profile == null) {
            return null;
          }

          final slug = _clean(profile['slug']);
          final displayName = _clean(profile['display_name']);
          if (slug.isEmpty || displayName.isEmpty) {
            return null;
          }

          return FollowingCollector(
            userId: followedUserId,
            slug: slug,
            displayName: displayName,
            avatarUrl: _resolveProfileMediaUrl(profile['avatar_path']),
            followedAt: DateTime.tryParse(_clean(row['created_at'])),
          );
        })
        .whereType<FollowingCollector>()
        .toList();
  }

  static String _clean(dynamic value) => (value ?? '').toString().trim();

  static String? _resolveProfileMediaUrl(dynamic value) {
    final normalized = _clean(value).replaceFirst(RegExp(r'^/+'), '');
    if (normalized.isEmpty) {
      return null;
    }

    final baseUrl = supabaseUrl.replaceFirst(RegExp(r'/+$'), '');
    if (baseUrl.isEmpty) {
      return null;
    }

    final encodedPath = normalized
        .split('/')
        .where((segment) => segment.isNotEmpty)
        .map(Uri.encodeComponent)
        .join('/');

    return '$baseUrl/storage/v1/object/public/${Uri.encodeComponent(_profileMediaBucket)}/$encodedPath';
  }
}
