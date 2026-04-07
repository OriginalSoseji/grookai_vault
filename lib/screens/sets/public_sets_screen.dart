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
    final filteredSets = PublicSetsService.filterAndSortSets(
      sets: _sets,
      query: _searchController.text,
      filter: _activeFilter,
    );
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
                      'Browse Pokemon sets collectors care about.',
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
                  title: _searchController.text.trim().isEmpty
                      ? 'Set results'
                      : 'Results for "${_searchController.text.trim()}"',
                  description: _searchController.text.trim().isEmpty
                      ? '${filteredSets.length} collector-ready sets.'
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
                  gridDelegate:
                      const SliverGridDelegateWithFixedCrossAxisCount(
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
                            builder: (_) => PublicSetDetailScreen(
                              setCode: setInfo.code,
                            ),
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
            color: colorScheme.shadow.withValues(alpha: emphasize ? 0.08 : 0.05),
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
  const _SetsSectionHeader({
    required this.title,
    required this.description,
  });

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
  const _SetTile({
    required this.setInfo,
    required this.onTap,
  });

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
  const _SetsEmptyState({
    required this.title,
    required this.body,
  });

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
