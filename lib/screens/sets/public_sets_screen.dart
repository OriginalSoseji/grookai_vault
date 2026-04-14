import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../services/public/public_sets_service.dart';
import 'public_set_detail_screen.dart';

class PublicSetsScreen extends StatefulWidget {
  const PublicSetsScreen({super.key});

  @override
  State<PublicSetsScreen> createState() => _PublicSetsScreenState();
}

class _PublicSetsScreenState extends State<PublicSetsScreen> {
  final SupabaseClient _client = Supabase.instance.client;
  final TextEditingController _searchController = TextEditingController();

  bool _loading = true;
  String? _error;
  List<PublicSetSummary> _sets = const [];
  PublicSetFilter _activeFilter = PublicSetFilter.all;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final sets = await PublicSetsService.fetchSets(client: _client);
      if (!mounted) {
        return;
      }

      setState(() {
        _sets = sets;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }

      setState(() {
        _error = error is Error ? error.toString() : 'Unable to load sets.';
      });
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final trimmedQuery = _searchController.text.trim();
    final filteredSets = PublicSetsService.filterAndSortSets(
      sets: _sets,
      query: _searchController.text,
      filter: _activeFilter,
    );
    final discoverySets = trimmedQuery.isEmpty
        ? filteredSets.take(6).toList()
        : const <PublicSetSummary>[];
    final showDiscovery =
        trimmedQuery.isEmpty &&
        !_loading &&
        _error == null &&
        discoverySets.isNotEmpty;
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Sets'),
        actions: [
          IconButton(
            tooltip: 'Reload',
            onPressed: _load,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _load,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 18, 16, 28),
            children: [
              _SetsSurfaceCard(
                emphasize: true,
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Public Sets'.toUpperCase(),
                      style: theme.textTheme.labelMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                        letterSpacing: 1.1,
                        color: theme.colorScheme.onSurface.withValues(
                          alpha: 0.58,
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'Browse Pokemon sets',
                      style: theme.textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.w800,
                        letterSpacing: -0.5,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Start with a few standout sets or search the full public catalog.',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: theme.colorScheme.onSurface.withValues(
                          alpha: 0.72,
                        ),
                        height: 1.45,
                      ),
                    ),
                  ],
                ),
              ),
              if (showDiscovery) ...[
                const SizedBox(height: 16),
                _SetsSurfaceCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // SETS_DISCOVERY_LITE_V1
                      // Lightweight browse-first section so users can enter
                      // sets discovery without typing.
                      _SetsSectionHeader(
                        title: 'Start here',
                        description: _activeFilter == PublicSetFilter.all
                            ? 'A few real sets from the live catalog to get browsing started.'
                            : 'Quick entry points from the current filter so you can browse without typing.',
                      ),
                      const SizedBox(height: 14),
                      SizedBox(
                        height: 188,
                        child: ListView.separated(
                          scrollDirection: Axis.horizontal,
                          itemCount: discoverySets.length,
                          separatorBuilder: (_, _) => const SizedBox(width: 12),
                          itemBuilder: (context, index) {
                            final setInfo = discoverySets[index];
                            return _SetDiscoveryTile(
                              setInfo: setInfo,
                              onTap: () {
                                Navigator.of(context).push(
                                  MaterialPageRoute<void>(
                                    builder: (_) => PublicSetDetailScreen(
                                      setCode: setInfo.code,
                                    ),
                                  ),
                                );
                              },
                            );
                          },
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 20),
              _SetsSurfaceCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    TextField(
                      controller: _searchController,
                      decoration: const InputDecoration(
                        hintText: 'Search sets',
                        prefixIcon: Icon(Icons.search),
                      ),
                      onChanged: (_) => setState(() {}),
                    ),
                    const SizedBox(height: 14),
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: [
                          _SetFilterChip(
                            label: 'All Sets',
                            selected: _activeFilter == PublicSetFilter.all,
                            onSelected: () {
                              setState(() {
                                _activeFilter = PublicSetFilter.all;
                              });
                            },
                          ),
                          const SizedBox(width: 8),
                          _SetFilterChip(
                            label: 'Modern',
                            selected: _activeFilter == PublicSetFilter.modern,
                            onSelected: () {
                              setState(() {
                                _activeFilter = PublicSetFilter.modern;
                              });
                            },
                          ),
                          const SizedBox(width: 8),
                          _SetFilterChip(
                            label: 'Special',
                            selected: _activeFilter == PublicSetFilter.special,
                            onSelected: () {
                              setState(() {
                                _activeFilter = PublicSetFilter.special;
                              });
                            },
                          ),
                          const SizedBox(width: 8),
                          _SetFilterChip(
                            label: 'A-Z',
                            selected:
                                _activeFilter == PublicSetFilter.alphabetical,
                            onSelected: () {
                              setState(() {
                                _activeFilter = PublicSetFilter.alphabetical;
                              });
                            },
                          ),
                          const SizedBox(width: 8),
                          _SetFilterChip(
                            label: 'Newest',
                            selected: _activeFilter == PublicSetFilter.newest,
                            onSelected: () {
                              setState(() {
                                _activeFilter = PublicSetFilter.newest;
                              });
                            },
                          ),
                          const SizedBox(width: 8),
                          _SetFilterChip(
                            label: 'Oldest',
                            selected: _activeFilter == PublicSetFilter.oldest,
                            onSelected: () {
                              setState(() {
                                _activeFilter = PublicSetFilter.oldest;
                              });
                            },
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              _SetsSurfaceCard(
                child: _SetsSectionHeader(
                  title: trimmedQuery.isEmpty
                      ? 'All sets'
                      : 'Results for "$trimmedQuery"',
                  description: trimmedQuery.isEmpty
                      ? '${filteredSets.length} collector-ready sets in the catalog.'
                      : '${filteredSets.length} sets matched your search.',
                ),
              ),
              const SizedBox(height: 16),
              if (_loading)
                const _SetsLoadingState()
              else if (_error != null)
                _SetsSurfaceCard(
                  child: _SetsEmptyState(
                    title: 'Unable to load sets',
                    body: _error!,
                  ),
                )
              else if (filteredSets.isEmpty)
                const _SetsSurfaceCard(
                  child: _SetsEmptyState(
                    title: 'No sets found',
                    body: 'No sets matched the current search or filter.',
                  ),
                )
              else
                GridView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: filteredSets.length,
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    mainAxisSpacing: 14,
                    crossAxisSpacing: 14,
                    childAspectRatio: 0.94,
                  ),
                  itemBuilder: (context, index) {
                    final setInfo = filteredSets[index];
                    return _SetTile(
                      setInfo: setInfo,
                      onTap: () {
                        Navigator.of(context).push(
                          MaterialPageRoute<void>(
                            builder: (_) =>
                                PublicSetDetailScreen(setCode: setInfo.code),
                          ),
                        );
                      },
                    );
                  },
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SetDiscoveryTile extends StatelessWidget {
  const _SetDiscoveryTile({required this.setInfo, required this.onTap});

  final PublicSetSummary setInfo;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final heroImageUrl = setInfo.heroImageUrl;
    final infoParts = <String>[
      if (setInfo.releaseYear != null) '${setInfo.releaseYear}',
      if (setInfo.printedTotal != null) '${setInfo.printedTotal} cards',
    ];

    return SizedBox(
      width: 188,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(24),
          onTap: onTap,
          child: Ink(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(24),
              border: Border.all(
                color: colorScheme.primary.withValues(alpha: 0.16),
              ),
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  colorScheme.primary.withValues(alpha: 0.12),
                  colorScheme.surface,
                ],
              ),
              boxShadow: [
                BoxShadow(
                  color: colorScheme.shadow.withValues(alpha: 0.05),
                  blurRadius: 18,
                  offset: const Offset(0, 10),
                ),
              ],
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(24),
              child: Stack(
                fit: StackFit.expand,
                children: [
                  if (heroImageUrl != null)
                    Positioned.fill(
                      child: IgnorePointer(
                        // SETS_DISCOVERY_ART_PASS_V1
                        // Hero art is used as a low-noise atmospheric layer in
                        // the Start here rail, not as loud primary content.
                        child: Opacity(
                          opacity: 0.24,
                          child: Image.network(
                            heroImageUrl,
                            fit: BoxFit.cover,
                            alignment: Alignment.centerRight,
                            filterQuality: FilterQuality.low,
                            errorBuilder: (_, _, _) => const SizedBox.shrink(),
                          ),
                        ),
                      ),
                    ),
                  Positioned.fill(
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: [
                            colorScheme.surface.withValues(alpha: 0.12),
                            colorScheme.surface.withValues(alpha: 0.18),
                            colorScheme.surface.withValues(alpha: 0.96),
                          ],
                          stops: const [0.0, 0.42, 1.0],
                        ),
                      ),
                    ),
                  ),
                  Positioned.fill(
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.centerLeft,
                          end: Alignment.centerRight,
                          colors: [
                            colorScheme.surface,
                            colorScheme.surface.withValues(alpha: 0.84),
                            colorScheme.surface.withValues(alpha: 0.46),
                          ],
                          stops: const [0.0, 0.58, 1.0],
                        ),
                      ),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        DecoratedBox(
                          decoration: BoxDecoration(
                            color: colorScheme.surface.withValues(alpha: 0.54),
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Padding(
                            padding: const EdgeInsets.all(7),
                            child: Icon(
                              Icons.auto_awesome_rounded,
                              size: 18,
                              color: colorScheme.primary,
                            ),
                          ),
                        ),
                        const SizedBox(height: 14),
                        Text(
                          setInfo.code.toUpperCase(),
                          style: theme.textTheme.labelMedium?.copyWith(
                            fontWeight: FontWeight.w700,
                            letterSpacing: 1.0,
                            color: colorScheme.onSurface.withValues(
                              alpha: 0.62,
                            ),
                          ),
                        ),
                        const SizedBox(height: 10),
                        Expanded(
                          child: Text(
                            setInfo.name,
                            style: theme.textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w800,
                              height: 1.15,
                            ),
                          ),
                        ),
                        if (infoParts.isNotEmpty) ...[
                          const SizedBox(height: 10),
                          Text(
                            infoParts.join(' • '),
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: colorScheme.onSurface.withValues(
                                alpha: 0.74,
                              ),
                              height: 1.35,
                            ),
                          ),
                        ],
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            Text(
                              '${setInfo.cardCount} cards',
                              style: theme.textTheme.labelLarge?.copyWith(
                                fontWeight: FontWeight.w700,
                                color: colorScheme.primary,
                              ),
                            ),
                            const Spacer(),
                            Icon(
                              Icons.arrow_forward_rounded,
                              size: 18,
                              color: colorScheme.primary,
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _SetsSurfaceCard extends StatelessWidget {
  const _SetsSurfaceCard({
    required this.child,
    this.padding = const EdgeInsets.all(18),
    this.emphasize = false,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final bool emphasize;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(28),
        border: Border.all(
          color: colorScheme.outline.withValues(alpha: emphasize ? 0.22 : 0.14),
        ),
        boxShadow: [
          BoxShadow(
            color: colorScheme.shadow.withValues(
              alpha: emphasize ? 0.08 : 0.05,
            ),
            blurRadius: emphasize ? 28 : 22,
            offset: Offset(0, emphasize ? 14 : 10),
          ),
        ],
      ),
      padding: padding,
      child: child,
    );
  }
}

class _SetsSectionHeader extends StatelessWidget {
  const _SetsSectionHeader({required this.title, required this.description});

  final String title;
  final String description;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: theme.textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.w700,
            letterSpacing: -0.2,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          description,
          style: theme.textTheme.bodyMedium?.copyWith(
            color: colorScheme.onSurface.withValues(alpha: 0.72),
            height: 1.45,
          ),
        ),
      ],
    );
  }
}

class _SetFilterChip extends StatelessWidget {
  const _SetFilterChip({
    required this.label,
    required this.selected,
    required this.onSelected,
  });

  final String label;
  final bool selected;
  final VoidCallback onSelected;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return ChoiceChip(
      label: Text(label),
      selected: selected,
      onSelected: (_) => onSelected(),
      selectedColor: colorScheme.primary.withValues(alpha: 0.14),
      backgroundColor: colorScheme.surfaceContainerHighest.withValues(
        alpha: 0.45,
      ),
      side: BorderSide(
        color: selected
            ? colorScheme.primary.withValues(alpha: 0.42)
            : colorScheme.outline.withValues(alpha: 0.14),
      ),
      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
      visualDensity: VisualDensity.compact,
    );
  }
}

class _SetTile extends StatelessWidget {
  const _SetTile({required this.setInfo, required this.onTap});

  final PublicSetSummary setInfo;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final infoParts = <String>[
      if (setInfo.releaseYear != null) '${setInfo.releaseYear}',
      if (setInfo.printedTotal != null) '${setInfo.printedTotal} cards',
    ];

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(24),
        onTap: onTap,
        child: Container(
          decoration: BoxDecoration(
            color: colorScheme.surface,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(
              color: colorScheme.outline.withValues(alpha: 0.14),
            ),
            boxShadow: [
              BoxShadow(
                color: colorScheme.shadow.withValues(alpha: 0.05),
                blurRadius: 22,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                setInfo.code.toUpperCase(),
                style: theme.textTheme.labelMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1.0,
                  color: colorScheme.onSurface.withValues(alpha: 0.58),
                ),
              ),
              const SizedBox(height: 10),
              Expanded(
                child: Text(
                  setInfo.name,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                    height: 1.18,
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Text(
                infoParts.join(' • '),
                style: theme.textTheme.bodySmall?.copyWith(
                  color: colorScheme.onSurface.withValues(alpha: 0.72),
                  height: 1.35,
                ),
              ),
              const SizedBox(height: 10),
              Text(
                '${setInfo.cardCount} cards',
                style: theme.textTheme.labelLarge?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: colorScheme.primary,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SetsLoadingState extends StatelessWidget {
  const _SetsLoadingState();

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.symmetric(vertical: 28),
      child: Center(child: CircularProgressIndicator()),
    );
  }
}

class _SetsEmptyState extends StatelessWidget {
  const _SetsEmptyState({required this.title, required this.body});

  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          body,
          style: theme.textTheme.bodyMedium?.copyWith(
            color: colorScheme.onSurface.withValues(alpha: 0.72),
            height: 1.45,
          ),
        ),
      ],
    );
  }
}
