import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../services/network/card_interaction_service.dart';
import '../../widgets/card_surface_artwork.dart';
import 'network_thread_screen.dart';

class NetworkInboxScreen extends StatefulWidget {
  const NetworkInboxScreen({super.key});

  @override
  State<NetworkInboxScreen> createState() => _NetworkInboxScreenState();
}

class _NetworkInboxScreenState extends State<NetworkInboxScreen> {
  final SupabaseClient _client = Supabase.instance.client;
  CardInteractionInboxView _view = CardInteractionInboxView.inbox;
  bool _loading = true;
  String? _error;
  List<CardInteractionThreadSummary> _groups = const [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final userId = _client.auth.currentUser?.id ?? '';
    if (userId.isEmpty) {
      if (!mounted) {
        return;
      }
      setState(() {
        _loading = false;
        _error = 'You are not signed in.';
        _groups = const [];
      });
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final groups = await CardInteractionService.fetchThreadSummaries(
        client: _client,
        userId: userId,
      );
      if (!mounted) {
        return;
      }
      setState(() {
        _groups = groups;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _loading = false;
        _error = error is Error ? error.toString() : 'Unable to load messages.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final filtered = CardInteractionService.filterByView(_groups, _view);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Messages'),
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
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 18),
            children: [
              _InboxViewBar(
                currentView: _view,
                groups: _groups,
                onChanged: (nextView) {
                  setState(() {
                    _view = nextView;
                  });
                },
              ),
              const SizedBox(height: 10),
              if (_loading)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 48),
                  child: Center(child: CircularProgressIndicator()),
                )
              else if (_error != null)
                _InboxStateCard(title: 'Unable to load messages', body: _error!)
              else if (filtered.isEmpty)
                _InboxStateCard(
                  title: _emptyTitle(_view),
                  body: _emptyBody(_view),
                )
              else
                Column(
                  children: [
                    for (var index = 0; index < filtered.length; index++) ...[
                      _InboxThreadTile(group: filtered[index]),
                      if (index < filtered.length - 1)
                        const SizedBox(height: 8),
                    ],
                  ],
                ),
            ],
          ),
        ),
      ),
    );
  }

  String _emptyTitle(CardInteractionInboxView view) {
    switch (view) {
      case CardInteractionInboxView.unread:
        return 'Nothing unread';
      case CardInteractionInboxView.sent:
        return 'No sent messages yet';
      case CardInteractionInboxView.closed:
        return 'Nothing closed yet';
      case CardInteractionInboxView.inbox:
        return 'No active messages';
    }
  }

  String _emptyBody(CardInteractionInboxView view) {
    switch (view) {
      case CardInteractionInboxView.unread:
        return 'New card conversations will appear here when another collector replies.';
      case CardInteractionInboxView.sent:
        return 'Messages you start from a card owner contact action will appear here.';
      case CardInteractionInboxView.closed:
        return 'Closed or archived card threads will show up here once mobile state controls are wired.';
      case CardInteractionInboxView.inbox:
        return 'Use contact buttons on public cards to start card-specific message threads.';
    }
  }
}

class _InboxViewBar extends StatelessWidget {
  const _InboxViewBar({
    required this.currentView,
    required this.groups,
    required this.onChanged,
  });

  final CardInteractionInboxView currentView;
  final List<CardInteractionThreadSummary> groups;
  final ValueChanged<CardInteractionInboxView> onChanged;

  @override
  Widget build(BuildContext context) {
    final items = <({CardInteractionInboxView view, String label, int count})>[
      (
        view: CardInteractionInboxView.unread,
        label: 'Unread',
        count: groups
            .where(
              (group) =>
                  group.hasUnread && !group.isClosed && !group.isArchived,
            )
            .length,
      ),
      (
        view: CardInteractionInboxView.inbox,
        label: 'Inbox',
        count: groups
            .where((group) => !group.isClosed && !group.isArchived)
            .length,
      ),
      (
        view: CardInteractionInboxView.sent,
        label: 'Sent',
        count: groups
            .where(
              (group) =>
                  group.startedByCurrentUser &&
                  !group.isClosed &&
                  !group.isArchived,
            )
            .length,
      ),
      (
        view: CardInteractionInboxView.closed,
        label: 'Closed',
        count: groups
            .where((group) => group.isClosed || group.isArchived)
            .length,
      ),
    ];

    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.14),
        ),
      ),
      child: Wrap(
        spacing: 6,
        runSpacing: 6,
        children: [
          for (final item in items)
            ChoiceChip(
              label: Text('${item.label} ${item.count}'),
              selected: currentView == item.view,
              onSelected: (_) => onChanged(item.view),
              materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
              visualDensity: VisualDensity.compact,
            ),
        ],
      ),
    );
  }
}

class _InboxThreadTile extends StatelessWidget {
  const _InboxThreadTile({required this.group});

  final CardInteractionThreadSummary group;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final metaParts = <String>[
      group.setName,
      if (group.number != '—') '#${group.number}',
    ];

    return Material(
      color: colorScheme.surface,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute<void>(
              builder: (_) => NetworkThreadScreen(thread: group),
            ),
          );
        },
        child: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: colorScheme.outline.withValues(alpha: 0.12),
            ),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CardSurfaceArtwork(
                label: group.cardName,
                imageUrl: group.imageUrl,
                width: 58,
                height: 80,
                borderRadius: 12,
                padding: const EdgeInsets.all(4),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            group.cardName,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: Theme.of(context).textTheme.titleSmall
                                ?.copyWith(fontWeight: FontWeight.w700),
                          ),
                        ),
                        _ThreadPill(group: group),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      metaParts.join(' • '),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: colorScheme.onSurface.withValues(alpha: 0.68),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      group.counterpartSlug == null
                          ? group.counterpartDisplayName
                          : '${group.counterpartDisplayName} • /u/${group.counterpartSlug}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.labelMedium?.copyWith(
                        color: colorScheme.primary,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      group.latestMessage,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: colorScheme.onSurface.withValues(alpha: 0.78),
                        height: 1.3,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Text(
                          group.messageCount == 1
                              ? '1 message'
                              : '${group.messageCount} messages',
                          style: Theme.of(context).textTheme.labelSmall
                              ?.copyWith(
                                color: colorScheme.onSurface.withValues(
                                  alpha: 0.58,
                                ),
                                fontWeight: FontWeight.w700,
                              ),
                        ),
                        const Spacer(),
                        Text(
                          _formatTimestamp(group.latestCreatedAt),
                          style: Theme.of(context).textTheme.labelSmall
                              ?.copyWith(
                                color: colorScheme.onSurface.withValues(
                                  alpha: 0.58,
                                ),
                              ),
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
    );
  }

  String _formatTimestamp(DateTime? value) {
    if (value == null) {
      return 'Recently';
    }

    final age = DateTime.now().difference(value);
    if (age.inMinutes < 1) {
      return 'Now';
    }
    if (age.inMinutes < 60) {
      return '${age.inMinutes}m';
    }
    if (age.inHours < 24) {
      return '${age.inHours}h';
    }
    if (age.inDays < 7) {
      return '${age.inDays}d';
    }

    return '${value.month}/${value.day}/${value.year}';
  }
}

class _ThreadPill extends StatelessWidget {
  const _ThreadPill({required this.group});

  final CardInteractionThreadSummary group;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final (background, foreground, label) = group.isArchived
        ? (
            colorScheme.surfaceContainerHighest.withValues(alpha: 0.55),
            colorScheme.onSurface.withValues(alpha: 0.72),
            'Archived',
          )
        : group.isClosed
        ? (
            Colors.amber.withValues(alpha: 0.14),
            Colors.amber.shade900,
            'Closed',
          )
        : group.hasUnread
        ? (Colors.green.withValues(alpha: 0.14), Colors.green.shade900, 'New')
        : (
            colorScheme.surfaceContainerHighest.withValues(alpha: 0.45),
            colorScheme.onSurface.withValues(alpha: 0.72),
            'Active',
          );

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
          color: foreground,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _InboxStateCard extends StatelessWidget {
  const _InboxStateCard({required this.title, required this.body});

  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.14)),
      ),
      child: Column(
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
              color: colorScheme.onSurface.withValues(alpha: 0.72),
              height: 1.35,
            ),
          ),
        ],
      ),
    );
  }
}
