import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../card_detail_screen.dart';
import '../../services/public/public_collector_service.dart';
import '../../widgets/card_surface_artwork.dart';
import '../../widgets/card_surface_price.dart';
import '../../widgets/card_view_mode.dart';
import '../../widgets/contact_owner_button.dart';
import '../../widgets/follow_collector_button.dart';
import '../../widgets/app_shell_metrics.dart';
import '../../services/public/collector_follow_service.dart';
import '../gvvi/public_gvvi_screen.dart';
import '../vault/vault_gvvi_screen.dart';

enum PublicCollectorViewState {
  loading,
  notFound,
  unavailable,
  empty,
  success,
  failure,
}

enum _CollectorSegment { collection, inPlay }

enum _CollectorFamilyRoute { profile, followers, following }

class PublicCollectorScreen extends StatefulWidget {
  const PublicCollectorScreen({
    required this.slug,
    this.showAppBar = true,
    super.key,
  });

  final String slug;
  final bool showAppBar;

  @override
  State<PublicCollectorScreen> createState() => _PublicCollectorScreenState();
}

class _PublicCollectorScreenState extends State<PublicCollectorScreen> {
  final SupabaseClient _client = Supabase.instance.client;
  PublicCollectorViewState _viewState = PublicCollectorViewState.loading;
  PublicCollectorSurfaceResult? _result;
  bool _isFollowing = false;
  int? _followerCountOverride;
  int _loadVersion = 0;

  String get _normalizedSlug => widget.slug.trim().toLowerCase();

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final loadVersion = ++_loadVersion;

    setState(() {
      _viewState = PublicCollectorViewState.loading;
      _result = null;
      _isFollowing = false;
      _followerCountOverride = null;
    });

    try {
      final result = await PublicCollectorService.loadBySlug(
        client: _client,
        slug: _normalizedSlug,
      );
      final profile = result.profile;
      final viewerUserId = _client.auth.currentUser?.id ?? '';
      final initialFollowState =
          profile != null &&
              viewerUserId.isNotEmpty &&
              viewerUserId != profile.userId
          ? await CollectorFollowService.fetchFollowState(
              client: _client,
              followerUserId: viewerUserId,
              followedUserId: profile.userId,
            )
          : false;

      if (!mounted || loadVersion != _loadVersion) {
        return;
      }

      setState(() {
        _result = result;
        _viewState = _mapResultToState(result);
        _isFollowing = initialFollowState;
        _followerCountOverride = result.profile?.followerCount;
      });
    } catch (_) {
      if (!mounted || loadVersion != _loadVersion) {
        return;
      }

      setState(() {
        _result = null;
        _viewState = PublicCollectorViewState.failure;
      });
    }
  }

  void _handleFollowChanged(bool isFollowing) {
    final currentCount =
        _followerCountOverride ?? _result?.profile?.followerCount;
    if (currentCount == null) {
      setState(() {
        _isFollowing = isFollowing;
      });
      return;
    }

    setState(() {
      _isFollowing = isFollowing;
      _followerCountOverride = isFollowing
          ? currentCount + 1
          : currentCount - 1;
    });
  }

  PublicCollectorViewState _mapResultToState(
    PublicCollectorSurfaceResult result,
  ) {
    switch (result.state) {
      case PublicCollectorSurfaceState.notFound:
        return PublicCollectorViewState.notFound;
      case PublicCollectorSurfaceState.unavailable:
        return PublicCollectorViewState.unavailable;
      case PublicCollectorSurfaceState.empty:
        return PublicCollectorViewState.empty;
      case PublicCollectorSurfaceState.success:
        return PublicCollectorViewState.success;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final body = _CollectorScaffoldBody(
      bottomPadding: widget.showAppBar
          ? 16
          : shellContentBottomPadding(context),
      child: _buildBody(),
    );

    if (!widget.showAppBar) {
      return body;
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(
          _normalizedSlug.isEmpty ? 'Public Collector' : '/u/$_normalizedSlug',
          style: theme.textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.w700,
          ),
        ),
        actions: [
          IconButton(
            tooltip: 'Reload',
            onPressed: _load,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: body,
    );
  }

  Widget _buildBody() {
    switch (_viewState) {
      case PublicCollectorViewState.loading:
        return const _StateCard(
          icon: Icons.hourglass_top_rounded,
          title: 'Loading collector',
          body: 'Fetching the public collector surface for this slug.',
          child: Padding(
            padding: EdgeInsets.only(top: 8),
            child: SizedBox(
              width: 28,
              height: 28,
              child: CircularProgressIndicator(strokeWidth: 2.4),
            ),
          ),
        );
      case PublicCollectorViewState.notFound:
        return const _StateCard(
          icon: Icons.person_search_rounded,
          title: 'Collector not found',
          body: 'No public collector profile exists for this slug.',
        );
      case PublicCollectorViewState.unavailable:
        return const _StateCard(
          icon: Icons.visibility_off_rounded,
          title: 'Public collector unavailable',
          body: 'This public collector surface is not currently available.',
        );
      case PublicCollectorViewState.empty:
        final result = _result;
        if (result?.profile == null) {
          return const _StateCard(
            icon: Icons.inbox_rounded,
            title: 'No public Wall content yet',
            body:
                'This collector has a public profile, but there is no public Wall content to show yet.',
          );
        }

        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _PublicCollectorHeader(
              profile: result!.profile!,
              followerCountOverride: _followerCountOverride,
              action: FollowCollectorButton(
                collectorUserId: result.profile!.userId,
                initialIsFollowing: _isFollowing,
                onChanged: _handleFollowChanged,
              ),
            ),
            const SizedBox(height: 10),
            const _StateCard(
              icon: Icons.inbox_rounded,
              title: 'No cards yet',
              body: 'This collector does not have any public Wall content yet.',
            ),
          ],
        );
      case PublicCollectorViewState.success:
        final result = _result;
        final profile = result?.profile;
        if (profile == null || result == null) {
          return _failureCard();
        }
        return _PublicCollectorWallLayout(
          profile: profile,
          collectionCards: result.collectionCards,
          inPlayCards: result.inPlayCards,
          followerCountOverride: _followerCountOverride,
          headerAction: FollowCollectorButton(
            collectorUserId: profile.userId,
            initialIsFollowing: _isFollowing,
            onChanged: _handleFollowChanged,
          ),
        );
      case PublicCollectorViewState.failure:
        return _failureCard();
    }
  }

  Widget _failureCard() {
    return _StateCard(
      icon: Icons.wifi_tethering_error_rounded,
      title: 'Unable to load collector',
      body: 'The public collector surface could not be loaded right now.',
      action: FilledButton.icon(
        onPressed: _load,
        icon: const Icon(Icons.refresh),
        label: const Text('Retry'),
      ),
    );
  }
}

class _PublicCollectorWallLayout extends StatelessWidget {
  const _PublicCollectorWallLayout({
    required this.profile,
    required this.collectionCards,
    required this.inPlayCards,
    this.followerCountOverride,
    this.headerAction,
  });

  final PublicCollectorProfile profile;
  final List<PublicCollectorCard> collectionCards;
  final List<PublicCollectorCard> inPlayCards;
  final int? followerCountOverride;
  final Widget? headerAction;

  @override
  Widget build(BuildContext context) {
    return _PublicCollectorSegmentedContent(
      profile: profile,
      collectionCards: collectionCards,
      inPlayCards: inPlayCards,
      followerCountOverride: followerCountOverride,
      headerAction: headerAction,
    );
  }
}

class _PublicCollectorSegmentedContent extends StatefulWidget {
  const _PublicCollectorSegmentedContent({
    required this.profile,
    required this.collectionCards,
    required this.inPlayCards,
    this.followerCountOverride,
    this.headerAction,
  });

  final PublicCollectorProfile profile;
  final List<PublicCollectorCard> collectionCards;
  final List<PublicCollectorCard> inPlayCards;
  final int? followerCountOverride;
  final Widget? headerAction;

  @override
  State<_PublicCollectorSegmentedContent> createState() =>
      _PublicCollectorSegmentedContentState();
}

class _PublicCollectorSegmentedContentState
    extends State<_PublicCollectorSegmentedContent> {
  late _CollectorSegment _activeSegment;
  AppCardViewMode _viewMode = AppCardViewMode.grid;
  late final TextEditingController _pokemonController;

  @override
  void initState() {
    super.initState();
    _activeSegment = widget.inPlayCards.isNotEmpty
        ? _CollectorSegment.inPlay
        : _CollectorSegment.collection;
    _pokemonController = TextEditingController();
  }

  @override
  void dispose() {
    _pokemonController.dispose();
    super.dispose();
  }

  void _openPokemonCollection([String? rawValue]) {
    final pokemonSlug = PublicCollectorService.normalizePokemonSlug(
      rawValue ?? _pokemonController.text,
    );
    if (pokemonSlug.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter a Pokemon to browse this wall.')),
      );
      return;
    }

    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => PublicCollectorPokemonScreen(
          slug: widget.profile.slug,
          pokemon: pokemonSlug,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _PublicCollectorHeader(
          profile: widget.profile,
          followerCountOverride: widget.followerCountOverride,
          action: widget.headerAction,
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: _CollectorSegmentControl(
                activeSegment: _activeSegment,
                onChanged: (segment) {
                  setState(() {
                    _activeSegment = segment;
                  });
                },
                collectionCount: widget.collectionCards.length,
                inPlayCount: widget.inPlayCards.length,
              ),
            ),
            const SizedBox(width: 8),
            SharedCardViewModeButton(
              value: _viewMode,
              onChanged: (mode) {
                setState(() {
                  _viewMode = mode;
                });
              },
            ),
          ],
        ),
        const SizedBox(height: 10),
        if (_activeSegment == _CollectorSegment.inPlay)
          _FeaturedWallSection(
            profile: widget.profile,
            cards: widget.inPlayCards,
            viewMode: _viewMode,
          )
        else ...[
          if (widget.collectionCards.isNotEmpty) ...[
            _PublicPokemonJumpBar(
              controller: _pokemonController,
              onSubmitted: _openPokemonCollection,
            ),
            const SizedBox(height: 8),
          ],
          _PublicCollectionSection(
            profile: widget.profile,
            cards: widget.collectionCards,
            viewMode: _viewMode,
          ),
        ],
      ],
    );
  }
}

class _CollectorSegmentControl extends StatelessWidget {
  const _CollectorSegmentControl({
    required this.activeSegment,
    required this.onChanged,
    required this.collectionCount,
    required this.inPlayCount,
  });

  final _CollectorSegment activeSegment;
  final ValueChanged<_CollectorSegment> onChanged;
  final int collectionCount;
  final int inPlayCount;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    Widget segmentButton({
      required _CollectorSegment segment,
      required String label,
      required int count,
    }) {
      final selected = activeSegment == segment;

      return Expanded(
        child: FilledButton(
          onPressed: () => onChanged(segment),
          style: FilledButton.styleFrom(
            backgroundColor: selected
                ? colorScheme.primaryContainer.withValues(alpha: 0.9)
                : Colors.transparent,
            foregroundColor: selected
                ? colorScheme.onPrimaryContainer
                : colorScheme.onSurface.withValues(alpha: 0.72),
            elevation: 0,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(13),
            ),
            textStyle: theme.textTheme.labelSmall?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          child: Text('$label ($count)'),
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(3),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerLowest.withValues(alpha: 0.9),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.08)),
      ),
      child: Row(
        children: [
          segmentButton(
            segment: _CollectorSegment.collection,
            label: 'Collection',
            count: collectionCount,
          ),
          const SizedBox(width: 6),
          segmentButton(
            segment: _CollectorSegment.inPlay,
            label: 'In Play',
            count: inPlayCount,
          ),
        ],
      ),
    );
  }
}

class _CollectorScaffoldBody extends StatelessWidget {
  const _CollectorScaffoldBody({required this.child, this.bottomPadding = 16});

  final Widget child;
  final double bottomPadding;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return SafeArea(
      bottom: false,
      child: DecoratedBox(
        decoration: BoxDecoration(color: colorScheme.surface),
        child: ListView(
          padding: EdgeInsets.fromLTRB(14, 10, 14, bottomPadding),
          children: [child],
        ),
      ),
    );
  }
}

class _PublicCollectorHeader extends StatelessWidget {
  const _PublicCollectorHeader({
    required this.profile,
    this.currentRoute = _CollectorFamilyRoute.profile,
    this.description,
    this.followerCountOverride,
    this.action,
  });

  final PublicCollectorProfile profile;
  final _CollectorFamilyRoute currentRoute;
  final String? description;
  final int? followerCountOverride;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final followerCount = followerCountOverride ?? profile.followerCount;

    return Container(
      padding: const EdgeInsets.fromLTRB(14, 14, 14, 15),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerLow.withValues(alpha: 0.94),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.08)),
        boxShadow: [
          BoxShadow(
            color: colorScheme.shadow.withValues(alpha: 0.035),
            blurRadius: 22,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _AvatarBadge(profile: profile),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  profile.displayName,
                  style: theme.textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w700,
                    letterSpacing: -0.3,
                    height: 1.0,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 6),
                _IdentityChip(
                  icon: Icons.alternate_email_rounded,
                  label: '/u/${profile.slug}',
                  maxWidth: 220,
                ),
                if ((description ?? '').trim().isNotEmpty) ...[
                  const SizedBox(height: 10),
                  Text(
                    description!.trim(),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: colorScheme.onSurface.withValues(alpha: 0.7),
                      height: 1.38,
                    ),
                  ),
                ],
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _CollectorRouteChip(
                      label: 'Profile',
                      selected: currentRoute == _CollectorFamilyRoute.profile,
                      onPressed: currentRoute == _CollectorFamilyRoute.profile
                          ? null
                          : () {
                              Navigator.of(context).push(
                                MaterialPageRoute<void>(
                                  builder: (_) =>
                                      PublicCollectorScreen(slug: profile.slug),
                                ),
                              );
                            },
                    ),
                    _CollectorRouteChip(
                      label: '$followerCount Followers',
                      selected: currentRoute == _CollectorFamilyRoute.followers,
                      onPressed: currentRoute == _CollectorFamilyRoute.followers
                          ? null
                          : () {
                              Navigator.of(context).push(
                                MaterialPageRoute<void>(
                                  builder: (_) =>
                                      PublicCollectorFollowersScreen(
                                        slug: profile.slug,
                                      ),
                                ),
                              );
                            },
                    ),
                    _CollectorRouteChip(
                      label: '${profile.followingCount} Following',
                      selected: currentRoute == _CollectorFamilyRoute.following,
                      onPressed: currentRoute == _CollectorFamilyRoute.following
                          ? null
                          : () {
                              Navigator.of(context).push(
                                MaterialPageRoute<void>(
                                  builder: (_) =>
                                      PublicCollectorFollowingScreen(
                                        slug: profile.slug,
                                      ),
                                ),
                              );
                            },
                    ),
                  ],
                ),
              ],
            ),
          ),
          if (action != null) ...[const SizedBox(width: 10), action!],
        ],
      ),
    );
  }
}

class _CollectorRouteChip extends StatelessWidget {
  const _CollectorRouteChip({
    required this.label,
    required this.selected,
    this.onPressed,
  });

  final String label;
  final bool selected;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return TextButton(
      onPressed: onPressed,
      style: TextButton.styleFrom(
        backgroundColor: selected
            ? colorScheme.surface
            : colorScheme.surface.withValues(alpha: 0.42),
        foregroundColor: selected
            ? colorScheme.primary
            : colorScheme.onSurface.withValues(alpha: 0.68),
        padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 7),
        minimumSize: Size.zero,
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
        visualDensity: const VisualDensity(horizontal: -2, vertical: -2),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
        side: BorderSide(
          color: selected
              ? colorScheme.primary.withValues(alpha: 0.14)
              : colorScheme.outline.withValues(alpha: 0.08),
        ),
      ),
      child: Text(
        label,
        style: theme.textTheme.labelSmall?.copyWith(
          fontWeight: FontWeight.w600,
          color: selected
              ? colorScheme.primary
              : colorScheme.onSurface.withValues(alpha: 0.68),
        ),
      ),
    );
  }
}

class _PublicPokemonJumpBar extends StatelessWidget {
  const _PublicPokemonJumpBar({
    required this.controller,
    required this.onSubmitted,
  });

  final TextEditingController controller;
  final ValueChanged<String> onSubmitted;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.12)),
      ),
      child: Row(
        children: [
          Icon(
            Icons.catching_pokemon_rounded,
            size: 18,
            color: colorScheme.primary,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: TextField(
              controller: controller,
              textInputAction: TextInputAction.search,
              onSubmitted: onSubmitted,
              decoration: const InputDecoration(
                hintText: 'Jump to Pokemon',
                isDense: true,
                border: InputBorder.none,
                contentPadding: EdgeInsets.symmetric(vertical: 8),
              ),
            ),
          ),
          const SizedBox(width: 8),
          FilledButton(
            onPressed: () => onSubmitted(controller.text),
            style: FilledButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              visualDensity: const VisualDensity(horizontal: -2, vertical: -2),
            ),
            child: const Text('View'),
          ),
        ],
      ),
    );
  }
}

enum _CollectorFamilySurfaceState { loading, notFound, success, failure }

enum _CollectorRelationshipKind { followers, following }

class PublicCollectorFollowersScreen extends StatelessWidget {
  const PublicCollectorFollowersScreen({required this.slug, super.key});

  final String slug;

  @override
  Widget build(BuildContext context) {
    return _PublicCollectorRelationshipScreen(
      slug: slug,
      kind: _CollectorRelationshipKind.followers,
    );
  }
}

class PublicCollectorFollowingScreen extends StatelessWidget {
  const PublicCollectorFollowingScreen({required this.slug, super.key});

  final String slug;

  @override
  Widget build(BuildContext context) {
    return _PublicCollectorRelationshipScreen(
      slug: slug,
      kind: _CollectorRelationshipKind.following,
    );
  }
}

class _PublicCollectorRelationshipScreen extends StatefulWidget {
  const _PublicCollectorRelationshipScreen({
    required this.slug,
    required this.kind,
  });

  final String slug;
  final _CollectorRelationshipKind kind;

  @override
  State<_PublicCollectorRelationshipScreen> createState() =>
      _PublicCollectorRelationshipScreenState();
}

class _PublicCollectorRelationshipScreenState
    extends State<_PublicCollectorRelationshipScreen> {
  final SupabaseClient _client = Supabase.instance.client;

  _CollectorFamilySurfaceState _viewState =
      _CollectorFamilySurfaceState.loading;
  PublicCollectorProfile? _profile;
  List<PublicCollectorRelationshipRow> _collectors = const [];
  Set<String> _followedCollectorIds = const <String>{};
  bool _isFollowingProfile = false;
  int? _followerCountOverride;
  int _loadVersion = 0;

  String get _normalizedSlug => widget.slug.trim().toLowerCase();
  bool get _isFollowers => widget.kind == _CollectorRelationshipKind.followers;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final loadVersion = ++_loadVersion;

    setState(() {
      _viewState = _CollectorFamilySurfaceState.loading;
      _profile = null;
      _collectors = const [];
      _followedCollectorIds = const <String>{};
      _isFollowingProfile = false;
      _followerCountOverride = null;
    });

    try {
      final profile = await PublicCollectorService.loadPublicProfileBySlug(
        client: _client,
        slug: _normalizedSlug,
      );

      if (!mounted || loadVersion != _loadVersion) {
        return;
      }

      if (profile == null) {
        setState(() {
          _viewState = _CollectorFamilySurfaceState.notFound;
        });
        return;
      }

      final collectors = _isFollowers
          ? await PublicCollectorService.fetchFollowerCollectors(
              client: _client,
              userId: profile.userId,
            )
          : await PublicCollectorService.fetchFollowingCollectors(
              client: _client,
              userId: profile.userId,
            );
      final viewerUserId = _client.auth.currentUser?.id ?? '';
      final followedCollectorIds = viewerUserId.isEmpty
          ? <String>{}
          : await CollectorFollowService.fetchFollowStateMap(
              client: _client,
              followerUserId: viewerUserId,
              followedUserIds: collectors.map((collector) => collector.userId),
            );
      final isFollowingProfile =
          viewerUserId.isNotEmpty && viewerUserId != profile.userId
          ? await CollectorFollowService.fetchFollowState(
              client: _client,
              followerUserId: viewerUserId,
              followedUserId: profile.userId,
            )
          : false;

      if (!mounted || loadVersion != _loadVersion) {
        return;
      }

      setState(() {
        _profile = profile;
        _collectors = collectors;
        _followedCollectorIds = followedCollectorIds;
        _isFollowingProfile = isFollowingProfile;
        _followerCountOverride = profile.followerCount;
        _viewState = _CollectorFamilySurfaceState.success;
      });
    } catch (_) {
      if (!mounted || loadVersion != _loadVersion) {
        return;
      }

      setState(() {
        _viewState = _CollectorFamilySurfaceState.failure;
      });
    }
  }

  void _handleProfileFollowChanged(bool isFollowing) {
    final profile = _profile;
    if (profile == null) {
      return;
    }

    final currentCount = _followerCountOverride ?? profile.followerCount;
    setState(() {
      _isFollowingProfile = isFollowing;
      _followerCountOverride = isFollowing
          ? currentCount + 1
          : currentCount - 1;
    });
  }

  void _handleCollectorFollowChanged(String userId, bool isFollowing) {
    setState(() {
      final nextIds = Set<String>.from(_followedCollectorIds);
      if (isFollowing) {
        nextIds.add(userId);
      } else {
        nextIds.remove(userId);
      }
      _followedCollectorIds = nextIds;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_isFollowers ? 'Followers' : 'Following'),
        actions: [
          IconButton(
            tooltip: 'Reload',
            onPressed: _load,
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: _CollectorScaffoldBody(child: _buildBody()),
    );
  }

  Widget _buildBody() {
    switch (_viewState) {
      case _CollectorFamilySurfaceState.loading:
        return _StateCard(
          icon: _isFollowers ? Icons.group_rounded : Icons.person_add_alt_1,
          title: _isFollowers ? 'Loading followers' : 'Loading following',
          body: _isFollowers
              ? 'Fetching collectors following this public profile.'
              : 'Fetching collectors this profile follows.',
          child: const Padding(
            padding: EdgeInsets.only(top: 8),
            child: SizedBox(
              width: 28,
              height: 28,
              child: CircularProgressIndicator(strokeWidth: 2.4),
            ),
          ),
        );
      case _CollectorFamilySurfaceState.notFound:
        return _StateCard(
          icon: Icons.person_search_rounded,
          title: 'Collector not found',
          body: 'No public collector profile exists for this slug.',
        );
      case _CollectorFamilySurfaceState.failure:
        return _StateCard(
          icon: Icons.wifi_tethering_error_rounded,
          title: _isFollowers
              ? 'Unable to load followers'
              : 'Unable to load following',
          body: _isFollowers
              ? 'The public followers surface could not be loaded right now.'
              : 'The public following surface could not be loaded right now.',
          action: FilledButton.icon(
            onPressed: _load,
            icon: const Icon(Icons.refresh),
            label: const Text('Retry'),
          ),
        );
      case _CollectorFamilySurfaceState.success:
        final profile = _profile;
        if (profile == null) {
          return const SizedBox.shrink();
        }

        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _PublicCollectorHeader(
              profile: profile,
              currentRoute: _isFollowers
                  ? _CollectorFamilyRoute.followers
                  : _CollectorFamilyRoute.following,
              description: _isFollowers
                  ? 'Collectors following ${profile.displayName} on Grookai.'
                  : 'Collectors ${profile.displayName} follows on Grookai.',
              followerCountOverride: _followerCountOverride,
              action: FollowCollectorButton(
                collectorUserId: profile.userId,
                initialIsFollowing: _isFollowingProfile,
                onChanged: _handleProfileFollowChanged,
              ),
            ),
            const SizedBox(height: 10),
            _CollectorFamilyIntroCard(
              eyebrow: 'Collector relationships',
              title: _isFollowers ? 'Followers' : 'Following',
              body: _isFollowers
                  ? 'Collectors keeping ${profile.displayName} easy to revisit.'
                  : 'Collectors ${profile.displayName} wants to revisit.',
              actionLabel: 'View profile',
              onAction: () {
                Navigator.of(context)
                    .push(
                      MaterialPageRoute<void>(
                        builder: (_) =>
                            PublicCollectorScreen(slug: profile.slug),
                      ),
                    )
                    .then((_) => _load());
              },
            ),
            const SizedBox(height: 8),
            if (_collectors.isEmpty)
              _StateCard(
                icon: _isFollowers
                    ? Icons.group_off_rounded
                    : Icons.person_search_rounded,
                title: _isFollowers ? 'No followers yet' : 'No follows yet',
                body: _isFollowers
                    ? 'No public collectors are following ${profile.displayName} yet.'
                    : '${profile.displayName} is not following any public collectors yet.',
              )
            else
              Column(
                children: [
                  for (var index = 0; index < _collectors.length; index++) ...[
                    Builder(
                      builder: (context) {
                        final collector = _collectors[index];
                        return _PublicCollectorRelationshipTile(
                          collector: collector,
                          metadata: _formatRelationshipTimestamp(
                            value: collector.followedAt,
                            isFollowers: _isFollowers,
                          ),
                          isFollowing: _followedCollectorIds.contains(
                            collector.userId,
                          ),
                          onOpened: _load,
                          onFollowChanged: (isFollowing) =>
                              _handleCollectorFollowChanged(
                                collector.userId,
                                isFollowing,
                              ),
                        );
                      },
                    ),
                    if (index < _collectors.length - 1)
                      const SizedBox(height: 8),
                  ],
                ],
              ),
          ],
        );
    }
  }
}

class PublicCollectorPokemonScreen extends StatefulWidget {
  const PublicCollectorPokemonScreen({
    required this.slug,
    required this.pokemon,
    super.key,
  });

  final String slug;
  final String pokemon;

  @override
  State<PublicCollectorPokemonScreen> createState() =>
      _PublicCollectorPokemonScreenState();
}

class _PublicCollectorPokemonScreenState
    extends State<PublicCollectorPokemonScreen> {
  final SupabaseClient _client = Supabase.instance.client;
  late final TextEditingController _pokemonController;

  _CollectorFamilySurfaceState _viewState =
      _CollectorFamilySurfaceState.loading;
  PublicCollectorProfile? _profile;
  List<PublicCollectorCard> _collectionCards = const [];
  bool _collectionUnavailable = false;
  int _loadVersion = 0;

  String get _normalizedSlug => widget.slug.trim().toLowerCase();
  String get _normalizedPokemon =>
      PublicCollectorService.normalizePokemonSlug(widget.pokemon);
  String get _pokemonLabel =>
      PublicCollectorService.formatPokemonSlugLabel(widget.pokemon);

  List<PublicCollectorCard> get _matchingCards =>
      PublicCollectorService.filterCardsByPokemonSlug(
        cards: _collectionCards,
        pokemonSlug: _normalizedPokemon,
      );

  @override
  void initState() {
    super.initState();
    _pokemonController = TextEditingController(text: _pokemonLabel);
    _load();
  }

  @override
  void dispose() {
    _pokemonController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final loadVersion = ++_loadVersion;

    setState(() {
      _viewState = _CollectorFamilySurfaceState.loading;
      _profile = null;
      _collectionCards = const [];
      _collectionUnavailable = false;
    });

    try {
      final profile = await PublicCollectorService.loadPublicProfileBySlug(
        client: _client,
        slug: _normalizedSlug,
      );

      if (!mounted || loadVersion != _loadVersion) {
        return;
      }

      if (profile == null) {
        setState(() {
          _viewState = _CollectorFamilySurfaceState.notFound;
        });
        return;
      }

      if (!profile.vaultSharingEnabled) {
        setState(() {
          _profile = profile;
          _collectionUnavailable = true;
          _viewState = _CollectorFamilySurfaceState.success;
        });
        return;
      }

      final collectionCards =
          await PublicCollectorService.loadCollectionCardsForUser(
            client: _client,
            userId: profile.userId,
          );

      if (!mounted || loadVersion != _loadVersion) {
        return;
      }

      setState(() {
        _profile = profile;
        _collectionCards = collectionCards;
        _viewState = _CollectorFamilySurfaceState.success;
      });
    } catch (_) {
      if (!mounted || loadVersion != _loadVersion) {
        return;
      }

      setState(() {
        _viewState = _CollectorFamilySurfaceState.failure;
      });
    }
  }

  void _openPokemonCollection([String? rawValue]) {
    final pokemonSlug = PublicCollectorService.normalizePokemonSlug(
      rawValue ?? _pokemonController.text,
    );
    if (pokemonSlug.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter a Pokemon to browse this wall.')),
      );
      return;
    }

    Navigator.of(context).pushReplacement(
      MaterialPageRoute<void>(
        builder: (_) => PublicCollectorPokemonScreen(
          slug: widget.slug,
          pokemon: pokemonSlug,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_pokemonLabel),
        actions: [
          IconButton(
            tooltip: 'Reload',
            onPressed: _load,
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: _CollectorScaffoldBody(child: _buildBody()),
    );
  }

  Widget _buildBody() {
    switch (_viewState) {
      case _CollectorFamilySurfaceState.loading:
        return _StateCard(
          icon: Icons.catching_pokemon_rounded,
          title: 'Loading Pokemon collection',
          body: 'Fetching matching public cards for this collector.',
          child: const Padding(
            padding: EdgeInsets.only(top: 8),
            child: SizedBox(
              width: 28,
              height: 28,
              child: CircularProgressIndicator(strokeWidth: 2.4),
            ),
          ),
        );
      case _CollectorFamilySurfaceState.notFound:
        return const _StateCard(
          icon: Icons.person_search_rounded,
          title: 'Collector not found',
          body: 'No public collector profile exists for this slug.',
        );
      case _CollectorFamilySurfaceState.failure:
        return _StateCard(
          icon: Icons.wifi_tethering_error_rounded,
          title: 'Unable to load Pokemon collection',
          body: 'The Pokemon drilldown could not be loaded right now.',
          action: FilledButton.icon(
            onPressed: _load,
            icon: const Icon(Icons.refresh),
            label: const Text('Retry'),
          ),
        );
      case _CollectorFamilySurfaceState.success:
        final profile = _profile;
        if (profile == null) {
          return const SizedBox.shrink();
        }

        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _PublicCollectorHeader(
              profile: profile,
              description:
                  '$_pokemonLabel in ${profile.displayName}\'s collection on Grookai.',
            ),
            const SizedBox(height: 10),
            _CollectorFamilyIntroCard(
              eyebrow: 'Pokemon',
              title: '$_pokemonLabel Collection',
              body: 'Browse matching public cards from this collector.',
              actionLabel: 'View profile',
              onAction: () {
                Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => PublicCollectorScreen(slug: profile.slug),
                  ),
                );
              },
            ),
            const SizedBox(height: 8),
            _PublicPokemonJumpBar(
              controller: _pokemonController,
              onSubmitted: _openPokemonCollection,
            ),
            const SizedBox(height: 8),
            if (_collectionUnavailable)
              const _StateCard(
                icon: Icons.visibility_off_rounded,
                title: 'Collection not shared yet',
                body: 'This collection is not shared yet.',
              )
            else if (_matchingCards.isEmpty)
              _StateCard(
                icon: Icons.search_off_rounded,
                title: 'No cards found',
                body: 'No cards match $_pokemonLabel.',
              )
            else
              _PublicCardCollection(
                ownerUserId: profile.userId,
                ownerDisplayName: profile.displayName,
                cards: _matchingCards,
                viewMode: AppCardViewMode.grid,
              ),
          ],
        );
    }
  }
}

class _CollectorFamilyIntroCard extends StatelessWidget {
  const _CollectorFamilyIntroCard({
    required this.eyebrow,
    required this.title,
    required this.body,
    required this.actionLabel,
    required this.onAction,
  });

  final String eyebrow;
  final String title;
  final String body;
  final String actionLabel;
  final VoidCallback onAction;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.12)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  eyebrow,
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: colorScheme.onSurface.withValues(alpha: 0.55),
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.7,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  title,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                    letterSpacing: -0.2,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  body,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: colorScheme.onSurface.withValues(alpha: 0.72),
                    height: 1.3,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          TextButton(onPressed: onAction, child: Text(actionLabel)),
        ],
      ),
    );
  }
}

class _PublicCollectorRelationshipTile extends StatelessWidget {
  const _PublicCollectorRelationshipTile({
    required this.collector,
    required this.metadata,
    required this.isFollowing,
    required this.onOpened,
    required this.onFollowChanged,
  });

  final PublicCollectorRelationshipRow collector;
  final String metadata;
  final bool isFollowing;
  final VoidCallback onOpened;
  final ValueChanged<bool> onFollowChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Material(
      color: colorScheme.primary.withValues(alpha: 0.03),
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () {
          Navigator.of(context)
              .push(
                MaterialPageRoute<void>(
                  builder: (_) => PublicCollectorScreen(slug: collector.slug),
                ),
              )
              .then((_) => onOpened());
        },
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              _RelationshipAvatar(collector: collector),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      collector.displayName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '/u/${collector.slug}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: colorScheme.onSurface.withValues(alpha: 0.70),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      metadata,
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: colorScheme.onSurface.withValues(alpha: 0.60),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  FollowCollectorButton(
                    collectorUserId: collector.userId,
                    initialIsFollowing: isFollowing,
                    variant: FollowCollectorButtonVariant.compact,
                    onChanged: onFollowChanged,
                  ),
                  const SizedBox(height: 6),
                  Icon(
                    Icons.chevron_right_rounded,
                    color: colorScheme.onSurface.withValues(alpha: 0.34),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _RelationshipAvatar extends StatelessWidget {
  const _RelationshipAvatar({required this.collector});

  final PublicCollectorRelationshipRow collector;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final initials = _collectorInitials(collector.displayName, collector.slug);

    return Container(
      width: 46,
      height: 46,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        color: colorScheme.surface,
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.12)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(2.5),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(11),
          child: DecoratedBox(
            decoration: BoxDecoration(color: colorScheme.primaryContainer),
            child: collector.avatarUrl == null
                ? Center(
                    child: Text(
                      initials,
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                        color: colorScheme.onPrimaryContainer,
                      ),
                    ),
                  )
                : Image.network(
                    collector.avatarUrl!,
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) => Center(
                      child: Text(
                        initials,
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w800,
                          color: colorScheme.onPrimaryContainer,
                        ),
                      ),
                    ),
                  ),
          ),
        ),
      ),
    );
  }
}

String _formatRelationshipTimestamp({
  required DateTime? value,
  required bool isFollowers,
}) {
  if (value == null) {
    return isFollowers ? 'Following recently' : 'Recently followed';
  }

  final month = value.month.toString().padLeft(2, '0');
  final day = value.day.toString().padLeft(2, '0');
  final year = value.year.toString();
  return isFollowers
      ? 'Following since $month/$day/$year'
      : 'Followed $month/$day/$year';
}

String _collectorInitials(String displayName, String slug) {
  final tokens = displayName
      .trim()
      .split(RegExp(r'\s+'))
      .where((token) => token.isNotEmpty)
      .take(2)
      .toList();

  if (tokens.isNotEmpty) {
    return tokens.map((token) => token.substring(0, 1).toUpperCase()).join();
  }

  return slug.isEmpty ? 'GV' : slug.substring(0, 1).toUpperCase();
}

class _FeaturedWallSection extends StatelessWidget {
  const _FeaturedWallSection({
    required this.profile,
    required this.cards,
    required this.viewMode,
  });

  final PublicCollectorProfile profile;
  final List<PublicCollectorCard> cards;
  final AppCardViewMode viewMode;

  @override
  Widget build(BuildContext context) {
    return _WallSectionCard(
      title: 'In Play',
      description: '',
      emptyMessage: cards.isEmpty ? 'No cards in play' : null,
      child: cards.isEmpty
          ? null
          : _PublicCardCollection(
              ownerUserId: profile.userId,
              ownerDisplayName: profile.displayName,
              cards: cards,
              viewMode: viewMode,
              enableContact: true,
            ),
    );
  }
}

class _PublicCollectionSection extends StatelessWidget {
  const _PublicCollectionSection({
    required this.profile,
    required this.cards,
    required this.viewMode,
  });

  final PublicCollectorProfile profile;
  final List<PublicCollectorCard> cards;
  final AppCardViewMode viewMode;

  @override
  Widget build(BuildContext context) {
    return _WallSectionCard(
      title: 'Collection',
      description: '',
      emptyMessage: cards.isEmpty ? 'No public cards yet' : null,
      child: cards.isEmpty
          ? null
          : _PublicCardCollection(
              ownerUserId: profile.userId,
              ownerDisplayName: profile.displayName,
              cards: cards,
              viewMode: viewMode,
            ),
    );
  }
}

class _WallSectionCard extends StatelessWidget {
  const _WallSectionCard({
    required this.title,
    required this.description,
    this.emptyMessage,
    this.child,
  });

  final String title;
  final String description;
  final String? emptyMessage;
  final Widget? child;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 2),
          child: Text(
            title,
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w700,
              letterSpacing: -0.2,
            ),
          ),
        ),
        if (description.isNotEmpty) ...[
          const SizedBox(height: 4),
          Text(
            description,
            style: theme.textTheme.bodySmall?.copyWith(
              color: colorScheme.onSurface.withValues(alpha: 0.72),
              height: 1.35,
            ),
          ),
        ],
        if (child != null) ...[const SizedBox(height: 8), child!],
        if (emptyMessage != null) ...[
          const SizedBox(height: 6),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            decoration: BoxDecoration(
              color: colorScheme.primary.withValues(alpha: 0.05),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: colorScheme.outline.withValues(alpha: 0.12),
              ),
            ),
            child: Text(
              emptyMessage!,
              style: theme.textTheme.bodySmall?.copyWith(
                color: colorScheme.onSurface.withValues(alpha: 0.72),
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ],
    );
  }
}

class _PublicCardCollection extends StatelessWidget {
  const _PublicCardCollection({
    required this.ownerUserId,
    required this.ownerDisplayName,
    required this.cards,
    required this.viewMode,
    this.enableContact = false,
  });

  final String ownerUserId;
  final String ownerDisplayName;
  final List<PublicCollectorCard> cards;
  final AppCardViewMode viewMode;
  final bool enableContact;

  @override
  Widget build(BuildContext context) {
    if (viewMode == AppCardViewMode.grid) {
      final columns = resolveSharedCardGridColumns(
        context,
        horizontalPadding: 28,
        minTileWidth: 102,
        spacing: 10,
      );
      return GridView.builder(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: cards.length,
        gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: columns,
          mainAxisSpacing: 10,
          crossAxisSpacing: 10,
          childAspectRatio: 0.66,
        ),
        itemBuilder: (context, index) => _PublicCardGridTile(
          ownerUserId: ownerUserId,
          ownerDisplayName: ownerDisplayName,
          enableContact: enableContact,
          card: cards[index],
        ),
      );
    }

    return Column(
      children: [
        for (var index = 0; index < cards.length; index++) ...[
          _PublicCardTile(
            ownerUserId: ownerUserId,
            ownerDisplayName: ownerDisplayName,
            card: cards[index],
            compact: viewMode == AppCardViewMode.compactList,
            enableContact: enableContact,
          ),
          if (index < cards.length - 1) const SizedBox(height: 8),
        ],
      ],
    );
  }
}

class _PublicCardTile extends StatelessWidget {
  const _PublicCardTile({
    required this.ownerUserId,
    required this.ownerDisplayName,
    required this.card,
    this.compact = false,
    this.enableContact = false,
  });

  final String ownerUserId;
  final String ownerDisplayName;
  final PublicCollectorCard card;
  final bool compact;
  final bool enableContact;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final metaParts = [
      card.setName,
      card.number != '—' ? '#${card.number}' : null,
      card.rarity,
    ].whereType<String>().toList();

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: () => _openPublicCollectorCard(
          context,
          ownerUserId: ownerUserId,
          ownerDisplayName: ownerDisplayName,
          card: card,
          enableContact: enableContact,
        ),
        child: Container(
          decoration: BoxDecoration(
            color: colorScheme.surfaceContainerLow.withValues(alpha: 0.82),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: colorScheme.outline.withValues(alpha: 0.08),
            ),
          ),
          padding: EdgeInsets.all(compact ? 10 : 12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _PublicCardArtwork(card: card, compact: compact),
              SizedBox(width: compact ? 10 : 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      card.name,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style:
                          (compact
                                  ? theme.textTheme.labelLarge
                                  : theme.textTheme.titleMedium)
                              ?.copyWith(
                                fontWeight: FontWeight.w700,
                                height: 1.14,
                                letterSpacing: -0.1,
                              ),
                    ),
                    if (metaParts.isNotEmpty) ...[
                      const SizedBox(height: 5),
                      Text(
                        metaParts.join(' • '),
                        maxLines: compact ? 1 : 2,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: colorScheme.onSurface.withValues(alpha: 0.6),
                          height: 1.34,
                          fontSize: compact ? 11.3 : 12.1,
                        ),
                      ),
                    ],
                    if ((card.publicNote ?? '').trim().isNotEmpty) ...[
                      SizedBox(height: compact ? 5 : 7),
                      Text(
                        card.publicNote!.trim(),
                        maxLines: compact ? 1 : 2,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: colorScheme.onSurface.withValues(alpha: 0.64),
                          fontStyle: FontStyle.italic,
                          height: 1.35,
                          fontSize: compact ? 11.1 : 11.8,
                        ),
                      ),
                    ],
                    if (_shouldShowPublicCardPrice(card)) ...[
                      SizedBox(height: compact ? 7 : 9),
                      _buildPublicCardPricePill(
                        card,
                        size: compact
                            ? CardSurfacePriceSize.dense
                            : CardSurfacePriceSize.list,
                      ),
                    ],
                    if (card.intent != null || card.conditionLabel != null) ...[
                      SizedBox(height: compact ? 7 : 8),
                      Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        children: [
                          if (card.intent != null)
                            _TileBadge(
                              label: _publicIntentLabel(card.intent!),
                              tone: _publicIntentTone(card.intent!),
                            ),
                          if (card.conditionLabel != null)
                            _TileBadge(
                              label: card.conditionLabel!,
                              tone: _BadgeTone.neutral,
                            ),
                        ],
                      ),
                    ],
                    if (enableContact && _canContactCard(card)) ...[
                      SizedBox(height: compact ? 7 : 8),
                      Align(
                        alignment: Alignment.centerLeft,
                        child: ContactOwnerButton(
                          vaultItemId: card.vaultItemId!,
                          cardPrintId: card.cardPrintId,
                          ownerUserId: ownerUserId,
                          ownerDisplayName: ownerDisplayName,
                          cardName: card.name,
                          intent: card.intent,
                          variant: compact
                              ? ContactOwnerButtonVariant.compact
                              : ContactOwnerButtonVariant.outlined,
                        ),
                      ),
                    ],
                    if (enableContact && card.inPlayCopies.length > 1) ...[
                      SizedBox(height: compact ? 5 : 7),
                      TextButton(
                        onPressed: () => _showPublicCollectorCopiesSheet(
                          context,
                          ownerUserId: ownerUserId,
                          ownerDisplayName: ownerDisplayName,
                          card: card,
                        ),
                        style: TextButton.styleFrom(
                          visualDensity: VisualDensity.compact,
                          padding: const EdgeInsets.symmetric(
                            horizontal: 6,
                            vertical: 4,
                          ),
                          minimumSize: Size.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                        child: Text(
                          'View copies (${card.inPlayCopies.length})',
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Padding(
                padding: const EdgeInsets.only(top: 2),
                child: Icon(
                  Icons.chevron_right_rounded,
                  size: 20,
                  color: colorScheme.onSurface.withValues(alpha: 0.28),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PublicCardArtwork extends StatelessWidget {
  const _PublicCardArtwork({required this.card, this.compact = false});

  final PublicCollectorCard card;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    return CardSurfaceArtwork(
      label: card.name,
      imageUrl: card.imageUrl,
      width: compact ? 58 : 68,
      height: compact ? 80 : 96,
      borderRadius: 14,
      padding: const EdgeInsets.all(3),
    );
  }
}

class _PublicCardGridTile extends StatelessWidget {
  const _PublicCardGridTile({
    required this.ownerUserId,
    required this.ownerDisplayName,
    required this.card,
    this.enableContact = false,
  });

  final String ownerUserId;
  final String ownerDisplayName;
  final PublicCollectorCard card;
  final bool enableContact;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final subtitle = [
      card.setName,
      card.number != '—' ? '#${card.number}' : null,
    ].whereType<String>().join(' • ');

    return Material(
      color: colorScheme.surfaceContainerLow.withValues(alpha: 0.82),
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: () => _openPublicCollectorCard(
          context,
          ownerUserId: ownerUserId,
          ownerDisplayName: ownerDisplayName,
          card: card,
          enableContact: enableContact,
        ),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(10, 10, 10, 10),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Stack(
                  children: [
                    Positioned.fill(
                      child: CardSurfaceArtwork(
                        label: card.name,
                        imageUrl: card.imageUrl,
                        borderRadius: 14,
                        padding: const EdgeInsets.all(2),
                      ),
                    ),
                    if (card.intent != null)
                      Positioned(
                        left: 4,
                        top: 4,
                        child: _TileBadge(
                          label: _publicIntentLabel(card.intent!),
                          tone: _publicIntentTone(card.intent!),
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 9),
              Text(
                card.name,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.labelLarge?.copyWith(
                  fontWeight: FontWeight.w700,
                  height: 1.08,
                  letterSpacing: -0.1,
                ),
              ),
              if (subtitle.isNotEmpty) ...[
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: colorScheme.onSurface.withValues(alpha: 0.58),
                    fontSize: 10.5,
                  ),
                ),
              ],
              if ((card.publicNote ?? '').trim().isNotEmpty) ...[
                const SizedBox(height: 6),
                Text(
                  card.publicNote!.trim(),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: colorScheme.onSurface.withValues(alpha: 0.63),
                    fontStyle: FontStyle.italic,
                    fontSize: 10.3,
                    height: 1.32,
                  ),
                ),
              ],
              if (_shouldShowPublicCardPrice(card)) ...[
                const SizedBox(height: 8),
                _buildPublicCardPricePill(
                  card,
                  size: CardSurfacePriceSize.grid,
                ),
              ],
              if (enableContact && _canContactCard(card)) ...[
                const SizedBox(height: 8),
                Align(
                  alignment: Alignment.centerLeft,
                  child: ContactOwnerButton(
                    vaultItemId: card.vaultItemId!,
                    cardPrintId: card.cardPrintId,
                    ownerUserId: ownerUserId,
                    ownerDisplayName: ownerDisplayName,
                    cardName: card.name,
                    intent: card.intent,
                    variant: ContactOwnerButtonVariant.compact,
                  ),
                ),
              ],
              if (enableContact && card.inPlayCopies.length > 1) ...[
                const SizedBox(height: 2),
                TextButton(
                  onPressed: () => _showPublicCollectorCopiesSheet(
                    context,
                    ownerUserId: ownerUserId,
                    ownerDisplayName: ownerDisplayName,
                    card: card,
                  ),
                  style: TextButton.styleFrom(
                    visualDensity: VisualDensity.compact,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 6,
                      vertical: 2,
                    ),
                    minimumSize: Size.zero,
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                  child: Text('View copies (${card.inPlayCopies.length})'),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

void _openPublicCollectorExactCopy(
  BuildContext context, {
  required String ownerUserId,
  required String gvviId,
}) {
  final currentUserId = Supabase.instance.client.auth.currentUser?.id;
  final isOwner = currentUserId != null && currentUserId == ownerUserId;

  Navigator.of(context).push(
    MaterialPageRoute<void>(
      builder: (_) => isOwner
          ? VaultGvviScreen(gvviId: gvviId)
          : PublicGvviScreen(gvviId: gvviId),
    ),
  );
}

bool _shouldShowPublicCardPrice(PublicCollectorCard card) {
  return _resolvePublicCardPriceMode(card) != CardSurfacePriceMode.hidden;
}

CardSurfacePriceMode _resolvePublicCardPriceMode(PublicCollectorCard card) {
  switch ((card.priceDisplayMode ?? '').trim().toLowerCase()) {
    case 'hidden':
      return CardSurfacePriceMode.hidden;
    case 'my_price':
      return CardSurfacePriceMode.manual;
    case 'grookai':
      return CardSurfacePriceMode.grookai;
    default:
      return CardSurfacePriceMode.grookai;
  }
}

Widget _buildPublicCardPricePill(
  PublicCollectorCard card, {
  required CardSurfacePriceSize size,
}) {
  final mode = _resolvePublicCardPriceMode(card);
  if (mode == CardSurfacePriceMode.hidden) {
    return const SizedBox.shrink();
  }

  return CardSurfacePricePill(
    pricing: card.pricing,
    size: size,
    mode: mode,
    manualPrice: card.askingPriceAmount,
    manualCurrency: card.askingPriceCurrency,
  );
}

void _openPublicCollectorCard(
  BuildContext context, {
  required String ownerUserId,
  required String ownerDisplayName,
  required PublicCollectorCard card,
  required bool enableContact,
}) {
  final singleDiscoverableCopy = card.inPlayCopies.length == 1
      ? card.inPlayCopies.first
      : null;
  final exactCopyGvviId = (singleDiscoverableCopy?.gvviId ?? card.gvviId ?? '')
      .trim();

  if (singleDiscoverableCopy != null && exactCopyGvviId.isNotEmpty) {
    _openPublicCollectorExactCopy(
      context,
      ownerUserId: ownerUserId,
      gvviId: exactCopyGvviId,
    );
    return;
  }

  if (card.inPlayCopies.isEmpty && exactCopyGvviId.isNotEmpty) {
    _openPublicCollectorExactCopy(
      context,
      ownerUserId: ownerUserId,
      gvviId: exactCopyGvviId,
    );
    return;
  }

  Navigator.of(context).push(
    MaterialPageRoute<void>(
      builder: (_) => CardDetailScreen(
        cardPrintId: card.cardPrintId,
        gvId: card.gvId,
        name: card.name,
        setName: card.setName,
        setCode: card.setCode,
        number: card.number,
        rarity: card.rarity,
        imageUrl: card.imageUrl,
        contactVaultItemId: enableContact ? card.vaultItemId : null,
        contactOwnerDisplayName: enableContact ? ownerDisplayName : null,
        contactOwnerUserId: enableContact ? ownerUserId : null,
        contactIntent: enableContact ? card.intent : null,
      ),
    ),
  );
}

Future<void> _showPublicCollectorCopiesSheet(
  BuildContext context, {
  required String ownerUserId,
  required String ownerDisplayName,
  required PublicCollectorCard card,
}) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (_) => _PublicCollectorCopiesSheet(
      ownerUserId: ownerUserId,
      ownerDisplayName: ownerDisplayName,
      card: card,
    ),
  );
}

class _PublicCollectorCopiesSheet extends StatelessWidget {
  const _PublicCollectorCopiesSheet({
    required this.ownerUserId,
    required this.ownerDisplayName,
    required this.card,
  });

  final String ownerUserId;
  final String ownerDisplayName;
  final PublicCollectorCard card;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              card.name,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w800,
                letterSpacing: -0.3,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              'Choose an exact copy from this collector.',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: colorScheme.onSurface.withValues(alpha: 0.72),
                height: 1.35,
              ),
            ),
            const SizedBox(height: 12),
            Flexible(
              child: ListView.separated(
                shrinkWrap: true,
                itemCount: card.inPlayCopies.length,
                separatorBuilder: (_, _) => const SizedBox(height: 8),
                itemBuilder: (context, index) {
                  final copy = card.inPlayCopies[index];
                  final gradeLabel =
                      copy.gradeLabel ??
                      [copy.gradeCompany, copy.gradeValue]
                          .whereType<String>()
                          .where((value) => value.trim().isNotEmpty)
                          .join(' ');

                  return Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: colorScheme.surface,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: colorScheme.outline.withValues(alpha: 0.12),
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Wrap(
                          spacing: 6,
                          runSpacing: 6,
                          children: [
                            _TileBadge(
                              label: _publicIntentLabel(copy.intent),
                              tone: _publicIntentTone(copy.intent),
                            ),
                            if (copy.isGraded && gradeLabel.trim().isNotEmpty)
                              _TileBadge(
                                label: gradeLabel,
                                tone: _BadgeTone.neutral,
                              )
                            else if ((copy.conditionLabel ?? '')
                                .trim()
                                .isNotEmpty)
                              _TileBadge(
                                label: copy.conditionLabel!,
                                tone: _BadgeTone.neutral,
                              ),
                            if ((copy.certNumber ?? '').trim().isNotEmpty)
                              _TileBadge(
                                label: 'Cert ${copy.certNumber}',
                                tone: _BadgeTone.neutral,
                              ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        ContactOwnerButton(
                          vaultItemId: copy.vaultItemId,
                          cardPrintId: card.cardPrintId,
                          ownerUserId: ownerUserId,
                          ownerDisplayName: ownerDisplayName,
                          cardName: card.name,
                          intent: copy.intent,
                          buttonLabel: 'Contact about this copy',
                          variant: ContactOwnerButtonVariant.outlined,
                        ),
                        if ((copy.gvviId ?? '').trim().isNotEmpty) ...[
                          const SizedBox(height: 8),
                          TextButton.icon(
                            onPressed: () {
                              Navigator.of(context).pop();
                              _openPublicCollectorExactCopy(
                                context,
                                ownerUserId: ownerUserId,
                                gvviId: copy.gvviId!.trim(),
                              );
                            },
                            icon: const Icon(
                              Icons.open_in_new_rounded,
                              size: 16,
                            ),
                            label: const Text('Open exact copy'),
                          ),
                        ],
                      ],
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

bool _canContactCard(PublicCollectorCard card) {
  return (card.vaultItemId ?? '').trim().isNotEmpty;
}

String _publicIntentLabel(String intent) {
  switch (intent) {
    case 'trade':
      return 'Trade';
    case 'sell':
      return 'Sell';
    case 'showcase':
      return 'Showcase';
    default:
      return intent;
  }
}

_BadgeTone _publicIntentTone(String intent) {
  switch (intent) {
    case 'trade':
      return _BadgeTone.trade;
    case 'sell':
      return _BadgeTone.sell;
    case 'showcase':
      return _BadgeTone.showcase;
    default:
      return _BadgeTone.neutral;
  }
}

enum _BadgeTone { neutral, trade, sell, showcase }

class _TileBadge extends StatelessWidget {
  const _TileBadge({required this.label, required this.tone});

  final String label;
  final _BadgeTone tone;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final colors = switch (tone) {
      _BadgeTone.trade => (
        background: const Color(0xFFF2F8F3),
        border: const Color(0xFFD7E8DA),
        foreground: const Color(0xFF4C6F58),
      ),
      _BadgeTone.sell => (
        background: const Color(0xFFF2F6FB),
        border: const Color(0xFFD9E4F1),
        foreground: const Color(0xFF546B86),
      ),
      _BadgeTone.showcase => (
        background: const Color(0xFFFBF4EA),
        border: const Color(0xFFEDDCC1),
        foreground: const Color(0xFF7D6752),
      ),
      _BadgeTone.neutral => (
        background: colorScheme.surface.withValues(alpha: 0.88),
        border: colorScheme.outline.withValues(alpha: 0.10),
        foreground: colorScheme.onSurface.withValues(alpha: 0.66),
      ),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
      decoration: BoxDecoration(
        color: colors.background,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: colors.border),
      ),
      child: Text(
        label,
        style: theme.textTheme.labelSmall?.copyWith(
          color: colors.foreground,
          fontWeight: FontWeight.w600,
          fontSize: 10.6,
        ),
      ),
    );
  }
}

class _AvatarBadge extends StatelessWidget {
  const _AvatarBadge({required this.profile});

  final PublicCollectorProfile profile;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final initials = _initialsFor(profile.displayName, profile.slug);
    final avatarUrl = profile.avatarUrl;

    return Container(
      width: 52,
      height: 52,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        color: colorScheme.surface.withValues(alpha: 0.78),
        border: Border.all(
          color: colorScheme.onSurface.withValues(alpha: 0.06),
        ),
        boxShadow: [
          BoxShadow(
            color: colorScheme.shadow.withValues(alpha: 0.04),
            blurRadius: 18,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(3),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(13),
          child: DecoratedBox(
            decoration: BoxDecoration(color: colorScheme.primaryContainer),
            child: avatarUrl == null
                ? Center(
                    child: Text(
                      initials,
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w800,
                        color: colorScheme.onPrimaryContainer,
                      ),
                    ),
                  )
                : Image.network(
                    avatarUrl,
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) => Center(
                      child: Text(
                        initials,
                        style: theme.textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w800,
                          color: colorScheme.onPrimaryContainer,
                        ),
                      ),
                    ),
                  ),
          ),
        ),
      ),
    );
  }

  String _initialsFor(String displayName, String slug) {
    final tokens = displayName
        .trim()
        .split(RegExp(r'\s+'))
        .where((token) => token.isNotEmpty)
        .take(2)
        .toList();

    if (tokens.isNotEmpty) {
      return tokens.map((token) => token.substring(0, 1).toUpperCase()).join();
    }

    return slug.isEmpty ? 'GV' : slug.substring(0, 1).toUpperCase();
  }
}

class _IdentityChip extends StatelessWidget {
  const _IdentityChip({required this.icon, required this.label, this.maxWidth});

  final IconData icon;
  final String label;
  final double? maxWidth;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    final chip = Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
      decoration: BoxDecoration(
        color: colorScheme.surface.withValues(alpha: 0.66),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(
          color: colorScheme.onSurface.withValues(alpha: 0.08),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.max,
        children: [
          Icon(
            icon,
            size: 14,
            color: colorScheme.onSurface.withValues(alpha: 0.56),
          ),
          const SizedBox(width: 5),
          Flexible(
            child: Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: theme.textTheme.labelMedium?.copyWith(
                color: colorScheme.onSurface.withValues(alpha: 0.74),
                fontWeight: FontWeight.w600,
                fontSize: 11.5,
              ),
            ),
          ),
        ],
      ),
    );

    if (maxWidth == null) {
      return chip;
    }

    return ConstrainedBox(
      constraints: BoxConstraints(maxWidth: maxWidth!),
      child: chip,
    );
  }
}

class _StateCard extends StatelessWidget {
  const _StateCard({
    required this.icon,
    required this.title,
    required this.body,
    this.child,
    this.action,
  });

  final IconData icon;
  final String title;
  final String body;
  final Widget? child;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Container(
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.14)),
      ),
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: colorScheme.primary.withValues(alpha: 0.10),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: colorScheme.primary),
              ),
              const SizedBox(width: 12),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: colorScheme.primary.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  'Public Wall',
                  style: theme.textTheme.labelMedium?.copyWith(
                    color: colorScheme.primary,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.2,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Text(
            title,
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w700,
              letterSpacing: -0.2,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            body,
            style: theme.textTheme.bodySmall?.copyWith(
              color: colorScheme.onSurface.withValues(alpha: 0.72),
              height: 1.35,
            ),
          ),
          if (child != null) ...[const SizedBox(height: 12), child!],
          if (action != null) ...[
            const SizedBox(height: 12),
            SizedBox(width: double.infinity, child: action!),
          ],
        ],
      ),
    );
  }
}
