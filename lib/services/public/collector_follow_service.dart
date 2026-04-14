import 'package:supabase_flutter/supabase_flutter.dart';

class CollectorFollowToggleResult {
  const CollectorFollowToggleResult({
    required this.ok,
    required this.isFollowing,
    required this.message,
  });

  final bool ok;
  final bool isFollowing;
  final String message;
}

class CollectorFollowService {
  static Future<bool> fetchFollowState({
    required SupabaseClient client,
    required String followerUserId,
    required String followedUserId,
  }) async {
    final normalizedFollowerUserId = _clean(followerUserId);
    final normalizedFollowedUserId = _clean(followedUserId);

    if (normalizedFollowerUserId.isEmpty ||
        normalizedFollowedUserId.isEmpty ||
        normalizedFollowerUserId == normalizedFollowedUserId) {
      return false;
    }

    final rows = await client
        .from('collector_follows')
        .select('id')
        .eq('follower_user_id', normalizedFollowerUserId)
        .eq('followed_user_id', normalizedFollowedUserId)
        .limit(1);

    return (rows as List<dynamic>).isNotEmpty;
  }

  static Future<Set<String>> fetchFollowStateMap({
    required SupabaseClient client,
    required String followerUserId,
    required Iterable<String> followedUserIds,
  }) async {
    final normalizedFollowerUserId = _clean(followerUserId);
    final normalizedFollowedUserIds = followedUserIds
        .map(_clean)
        .where(
          (value) =>
              value.isNotEmpty &&
              value.toLowerCase() != normalizedFollowerUserId,
        )
        .toSet()
        .toList();

    if (normalizedFollowerUserId.isEmpty || normalizedFollowedUserIds.isEmpty) {
      return <String>{};
    }

    final rows = await client
        .from('collector_follows')
        .select('followed_user_id')
        .eq('follower_user_id', normalizedFollowerUserId)
        .inFilter('followed_user_id', normalizedFollowedUserIds);

    return (rows as List<dynamic>)
        .map((row) => _clean((row as Map<String, dynamic>)['followed_user_id']))
        .where((value) => value.isNotEmpty)
        .toSet();
  }

  static Future<CollectorFollowToggleResult> followCollector({
    required SupabaseClient client,
    required String followedUserId,
  }) async {
    final user = client.auth.currentUser;
    if (user == null) {
      return const CollectorFollowToggleResult(
        ok: false,
        isFollowing: false,
        message: 'Sign in required.',
      );
    }

    final normalizedFollowedUserId = _clean(followedUserId);
    if (normalizedFollowedUserId.isEmpty) {
      return const CollectorFollowToggleResult(
        ok: false,
        isFollowing: false,
        message: 'Collector could not be followed.',
      );
    }

    if (normalizedFollowedUserId == user.id) {
      return const CollectorFollowToggleResult(
        ok: false,
        isFollowing: false,
        message: 'You cannot follow yourself.',
      );
    }

    final profile = await client
        .from('public_profiles')
        .select('user_id,public_profile_enabled')
        .eq('user_id', normalizedFollowedUserId)
        .eq('public_profile_enabled', true)
        .maybeSingle();

    if (profile == null) {
      return const CollectorFollowToggleResult(
        ok: false,
        isFollowing: false,
        message: 'Collector could not be followed.',
      );
    }

    final alreadyFollowing = await fetchFollowState(
      client: client,
      followerUserId: user.id,
      followedUserId: normalizedFollowedUserId,
    );
    if (alreadyFollowing) {
      return const CollectorFollowToggleResult(
        ok: true,
        isFollowing: true,
        message: 'Collector followed.',
      );
    }

    await client.from('collector_follows').insert({
      'follower_user_id': user.id,
      'followed_user_id': normalizedFollowedUserId,
    });

    return const CollectorFollowToggleResult(
      ok: true,
      isFollowing: true,
      message: 'Collector followed.',
    );
  }

  static Future<CollectorFollowToggleResult> unfollowCollector({
    required SupabaseClient client,
    required String followedUserId,
  }) async {
    final user = client.auth.currentUser;
    if (user == null) {
      return const CollectorFollowToggleResult(
        ok: false,
        isFollowing: false,
        message: 'Sign in required.',
      );
    }

    final normalizedFollowedUserId = _clean(followedUserId);
    if (normalizedFollowedUserId.isEmpty ||
        normalizedFollowedUserId == user.id) {
      return const CollectorFollowToggleResult(
        ok: false,
        isFollowing: true,
        message: 'Collector could not be unfollowed.',
      );
    }

    await client
        .from('collector_follows')
        .delete()
        .eq('follower_user_id', user.id)
        .eq('followed_user_id', normalizedFollowedUserId);

    return const CollectorFollowToggleResult(
      ok: true,
      isFollowing: false,
      message: 'Collector unfollowed.',
    );
  }

  static String _clean(dynamic value) => (value ?? '').toString().trim();
}
