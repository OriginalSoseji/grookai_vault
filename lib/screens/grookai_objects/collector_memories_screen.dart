import 'package:flutter/material.dart';

import '../../services/vault/collector_memory_service.dart';
import '../../widgets/card_surface_artwork.dart';
import '../vault/vault_manage_card_screen.dart';

class CollectorMemoriesScreen extends StatefulWidget {
  CollectorMemoriesScreen({super.key, CollectorMemoryService? service})
    : service = service ?? CollectorMemoryService();

  final CollectorMemoryService service;

  @override
  State<CollectorMemoriesScreen> createState() =>
      _CollectorMemoriesScreenState();
}

class _CollectorMemoriesScreenState extends State<CollectorMemoriesScreen> {
  late Future<List<_OwnerMemoryViewModel>> _future;

  @override
  void initState() {
    super.initState();
    _future = _loadMemories();
  }

  Future<List<_OwnerMemoryViewModel>> _loadMemories() async {
    final memories = await widget.service.loadOwnerMemories();
    final models = <_OwnerMemoryViewModel>[];
    for (final memory in memories) {
      final signedPhotoUrl = await widget.service.createSignedPhotoUrl(
        memory.memory.photoPath,
      );
      models.add(
        _OwnerMemoryViewModel(memory: memory, signedPhotoUrl: signedPhotoUrl),
      );
    }
    return models;
  }

  void _reload() {
    setState(() {
      _future = _loadMemories();
    });
  }

  Future<void> _openCard(OwnerCollectorMemory item) async {
    final gvviId = item.memory.gvviId.trim();
    if (gvviId.isEmpty) {
      return;
    }
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => VaultManageCardScreen(gvviId: gvviId),
      ),
    );
    if (mounted) {
      _reload();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Memories')),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async => _reload(),
          child: FutureBuilder<List<_OwnerMemoryViewModel>>(
            future: _future,
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator());
              }

              if (snapshot.hasError) {
                return ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.all(18),
                  children: [
                    _MemoryHomeMessage(
                      icon: Icons.error_outline_rounded,
                      title: 'Unable to load memories',
                      body: 'Pull to refresh or try again from your Vault.',
                      action: TextButton.icon(
                        onPressed: _reload,
                        icon: const Icon(Icons.refresh_rounded),
                        label: const Text('Try again'),
                      ),
                    ),
                  ],
                );
              }

              final memories = snapshot.data ?? const <_OwnerMemoryViewModel>[];
              if (memories.isEmpty) {
                return ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.all(18),
                  children: const [
                    _MemoryHomeMessage(
                      icon: Icons.auto_awesome_outlined,
                      title: 'No memories yet',
                      body:
                          'Create a memory from Grookai Objects or an owned card. Saved memories will live here across your whole vault.',
                    ),
                  ],
                );
              }

              return ListView.separated(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(14, 10, 14, 24),
                itemCount: memories.length,
                separatorBuilder: (_, _) => const SizedBox(height: 10),
                itemBuilder: (context, index) {
                  final model = memories[index];
                  return _OwnerMemoryTile(
                    model: model,
                    onTap: () => _openCard(model.memory),
                  );
                },
              );
            },
          ),
        ),
      ),
    );
  }
}

class _OwnerMemoryTile extends StatelessWidget {
  const _OwnerMemoryTile({required this.model, required this.onTap});

  final _OwnerMemoryViewModel model;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final item = model.memory;
    final memory = item.memory;
    final thumbnailUrl = model.signedPhotoUrl ?? item.cardImageUrl;
    final meta = _memoryMeta(memory);
    final subtitle = _cardSubtitle(item);

    return Material(
      color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.32),
      borderRadius: BorderRadius.circular(8),
      child: InkWell(
        borderRadius: BorderRadius.circular(8),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CardSurfaceArtwork(
                label: item.cardName,
                imageUrl: thumbnailUrl,
                width: 64,
                height: 88,
                borderRadius: 8,
                padding: EdgeInsets.zero,
                showShadow: false,
                enableTapToZoom: false,
                frame: CardArtworkFrame.soft,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _memoryTypeLabel(memory.memoryType),
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: colorScheme.primary,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      item.cardName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    if (subtitle.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(
                        subtitle,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                    if ((memory.note ?? '').trim().isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Text(
                        memory.note!.trim(),
                        maxLines: 3,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.bodyMedium,
                      ),
                    ],
                    if (meta.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Text(
                        meta,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 6),
              Icon(
                Icons.chevron_right_rounded,
                color: colorScheme.onSurfaceVariant,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MemoryHomeMessage extends StatelessWidget {
  const _MemoryHomeMessage({
    required this.icon,
    required this.title,
    required this.body,
    this.action,
  });

  final IconData icon;
  final String title;
  final String body;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 48),
      child: Column(
        children: [
          Icon(icon, size: 34, color: colorScheme.primary),
          const SizedBox(height: 12),
          Text(
            title,
            textAlign: TextAlign.center,
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            body,
            textAlign: TextAlign.center,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: colorScheme.onSurfaceVariant,
            ),
          ),
          if (action != null) ...[const SizedBox(height: 12), action!],
        ],
      ),
    );
  }
}

class _OwnerMemoryViewModel {
  const _OwnerMemoryViewModel({required this.memory, this.signedPhotoUrl});

  final OwnerCollectorMemory memory;
  final String? signedPhotoUrl;
}

String _memoryTypeLabel(CollectorMemoryType type) {
  return switch (type) {
    CollectorMemoryType.addedPlace => 'Added place',
    CollectorMemoryType.occasion => 'Occasion',
    CollectorMemoryType.first => 'First',
    CollectorMemoryType.note => 'Memory',
  };
}

String _memoryMeta(CollectorMemory memory) {
  final parts = <String>[];
  final date = memory.memoryDate ?? memory.createdAt;
  if (date != null) {
    parts.add(_formatDate(date));
  }
  final place = (memory.placeLabel ?? '').trim();
  if (place.isNotEmpty) {
    parts.add(place);
  }
  final occasion = (memory.occasionLabel ?? '').trim();
  if (occasion.isNotEmpty) {
    parts.add(occasion);
  }
  return parts.join(' · ');
}

String _cardSubtitle(OwnerCollectorMemory item) {
  final setName = item.setName.trim();
  return setName;
}

String _formatDate(DateTime date) {
  final local = date.toLocal();
  return '${local.year.toString().padLeft(4, '0')}-${local.month.toString().padLeft(2, '0')}-${local.day.toString().padLeft(2, '0')}';
}
