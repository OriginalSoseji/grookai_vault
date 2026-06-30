import 'dart:async';

import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../card_detail_screen.dart';
import '../../services/network/local_community_feed_service.dart';
import '../../utils/display_image_contract.dart';
import '../../widgets/card_surface_artwork.dart';
import '../public_collector/public_collector_screen.dart';

class NetworkNearbyScreen extends StatefulWidget {
  const NetworkNearbyScreen({super.key});

  @override
  State<NetworkNearbyScreen> createState() => _NetworkNearbyScreenState();
}

class _NetworkNearbyScreenState extends State<NetworkNearbyScreen> {
  late final SupabaseClient _client;
  late final LocalCommunityFeedService _service;
  late Future<LocalCommunityFeedPage> _future;
  bool _openingCard = false;

  @override
  void initState() {
    super.initState();
    _client = Supabase.instance.client;
    _service = LocalCommunityFeedService(client: _client);
    _future = _load();
  }

  Future<LocalCommunityFeedPage> _load() {
    if (!kLocalCommunityFeedV1Enabled) {
      return Future.value(
        const LocalCommunityFeedPage(rows: [], isAuthenticated: true),
      );
    }
    return _service.fetchNearby(limit: 40);
  }

  Future<void> _refresh() async {
    final next = _load();
    setState(() {
      _future = next;
    });
    await next;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Nearby')),
      body: SafeArea(
        child: FutureBuilder<LocalCommunityFeedPage>(
          future: _future,
          builder: (context, snapshot) {
            if (!kLocalCommunityFeedV1Enabled) {
              return const _NearbyMessageState(
                icon: Icons.radar_rounded,
                title: 'Nearby is not enabled yet',
                body: 'Local collector discovery is gated for internal review.',
              );
            }

            if (snapshot.connectionState == ConnectionState.waiting) {
              return const _NearbyLoadingState();
            }

            if (snapshot.hasError) {
              return _NearbyErrorState(onRetry: _refresh);
            }

            final page = snapshot.data;
            if (page == null || !page.isAuthenticated) {
              return const _NearbyMessageState(
                icon: Icons.lock_outline_rounded,
                title: 'Sign in to see nearby collectors',
                body: 'Only authenticated collectors can view local discovery.',
              );
            }

            final rows = page.rows;
            return RefreshIndicator(
              onRefresh: _refresh,
              child: CustomScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                slivers: [
                  const SliverToBoxAdapter(child: _NearbyHeader()),
                  if (rows.isEmpty)
                    const SliverFillRemaining(
                      hasScrollBody: false,
                      child: _NearbyMessageState(
                        icon: Icons.public_off_rounded,
                        title: 'No nearby activity yet',
                        body:
                            'Only public cards from opted-in collectors appear here.',
                      ),
                    )
                  else
                    SliverPadding(
                      padding: const EdgeInsets.fromLTRB(14, 8, 14, 18),
                      sliver: SliverList.separated(
                        itemBuilder: (context, index) => _NearbyCardRow(
                          row: rows[index],
                          openingCard: _openingCard,
                          onOpenCard: () => _openCard(rows[index]),
                          onOpenWall: () => _openWall(rows[index]),
                        ),
                        separatorBuilder: (_, _) => const SizedBox(height: 10),
                        itemCount: rows.length,
                      ),
                    ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }

  Future<void> _openCard(LocalCommunityFeedRow row) async {
    if (_openingCard) return;
    setState(() {
      _openingCard = true;
    });

    Map<String, dynamic>? cardRow;
    try {
      final response = await _client
          .from('card_prints')
          .select(
            'id,gv_id,name,set_code,number,number_plain,rarity,image_url,image_alt_url,representative_image_url,sets(name)',
          )
          .eq('gv_id', row.gvId)
          .maybeSingle();
      cardRow = response == null ? null : Map<String, dynamic>.from(response);
    } catch (_) {
      cardRow = null;
    } finally {
      if (mounted) {
        setState(() {
          _openingCard = false;
        });
      }
    }

    if (!mounted) return;

    final cardPrintId = _text(cardRow?['id']);
    if (cardRow == null || cardPrintId.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('That nearby card could not be opened.')),
      );
      return;
    }

    final Map<String, dynamic> resolvedCard = cardRow;
    final setData = resolvedCard['sets'];
    final setName = setData is Map ? _text(setData['name']) : row.setName;
    final displayNumber = _text(resolvedCard['number']).isNotEmpty
        ? _text(resolvedCard['number'])
        : _text(resolvedCard['number_plain']);

    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => CardDetailScreen(
          cardPrintId: cardPrintId,
          gvId: _text(resolvedCard['gv_id']).isEmpty
              ? row.gvId
              : _text(resolvedCard['gv_id']),
          name: _text(resolvedCard['name']).isEmpty
              ? row.cardName
              : _text(resolvedCard['name']),
          setCode: _text(resolvedCard['set_code']).isEmpty
              ? row.setCode
              : _text(resolvedCard['set_code']),
          setName: setName.isEmpty ? row.setName : setName,
          number: displayNumber.isEmpty ? row.cardNumber : displayNumber,
          rarity: _text(resolvedCard['rarity']).isEmpty
              ? null
              : _text(resolvedCard['rarity']),
          imageUrl: resolveDisplayImageUrlFromRow(resolvedCard) ?? row.imageUrl,
          entrySurface: 'local_community_feed',
        ),
      ),
    );
  }

  void _openWall(LocalCommunityFeedRow row) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => PublicCollectorScreen(slug: row.ownerSlug),
      ),
    );
  }
}

class _NearbyHeader extends StatelessWidget {
  const _NearbyHeader();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Padding(
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: colorScheme.surfaceContainerLow.withValues(alpha: 0.9),
          borderRadius: BorderRadius.circular(22),
          border: Border.all(
            color: colorScheme.outline.withValues(alpha: 0.08),
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(18, 18, 18, 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'NEARBY COLLECTORS',
                style: theme.textTheme.labelSmall?.copyWith(
                  color: colorScheme.onSurface.withValues(alpha: 0.58),
                  fontWeight: FontWeight.w900,
                  letterSpacing: 2,
                ),
              ),
              const SizedBox(height: 10),
              Text(
                'Fresh cards from your local collector area',
                style: theme.textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0,
                  height: 1.05,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Only public cards from opted-in collectors appear here. Exact location is never shown.',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: colorScheme.onSurface.withValues(alpha: 0.68),
                  height: 1.28,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NearbyCardRow extends StatelessWidget {
  const _NearbyCardRow({
    required this.row,
    required this.openingCard,
    required this.onOpenCard,
    required this.onOpenWall,
  });

  final LocalCommunityFeedRow row;
  final bool openingCard;
  final VoidCallback onOpenCard;
  final VoidCallback onOpenWall;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return DecoratedBox(
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.08)),
        boxShadow: [
          BoxShadow(
            color: colorScheme.shadow.withValues(alpha: 0.035),
            blurRadius: 14,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            CardSurfaceArtwork(
              label: row.cardName,
              imageUrl: row.imageUrl,
              width: 82,
              height: 118,
              borderRadius: 16,
              showShadow: false,
              onViewDetails: onOpenCard,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: [
                      _NearbyChip(label: row.localityLabel),
                      _NearbyChip(label: row.sourceLabel, accent: true),
                      if (row.isFollowing)
                        const _NearbyChip(label: 'Following', outline: true),
                      if (row.viewerWishlistMatch)
                        const _NearbyChip(label: 'Wishlist match', warm: true),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Text(
                    row.cardName,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w800,
                      height: 1.08,
                      letterSpacing: 0,
                    ),
                  ),
                  if (row.displaySetLine.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(
                      row.displaySetLine,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: colorScheme.onSurface.withValues(alpha: 0.64),
                      ),
                    ),
                  ],
                  const SizedBox(height: 6),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: _NearbyCollectorWallLink(
                      ownerDisplayName: row.ownerDisplayName,
                      onOpenWall: onOpenWall,
                    ),
                  ),
                  if (row.matchReason == 'viewer_wishlist') ...[
                    const SizedBox(height: 6),
                    Text(
                      'This card matches your wishlist.',
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: colorScheme.tertiary,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ],
                  const SizedBox(height: 10),
                  Divider(
                    height: 1,
                    color: colorScheme.outline.withValues(alpha: 0.08),
                  ),
                  const SizedBox(height: 9),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          _footerText(row),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: theme.textTheme.labelSmall?.copyWith(
                            color: colorScheme.onSurface.withValues(
                              alpha: 0.56,
                            ),
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      OutlinedButton(
                        onPressed: openingCard ? null : onOpenCard,
                        child: const Text('Card'),
                      ),
                      const SizedBox(width: 6),
                      FilledButton(
                        onPressed: onOpenWall,
                        child: const Text('Wall'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _footerText(LocalCommunityFeedRow row) {
    final date = _formatDate(row.createdAt);
    if (date.isEmpty) return row.gvId;
    return '${row.gvId} • $date';
  }
}

class _NearbyCollectorWallLink extends StatelessWidget {
  const _NearbyCollectorWallLink({
    required this.ownerDisplayName,
    required this.onOpenWall,
  });

  final String ownerDisplayName;
  final VoidCallback onOpenWall;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final normalizedName = ownerDisplayName.trim().isEmpty
        ? 'collector'
        : ownerDisplayName.trim();

    // NEARBY_COLLECTOR_NAME_WALL_LINK_V1
    // The visible collector identity must be a direct path to the public Wall,
    // not a plain text label that leaves the Wall hidden behind a separate CTA.
    return TextButton.icon(
      onPressed: onOpenWall,
      style: TextButton.styleFrom(
        padding: const EdgeInsets.symmetric(horizontal: 0, vertical: 2),
        minimumSize: Size.zero,
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
        alignment: Alignment.centerLeft,
        visualDensity: VisualDensity.compact,
      ),
      icon: Icon(
        Icons.person_pin_circle_outlined,
        size: 15,
        color: colorScheme.primary.withValues(alpha: 0.82),
      ),
      label: Text(
        'From $normalizedName',
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: theme.textTheme.bodySmall?.copyWith(
          color: colorScheme.primary.withValues(alpha: 0.90),
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}

class _NearbyChip extends StatelessWidget {
  const _NearbyChip({
    required this.label,
    this.accent = false,
    this.outline = false,
    this.warm = false,
  });

  final String label;
  final bool accent;
  final bool outline;
  final bool warm;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final background = warm
        ? colorScheme.tertiaryContainer.withValues(alpha: 0.74)
        : accent
        ? colorScheme.tertiaryContainer.withValues(alpha: 0.58)
        : colorScheme.surfaceContainerHighest.withValues(alpha: 0.58);
    final borderColor = warm
        ? colorScheme.tertiary.withValues(alpha: 0.34)
        : outline
        ? colorScheme.primary.withValues(alpha: 0.32)
        : colorScheme.outline.withValues(alpha: 0.08);
    final textColor = warm
        ? colorScheme.onTertiaryContainer
        : accent
        ? colorScheme.onTertiaryContainer
        : colorScheme.onSurface.withValues(alpha: 0.72);

    return DecoratedBox(
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: borderColor),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
        child: Text(
          label.isEmpty ? 'Local area' : label,
          style: Theme.of(context).textTheme.labelSmall?.copyWith(
            color: textColor,
            fontWeight: FontWeight.w800,
            letterSpacing: 0.8,
          ),
        ),
      ),
    );
  }
}

class _NearbyLoadingState extends StatelessWidget {
  const _NearbyLoadingState();

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: SizedBox(
        width: 28,
        height: 28,
        child: CircularProgressIndicator(strokeWidth: 2.4),
      ),
    );
  }
}

class _NearbyErrorState extends StatelessWidget {
  const _NearbyErrorState({required this.onRetry});

  final Future<void> Function() onRetry;

  @override
  Widget build(BuildContext context) {
    return _NearbyMessageState(
      icon: Icons.sync_problem_rounded,
      title: 'Nearby could not load',
      body: 'Check your connection and try again.',
      action: OutlinedButton(
        onPressed: () => unawaited(onRetry()),
        child: const Text('Retry'),
      ),
    );
  }
}

class _NearbyMessageState extends StatelessWidget {
  const _NearbyMessageState({
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

String _text(dynamic value) => (value ?? '').toString().trim();

String _formatDate(DateTime? value) {
  if (value == null) return '';
  final local = value.toLocal();
  final month = local.month.toString().padLeft(2, '0');
  final day = local.day.toString().padLeft(2, '0');
  return '$month/$day/${local.year}';
}
