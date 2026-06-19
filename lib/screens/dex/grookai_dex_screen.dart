import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../services/grookai_dex/grookai_dex_service.dart';
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

  Future<void> _load({int? page}) async {
    final nextPage = page ?? _page;
    setState(() {
      _loading = true;
      _error = null;
      _page = nextPage;
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
        _speciesPage = speciesPage;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _error = 'Unable to load Grookai Dex.';
      });
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  List<GrookaiDexSpeciesSummary> _filteredSpecies() {
    final species = _speciesPage?.species ?? const <GrookaiDexSpeciesSummary>[];
    final query = _searchController.text.trim().toLowerCase();
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
    final filteredSpecies = _filteredSpecies();
    final ownedStartedCount =
        speciesPage?.species.where((row) => row.ownedPrintCount > 0).length ??
        0;
    final openCount =
        speciesPage?.species
            .where(
              (row) =>
                  row.totalPrintCount > 0 &&
                  row.ownedPrintCount < row.totalPrintCount,
            )
            .length ??
        0;
    final heroSpecies =
        speciesPage?.species.take(3).toList(growable: false) ??
        const <GrookaiDexSpeciesSummary>[];

    return Scaffold(
      appBar: AppBar(
        title: const Text('Grookai Dex'),
        actions: [
          IconButton(
            tooltip: 'Reload',
            onPressed: _loading ? null : _load,
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
              _DexSurfaceCard(
                emphasize: true,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        if (heroSpecies.isEmpty)
                          DecoratedBox(
                            decoration: BoxDecoration(
                              color: colorScheme.primaryContainer.withValues(
                                alpha: 0.72,
                              ),
                              borderRadius: BorderRadius.circular(14),
                            ),
                            child: Padding(
                              padding: const EdgeInsets.all(10),
                              child: Icon(
                                Icons.catching_pokemon_rounded,
                                color: colorScheme.onPrimaryContainer,
                              ),
                            ),
                          )
                        else
                          for (final species in heroSpecies) ...[
                            _DexSprite(species: species, size: 58),
                            const SizedBox(width: 8),
                          ],
                        const Spacer(),
                        Text(
                          'Page $_page',
                          style: theme.textTheme.labelLarge?.copyWith(
                            color: colorScheme.onSurface.withValues(
                              alpha: 0.58,
                            ),
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 18),
                    Text(
                      'Pokemon Progress',
                      style: theme.textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.w800,
                        letterSpacing: -0.4,
                      ),
                    ),
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        _DexMetric(
                          label: 'Shown',
                          value: '${speciesPage?.species.length ?? 0}',
                        ),
                        _DexMetric(
                          label: 'Started',
                          value: '$ownedStartedCount',
                        ),
                        _DexMetric(label: 'Open', value: '$openCount'),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: _searchController,
                decoration: const InputDecoration(
                  hintText: 'Search this page',
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
                    body: 'No species matched this page.',
                  ),
                )
              else ...[
                for (final species in filteredSpecies)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: _DexSpeciesTile(
                      species: species,
                      onTap: () => _openSpecies(species),
                    ),
                  ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: _page <= 1 || _loading
                            ? null
                            : () => _load(page: _page - 1),
                        icon: const Icon(Icons.chevron_left_rounded),
                        label: const Text('Previous'),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: FilledButton.icon(
                        onPressed: speciesPage?.hasNextPage == true && !_loading
                            ? () => _load(page: _page + 1)
                            : null,
                        icon: const Icon(Icons.chevron_right_rounded),
                        label: const Text('Next'),
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _DexSpeciesTile extends StatelessWidget {
  const _DexSpeciesTile({required this.species, required this.onTap});

  final GrookaiDexSpeciesSummary species;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final percent = species.completionPercent;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: onTap,
        child: Ink(
          decoration: BoxDecoration(
            color: colorScheme.surface.withValues(alpha: 0.82),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: colorScheme.outline.withValues(alpha: 0.10),
            ),
          ),
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              _DexSprite(species: species),
              const SizedBox(width: 12),
              SizedBox(
                width: 56,
                child: Text(
                  '#${species.nationalDexNumber.toString().padLeft(4, '0')}',
                  style: theme.textTheme.labelMedium?.copyWith(
                    color: colorScheme.onSurface.withValues(alpha: 0.50),
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      species.displayName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 7),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(999),
                      child: LinearProgressIndicator(
                        minHeight: 6,
                        value: species.totalPrintCount <= 0
                            ? 0
                            : species.ownedPrintCount / species.totalPrintCount,
                        backgroundColor: colorScheme.surfaceContainerHighest
                            .withValues(alpha: 0.72),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      '${species.ownedPrintCount}/${species.totalPrintCount} prints',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: colorScheme.onSurface.withValues(alpha: 0.62),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Text(
                '$percent%',
                style: theme.textTheme.titleSmall?.copyWith(
                  color: percent == 100 ? Colors.green.shade700 : null,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(width: 4),
              Icon(
                Icons.chevron_right_rounded,
                color: colorScheme.onSurface.withValues(alpha: 0.42),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DexSprite extends StatelessWidget {
  const _DexSprite({required this.species, this.size = 52});

  final GrookaiDexSpeciesSummary species;
  final double size;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final spriteUrl = species.spriteUrl;

    return Semantics(
      image: true,
      label: '${species.displayName} Pokedex sprite',
      child: Container(
        width: size,
        height: size,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(size >= 58 ? 18 : 16),
          color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.58),
          border: Border.all(
            color: colorScheme.outline.withValues(alpha: 0.10),
          ),
          boxShadow: [
            BoxShadow(
              color: colorScheme.shadow.withValues(alpha: 0.08),
              blurRadius: 22,
              offset: const Offset(0, 10),
            ),
          ],
        ),
        child: spriteUrl == null
            ? _DexSpriteFallback(species: species)
            : Image.network(
                spriteUrl,
                width: size * 0.78,
                height: size * 0.78,
                fit: BoxFit.contain,
                filterQuality: FilterQuality.none,
                errorBuilder: (_, __, ___) =>
                    _DexSpriteFallback(species: species),
              ),
      ),
    );
  }
}

class _DexSpriteFallback extends StatelessWidget {
  const _DexSpriteFallback({required this.species});

  final GrookaiDexSpeciesSummary species;

  @override
  Widget build(BuildContext context) {
    return Text(
      species.displayName.isEmpty ? '?' : species.displayName[0].toUpperCase(),
      style: Theme.of(context).textTheme.titleMedium?.copyWith(
        fontWeight: FontWeight.w900,
        color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.58),
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

class _DexSurfaceCard extends StatelessWidget {
  const _DexSurfaceCard({required this.child, this.emphasize = false});

  final Widget child;
  final bool emphasize;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      decoration: BoxDecoration(
        color: emphasize
            ? colorScheme.primaryContainer.withValues(alpha: 0.16)
            : colorScheme.surface.withValues(alpha: 0.82),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(
          color: colorScheme.outline.withValues(alpha: emphasize ? 0.13 : 0.09),
        ),
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
