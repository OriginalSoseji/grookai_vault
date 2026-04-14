import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../services/public/public_collector_service.dart';
import 'public_collector_screen.dart';

enum PublicCollectorRelationshipMode { followers, following }

class PublicCollectorRelationshipScreen extends StatefulWidget {
  const PublicCollectorRelationshipScreen({
    super.key,
    required this.profile,
    required this.mode,
  });

  final PublicCollectorProfile profile;
  final PublicCollectorRelationshipMode mode;

  @override
  State<PublicCollectorRelationshipScreen> createState() =>
      _PublicCollectorRelationshipScreenState();
}

class _PublicCollectorRelationshipScreenState
    extends State<PublicCollectorRelationshipScreen> {
  final SupabaseClient _client = Supabase.instance.client;

  bool _loading = true;
  String? _error;
  List<PublicCollectorRelationshipRow> _rows = const [];

  bool get _isFollowers =>
      widget.mode == PublicCollectorRelationshipMode.followers;

  String get _screenTitle => _isFollowers ? 'Followers' : 'Following';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final rows = _isFollowers
          ? await PublicCollectorService.fetchFollowerCollectors(
              client: _client,
              userId: widget.profile.userId,
            )
          : await PublicCollectorService.fetchFollowingCollectors(
              client: _client,
              userId: widget.profile.userId,
            );

      if (!mounted) {
        return;
      }

      setState(() {
        _rows = rows;
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
            : 'Unable to load $_screenTitle.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final name = widget.profile.displayName.trim().isEmpty
        ? (widget.profile.slug.trim().isEmpty
              ? 'This collector'
              : widget.profile.slug.trim())
        : widget.profile.displayName.trim();
    final description = _isFollowers
        ? '$name is followed by these public collectors.'
        : '$name follows these public collectors.';

    return Scaffold(
      appBar: AppBar(
        title: Text(_screenTitle),
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
              _RelationshipSurface(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _screenTitle,
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w800,
                        letterSpacing: -0.3,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      description,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurface.withValues(
                          alpha: 0.72,
                        ),
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
                _RelationshipSurface(
                  child: _RelationshipEmptyState(
                    title: 'Unable to load ${_screenTitle.toLowerCase()}',
                    body: _error!,
                  ),
                )
              else if (_rows.isEmpty)
                _RelationshipSurface(
                  child: _RelationshipEmptyState(
                    title: _isFollowers ? 'No followers yet' : 'No follows yet',
                    body: _isFollowers
                        ? 'No public collectors are following $name yet.'
                        : '$name is not following any public collectors yet.',
                  ),
                )
              else
                _RelationshipSurface(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    children: [
                      for (var index = 0; index < _rows.length; index++) ...[
                        _RelationshipCollectorTile(row: _rows[index]),
                        if (index < _rows.length - 1)
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

class _RelationshipSurface extends StatelessWidget {
  const _RelationshipSurface({
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

class _RelationshipCollectorTile extends StatelessWidget {
  const _RelationshipCollectorTile({required this.row});

  final PublicCollectorRelationshipRow row;

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
          Navigator.of(context).push(
            MaterialPageRoute<void>(
              builder: (_) => PublicCollectorScreen(slug: row.slug),
            ),
          );
        },
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              _RelationshipAvatar(row: row),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      row.displayName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '/u/${row.slug}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: colorScheme.onSurface.withValues(alpha: 0.7),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      _formatFollowedAt(row.followedAt),
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
      return 'Recently connected';
    }
    return 'Since ${value.month}/${value.day}/${value.year}';
  }
}

class _RelationshipAvatar extends StatelessWidget {
  const _RelationshipAvatar({required this.row});

  final PublicCollectorRelationshipRow row;

  @override
  Widget build(BuildContext context) {
    final initials = row.displayName
        .trim()
        .split(RegExp(r'\s+'))
        .where((token) => token.isNotEmpty)
        .take(2)
        .map((token) => token.substring(0, 1).toUpperCase())
        .join();

    if ((row.avatarUrl ?? '').trim().isNotEmpty) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: Image.network(
          row.avatarUrl!,
          width: 48,
          height: 48,
          fit: BoxFit.cover,
          errorBuilder: (context, error, stackTrace) =>
              _RelationshipAvatarFallback(
                initials: initials.isEmpty ? 'G' : initials,
              ),
        ),
      );
    }

    return _RelationshipAvatarFallback(
      initials: initials.isEmpty ? 'G' : initials,
    );
  }
}

class _RelationshipAvatarFallback extends StatelessWidget {
  const _RelationshipAvatarFallback({required this.initials});

  final String initials;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Container(
      width: 48,
      height: 48,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            colorScheme.primary.withValues(alpha: 0.22),
            colorScheme.secondary.withValues(alpha: 0.32),
          ],
        ),
      ),
      alignment: Alignment.center,
      child: Text(
        initials,
        style: theme.textTheme.titleSmall?.copyWith(
          fontWeight: FontWeight.w800,
          color: colorScheme.onPrimaryContainer,
        ),
      ),
    );
  }
}

class _RelationshipEmptyState extends StatelessWidget {
  const _RelationshipEmptyState({required this.title, required this.body});

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
        const SizedBox(height: 6),
        Text(
          body,
          style: theme.textTheme.bodySmall?.copyWith(
            color: colorScheme.onSurface.withValues(alpha: 0.72),
            height: 1.35,
          ),
        ),
      ],
    );
  }
}
