import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../services/network/local_community_feed_service.dart';
import '../public_collector/public_collector_screen.dart';

class NetworkNearbyMapScreen extends StatefulWidget {
  const NetworkNearbyMapScreen({super.key});

  @override
  State<NetworkNearbyMapScreen> createState() => _NetworkNearbyMapScreenState();
}

class _NetworkNearbyMapScreenState extends State<NetworkNearbyMapScreen> {
  late final LocalCommunityFeedService _service;
  late Future<LocalCommunityFeedPage> _future;

  @override
  void initState() {
    super.initState();
    _service = LocalCommunityFeedService(client: Supabase.instance.client);
    _future = _load();
  }

  Future<LocalCommunityFeedPage> _load() {
    if (!kLocalCommunityFeedV1Enabled) {
      return Future.value(
        const LocalCommunityFeedPage(rows: [], isAuthenticated: true),
      );
    }
    return _service.fetchNearby(limit: 80);
  }

  Future<void> _refresh() async {
    final next = _load();
    setState(() {
      _future = next;
    });
    await next;
  }

  void _openCollector(_NearbyMapCollector collector) {
    if (collector.ownerSlug.isEmpty) {
      return;
    }
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => PublicCollectorScreen(slug: collector.ownerSlug),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Store Map')),
      body: SafeArea(
        child: FutureBuilder<LocalCommunityFeedPage>(
          future: _future,
          builder: (context, snapshot) {
            if (!kLocalCommunityFeedV1Enabled) {
              return const _NearbyMapMessageState(
                icon: Icons.storefront_outlined,
                title: 'Store Map is not enabled yet',
                body: 'Local collector discovery is gated for internal review.',
              );
            }

            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            }

            if (snapshot.hasError) {
              return _NearbyMapMessageState(
                icon: Icons.sync_problem_rounded,
                title: 'Nearby Map could not load',
                body: 'Check your connection and try again.',
                action: OutlinedButton(
                  onPressed: () => unawaited(_refresh()),
                  child: const Text('Retry'),
                ),
              );
            }

            final page = snapshot.data;
            if (page == null || !page.isAuthenticated) {
              return const _NearbyMapMessageState(
                icon: Icons.lock_outline_rounded,
                title: 'Sign in to see nearby collectors',
                body: 'Only authenticated collectors can view local discovery.',
              );
            }

            final collectors = _NearbyMapCollector.fromRows(page.rows);
            if (collectors.isEmpty) {
              return const _NearbyMapMessageState(
                icon: Icons.public_off_rounded,
                title: 'No nearby collectors yet',
                body: 'Only public cards from opted-in collectors appear here.',
              );
            }

            return RefreshIndicator(
              onRefresh: _refresh,
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(14, 12, 14, 18),
                children: [
                  _NearbyMapHeader(collectorCount: collectors.length),
                  const SizedBox(height: 12),
                  _NearbyStoreMapPreview(),
                  const SizedBox(height: 12),
                  _NearbyCollectorsListHeader(
                    collectorCount: collectors.length,
                  ),
                  const SizedBox(height: 8),
                  for (final collector in collectors) ...[
                    _NearbyMapCollectorCard(
                      collector: collector,
                      onOpen: () => _openCollector(collector),
                    ),
                    const SizedBox(height: 10),
                  ],
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}

class _NearbyMapCollector {
  const _NearbyMapCollector({
    required this.ownerSlug,
    required this.ownerDisplayName,
    required this.localityLabel,
    required this.distanceBucket,
    required this.cardCount,
    required this.latestCardName,
    required this.isFollowing,
    required this.hasWishlistMatch,
  });

  final String ownerSlug;
  final String ownerDisplayName;
  final String localityLabel;
  final String distanceBucket;
  final int cardCount;
  final String latestCardName;
  final bool isFollowing;
  final bool hasWishlistMatch;

  String get areaLabel => localityLabel.trim().isEmpty
      ? (distanceBucket == 'nearby' ? 'Nearby' : 'Same region')
      : localityLabel.trim();

  String get initials {
    final source = ownerDisplayName.trim().isEmpty
        ? ownerSlug.trim()
        : ownerDisplayName.trim();
    if (source.isEmpty) return 'G';
    final tokens = source
        .split(RegExp(r'\s+'))
        .where((token) => token.trim().isNotEmpty)
        .toList();
    if (tokens.length >= 2) {
      return '${tokens.first[0]}${tokens[1][0]}'.toUpperCase();
    }
    return source.substring(0, math.min(2, source.length)).toUpperCase();
  }

  static List<_NearbyMapCollector> fromRows(List<LocalCommunityFeedRow> rows) {
    final grouped = <String, List<LocalCommunityFeedRow>>{};
    for (final row in rows) {
      final slug = row.ownerSlug.trim().toLowerCase();
      if (slug.isEmpty) continue;
      grouped.putIfAbsent(slug, () => <LocalCommunityFeedRow>[]).add(row);
    }

    final collectors = grouped.entries.map((entry) {
      final ownerRows = [...entry.value]
        ..sort((left, right) {
          final leftDate = left.createdAt;
          final rightDate = right.createdAt;
          if (leftDate == null && rightDate == null) return 0;
          if (leftDate == null) return 1;
          if (rightDate == null) return -1;
          return rightDate.compareTo(leftDate);
        });
      final first = ownerRows.first;
      return _NearbyMapCollector(
        ownerSlug: entry.key,
        ownerDisplayName: first.ownerDisplayName,
        localityLabel: first.localityLabel,
        distanceBucket: first.distanceBucket,
        cardCount: ownerRows.length,
        latestCardName: first.cardName,
        isFollowing: ownerRows.any((row) => row.isFollowing),
        hasWishlistMatch: ownerRows.any((row) => row.viewerWishlistMatch),
      );
    }).toList();

    collectors.sort((left, right) {
      final byWishlist =
          (right.hasWishlistMatch ? 1 : 0) - (left.hasWishlistMatch ? 1 : 0);
      if (byWishlist != 0) return byWishlist;
      final byFollowing =
          (right.isFollowing ? 1 : 0) - (left.isFollowing ? 1 : 0);
      if (byFollowing != 0) return byFollowing;
      return left.ownerDisplayName.compareTo(right.ownerDisplayName);
    });
    return collectors;
  }
}

class _NearbyMapHeader extends StatelessWidget {
  const _NearbyMapHeader({required this.collectorCount});

  final int collectorCount;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return DecoratedBox(
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerLow.withValues(alpha: 0.9),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.08)),
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(18, 18, 18, 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'STORE MAP',
              style: theme.textTheme.labelSmall?.copyWith(
                color: colorScheme.onSurface.withValues(alpha: 0.58),
                fontWeight: FontWeight.w900,
                letterSpacing: 2,
              ),
            ),
            const SizedBox(height: 10),
            Text(
              'Stores on the map. Collectors nearby.',
              style: theme.textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.w800,
                letterSpacing: 0,
                height: 1.05,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              '$collectorCount nearby public ${collectorCount == 1 ? 'collector' : 'collectors'} found. Collector locations are never shown on the map.',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: colorScheme.onSurface.withValues(alpha: 0.68),
                height: 1.28,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _NearbyStoreMapPreview extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return DecoratedBox(
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(26),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.10)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            AspectRatio(
              aspectRatio: 1.45,
              child: DecoratedBox(
                decoration: BoxDecoration(
                  color: colorScheme.surfaceContainerHighest.withValues(
                    alpha: 0.38,
                  ),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: colorScheme.outline.withValues(alpha: 0.08),
                  ),
                ),
                child: Stack(
                  children: [
                    Positioned.fill(
                      child: CustomPaint(
                        painter: _NearbyStoreMapPainter(
                          colorScheme: colorScheme,
                        ),
                      ),
                    ),
                    Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.storefront_outlined,
                            size: 34,
                            color: colorScheme.onSurface.withValues(
                              alpha: 0.58,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Verified store map',
                            style: theme.textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Reserved for shops that opt in.',
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: colorScheme.onSurface.withValues(
                                alpha: 0.62,
                              ),
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Icon(
                  Icons.privacy_tip_outlined,
                  size: 16,
                  color: colorScheme.onSurface.withValues(alpha: 0.58),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Only verified store locations belong on this map. Nearby collectors stay list-only.',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: colorScheme.onSurface.withValues(alpha: 0.62),
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _NearbyCollectorsListHeader extends StatelessWidget {
  const _NearbyCollectorsListHeader({required this.collectorCount});

  final int collectorCount;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Padding(
      padding: const EdgeInsets.fromLTRB(2, 6, 2, 0),
      child: Row(
        children: [
          Icon(
            Icons.people_alt_outlined,
            size: 18,
            color: colorScheme.onSurface.withValues(alpha: 0.58),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              'Nearby collectors',
              style: theme.textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
          Text(
            collectorCount.toString(),
            style: theme.textTheme.labelMedium?.copyWith(
              color: colorScheme.onSurface.withValues(alpha: 0.58),
              fontWeight: FontWeight.w900,
            ),
          ),
        ],
      ),
    );
  }
}

class _NearbyStoreMapPainter extends CustomPainter {
  const _NearbyStoreMapPainter({required this.colorScheme});

  final ColorScheme colorScheme;

  @override
  void paint(Canvas canvas, Size size) {
    final areaPaint = Paint()
      ..style = PaintingStyle.fill
      ..color = colorScheme.primary.withValues(alpha: 0.045);
    final linePaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.4
      ..color = colorScheme.outline.withValues(alpha: 0.13);

    final path = Path()
      ..moveTo(size.width * 0.06, size.height * 0.24)
      ..cubicTo(
        size.width * 0.22,
        size.height * 0.05,
        size.width * 0.48,
        size.height * 0.12,
        size.width * 0.62,
        size.height * 0.28,
      )
      ..cubicTo(
        size.width * 0.82,
        size.height * 0.50,
        size.width * 0.70,
        size.height * 0.85,
        size.width * 0.44,
        size.height * 0.84,
      )
      ..cubicTo(
        size.width * 0.18,
        size.height * 0.83,
        size.width * 0.02,
        size.height * 0.58,
        size.width * 0.06,
        size.height * 0.24,
      )
      ..close();
    canvas.drawPath(path, areaPaint);
    canvas.drawPath(path, linePaint);

    for (var i = 1; i <= 3; i += 1) {
      final y = size.height * (i / 4);
      canvas.drawLine(
        Offset(size.width * 0.08, y),
        Offset(size.width * 0.92, y + (i.isOdd ? 12 : -10)),
        linePaint,
      );
    }
    for (var i = 1; i <= 2; i += 1) {
      final x = size.width * (i / 3);
      canvas.drawLine(
        Offset(x, size.height * 0.10),
        Offset(x + (i.isOdd ? 18 : -16), size.height * 0.90),
        linePaint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _NearbyStoreMapPainter oldDelegate) {
    return oldDelegate.colorScheme != colorScheme;
  }
}

class _NearbyMapCollectorCard extends StatelessWidget {
  const _NearbyMapCollectorCard({
    required this.collector,
    required this.onOpen,
  });

  final _NearbyMapCollector collector;
  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Material(
      color: colorScheme.surface,
      borderRadius: BorderRadius.circular(22),
      child: InkWell(
        borderRadius: BorderRadius.circular(22),
        onTap: onOpen,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              CircleAvatar(
                backgroundColor: collector.hasWishlistMatch
                    ? colorScheme.tertiaryContainer
                    : colorScheme.primaryContainer,
                foregroundColor: collector.hasWishlistMatch
                    ? colorScheme.onTertiaryContainer
                    : colorScheme.onPrimaryContainer,
                child: Text(
                  collector.initials,
                  style: const TextStyle(fontWeight: FontWeight.w900),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      collector.ownerDisplayName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      '${collector.areaLabel} • ${collector.cardCount} public ${collector.cardCount == 1 ? 'card' : 'cards'}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: colorScheme.onSurface.withValues(alpha: 0.62),
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      collector.latestCardName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: colorScheme.onSurface.withValues(alpha: 0.50),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              if (collector.isFollowing)
                const _NearbyMapMiniChip(label: 'Following'),
              if (collector.hasWishlistMatch)
                const _NearbyMapMiniChip(label: 'Wishlist'),
              Icon(
                Icons.chevron_right_rounded,
                color: colorScheme.onSurface.withValues(alpha: 0.44),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NearbyMapMiniChip extends StatelessWidget {
  const _NearbyMapMiniChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.only(left: 4),
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.72),
          borderRadius: BorderRadius.circular(999),
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
          child: Text(
            label,
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: colorScheme.onSurface.withValues(alpha: 0.66),
              fontWeight: FontWeight.w900,
              fontSize: 10,
            ),
          ),
        ),
      ),
    );
  }
}

class _NearbyMapMessageState extends StatelessWidget {
  const _NearbyMapMessageState({
    required this.icon,
    required this.title,
    required this.body,
    this.action,
  });

  final IconData icon;
  final String title;
  final String body;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 34,
              color: colorScheme.onSurface.withValues(alpha: 0.42),
            ),
            const SizedBox(height: 12),
            Text(
              title,
              textAlign: TextAlign.center,
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w800,
                letterSpacing: 0,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              body,
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: colorScheme.onSurface.withValues(alpha: 0.62),
                height: 1.28,
              ),
            ),
            if (action != null) ...[const SizedBox(height: 14), action!],
          ],
        ),
      ),
    );
  }
}
