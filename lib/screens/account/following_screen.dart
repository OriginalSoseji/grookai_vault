import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../screens/public_collector/public_collector_screen.dart';
import '../../services/public/following_service.dart';

class FollowingScreen extends StatefulWidget {
  const FollowingScreen({super.key});

  @override
  State<FollowingScreen> createState() => _FollowingScreenState();
}

class _FollowingScreenState extends State<FollowingScreen> {
  final SupabaseClient _client = Supabase.instance.client;

  bool _loading = true;
  String? _error;
  List<FollowingCollector> _collectors = const [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final userId = _client.auth.currentUser?.id ?? '';
    if (userId.isEmpty) {
      setState(() {
        _loading = false;
        _error = 'You are not signed in.';
      });
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final collectors = await FollowingService.fetchFollowingCollectors(
        client: _client,
        userId: userId,
      );
      if (!mounted) {
        return;
      }
      setState(() {
        _collectors = collectors;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _loading = false;
        _error = error is Error
            ? error.toString()
            : 'Unable to load followed collectors.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Following'),
        actions: [
          IconButton(
            tooltip: 'Reload',
            onPressed: _load,
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _load,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(14, 10, 14, 18),
            children: [
              _FollowingSurface(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Collectors you want to revisit',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w800,
                        letterSpacing: -0.3,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Keep a simple list of collectors you want to return to for future card interactions.',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Theme.of(
                          context,
                        ).colorScheme.onSurface.withValues(alpha: 0.72),
                        height: 1.35,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              if (_loading)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 48),
                  child: Center(child: CircularProgressIndicator()),
                )
              else if (_error != null)
                _FollowingSurface(
                  child: _FollowingEmptyState(
                    title: 'Unable to load following',
                    body: _error!,
                  ),
                )
              else if (_collectors.isEmpty)
                _FollowingSurface(
                  child: const _FollowingEmptyState(
                    title: 'No followed collectors yet',
                    body:
                        'Follow a collector from their public profile to keep them easy to revisit.',
                  ),
                )
              else
                _FollowingSurface(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    children: [
                      for (
                        var index = 0;
                        index < _collectors.length;
                        index++
                      ) ...[
                        _FollowingCollectorTile(
                          collector: _collectors[index],
                          onOpened: _load,
                        ),
                        if (index < _collectors.length - 1)
                          const SizedBox(height: 10),
                      ],
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

class _FollowingSurface extends StatelessWidget {
  const _FollowingSurface({
    required this.child,
    this.padding = const EdgeInsets.all(16),
  });

  final Widget child;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.14)),
      ),
      child: child,
    );
  }
}

class _FollowingCollectorTile extends StatelessWidget {
  const _FollowingCollectorTile({
    required this.collector,
    required this.onOpened,
  });

  final FollowingCollector collector;
  final VoidCallback onOpened;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Material(
      color: colorScheme.primary.withValues(alpha: 0.03),
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () {
          Navigator.of(context)
              .push(
                MaterialPageRoute<void>(
                  builder: (_) => PublicCollectorScreen(slug: collector.slug),
                ),
              )
              .then((_) => onOpened());
        },
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              _FollowingAvatar(collector: collector),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      collector.displayName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '/u/${collector.slug}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: colorScheme.onSurface.withValues(alpha: 0.7),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      _formatFollowedAt(collector.followedAt),
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: colorScheme.onSurface.withValues(alpha: 0.6),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
              Icon(
                Icons.chevron_right_rounded,
                color: colorScheme.onSurface.withValues(alpha: 0.34),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _formatFollowedAt(DateTime? value) {
    if (value == null) {
      return 'Recently followed';
    }
    return 'Followed ${value.month}/${value.day}/${value.year}';
  }
}

class _FollowingAvatar extends StatelessWidget {
  const _FollowingAvatar({required this.collector});

  final FollowingCollector collector;

  @override
  Widget build(BuildContext context) {
    final initials = collector.displayName
        .trim()
        .split(RegExp(r'\s+'))
        .where((token) => token.isNotEmpty)
        .take(2)
        .map((token) => token.substring(0, 1).toUpperCase())
        .join();

    return Container(
      width: 54,
      height: 54,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.14),
        ),
        color: Theme.of(context).colorScheme.primaryContainer,
      ),
      clipBehavior: Clip.antiAlias,
      alignment: Alignment.center,
      child: collector.avatarUrl == null
          ? Text(
              initials.isEmpty ? 'GV' : initials,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w800,
                color: Theme.of(context).colorScheme.onPrimaryContainer,
              ),
            )
          : Image.network(
              collector.avatarUrl!,
              fit: BoxFit.cover,
              errorBuilder: (context, error, stackTrace) => Text(
                initials.isEmpty ? 'GV' : initials,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w800,
                  color: Theme.of(context).colorScheme.onPrimaryContainer,
                ),
              ),
            ),
    );
  }
}

class _FollowingEmptyState extends StatelessWidget {
  const _FollowingEmptyState({required this.title, required this.body});

  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: Theme.of(
            context,
          ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 6),
        Text(
          body,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
            color: Theme.of(
              context,
            ).colorScheme.onSurface.withValues(alpha: 0.72),
            height: 1.35,
          ),
        ),
      ],
    );
  }
}
