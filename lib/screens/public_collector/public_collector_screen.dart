import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../card_detail_screen.dart';
import '../../services/public/public_collector_service.dart';

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
            _PublicCollectorHeader(profile: result!.profile!),
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
  });

  final PublicCollectorProfile profile;
  final List<PublicCollectorCard> collectionCards;
  final List<PublicCollectorCard> inPlayCards;

  @override
  Widget build(BuildContext context) {
    return _PublicCollectorSegmentedContent(
      profile: profile,
      collectionCards: collectionCards,
      inPlayCards: inPlayCards,
    );
  }
}

class _PublicCollectorSegmentedContent extends StatefulWidget {
  const _PublicCollectorSegmentedContent({
    required this.profile,
    required this.collectionCards,
    required this.inPlayCards,
  });

  final PublicCollectorProfile profile;
  final List<PublicCollectorCard> collectionCards;
  final List<PublicCollectorCard> inPlayCards;

  @override
  State<_PublicCollectorSegmentedContent> createState() =>
      _PublicCollectorSegmentedContentState();
}

class _PublicCollectorSegmentedContentState
    extends State<_PublicCollectorSegmentedContent> {
  late _CollectorSegment _activeSegment;

  @override
  void initState() {
    super.initState();
    _activeSegment = widget.inPlayCards.isNotEmpty
        ? _CollectorSegment.inPlay
        : _CollectorSegment.collection;
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _PublicCollectorHeader(profile: widget.profile),
        const SizedBox(height: 12),
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
        const SizedBox(height: 12),
        if (_activeSegment == _CollectorSegment.inPlay)
          _FeaturedWallSection(cards: widget.inPlayCards)
        else
          _PublicCollectionSection(cards: widget.collectionCards),
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
                : colorScheme.surfaceContainerHighest.withValues(alpha: 0.55),
            foregroundColor: selected
                ? colorScheme.onPrimary
                : colorScheme.onSurface,
            elevation: 0,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
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
      padding: const EdgeInsets.all(6),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.14)),
      ),
      child: Row(
        children: [
          segmentButton(
            segment: _CollectorSegment.collection,
            label: 'Collection',
            count: collectionCount,
          ),
          const SizedBox(width: 10),
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
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
          children: [child],
        ),
      ),
    );
  }
}

class _PublicCollectorHeader extends StatelessWidget {
  const _PublicCollectorHeader({required this.profile});

  final PublicCollectorProfile profile;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Container(
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.14)),
        boxShadow: [
          BoxShadow(
            color: colorScheme.shadow.withValues(alpha: 0.04),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      padding: const EdgeInsets.all(14),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(18),
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              colorScheme.primary.withValues(alpha: 0.10),
              colorScheme.primaryContainer.withValues(alpha: 0.44),
            ],
          ),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            _AvatarBadge(profile: profile),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    profile.displayName,
                    style: theme.textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.4,
                      height: 1.05,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 8),
                  _IdentityChip(
                    icon: Icons.alternate_email_rounded,
                    label: '/u/${profile.slug}',
                    maxWidth: 220,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FeaturedWallSection extends StatelessWidget {
  const _FeaturedWallSection({required this.cards});

  final List<PublicCollectorCard> cards;

  @override
  Widget build(BuildContext context) {
    return _WallSectionCard(
      title: 'In Play',
      description: 'Trade, sell, or showcase cards.',
      emptyMessage: cards.isEmpty ? 'No cards in play' : null,
      child: cards.isEmpty ? null : _PublicCardTileList(cards: cards),
    );
  }
}

class _PublicCollectionSection extends StatelessWidget {
  const _PublicCollectionSection({required this.cards});

  final List<PublicCollectorCard> cards;

  @override
  Widget build(BuildContext context) {
    return _WallSectionCard(
      title: 'Collection',
      description: 'Public cards on this wall.',
      emptyMessage: cards.isEmpty ? 'No public cards yet' : null,
      child: cards.isEmpty ? null : _PublicCardTileList(cards: cards),
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
          Text(
            title,
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w700,
              letterSpacing: -0.2,
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
          if (child != null) ...[const SizedBox(height: 12), child!],
          if (emptyMessage != null) ...[
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
              decoration: BoxDecoration(
                color: colorScheme.primary.withValues(alpha: 0.05),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: colorScheme.outline.withValues(alpha: 0.14),
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
      ),
    );
  }
}

class _PublicCardTileList extends StatelessWidget {
  const _PublicCardTileList({required this.cards});

  final List<PublicCollectorCard> cards;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        for (var index = 0; index < cards.length; index++) ...[
          _PublicCardTile(card: cards[index]),
          if (index < cards.length - 1) const SizedBox(height: 12),
        ],
      ],
    );
  }
}

class _PublicCardTile extends StatelessWidget {
  const _PublicCardTile({required this.card});

  final PublicCollectorCard card;

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
              ),
            ),
          );
        },
        child: Container(
          decoration: BoxDecoration(
            color: colorScheme.primary.withValues(alpha: 0.04),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: colorScheme.outline.withValues(alpha: 0.14),
            ),
          ),
          padding: const EdgeInsets.all(12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _PublicCardArtwork(card: card),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      card.name,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                        height: 1.15,
                      ),
                    ),
                    if (metaParts.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        metaParts.join(' • '),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: colorScheme.onSurface.withValues(alpha: 0.72),
                          height: 1.35,
                        ),
                      ),
                    ],
                    if (card.intent != null || card.conditionLabel != null) ...[
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          if (card.intent != null)
                            _TileBadge(
                              label: _intentLabel(card.intent!),
                              tone: _intentTone(card.intent!),
                            ),
                          if (card.conditionLabel != null)
                            _TileBadge(
                              label: card.conditionLabel!,
                              tone: _BadgeTone.neutral,
                            ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 10),
              Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    'View card',
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: colorScheme.primary,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Icon(
                    Icons.chevron_right_rounded,
                    color: colorScheme.onSurface.withValues(alpha: 0.38),
                  ),
                ],
              ),
            ],
          ),
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
}

class _PublicCardArtwork extends StatelessWidget {
  const _PublicCardArtwork({required this.card});

  final PublicCollectorCard card;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Container(
      width: 68,
      height: 92,
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.12)),
      ),
      clipBehavior: Clip.antiAlias,
      child: card.imageUrl == null
          ? Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                child: Text(
                  card.name,
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.center,
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: colorScheme.onSurface.withValues(alpha: 0.64),
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            )
          : Image.network(
              card.imageUrl!,
              fit: BoxFit.cover,
              errorBuilder: (context, error, stackTrace) => Center(
                child: Icon(
                  Icons.style_outlined,
                  color: colorScheme.onSurface.withValues(alpha: 0.34),
                ),
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
        background: const Color(0xFFE9F9EF),
        border: const Color(0xFFB8E3C5),
        foreground: const Color(0xFF17653A),
      ),
      _BadgeTone.sell => (
        background: const Color(0xFFEAF4FF),
        border: const Color(0xFFB8D6F8),
        foreground: const Color(0xFF1E5A94),
      ),
      _BadgeTone.showcase => (
        background: const Color(0xFFFEF3E6),
        border: const Color(0xFFF4D2A3),
        foreground: const Color(0xFF93591E),
      ),
      _BadgeTone.neutral => (
        background: colorScheme.surface,
        border: colorScheme.outline.withValues(alpha: 0.14),
        foreground: colorScheme.onSurface.withValues(alpha: 0.72),
      ),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: colors.background,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: colors.border),
      ),
      child: Text(
        label,
        style: theme.textTheme.labelMedium?.copyWith(
          color: colors.foreground,
          fontWeight: FontWeight.w700,
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
      width: 68,
      height: 68,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(22),
        color: colorScheme.surface.withValues(alpha: 0.72),
        border: Border.all(
          color: colorScheme.onSurface.withValues(alpha: 0.08),
        ),
        boxShadow: [
          BoxShadow(
            color: colorScheme.shadow.withValues(alpha: 0.08),
            blurRadius: 18,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(5),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(18),
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
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: colorScheme.surface.withValues(alpha: 0.8),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(
          color: colorScheme.onSurface.withValues(alpha: 0.10),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.max,
        children: [
          Icon(icon, size: 16, color: colorScheme.primary),
          const SizedBox(width: 8),
          Flexible(
            child: Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: theme.textTheme.labelLarge?.copyWith(
                color: colorScheme.onSurface,
                fontWeight: FontWeight.w700,
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
