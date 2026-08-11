import 'package:flutter/material.dart';

import '../../services/network/pulse_service.dart';
import '../../widgets/card_surface_artwork.dart';

class PulseMemoryDetailScreen extends StatelessWidget {
  const PulseMemoryDetailScreen({
    super.key,
    required this.item,
    required this.onViewCard,
  });

  final PulseItem item;
  final Future<void> Function() onViewCard;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final note = item.memoryNote.trim();
    final details = <_MemoryDetail>[
      if (item.memoryPlaceLabel.isNotEmpty)
        _MemoryDetail(Icons.place_outlined, item.memoryPlaceLabel),
      if (item.memoryOccasionLabel.isNotEmpty)
        _MemoryDetail(Icons.celebration_outlined, item.memoryOccasionLabel),
      if (item.memoryDate.isNotEmpty)
        _MemoryDetail(Icons.calendar_today_outlined, item.memoryDate),
    ];

    return Scaffold(
      key: const Key('pulse-memory-detail'),
      appBar: AppBar(title: const Text('Memory')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
          children: [
            Text(
              'Shared by ${item.displayActorName}',
              style: theme.textTheme.labelLarge?.copyWith(
                color: colorScheme.primary,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 5),
            Text(
              item.displayCardName,
              style: theme.textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.w800,
              ),
            ),
            if (item.setName.isNotEmpty || item.setCode.isNotEmpty) ...[
              const SizedBox(height: 3),
              Text(
                item.setName.isNotEmpty ? item.setName : item.setCode,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: colorScheme.onSurfaceVariant,
                ),
              ),
            ],
            const SizedBox(height: 20),
            AspectRatio(
              aspectRatio: item.memoryPhotoUrl == null ? 0.69 : 4 / 3,
              child: CardSurfaceArtwork(
                key: const Key('pulse-memory-image'),
                label: 'Memory for ${item.displayCardName}',
                imageUrl: item.memoryPhotoUrl ?? item.displayImageUrl,
                fallbackImageUrl: item.fallbackImageUrl,
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
                key: const Key('pulse-memory-note'),
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
                          detail.icon,
                          size: 17,
                          color: colorScheme.onSurfaceVariant,
                        ),
                        const SizedBox(width: 6),
                        Text(detail.label),
                      ],
                    ),
                ],
              ),
            ],
            const SizedBox(height: 26),
            OutlinedButton.icon(
              key: const Key('pulse-memory-view-card-button'),
              onPressed: () async => onViewCard(),
              icon: const Icon(Icons.style_outlined),
              label: const Text('View card'),
            ),
          ],
        ),
      ),
    );
  }
}

class _MemoryDetail {
  const _MemoryDetail(this.icon, this.label);

  final IconData icon;
  final String label;
}
