import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../models/ownership_state.dart';
import '../../services/network/card_interaction_service.dart';
import '../../services/vault/ownership_resolver_adapter.dart';
import '../../widgets/card_surface_artwork.dart';
import '../../widgets/ownership/ownership_signal.dart';
import 'network_thread_screen.dart';

class NetworkInboxScreen extends StatefulWidget {
  const NetworkInboxScreen({super.key});

  @override
  State<NetworkInboxScreen> createState() => _NetworkInboxScreenState();
}

class _NetworkInboxScreenState extends State<NetworkInboxScreen> {
  final SupabaseClient _client = Supabase.instance.client;
  final OwnershipResolverAdapter _ownershipAdapter =
      OwnershipResolverAdapter.instance;
  Map<String, OwnershipState> _ownershipByCardPrintId =
      <String, OwnershipState>{};
  CardInteractionInboxView _view = CardInteractionInboxView.inbox;
  bool _loading = true;
  String? _error;
  String? _selectedCounterpartUserId;
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
        _ownershipByCardPrintId = <String, OwnershipState>{};
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
      final ownershipByCardPrintId = await _primeOwnership(
        groups.map((group) => group.cardPrintId),
      );
      if (!mounted) {
        return;
      }
      setState(() {
        _groups = groups;
        _ownershipByCardPrintId = ownershipByCardPrintId;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _loading = false;
        _error = error is Error ? error.toString() : 'Unable to load messages.';
        _ownershipByCardPrintId = <String, OwnershipState>{};
      });
    }
  }

  Future<Map<String, OwnershipState>> _primeOwnership(
    Iterable<String> cardPrintIds,
  ) async {
    final normalizedIds = cardPrintIds
        .map((value) => value.trim())
        .where((value) => value.isNotEmpty)
        .toSet()
        .toList();
    if (normalizedIds.isEmpty) {
      return <String, OwnershipState>{};
    }

    // PERFORMANCE_P4_INBOX_SYNC_OWNERSHIP
    // Inbox ownership hints render from precomputed snapshot state.
    try {
      await _ownershipAdapter.primeBatch(normalizedIds);
    } catch (error) {
      debugPrint('Inbox ownership prime failed: $error');
    }
    return _ownershipAdapter.snapshotForIds(normalizedIds);
  }

  OwnershipState? _ownershipStateForGroup(CardInteractionThreadSummary group) {
    final cardPrintId = group.cardPrintId.trim();
    if (cardPrintId.isEmpty) {
      return null;
    }
    return _ownershipByCardPrintId[cardPrintId] ??
        _ownershipAdapter.peek(cardPrintId);
  }

  Future<void> _openThread(CardInteractionThreadSummary group) async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => NetworkThreadScreen(thread: group),
      ),
    );
    if (!mounted) {
      return;
    }
    await _load();
  }

  @override
  Widget build(BuildContext context) {
    final filtered = CardInteractionService.filterByView(_groups, _view);
    final collectors = _collectorGroupsFor(filtered);
    final effectiveSelectedCounterpartUserId =
        collectors.any(
          (group) => group.counterpartUserId == _selectedCounterpartUserId,
        )
        ? _selectedCounterpartUserId
        : null;
    final visibleCollectors = effectiveSelectedCounterpartUserId == null
        ? collectors
        : collectors
              .where(
                (group) =>
                    group.counterpartUserId ==
                    effectiveSelectedCounterpartUserId,
              )
              .toList();
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
              if (!_loading && _error == null && filtered.isNotEmpty) ...[
                _InboxCollectorFilterBar(
                  collectors: collectors,
                  selectedCounterpartUserId: effectiveSelectedCounterpartUserId,
                  onChanged: (counterpartUserId) {
                    setState(() {
                      _selectedCounterpartUserId = counterpartUserId;
                    });
                  },
                ),
                const SizedBox(height: 10),
              ],
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
                    for (
                      var sectionIndex = 0;
                      sectionIndex < visibleCollectors.length;
                      sectionIndex++
                    ) ...[
                      _InboxCollectorSection(
                        group: visibleCollectors[sectionIndex],
                        ownershipStateForThread: _ownershipStateForGroup,
                        onOpenThread: _openThread,
                      ),
                      if (sectionIndex < visibleCollectors.length - 1)
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

  List<_InboxCollectorGroup> _collectorGroupsFor(
    List<CardInteractionThreadSummary> groups,
  ) {
    final byCollector = <String, List<CardInteractionThreadSummary>>{};
    for (final group in groups) {
      final key = group.counterpartUserId.trim().isEmpty
          ? 'unknown:${group.counterpartDisplayName}'
          : group.counterpartUserId.trim();
      byCollector.putIfAbsent(key, () => <CardInteractionThreadSummary>[]);
      byCollector[key]!.add(group);
    }

    final collectorGroups = <_InboxCollectorGroup>[];
    for (final entry in byCollector.entries) {
      final threads = [...entry.value]
        ..sort((left, right) {
          final leftTime =
              left.latestCreatedAt ?? DateTime.fromMillisecondsSinceEpoch(0);
          final rightTime =
              right.latestCreatedAt ?? DateTime.fromMillisecondsSinceEpoch(0);
          return rightTime.compareTo(leftTime);
        });
      final first = threads.first;
      collectorGroups.add(
        _InboxCollectorGroup(
          counterpartUserId: first.counterpartUserId,
          displayName: first.counterpartDisplayName,
          slug: first.counterpartSlug,
          threads: threads,
        ),
      );
    }

    collectorGroups.sort((left, right) {
      final leftTime =
          left.latestCreatedAt ?? DateTime.fromMillisecondsSinceEpoch(0);
      final rightTime =
          right.latestCreatedAt ?? DateTime.fromMillisecondsSinceEpoch(0);
      return rightTime.compareTo(leftTime);
    });
    return collectorGroups;
  }
}

class _InboxCollectorGroup {
  const _InboxCollectorGroup({
    required this.counterpartUserId,
    required this.displayName,
    required this.slug,
    required this.threads,
  });

  final String counterpartUserId;
  final String displayName;
  final String? slug;
  final List<CardInteractionThreadSummary> threads;

  int get unreadCount => threads.where((thread) => thread.hasUnread).length;

  int get cardCount => threads.length;

  DateTime? get latestCreatedAt => threads
      .map((thread) => thread.latestCreatedAt)
      .whereType<DateTime>()
      .fold<DateTime?>(
        null,
        (latest, value) =>
            latest == null || value.isAfter(latest) ? value : latest,
      );
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

class _InboxCollectorFilterBar extends StatelessWidget {
  const _InboxCollectorFilterBar({
    required this.collectors,
    required this.selectedCounterpartUserId,
    required this.onChanged,
  });

  final List<_InboxCollectorGroup> collectors;
  final String? selectedCounterpartUserId;
  final ValueChanged<String?> onChanged;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.14)),
      ),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: [
            ChoiceChip(
              label: Text('All collectors ${collectors.length}'),
              selected: selectedCounterpartUserId == null,
              onSelected: (_) => onChanged(null),
              materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
              visualDensity: VisualDensity.compact,
            ),
            for (final collector in collectors) ...[
              const SizedBox(width: 6),
              ChoiceChip(
                label: Text('${collector.displayName} ${collector.cardCount}'),
                selected:
                    selectedCounterpartUserId == collector.counterpartUserId,
                onSelected: (_) => onChanged(collector.counterpartUserId),
                materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                visualDensity: VisualDensity.compact,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _InboxCollectorSection extends StatelessWidget {
  const _InboxCollectorSection({
    required this.group,
    required this.ownershipStateForThread,
    required this.onOpenThread,
  });

  final _InboxCollectorGroup group;
  final OwnershipState? Function(CardInteractionThreadSummary thread)
  ownershipStateForThread;
  final Future<void> Function(CardInteractionThreadSummary thread) onOpenThread;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final subtitle = group.slug == null
        ? '${group.cardCount} ${group.cardCount == 1 ? 'card thread' : 'card threads'}'
        : '/u/${group.slug} • ${group.cardCount} ${group.cardCount == 1 ? 'card thread' : 'card threads'}';

    return Container(
      decoration: BoxDecoration(
        color: colorScheme.surface.withValues(alpha: 0.64),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.12)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 10, 12, 8),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 17,
                  backgroundColor: colorScheme.surfaceContainerHighest
                      .withValues(alpha: 0.72),
                  child: Text(
                    _collectorInitials(group.displayName),
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: colorScheme.onSurface.withValues(alpha: 0.78),
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                const SizedBox(width: 9),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        group.displayName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w700,
                          height: 1.05,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        subtitle,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.labelSmall?.copyWith(
                          color: colorScheme.onSurface.withValues(alpha: 0.58),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
                if (group.unreadCount > 0)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: colorScheme.primaryContainer.withValues(
                        alpha: 0.44,
                      ),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      '${group.unreadCount} new',
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: colorScheme.onPrimaryContainer,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
              ],
            ),
          ),
          for (var index = 0; index < group.threads.length; index++) ...[
            Padding(
              padding: const EdgeInsets.fromLTRB(8, 0, 8, 8),
              child: _InboxThreadTile(
                group: group.threads[index],
                ownershipState: ownershipStateForThread(group.threads[index]),
                onOpenThread: () => onOpenThread(group.threads[index]),
              ),
            ),
          ],
        ],
      ),
    );
  }

  String _collectorInitials(String displayName) {
    final normalized = displayName.trim();
    if (normalized.isEmpty) {
      return '?';
    }
    final parts = normalized
        .split(RegExp(r'\s+'))
        .where((part) => part.isNotEmpty)
        .toList();
    if (parts.length == 1) {
      return parts.first.characters.take(2).toString().toUpperCase();
    }
    return '${parts.first.characters.first}${parts.last.characters.first}'
        .toUpperCase();
  }
}

class _InboxThreadTile extends StatelessWidget {
  const _InboxThreadTile({
    required this.group,
    required this.onOpenThread,
    this.ownershipState,
  });

  final CardInteractionThreadSummary group;
  final Future<void> Function() onOpenThread;
  final OwnershipState? ownershipState;

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
        onTap: () async {
          await onOpenThread();
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
                onViewDetails: () {
                  onOpenThread();
                },
                detailsLabel: 'View thread',
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
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: Theme.of(context).textTheme.titleSmall
                                ?.copyWith(
                                  fontWeight: FontWeight.w800,
                                  height: 1.05,
                                ),
                          ),
                        ),
                        _ThreadPill(group: group),
                      ],
                    ),
                    const SizedBox(height: 3),
                    Text(
                      metaParts.join(' • '),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.labelMedium?.copyWith(
                        color: colorScheme.onSurface.withValues(alpha: 0.66),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      group.counterpartSlug == null
                          ? 'With ${group.counterpartDisplayName}'
                          : 'With ${group.counterpartDisplayName} • /u/${group.counterpartSlug}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: colorScheme.onSurface.withValues(alpha: 0.62),
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.15,
                      ),
                    ),
                    const SizedBox(height: 4),
                    SizedBox(
                      height: 16,
                      child: OwnershipSignal(
                        ownershipState: ownershipState,
                        textStyle: Theme.of(context).textTheme.labelSmall
                            ?.copyWith(
                              color: colorScheme.onSurface.withValues(
                                alpha: 0.56,
                              ),
                              fontWeight: FontWeight.w700,
                            ),
                        labelBuilder: (state) => state.ownedCount > 1
                            ? '${state.ownedCount} copies in your vault'
                            : 'In your vault',
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      group.latestMessage,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: colorScheme.onSurface.withValues(alpha: 0.76),
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
