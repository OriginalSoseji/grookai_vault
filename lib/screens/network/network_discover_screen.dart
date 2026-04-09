import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../services/public/collector_follow_service.dart';
import '../../services/public/public_collector_service.dart';
import '../../widgets/follow_collector_button.dart';
import '../public_collector/public_collector_screen.dart';

class NetworkDiscoverScreen extends StatefulWidget {
  const NetworkDiscoverScreen({super.key});

  @override
  State<NetworkDiscoverScreen> createState() => _NetworkDiscoverScreenState();
}

class _NetworkDiscoverScreenState extends State<NetworkDiscoverScreen> {
  final SupabaseClient _client = Supabase.instance.client;
  final TextEditingController _searchController = TextEditingController();

  bool _loading = true;
  String? _error;
  List<PublicCollectorDiscoverRow> _collectors = const [];
  Set<String> _followedCollectorIds = const <String>{};
  int _loadVersion = 0;

  @override
  void initState() {
    super.initState();
    _loadCollectors();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadCollectors() async {
    final loadVersion = ++_loadVersion;
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final collectors = await PublicCollectorService.discoverCollectors(
        client: _client,
        query: _searchController.text,
      );
      final viewerUserId = _client.auth.currentUser?.id ?? '';
      final followedCollectorIds = viewerUserId.isEmpty
          ? <String>{}
          : await CollectorFollowService.fetchFollowStateMap(
              client: _client,
              followerUserId: viewerUserId,
              followedUserIds: collectors.map((collector) => collector.userId),
            );

      if (!mounted || loadVersion != _loadVersion) {
        return;
      }

      setState(() {
        _collectors = collectors;
        _followedCollectorIds = followedCollectorIds;
      });
    } catch (error) {
      if (!mounted || loadVersion != _loadVersion) {
        return;
      }

      setState(() {
        _error = error is Error
            ? error.toString()
            : 'Unable to load collectors.';
      });
    } finally {
      if (mounted && loadVersion == _loadVersion) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final trimmedQuery = _searchController.text.trim();
    final resultsTitle = trimmedQuery.isEmpty
        ? 'Collectors to explore'
        : 'Collector results for "$trimmedQuery"';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Collectors'),
        actions: [
          IconButton(
            tooltip: 'Reload',
            onPressed: _loadCollectors,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: DecoratedBox(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              colorScheme.surface.withValues(alpha: 0.995),
              colorScheme.surfaceContainerLowest.withValues(alpha: 0.955),
              colorScheme.surface.withValues(alpha: 0.99),
            ],
          ),
        ),
        child: Stack(
          children: [
            const Positioned(
              top: -72,
              left: -44,
              child: _DiscoverAtmosphereOrb(
                width: 220,
                height: 220,
                opacity: 0.18,
              ),
            ),
            Positioned(
              top: 120,
              right: -42,
              child: _DiscoverAtmosphereOrb(
                width: 190,
                height: 190,
                opacity: 0.10,
                color: colorScheme.secondaryContainer,
              ),
            ),
            SafeArea(
              child: RefreshIndicator(
                onRefresh: _loadCollectors,
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(16, 14, 16, 20),
                  children: [
                    Text(
                      'Find collectors worth following and cards worth opening next.',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: colorScheme.onSurface.withValues(alpha: 0.58),
                        height: 1.35,
                      ),
                    ),
                    const SizedBox(height: 14),
                    _NetworkDiscoverSurfaceCard(
                      padding: const EdgeInsets.all(12),
                      child: Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _searchController,
                              textInputAction: TextInputAction.search,
                              onSubmitted: (_) => _loadCollectors(),
                              decoration: InputDecoration(
                                hintText: 'Search collectors or @username',
                                hintStyle: theme.textTheme.bodyMedium?.copyWith(
                                  color: colorScheme.onSurface.withValues(
                                    alpha: 0.44,
                                  ),
                                ),
                                prefixIcon: Icon(
                                  Icons.search,
                                  color: colorScheme.onSurface.withValues(
                                    alpha: 0.54,
                                  ),
                                ),
                                isDense: true,
                                contentPadding: const EdgeInsets.symmetric(
                                  vertical: 12,
                                ),
                                border: InputBorder.none,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          TextButton(
                            onPressed: _loadCollectors,
                            style: TextButton.styleFrom(
                              foregroundColor: colorScheme.onSurface.withValues(
                                alpha: 0.78,
                              ),
                              padding: const EdgeInsets.symmetric(
                                horizontal: 10,
                                vertical: 8,
                              ),
                              visualDensity: VisualDensity.compact,
                            ),
                            child: const Text('Search'),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 18),
                    Text(
                      resultsTitle,
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w800,
                        letterSpacing: -0.45,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      trimmedQuery.isEmpty
                          ? 'Collectors with public profiles and shared cards.'
                          : 'Tap a collector to open their wall.',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: colorScheme.onSurface.withValues(alpha: 0.52),
                        height: 1.35,
                      ),
                    ),
                    const SizedBox(height: 12),
                    if (_loading)
                      const Center(child: CircularProgressIndicator())
                    else if (_error != null)
                      _DiscoverEmptyState(
                        title: 'Unable to load collectors',
                        body: _error!,
                      )
                    else if (_collectors.isEmpty)
                      _DiscoverEmptyState(
                        title: trimmedQuery.isEmpty
                            ? 'No collectors available right now'
                            : 'No collectors found',
                        body: trimmedQuery.isEmpty
                            ? 'Collectors will appear here when they enable a public profile and shared vault.'
                            : 'Try a display name or @username search.',
                      )
                    else
                      Column(
                        children: [
                          for (
                            var index = 0;
                            index < _collectors.length;
                            index++
                          ) ...[
                            Builder(
                              builder: (context) {
                                final collector = _collectors[index];
                                return _CollectorRowTile(
                                  collector: collector,
                                  isFollowing: _followedCollectorIds.contains(
                                    collector.userId,
                                  ),
                                  onOpened: _loadCollectors,
                                  onFollowChanged: (isFollowing) {
                                    setState(() {
                                      final nextIds = Set<String>.from(
                                        _followedCollectorIds,
                                      );
                                      if (isFollowing) {
                                        nextIds.add(collector.userId);
                                      } else {
                                        nextIds.remove(collector.userId);
                                      }
                                      _followedCollectorIds = nextIds;
                                    });
                                  },
                                );
                              },
                            ),
                            if (index < _collectors.length - 1)
                              const SizedBox(height: 10),
                          ],
                        ],
                      ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _NetworkDiscoverSurfaceCard extends StatelessWidget {
  const _NetworkDiscoverSurfaceCard({
    required this.child,
    this.padding = const EdgeInsets.all(14),
  });

  final Widget child;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            colorScheme.surface.withValues(alpha: 0.995),
            colorScheme.surfaceContainerLowest.withValues(alpha: 0.965),
          ],
        ),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.05)),
      ),
      padding: padding,
      child: child,
    );
  }
}

class _CollectorRowTile extends StatelessWidget {
  const _CollectorRowTile({
    required this.collector,
    required this.isFollowing,
    required this.onOpened,
    required this.onFollowChanged,
  });

  final PublicCollectorDiscoverRow collector;
  final bool isFollowing;
  final VoidCallback onOpened;
  final ValueChanged<bool> onFollowChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final metadata = _formatJoinedAt(collector.createdAt);

    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            colorScheme.surface.withValues(alpha: 0.995),
            colorScheme.surfaceContainerLowest.withValues(alpha: 0.965),
          ],
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.05)),
        boxShadow: [
          BoxShadow(
            color: colorScheme.shadow.withValues(alpha: 0.016),
            blurRadius: 18,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(20),
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
                _CollectorAvatar(collector: collector),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        collector.displayName,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                          letterSpacing: -0.2,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        '@${collector.slug}',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: colorScheme.onSurface.withValues(alpha: 0.56),
                          fontWeight: FontWeight.w600,
                          letterSpacing: 0.1,
                        ),
                      ),
                      if (metadata.isNotEmpty) ...[
                        const SizedBox(height: 5),
                        Text(
                          metadata,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: colorScheme.onSurface.withValues(
                              alpha: 0.54,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(width: 10),
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
                      size: 18,
                      color: colorScheme.onSurface.withValues(alpha: 0.30),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  String _formatJoinedAt(String? rawValue) {
    if (rawValue == null || rawValue.trim().isEmpty) {
      return 'Collector';
    }

    final parsed = DateTime.tryParse(rawValue);
    if (parsed == null) {
      return 'Collector';
    }

    const months = <String>[
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    final monthLabel = months[(parsed.month - 1).clamp(0, months.length - 1)];
    return 'Joined $monthLabel ${parsed.year}';
  }
}

class _CollectorAvatar extends StatelessWidget {
  const _CollectorAvatar({required this.collector});

  final PublicCollectorDiscoverRow collector;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final theme = Theme.of(context);
    final avatarUrl = collector.avatarUrl;
    final initials = _buildInitials();

    return Container(
      width: 46,
      height: 46,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(15),
        color: colorScheme.primaryContainer.withValues(alpha: 0.72),
      ),
      clipBehavior: Clip.antiAlias,
      child: avatarUrl == null
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
              avatarUrl,
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
    );
  }

  String _buildInitials() {
    final tokens = collector.displayName
        .trim()
        .split(RegExp(r'\s+'))
        .where((token) => token.isNotEmpty)
        .take(2)
        .toList();

    if (tokens.isNotEmpty) {
      return tokens.map((token) => token.substring(0, 1).toUpperCase()).join();
    }

    return collector.slug.isEmpty
        ? 'GV'
        : collector.slug.substring(0, 1).toUpperCase();
  }
}

class _DiscoverEmptyState extends StatelessWidget {
  const _DiscoverEmptyState({required this.title, required this.body});

  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      decoration: BoxDecoration(
        color: colorScheme.primary.withValues(alpha: 0.04),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.10)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w700,
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
        ],
      ),
    );
  }
}

class _DiscoverAtmosphereOrb extends StatelessWidget {
  const _DiscoverAtmosphereOrb({
    required this.width,
    required this.height,
    required this.opacity,
    this.color,
  });

  final double width;
  final double height;
  final double opacity;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return IgnorePointer(
      child: Container(
        width: width,
        height: height,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: RadialGradient(
            colors: [
              (color ?? colorScheme.primaryContainer).withValues(
                alpha: opacity,
              ),
              Colors.transparent,
            ],
          ),
        ),
      ),
    );
  }
}
