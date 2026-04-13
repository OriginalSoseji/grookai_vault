import 'dart:async';

import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../card_detail_screen.dart';
import '../../models/ownership_state.dart';
import '../../services/network/network_stream_service.dart';
import '../../services/vault/ownership_resolver_adapter.dart';
import '../../widgets/app_shell_metrics.dart';
import '../../widgets/contact_owner_button.dart';
import '../../widgets/network/network_interaction_card.dart';
import '../gvvi/public_gvvi_screen.dart';
import '../public_collector/public_collector_screen.dart';
import '../vault/vault_gvvi_screen.dart';

class NetworkScreen extends StatefulWidget {
  const NetworkScreen({super.key});

  @override
  State<NetworkScreen> createState() => NetworkScreenState();
}

class NetworkScreenState extends State<NetworkScreen> {
  static const bool _kNetworkOwnershipDiagnostics = false;

  final SupabaseClient _client = Supabase.instance.client;
  final ScrollController _scrollController = ScrollController();
  final OwnershipResolverAdapter _ownershipAdapter =
      OwnershipResolverAdapter.instance;
  static const int _networkInitialPageSize = 12;
  static const int _networkNextPageSize = 24;
  static const int _networkInitialOwnershipPrimeRowCount = 6;

  NetworkFeedMode _feedMode = NetworkFeedMode.collectors;
  String? _intent;
  bool _loading = true;
  bool _loadingMore = false;
  bool _hasMore = true;
  String? _error;
  NetworkStreamEmptyState _emptyState = NetworkStreamEmptyState.none;
  List<NetworkStreamRow> _rows = const <NetworkStreamRow>[];
  Map<String, OwnershipState> _ownershipStatesByCardPrintId =
      const <String, OwnershipState>{};
  int _loadVersion = 0;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_handleScroll);
    _loadRows(resetSession: true);
  }

  @override
  void dispose() {
    _scrollController
      ..removeListener(_handleScroll)
      ..dispose();
    super.dispose();
  }

  void reload() {
    _loadRows(resetSession: true);
  }

  void _handleScroll() {
    if (!_scrollController.hasClients ||
        _loading ||
        _loadingMore ||
        !_hasMore) {
      return;
    }

    final position = _scrollController.position;
    if (position.pixels >= position.maxScrollExtent - 420) {
      _loadRows(append: true);
    }
  }

  Future<void> _loadRows({
    bool resetSession = false,
    bool append = false,
  }) async {
    final loadVersion = ++_loadVersion;
    final pageSize = append ? _networkNextPageSize : _networkInitialPageSize;
    setState(() {
      if (append) {
        _loadingMore = true;
      } else {
        _loading = true;
        _error = null;
        _hasMore = true;
      }
    });

    try {
      final page = await NetworkStreamService.fetchRows(
        client: _client,
        mode: _feedMode,
        intent: _intent,
        excludeUserId: _client.auth.currentUser?.id,
        viewerUserId: _client.auth.currentUser?.id,
        limit: pageSize,
        resetSession: resetSession,
      );

      if (!mounted || loadVersion != _loadVersion) {
        return;
      }

      final pageCardPrintIds = _cardPrintIdsForRows(page.rows);
      final immediateOwnershipIds = append
          ? pageCardPrintIds
          : _cardPrintIdsForRows(
              page.rows.take(_networkInitialOwnershipPrimeRowCount),
            );
      final deferredOwnershipIds = append
          ? const <String>[]
          : pageCardPrintIds
                .where((id) => !immediateOwnershipIds.contains(id))
                .toList(growable: false);
      Map<String, OwnershipState> pageOwnershipStates =
          const <String, OwnershipState>{};
      if (immediateOwnershipIds.isNotEmpty) {
        try {
          await _ownershipAdapter.primeBatch(immediateOwnershipIds);
          pageOwnershipStates = _ownershipAdapter.snapshotForIds(
            pageCardPrintIds,
          );
        } catch (error) {
          _debugOwnershipPrime('immediate prime failed: $error');
        }
      }

      if (!mounted || loadVersion != _loadVersion) {
        return;
      }

      setState(() {
        _rows = append ? [..._rows, ...page.rows] : page.rows;
        _ownershipStatesByCardPrintId = append
            ? <String, OwnershipState>{
                ..._ownershipStatesByCardPrintId,
                ...pageOwnershipStates,
              }
            : pageOwnershipStates;
        if (!append) {
          _emptyState = page.emptyState;
        }
        _hasMore = page.hasMore;
        if (append) {
          _loadingMore = false;
        } else {
          _loading = false;
        }
      });

      if (!append && deferredOwnershipIds.isNotEmpty) {
        // NETWORK_FIRST_PAINT_AND_FRESHNESS_V1
        // Paint the first viewport after priming only the immediately visible
        // ownership hints, then hydrate the rest of the first page in the
        // background so first open feels lighter.
        unawaited(
          _primeDeferredOwnership(
            cardPrintIds: deferredOwnershipIds,
            loadVersion: loadVersion,
          ),
        );
      }
    } catch (error) {
      if (!mounted || loadVersion != _loadVersion) {
        return;
      }

      setState(() {
        if (append) {
          _hasMore = false;
          _loadingMore = false;
        } else {
          _error = error is Error
              ? error.toString()
              : 'Unable to load the collector network.';
          _emptyState = NetworkStreamEmptyState.none;
          _hasMore = false;
          _loading = false;
        }
      });
    }
  }

  Future<void> _primeDeferredOwnership({
    required Iterable<String> cardPrintIds,
    required int loadVersion,
  }) async {
    final pendingIds = cardPrintIds
        .map((id) => id.trim())
        .where((id) => id.isNotEmpty)
        .toSet()
        .toList(growable: false);
    if (pendingIds.isEmpty) {
      return;
    }

    try {
      await _ownershipAdapter.primeBatch(pendingIds);
    } catch (error) {
      _debugOwnershipPrime('deferred prime failed: $error');
      return;
    }

    if (!mounted || loadVersion != _loadVersion) {
      return;
    }

    final deferredStates = _ownershipAdapter.snapshotForIds(pendingIds);
    if (deferredStates.isEmpty) {
      return;
    }

    setState(() {
      _ownershipStatesByCardPrintId = <String, OwnershipState>{
        ..._ownershipStatesByCardPrintId,
        ...deferredStates,
      };
    });
  }

  void _debugOwnershipPrime(String message) {
    if (!_kNetworkOwnershipDiagnostics) {
      return;
    }
    assert(() {
      debugPrint('NETWORK_OWNERSHIP $message');
      return true;
    }());
  }

  Future<void> _setIntent(String? intent) async {
    if (_intent == intent) {
      return;
    }

    setState(() {
      _intent = intent;
    });
    await _loadRows(resetSession: true);
  }

  Future<void> _setFeedMode(NetworkFeedMode mode) async {
    if (_feedMode == mode) {
      return;
    }

    setState(() {
      _feedMode = mode;
      _error = null;
      _emptyState = NetworkStreamEmptyState.none;
    });
    await _loadRows(resetSession: true);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            colorScheme.surface.withValues(alpha: 0.995),
            colorScheme.surfaceContainerLowest.withValues(alpha: 0.96),
            colorScheme.surface.withValues(alpha: 0.99),
          ],
        ),
      ),
      child: Stack(
        children: [
          const Positioned(
            top: -70,
            left: -36,
            child: _NetworkAtmosphereOrb(
              width: 230,
              height: 230,
              opacity: 0.22,
            ),
          ),
          Positioned(
            top: 110,
            right: -48,
            child: _NetworkAtmosphereOrb(
              width: 210,
              height: 210,
              opacity: colorScheme.brightness == Brightness.dark ? 0.14 : 0.12,
              color: colorScheme.secondaryContainer,
            ),
          ),
          SafeArea(
            bottom: false,
            child: RefreshIndicator(
              onRefresh: () => _loadRows(resetSession: true),
              child: CustomScrollView(
                controller: _scrollController,
                physics: const BouncingScrollPhysics(
                  parent: AlwaysScrollableScrollPhysics(),
                ),
                keyboardDismissBehavior:
                    ScrollViewKeyboardDismissBehavior.onDrag,
                cacheExtent: 960,
                slivers: [
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                      child: _NetworkFeedModeToggle(
                        value: _feedMode,
                        onChanged: (mode) {
                          unawaited(_setFeedMode(mode));
                        },
                      ),
                    ),
                  ),
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
                      child: SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: Row(
                          children: [
                            _IntentChip(
                              label: 'All',
                              selected: _intent == null,
                              onPressed: () => _setIntent(null),
                            ),
                            const SizedBox(width: 8),
                            _IntentChip(
                              label: 'Trade',
                              selected: _intent == 'trade',
                              onPressed: () => _setIntent('trade'),
                            ),
                            const SizedBox(width: 8),
                            _IntentChip(
                              label: 'Sell',
                              selected: _intent == 'sell',
                              onPressed: () => _setIntent('sell'),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SliverToBoxAdapter(child: SizedBox(height: 6)),
                  // PERFORMANCE_P1_NETWORK_LAZY_RENDER
                  // Uses lazy sliver rendering so Network feed scales without
                  // eager whole-page builds in grid or list modes.
                  _NetworkContentSliver(
                    feedMode: _feedMode,
                    rows: _rows,
                    ownershipStatesByCardPrintId: _ownershipStatesByCardPrintId,
                    loading: _loading,
                    error: _error,
                    emptyState: _emptyState,
                    onRetry: () => _loadRows(resetSession: true),
                  ),
                  if (_loadingMore)
                    const SliverToBoxAdapter(
                      child: Padding(
                        padding: EdgeInsets.fromLTRB(0, 14, 0, 14),
                        child: Center(child: CircularProgressIndicator()),
                      ),
                    ),
                  SliverToBoxAdapter(
                    child: SizedBox(
                      height: shellContentBottomPadding(context, extra: 8),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  List<String> _cardPrintIdsForRows(Iterable<NetworkStreamRow> rows) {
    return rows
        .map((row) => row.cardPrintId.trim())
        .where((id) => id.isNotEmpty)
        .toSet()
        .toList(growable: false);
  }
}

class _NetworkContentSliver extends StatelessWidget {
  const _NetworkContentSliver({
    required this.feedMode,
    required this.rows,
    required this.ownershipStatesByCardPrintId,
    required this.loading,
    required this.error,
    required this.emptyState,
    required this.onRetry,
  });

  final NetworkFeedMode feedMode;
  final List<NetworkStreamRow> rows;
  final Map<String, OwnershipState> ownershipStatesByCardPrintId;
  final bool loading;
  final String? error;
  final NetworkStreamEmptyState emptyState;
  final Future<void> Function() onRetry;

  @override
  Widget build(BuildContext context) {
    if (loading) {
      return const SliverToBoxAdapter(
        child: Padding(
          padding: EdgeInsets.symmetric(vertical: 28),
          child: Center(child: CircularProgressIndicator()),
        ),
      );
    }

    if (error != null) {
      return SliverPadding(
        padding: const EdgeInsets.symmetric(horizontal: 12),
        sliver: SliverToBoxAdapter(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _NetworkEmptyState(
                title: 'Unable to load the card stream',
                body: error!,
              ),
              const SizedBox(height: 10),
              FilledButton.tonal(
                onPressed: onRetry,
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    if (rows.isEmpty) {
      final emptyCopy = switch (emptyState) {
        NetworkStreamEmptyState.noFollowedCollectors => (
          title: 'No followed collectors yet',
          body: 'Follow collectors to make this view come alive.',
        ),
        NetworkStreamEmptyState.noFollowedCards => (
          title: 'Nothing from followed collectors right now',
          body:
              'When followed collectors post trade, sell, or showcase cards, they will show up here.',
        ),
        NetworkStreamEmptyState.none =>
          feedMode == NetworkFeedMode.following
              ? (
                  title: 'Nothing from followed collectors right now',
                  body:
                      'When followed collectors post trade, sell, or showcase cards, they will show up here.',
                )
              : (
                  title: 'No cards available right now',
                  body:
                      'Collectors will appear here when they mark cards for trade, sale, or showcase.',
                ),
      };

      return SliverPadding(
        padding: EdgeInsets.symmetric(horizontal: 12),
        sliver: SliverToBoxAdapter(
          child: _NetworkEmptyState(
            title: emptyCopy.title,
            body: emptyCopy.body,
          ),
        ),
      );
    }

    return _NetworkStreamResultsSliver(
      rows: rows,
      ownershipStatesByCardPrintId: ownershipStatesByCardPrintId,
    );
  }
}

class _NetworkStreamResultsSliver extends StatelessWidget {
  const _NetworkStreamResultsSliver({
    required this.rows,
    required this.ownershipStatesByCardPrintId,
  });

  final List<NetworkStreamRow> rows;
  final Map<String, OwnershipState> ownershipStatesByCardPrintId;

  @override
  Widget build(BuildContext context) {
    const spacing = 6.0;
    final childCount = rows.isEmpty ? 0 : rows.length * 2 - 1;

    return SliverPadding(
      padding: const EdgeInsets.symmetric(horizontal: 2),
      sliver: SliverList(
        delegate: SliverChildBuilderDelegate((context, index) {
          if (index.isOdd) {
            return const SizedBox(height: spacing);
          }
          final rowIndex = index ~/ 2;
          // FEED_CHIP_REMOVAL_V1
          // Removed redundant lower-row view controls so the Feed screen keeps
          // only real content filters and always renders in the default
          // comfortable/feed card layout.
          return _buildCard(
            context,
            rows[rowIndex],
            layout: NetworkInteractionCardLayout.feed,
          );
        }, childCount: childCount),
      ),
    );
  }

  Widget _buildCard(
    BuildContext context,
    NetworkStreamRow row, {
    required NetworkInteractionCardLayout layout,
  }) {
    final ownershipState = ownershipStatesByCardPrintId[row.cardPrintId.trim()];
    final directContact = _groupedContactAnchor(row);
    final hook = _buildHookData(row);
    final primaryActionLabel = NetworkStreamService.getPrimaryContactLabel(row);
    final metadata = [
      row.setName,
      if (row.number != '—') '#${row.number}',
    ].where((value) => value.trim().isNotEmpty).join(' • ');
    final supportText = _buildSupportText(row);
    final normalizedCollectorSlug = row.ownerSlug.trim().toLowerCase();
    final topContext = row.isDiscoverySource
        ? _NetworkDiscoveryContext(
            sourceLabel: row.sourceLabel ?? 'Canonical DB',
            markerLabel: row.sourceType == NetworkStreamSourceType.dbHighEnd
                ? 'High-end'
                : 'Explore',
          )
        : _NetworkCollectorContext(
            displayName: row.ownerDisplayName,
            timestampLabel: NetworkStreamService.formatCreatedAtShort(
              row.createdAt,
            ),
            intentLabel: NetworkStreamService.getPrimaryIntentLabel(row),
          );
    final topContextOnPressed =
        row.isDiscoverySource || normalizedCollectorSlug.isEmpty
        ? null
        : () => _openCollectorProfile(context, normalizedCollectorSlug);

    return NetworkInteractionCard(
      title: row.name,
      imageLabel: row.name,
      imageUrl: row.imageUrl,
      metadata: metadata,
      layout: layout,
      onPressed: () =>
          _openNetworkPrimaryDestination(context, row, directContact),
      heroHook: hook == null ? null : _NetworkHookBadge(data: hook),
      topContext: topContext,
      onTopContextPressed: topContextOnPressed,
      supportingInfo: _NetworkSupportingInfo(
        supportText: supportText,
        ownershipState: ownershipState,
      ),
      actionBar: _NetworkActionBar(
        row: row,
        directContact: directContact,
        primaryActionLabel: primaryActionLabel,
        onViewDetails: () =>
            _openNetworkPrimaryDestination(context, row, directContact),
        onChooseCopy: row.inPlayCopies.length > 1
            ? () => _showCopiesSheet(context, row)
            : null,
      ),
    );
  }

  Future<void> _openCollectorProfile(BuildContext context, String slug) async {
    final normalizedSlug = slug.trim().toLowerCase();
    if (normalizedSlug.isEmpty) {
      return;
    }

    // COLLECTOR_SEARCH_IDENTITY_TAP_V1
    // Search result collector identity opens the full public collector
    // profile.
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => PublicCollectorScreen(slug: normalizedSlug),
      ),
    );
  }

  String? _buildSupportText(NetworkStreamRow row) {
    final values = <String>[];
    final visiblePrice = row.pricing?.visibleValue;

    if (row.isDiscoverySource) {
      if (visiblePrice != null) {
        values.add(_formatPrice(visiblePrice));
      }
      final rarity = (row.rarity ?? '').trim();
      if (rarity.isNotEmpty) {
        values.add(rarity);
      }
      return values.isEmpty ? 'Canonical discovery card' : values.join(' • ');
    }

    final ownershipSummary = NetworkStreamService.getOwnershipSummary(row);
    final normalizedOwnership = ownershipSummary.trim().toLowerCase();
    if (row.isGraded ||
        (row.conditionLabel ?? '').trim().isNotEmpty ||
        row.inPlayCopies.length > 1) {
      if (normalizedOwnership.isNotEmpty && normalizedOwnership != 'raw') {
        values.add(ownershipSummary);
      } else if (row.inPlayCopies.length > 1) {
        values.add('${row.inPlayCopies.length} copies');
      }
    }

    if (visiblePrice != null) {
      values.add(_formatPrice(visiblePrice));
    }

    if (values.isEmpty) {
      return null;
    }
    return values.join(' • ');
  }

  String _formatPrice(double value) {
    if (value >= 1000) {
      return '\$${value.toStringAsFixed(0)}';
    }
    return '\$${value.toStringAsFixed(2)}';
  }

  _NetworkHookData? _buildHookData(NetworkStreamRow row) {
    if (row.sourceType == NetworkStreamSourceType.dbHighEnd) {
      return const _NetworkHookData(
        label: 'High-end pick',
        icon: Icons.workspace_premium_rounded,
        highlighted: true,
      );
    }

    if (row.sourceType == NetworkStreamSourceType.dbRandomExplore) {
      return const _NetworkHookData(
        label: 'Explore pick',
        icon: Icons.auto_awesome_outlined,
      );
    }

    if (row.isGraded) {
      return _NetworkHookData(
        label: NetworkStreamService.getOwnershipSummary(row),
        icon: Icons.workspace_premium_rounded,
        highlighted: true,
      );
    }

    if (_isFreshListing(row.createdAt)) {
      return const _NetworkHookData(
        label: 'Just listed',
        icon: Icons.bolt_rounded,
        highlighted: true,
      );
    }

    if (row.inPlayCount > 1) {
      return _NetworkHookData(
        label: '${row.inPlayCount} live',
        icon: Icons.local_fire_department_outlined,
        highlighted: true,
      );
    }

    switch (NetworkStreamService.getPrimaryIntent(row)) {
      case 'sell':
        return const _NetworkHookData(
          label: 'Available now',
          icon: Icons.sell_outlined,
        );
      case 'trade':
        return const _NetworkHookData(
          label: 'Open to trade',
          icon: Icons.swap_horiz_rounded,
        );
      case 'showcase':
        return const _NetworkHookData(
          label: 'Collector pick',
          icon: Icons.auto_awesome_outlined,
        );
      default:
        return null;
    }
  }

  bool _isFreshListing(String? createdAt) {
    final parsed = DateTime.tryParse(createdAt?.trim() ?? '');
    if (parsed == null) {
      return false;
    }

    return DateTime.now().difference(parsed.toLocal()).inHours <= 72;
  }
}

class _NetworkSupportingInfo extends StatelessWidget {
  const _NetworkSupportingInfo({
    required this.supportText,
    required this.ownershipState,
  });

  final String? supportText;
  final OwnershipState? ownershipState;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final children = <Widget>[
      if ((supportText ?? '').trim().isNotEmpty)
        Text(
          supportText!,
          style: theme.textTheme.bodySmall?.copyWith(
            color: colorScheme.onSurface.withValues(alpha: 0.56),
            fontWeight: FontWeight.w500,
            fontSize: 12.3,
            height: 1.3,
          ),
        ),
      if (ownershipState?.owned == true)
        Padding(
          padding: EdgeInsets.only(
            top: (supportText ?? '').trim().isEmpty ? 0 : 4,
          ),
          child: Text(
            ownershipState!.ownedCount > 1
                ? '${ownershipState!.ownedCount} copies'
                : 'In Vault',
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: theme.textTheme.labelSmall?.copyWith(
              color: colorScheme.onSurface.withValues(alpha: 0.62),
              fontWeight: FontWeight.w700,
              letterSpacing: 0.04,
            ),
          ),
        ),
    ];

    if (children.isEmpty) {
      return const SizedBox.shrink();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: children,
    );
  }
}

class _NetworkDiscoveryContext extends StatelessWidget {
  const _NetworkDiscoveryContext({
    required this.sourceLabel,
    required this.markerLabel,
  });

  final String sourceLabel;
  final String markerLabel;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Container(
          width: 26,
          height: 26,
          decoration: BoxDecoration(
            color: colorScheme.primary.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(999),
            border: Border.all(
              color: colorScheme.primary.withValues(alpha: 0.10),
            ),
          ),
          alignment: Alignment.center,
          child: Icon(
            Icons.auto_awesome_rounded,
            size: 14,
            color: colorScheme.primary.withValues(alpha: 0.84),
          ),
        ),
        const SizedBox(width: 9),
        Expanded(
          child: Text.rich(
            TextSpan(
              children: [
                TextSpan(
                  text: 'Grookai Discovery',
                  style: theme.textTheme.labelLarge?.copyWith(
                    fontWeight: FontWeight.w600,
                    color: colorScheme.onSurface.withValues(alpha: 0.80),
                    letterSpacing: -0.04,
                  ),
                ),
                if (sourceLabel.trim().isNotEmpty)
                  TextSpan(
                    text: '  •  $sourceLabel',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: colorScheme.onSurface.withValues(alpha: 0.48),
                      fontWeight: FontWeight.w500,
                    ),
                  ),
              ],
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ),
        const SizedBox(width: 8),
        _NetworkIntentMarker(label: markerLabel),
      ],
    );
  }
}

class _NetworkCollectorContext extends StatelessWidget {
  const _NetworkCollectorContext({
    required this.displayName,
    required this.timestampLabel,
    required this.intentLabel,
  });

  final String displayName;
  final String timestampLabel;
  final String intentLabel;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Container(
          width: 26,
          height: 26,
          decoration: BoxDecoration(
            color: colorScheme.primary.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(999),
            border: Border.all(
              color: colorScheme.primary.withValues(alpha: 0.10),
            ),
          ),
          alignment: Alignment.center,
          child: Text(
            displayName.isEmpty
                ? 'G'
                : displayName.substring(0, 1).toUpperCase(),
            style: theme.textTheme.labelSmall?.copyWith(
              color: colorScheme.onSurface.withValues(alpha: 0.82),
              fontWeight: FontWeight.w800,
            ),
          ),
        ),
        const SizedBox(width: 9),
        Expanded(
          child: Text.rich(
            TextSpan(
              children: [
                TextSpan(
                  text: displayName,
                  style: theme.textTheme.labelLarge?.copyWith(
                    fontWeight: FontWeight.w600,
                    color: colorScheme.onSurface.withValues(alpha: 0.80),
                    letterSpacing: -0.04,
                  ),
                ),
                if (timestampLabel.trim().isNotEmpty)
                  TextSpan(
                    text: '  •  $timestampLabel',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: colorScheme.onSurface.withValues(alpha: 0.48),
                      fontWeight: FontWeight.w500,
                    ),
                  ),
              ],
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ),
        const SizedBox(width: 8),
        _NetworkIntentMarker(label: intentLabel),
      ],
    );
  }
}

class _NetworkIntentMarker extends StatelessWidget {
  const _NetworkIntentMarker({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final normalized = label.trim().toLowerCase();
    final tone = switch (normalized) {
      'trade' => (
        background: const Color(0xFFE9F9EF),
        border: const Color(0xFFB8E3C5),
        foreground: const Color(0xFF17653A),
        icon: Icons.sync_alt_rounded,
      ),
      'sell' => (
        background: const Color(0xFFEAF4FF),
        border: const Color(0xFFB8D6F8),
        foreground: const Color(0xFF1E5A94),
        icon: Icons.sell_outlined,
      ),
      'showcase' => (
        background: const Color(0xFFFEF3E6),
        border: const Color(0xFFF4D2A3),
        foreground: const Color(0xFF93591E),
        icon: Icons.auto_awesome_outlined,
      ),
      _ => (
        background: colorScheme.primary.withValues(alpha: 0.06),
        border: colorScheme.primary.withValues(alpha: 0.10),
        foreground: colorScheme.onSurface.withValues(alpha: 0.64),
        icon: Icons.style_outlined,
      ),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: tone.background,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: tone.border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(tone.icon, size: 13, color: tone.foreground),
          const SizedBox(width: 4),
          Text(
            label,
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: tone.foreground,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.08,
            ),
          ),
        ],
      ),
    );
  }
}

class _NetworkHookData {
  const _NetworkHookData({
    required this.label,
    required this.icon,
    this.highlighted = false,
  });

  final String label;
  final IconData icon;
  final bool highlighted;
}

class _NetworkHookBadge extends StatelessWidget {
  const _NetworkHookBadge({required this.data});

  final _NetworkHookData data;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final foreground = data.highlighted
        ? Colors.white
        : colorScheme.onSurface.withValues(alpha: 0.90);
    final background = data.highlighted
        ? Colors.black.withValues(alpha: 0.52)
        : colorScheme.surface.withValues(alpha: 0.78);
    final border = data.highlighted
        ? Colors.white.withValues(alpha: 0.12)
        : colorScheme.outline.withValues(alpha: 0.08);

    return DecoratedBox(
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.18),
            blurRadius: 18,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(data.icon, size: 14, color: foreground),
            const SizedBox(width: 5),
            Text(
              data.label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style:
                  Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: foreground,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.08,
                  ) ??
                  const TextStyle(),
            ),
          ],
        ),
      ),
    );
  }
}

class _NetworkSummaryBadge extends StatelessWidget {
  const _NetworkSummaryBadge({required this.label, this.emphasis = false});

  final String label;
  final bool emphasis;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final background = emphasis
        ? colorScheme.primary.withValues(alpha: 0.08)
        : colorScheme.surfaceContainerHighest.withValues(alpha: 0.42);
    final foreground = emphasis
        ? colorScheme.primary
        : colorScheme.onSurface.withValues(alpha: 0.72);

    return Container(
      padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(
          color: (emphasis ? colorScheme.primary : colorScheme.outline)
              .withValues(alpha: 0.14),
        ),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
          color: foreground,
          fontWeight: FontWeight.w700,
          height: 1.0,
        ),
      ),
    );
  }
}

class _NetworkActionBar extends StatelessWidget {
  const _NetworkActionBar({
    required this.row,
    required this.directContact,
    required this.primaryActionLabel,
    required this.onViewDetails,
    required this.onChooseCopy,
  });

  final NetworkStreamRow row;
  final _NetworkContactAnchor? directContact;
  final String primaryActionLabel;
  final VoidCallback onViewDetails;
  final VoidCallback? onChooseCopy;

  @override
  Widget build(BuildContext context) {
    final actions = <Widget>[];
    final usesGenericContactLabel = primaryActionLabel == 'Contact owner';
    final usesAboutLabel = primaryActionLabel == 'Ask about this card';

    if (directContact != null) {
      actions.add(
        _NetworkPrimaryActionShell(
          child: ContactOwnerButton(
            vaultItemId: directContact!.vaultItemId,
            cardPrintId: row.cardPrintId,
            ownerUserId: row.ownerUserId,
            ownerDisplayName: row.ownerDisplayName,
            cardName: row.name,
            intent: directContact!.intent,
            buttonLabel: usesGenericContactLabel
                ? 'Ask about this card'
                : primaryActionLabel,
            variant: ContactOwnerButtonVariant.compact,
          ),
        ),
      );
      if (!usesGenericContactLabel && !usesAboutLabel) {
        // NETWORK_FIRST_PAINT_AND_FRESHNESS_V1
        // Keep only one messaging CTA when the primary label already lands on
        // the generic card-question conversation flow.
        actions.add(
          _NetworkSecondaryContactAction(
            vaultItemId: directContact!.vaultItemId,
            cardPrintId: row.cardPrintId,
            ownerUserId: row.ownerUserId,
            ownerDisplayName: row.ownerDisplayName,
            cardName: row.name,
            intent: directContact!.intent,
            label: 'Ask about this card',
          ),
        );
      }
    } else if (onChooseCopy != null) {
      actions.add(
        _NetworkActionLink(
          icon: Icons.question_answer_outlined,
          label: 'Ask about this card',
          onPressed: onChooseCopy!,
          emphasized: true,
        ),
      );
    }

    if (directContact == null && onChooseCopy == null) {
      actions.add(
        _NetworkActionLink(
          icon: Icons.open_in_new_rounded,
          label: row.isDiscoverySource ? 'Open card' : 'View details',
          onPressed: onViewDetails,
        ),
      );
    }

    if (directContact != null && onChooseCopy != null) {
      actions.add(
        _NetworkActionLink(
          icon: Icons.layers_outlined,
          label: 'Choose copy',
          onPressed: onChooseCopy!,
        ),
      );
    }

    return Wrap(spacing: 6, runSpacing: 2, children: actions);
  }
}

class _NetworkPrimaryActionShell extends StatelessWidget {
  const _NetworkPrimaryActionShell({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Theme(
      data: Theme.of(context).copyWith(
        textButtonTheme: TextButtonThemeData(
          style: TextButton.styleFrom(
            foregroundColor: colorScheme.onSurface,
            textStyle: Theme.of(
              context,
            ).textTheme.labelMedium?.copyWith(fontWeight: FontWeight.w700),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            visualDensity: VisualDensity.compact,
            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
          ),
        ),
      ),
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: colorScheme.primary.withValues(alpha: 0.06),
          borderRadius: BorderRadius.circular(999),
          border: Border.all(
            color: colorScheme.primary.withValues(alpha: 0.09),
          ),
        ),
        child: child,
      ),
    );
  }
}

class _NetworkSecondaryContactAction extends StatelessWidget {
  const _NetworkSecondaryContactAction({
    required this.vaultItemId,
    required this.cardPrintId,
    required this.ownerUserId,
    required this.ownerDisplayName,
    required this.cardName,
    required this.label,
    this.intent,
  });

  final String vaultItemId;
  final String cardPrintId;
  final String ownerUserId;
  final String ownerDisplayName;
  final String cardName;
  final String label;
  final String? intent;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final theme = Theme.of(context);

    return Theme(
      data: theme.copyWith(
        textButtonTheme: TextButtonThemeData(
          style: TextButton.styleFrom(
            visualDensity: VisualDensity.compact,
            foregroundColor: colorScheme.onSurface.withValues(alpha: 0.62),
            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 6),
            minimumSize: Size.zero,
            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            textStyle: theme.textTheme.labelMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ),
      child: ContactOwnerButton(
        vaultItemId: vaultItemId,
        cardPrintId: cardPrintId,
        ownerUserId: ownerUserId,
        ownerDisplayName: ownerDisplayName,
        cardName: cardName,
        intent: intent,
        buttonLabel: label,
        variant: ContactOwnerButtonVariant.compact,
      ),
    );
  }
}

class _NetworkActionLink extends StatelessWidget {
  const _NetworkActionLink({
    required this.icon,
    required this.label,
    required this.onPressed,
    this.emphasized = false,
  });

  final IconData icon;
  final String label;
  final VoidCallback onPressed;
  final bool emphasized;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    final child = TextButton.icon(
      onPressed: onPressed,
      style: TextButton.styleFrom(
        visualDensity: VisualDensity.compact,
        foregroundColor: emphasized
            ? colorScheme.primary
            : colorScheme.onSurface.withValues(alpha: 0.62),
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 5),
        minimumSize: Size.zero,
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
      ),
      icon: Icon(icon, size: 16),
      label: Text(label),
    );

    if (!emphasized) {
      return child;
    }

    return DecoratedBox(
      decoration: BoxDecoration(
        color: colorScheme.primary.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: colorScheme.primary.withValues(alpha: 0.09)),
      ),
      child: child,
    );
  }
}

class _NetworkContactAnchor {
  const _NetworkContactAnchor({
    required this.vaultItemId,
    required this.intent,
  });

  final String vaultItemId;
  final String? intent;
}

_NetworkContactAnchor? _groupedContactAnchor(NetworkStreamRow row) {
  // NETWORK_FEED_DISCOVERY_CRASH_FIX_V1
  // Discovery rows use canonical card context only and must not synthesize
  // collector contact actions from placeholder vault or owner fields.
  if (row.isDiscoverySource) {
    return null;
  }

  final copyVaultItemIds = row.inPlayCopies
      .map((copy) => copy.vaultItemId.trim())
      .where((value) => value.isNotEmpty)
      .toSet();

  if (copyVaultItemIds.length > 1) {
    return null;
  }

  final vaultItemId = copyVaultItemIds.isNotEmpty
      ? copyVaultItemIds.first
      : row.vaultItemId;
  if (vaultItemId.trim().isEmpty) {
    return null;
  }

  return _NetworkContactAnchor(
    vaultItemId: vaultItemId,
    intent: NetworkStreamService.getPrimaryIntent(row),
  );
}

void _openCardDetail(
  BuildContext context,
  NetworkStreamRow row,
  _NetworkContactAnchor? directContact,
) {
  Navigator.of(context).push(
    MaterialPageRoute<void>(
      builder: (_) => CardDetailScreen(
        cardPrintId: row.cardPrintId,
        gvId: row.gvId,
        name: row.name,
        setName: row.setName,
        setCode: row.setCode,
        number: row.number,
        imageUrl: row.imageUrl,
        contactVaultItemId: directContact?.vaultItemId,
        contactOwnerDisplayName: row.ownerDisplayName,
        contactOwnerUserId: row.ownerUserId,
        contactIntent: directContact?.intent,
      ),
    ),
  );
}

NetworkStreamCopy? _primaryExactCopy(NetworkStreamRow row) {
  if (row.inPlayCopies.length != 1) {
    return null;
  }

  final copy = row.inPlayCopies.first;
  return (copy.gvviId ?? '').trim().isNotEmpty ? copy : null;
}

void _openNetworkPrimaryDestination(
  BuildContext context,
  NetworkStreamRow row,
  _NetworkContactAnchor? directContact,
) {
  NetworkStreamService.recordInteraction(row, event: 'open');
  final exactCopy = _primaryExactCopy(row);
  if (exactCopy != null) {
    _openExactCopy(context, row, exactCopy);
    return;
  }

  _openCardDetail(context, row, directContact);
}

void _openExactCopy(
  BuildContext context,
  NetworkStreamRow row,
  NetworkStreamCopy copy,
) {
  final gvviId = (copy.gvviId ?? '').trim();
  if (gvviId.isEmpty) {
    return;
  }

  final currentUserId = Supabase.instance.client.auth.currentUser?.id;
  final isOwner = currentUserId != null && currentUserId == row.ownerUserId;

  Navigator.of(context).push(
    MaterialPageRoute<void>(
      builder: (_) => isOwner
          ? VaultGvviScreen(gvviId: gvviId)
          : PublicGvviScreen(gvviId: gvviId),
    ),
  );
}

Future<void> _showCopiesSheet(BuildContext context, NetworkStreamRow row) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (sheetContext) => _NetworkCopiesSheet(row: row),
  );
}

class _NetworkCopiesSheet extends StatelessWidget {
  const _NetworkCopiesSheet({required this.row});

  final NetworkStreamRow row;

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
              row.name,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w800,
                letterSpacing: -0.3,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              'Choose a copy to contact ${row.ownerDisplayName} about.',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: colorScheme.onSurface.withValues(alpha: 0.72),
                height: 1.35,
              ),
            ),
            const SizedBox(height: 12),
            Flexible(
              child: ListView.separated(
                shrinkWrap: true,
                itemCount: row.inPlayCopies.length,
                separatorBuilder: (_, _) => const SizedBox(height: 8),
                itemBuilder: (context, index) {
                  final copy = row.inPlayCopies[index];
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
                            _NetworkSummaryBadge(
                              label: NetworkStreamService.getVaultIntentLabel(
                                copy.intent,
                              ),
                              emphasis: true,
                            ),
                            if (copy.isGraded)
                              _NetworkSummaryBadge(
                                label:
                                    copy.gradeLabel ??
                                    [copy.gradeCompany, copy.gradeValue]
                                        .whereType<String>()
                                        .where(
                                          (value) => value.trim().isNotEmpty,
                                        )
                                        .join(' '),
                              )
                            else if ((copy.conditionLabel ?? '')
                                .trim()
                                .isNotEmpty)
                              _NetworkSummaryBadge(label: copy.conditionLabel!),
                            if ((copy.certNumber ?? '').trim().isNotEmpty)
                              _NetworkSummaryBadge(
                                label: 'Cert ${copy.certNumber}',
                              ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        ContactOwnerButton(
                          vaultItemId: copy.vaultItemId,
                          cardPrintId: row.cardPrintId,
                          ownerUserId: row.ownerUserId,
                          ownerDisplayName: row.ownerDisplayName,
                          cardName: row.name,
                          intent: copy.intent,
                          variant: ContactOwnerButtonVariant.outlined,
                        ),
                        if ((copy.gvviId ?? '').trim().isNotEmpty) ...[
                          const SizedBox(height: 8),
                          TextButton.icon(
                            onPressed: () {
                              Navigator.of(context).pop();
                              _openExactCopy(context, row, copy);
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

class _NetworkFeedModeToggle extends StatelessWidget {
  const _NetworkFeedModeToggle({required this.value, required this.onChanged});

  final NetworkFeedMode value;
  final ValueChanged<NetworkFeedMode> onChanged;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: colorScheme.surface.withValues(alpha: 0.72),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.05)),
      ),
      child: Row(
        children: [
          Expanded(
            child: _NetworkFeedModeChip(
              // FEED_MODE_ROW_V1
              // Top-level feed mode switch: broad collectors feed vs
              // followed-collectors-only feed.
              label: 'Collectors',
              icon: Icons.people_alt_outlined,
              selected: value == NetworkFeedMode.collectors,
              onPressed: () => onChanged(NetworkFeedMode.collectors),
            ),
          ),
          const SizedBox(width: 6),
          Expanded(
            child: _NetworkFeedModeChip(
              label: 'Following',
              icon: Icons.favorite_border_rounded,
              selected: value == NetworkFeedMode.following,
              onPressed: () => onChanged(NetworkFeedMode.following),
            ),
          ),
        ],
      ),
    );
  }
}

class _NetworkAtmosphereOrb extends StatelessWidget {
  const _NetworkAtmosphereOrb({
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

class _NetworkFeedModeChip extends StatelessWidget {
  const _NetworkFeedModeChip({
    required this.label,
    required this.icon,
    required this.selected,
    required this.onPressed,
  });

  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: selected ? null : onPressed,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          curve: Curves.easeOut,
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            color: selected
                ? colorScheme.primary.withValues(alpha: 0.10)
                : Colors.transparent,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: selected
                  ? colorScheme.primary.withValues(alpha: 0.12)
                  : Colors.transparent,
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            mainAxisSize: MainAxisSize.max,
            children: [
              Icon(
                icon,
                size: 16,
                color: selected
                    ? colorScheme.primary.withValues(alpha: 0.86)
                    : colorScheme.onSurface.withValues(alpha: 0.56),
              ),
              const SizedBox(width: 7),
              Flexible(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.labelLarge?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: selected
                        ? colorScheme.primary.withValues(alpha: 0.86)
                        : colorScheme.onSurface.withValues(alpha: 0.68),
                    letterSpacing: 0.05,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _IntentChip extends StatelessWidget {
  const _IntentChip({
    required this.label,
    required this.selected,
    required this.onPressed,
  });

  final String label;
  final bool selected;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(999),
        onTap: onPressed,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          curve: Curves.easeOut,
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
          decoration: BoxDecoration(
            color: selected
                ? colorScheme.primary.withValues(alpha: 0.055)
                : colorScheme.surface.withValues(alpha: 0.68),
            borderRadius: BorderRadius.circular(999),
            border: Border.all(
              color: selected
                  ? colorScheme.primary.withValues(alpha: 0.12)
                  : colorScheme.outline.withValues(alpha: 0.04),
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (selected) ...[
                Container(
                  width: 5,
                  height: 5,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: colorScheme.primary.withValues(alpha: 0.78),
                  ),
                ),
                const SizedBox(width: 7),
              ],
              Text(
                label.toUpperCase(),
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.6,
                  color: selected
                      ? colorScheme.primary.withValues(alpha: 0.82)
                      : colorScheme.onSurface.withValues(alpha: 0.60),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NetworkEmptyState extends StatelessWidget {
  const _NetworkEmptyState({required this.title, required this.body});

  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      decoration: BoxDecoration(
        color: colorScheme.primary.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.14)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: colorScheme.surface,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                color: colorScheme.outline.withValues(alpha: 0.12),
              ),
            ),
            alignment: Alignment.center,
            child: Icon(
              Icons.view_carousel_outlined,
              size: 18,
              color: colorScheme.primary,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
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
          ),
        ],
      ),
    );
  }
}
