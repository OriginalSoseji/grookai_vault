import 'dart:async';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../services/account/account_profile_service.dart';
import '../../services/network/founder_insight_service.dart';
import '../../services/public/public_collector_service.dart';
import '../../widgets/founder/founder_market_signals_section.dart';
import 'following_screen.dart';
import 'import_collection_screen.dart';
import 'submit_missing_card_screen.dart';

enum AccountHubAction { wall, vault, network, sets, messages, signOut }

enum _AccountSegment { profile, vendorTools }

class AccountScreen extends StatefulWidget {
  const AccountScreen({super.key});

  @override
  State<AccountScreen> createState() => _AccountScreenState();
}

class _AccountScreenState extends State<AccountScreen> {
  final SupabaseClient _client = Supabase.instance.client;
  final ImagePicker _imagePicker = ImagePicker();
  final TextEditingController _displayNameController = TextEditingController();
  final TextEditingController _slugController = TextEditingController();

  bool _loading = true;
  bool _saving = false;
  String? _error;
  String? _statusMessage;
  bool _statusIsSuccess = true;
  Map<String, String> _fieldErrors = const {};
  ProfileMediaKind? _busyMediaKind;
  _AccountSegment _activeSegment = _AccountSegment.profile;
  bool _founderInsightsLoading = false;
  String? _founderInsightsError;
  FounderInsightBundle? _founderInsights;

  AccountProfileData? _profile;
  bool _publicProfileEnabled = false;
  bool _vaultSharingEnabled = false;
  String? _avatarPath;
  String? _bannerPath;
  PublicCollectorEntryState _wallState =
      PublicCollectorEntryState.missingProfile;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _displayNameController.dispose();
    _slugController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final profile = await AccountProfileService.loadCurrentProfile(
        client: _client,
      );
      final wallEntry = await PublicCollectorService.resolveOwnEntry(
        client: _client,
        userId: profile.userId,
      );

      if (!mounted) {
        return;
      }

      _hydrateProfile(profile, wallEntry.state);
      setState(() {
        if (!_isFounderUser && _activeSegment == _AccountSegment.vendorTools) {
          _activeSegment = _AccountSegment.profile;
        }
        _loading = false;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }

      setState(() {
        _loading = false;
        _error = error is Error ? error.toString() : 'Unable to load account.';
      });
    }
  }

  bool get _isFounderUser =>
      FounderInsightService.isFounderUser(_client.auth.currentUser);

  void _hydrateProfile(
    AccountProfileData profile,
    PublicCollectorEntryState wallState,
  ) {
    _profile = profile;
    _wallState = wallState;
    _displayNameController.text = profile.displayName;
    _slugController.text = profile.slug;
    _publicProfileEnabled = profile.publicProfileEnabled;
    _vaultSharingEnabled = profile.vaultSharingEnabled;
    _avatarPath = profile.avatarPath;
    _bannerPath = profile.bannerPath;
  }

  AccountProfileData? _buildDraft() {
    final profile = _profile;
    if (profile == null) {
      return null;
    }

    return profile.copyWith(
      displayName: _displayNameController.text,
      slug: _slugController.text,
      publicProfileEnabled: _publicProfileEnabled,
      vaultSharingEnabled: _vaultSharingEnabled,
      avatarPath: _avatarPath,
      bannerPath: _bannerPath,
    );
  }

  void _setStatus(String message, {required bool success}) {
    setState(() {
      _statusMessage = message;
      _statusIsSuccess = success;
    });
  }

  Future<void> _save({
    String? nextAvatarPath,
    bool clearAvatarPath = false,
    String? nextBannerPath,
    bool clearBannerPath = false,
    String? successMessage,
  }) async {
    final draft = _buildDraft();
    if (draft == null) {
      return;
    }

    final nextDraft = draft.copyWith(
      avatarPath: nextAvatarPath,
      clearAvatarPath: clearAvatarPath,
      bannerPath: nextBannerPath,
      clearBannerPath: clearBannerPath,
    );
    final errors = AccountProfileService.validate(nextDraft);
    if (errors.isNotEmpty) {
      setState(() {
        _fieldErrors = errors;
      });
      _setStatus('Fix the highlighted fields before saving.', success: false);
      return;
    }

    setState(() {
      _saving = true;
      _fieldErrors = const {};
    });

    try {
      final saved = await AccountProfileService.save(
        client: _client,
        data: nextDraft,
      );
      final wallEntry = await PublicCollectorService.resolveOwnEntry(
        client: _client,
        userId: saved.userId,
      );

      if (!mounted) {
        return;
      }

      setState(() {
        _hydrateProfile(saved, wallEntry.state);
        _saving = false;
      });
      _setStatus(
        successMessage ?? 'Public profile settings saved.',
        success: true,
      );
    } on PostgrestException catch (error) {
      if (!mounted) {
        return;
      }

      setState(() {
        _saving = false;
        _fieldErrors = error.code == '23505'
            ? const {'slug': 'That profile URL is already taken.'}
            : const {};
      });
      _setStatus(
        error.code == '23505'
            ? 'That profile URL is already taken.'
            : 'Public profile settings could not be saved.',
        success: false,
      );
    } catch (error) {
      if (!mounted) {
        return;
      }

      setState(() {
        _saving = false;
      });
      _setStatus(
        error is Error
            ? error.toString()
            : 'Public profile settings could not be saved.',
        success: false,
      );
    }
  }

  Future<void> _pickMedia(ProfileMediaKind kind) async {
    final profile = _profile;
    if (profile == null || _saving || _busyMediaKind != null) {
      return;
    }

    final pickedFile = await _imagePicker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 92,
      maxWidth: kind == ProfileMediaKind.banner ? 2200 : 1200,
    );

    if (!mounted || pickedFile == null) {
      return;
    }

    final draft = _buildDraft();
    if (draft == null) {
      return;
    }

    final validationErrors = AccountProfileService.validate(draft);
    if (validationErrors['slug'] != null ||
        validationErrors['displayName'] != null ||
        validationErrors['form'] != null) {
      setState(() {
        _fieldErrors = validationErrors;
      });
      _setStatus(
        'Add a valid profile URL and display name before uploading profile media.',
        success: false,
      );
      return;
    }

    setState(() {
      _busyMediaKind = kind;
      _fieldErrors = {
        for (final entry in _fieldErrors.entries)
          if (entry.key != 'avatarPath' && entry.key != 'bannerPath')
            entry.key: entry.value,
      };
    });

    try {
      final mediaPath = await AccountProfileService.uploadProfileMedia(
        client: _client,
        userId: profile.userId,
        kind: kind,
        file: pickedFile,
      );

      if (!mounted) {
        return;
      }

      await _save(
        nextAvatarPath: kind == ProfileMediaKind.avatar ? mediaPath : null,
        nextBannerPath: kind == ProfileMediaKind.banner ? mediaPath : null,
        successMessage: kind == ProfileMediaKind.avatar
            ? 'Profile photo updated.'
            : 'Banner image updated.',
      );
    } catch (error) {
      if (!mounted) {
        return;
      }

      _setStatus(
        error is Error ? error.toString() : 'Profile media upload failed.',
        success: false,
      );
    } finally {
      if (mounted) {
        setState(() {
          _busyMediaKind = null;
        });
      }
    }
  }

  Future<void> _removeMedia(ProfileMediaKind kind) async {
    await _save(
      clearAvatarPath: kind == ProfileMediaKind.avatar,
      clearBannerPath: kind == ProfileMediaKind.banner,
      successMessage: kind == ProfileMediaKind.avatar
          ? 'Profile photo removed.'
          : 'Banner image removed.',
    );
  }

  Future<void> _openFollowing() async {
    await Navigator.of(
      context,
    ).push(MaterialPageRoute<void>(builder: (_) => const FollowingScreen()));
  }

  Future<void> _openImportCollection() async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(builder: (_) => const ImportCollectionScreen()),
    );
  }

  Future<void> _openSubmitMissingCard() async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(builder: (_) => const SubmitMissingCardScreen()),
    );
  }

  Future<void> _refreshCurrentSegment() async {
    await _load();
    if (_isFounderUser && _activeSegment == _AccountSegment.vendorTools) {
      await _loadFounderInsights(force: true);
    }
  }

  void _selectSegment(_AccountSegment segment) {
    if (segment == _activeSegment) {
      return;
    }

    setState(() {
      _activeSegment = segment;
    });

    if (segment == _AccountSegment.vendorTools) {
      unawaited(_loadFounderInsights());
    }
  }

  Future<void> _loadFounderInsights({bool force = false}) async {
    if (!_isFounderUser) {
      return;
    }
    if (_founderInsightsLoading) {
      return;
    }
    if (!force && _founderInsights != null) {
      return;
    }

    setState(() {
      _founderInsightsLoading = true;
      _founderInsightsError = null;
    });

    try {
      final bundle = await FounderInsightService.load(client: _client);
      if (!mounted) {
        return;
      }

      setState(() {
        _founderInsights = bundle;
        _founderInsightsLoading = false;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }

      setState(() {
        _founderInsightsLoading = false;
        _founderInsightsError =
            'Vendor tools are unavailable right now. Try again in a moment.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final profile = _profile;
    final avatarUrl = AccountProfileService.resolveMediaUrl(_avatarPath);
    final bannerUrl = AccountProfileService.resolveMediaUrl(_bannerPath);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Account'),
        actions: [
          IconButton(
            tooltip: 'Reload',
            onPressed: _refreshCurrentSegment,
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _refreshCurrentSegment,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(14, 10, 14, 18),
            children: [
              if (_loading)
                const Padding(
                  padding: EdgeInsets.only(top: 48),
                  child: Center(child: CircularProgressIndicator()),
                )
              else if (_error != null)
                _AccountSurface(
                  child: _AccountEmptyState(
                    title: 'Unable to load account',
                    body: _error!,
                  ),
                )
              else if (profile != null) ...[
                _AccountHero(
                  email: profile.email,
                  displayName: _displayNameController.text.trim().isEmpty
                      ? 'Your Grookai profile'
                      : _displayNameController.text.trim(),
                  slug: _slugController.text.trim(),
                  avatarUrl: avatarUrl,
                  bannerUrl: bannerUrl,
                  publicProfileEnabled: _publicProfileEnabled,
                  vaultSharingEnabled: _vaultSharingEnabled,
                ),
                const SizedBox(height: 12),
                if (_isFounderUser) ...[
                  _AccountSegmentControl(
                    activeSegment: _activeSegment,
                    onChanged: _selectSegment,
                  ),
                  const SizedBox(height: 12),
                ],
                ...(_activeSegment == _AccountSegment.vendorTools
                    ? _buildVendorToolsContent(context)
                    : _buildProfileContent(
                        context,
                        profile: profile,
                        avatarUrl: avatarUrl,
                        bannerUrl: bannerUrl,
                      )),
              ],
            ],
          ),
        ),
      ),
    );
  }

  List<Widget> _buildProfileContent(
    BuildContext context, {
    required AccountProfileData profile,
    required String? avatarUrl,
    required String? bannerUrl,
  }) {
    return [
      _AccountSurface(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Public profile settings',
              style: Theme.of(
                context,
              ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 6),
            Text(
              _wallStatusCopy(),
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Theme.of(
                  context,
                ).colorScheme.onSurface.withValues(alpha: 0.72),
                height: 1.35,
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _displayNameController,
              textInputAction: TextInputAction.next,
              decoration: InputDecoration(
                labelText: 'Display name',
                errorText: _fieldErrors['displayName'],
              ),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _slugController,
              textInputAction: TextInputAction.done,
              decoration: InputDecoration(
                labelText: 'Profile URL',
                prefixText: '/u/',
                errorText: _fieldErrors['slug'],
              ),
            ),
            const SizedBox(height: 12),
            _ToggleField(
              label: 'Public profile',
              description:
                  'Expose your collector identity at a public /u/slug page.',
              checked: _publicProfileEnabled,
              onChanged: (value) {
                setState(() {
                  _publicProfileEnabled = value;
                  if (!value) {
                    _vaultSharingEnabled = false;
                  }
                });
              },
            ),
            const SizedBox(height: 8),
            _ToggleField(
              label: 'Vault sharing',
              description:
                  'Allow your shared collection and in-play cards to appear on your Wall.',
              checked: _vaultSharingEnabled,
              disabled: !_publicProfileEnabled,
              onChanged: (value) {
                setState(() {
                  _vaultSharingEnabled = value;
                });
              },
            ),
            const SizedBox(height: 12),
            _ProfileMediaCard(
              title: 'Profile photo',
              description:
                  'Upload or replace the avatar shown on your public collector page.',
              previewUrl: avatarUrl,
              busy: _busyMediaKind == ProfileMediaKind.avatar,
              onPick: () => _pickMedia(ProfileMediaKind.avatar),
              onRemove: _avatarPath == null
                  ? null
                  : () => _removeMedia(ProfileMediaKind.avatar),
              fallbackLabel: _initialsFor(
                _displayNameController.text,
                profile.email,
              ),
              compact: true,
            ),
            const SizedBox(height: 10),
            _ProfileMediaCard(
              title: 'Banner image',
              description:
                  'Set the banner used behind your public collector identity.',
              previewUrl: bannerUrl,
              busy: _busyMediaKind == ProfileMediaKind.banner,
              onPick: () => _pickMedia(ProfileMediaKind.banner),
              onRemove: _bannerPath == null
                  ? null
                  : () => _removeMedia(ProfileMediaKind.banner),
              fallbackLabel: 'No banner yet',
            ),
            if (_fieldErrors['form'] != null) ...[
              const SizedBox(height: 10),
              Text(
                _fieldErrors['form']!,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Theme.of(context).colorScheme.error,
                ),
              ),
            ],
            if (_statusMessage != null) ...[
              const SizedBox(height: 10),
              _StatusBanner(
                message: _statusMessage!,
                success: _statusIsSuccess,
              ),
            ],
            const SizedBox(height: 12),
            Align(
              alignment: Alignment.centerLeft,
              child: FilledButton.icon(
                onPressed: _saving ? null : _save,
                icon: Icon(
                  _saving ? Icons.hourglass_top_rounded : Icons.save_outlined,
                ),
                label: Text(_saving ? 'Saving...' : 'Save profile settings'),
              ),
            ),
          ],
        ),
      ),
      const SizedBox(height: 12),
      _AccountSurface(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Quick links',
              style: Theme.of(
                context,
              ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 10),
            _AccountLinkTile(
              icon: Icons.public_rounded,
              title: 'My Wall',
              subtitle: _wallLinkSubtitle(),
              onTap: () => Navigator.pop(context, AccountHubAction.wall),
            ),
            _AccountLinkTile(
              icon: Icons.inventory_2_outlined,
              title: 'Vault',
              subtitle: 'Open your private collection',
              onTap: () => Navigator.pop(context, AccountHubAction.vault),
            ),
            _AccountLinkTile(
              icon: Icons.hub_outlined,
              title: 'Network',
              subtitle: 'Browse the collector network',
              onTap: () => Navigator.pop(context, AccountHubAction.network),
            ),
            _AccountLinkTile(
              icon: Icons.mail_outline_rounded,
              title: 'Messages',
              subtitle: 'Open card-specific collector conversations',
              onTap: () => Navigator.pop(context, AccountHubAction.messages),
            ),
            _AccountLinkTile(
              icon: Icons.grid_view_rounded,
              title: 'Browse sets',
              subtitle: 'Jump into set browsing',
              onTap: () => Navigator.pop(context, AccountHubAction.sets),
            ),
            _AccountLinkTile(
              icon: Icons.people_alt_outlined,
              title: 'Following',
              subtitle: 'Collectors you want to revisit',
              onTap: _openFollowing,
            ),
          ],
        ),
      ),
      const SizedBox(height: 12),
      _AccountSurface(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Collection tools',
              style: Theme.of(
                context,
              ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 10),
            _AccountLinkTile(
              icon: Icons.upload_file_outlined,
              title: 'Import Collection',
              subtitle: 'Import a Collectr CSV into your vault',
              onTap: _openImportCollection,
            ),
            _AccountLinkTile(
              icon: Icons.outbox_outlined,
              title: 'Submit Missing Card',
              subtitle: 'Send a native warehouse submission',
              onTap: _openSubmitMissingCard,
            ),
          ],
        ),
      ),
      const SizedBox(height: 12),
      _AccountSurface(
        child: Align(
          alignment: Alignment.centerLeft,
          child: FilledButton.icon(
            onPressed: () => Navigator.pop(context, AccountHubAction.signOut),
            icon: const Icon(Icons.logout_rounded),
            label: const Text('Sign out'),
          ),
        ),
      ),
    ];
  }

  List<Widget> _buildVendorToolsContent(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    Widget child;
    if (_founderInsightsLoading) {
      child = Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const LinearProgressIndicator(minHeight: 3),
          const SizedBox(height: 12),
          Text(
            'Loading founder market signals...',
            style: theme.textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'This pulls the private founder bundle from the privileged market-signals endpoint.',
            style: theme.textTheme.bodySmall?.copyWith(
              color: colorScheme.onSurface.withValues(alpha: 0.68),
              height: 1.35,
            ),
          ),
        ],
      );
    } else if (_founderInsightsError != null) {
      child = Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _AccountEmptyState(
            title: 'Unable to load Vendor Tools',
            body: _founderInsightsError!,
          ),
          const SizedBox(height: 12),
          FilledButton.icon(
            onPressed: () => _loadFounderInsights(force: true),
            icon: const Icon(Icons.refresh_rounded),
            label: const Text('Retry'),
          ),
        ],
      );
    } else if (_founderInsights != null) {
      child = FounderMarketSignalsSection(bundle: _founderInsights!);
    } else {
      child = const _AccountEmptyState(
        title: 'Vendor Tools are ready',
        body: 'Pull to refresh or tap reload to fetch founder market signals.',
      );
    }

    return [
      _AccountSurface(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Vendor Tools',
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Private founder market signals built from live collector behavior.',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: colorScheme.onSurface.withValues(alpha: 0.7),
                          height: 1.35,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  tooltip: 'Refresh vendor tools',
                  onPressed: _founderInsightsLoading
                      ? null
                      : () => _loadFounderInsights(force: true),
                  icon: const Icon(Icons.refresh_rounded),
                ),
              ],
            ),
            if (_founderInsights?.generatedAt != null) ...[
              const SizedBox(height: 4),
              Text(
                'Updated ${_formatGeneratedAt(context, _founderInsights!.generatedAt!)}',
                style: theme.textTheme.labelMedium?.copyWith(
                  color: colorScheme.onSurface.withValues(alpha: 0.58),
                ),
              ),
            ],
            const SizedBox(height: 12),
            child,
          ],
        ),
      ),
    ];
  }

  String _wallStatusCopy() {
    switch (_wallState) {
      case PublicCollectorEntryState.ready:
        return 'Your Wall is live and reachable from the signed-in home surface.';
      case PublicCollectorEntryState.unavailable:
        return 'Turn on both your public profile and vault sharing to expose your Wall publicly.';
      case PublicCollectorEntryState.missingProfile:
        return 'Create a public slug and display name to bring your Wall online.';
    }
  }

  String _wallLinkSubtitle() {
    final slug = AccountProfileService.normalizeSlug(_slugController.text);
    if (_wallState == PublicCollectorEntryState.ready && slug.isNotEmpty) {
      return 'View /u/$slug';
    }
    if (_wallState == PublicCollectorEntryState.unavailable) {
      return 'Public Wall is currently disabled';
    }
    return 'Public Wall setup still needed';
  }

  String _initialsFor(String displayName, String fallback) {
    final raw = displayName.trim().isEmpty ? fallback : displayName;
    final tokens = raw
        .trim()
        .split(RegExp(r'\s+'))
        .where((token) => token.isNotEmpty)
        .take(2)
        .toList();
    if (tokens.isEmpty) {
      return 'GV';
    }
    return tokens.map((token) => token.substring(0, 1).toUpperCase()).join();
  }

  String _formatGeneratedAt(BuildContext context, DateTime timestamp) {
    final local = timestamp.toLocal();
    final localizations = MaterialLocalizations.of(context);
    final day = localizations.formatShortDate(local);
    final time = localizations.formatTimeOfDay(TimeOfDay.fromDateTime(local));
    return '$day at $time';
  }
}

class _AccountSegmentControl extends StatelessWidget {
  const _AccountSegmentControl({
    required this.activeSegment,
    required this.onChanged,
  });

  final _AccountSegment activeSegment;
  final ValueChanged<_AccountSegment> onChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    Widget segmentButton({
      required _AccountSegment segment,
      required String label,
    }) {
      final selected = activeSegment == segment;

      return Expanded(
        child: FilledButton(
          onPressed: () => onChanged(segment),
          style: FilledButton.styleFrom(
            backgroundColor: selected
                ? colorScheme.primary
                : colorScheme.surface.withValues(alpha: 0.58),
            foregroundColor: selected
                ? colorScheme.onPrimary
                : colorScheme.onSurface,
            elevation: 0,
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 9),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(999),
            ),
            textStyle: theme.textTheme.labelMedium?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          child: Text(label),
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(3),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.42),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.08)),
      ),
      child: Row(
        children: [
          segmentButton(segment: _AccountSegment.profile, label: 'Profile'),
          const SizedBox(width: 6),
          segmentButton(
            segment: _AccountSegment.vendorTools,
            label: 'Vendor Tools',
          ),
        ],
      ),
    );
  }
}

class _AccountHero extends StatelessWidget {
  const _AccountHero({
    required this.email,
    required this.displayName,
    required this.slug,
    required this.avatarUrl,
    required this.bannerUrl,
    required this.publicProfileEnabled,
    required this.vaultSharingEnabled,
  });

  final String email;
  final String displayName;
  final String slug;
  final String? avatarUrl;
  final String? bannerUrl;
  final bool publicProfileEnabled;
  final bool vaultSharingEnabled;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final initials = displayName
        .trim()
        .split(RegExp(r'\s+'))
        .where((token) => token.isNotEmpty)
        .take(2)
        .map((token) => token.substring(0, 1).toUpperCase())
        .join();

    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.12)),
        color: colorScheme.surface,
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: [
          SizedBox(
            height: 110,
            width: double.infinity,
            child: bannerUrl == null
                ? DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [
                          colorScheme.primaryContainer.withValues(alpha: 0.78),
                          colorScheme.surfaceContainerHighest.withValues(
                            alpha: 0.56,
                          ),
                        ],
                      ),
                    ),
                  )
                : Image.network(
                    bannerUrl!,
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) => DecoratedBox(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: [
                            colorScheme.primaryContainer.withValues(
                              alpha: 0.78,
                            ),
                            colorScheme.surfaceContainerHighest.withValues(
                              alpha: 0.56,
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Transform.translate(
                  offset: const Offset(0, -22),
                  child: Container(
                    width: 66,
                    height: 66,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(
                        color: Colors.white.withValues(alpha: 0.9),
                        width: 2,
                      ),
                      color: colorScheme.primaryContainer,
                    ),
                    clipBehavior: Clip.antiAlias,
                    alignment: Alignment.center,
                    child: avatarUrl == null
                        ? Text(
                            initials.isEmpty ? 'GV' : initials,
                            style: theme.textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.w800,
                              color: colorScheme.onPrimaryContainer,
                            ),
                          )
                        : Image.network(
                            avatarUrl!,
                            fit: BoxFit.cover,
                            errorBuilder: (context, error, stackTrace) => Text(
                              initials.isEmpty ? 'GV' : initials,
                              style: theme.textTheme.titleLarge?.copyWith(
                                fontWeight: FontWeight.w800,
                                color: colorScheme.onPrimaryContainer,
                              ),
                            ),
                          ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          displayName,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: theme.textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.w800,
                            letterSpacing: -0.3,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          email,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: colorScheme.onSurface.withValues(
                              alpha: 0.72,
                            ),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            _StatusChip(
                              label: slug.isEmpty
                                  ? 'No slug yet'
                                  : '/u/${AccountProfileService.normalizeSlug(slug)}',
                            ),
                            _StatusChip(
                              label: publicProfileEnabled
                                  ? 'Profile public'
                                  : 'Profile private',
                            ),
                            _StatusChip(
                              label: vaultSharingEnabled
                                  ? 'Vault shared'
                                  : 'Vault hidden',
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ProfileMediaCard extends StatelessWidget {
  const _ProfileMediaCard({
    required this.title,
    required this.description,
    required this.busy,
    required this.onPick,
    required this.fallbackLabel,
    this.previewUrl,
    this.onRemove,
    this.compact = false,
  });

  final String title;
  final String description;
  final bool busy;
  final VoidCallback onPick;
  final VoidCallback? onRemove;
  final String fallbackLabel;
  final String? previewUrl;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.38),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: Theme.of(
              context,
            ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 4),
          Text(
            description,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: colorScheme.onSurface.withValues(alpha: 0.68),
              height: 1.35,
            ),
          ),
          const SizedBox(height: 10),
          if (compact)
            Row(
              children: [
                _MediaPreview(
                  compact: true,
                  previewUrl: previewUrl,
                  fallbackLabel: fallbackLabel,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      OutlinedButton(
                        onPressed: busy ? null : onPick,
                        child: Text(
                          busy
                              ? 'Uploading...'
                              : previewUrl == null
                              ? 'Upload'
                              : 'Replace',
                        ),
                      ),
                      if (onRemove != null)
                        TextButton(
                          onPressed: busy ? null : onRemove,
                          child: const Text('Remove'),
                        ),
                    ],
                  ),
                ),
              ],
            )
          else ...[
            _MediaPreview(
              compact: false,
              previewUrl: previewUrl,
              fallbackLabel: fallbackLabel,
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                OutlinedButton(
                  onPressed: busy ? null : onPick,
                  child: Text(
                    busy
                        ? 'Uploading...'
                        : previewUrl == null
                        ? 'Upload'
                        : 'Replace',
                  ),
                ),
                if (onRemove != null)
                  TextButton(
                    onPressed: busy ? null : onRemove,
                    child: const Text('Remove'),
                  ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _MediaPreview extends StatelessWidget {
  const _MediaPreview({
    required this.compact,
    required this.previewUrl,
    required this.fallbackLabel,
  });

  final bool compact;
  final String? previewUrl;
  final String fallbackLabel;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final hasImage = (previewUrl ?? '').trim().isNotEmpty;

    if (compact) {
      return Container(
        width: 72,
        height: 72,
        decoration: BoxDecoration(
          color: colorScheme.primaryContainer,
          borderRadius: BorderRadius.circular(18),
        ),
        clipBehavior: Clip.antiAlias,
        alignment: Alignment.center,
        child: hasImage
            ? Image.network(
                previewUrl!,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) => Text(
                  fallbackLabel,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                    color: colorScheme.onPrimaryContainer,
                  ),
                ),
              )
            : Text(
                fallbackLabel,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w800,
                  color: colorScheme.onPrimaryContainer,
                ),
              ),
      );
    }

    return Container(
      height: 96,
      width: double.infinity,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            colorScheme.primaryContainer.withValues(alpha: 0.68),
            colorScheme.surfaceContainerHighest.withValues(alpha: 0.48),
          ],
        ),
      ),
      clipBehavior: Clip.antiAlias,
      alignment: Alignment.center,
      child: hasImage
          ? Image.network(
              previewUrl!,
              fit: BoxFit.cover,
              width: double.infinity,
              height: double.infinity,
              errorBuilder: (context, error, stackTrace) => Text(
                fallbackLabel,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: colorScheme.onSurface.withValues(alpha: 0.72),
                ),
              ),
            )
          : Text(
              fallbackLabel,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                fontWeight: FontWeight.w700,
                color: colorScheme.onSurface.withValues(alpha: 0.72),
              ),
            ),
    );
  }
}

class _ToggleField extends StatelessWidget {
  const _ToggleField({
    required this.label,
    required this.description,
    required this.checked,
    required this.onChanged,
    this.disabled = false,
  });

  final String label;
  final String description;
  final bool checked;
  final bool disabled;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.3),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: Theme.of(
                    context,
                  ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 4),
                Text(
                  description,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: colorScheme.onSurface.withValues(alpha: 0.68),
                    height: 1.35,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          Switch.adaptive(
            value: checked,
            onChanged: disabled ? null : onChanged,
          ),
        ],
      ),
    );
  }
}

class _StatusBanner extends StatelessWidget {
  const _StatusBanner({required this.message, required this.success});

  final String message;
  final bool success;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final background = success
        ? Colors.green.withValues(alpha: 0.10)
        : colorScheme.error.withValues(alpha: 0.10);
    final foreground = success ? Colors.green.shade900 : colorScheme.error;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: foreground.withValues(alpha: 0.18)),
      ),
      child: Text(
        message,
        style: Theme.of(context).textTheme.bodySmall?.copyWith(
          color: foreground,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _AccountSurface extends StatelessWidget {
  const _AccountSurface({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.14)),
      ),
      padding: const EdgeInsets.all(14),
      child: child,
    );
  }
}

class _AccountLinkTile extends StatelessWidget {
  const _AccountLinkTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 10),
          child: Row(
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: colorScheme.primary.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: colorScheme.primary, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: colorScheme.onSurface.withValues(alpha: 0.68),
                      ),
                    ),
                  ],
                ),
              ),
              Icon(
                Icons.chevron_right_rounded,
                color: colorScheme.onSurface.withValues(alpha: 0.34),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.55),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.14)),
      ),
      child: Text(
        label,
        style: Theme.of(
          context,
        ).textTheme.labelMedium?.copyWith(fontWeight: FontWeight.w700),
      ),
    );
  }
}

class _AccountEmptyState extends StatelessWidget {
  const _AccountEmptyState({required this.title, required this.body});

  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: Theme.of(
            context,
          ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 6),
        Text(
          body,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
            color: colorScheme.onSurface.withValues(alpha: 0.68),
            height: 1.35,
          ),
        ),
      ],
    );
  }
}
