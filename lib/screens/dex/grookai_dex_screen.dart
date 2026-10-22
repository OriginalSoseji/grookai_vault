import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../services/grookai_dex/grookai_dex_service.dart';
import '../../theme/gv_grid_constants.dart';
import '../../utils/pokemon_sprite_url.dart';
import 'grookai_dex_species_screen.dart';

enum _DexSpeciesProgress { all, unstarted, inProgress, complete }

enum _DexSpeciesSort { nationalDex, name, completionHigh, biggestGaps }

enum _DexSpeciesPresentation { list, grid, compact }

class GrookaiDexScreen extends StatefulWidget {
  const GrookaiDexScreen({
    this.onOpenScanner,
    this.onOpenVaultSpecies,
    super.key,
  });

  final Future<void> Function()? onOpenScanner;
  final Future<void> Function({
    required String speciesSlug,
    required String displayName,
  })?
  onOpenVaultSpecies;

  @override
  State<GrookaiDexScreen> createState() => _GrookaiDexScreenState();
}

class _GrookaiDexScreenState extends State<GrookaiDexScreen> {
  final SupabaseClient _client = Supabase.instance.client;
  final TextEditingController _searchController = TextEditingController();

  int _page = 1;
  bool _loading = true;
  bool _loadingMore = false;
  String? _error;
  GrookaiDexSpeciesPage? _speciesPage;
  int? _generationFilter;
  String? _typeFilter;
  _DexSpeciesProgress _progressFilter = _DexSpeciesProgress.all;
  _DexSpeciesSort _sort = _DexSpeciesSort.nationalDex;
  _DexSpeciesPresentation _presentation = _DexSpeciesPresentation.grid;

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

  Future<void> _load({bool append = false}) async {
    if (append && (_loading || _loadingMore)) {
      return;
    }
    final currentPage = _speciesPage;
    if (append && currentPage != null) {
      final nextPage = currentPage.page + 1;
      final from = currentPage.species.length;
      final nextSpecies = currentPage.allSpecies
          .skip(from)
          .take(currentPage.pageSize)
          .toList(growable: false);
      setState(() {
        _page = nextPage;
        _speciesPage = GrookaiDexSpeciesPage(
          species: <GrookaiDexSpeciesSummary>[
            ...currentPage.species,
            ...nextSpecies,
          ],
          allSpecies: currentPage.allSpecies,
          page: nextPage,
          pageSize: currentPage.pageSize,
          hasNextPage:
              from + nextSpecies.length < currentPage.allSpecies.length,
        );
      });
      return;
    }
    final nextPage = append ? (currentPage?.page ?? _page) + 1 : 1;
    setState(() {
      if (append) {
        _loadingMore = true;
      } else {
        _loading = true;
        _error = null;
      }
    });

    try {
      final speciesPage = await GrookaiDexService.fetchSpeciesPage(
        client: _client,
        page: nextPage,
      ).timeout(const Duration(seconds: 15));
      if (!mounted) {
        return;
      }
      setState(() {
        _page = speciesPage.page;
        _speciesPage = append && currentPage != null
            ? GrookaiDexSpeciesPage(
                species: [...currentPage.species, ...speciesPage.species],
                allSpecies: speciesPage.allSpecies,
                page: speciesPage.page,
                pageSize: speciesPage.pageSize,
                hasNextPage: speciesPage.hasNextPage,
              )
            : speciesPage;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      if (append) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Unable to load more Dex entries.')),
        );
      } else {
        setState(() {
          _error = 'Unable to load grookai Dex.';
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          if (append) {
            _loadingMore = false;
          } else {
            _loading = false;
          }
        });
      }
    }
  }

  List<GrookaiDexSpeciesSummary> _filteredSpecies() {
    final speciesPage = _speciesPage;
    final query = _searchController.text.trim().toLowerCase();
    final browseAllSpecies =
        query.isNotEmpty ||
        _generationFilter != null ||
        _typeFilter != null ||
        _progressFilter != _DexSpeciesProgress.all ||
        _sort != _DexSpeciesSort.nationalDex;
    final species = browseAllSpecies
        ? speciesPage?.allSpecies ?? const <GrookaiDexSpeciesSummary>[]
        : speciesPage?.species ?? const <GrookaiDexSpeciesSummary>[];
    final filtered = species
        .where((row) {
          final matchesQuery =
              query.isEmpty ||
              row.displayName.toLowerCase().contains(query) ||
              row.nationalDexNumber.toString().contains(query);
          if (!matchesQuery) {
            return false;
          }
          if (_generationFilter != null &&
              row.generation != _generationFilter) {
            return false;
          }
          final typeFilter = _typeFilter?.trim().toLowerCase();
          if (typeFilter != null &&
              !row.types.any(
                (type) => type.trim().toLowerCase() == typeFilter,
              )) {
            return false;
          }
          return switch (_progressFilter) {
            _DexSpeciesProgress.all => true,
            _DexSpeciesProgress.unstarted => row.ownedPrintCount == 0,
            _DexSpeciesProgress.inProgress =>
              row.ownedPrintCount > 0 &&
                  row.totalPrintCount > 0 &&
                  row.ownedPrintCount < row.totalPrintCount,
            _DexSpeciesProgress.complete =>
              row.totalPrintCount > 0 &&
                  row.ownedPrintCount >= row.totalPrintCount,
          };
        })
        .toList(growable: false);

    if (filtered.length > 1) {
      filtered.sort((left, right) {
        final result = switch (_sort) {
          _DexSpeciesSort.nationalDex => left.nationalDexNumber.compareTo(
            right.nationalDexNumber,
          ),
          _DexSpeciesSort.name => left.displayName.toLowerCase().compareTo(
            right.displayName.toLowerCase(),
          ),
          _DexSpeciesSort.completionHigh => right.completionPercent.compareTo(
            left.completionPercent,
          ),
          _DexSpeciesSort.biggestGaps =>
            (right.totalPrintCount - right.ownedPrintCount).compareTo(
              left.totalPrintCount - left.ownedPrintCount,
            ),
        };
        return result == 0
            ? left.nationalDexNumber.compareTo(right.nationalDexNumber)
            : result;
      });
    }
    return filtered;
  }

  bool get _hasBrowseFilters =>
      _generationFilter != null ||
      _typeFilter != null ||
      _progressFilter != _DexSpeciesProgress.all;

  void _clearBrowseFilters() {
    setState(() {
      _generationFilter = null;
      _typeFilter = null;
      _progressFilter = _DexSpeciesProgress.all;
    });
  }

  Future<void> _openSpecies(GrookaiDexSpeciesSummary species) async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => GrookaiDexSpeciesScreen(
          speciesSlug: species.slug,
          initialDisplayName: species.displayName,
          onOpenScanner: widget.onOpenScanner,
          onOpenVaultSpecies: widget.onOpenVaultSpecies,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final speciesPage = _speciesPage;
    final initialLoading = _loading && speciesPage == null;
    final initialUnavailable =
        !_loading && _error != null && speciesPage == null;
    final hasDexData = speciesPage != null;
    final filteredSpecies = _filteredSpecies();
    final query = _searchController.text.trim();
    final isSearching = query.isNotEmpty;
    final metricSpecies =
        speciesPage?.allSpecies ?? const <GrookaiDexSpeciesSummary>[];
    final generations =
        metricSpecies
            .map((row) => row.generation)
            .whereType<int>()
            .toSet()
            .toList()
          ..sort();
    final types =
        metricSpecies
            .expand((row) => row.types)
            .map((type) => type.trim())
            .where((type) => type.isNotEmpty)
            .toSet()
            .toList()
          ..sort(
            (left, right) => left.toLowerCase().compareTo(right.toLowerCase()),
          );
    final ownedStartedCount = metricSpecies
        .where((row) => row.ownedPrintCount > 0)
        .length;
    final pageTotalPrints = metricSpecies.fold<int>(
      0,
      (sum, row) => sum + row.totalPrintCount,
    );
    final pageOwnedPrints = metricSpecies.fold<int>(
      0,
      (sum, row) => sum + row.ownedPrintCount,
    );
    final pageCompletionPercent = pageTotalPrints <= 0
        ? 0
        : ((pageOwnedPrints / pageTotalPrints) * 100).round().clamp(0, 100);
    final showSpeciesList =
        !_loading && _error == null && filteredSpecies.isNotEmpty;
    final browsingFullDex =
        isSearching ||
        _hasBrowseFilters ||
        _sort != _DexSpeciesSort.nationalDex;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Dex'),
        actions: [
          IconButton(
            tooltip: 'Reload',
            onPressed: _loading || _loadingMore ? null : _load,
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _load,
          child: CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(
                  GvGridConstants.gridOuterPadding,
                  8,
                  GvGridConstants.gridOuterPadding,
                  0,
                ),
                sliver: SliverToBoxAdapter(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Semantics(
                        label: 'National collection progress',
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.center,
                              children: [
                                Expanded(
                                  child: Text.rich(
                                    TextSpan(
                                      children: [
                                        const TextSpan(
                                          text: 'National collection  ',
                                          style: TextStyle(
                                            fontWeight: FontWeight.w700,
                                          ),
                                        ),
                                        TextSpan(
                                          text: initialLoading
                                              ? 'Loading…'
                                              : initialUnavailable
                                              ? 'Unavailable'
                                              : '$ownedStartedCount / ${metricSpecies.length} species',
                                          style: const TextStyle(
                                            fontWeight: FontWeight.w900,
                                          ),
                                        ),
                                      ],
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: theme.textTheme.bodyMedium?.copyWith(
                                      color: colorScheme.onSurface.withValues(
                                        alpha: 0.78,
                                      ),
                                    ),
                                  ),
                                ),
                                if (!initialUnavailable)
                                  Text(
                                    initialLoading
                                        ? 'Loading…'
                                        : '$pageCompletionPercent%',
                                    style: theme.textTheme.titleMedium
                                        ?.copyWith(
                                          color: colorScheme.primary,
                                          fontWeight: FontWeight.w900,
                                        ),
                                  ),
                              ],
                            ),
                            const SizedBox(height: 2),
                            Text(
                              initialUnavailable
                                  ? 'Collection metrics are temporarily unavailable.'
                                  : '$pageOwnedPrints of $pageTotalPrints card variants collected',
                              style: theme.textTheme.bodySmall?.copyWith(
                                color: colorScheme.onSurface.withValues(
                                  alpha: 0.58,
                                ),
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            const SizedBox(height: 6),
                            ClipRRect(
                              borderRadius: BorderRadius.circular(999),
                              child: LinearProgressIndicator(
                                minHeight: 4,
                                value: initialLoading || initialUnavailable
                                    ? null
                                    : pageCompletionPercent / 100,
                                backgroundColor: colorScheme
                                    .surfaceContainerHighest
                                    .withValues(alpha: 0.62),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 10),
                      Semantics(
                        textField: true,
                        label: 'Search Pokemon species',
                        child: TextField(
                          controller: _searchController,
                          decoration: const InputDecoration(
                            hintText: 'Search species…',
                            prefixIcon: Icon(Icons.search_rounded),
                            isDense: true,
                          ),
                          onChanged: (_) => setState(() {}),
                        ),
                      ),
                      const SizedBox(height: 8),
                      if (hasDexData) ...[
                        _DexBrowseControls(
                          generations: generations,
                          types: types,
                          generation: _generationFilter,
                          type: _typeFilter,
                          progress: _progressFilter,
                          sort: _sort,
                          presentation: _presentation,
                          resultCount: filteredSpecies.length,
                          hasFilters: _hasBrowseFilters,
                          onGenerationChanged: (value) => setState(() {
                            _generationFilter = value;
                          }),
                          onTypeChanged: (value) => setState(() {
                            _typeFilter = value;
                          }),
                          onProgressChanged: (value) => setState(() {
                            _progressFilter = value;
                          }),
                          onSortChanged: (value) => setState(() {
                            _sort = value;
                          }),
                          onPresentationChanged: (value) => setState(() {
                            _presentation = value;
                          }),
                          onClearFilters: _clearBrowseFilters,
                        ),
                        const SizedBox(height: 8),
                      ],
                      if (_loading)
                        const _DexLoadingGrid()
                      else if (_error != null)
                        _DexSurfaceCard(
                          child: _DexEmptyState(
                            icon: Icons.error_outline_rounded,
                            title: 'Unable to load Dex',
                            body: _error!,
                          ),
                        )
                      else if (filteredSpecies.isEmpty)
                        const _DexSurfaceCard(
                          child: _DexEmptyState(
                            icon: Icons.search_off_rounded,
                            title: 'No Pokemon found',
                            body: 'No species matched the full Dex.',
                          ),
                        )
                      else if (browsingFullDex)
                        Padding(
                          padding: const EdgeInsets.fromLTRB(2, 0, 2, 10),
                          child: Text(
                            '${filteredSpecies.length} result${filteredSpecies.length == 1 ? '' : 's'} across the full Dex',
                            style: theme.textTheme.labelLarge?.copyWith(
                              color: colorScheme.onSurface.withValues(
                                alpha: 0.58,
                              ),
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
              if (showSpeciesList &&
                  _presentation == _DexSpeciesPresentation.list)
                SliverPadding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: GvGridConstants.gridOuterPadding,
                  ),
                  sliver: SliverList.builder(
                    itemCount: filteredSpecies.length,
                    itemBuilder: (context, index) {
                      final species = filteredSpecies[index];
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: _DexSpeciesCard(
                          species: species,
                          onTap: () => _openSpecies(species),
                        ),
                      );
                    },
                  ),
                ),
              if (showSpeciesList &&
                  _presentation == _DexSpeciesPresentation.grid)
                SliverPadding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  sliver: SliverGrid.builder(
                    gridDelegate:
                        const SliverGridDelegateWithMaxCrossAxisExtent(
                          maxCrossAxisExtent: 230,
                          mainAxisExtent: 220,
                          crossAxisSpacing: GvGridConstants.gridSpacing,
                          mainAxisSpacing: GvGridConstants.gridSpacing,
                        ),
                    itemCount: filteredSpecies.length,
                    itemBuilder: (context, index) {
                      final species = filteredSpecies[index];
                      return _DexSpeciesCompactCard(
                        species: species,
                        grid: true,
                        onTap: () => _openSpecies(species),
                      );
                    },
                  ),
                ),
              if (showSpeciesList &&
                  _presentation == _DexSpeciesPresentation.compact)
                SliverPadding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  sliver: SliverList.builder(
                    itemCount: filteredSpecies.length,
                    itemBuilder: (context, index) {
                      final species = filteredSpecies[index];
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: _DexSpeciesCompactCard(
                          species: species,
                          grid: false,
                          onTap: () => _openSpecies(species),
                        ),
                      );
                    },
                  ),
                ),
              if (showSpeciesList &&
                  !browsingFullDex &&
                  speciesPage?.hasNextPage == true)
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                  sliver: SliverToBoxAdapter(
                    child: SizedBox(
                      width: double.infinity,
                      child: FilledButton.icon(
                        onPressed: _loadingMore
                            ? null
                            : () => _load(append: true),
                        icon: _loadingMore
                            ? const SizedBox.square(
                                dimension: 16,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                ),
                              )
                            : const Icon(Icons.expand_more_rounded),
                        label: Text(
                          _loadingMore ? 'Loading more' : 'Load more',
                        ),
                      ),
                    ),
                  ),
                ),
              const SliverToBoxAdapter(child: SizedBox(height: 28)),
            ],
          ),
        ),
      ),
    );
  }
}

extension on _DexSpeciesProgress {
  String get label => switch (this) {
    _DexSpeciesProgress.all => 'All progress',
    _DexSpeciesProgress.unstarted => 'Not started',
    _DexSpeciesProgress.inProgress => 'In progress',
    _DexSpeciesProgress.complete => 'Complete',
  };
}

extension on _DexSpeciesSort {
  String get label => switch (this) {
    _DexSpeciesSort.nationalDex => 'National Dex',
    _DexSpeciesSort.name => 'Name',
    _DexSpeciesSort.completionHigh => 'Progress: high first',
    _DexSpeciesSort.biggestGaps => 'Biggest gaps',
  };
}

String _dexTitleCase(String value) {
  final cleaned = value.trim();
  if (cleaned.isEmpty) {
    return cleaned;
  }
  return '${cleaned.substring(0, 1).toUpperCase()}'
      '${cleaned.substring(1).toLowerCase()}';
}

class _DexBrowseControls extends StatelessWidget {
  const _DexBrowseControls({
    required this.generations,
    required this.types,
    required this.generation,
    required this.type,
    required this.progress,
    required this.sort,
    required this.presentation,
    required this.resultCount,
    required this.hasFilters,
    required this.onGenerationChanged,
    required this.onTypeChanged,
    required this.onProgressChanged,
    required this.onSortChanged,
    required this.onPresentationChanged,
    required this.onClearFilters,
  });

  final List<int> generations;
  final List<String> types;
  final int? generation;
  final String? type;
  final _DexSpeciesProgress progress;
  final _DexSpeciesSort sort;
  final _DexSpeciesPresentation presentation;
  final int resultCount;
  final bool hasFilters;
  final ValueChanged<int?> onGenerationChanged;
  final ValueChanged<String?> onTypeChanged;
  final ValueChanged<_DexSpeciesProgress> onProgressChanged;
  final ValueChanged<_DexSpeciesSort> onSortChanged;
  final ValueChanged<_DexSpeciesPresentation> onPresentationChanged;
  final VoidCallback onClearFilters;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final activeFilterCount =
        (generation == null ? 0 : 1) +
        (type == null ? 0 : 1) +
        (progress == _DexSpeciesProgress.all ? 0 : 1);

    Future<void> openFilters() async {
      await showModalBottomSheet<void>(
        context: context,
        useSafeArea: true,
        showDragHandle: true,
        isScrollControlled: true,
        builder: (sheetContext) => StatefulBuilder(
          builder: (context, setSheetState) {
            void update(VoidCallback action) {
              action();
              setSheetState(() {});
            }

            return Padding(
              padding: EdgeInsets.fromLTRB(
                20,
                4,
                20,
                20 + MediaQuery.viewPaddingOf(context).bottom,
              ),
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'Filter Dex',
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '$resultCount species shown',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: colorScheme.onSurface.withValues(alpha: 0.62),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        PopupMenuButton<String>(
                          tooltip: 'Filter by generation',
                          initialValue: generation == null
                              ? 'all'
                              : '$generation',
                          onSelected: (value) => update(
                            () => onGenerationChanged(
                              value == 'all' ? null : int.tryParse(value),
                            ),
                          ),
                          itemBuilder: (_) => [
                            const PopupMenuItem(
                              value: 'all',
                              child: Text('All gens'),
                            ),
                            for (final value in generations)
                              PopupMenuItem(
                                value: '$value',
                                child: Text('Generation $value'),
                              ),
                          ],
                          child: _DexControlChip(
                            icon: Icons.auto_awesome_motion_outlined,
                            label: generation == null
                                ? 'All gens'
                                : 'Gen $generation',
                            active: generation != null,
                          ),
                        ),
                        PopupMenuButton<String>(
                          tooltip: 'Filter by Pokemon type',
                          initialValue: type ?? 'all',
                          onSelected: (value) => update(
                            () => onTypeChanged(value == 'all' ? null : value),
                          ),
                          itemBuilder: (_) => [
                            const PopupMenuItem(
                              value: 'all',
                              child: Text('All types'),
                            ),
                            for (final value in types)
                              PopupMenuItem(
                                value: value,
                                child: Text(_dexTitleCase(value)),
                              ),
                          ],
                          child: _DexControlChip(
                            icon: Icons.category_outlined,
                            label: type == null
                                ? 'All types'
                                : _dexTitleCase(type!),
                            active: type != null,
                          ),
                        ),
                        PopupMenuButton<_DexSpeciesProgress>(
                          tooltip: 'Filter by collection progress',
                          initialValue: progress,
                          onSelected: (value) =>
                              update(() => onProgressChanged(value)),
                          itemBuilder: (_) => [
                            for (final value in _DexSpeciesProgress.values)
                              PopupMenuItem(
                                value: value,
                                child: Text(value.label),
                              ),
                          ],
                          child: _DexControlChip(
                            icon: Icons.donut_large_rounded,
                            label: progress.label,
                            active: progress != _DexSpeciesProgress.all,
                          ),
                        ),
                        PopupMenuButton<_DexSpeciesSort>(
                          tooltip: 'Sort species',
                          initialValue: sort,
                          onSelected: (value) =>
                              update(() => onSortChanged(value)),
                          itemBuilder: (_) => [
                            for (final value in _DexSpeciesSort.values)
                              PopupMenuItem(
                                value: value,
                                child: Text(value.label),
                              ),
                          ],
                          child: _DexControlChip(
                            icon: Icons.sort_rounded,
                            label: sort.label,
                            active: sort != _DexSpeciesSort.nationalDex,
                          ),
                        ),
                      ],
                    ),
                    if (hasFilters) ...[
                      const SizedBox(height: 12),
                      Align(
                        alignment: Alignment.centerRight,
                        child: TextButton.icon(
                          onPressed: () => update(onClearFilters),
                          icon: const Icon(
                            Icons.filter_alt_off_outlined,
                            size: 18,
                          ),
                          label: const Text('Clear filters'),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            );
          },
        ),
      );
    }

    return Row(
      children: [
        TextButton.icon(
          onPressed: openFilters,
          icon: Badge(
            isLabelVisible: activeFilterCount > 0,
            label: Text('$activeFilterCount'),
            child: const Icon(Icons.tune_rounded),
          ),
          label: const Text('Filters'),
          style: TextButton.styleFrom(minimumSize: const Size(44, 44)),
        ),
        const Spacer(),
        _DexSpeciesPresentationPicker(
          value: presentation,
          onChanged: onPresentationChanged,
        ),
      ],
    );
  }
}

class _DexControlChip extends StatelessWidget {
  const _DexControlChip({
    required this.icon,
    required this.label,
    required this.active,
  });

  final IconData icon;
  final String label;
  final bool active;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: active
            ? colorScheme.primaryContainer.withValues(alpha: 0.72)
            : colorScheme.surfaceContainerHighest.withValues(alpha: 0.58),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(
          color: active
              ? colorScheme.primary.withValues(alpha: 0.22)
              : colorScheme.outline.withValues(alpha: 0.09),
        ),
      ),
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: 44),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 8),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 17),
              const SizedBox(width: 6),
              Text(
                label,
                style: Theme.of(
                  context,
                ).textTheme.labelMedium?.copyWith(fontWeight: FontWeight.w800),
              ),
              const SizedBox(width: 3),
              const Icon(Icons.arrow_drop_down_rounded, size: 18),
            ],
          ),
        ),
      ),
    );
  }
}

class _DexSpeciesPresentationPicker extends StatelessWidget {
  const _DexSpeciesPresentationPicker({
    required this.value,
    required this.onChanged,
  });

  final _DexSpeciesPresentation value;
  final ValueChanged<_DexSpeciesPresentation> onChanged;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.58),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.09)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _DexPresentationButton(
            tooltip: 'Detailed list',
            icon: Icons.view_agenda_outlined,
            selected: value == _DexSpeciesPresentation.list,
            onPressed: () => onChanged(_DexSpeciesPresentation.list),
          ),
          _DexPresentationButton(
            tooltip: 'Grid',
            icon: Icons.grid_view_rounded,
            selected: value == _DexSpeciesPresentation.grid,
            onPressed: () => onChanged(_DexSpeciesPresentation.grid),
          ),
          _DexPresentationButton(
            tooltip: 'Compact list',
            icon: Icons.view_list_rounded,
            selected: value == _DexSpeciesPresentation.compact,
            onPressed: () => onChanged(_DexSpeciesPresentation.compact),
          ),
        ],
      ),
    );
  }
}

class _DexPresentationButton extends StatelessWidget {
  const _DexPresentationButton({
    required this.tooltip,
    required this.icon,
    required this.selected,
    required this.onPressed,
  });

  final String tooltip;
  final IconData icon;
  final bool selected;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return IconButton(
      tooltip: tooltip,
      visualDensity: VisualDensity.compact,
      onPressed: onPressed,
      icon: Icon(icon, size: 19),
      color: selected ? colorScheme.onPrimaryContainer : null,
      style: IconButton.styleFrom(
        backgroundColor: selected
            ? colorScheme.primaryContainer.withValues(alpha: 0.78)
            : Colors.transparent,
      ),
    );
  }
}

class _DexSpeciesCompactCard extends StatelessWidget {
  const _DexSpeciesCompactCard({
    required this.species,
    required this.grid,
    required this.onTap,
  });

  final GrookaiDexSpeciesSummary species;
  final bool grid;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final percent = species.completionPercent;
    final missing = (species.totalPrintCount - species.ownedPrintCount).clamp(
      0,
      species.totalPrintCount,
    );
    final meta = <String>[
      if (species.generation != null) 'Gen ${species.generation}',
      if (species.types.isNotEmpty)
        species.types.take(2).map(_dexTitleCase).join(' / '),
    ].join(' · ');
    final collectionStatus = species.totalPrintCount <= 0
        ? 'No variants mapped'
        : species.ownedPrintCount >= species.totalPrintCount
        ? 'Complete'
        : species.ownedPrintCount > 0
        ? '${species.ownedPrintCount}/${species.totalPrintCount} collected'
        : 'Not started';

    final progress = ClipRRect(
      borderRadius: BorderRadius.circular(999),
      child: LinearProgressIndicator(
        minHeight: 6,
        value: species.totalPrintCount <= 0
            ? 0
            : species.ownedPrintCount / species.totalPrintCount,
        backgroundColor: colorScheme.surfaceContainerHighest.withValues(
          alpha: 0.68,
        ),
      ),
    );

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
          child: grid
              ? Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Align(
                      alignment: Alignment.center,
                      child: _PokemonSpriteFrame(
                        nationalDexNumber: species.nationalDexNumber,
                        label: species.displayName,
                        size: 96,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      species.displayName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      '#${species.nationalDexNumber.toString().padLeft(4, '0')}${meta.isEmpty ? '' : ' · $meta'}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: colorScheme.onSurface.withValues(alpha: 0.58),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      collectionStatus,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: species.ownedPrintCount > 0
                            ? colorScheme.tertiary
                            : colorScheme.onSurface.withValues(alpha: 0.54),
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                )
              : Row(
                  children: [
                    _PokemonSpriteFrame(
                      nationalDexNumber: species.nationalDexNumber,
                      label: species.displayName,
                      size: 58,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  species.displayName,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: theme.textTheme.titleSmall?.copyWith(
                                    fontWeight: FontWeight.w900,
                                  ),
                                ),
                              ),
                              Text(
                                '$percent%',
                                style: theme.textTheme.labelLarge?.copyWith(
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '#${species.nationalDexNumber.toString().padLeft(4, '0')}${meta.isEmpty ? '' : ' · $meta'}',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: colorScheme.onSurface.withValues(
                                alpha: 0.56,
                              ),
                            ),
                          ),
                          const SizedBox(height: 7),
                          progress,
                          const SizedBox(height: 5),
                          Text(
                            '${species.ownedPrintCount}/${species.totalPrintCount} owned · $missing missing',
                            style: theme.textTheme.labelSmall?.copyWith(
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 4),
                    const Icon(Icons.chevron_right_rounded),
                  ],
                ),
        ),
      ),
    );
  }
}

class _DexSpeciesCard extends StatelessWidget {
  const _DexSpeciesCard({required this.species, required this.onTap});

  final GrookaiDexSpeciesSummary species;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final percent = species.completionPercent;
    final knownCount = species.totalPrintCount;
    final ownedCount = species.ownedPrintCount;
    final missingCount = (knownCount - ownedCount).clamp(0, knownCount);
    final typeLabel = species.types.isEmpty
        ? 'Pokemon'
        : species.types.take(2).join(' / ');

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(28),
        onTap: onTap,
        child: Ink(
          decoration: BoxDecoration(
            color: colorScheme.surface.withValues(alpha: 0.88),
            borderRadius: BorderRadius.circular(28),
            border: Border.all(
              color: colorScheme.outline.withValues(alpha: 0.08),
            ),
            boxShadow: [
              BoxShadow(
                color: colorScheme.shadow.withValues(alpha: 0.06),
                blurRadius: 24,
                offset: const Offset(0, 12),
              ),
            ],
          ),
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _PokemonSpriteFrame(
                    nationalDexNumber: species.nationalDexNumber,
                    label: species.displayName,
                    size: 88,
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                              child: Text(
                                species.displayName,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: theme.textTheme.headlineSmall?.copyWith(
                                  fontWeight: FontWeight.w900,
                                  letterSpacing: 0,
                                  height: 1.02,
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            _DexNumberPill(number: species.nationalDexNumber),
                          ],
                        ),
                        const SizedBox(height: 10),
                        _DexPill(label: typeLabel),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              Text(
                '$ownedCount / $knownCount variants collected',
                style: theme.textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w900,
                  letterSpacing: 0,
                  height: 1.05,
                ),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: _DexInlineStat(label: 'Known', value: '$knownCount'),
                  ),
                  Expanded(
                    child: _DexInlineStat(label: 'Owned', value: '$ownedCount'),
                  ),
                  Expanded(
                    child: _DexInlineStat(
                      label: 'Missing',
                      value: '$missingCount',
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: Text(
                      'Completion',
                      style: theme.textTheme.labelMedium?.copyWith(
                        color: colorScheme.onSurface.withValues(alpha: 0.54),
                        fontWeight: FontWeight.w900,
                        letterSpacing: 1.4,
                      ),
                    ),
                  ),
                  Text(
                    '$percent%',
                    style: theme.textTheme.titleSmall?.copyWith(
                      color: percent == 100 ? Colors.green.shade700 : null,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              ClipRRect(
                borderRadius: BorderRadius.circular(999),
                child: LinearProgressIndicator(
                  minHeight: 9,
                  value: knownCount <= 0 ? 0 : ownedCount / knownCount,
                  backgroundColor: colorScheme.surfaceContainerHighest
                      .withValues(alpha: 0.70),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PokemonSpriteFrame extends StatelessWidget {
  const _PokemonSpriteFrame({
    required this.nationalDexNumber,
    required this.label,
    this.size = 82,
  });

  final int nationalDexNumber;
  final String label;
  final double size;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final url = pokemonSpriteUrl(nationalDexNumber);

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHigh.withValues(alpha: 0.74),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.08)),
        boxShadow: [
          BoxShadow(
            color: colorScheme.primary.withValues(alpha: 0.07),
            blurRadius: 24,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: url == null
          ? Icon(
              Icons.catching_pokemon_rounded,
              color: colorScheme.onSurface.withValues(alpha: 0.36),
            )
          : Padding(
              padding: const EdgeInsets.all(8),
              child: Image.network(
                url,
                fit: BoxFit.contain,
                cacheWidth: 320,
                filterQuality: FilterQuality.none,
                errorBuilder: (context, error, stackTrace) => Center(
                  child: Text(
                    label.isEmpty ? '?' : label.substring(0, 1),
                    style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
              ),
            ),
    );
  }
}

class _DexNumberPill extends StatelessWidget {
  const _DexNumberPill({required this.number});

  final int number;

  @override
  Widget build(BuildContext context) {
    return _DexPill(label: '#${number.toString().padLeft(4, '0')}');
  }
}

class _DexInlineStat extends StatelessWidget {
  const _DexInlineStat({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          value,
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w900,
            letterSpacing: 0,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: Theme.of(context).textTheme.labelSmall?.copyWith(
            color: colorScheme.onSurface.withValues(alpha: 0.50),
            fontWeight: FontWeight.w800,
          ),
        ),
      ],
    );
  }
}

class _DexPill extends StatelessWidget {
  const _DexPill({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.64),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.08)),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 6),
        child: Text(
          label,
          style: Theme.of(context).textTheme.labelSmall?.copyWith(
            color: colorScheme.onSurface.withValues(alpha: 0.68),
            fontWeight: FontWeight.w900,
            letterSpacing: 1.1,
          ),
        ),
      ),
    );
  }
}

class _DexLoadingGrid extends StatelessWidget {
  const _DexLoadingGrid();

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final blockColor = colorScheme.surfaceContainerHighest.withValues(
      alpha: 0.62,
    );

    return Semantics(
      label: 'Loading Dex species',
      liveRegion: true,
      child: ExcludeSemantics(
        child: GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
            maxCrossAxisExtent: 230,
            mainAxisExtent: 220,
            crossAxisSpacing: GvGridConstants.gridSpacing,
            mainAxisSpacing: GvGridConstants.gridSpacing,
          ),
          itemCount: 4,
          itemBuilder: (_, _) => Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      color: blockColor,
                      borderRadius: BorderRadius.circular(18),
                    ),
                    child: const SizedBox.expand(),
                  ),
                ),
                const SizedBox(height: 12),
                FractionallySizedBox(
                  widthFactor: 0.68,
                  child: Container(
                    height: 16,
                    decoration: BoxDecoration(
                      color: blockColor,
                      borderRadius: BorderRadius.circular(999),
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                FractionallySizedBox(
                  widthFactor: 0.48,
                  child: Container(
                    height: 10,
                    decoration: BoxDecoration(
                      color: blockColor,
                      borderRadius: BorderRadius.circular(999),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _DexSurfaceCard extends StatelessWidget {
  const _DexSurfaceCard({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      decoration: BoxDecoration(
        color: colorScheme.surface.withValues(alpha: 0.82),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.09)),
      ),
      padding: const EdgeInsets.all(16),
      child: child,
    );
  }
}

class _DexEmptyState extends StatelessWidget {
  const _DexEmptyState({
    required this.icon,
    required this.title,
    required this.body,
  });

  final IconData icon;
  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Column(
      children: [
        Icon(
          icon,
          size: 30,
          color: colorScheme.onSurface.withValues(alpha: 0.46),
        ),
        const SizedBox(height: 10),
        Text(
          title,
          style: Theme.of(
            context,
          ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 5),
        Text(
          body,
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
            color: colorScheme.onSurface.withValues(alpha: 0.62),
          ),
        ),
      ],
    );
  }
}
