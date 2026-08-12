import 'dart:async';

import 'package:flutter/material.dart';

import '../../services/vault/collector_memory_service.dart';
import '../../widgets/card_surface_artwork.dart';
import 'collector_memory_detail_screen.dart';

class CollectorMemoryRouteScreen extends StatefulWidget {
  CollectorMemoryRouteScreen({
    super.key,
    required this.memoryId,
    this.onViewCard,
    CollectorMemoryService? service,
  }) : service = service ?? CollectorMemoryService();

  final String memoryId;
  final Future<void> Function(String gvId)? onViewCard;
  final CollectorMemoryService service;

  @override
  State<CollectorMemoryRouteScreen> createState() =>
      _CollectorMemoryRouteScreenState();
}

class _CollectorMemoryRouteScreenState
    extends State<CollectorMemoryRouteScreen> {
  OwnerCollectorMemory? _item;
  String? _signedPhotoUrl;
  Object? _error;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    unawaited(_load());
  }

  Future<void> _load() async {
    try {
      final item = await widget.service.loadAccessibleMemory(
        memoryId: widget.memoryId,
      );
      final signedPhotoUrl = item == null
          ? null
          : await widget.service.createSignedPhotoUrl(
              item.memory.photoPath,
              expiresIn: 300,
            );
      if (!mounted) return;
      setState(() {
        _item = item;
        _signedPhotoUrl = signedPhotoUrl;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        key: Key('collector-memory-route-loading'),
        appBar: _MemoryRouteAppBar(),
        body: Center(child: CircularProgressIndicator()),
      );
    }

    final item = _item;
    if (_error != null || item == null) {
      return Scaffold(
        key: const Key('collector-memory-route-unavailable'),
        appBar: const _MemoryRouteAppBar(),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(28),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.lock_outline_rounded, size: 34),
                const SizedBox(height: 14),
                Text(
                  'Memory unavailable',
                  style: Theme.of(
                    context,
                  ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 8),
                Text(
                  'This Memory may be private, removed, or no longer shared.',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                const SizedBox(height: 18),
                OutlinedButton.icon(
                  onPressed: () {
                    setState(() {
                      _loading = true;
                      _error = null;
                    });
                    unawaited(_load());
                  },
                  icon: const Icon(Icons.refresh_rounded),
                  label: const Text('Try again'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    if (item.viewerIsOwner) {
      return CollectorMemoryDetailScreen(
        item: item,
        signedPhotoUrl: _signedPhotoUrl,
        memoryService: widget.service,
        onViewCard: _canViewCard(item)
            ? () => widget.onViewCard!(item.gvId!.trim())
            : null,
      );
    }

    return _SharedCollectorMemoryScreen(
      item: item,
      signedPhotoUrl: _signedPhotoUrl,
      onViewCard: _canViewCard(item)
          ? () => widget.onViewCard!(item.gvId!.trim())
          : null,
    );
  }

  bool _canViewCard(OwnerCollectorMemory item) =>
      widget.onViewCard != null && (item.gvId ?? '').trim().isNotEmpty;
}

class _MemoryRouteAppBar extends StatelessWidget
    implements PreferredSizeWidget {
  const _MemoryRouteAppBar();

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);

  @override
  Widget build(BuildContext context) => AppBar(title: const Text('Memory'));
}

class _SharedCollectorMemoryScreen extends StatelessWidget {
  const _SharedCollectorMemoryScreen({
    required this.item,
    required this.signedPhotoUrl,
    required this.onViewCard,
  });

  final OwnerCollectorMemory item;
  final String? signedPhotoUrl;
  final Future<void> Function()? onViewCard;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final memory = item.memory;
    final note = (memory.note ?? '').trim();
    final details = <(IconData, String)>[
      if ((memory.placeLabel ?? '').trim().isNotEmpty)
        (Icons.place_outlined, memory.placeLabel!.trim()),
      if ((memory.occasionLabel ?? '').trim().isNotEmpty)
        (Icons.celebration_outlined, memory.occasionLabel!.trim()),
      if (memory.memoryDate != null)
        (Icons.calendar_today_outlined, _formatMemoryDate(memory.memoryDate!)),
    ];
    final artwork = item.catalogArtwork;

    return Scaffold(
      key: const Key('shared-collector-memory-detail'),
      appBar: const _MemoryRouteAppBar(),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
          children: [
            Text(
              'Shared by ${(item.ownerDisplayName ?? 'Collector').trim()}',
              style: theme.textTheme.labelLarge?.copyWith(
                color: theme.colorScheme.primary,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 5),
            Text(
              item.cardName,
              style: theme.textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.w800,
              ),
            ),
            if (item.setName.trim().isNotEmpty) ...[
              const SizedBox(height: 3),
              Text(
                item.setName,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ],
            const SizedBox(height: 20),
            AspectRatio(
              aspectRatio: signedPhotoUrl == null ? 0.69 : 4 / 3,
              child: CardSurfaceArtwork(
                key: const Key('shared-collector-memory-image'),
                label: 'Memory for ${item.cardName}',
                imageUrl: signedPhotoUrl ?? artwork.primaryImageUrl,
                fallbackImageUrl: artwork.fallbackImageUrl,
                borderRadius: 8,
                frame: CardArtworkFrame.soft,
                padding: EdgeInsets.zero,
                showShadow: false,
              ),
            ),
            if (note.isNotEmpty) ...[
              const SizedBox(height: 22),
              Text(
                note,
                key: const Key('shared-collector-memory-note'),
                style: theme.textTheme.bodyLarge?.copyWith(height: 1.45),
              ),
            ],
            if (details.isNotEmpty) ...[
              const SizedBox(height: 18),
              Wrap(
                spacing: 16,
                runSpacing: 10,
                children: [
                  for (final detail in details)
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          detail.$1,
                          size: 17,
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                        const SizedBox(width: 6),
                        Text(detail.$2),
                      ],
                    ),
                ],
              ),
            ],
            if (onViewCard != null) ...[
              const SizedBox(height: 26),
              OutlinedButton.icon(
                key: const Key('shared-memory-view-card-button'),
                onPressed: () async => onViewCard!(),
                icon: const Icon(Icons.style_outlined),
                label: const Text('View card'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

String _formatMemoryDate(DateTime date) {
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
  return '${months[date.month - 1]} ${date.day}, ${date.year}';
}
