import 'dart:async';
import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../services/identity/catalog_artwork_resolution.dart';
import '../../services/onboarding/onboarding_ladder_service.dart';
import '../../services/public/collector_follow_service.dart';
import '../../services/vault/vault_card_service.dart';
import '../card_surface_artwork.dart';

class OnboardingLadderOverlay extends StatefulWidget {
  const OnboardingLadderOverlay({
    super.key,
    required this.service,
    required this.initialState,
    required this.onDismissed,
    required this.onOpenScanner,
    required this.onOpenSearch,
  });

  final OnboardingLadderService service;
  final OnboardingLadderState initialState;
  final VoidCallback onDismissed;
  final Future<void> Function() onOpenScanner;
  final VoidCallback onOpenSearch;

  @override
  State<OnboardingLadderOverlay> createState() =>
      _OnboardingLadderOverlayState();
}

enum _OnboardingPanel { own, ownSearch, want, loopPromise, follow }

class _OnboardingLadderOverlayState extends State<OnboardingLadderOverlay> {
  late OnboardingLadderState _state;
  _OnboardingPanel _panel = _OnboardingPanel.own;
  bool _busy = false;
  bool _scanFailedToSearch = false;
  bool _loadingSuggestions = false;
  List<OnboardingCollectorSuggestion> _suggestions =
      const <OnboardingCollectorSuggestion>[];
  Set<String> _followedCollectorIds = <String>{};
  Map<String, OnboardingSearchCard> _cardsById =
      const <String, OnboardingSearchCard>{};

  final TextEditingController _searchController = TextEditingController();
  Timer? _searchDebounce;
  List<OnboardingSearchCard> _searchResults = const <OnboardingSearchCard>[];
  String? _searchMessage;
  bool _searching = false;

  @override
  void initState() {
    super.initState();
    _state = widget.initialState;
    _panel = _panelForState(_state);
    _loadAuxiliaryData();
  }

  @override
  void dispose() {
    _searchDebounce?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  _OnboardingPanel _panelForState(OnboardingLadderState state) {
    if (state.needsOwned) return _OnboardingPanel.own;
    if (state.needsWanted) return _OnboardingPanel.want;
    if (state.shouldShowLoopPromise) return _OnboardingPanel.loopPromise;
    return _OnboardingPanel.follow;
  }

  int get _stepNumber => switch (_panel) {
    _OnboardingPanel.own || _OnboardingPanel.ownSearch => 1,
    _OnboardingPanel.want || _OnboardingPanel.loopPromise => 2,
    _OnboardingPanel.follow => 3,
  };

  Future<void> _loadAuxiliaryData() async {
    final cardIds = <String>{
      if (_state.ownedCardPrintId.isNotEmpty) _state.ownedCardPrintId,
      if (_state.wantedCardPrintId.isNotEmpty) _state.wantedCardPrintId,
    };
    if (cardIds.isNotEmpty) {
      try {
        final cards = await widget.service.loadCardsById(cardIds);
        if (mounted) setState(() => _cardsById = cards);
      } catch (_) {}
    }

    if (!_state.needsOwned && !_state.needsWanted) {
      await _loadSuggestions();
    }
  }

  Future<void> _refreshState() async {
    try {
      final next = await widget.service.loadState();
      if (!mounted) return;
      setState(() {
        _state = next;
        _panel = _panelForState(next);
      });
      await _loadAuxiliaryData();
    } catch (_) {}
  }

  Future<void> _loadSuggestions() async {
    setState(() => _loadingSuggestions = true);
    try {
      final rows = await widget.service.loadCollectorSuggestions(limit: 3);
      if (!mounted) return;
      setState(() => _suggestions = rows);
    } catch (_) {
      if (!mounted) return;
      setState(() => _suggestions = const <OnboardingCollectorSuggestion>[]);
    } finally {
      if (mounted) setState(() => _loadingSuggestions = false);
    }
  }

  Future<void> _skipStep() async {
    widget.onDismissed();
    unawaited(widget.service.skip(scope: 'step'));
  }

  Future<void> _openScanner() async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      await widget.onOpenScanner();
      await _refreshState();
      if (_state.needsOwned && mounted) {
        setState(() {
          _scanFailedToSearch = true;
          _panel = _OnboardingPanel.ownSearch;
        });
      }
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _scanFailedToSearch = true;
        _panel = _OnboardingPanel.ownSearch;
      });
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _searchChanged(String query) {
    _searchDebounce?.cancel();
    _searchDebounce = Timer(const Duration(milliseconds: 260), () {
      unawaited(_runSearch(query));
    });
  }

  Future<void> _runSearch(String query) async {
    final normalized = query.trim();
    if (normalized.length < 2) {
      if (mounted) {
        setState(() {
          _searchResults = const <OnboardingSearchCard>[];
          _searchMessage = null;
        });
      }
      return;
    }
    setState(() {
      _searching = true;
      _searchMessage = null;
    });
    try {
      final rows = await widget.service.searchCards(normalized);
      if (!mounted) return;
      setState(() {
        _searchResults = rows;
        _searchMessage = rows.isEmpty ? 'No matching cards found yet.' : null;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _searchResults = const <OnboardingSearchCard>[];
        _searchMessage = 'Search is temporarily unavailable.';
      });
    } finally {
      if (mounted) setState(() => _searching = false);
    }
  }

  Future<void> _addSearchCard(OnboardingSearchCard card) async {
    if (_busy || card.cardPrintId.isEmpty) return;
    final userId = Supabase.instance.client.auth.currentUser?.id;
    if (userId == null || userId.isEmpty) {
      setState(() => _searchMessage = 'Sign in to add cards to your vault.');
      return;
    }
    setState(() => _busy = true);
    try {
      await VaultCardService.addOrIncrementVaultItem(
        client: Supabase.instance.client,
        userId: userId,
        cardId: card.cardPrintId,
        fallbackName: card.name,
        fallbackSetName: card.setCode,
        fallbackImageUrl: card.imageUrl,
      );
      final next = await widget.service.recordOwned(
        cardPrintId: card.cardPrintId,
        source: 'search',
      );
      if (!mounted) return;
      setState(() {
        _state = next;
        _panel = _panelForState(next);
        _cardsById = <String, OnboardingSearchCard>{
          ..._cardsById,
          card.cardPrintId: card,
        };
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _searchMessage = 'Could not add this card right now.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _markLoopPromiseShown() async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      final next = await widget.service.recordLoopPromiseShown();
      if (!mounted) return;
      setState(() {
        _state = next;
        _panel = _panelForState(next);
      });
      await _loadSuggestions();
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _follow(OnboardingCollectorSuggestion suggestion) async {
    if (_busy || _followedCollectorIds.contains(suggestion.collectorUserId)) {
      return;
    }
    setState(() => _busy = true);
    try {
      final result = await CollectorFollowService.followCollector(
        client: Supabase.instance.client,
        followedUserId: suggestion.collectorUserId,
      );
      if (!mounted) return;
      if (result.ok) {
        await widget.service.recordFollowed(
          collectorUserId: suggestion.collectorUserId,
          payload: <String, dynamic>{
            'overlap_summary': suggestion.overlapSummary,
            'proximity_label': suggestion.proximityLabel,
          },
        );
        HapticFeedback.selectionClick();
        setState(() {
          _followedCollectorIds = <String>{
            ..._followedCollectorIds,
            suggestion.collectorUserId,
          };
        });
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _continueAfterFollow() {
    widget.onDismissed();
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Stack(
      children: [
        const Positioned.fill(
          child: IgnorePointer(child: ColoredBox(color: Color(0x66000000))),
        ),
        Positioned(
          left: 0,
          right: 0,
          bottom: 0,
          child: SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
              child: ClipRRect(
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(24),
                  bottom: Radius.circular(24),
                ),
                child: BackdropFilter(
                  filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      color: colorScheme.surface.withValues(alpha: 0.96),
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(
                        color: colorScheme.outline.withValues(alpha: 0.12),
                      ),
                      boxShadow: const [
                        BoxShadow(
                          color: Color(0x66000000),
                          blurRadius: 32,
                          offset: Offset(0, -12),
                        ),
                      ],
                    ),
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(20, 10, 20, 18),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Center(
                            child: Container(
                              width: 38,
                              height: 4,
                              decoration: BoxDecoration(
                                color: colorScheme.onSurface.withValues(
                                  alpha: 0.18,
                                ),
                                borderRadius: BorderRadius.circular(999),
                              ),
                            ),
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              Text(
                                '$_stepNumber OF 3',
                                style: Theme.of(context).textTheme.labelSmall
                                    ?.copyWith(
                                      color: colorScheme.onSurface.withValues(
                                        alpha: 0.5,
                                      ),
                                      fontSize: 11,
                                      fontWeight: FontWeight.w700,
                                      letterSpacing: 1.3,
                                    ),
                              ),
                              const Spacer(),
                              if (_panel != _OnboardingPanel.loopPromise)
                                IconButton(
                                  visualDensity: VisualDensity.compact,
                                  tooltip: 'Close onboarding',
                                  onPressed: _skipStep,
                                  icon: const Icon(Icons.close_rounded),
                                ),
                            ],
                          ),
                          AnimatedSwitcher(
                            duration: const Duration(milliseconds: 180),
                            child: _buildPanel(context),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildPanel(BuildContext context) {
    return switch (_panel) {
      _OnboardingPanel.own => _buildOwnPanel(context),
      _OnboardingPanel.ownSearch => _buildSearchPanel(context),
      _OnboardingPanel.want => _buildWantPanel(context),
      _OnboardingPanel.loopPromise => _buildLoopPromisePanel(context),
      _OnboardingPanel.follow => _buildFollowPanel(context),
    };
  }

  Widget _buildOwnPanel(BuildContext context) {
    return _PanelShell(
      key: const ValueKey('own'),
      icon: Icons.search_rounded,
      title: 'Add a card to your vault',
      body:
          'Search like a sentence or scan a card. Both paths can add to your Vault.',
      children: [
        _PrimaryPillButton(
          icon: Icons.search_rounded,
          label: 'Search by sentence',
          onPressed: _busy ? null : widget.onOpenSearch,
        ),
        const SizedBox(height: 8),
        _PrimaryPillButton(
          icon: Icons.center_focus_strong_rounded,
          label: _busy ? 'Opening scanner...' : 'Scan a card',
          onPressed: _busy ? null : _openScanner,
        ),
        TextButton(
          onPressed: _busy
              ? null
              : () => setState(() => _panel = _OnboardingPanel.ownSearch),
          child: const Text('Search instead'),
        ),
      ],
    );
  }

  Widget _buildSearchPanel(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Column(
      key: const ValueKey('own_search'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (_scanFailedToSearch)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Text(
              'Scanner did not add a card. Search works too.',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: colorScheme.onSurface.withValues(alpha: 0.62),
              ),
            ),
          ),
        TextField(
          controller: _searchController,
          autofocus: true,
          onChanged: _searchChanged,
          decoration: InputDecoration(
            hintText: 'Search for a card',
            prefixIcon: const Icon(Icons.search_rounded),
            suffixIcon: _searching
                ? const Padding(
                    padding: EdgeInsets.all(14),
                    child: SizedBox.square(
                      dimension: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                  )
                : null,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(18)),
          ),
        ),
        const SizedBox(height: 12),
        if (_searchMessage != null)
          Text(
            _searchMessage!,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: colorScheme.onSurface.withValues(alpha: 0.62),
            ),
          ),
        ..._searchResults
            .take(3)
            .map(
              (card) => _SearchResultRow(
                card: card,
                busy: _busy,
                onAdd: () => _addSearchCard(card),
              ),
            ),
      ],
    );
  }

  Widget _buildWantPanel(BuildContext context) {
    return _PanelShell(
      key: const ValueKey('want'),
      icon: Icons.bookmark_add_outlined,
      title: "Add a card you're chasing",
      body: 'Tap Want on any card in search or a set page.',
      children: [
        _PrimaryPillButton(
          icon: Icons.search_rounded,
          label: 'Open Search',
          onPressed: widget.onOpenSearch,
        ),
        TextButton(
          onPressed: _busy ? null : _refreshState,
          child: const Text('I added one'),
        ),
      ],
    );
  }

  Widget _buildLoopPromisePanel(BuildContext context) {
    final wantedCard = _cardsById[_state.wantedCardPrintId];
    return Column(
      key: const ValueKey('loop'),
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        const SizedBox(height: 2),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            _CardThumb(card: _cardsById[_state.ownedCardPrintId]),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14),
              child: Icon(
                Icons.arrow_forward_rounded,
                color: Theme.of(
                  context,
                ).colorScheme.onSurface.withValues(alpha: 0.54),
              ),
            ),
            _CardThumb(card: wantedCard),
          ],
        ),
        const SizedBox(height: 18),
        Text(
          "We'll tell you when a copy of ${wantedCard?.name ?? 'that card'} appears near you or for trade.",
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.titleSmall?.copyWith(
            fontWeight: FontWeight.w700,
            height: 1.25,
          ),
        ),
        const SizedBox(height: 18),
        _PrimaryPillButton(
          label: _busy ? 'Saving' : 'Got it',
          onPressed: _busy ? null : _markLoopPromiseShown,
        ),
      ],
    );
  }

  Widget _buildFollowPanel(BuildContext context) {
    final hasFollowed = _followedCollectorIds.isNotEmpty || _state.hasFollowed;
    return Column(
      key: const ValueKey('follow'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'Collectors worth following',
          style: Theme.of(
            context,
          ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 5),
        Text(
          'Follow collectors with overlap around your cards.',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
            color: Theme.of(
              context,
            ).colorScheme.onSurface.withValues(alpha: 0.62),
          ),
        ),
        const SizedBox(height: 14),
        if (_loadingSuggestions)
          const Center(
            child: Padding(
              padding: EdgeInsets.all(20),
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
          )
        else if (_suggestions.isEmpty)
          Text(
            'Collector suggestions are not ready yet.',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: Theme.of(
                context,
              ).colorScheme.onSurface.withValues(alpha: 0.55),
            ),
          )
        else
          ..._suggestions.map(
            (suggestion) => _CollectorSuggestionRow(
              suggestion: suggestion,
              followed: _followedCollectorIds.contains(
                suggestion.collectorUserId,
              ),
              busy: _busy,
              onFollow: () => _follow(suggestion),
            ),
          ),
        if (hasFollowed) ...[
          const SizedBox(height: 12),
          _PrimaryPillButton(
            label: 'Continue',
            onPressed: _continueAfterFollow,
          ),
        ],
        TextButton(onPressed: _skipStep, child: const Text('Not now')),
      ],
    );
  }
}

class _PanelShell extends StatelessWidget {
  const _PanelShell({
    super.key,
    required this.icon,
    required this.title,
    required this.body,
    required this.children,
  });

  final IconData icon;
  final String title;
  final String body;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Align(
          alignment: Alignment.centerLeft,
          child: Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: colorScheme.primary.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Icon(icon, color: colorScheme.primary),
          ),
        ),
        const SizedBox(height: 14),
        Text(
          title,
          style: Theme.of(
            context,
          ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 6),
        Text(
          body,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
            color: colorScheme.onSurface.withValues(alpha: 0.62),
          ),
        ),
        const SizedBox(height: 18),
        ...children,
      ],
    );
  }
}

class _PrimaryPillButton extends StatelessWidget {
  const _PrimaryPillButton({required this.label, this.icon, this.onPressed});

  final String label;
  final IconData? icon;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return FilledButton.icon(
      onPressed: onPressed,
      icon: Icon(icon ?? Icons.arrow_forward_rounded, size: 18),
      label: Text(label),
      style: FilledButton.styleFrom(
        minimumSize: const Size.fromHeight(50),
        backgroundColor: Theme.of(context).colorScheme.onSurface,
        foregroundColor: Theme.of(context).colorScheme.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
        textStyle: Theme.of(
          context,
        ).textTheme.labelLarge?.copyWith(fontWeight: FontWeight.w700),
      ),
    );
  }
}

class _SearchResultRow extends StatelessWidget {
  const _SearchResultRow({
    required this.card,
    required this.busy,
    required this.onAdd,
  });

  final OnboardingSearchCard card;
  final bool busy;
  final VoidCallback onAdd;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: _SoftRow(
        leading: _CardThumb(card: card, width: 38, height: 53),
        title: card.name,
        subtitle: card.meta,
        trailing: TextButton(
          onPressed: busy ? null : onAdd,
          child: const Text('Add'),
        ),
      ),
    );
  }
}

class _CollectorSuggestionRow extends StatelessWidget {
  const _CollectorSuggestionRow({
    required this.suggestion,
    required this.followed,
    required this.busy,
    required this.onFollow,
  });

  final OnboardingCollectorSuggestion suggestion;
  final bool followed;
  final bool busy;
  final VoidCallback onFollow;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: _SoftRow(
        leading: _Avatar(suggestion: suggestion),
        title: suggestion.displayName.isEmpty
            ? 'Collector'
            : suggestion.displayName,
        subtitle: suggestion.reasonLine,
        trailing: OutlinedButton(
          onPressed: busy || followed ? null : onFollow,
          style: OutlinedButton.styleFrom(
            backgroundColor: followed
                ? Theme.of(context).colorScheme.primary
                : Colors.transparent,
            foregroundColor: followed
                ? Theme.of(context).colorScheme.onPrimary
                : Theme.of(context).colorScheme.primary,
            side: BorderSide(
              color: followed
                  ? Theme.of(context).colorScheme.primary
                  : Theme.of(
                      context,
                    ).colorScheme.primary.withValues(alpha: 0.48),
            ),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(999),
            ),
          ),
          child: Text(followed ? 'Following' : 'Follow'),
        ),
      ),
    );
  }
}

class _SoftRow extends StatelessWidget {
  const _SoftRow({
    required this.leading,
    required this.title,
    required this.subtitle,
    required this.trailing,
  });

  final Widget leading;
  final String title;
  final String subtitle;
  final Widget trailing;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.24),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.08)),
      ),
      child: Row(
        children: [
          leading,
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(
                    context,
                  ).textTheme.labelLarge?.copyWith(fontWeight: FontWeight.w700),
                ),
                if (subtitle.isNotEmpty) ...[
                  const SizedBox(height: 3),
                  Text(
                    subtitle,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: colorScheme.onSurface.withValues(alpha: 0.56),
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(width: 8),
          trailing,
        ],
      ),
    );
  }
}

class _CardThumb extends StatelessWidget {
  const _CardThumb({this.card, this.width = 54, this.height = 76});

  final OnboardingSearchCard? card;
  final double width;
  final double height;

  @override
  Widget build(BuildContext context) {
    final artwork = resolveCatalogArtwork(
      gvId: card?.gvId,
      providerImageUrl: card?.imageUrl,
    );
    return CardSurfaceArtwork(
      label: card?.name ?? 'Card',
      imageUrl: artwork.primaryImageUrl,
      fallbackImageUrl: artwork.fallbackImageUrl,
      width: width,
      height: height,
      borderRadius: 8,
      padding: EdgeInsets.zero,
      backgroundColor: Theme.of(
        context,
      ).colorScheme.surfaceContainerHighest.withValues(alpha: 0.35),
      enableTapToZoom: false,
      showShadow: false,
    );
  }
}

class _Avatar extends StatelessWidget {
  const _Avatar({required this.suggestion});

  final OnboardingCollectorSuggestion suggestion;

  @override
  Widget build(BuildContext context) {
    final initials = suggestion.displayName.trim().isEmpty
        ? 'GV'
        : suggestion.displayName
              .trim()
              .split(RegExp(r'\s+'))
              .take(2)
              .map(
                (part) =>
                    part.isEmpty ? '' : part.substring(0, 1).toUpperCase(),
              )
              .join();
    final url = suggestion.avatarUrl;
    return CircleAvatar(
      radius: 18,
      backgroundColor: Theme.of(
        context,
      ).colorScheme.primary.withValues(alpha: 0.16),
      foregroundColor: Theme.of(context).colorScheme.primary,
      backgroundImage: url == null ? null : NetworkImage(url),
      child: url == null
          ? Text(
              initials,
              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 11),
            )
          : null,
    );
  }
}
