import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../public_collector/public_collector_screen.dart';
import '../../services/public/public_collector_service.dart';

class NetworkDiscoverScreen extends StatefulWidget {
  const NetworkDiscoverScreen({super.key});

  @override
  State<NetworkDiscoverScreen> createState() => _NetworkDiscoverScreenState();
}

class _NetworkDiscoverScreenState extends State<NetworkDiscoverScreen> {
  final SupabaseClient _client = Supabase.instance.client;
  final TextEditingController _searchController = TextEditingController();

  bool _loading = true;
  String? _error;
  List<PublicCollectorDiscoverRow> _collectors = const [];
  int _loadVersion = 0;

  @override
  void initState() {
    super.initState();
    _loadCollectors();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadCollectors() async {
    final loadVersion = ++_loadVersion;
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final collectors = await PublicCollectorService.discoverCollectors(
        client: _client,
        query: _searchController.text,
      );

      if (!mounted || loadVersion != _loadVersion) {
        return;
      }

      setState(() {
        _collectors = collectors;
      });
    } catch (error) {
      if (!mounted || loadVersion != _loadVersion) {
        return;
      }

      setState(() {
        _error = error is Error
            ? error.toString()
            : 'Unable to load collectors.';
      });
    } finally {
      if (mounted && loadVersion == _loadVersion) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final trimmedQuery = _searchController.text.trim();
    final resultsTitle = trimmedQuery.isEmpty
        ? 'Collectors to revisit'
        : 'Collector results for "$trimmedQuery"';
    final resultsDescription = trimmedQuery.isEmpty
        ? 'Latest public collectors with shared vaults.'
        : 'Matching public collectors.';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Network'),
        actions: [
          IconButton(
            tooltip: 'Reload',
            onPressed: _loadCollectors,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _loadCollectors,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
            children: [
              Align(
                alignment: Alignment.centerLeft,
                child: TextButton.icon(
                  onPressed: () => Navigator.of(context).maybePop(),
                  icon: const Icon(Icons.view_stream_outlined),
                  label: const Text('View card stream'),
                ),
              ),
              const SizedBox(height: 8),
              _NetworkDiscoverSurfaceCard(
                padding: const EdgeInsets.all(6),
                child: Row(
                  children: [
                    Expanded(
                      child: _DiscoverLaneButton(
                        label: 'Cards',
                        selected: false,
                        onPressed: () => Navigator.of(context).maybePop(),
                      ),
                    ),
                    const SizedBox(width: 10),
                    const Expanded(
                      child: _DiscoverLaneButton(
                        label: 'Collectors',
                        selected: true,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 10),
              _NetworkDiscoverSurfaceCard(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Find collectors',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                        letterSpacing: -0.2,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _searchController,
                            textInputAction: TextInputAction.search,
                            onSubmitted: (_) => _loadCollectors(),
                            decoration: const InputDecoration(
                              hintText: 'Search collectors or @username',
                              prefixIcon: Icon(Icons.search),
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        FilledButton(
                          onPressed: _loadCollectors,
                          child: const Text('Search'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 10),
              _NetworkDiscoverSurfaceCard(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      resultsTitle,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                        letterSpacing: -0.2,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      resultsDescription,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Theme.of(
                          context,
                        ).colorScheme.onSurface.withValues(alpha: 0.72),
                        height: 1.35,
                      ),
                    ),
                    const SizedBox(height: 12),
                    if (_loading)
                      const Center(child: CircularProgressIndicator())
                    else if (_error != null)
                      _DiscoverEmptyState(
                        title: 'Unable to load collectors',
                        body: _error!,
                      )
                    else if (_collectors.isEmpty)
                      _DiscoverEmptyState(
                        title: trimmedQuery.isEmpty
                            ? 'No collectors available right now'
                            : 'No collectors found',
                        body: trimmedQuery.isEmpty
                            ? 'Collectors will appear here when they enable a public profile and shared vault.'
                            : 'Try a display name or @username search.',
                      )
                    else
                      Column(
                        children: [
                          for (
                            var index = 0;
                            index < _collectors.length;
                            index++
                          ) ...[
                            _CollectorRowTile(collector: _collectors[index]),
                            if (index < _collectors.length - 1)
                              const SizedBox(height: 12),
                          ],
                        ],
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NetworkDiscoverSurfaceCard extends StatelessWidget {
  const _NetworkDiscoverSurfaceCard({
    required this.child,
    this.padding = const EdgeInsets.all(18),
  });

  final Widget child;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.14)),
      ),
      padding: padding,
      child: child,
    );
  }
}

class _DiscoverLaneButton extends StatelessWidget {
  const _DiscoverLaneButton({
    required this.label,
    required this.selected,
    this.onPressed,
  });

  final String label;
  final bool selected;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return FilledButton(
      onPressed: selected ? null : onPressed,
      style: FilledButton.styleFrom(
        backgroundColor: selected
            ? colorScheme.primary
            : colorScheme.surfaceContainerHighest.withValues(alpha: 0.55),
        foregroundColor: selected
            ? colorScheme.onPrimary
            : colorScheme.onSurface,
        disabledBackgroundColor: colorScheme.primary,
        disabledForegroundColor: colorScheme.onPrimary,
        elevation: 0,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        textStyle: theme.textTheme.labelMedium?.copyWith(
          fontWeight: FontWeight.w700,
        ),
      ),
      child: Text(label),
    );
  }
}

class _CollectorRowTile extends StatelessWidget {
  const _CollectorRowTile({required this.collector});

  final PublicCollectorDiscoverRow collector;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final metadata = _formatJoinedAt(collector.createdAt);

    return Material(
      color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.38),
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute<void>(
              builder: (_) => PublicCollectorScreen(slug: collector.slug),
            ),
          );
        },
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              _CollectorAvatar(collector: collector),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      collector.displayName,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '@${collector.slug}',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: colorScheme.primary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    if (metadata.isNotEmpty) ...[
                      const SizedBox(height: 6),
                      Text(
                        metadata,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: colorScheme.onSurface.withValues(alpha: 0.68),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 10),
              Icon(
                Icons.chevron_right_rounded,
                color: colorScheme.onSurface.withValues(alpha: 0.38),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _formatJoinedAt(String? rawValue) {
    if (rawValue == null || rawValue.trim().isEmpty) {
      return 'Collector';
    }

    final parsed = DateTime.tryParse(rawValue);
    if (parsed == null) {
      return 'Collector';
    }

    const months = <String>[
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    final monthLabel = months[(parsed.month - 1).clamp(0, months.length - 1)];
    return 'Joined $monthLabel ${parsed.year}';
  }
}

class _CollectorAvatar extends StatelessWidget {
  const _CollectorAvatar({required this.collector});

  final PublicCollectorDiscoverRow collector;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final theme = Theme.of(context);
    final avatarUrl = collector.avatarUrl;
    final initials = _buildInitials();

    return Container(
      width: 52,
      height: 52,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        color: colorScheme.primaryContainer,
      ),
      clipBehavior: Clip.antiAlias,
      child: avatarUrl == null
          ? Center(
              child: Text(
                initials,
                style: theme.textTheme.titleMedium?.copyWith(
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
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                    color: colorScheme.onPrimaryContainer,
                  ),
                ),
              ),
            ),
    );
  }

  String _buildInitials() {
    final tokens = collector.displayName
        .trim()
        .split(RegExp(r'\s+'))
        .where((token) => token.isNotEmpty)
        .take(2)
        .toList();

    if (tokens.isNotEmpty) {
      return tokens.map((token) => token.substring(0, 1).toUpperCase()).join();
    }

    return collector.slug.isEmpty
        ? 'GV'
        : collector.slug.substring(0, 1).toUpperCase();
  }
}

class _DiscoverEmptyState extends StatelessWidget {
  const _DiscoverEmptyState({required this.title, required this.body});

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
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.14)),
      ),
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
    );
  }
}
