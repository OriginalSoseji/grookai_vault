import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../secrets.dart';

enum ProfileMediaKind { avatar, banner }

class AccountProfileData {
  const AccountProfileData({
    required this.userId,
    required this.email,
    required this.slug,
    required this.displayName,
    required this.publicProfileEnabled,
    required this.vaultSharingEnabled,
    this.avatarPath,
    this.bannerPath,
  });

  final String userId;
  final String email;
  final String slug;
  final String displayName;
  final bool publicProfileEnabled;
  final bool vaultSharingEnabled;
  final String? avatarPath;
  final String? bannerPath;

  AccountProfileData copyWith({
    String? slug,
    String? displayName,
    bool? publicProfileEnabled,
    bool? vaultSharingEnabled,
    String? avatarPath,
    bool clearAvatarPath = false,
    String? bannerPath,
    bool clearBannerPath = false,
  }) {
    return AccountProfileData(
      userId: userId,
      email: email,
      slug: slug ?? this.slug,
      displayName: displayName ?? this.displayName,
      publicProfileEnabled: publicProfileEnabled ?? this.publicProfileEnabled,
      vaultSharingEnabled: vaultSharingEnabled ?? this.vaultSharingEnabled,
      avatarPath: clearAvatarPath ? null : avatarPath ?? this.avatarPath,
      bannerPath: clearBannerPath ? null : bannerPath ?? this.bannerPath,
    );
  }
}

class AccountProfileService {
  static const String profileMediaBucket = 'profile-media';

  static Future<AccountProfileData> loadCurrentProfile({
    required SupabaseClient client,
  }) async {
    final user = client.auth.currentUser;
    if (user == null) {
      throw const AuthException('Sign in required.');
    }

    final row = await client
        .from('public_profiles')
        .select(
          'slug,display_name,public_profile_enabled,vault_sharing_enabled,avatar_path,banner_path',
        )
        .eq('user_id', user.id)
        .maybeSingle();

    final map = row == null ? null : Map<String, dynamic>.from(row);
    return AccountProfileData(
      userId: user.id,
      email: user.email ?? 'Email unavailable',
      slug: _trimmed(map?['slug']),
      displayName: _trimmed(map?['display_name']),
      publicProfileEnabled: map?['public_profile_enabled'] == true,
      vaultSharingEnabled: map?['vault_sharing_enabled'] == true,
      avatarPath: _nullableTrimmed(map?['avatar_path']),
      bannerPath: _nullableTrimmed(map?['banner_path']),
    );
  }

  static AccountProfileData normalize(AccountProfileData data) {
    final publicProfileEnabled = data.publicProfileEnabled;
    return data.copyWith(
      slug: normalizeSlug(data.slug),
      displayName: normalizeDisplayName(data.displayName),
      vaultSharingEnabled: publicProfileEnabled
          ? data.vaultSharingEnabled
          : false,
      avatarPath: normalizeMediaPath(data.avatarPath),
      bannerPath: normalizeMediaPath(data.bannerPath),
    );
  }

  static Map<String, String> validate(AccountProfileData data) {
    final normalized = normalize(data);
    final errors = <String, String>{};

    if (normalized.slug.isEmpty) {
      errors['slug'] = 'Enter a profile URL slug.';
    } else if (!_slugPattern.hasMatch(normalized.slug)) {
      errors['slug'] = 'Use lowercase letters, numbers, and hyphens only.';
    }

    if (normalized.displayName.isEmpty) {
      errors['displayName'] = 'Enter a display name.';
    }

    if (normalized.vaultSharingEnabled && !normalized.publicProfileEnabled) {
      errors['form'] =
          'Enable your public profile before enabling vault sharing.';
    }

    final avatarPath = normalized.avatarPath;
    if (avatarPath != null &&
        !isOwnedMediaPath(
          normalized.userId,
          ProfileMediaKind.avatar,
          avatarPath,
        )) {
      errors['avatarPath'] = 'Profile photo path is invalid for this account.';
    }

    final bannerPath = normalized.bannerPath;
    if (bannerPath != null &&
        !isOwnedMediaPath(
          normalized.userId,
          ProfileMediaKind.banner,
          bannerPath,
        )) {
      errors['bannerPath'] = 'Banner path is invalid for this account.';
    }

    return errors;
  }

  static Future<AccountProfileData> save({
    required SupabaseClient client,
    required AccountProfileData data,
  }) async {
    final normalized = normalize(data);
    final payload = {
      'user_id': normalized.userId,
      'slug': normalized.slug,
      'display_name': normalized.displayName,
      'public_profile_enabled': normalized.publicProfileEnabled,
      'vault_sharing_enabled': normalized.vaultSharingEnabled,
      'avatar_path': normalized.avatarPath,
      'banner_path': normalized.bannerPath,
    };

    final row = await client
        .from('public_profiles')
        .upsert(payload, onConflict: 'user_id')
        .select(
          'slug,display_name,public_profile_enabled,vault_sharing_enabled,avatar_path,banner_path',
        )
        .single();

    final map = Map<String, dynamic>.from(row);
    return AccountProfileData(
      userId: normalized.userId,
      email: normalized.email,
      slug: _trimmed(map['slug']),
      displayName: _trimmed(map['display_name']),
      publicProfileEnabled: map['public_profile_enabled'] == true,
      vaultSharingEnabled: map['vault_sharing_enabled'] == true,
      avatarPath: _nullableTrimmed(map['avatar_path']),
      bannerPath: _nullableTrimmed(map['banner_path']),
    );
  }

  static Future<String> uploadProfileMedia({
    required SupabaseClient client,
    required String userId,
    required ProfileMediaKind kind,
    required XFile file,
  }) async {
    final bytes = await file.readAsBytes();
    final path = buildMediaPath(userId, kind);
    final extension = file.path.split('.').last.toLowerCase();
    final contentType = switch (extension) {
      'png' => 'image/png',
      'webp' => 'image/webp',
      _ => 'image/jpeg',
    };

    await client.storage
        .from(profileMediaBucket)
        .uploadBinary(
          path,
          bytes,
          fileOptions: FileOptions(upsert: true, contentType: contentType),
        );

    return path;
  }

  static String buildMediaPath(String userId, ProfileMediaKind kind) {
    return 'profiles/$userId/${kind.name}/current';
  }

  static bool isOwnedMediaPath(
    String userId,
    ProfileMediaKind kind,
    String path,
  ) {
    return normalizeMediaPath(path) == buildMediaPath(userId, kind);
  }

  static String normalizeSlug(String value) {
    return value
        .trim()
        .toLowerCase()
        .replaceAll(RegExp(r'[\s_]+'), '-')
        .replaceAll(RegExp(r'-+'), '-')
        .replaceAll(RegExp(r'^-+|-+$'), '');
  }

  static String normalizeDisplayName(String value) => value.trim();

  static String? normalizeMediaPath(String? value) {
    final normalized = _trimmed(value).replaceFirst(RegExp(r'^/+'), '');
    return normalized.isEmpty ? null : normalized;
  }

  static String? resolveMediaUrl(String? path) {
    final normalized = normalizeMediaPath(path);
    final baseUrl = supabaseUrl.replaceFirst(RegExp(r'/+$'), '');
    if (normalized == null || baseUrl.isEmpty) {
      return null;
    }

    final encodedPath = normalized
        .split('/')
        .where((segment) => segment.isNotEmpty)
        .map(Uri.encodeComponent)
        .join('/');

    return '$baseUrl/storage/v1/object/public/${Uri.encodeComponent(profileMediaBucket)}/$encodedPath';
  }

  static String _trimmed(dynamic value) => (value ?? '').toString().trim();

  static String? _nullableTrimmed(dynamic value) {
    final normalized = _trimmed(value);
    return normalized.isEmpty ? null : normalized;
  }

  static final RegExp _slugPattern = RegExp(r'^[a-z0-9]+(?:-[a-z0-9]+)*$');
}
