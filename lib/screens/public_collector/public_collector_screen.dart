import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../card_detail_screen.dart';
import '../../models/ownership_state.dart';
import '../../services/navigation/grookai_web_route_service.dart';
import '../../services/public/collector_follow_service.dart';
import '../../services/public/public_collector_service.dart';
import '../../services/vault/ownership_resolver_adapter.dart';
import '../../widgets/card_surface_artwork.dart';
import '../../widgets/card_surface_price.dart';
import '../gvvi/public_gvvi_screen.dart';
import '../network/network_inbox_screen.dart';
import 'public_collector_relationship_screen.dart';

enum PublicCollectorViewState {
  loading,
  notFound,
  unavailable,
  empty,
  success,
  failure,
}

enum _CollectorSegment { collection, inPlay }

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
  bool _followStateLoading = false;
  bool _followActionBusy = false;
  bool _isFollowing = false;
  int _loadVersion = 0;

  String get _normalizedSlug => widget.slug.trim().toLowerCase();
  String get _viewerUserId => (_client.auth.currentUser?.id ?? '').trim();

  bool _isSelfProfile(PublicCollectorProfile? profile) {
    if (profile == null) {
      return false;
    }
    final viewerUserId = _viewerUserId;
    final viewedUserId = profile.userId.trim();
    return viewerUserId.isNotEmpty &&
        viewedUserId.isNotEmpty &&
        viewerUserId == viewedUserId;
  }

  bool _shouldShowFollowAction(PublicCollectorProfile? profile) {
    if (profile == null) {
      return false;
    }
    return profile.userId.trim().isNotEmpty && !_isSelfProfile(profile);
  }

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
      _followStateLoading = false;
      _followActionBusy = false;
      _isFollowing = false;
    });

    try {
      final result = await PublicCollectorService.loadBySlug(
        client: _client,
        slug: _normalizedSlug,
      );

      if (!mounted || loadVersion != _loadVersion) {
        return;
      }

      setState(() {
        _result = result;
        _viewState = _mapResultToState(result);
      });

      final profile = result.profile;
      if (profile != null) {
        unawaited(_loadFollowState(profile: profile, loadVersion: loadVersion));
      }
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

  Future<void> _loadFollowState({
    required PublicCollectorProfile profile,
    required int loadVersion,
  }) async {
    if (!_shouldShowFollowAction(profile)) {
      if (!mounted || loadVersion != _loadVersion) {
        return;
      }

      setState(() {
        _followStateLoading = false;
        _isFollowing = false;
      });
      return;
    }

    final viewerUserId = _viewerUserId;
    if (viewerUserId.isEmpty) {
      if (!mounted || loadVersion != _loadVersion) {
        return;
      }

      setState(() {
        _followStateLoading = false;
        _isFollowing = false;
      });
      return;
    }

    if (mounted && loadVersion == _loadVersion) {
      setState(() {
        _followStateLoading = true;
      });
    }

    try {
      final isFollowing = await CollectorFollowService.fetchFollowState(
        client: _client,
        followerUserId: viewerUserId,
        followedUserId: profile.userId,
      );

      if (!mounted || loadVersion != _loadVersion) {
        return;
      }

      setState(() {
        _followStateLoading = false;
        _isFollowing = isFollowing;
      });
    } catch (_) {
      if (!mounted || loadVersion != _loadVersion) {
        return;
      }

      setState(() {
        _followStateLoading = false;
        _isFollowing = false;
      });
    }
  }

  Future<void> _handleFollowAction() async {
    final result = _result;
    final profile = result?.profile;
    if (profile == null ||
        !_shouldShowFollowAction(profile) ||
        _followActionBusy) {
      return;
    }

    setState(() {
      _followActionBusy = true;
    });

    try {
      final toggleResult = _isFollowing
          ? await CollectorFollowService.unfollowCollector(
              client: _client,
              followedUserId: profile.userId,
            )
          : await CollectorFollowService.followCollector(
              client: _client,
              followedUserId: profile.userId,
            );

      if (!mounted) {
        return;
      }

      if (!toggleResult.ok) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(toggleResult.message)));
        setState(() {
          _followActionBusy = false;
        });
        return;
      }

      setState(() {
        _isFollowing = toggleResult.isFollowing;
      });

      await _refreshProfileRelationshipState(
        profile: profile,
        followState: toggleResult.isFollowing,
      );
    } catch (_) {
      if (!mounted) {
        return;
      }

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Follow state could not be updated right now.'),
        ),
      );
    } finally {
      if (mounted) {
        setState(() {
          _followActionBusy = false;
        });
      }
    }
  }

  Future<void> _refreshProfileRelationshipState({
    required PublicCollectorProfile profile,
    required bool followState,
  }) async {
    try {
      final refreshedProfile =
          await PublicCollectorService.loadPublicProfileBySlug(
            client: _client,
            slug: profile.slug,
          );

      if (!mounted) {
        return;
      }

      setState(() {
        _isFollowing = followState;
        if (refreshedProfile != null && _result != null) {
          _result = _resultWithRefreshedProfile(_result!, refreshedProfile);
        }
      });
    } catch (_) {
      if (!mounted) {
        return;
      }

      setState(() {
        _isFollowing = followState;
      });
    }
  }

  PublicCollectorSurfaceResult _resultWithRefreshedProfile(
    PublicCollectorSurfaceResult current,
    PublicCollectorProfile refreshedProfile,
  ) {
    switch (current.state) {
      case PublicCollectorSurfaceState.empty:
        return PublicCollectorSurfaceResult.empty(refreshedProfile);
      case PublicCollectorSurfaceState.success:
        return PublicCollectorSurfaceResult.success(
          profile: refreshedProfile,
          collectionCards: current.collectionCards,
          inPlayCards: current.inPlayCards,
        );
      case PublicCollectorSurfaceState.notFound:
      case PublicCollectorSurfaceState.unavailable:
        return current;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final body = _CollectorScaffoldBody(child: _buildBody());

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
            tooltip: 'Messages',
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => const NetworkInboxScreen(),
                ),
              );
            },
            icon: const Icon(Icons.mail_outline_rounded),
          ),
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
              showFollowAction: _shouldShowFollowAction(result.profile),
              isFollowing: _isFollowing,
              followStateLoading: _followStateLoading,
              followActionBusy: _followActionBusy,
              onFollowPressed: _handleFollowAction,
            ),
            const SizedBox(height: 12),
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
          showFollowAction: _shouldShowFollowAction(profile),
          isFollowing: _isFollowing,
          followStateLoading: _followStateLoading,
          followActionBusy: _followActionBusy,
          onFollowPressed: _handleFollowAction,
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
    required this.showFollowAction,
    required this.isFollowing,
    required this.followStateLoading,
    required this.followActionBusy,
    required this.onFollowPressed,
  });

  final PublicCollectorProfile profile;
  final List<PublicCollectorCard> collectionCards;
  final List<PublicCollectorCard> inPlayCards;
  final bool showFollowAction;
  final bool isFollowing;
  final bool followStateLoading;
  final bool followActionBusy;
  final Future<void> Function() onFollowPressed;

  @override
  Widget build(BuildContext context) {
    return _PublicCollectorSegmentedContent(
      profile: profile,
      collectionCards: collectionCards,
      inPlayCards: inPlayCards,
      showFollowAction: showFollowAction,
      isFollowing: isFollowing,
      followStateLoading: followStateLoading,
      followActionBusy: followActionBusy,
      onFollowPressed: onFollowPressed,
    );
  }
}

class _PublicCollectorSegmentedContent extends StatefulWidget {
  const _PublicCollectorSegmentedContent({
    required this.profile,
    required this.collectionCards,
    required this.inPlayCards,
    required this.showFollowAction,
    required this.isFollowing,
    required this.followStateLoading,
    required this.followActionBusy,
    required this.onFollowPressed,
  });

  final PublicCollectorProfile profile;
  final List<PublicCollectorCard> collectionCards;
  final List<PublicCollectorCard> inPlayCards;
  final bool showFollowAction;
  final bool isFollowing;
  final bool followStateLoading;
  final bool followActionBusy;
  final Future<void> Function() onFollowPressed;

  @override
  State<_PublicCollectorSegmentedContent> createState() =>
      _PublicCollectorSegmentedContentState();
}

class _PublicCollectorSegmentedContentState
    extends State<_PublicCollectorSegmentedContent> {
  final OwnershipResolverAdapter _ownershipAdapter =
      OwnershipResolverAdapter.instance;
  late _CollectorSegment _activeSegment;
  Map<String, OwnershipState> _viewerOwnershipByCardPrintId =
      const <String, OwnershipState>{};
  int _ownershipPrimeVersion = 0;

  String get _viewerUserId =>
      (Supabase.instance.client.auth.currentUser?.id ?? '').trim();

  bool get _isViewingOwnPublicSurface {
    final viewerUserId = _viewerUserId;
    final ownerUserId = widget.profile.userId.trim();
    return viewerUserId.isNotEmpty &&
        ownerUserId.isNotEmpty &&
        viewerUserId == ownerUserId;
  }

  @override
  void initState() {
    super.initState();
    _activeSegment = widget.inPlayCards.isNotEmpty
        ? _CollectorSegment.inPlay
        : _CollectorSegment.collection;
    unawaited(_primeViewerOwnership());
  }

  @override
  void didUpdateWidget(covariant _PublicCollectorSegmentedContent oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.profile.userId != widget.profile.userId ||
        !_sameCardSet(oldWidget.collectionCards, widget.collectionCards) ||
        !_sameCardSet(oldWidget.inPlayCards, widget.inPlayCards)) {
      unawaited(_primeViewerOwnership());
    }
  }

  Future<void> _primeViewerOwnership() async {
    final requestVersion = ++_ownershipPrimeVersion;
    if (_viewerUserId.isEmpty || _isViewingOwnPublicSurface) {
      if (mounted) {
        setState(() {
          _viewerOwnershipByCardPrintId = const <String, OwnershipState>{};
        });
      }
      return;
    }

    final cardPrintIds = [
      ...widget.collectionCards.map((card) => card.cardPrintId),
      ...widget.inPlayCards.map((card) => card.cardPrintId),
    ];

    try {
      await _ownershipAdapter.primeBatch(cardPrintIds);
      if (!mounted || requestVersion != _ownershipPrimeVersion) {
        return;
      }
      setState(() {
        _viewerOwnershipByCardPrintId = _ownershipAdapter.snapshotForIds(
          cardPrintIds,
        );
      });
    } catch (error) {
      debugPrint(
        'PERFORMANCE_P6_PUBLIC_COLLECTOR_SYNC_OWNERSHIP_CLOSEOUT prime failed: $error',
      );
    }
  }

  bool _sameCardSet(
    List<PublicCollectorCard> left,
    List<PublicCollectorCard> right,
  ) {
    if (identical(left, right)) {
      return true;
    }
    if (left.length != right.length) {
      return false;
    }
    for (var index = 0; index < left.length; index += 1) {
      if (left[index].cardPrintId != right[index].cardPrintId) {
        return false;
      }
    }
    return true;
  }

  OwnershipState? _viewerOwnershipStateForCard(PublicCollectorCard card) {
    if (_viewerUserId.isEmpty || _isViewingOwnPublicSurface) {
      return null;
    }
    final normalizedCardPrintId = card.cardPrintId.trim();
    return _viewerOwnershipByCardPrintId[normalizedCardPrintId] ??
        _ownershipAdapter.peek(normalizedCardPrintId);
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _PublicCollectorHeader(
          profile: widget.profile,
          showFollowAction: widget.showFollowAction,
          isFollowing: widget.isFollowing,
          followStateLoading: widget.followStateLoading,
          followActionBusy: widget.followActionBusy,
          onFollowPressed: widget.onFollowPressed,
        ),
        const SizedBox(height: 8),
        _CollectorSegmentControl(
          activeSegment: _activeSegment,
          onChanged: (segment) {
            setState(() {
              _activeSegment = segment;
            });
          },
          collectionCount: widget.collectionCards.length,
          inPlayCount: widget.inPlayCards.length,
        ),
        const SizedBox(height: 8),
        if (_activeSegment == _CollectorSegment.inPlay)
          _FeaturedWallSection(
            cards: widget.inPlayCards,
            viewerOwnershipStateForCard: _viewerOwnershipStateForCard,
          )
        else
          _PublicCollectionSection(
            cards: widget.collectionCards,
            viewerOwnershipStateForCard: _viewerOwnershipStateForCard,
          ),
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
          child: Text('$label ($count)'),
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
  const _CollectorScaffoldBody({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return SafeArea(
      child: DecoratedBox(
        decoration: BoxDecoration(color: colorScheme.surface),
        child: ListView(
          padding: const EdgeInsets.fromLTRB(10, 8, 10, 18),
          children: [child],
        ),
      ),
    );
  }
}

class _PublicCollectorHeader extends StatelessWidget {
  const _PublicCollectorHeader({
    required this.profile,
    required this.showFollowAction,
    required this.isFollowing,
    required this.followStateLoading,
    required this.followActionBusy,
    required this.onFollowPressed,
  });

  final PublicCollectorProfile profile;
  final bool showFollowAction;
  final bool isFollowing;
  final bool followStateLoading;
  final bool followActionBusy;
  final Future<void> Function() onFollowPressed;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final displayName = profile.displayName.trim().isEmpty
        ? (profile.slug.trim().isEmpty ? 'Public collector' : profile.slug)
        : profile.displayName.trim();
    final slugLabel = profile.slug.trim().isEmpty
        ? 'Grookai collector'
        : '/u/${profile.slug}';
    final shareUri = profile.slug.trim().isEmpty
        ? null
        : GrookaiWebRouteService.buildUri('/u/${profile.slug}');

    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(22),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            colorScheme.primary.withValues(alpha: 0.06),
            colorScheme.primaryContainer.withValues(alpha: 0.26),
          ],
        ),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.10)),
      ),
      padding: const EdgeInsets.fromLTRB(12, 11, 12, 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _AvatarBadge(profile: profile),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  displayName,
                  style: theme.textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w800,
                    letterSpacing: -0.45,
                    height: 1.0,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 3),
                Text(
                  slugLabel,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.labelLarge?.copyWith(
                    color: colorScheme.onSurface.withValues(alpha: 0.64),
                    fontWeight: FontWeight.w600,
                  ),
                ),
                if (showFollowAction) ...[
                  const SizedBox(height: 10),
                  _ProfileFollowButton(
                    // FOLLOW_ACTION_V1
                    // Public collector profiles expose Follow / Following using the existing relationship system.
                    isFollowing: isFollowing,
                    loading: followStateLoading || followActionBusy,
                    onPressed: onFollowPressed,
                  ),
                ],
                const SizedBox(height: 8),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    _ProfileStatChip(
                      icon: Icons.group_outlined,
                      label: '${profile.followerCount} followers',
                      onTap: () {
                        Navigator.of(context).push(
                          MaterialPageRoute<void>(
                            builder: (_) => PublicCollectorRelationshipScreen(
                              profile: profile,
                              mode: PublicCollectorRelationshipMode.followers,
                            ),
                          ),
                        );
                      },
                    ),
                    _ProfileStatChip(
                      icon: Icons.people_alt_outlined,
                      label: '${profile.followingCount} following',
                      onTap: () {
                        Navigator.of(context).push(
                          MaterialPageRoute<void>(
                            builder: (_) => PublicCollectorRelationshipScreen(
                              profile: profile,
                              mode: PublicCollectorRelationshipMode.following,
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
          if (shareUri != null)
            IconButton(
              tooltip: 'Share profile',
              visualDensity: VisualDensity.compact,
              padding: const EdgeInsets.all(8),
              style: IconButton.styleFrom(
                foregroundColor: colorScheme.onSurface,
                backgroundColor: colorScheme.surface.withValues(alpha: 0.78),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                  side: BorderSide(
                    color: colorScheme.outline.withValues(alpha: 0.10),
                  ),
                ),
              ),
              onPressed: () async {
                await Clipboard.setData(
                  ClipboardData(text: shareUri.toString()),
                );
                if (!context.mounted) return;
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Profile link copied to clipboard.'),
                  ),
                );
              },
              icon: const Icon(Icons.share_outlined, size: 18),
            ),
        ],
      ),
    );
  }
}

class _ProfileFollowButton extends StatelessWidget {
  const _ProfileFollowButton({
    required this.isFollowing,
    required this.loading,
    required this.onPressed,
  });

  final bool isFollowing;
  final bool loading;
  final Future<void> Function() onPressed;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final label = isFollowing ? 'Following' : 'Follow';
    final foregroundColor = isFollowing
        ? colorScheme.onSurface.withValues(alpha: 0.84)
        : colorScheme.onPrimary;
    final backgroundColor = isFollowing
        ? colorScheme.surface.withValues(alpha: 0.78)
        : colorScheme.primary;
    final borderColor = isFollowing
        ? colorScheme.outline.withValues(alpha: 0.10)
        : colorScheme.primary.withValues(alpha: 0.18);

    return SizedBox(
      height: 40,
      child: FilledButton(
        onPressed: loading ? null : () => unawaited(onPressed()),
        style: FilledButton.styleFrom(
          backgroundColor: backgroundColor,
          foregroundColor: foregroundColor,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
            side: BorderSide(color: borderColor),
          ),
          textStyle: theme.textTheme.labelLarge?.copyWith(
            fontWeight: FontWeight.w700,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (loading)
              SizedBox(
                width: 14,
                height: 14,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation<Color>(foregroundColor),
                ),
              )
            else
              Icon(
                isFollowing
                    ? Icons.check_rounded
                    : Icons.person_add_alt_1_rounded,
                size: 16,
              ),
            const SizedBox(width: 8),
            Text(label),
          ],
        ),
      ),
    );
  }
}

class _FeaturedWallSection extends StatelessWidget {
  const _FeaturedWallSection({
    required this.cards,
    required this.viewerOwnershipStateForCard,
  });

  final List<PublicCollectorCard> cards;
  final OwnershipState? Function(PublicCollectorCard card)
  viewerOwnershipStateForCard;

  @override
  Widget build(BuildContext context) {
    return _WallSectionCard(
      title: 'In Play',
      emptyMessage: cards.isEmpty ? 'No cards in play' : null,
      child: cards.isEmpty
          ? null
          : _PublicCardTileList(
              cards: cards,
              viewerOwnershipStateForCard: viewerOwnershipStateForCard,
            ),
    );
  }
}

class _PublicCollectionSection extends StatelessWidget {
  const _PublicCollectionSection({
    required this.cards,
    required this.viewerOwnershipStateForCard,
  });

  final List<PublicCollectorCard> cards;
  final OwnershipState? Function(PublicCollectorCard card)
  viewerOwnershipStateForCard;

  @override
  Widget build(BuildContext context) {
    return _WallSectionCard(
      title: 'Collection',
      emptyMessage: cards.isEmpty ? 'No public cards yet' : null,
      child: cards.isEmpty
          ? null
          : _PublicCardTileList(
              cards: cards,
              viewerOwnershipStateForCard: viewerOwnershipStateForCard,
            ),
    );
  }
}

class _WallSectionCard extends StatelessWidget {
  const _WallSectionCard({required this.title, this.emptyMessage, this.child});

  final String title;
  final String? emptyMessage;
  final Widget? child;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    if (child != null) {
      return child!;
    }

    return Container(
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.34),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.08)),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            title == 'In Play'
                ? Icons.local_offer_outlined
                : Icons.collections_outlined,
            size: 16,
            color: colorScheme.onSurface.withValues(alpha: 0.54),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              emptyMessage ?? '$title is empty.',
              style: theme.textTheme.bodySmall?.copyWith(
                color: colorScheme.onSurface.withValues(alpha: 0.68),
                fontWeight: FontWeight.w600,
                height: 1.28,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _PublicCardTileList extends StatelessWidget {
  const _PublicCardTileList({
    required this.cards,
    required this.viewerOwnershipStateForCard,
  });

  final List<PublicCollectorCard> cards;
  final OwnershipState? Function(PublicCollectorCard card)
  viewerOwnershipStateForCard;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final columns = constraints.maxWidth >= 900
            ? 4
            : constraints.maxWidth >= 620
            ? 3
            : constraints.maxWidth >= 260
            ? 2
            : 1;
        const spacing = 6.0;
        final width =
            (constraints.maxWidth - (spacing * (columns - 1))) / columns;

        return Wrap(
          spacing: spacing,
          runSpacing: spacing,
          children: [
            for (final card in cards)
              SizedBox(
                width: width,
                child: _PublicCardTile(
                  card: card,
                  ownershipState: viewerOwnershipStateForCard(card),
                ),
              ),
          ],
        );
      },
    );
  }
}

class _PublicCardTile extends StatelessWidget {
  const _PublicCardTile({required this.card, this.ownershipState});

  final PublicCollectorCard card;
  final OwnershipState? ownershipState;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final metaParts = [
      card.setName ?? card.setCode,
      card.number != '—' ? '#${card.number}' : null,
      card.rarity,
    ].whereType<String>().toList();

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(22),
        onTap: () {
          final gvviId = (card.gvviId ?? '').trim();
          Navigator.of(context).push(
            MaterialPageRoute<void>(
              builder: (_) => gvviId.isNotEmpty
                  ? PublicGvviScreen(gvviId: gvviId)
                  : CardDetailScreen(
                      cardPrintId: card.cardPrintId,
                      gvId: card.gvId,
                      name: card.name,
                      setName: card.setName,
                      setCode: card.setCode,
                      number: card.number,
                      rarity: card.rarity,
                      imageUrl: card.imageUrl,
                    ),
            ),
          );
        },
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            AspectRatio(
              aspectRatio: 0.69,
              child: CardSurfaceArtwork(
                label: card.name,
                imageUrl: card.imageUrl,
                borderRadius: 22,
                padding: const EdgeInsets.all(1.5),
                backgroundColor: colorScheme.surfaceContainerLow.withValues(
                  alpha: 0.52,
                ),
              ),
            ),
            const SizedBox(height: 6),
            SizedBox(
              height: 40,
              child: Text(
                card.name,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w800,
                  height: 1.04,
                  letterSpacing: -0.3,
                ),
              ),
            ),
            const SizedBox(height: 3),
            SizedBox(
              height: 22,
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Expanded(
                    child: Text(
                      metaParts.isEmpty ? 'Card' : metaParts.join(' • '),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: colorScheme.onSurface.withValues(alpha: 0.60),
                        fontWeight: FontWeight.w600,
                        letterSpacing: 0.02,
                      ),
                    ),
                  ),
                  const SizedBox(width: 6),
                  _buildPricePill(card),
                ],
              ),
            ),
            const SizedBox(height: 5),
            SizedBox(
              height: 22,
              child: Align(
                alignment: Alignment.centerLeft,
                child: Wrap(
                  spacing: 5,
                  runSpacing: 5,
                  children: [
                    if (card.intent != null)
                      _TileBadge(
                        label: _intentLabel(card.intent!),
                        tone: _intentTone(card.intent!),
                      )
                    else
                      const _TileBadge(
                        label: 'Collection',
                        tone: _BadgeTone.neutral,
                      ),
                    if (card.conditionLabel != null)
                      _TileBadge(
                        label: card.conditionLabel!,
                        tone: _BadgeTone.neutral,
                      ),
                  ],
                ),
              ),
            ),
            if (ownershipState != null) ...[
              const SizedBox(height: 4),
              // PERFORMANCE_P6_PUBLIC_COLLECTOR_SYNC_OWNERSHIP_CLOSEOUT
              // Public collector ownership hints render from precomputed snapshot state only.
              // OWNERSHIP_P1_PUBLIC_BRIDGE_V1
              // Public-owner truth is primary.
              // Viewer-owned awareness is secondary and must not override the owner's card context.
              SizedBox(
                height: 18,
                child: _PublicViewerOwnershipHint(
                  ownershipState: ownershipState!,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  String _intentLabel(String intent) {
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

  _BadgeTone _intentTone(String intent) {
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

  Widget _buildPricePill(PublicCollectorCard card) {
    final displayMode = (card.priceDisplayMode ?? '').trim().toLowerCase();
    if (displayMode == 'hidden') {
      return const _PricePlaceholderPill(label: 'Private');
    }

    return CardSurfacePricePill(
      pricing: card.pricing,
      size: CardSurfacePriceSize.grid,
      mode: displayMode == 'my_price'
          ? CardSurfacePriceMode.manual
          : CardSurfacePriceMode.automatic,
      manualPrice: card.askingPriceAmount,
      manualCurrency: card.askingPriceCurrency,
    );
  }
}

class _PublicViewerOwnershipHint extends StatelessWidget {
  const _PublicViewerOwnershipHint({required this.ownershipState});

  final OwnershipState ownershipState;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    if (!ownershipState.owned) {
      return const SizedBox.shrink();
    }

    final label = ownershipState.ownedCount > 1
        ? '${ownershipState.ownedCount} copies in your vault'
        : 'In Vault';

    return Align(
      alignment: Alignment.centerLeft,
      child: Text(
        label,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: theme.textTheme.labelSmall?.copyWith(
          color: colorScheme.onSurface.withValues(alpha: 0.54),
          fontWeight: FontWeight.w700,
          letterSpacing: 0.02,
        ),
      ),
    );
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
        background: const Color(0xFFF2FAF5),
        border: const Color(0xFFD8ECDC),
        foreground: const Color(0xFF2F6B48),
      ),
      _BadgeTone.sell => (
        background: const Color(0xFFF3F7FD),
        border: const Color(0xFFD7E4F4),
        foreground: const Color(0xFF45658A),
      ),
      _BadgeTone.showcase => (
        background: const Color(0xFFFFF6EA),
        border: const Color(0xFFF0DFC1),
        foreground: const Color(0xFF8A6535),
      ),
      _BadgeTone.neutral => (
        background: colorScheme.surfaceContainerHighest.withValues(alpha: 0.34),
        border: colorScheme.outline.withValues(alpha: 0.08),
        foreground: colorScheme.onSurface.withValues(alpha: 0.64),
      ),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
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
          height: 1.0,
        ),
      ),
    );
  }
}

class _PricePlaceholderPill extends StatelessWidget {
  const _PricePlaceholderPill({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3.5),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.38),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.08)),
      ),
      child: Text(
        label,
        style: theme.textTheme.labelSmall?.copyWith(
          color: colorScheme.onSurface.withValues(alpha: 0.62),
          fontWeight: FontWeight.w600,
          height: 1.0,
        ),
      ),
    );
  }
}

class _ProfileStatChip extends StatelessWidget {
  const _ProfileStatChip({required this.icon, required this.label, this.onTap});

  final IconData icon;
  final String label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(999),
        onTap: onTap,
        child: Ink(
          padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
          decoration: BoxDecoration(
            color: colorScheme.surface.withValues(alpha: 0.72),
            borderRadius: BorderRadius.circular(999),
            border: Border.all(
              color: colorScheme.onSurface.withValues(alpha: 0.06),
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                icon,
                size: 14,
                color: colorScheme.primary.withValues(alpha: 0.82),
              ),
              const SizedBox(width: 6),
              Text(
                label,
                style: theme.textTheme.labelSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: colorScheme.onSurface.withValues(alpha: 0.72),
                ),
              ),
            ],
          ),
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
      width: 56,
      height: 56,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        color: colorScheme.surface.withValues(alpha: 0.62),
        border: Border.all(
          color: colorScheme.onSurface.withValues(alpha: 0.06),
        ),
        boxShadow: [
          BoxShadow(
            color: colorScheme.shadow.withValues(alpha: 0.04),
            blurRadius: 12,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(4),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(14),
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
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: colorScheme.primary.withValues(alpha: 0.10),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(icon, color: colorScheme.primary),
              ),
              const SizedBox(width: 12),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 8,
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
          const SizedBox(height: 18),
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
