import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../services/grookai_dex/grookai_dex_service.dart';
import '../../utils/pokemon_sprite_url.dart';
import 'grookai_dex_species_screen.dart';

class GrookaiDexScreen extends StatefulWidget {
  const GrookaiDexScreen({super.key});

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
      );
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
          _error = 'Unable to load Grookai Dex.';
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
    final species = query.isEmpty
        ? speciesPage?.species ?? const <GrookaiDexSpeciesSummary>[]
        : speciesPage?.allSpecies ?? const <GrookaiDexSpeciesSummary>[];
    if (query.isEmpty) {
      return species;
    }
    return species
        .where(
          (row) =>
              row.displayName.toLowerCase().contains(query) ||
              row.nationalDexNumber.toString().contains(query),
        )
        .toList(growable: false);
  }

  Future<void> _openSpecies(GrookaiDexSpeciesSummary species) async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => GrookaiDexSpeciesScreen(
          speciesSlug: species.slug,
          initialDisplayName: species.displayName,
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
    final ownedStartedCount = metricSpecies
        .where((row) => row.ownedPrintCount > 0)
        .length;
    final completeCount = metricSpecies
        .where(
          (row) =>
              row.totalPrintCount > 0 &&
              row.ownedPrintCount >= row.totalPrintCount,
        )
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
    final incompleteCount = metricSpecies
        .where(
          (row) =>
              row.totalPrintCount > 0 &&
              row.ownedPrintCount < row.totalPrintCount,
        )
        .length;

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
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 28),
            children: [
              _DexHeroCard(
                emphasize: true,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        _DexPill(label: 'Grookai Dex', strong: true),
                        _DexPill(label: 'Vault-aware'),
                      ],
                    ),
                    const SizedBox(height: 18),
                    Text(
                      'Character completion, not just a checklist.',
                      style: theme.textTheme.headlineMedium?.copyWith(
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0,
                        height: 0.98,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      'Search a Pokemon and see every mapped card print, what your vault owns, and the gaps still left for that character.',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: colorScheme.onSurface.withValues(alpha: 0.64),
                        fontWeight: FontWeight.w600,
                        height: 1.35,
                      ),
                    ),
                    const SizedBox(height: 18),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                initialLoading
                                    ? '—'
                                    : initialUnavailable
                                    ? 'Unavailable'
                                    : '$pageCompletionPercent%',
                                style: theme.textTheme.displaySmall?.copyWith(
                                  fontWeight: FontWeight.w900,
                                  letterSpacing: 0,
                                ),
                              ),
                              Text(
                                initialLoading
                                    ? 'Loading Dex printings…'
                                    : initialUnavailable
                                    ? 'Dex metrics are temporarily unavailable.'
                                    : '$pageOwnedPrints / $pageTotalPrints printings collected',
                                style: theme.textTheme.bodySmall?.copyWith(
                                  color: colorScheme.onSurface.withValues(
                                    alpha: 0.58,
                                  ),
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ],
                          ),
                        ),
                        _DexPill(
                          label: initialLoading
                              ? 'Loading'
                              : initialUnavailable
                              ? 'Unavailable'
                              : isSearching
                              ? 'Search'
                              : '${filteredSpecies.length} shown',
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    if (initialUnavailable)
                      Container(
                        height: 8,
                        decoration: BoxDecoration(
                          color: colorScheme.surfaceContainerHighest.withValues(
                            alpha: 0.62,
                          ),
                          borderRadius: BorderRadius.circular(999),
                        ),
                      )
                    else
                      ClipRRect(
                        borderRadius: BorderRadius.circular(999),
                        child: LinearProgressIndicator(
                          minHeight: 8,
                          value: initialLoading
                              ? null
                              : pageCompletionPercent / 100,
                          backgroundColor: colorScheme.surfaceContainerHighest
                              .withValues(alpha: 0.62),
                        ),
                      ),
                    const SizedBox(height: 18),
                    Row(
                      children: [
                        _DexMetric(
                          label: 'Species',
                          value: hasDexData ? '${metricSpecies.length}' : '—',
                        ),
                        _DexMetric(
                          label: 'Started',
                          value: hasDexData ? '$ownedStartedCount' : '—',
                        ),
                        _DexMetric(
                          label: 'Complete',
                          value: hasDexData ? '$completeCount' : '—',
                        ),
                        _DexMetric(
                          label: 'Missing',
                          value: hasDexData ? '$incompleteCount' : '—',
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: _searchController,
                decoration: const InputDecoration(
                  hintText: 'Search all Pokemon',
                  prefixIcon: Icon(Icons.search_rounded),
                ),
                onChanged: (_) => setState(() {}),
              ),
              const SizedBox(height: 14),
              if (_loading)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 40),
                  child: Center(child: CircularProgressIndicator()),
                )
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
              else ...[
                if (isSearching) ...[
                  Padding(
                    padding: const EdgeInsets.fromLTRB(2, 0, 2, 10),
                    child: Text(
                      '${filteredSpecies.length} result${filteredSpecies.length == 1 ? '' : 's'} across the full Dex',
                      style: theme.textTheme.labelLarge?.copyWith(
                        color: colorScheme.onSurface.withValues(alpha: 0.58),
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                ],
                for (final species in filteredSpecies)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: _DexSpeciesCard(
                      species: species,
                      onTap: () => _openSpecies(species),
                    ),
                  ),
                if (!isSearching) ...[
                  if (speciesPage?.hasNextPage == true) ...[
                    const SizedBox(height: 8),
                    SizedBox(
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
                  ],
                ],
              ],
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
                '$ownedCount / $knownCount printings collected',
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
  const _DexPill({required this.label, this.strong = false});

  final String label;
  final bool strong;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: strong
            ? colorScheme.primaryContainer.withValues(alpha: 0.58)
            : colorScheme.surfaceContainerHighest.withValues(alpha: 0.64),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(
          color: strong
              ? colorScheme.primary.withValues(alpha: 0.16)
              : colorScheme.outline.withValues(alpha: 0.08),
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 6),
        child: Text(
          label,
          style: Theme.of(context).textTheme.labelSmall?.copyWith(
            color: strong
                ? colorScheme.onPrimaryContainer
                : colorScheme.onSurface.withValues(alpha: 0.68),
            fontWeight: FontWeight.w900,
            letterSpacing: 1.1,
          ),
        ),
      ),
    );
  }
}

class _DexMetric extends StatelessWidget {
  const _DexMetric({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            value,
            style: Theme.of(
              context,
            ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: Theme.of(
                context,
              ).colorScheme.onSurface.withValues(alpha: 0.56),
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class _DexHeroCard extends StatelessWidget {
  const _DexHeroCard({required this.child, this.emphasize = false});

  final Widget child;
  final bool emphasize;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            colorScheme.primaryContainer.withValues(
              alpha: emphasize ? 0.22 : 0.12,
            ),
            colorScheme.surface.withValues(alpha: 0.90),
          ],
        ),
        borderRadius: BorderRadius.circular(30),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.08)),
        boxShadow: [
          BoxShadow(
            color: colorScheme.shadow.withValues(alpha: 0.07),
            blurRadius: 30,
            offset: const Offset(0, 16),
          ),
        ],
      ),
      padding: const EdgeInsets.all(20),
      child: child,
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
