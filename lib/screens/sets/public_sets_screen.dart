import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../services/public/public_sets_service.dart';
import '../../theme/gv_grid_constants.dart';
import '../../widgets/gv_chip.dart';
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
  PublicSetEra _activeEra = PublicSetEra.all;
  PublicSetLane _activeLane = PublicSetLane.all;

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
      era: _activeEra,
      lane: _activeLane,
    );
    final queryMatchedSets = PublicSetsService.filterAndSortSets(
      sets: _sets,
      query: _searchController.text,
      filter: PublicSetFilter.all,
      lane: _activeLane,
    );
    final eraScopedSets = PublicSetsService.filterAndSortSets(
      sets: _sets,
      query: _searchController.text,
      filter: PublicSetFilter.all,
      era: _activeEra,
    );
    final eraCounts = PublicSetsService.countSetsByEra(queryMatchedSets);
    final laneCounts = PublicSetsService.countSetsByLane(eraScopedSets);
    final groupedSets = PublicSetsService.groupSetsByEra(filteredSets);
    final shouldGroupByEra =
        trimmedQuery.isEmpty &&
        _activeEra == PublicSetEra.all &&
        _activeFilter != PublicSetFilter.alphabetical &&
        _activeFilter != PublicSetFilter.oldest;
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Sets',
          style: theme.textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.w700,
            letterSpacing: 0,
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
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _load,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(18, 12, 18, 28),
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Expanded(
                    child: Text(
                      'Browse ${_sets.length} sets by era, language, and release lane.',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: theme.colorScheme.onSurface.withValues(
                          alpha: 0.66,
                        ),
                        fontWeight: FontWeight.w600,
                        height: 1.3,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              TextField(
                controller: _searchController,
                decoration: const InputDecoration(
                  hintText: 'Search sets',
                  prefixIcon: Icon(Icons.search),
                ),
                onChanged: (_) => setState(() {}),
              ),
              const SizedBox(height: 14),
              _SetsSurfaceCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            'Filters'.toUpperCase(),
                            style: theme.textTheme.labelSmall?.copyWith(
                              fontWeight: FontWeight.w800,
                              letterSpacing: 1.0,
                              color: theme.colorScheme.onSurface.withValues(
                                alpha: 0.54,
                              ),
                            ),
                          ),
                        ),
                        _SetSortMenu(
                          value: _activeFilter,
                          onSelected: (value) {
                            setState(() {
                              _activeFilter = value;
                            });
                          },
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    _SetChoiceRow<PublicSetEra, PublicSetEraOption>(
                      label: 'Era',
                      values: PublicSetsService.eraOptions,
                      selectedValue: _activeEra,
                      countFor: (value) => value == PublicSetEra.all
                          ? queryMatchedSets.length
                          : eraCounts[value] ?? 0,
                      valueFor: (option) => option.value,
                      labelFor: (option) => option.shortLabel,
                      onSelected: (value) {
                        setState(() {
                          _activeEra = value;
                        });
                      },
                    ),
                    const SizedBox(height: 12),
                    _SetChoiceRow<PublicSetLane, PublicSetLaneOption>(
                      label: 'Lane',
                      values: PublicSetsService.laneOptions,
                      selectedValue: _activeLane,
                      countFor: (value) => value == PublicSetLane.all
                          ? eraScopedSets.length
                          : laneCounts[value] ?? 0,
                      valueFor: (option) => option.value,
                      labelFor: (option) => option.label,
                      onSelected: (value) {
                        setState(() {
                          _activeLane = value;
                        });
                      },
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 18),
              _SetsSurfaceCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const _SetsSectionHeader(
                      title: 'Browse by era',
                      description:
                          'Jump into the catalog by release era instead of scrolling through every set.',
                    ),
                    const SizedBox(height: 14),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: PublicSetsService.eraOptions
                          .where((option) => option.value != PublicSetEra.all)
                          .map((option) {
                            return GvChip(
                              label: option.label,
                              count: eraCounts[option.value] ?? 0,
                              selected: _activeEra == option.value,
                              onSelected: (_) {
                                setState(() {
                                  _activeEra = option.value;
                                });
                              },
                            );
                          })
                          .toList(),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 18),
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
              else if (shouldGroupByEra)
                _GroupedSetResults(
                  groupedSets: groupedSets,
                  onOpenSet: _openSet,
                )
              else
                _SetGrid(sets: filteredSets, onOpenSet: _openSet),
            ],
          ),
        ),
      ),
    );
  }

  void _openSet(PublicSetSummary setInfo) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => PublicSetDetailScreen(setCode: setInfo.code),
      ),
    );
  }
}

class _SetsSurfaceCard extends StatelessWidget {
  const _SetsSurfaceCard({
    required this.child,
    this.padding = const EdgeInsets.all(18),
  });

  final Widget child;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: padding,
      child: DecoratedBox(
        decoration: BoxDecoration(
          border: Border(
            top: BorderSide(
              color: Theme.of(
                context,
              ).colorScheme.outlineVariant.withValues(alpha: 0.18),
            ),
          ),
        ),
        child: Padding(padding: const EdgeInsets.only(top: 14), child: child),
      ),
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
            letterSpacing: 0,
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

class _SetSortMenu extends StatelessWidget {
  const _SetSortMenu({required this.value, required this.onSelected});

  static const List<PublicSetFilter> _sortOptions = <PublicSetFilter>[
    PublicSetFilter.all,
    PublicSetFilter.newest,
    PublicSetFilter.alphabetical,
    PublicSetFilter.oldest,
  ];

  final PublicSetFilter value;
  final ValueChanged<PublicSetFilter> onSelected;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return PopupMenuButton<PublicSetFilter>(
      tooltip: 'Sort sets',
      onSelected: onSelected,
      itemBuilder: (context) {
        return _sortOptions.map((option) {
          final selected = option == value;
          return PopupMenuItem<PublicSetFilter>(
            value: option,
            child: Row(
              children: [
                Expanded(child: Text(_setSortLabel(option))),
                if (selected)
                  Icon(Icons.check, size: 16, color: colorScheme.primary),
              ],
            ),
          );
        }).toList();
      },
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.28),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: colorScheme.outline.withValues(alpha: 0.12),
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'Sort: ${_setSortLabel(value)}',
                style: theme.textTheme.labelSmall?.copyWith(
                  color: colorScheme.onSurface.withValues(alpha: 0.72),
                  fontWeight: FontWeight.w600,
                  letterSpacing: 0,
                ),
              ),
              const SizedBox(width: 6),
              Icon(
                Icons.expand_more,
                size: 16,
                color: colorScheme.onSurface.withValues(alpha: 0.62),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

String _setSortLabel(PublicSetFilter value) {
  switch (value) {
    case PublicSetFilter.newest:
      return 'Newest';
    case PublicSetFilter.alphabetical:
      return 'A-Z';
    case PublicSetFilter.oldest:
      return 'Oldest';
    case PublicSetFilter.modern:
    case PublicSetFilter.special:
    case PublicSetFilter.all:
      return 'Default';
  }
}

class _SetChoiceRow<TValue, TOption> extends StatelessWidget {
  const _SetChoiceRow({
    required this.label,
    required this.values,
    required this.selectedValue,
    required this.countFor,
    required this.valueFor,
    required this.labelFor,
    required this.onSelected,
  });

  final String label;
  final List<TOption> values;
  final TValue selectedValue;
  final int Function(TValue value) countFor;
  final TValue Function(TOption option) valueFor;
  final String Function(TOption option) labelFor;
  final ValueChanged<TValue> onSelected;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label.toUpperCase(),
          style: theme.textTheme.labelSmall?.copyWith(
            fontWeight: FontWeight.w800,
            letterSpacing: 1.0,
            color: colorScheme.onSurface.withValues(alpha: 0.54),
          ),
        ),
        const SizedBox(height: 8),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: values.map((option) {
              final value = valueFor(option);
              final selected = value == selectedValue;
              return Padding(
                padding: const EdgeInsets.only(right: 8),
                child: GvChip(
                  label: labelFor(option),
                  count: countFor(value),
                  selected: selected,
                  onSelected: (_) => onSelected(value),
                ),
              );
            }).toList(),
          ),
        ),
      ],
    );
  }
}

class _GroupedSetResults extends StatelessWidget {
  const _GroupedSetResults({
    required this.groupedSets,
    required this.onOpenSet,
  });

  final Map<PublicSetEra, List<PublicSetSummary>> groupedSets;
  final ValueChanged<PublicSetSummary> onOpenSet;

  @override
  Widget build(BuildContext context) {
    final groups = PublicSetsService.eraOptions
        .where((option) => option.value != PublicSetEra.all)
        .map((option) {
          final sets = groupedSets[option.value] ?? const <PublicSetSummary>[];
          return MapEntry(option, sets);
        })
        .where((entry) => entry.value.isNotEmpty)
        .toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (var index = 0; index < groups.length; index++) ...[
          if (index > 0) const SizedBox(height: 22),
          _SetsSurfaceCard(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _SetsSectionHeader(
                  title: groups[index].key.label,
                  description:
                      '${groups[index].value.length} visible set${groups[index].value.length == 1 ? '' : 's'} in this era.',
                ),
                const SizedBox(height: 14),
                _SetGrid(sets: groups[index].value, onOpenSet: onOpenSet),
              ],
            ),
          ),
        ],
      ],
    );
  }
}

class _SetGrid extends StatelessWidget {
  const _SetGrid({required this.sets, required this.onOpenSet});

  final List<PublicSetSummary> sets;
  final ValueChanged<PublicSetSummary> onOpenSet;

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: sets.length,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        mainAxisSpacing: GvGridConstants.gridSpacing,
        crossAxisSpacing: GvGridConstants.gridSpacing,
        childAspectRatio: GvGridConstants.gridChildAspectRatio,
      ),
      itemBuilder: (context, index) {
        final setInfo = sets[index];
        return _SetTile(setInfo: setInfo, onTap: () => onOpenSet(setInfo));
      },
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
    final metaParts = <String>[
      if (setInfo.releaseYear != null) '${setInfo.releaseYear}',
      '${setInfo.cardCount} cards',
    ];
    final heroImageUrl = setInfo.heroImageUrl?.trim();
    final hasHeroImage = heroImageUrl != null && heroImageUrl.isNotEmpty;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(GvGridConstants.tileTapRadius),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(GvGridConstants.gridOuterPadding),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              AspectRatio(
                aspectRatio: GvGridConstants.artworkAspectRatio,
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(
                    GvGridConstants.imageRadius,
                  ),
                  child: hasHeroImage
                      ? Image.network(
                          heroImageUrl,
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) {
                            return _SetHeroPlaceholder(setInfo: setInfo);
                          },
                        )
                      : _SetHeroPlaceholder(setInfo: setInfo),
                ),
              ),
              const SizedBox(height: GvGridConstants.imageToTitleGap),
              SizedBox(
                height: GvGridConstants.titleSlotHeight,
                child: Text(
                  setInfo.name,
                  maxLines: GvGridConstants.titleMaxLines,
                  overflow: TextOverflow.ellipsis,
                  style: gvGridTitleStyle(theme),
                ),
              ),
              const SizedBox(height: GvGridConstants.titleToSubtitleGap),
              SizedBox(
                height: GvGridConstants.subtitleSlotHeight,
                child: Text(
                  metaParts.join(' · '),
                  maxLines: GvGridConstants.subtitleMaxLines,
                  overflow: TextOverflow.ellipsis,
                  style: gvGridSubtitleStyle(theme, colorScheme),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SetHeroPlaceholder extends StatelessWidget {
  const _SetHeroPlaceholder({required this.setInfo});

  final PublicSetSummary setInfo;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return DecoratedBox(
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.28),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.10)),
      ),
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Text(
            setInfo.code.toUpperCase(),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            textAlign: TextAlign.center,
            style: theme.textTheme.titleMedium?.copyWith(
              color: colorScheme.primary,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.4,
            ),
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
