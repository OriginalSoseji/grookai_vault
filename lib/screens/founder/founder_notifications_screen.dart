import 'dart:async';

import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../services/notifications/founder_notification_service.dart';
import 'founder_operations_screen.dart';

enum _FounderNotificationFilter { all, actionNeeded, updates }

class FounderNotificationsScreen extends StatefulWidget {
  const FounderNotificationsScreen({
    super.key,
    this.initialNotificationId,
    this.service,
  });

  final String? initialNotificationId;
  final FounderNotificationService? service;

  @override
  State<FounderNotificationsScreen> createState() =>
      _FounderNotificationsScreenState();
}

class _FounderNotificationsScreenState
    extends State<FounderNotificationsScreen> {
  late final FounderNotificationService _service =
      widget.service ??
      FounderNotificationService(client: Supabase.instance.client);

  bool _loading = true;
  bool _openingInitial = false;
  String? _error;
  List<FounderNotificationItem> _items = const <FounderNotificationItem>[];
  _FounderNotificationFilter _filter = _FounderNotificationFilter.all;

  @override
  void initState() {
    super.initState();
    unawaited(_load());
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final overview = await _service.fetchOverview(limit: 100);
      final requested = widget.initialNotificationId?.trim() ?? '';
      var items = overview.items;
      if (requested.isNotEmpty &&
          !items.any(
            (item) => item.id == requested || item.notificationId == requested,
          )) {
        final exactItem = await _service.fetchItem(requested);
        if (exactItem != null) {
          items = <FounderNotificationItem>[exactItem, ...items];
        }
      }
      if (!mounted) return;

      setState(() {
        _items = items;
        _loading = false;
      });

      _openInitialNotificationIfNeeded();
      if (overview.unread.hasCursor) {
        try {
          await _service.markSeen(overview.unread);
          if (!mounted) return;
          setState(() {
            _items = _items
                .map((item) => item.copyWith(isUnread: false))
                .toList(growable: false);
          });
        } catch (_) {
          // The history remains readable if cursor bookkeeping is unavailable.
        }
      }
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = _founderNotificationError(error);
      });
    }
  }

  void _openInitialNotificationIfNeeded() {
    if (_openingInitial) return;
    final requested = widget.initialNotificationId?.trim() ?? '';
    if (requested.isEmpty) return;

    FounderNotificationItem? match;
    for (final item in _items) {
      if (item.id == requested || item.notificationId == requested) {
        match = item;
        break;
      }
    }
    if (match == null) return;

    _openingInitial = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      unawaited(_openDetail(match!));
    });
  }

  List<FounderNotificationItem> get _visibleItems {
    return _items
        .where((item) {
          return switch (_filter) {
            _FounderNotificationFilter.all => true,
            _FounderNotificationFilter.actionNeeded => item.needsAction,
            _FounderNotificationFilter.updates => !item.needsAction,
          };
        })
        .toList(growable: false);
  }

  Future<void> _openDetail(FounderNotificationItem item) {
    return Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => FounderNotificationDetailScreen(item: item),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Founder Notifications'),
        actions: [
          IconButton(
            tooltip: 'Open Founder Operations',
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute<void>(
                builder: (_) => const FounderOperationsScreen(),
              ),
            ),
            icon: const Icon(Icons.admin_panel_settings_outlined),
          ),
          IconButton(
            tooltip: 'Refresh notifications',
            onPressed: _loading ? null : _load,
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
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 10),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Operations inbox',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Private alerts from pricing, ingestion, catalog, and production workers.',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: colorScheme.onSurface.withValues(alpha: 0.65),
                          height: 1.35,
                        ),
                      ),
                      const SizedBox(height: 12),
                      SegmentedButton<_FounderNotificationFilter>(
                        segments: const [
                          ButtonSegment(
                            value: _FounderNotificationFilter.all,
                            label: Text('All'),
                          ),
                          ButtonSegment(
                            value: _FounderNotificationFilter.actionNeeded,
                            label: Text('Action'),
                          ),
                          ButtonSegment(
                            value: _FounderNotificationFilter.updates,
                            label: Text('Updates'),
                          ),
                        ],
                        selected: <_FounderNotificationFilter>{_filter},
                        showSelectedIcon: false,
                        onSelectionChanged: (selection) {
                          setState(() => _filter = selection.first);
                        },
                      ),
                    ],
                  ),
                ),
              ),
              if (_loading && _items.isEmpty)
                const SliverFillRemaining(
                  hasScrollBody: false,
                  child: Center(child: CircularProgressIndicator()),
                )
              else if (_error != null && _items.isEmpty)
                SliverFillRemaining(
                  hasScrollBody: false,
                  child: _FounderNotificationEmptyState(
                    icon: Icons.error_outline_rounded,
                    title: 'Unable to load notifications',
                    body: _error!,
                    actionLabel: 'Retry',
                    onAction: _load,
                  ),
                )
              else if (_visibleItems.isEmpty)
                const SliverFillRemaining(
                  hasScrollBody: false,
                  child: _FounderNotificationEmptyState(
                    icon: Icons.notifications_none_rounded,
                    title: 'No notifications here',
                    body: 'This filter has no founder alerts right now.',
                  ),
                )
              else
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(12, 0, 12, 24),
                  sliver: SliverList.separated(
                    itemCount: _visibleItems.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 8),
                    itemBuilder: (context, index) {
                      final item = _visibleItems[index];
                      return FounderNotificationRow(
                        item: item,
                        onTap: () => _openDetail(item),
                      );
                    },
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class FounderNotificationRow extends StatelessWidget {
  const FounderNotificationRow({
    required this.item,
    required this.onTap,
    this.compact = false,
    super.key,
  });

  final FounderNotificationItem item;
  final VoidCallback onTap;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final tone = _FounderNotificationTone.forSeverity(
      Theme.of(context).colorScheme,
      item.severity,
    );
    final theme = Theme.of(context);

    return Material(
      color: tone.background,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
        side: BorderSide(color: tone.foreground.withValues(alpha: 0.24)),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: EdgeInsets.all(compact ? 10 : 12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SizedBox.square(
                dimension: compact ? 30 : 36,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: tone.foreground.withValues(alpha: 0.10),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    tone.icon,
                    size: compact ? 17 : 19,
                    color: tone.foreground,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          item.severity.toUpperCase(),
                          style: theme.textTheme.labelSmall?.copyWith(
                            color: tone.foreground,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          _relativeFounderNotificationTime(item.receivedAt),
                          style: theme.textTheme.labelSmall?.copyWith(
                            color: theme.colorScheme.onSurface.withValues(
                              alpha: 0.52,
                            ),
                          ),
                        ),
                        if (item.isUnread) ...[
                          const Spacer(),
                          Container(
                            width: 7,
                            height: 7,
                            decoration: BoxDecoration(
                              color: tone.foreground,
                              shape: BoxShape.circle,
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 3),
                    Text(
                      item.title,
                      maxLines: compact ? 1 : 2,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w700,
                        height: 1.25,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      item.summary,
                      maxLines: compact ? 2 : 3,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurface.withValues(
                          alpha: 0.68,
                        ),
                        height: 1.3,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 6),
              const Icon(Icons.chevron_right_rounded, size: 20),
            ],
          ),
        ),
      ),
    );
  }
}

class FounderNotificationDetailScreen extends StatelessWidget {
  const FounderNotificationDetailScreen({required this.item, super.key});

  final FounderNotificationItem item;

  @override
  Widget build(BuildContext context) {
    final tone = _FounderNotificationTone.forSeverity(
      Theme.of(context).colorScheme,
      item.severity,
    );
    final entries = <(String, String)>[
      ('Source', item.sourceUnit),
      ('Host', item.sourceHost),
      ('Event', item.eventType),
      ('Received', _fullFounderNotificationTime(item.receivedAt)),
      ('Commit', item.sourceCommitSha),
      ('Notification ID', item.notificationId),
    ].where((entry) => entry.$2.trim().isNotEmpty).toList(growable: false);

    return Scaffold(
      appBar: AppBar(title: const Text('Notification Detail')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 24),
          children: [
            DecoratedBox(
              decoration: BoxDecoration(
                color: tone.background,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: tone.foreground.withValues(alpha: 0.25),
                ),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(tone.icon, color: tone.foreground),
                        const SizedBox(width: 8),
                        Text(
                          item.severity.toUpperCase(),
                          style: Theme.of(context).textTheme.labelLarge
                              ?.copyWith(
                                color: tone.foreground,
                                fontWeight: FontWeight.w800,
                              ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Text(
                      item.title,
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(item.summary),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            if (item.workItemId.isNotEmpty) ...[
              FilledButton.icon(
                onPressed: () => Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => FounderOperationsScreen(
                      initialWorkItemId: item.workItemId,
                    ),
                  ),
                ),
                icon: const Icon(Icons.rule_folder_outlined),
                label: const Text('Open work item'),
              ),
              const SizedBox(height: 16),
            ],
            _FounderNotificationDetailSection(
              title: 'Evidence',
              children: entries
                  .map(
                    (entry) => _FounderNotificationDetailRow(
                      label: entry.$1,
                      value: entry.$2,
                    ),
                  )
                  .toList(growable: false),
            ),
            if (item.unitState.isNotEmpty) ...[
              const SizedBox(height: 12),
              _FounderNotificationDetailSection(
                title: 'Worker state',
                children: [
                  SelectableText(
                    item.unitState,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      fontFamily: 'monospace',
                      height: 1.45,
                    ),
                  ),
                ],
              ),
            ],
            if (item.journalTail.isNotEmpty) ...[
              const SizedBox(height: 12),
              _FounderNotificationDetailSection(
                title: 'Recent worker output',
                children: [
                  SelectableText(
                    item.journalTail,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      fontFamily: 'monospace',
                      height: 1.45,
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _FounderNotificationDetailSection extends StatelessWidget {
  const _FounderNotificationDetailSection({
    required this.title,
    required this.children,
  });

  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerLow,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: Theme.of(
                context,
              ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 10),
            ...children,
          ],
        ),
      ),
    );
  }
}

class _FounderNotificationDetailRow extends StatelessWidget {
  const _FounderNotificationDetailRow({
    required this.label,
    required this.value,
  });

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 9),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 92,
            child: Text(
              label,
              style: Theme.of(context).textTheme.labelMedium?.copyWith(
                color: Theme.of(
                  context,
                ).colorScheme.onSurface.withValues(alpha: 0.58),
              ),
            ),
          ),
          Expanded(child: SelectableText(value)),
        ],
      ),
    );
  }
}

class _FounderNotificationEmptyState extends StatelessWidget {
  const _FounderNotificationEmptyState({
    required this.icon,
    required this.title,
    required this.body,
    this.actionLabel,
    this.onAction,
  });

  final IconData icon;
  final String title;
  final String body;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 34),
            const SizedBox(height: 12),
            Text(
              title,
              textAlign: TextAlign.center,
              style: Theme.of(
                context,
              ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 6),
            Text(
              body,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodySmall,
            ),
            if (actionLabel != null && onAction != null) ...[
              const SizedBox(height: 14),
              FilledButton(onPressed: onAction, child: Text(actionLabel!)),
            ],
          ],
        ),
      ),
    );
  }
}

class _FounderNotificationTone {
  const _FounderNotificationTone({
    required this.foreground,
    required this.background,
    required this.icon,
  });

  final Color foreground;
  final Color background;
  final IconData icon;

  factory _FounderNotificationTone.forSeverity(
    ColorScheme colorScheme,
    String severity,
  ) {
    return switch (severity) {
      'critical' => _FounderNotificationTone(
        foreground: colorScheme.error,
        background: colorScheme.errorContainer.withValues(alpha: 0.32),
        icon: Icons.error_outline_rounded,
      ),
      'high' => const _FounderNotificationTone(
        foreground: Color(0xFFD96D18),
        background: Color(0x1FD96D18),
        icon: Icons.warning_amber_rounded,
      ),
      'warning' => const _FounderNotificationTone(
        foreground: Color(0xFFAF7A0A),
        background: Color(0x1FAF7A0A),
        icon: Icons.info_outline_rounded,
      ),
      _ => _FounderNotificationTone(
        foreground: colorScheme.primary,
        background: colorScheme.primaryContainer.withValues(alpha: 0.26),
        icon: Icons.check_circle_outline_rounded,
      ),
    };
  }
}

String _founderNotificationError(Object error) {
  final value = error.toString().toLowerCase();
  if (value.contains('founder_access_required') ||
      value.contains('permission denied')) {
    return 'This private inbox is available only to an active founder account.';
  }
  return 'Founder notifications are temporarily unavailable. Pull to refresh or try again.';
}

String _relativeFounderNotificationTime(DateTime? value) {
  if (value == null) return '';
  final difference = DateTime.now().difference(value.toLocal());
  if (difference.inMinutes < 1) return 'now';
  if (difference.inHours < 1) return '${difference.inMinutes}m';
  if (difference.inDays < 1) return '${difference.inHours}h';
  if (difference.inDays < 7) return '${difference.inDays}d';
  return '${value.toLocal().month}/${value.toLocal().day}';
}

String _fullFounderNotificationTime(DateTime? value) {
  if (value == null) return '';
  final local = value.toLocal();
  final minute = local.minute.toString().padLeft(2, '0');
  final hour = local.hour % 12 == 0 ? 12 : local.hour % 12;
  final suffix = local.hour >= 12 ? 'PM' : 'AM';
  return '${local.month}/${local.day}/${local.year} $hour:$minute $suffix';
}
