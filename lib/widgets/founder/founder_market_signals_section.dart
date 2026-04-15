import 'package:flutter/material.dart';

import '../../screens/founder/founder_card_signal_detail_screen.dart';
import '../../screens/founder/founder_set_signal_detail_screen.dart';
import '../../services/network/founder_insight_service.dart';

class FounderMarketSignalsSection extends StatelessWidget {
  const FounderMarketSignalsSection({super.key, required this.bundle});

  final FounderInsightBundle bundle;

  @override
  Widget build(BuildContext context) {
    if (bundle.sections.isEmpty) {
      return const _FounderSignalEmpty(
        title: 'Vendor Tools are ready',
        body: 'Signals will appear as collectors use the app.',
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (var index = 0; index < bundle.sections.length; index++) ...[
          if (index > 0) const SizedBox(height: 12),
          _FounderSignalSectionCard(section: bundle.sections[index]),
        ],
      ],
    );
  }
}

class _FounderSignalSectionCard extends StatelessWidget {
  const _FounderSignalSectionCard({required this.section});

  final FounderInsightSection section;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.28),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.08)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  section.title,
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              _ScoreBadge(
                label: section.scoreLabel,
                value: section.hasRows
                    ? section.rowType == FounderInsightRowType.set
                          ? section.setRows.first.score
                          : section.cardRows.first.score
                    : 0,
              ),
            ],
          ),
          if (section.description.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              section.description,
              style: theme.textTheme.bodySmall?.copyWith(
                color: colorScheme.onSurface.withValues(alpha: 0.7),
                height: 1.35,
              ),
            ),
          ],
          const SizedBox(height: 10),
          if (!section.hasRows)
            _FounderSignalEmpty(
              title: section.title,
              body: section.emptyMessage,
            )
          else if (section.rowType == FounderInsightRowType.set)
            Column(
              children: [
                for (
                  var index = 0;
                  index < section.setRows.length;
                  index++
                ) ...[
                  if (index > 0) const SizedBox(height: 10),
                  _FounderSetRowCard(
                    rank: index + 1,
                    row: section.setRows[index],
                    onTap: (section.setRows[index].setCode ?? '').isEmpty
                        ? null
                        : () {
                            Navigator.of(context).push(
                              MaterialPageRoute<void>(
                                builder: (_) => FounderSetSignalDetailScreen(
                                  previewRow: section.setRows[index],
                                ),
                              ),
                            );
                          },
                  ),
                ],
              ],
            )
          else
            Column(
              children: [
                for (
                  var index = 0;
                  index < section.cardRows.length;
                  index++
                ) ...[
                  if (index > 0) const SizedBox(height: 10),
                  _FounderCardRowCard(
                    rank: index + 1,
                    row: section.cardRows[index],
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute<void>(
                          builder: (_) => FounderCardSignalDetailScreen(
                            previewRow: section.cardRows[index],
                          ),
                        ),
                      );
                    },
                  ),
                ],
              ],
            ),
        ],
      ),
    );
  }
}

class _FounderCardRowCard extends StatelessWidget {
  const _FounderCardRowCard({
    required this.rank,
    required this.row,
    this.onTap,
  });

  final int rank;
  final FounderInsightCardRow row;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final setMeta = [
      if (row.setCode != null) row.setCode!,
      if (row.number != null) '#${row.number!}',
    ].join('  ');

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: colorScheme.surface,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: colorScheme.outline.withValues(alpha: 0.08),
            ),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _RankBadge(rank: rank),
              const SizedBox(width: 10),
              _CardArtwork(url: row.preferredImageUrl),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      row.name,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    if ((row.setName ?? '').isNotEmpty ||
                        setMeta.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(
                        [
                          if ((row.setName ?? '').isNotEmpty) row.setName!,
                          if (setMeta.isNotEmpty) setMeta,
                        ].join('  '),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: colorScheme.onSurface.withValues(alpha: 0.66),
                        ),
                      ),
                    ],
                    if (row.reason.isNotEmpty) ...[
                      const SizedBox(height: 6),
                      Text(
                        row.reason,
                        style: theme.textTheme.bodySmall?.copyWith(
                          height: 1.35,
                        ),
                      ),
                    ],
                    if (row.signalBreakdown.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      _BreakdownWrap(breakdown: row.signalBreakdown),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Column(
                children: [
                  _ScoreBadge(label: 'Score', value: row.score),
                  if (onTap != null) ...[
                    const SizedBox(height: 6),
                    Icon(
                      Icons.chevron_right_rounded,
                      color: colorScheme.onSurface.withValues(alpha: 0.34),
                    ),
                  ],
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _FounderSetRowCard extends StatelessWidget {
  const _FounderSetRowCard({required this.rank, required this.row, this.onTap});

  final int rank;
  final FounderInsightSetRow row;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final setLabel = row.setCode?.toUpperCase() ?? 'SET';

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: colorScheme.surface,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: colorScheme.outline.withValues(alpha: 0.08),
            ),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _RankBadge(rank: rank),
              const SizedBox(width: 10),
              Container(
                width: 52,
                height: 52,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: colorScheme.primary.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Text(
                  setLabel,
                  textAlign: TextAlign.center,
                  style: theme.textTheme.labelLarge?.copyWith(
                    fontWeight: FontWeight.w800,
                    color: colorScheme.primary,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      row.setName ?? 'Unknown set',
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    if ((row.setCode ?? '').isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(
                        row.setCode!.toUpperCase(),
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: colorScheme.onSurface.withValues(alpha: 0.66),
                        ),
                      ),
                    ],
                    if (row.reason.isNotEmpty) ...[
                      const SizedBox(height: 6),
                      Text(
                        row.reason,
                        style: theme.textTheme.bodySmall?.copyWith(
                          height: 1.35,
                        ),
                      ),
                    ],
                    if (row.signalBreakdown.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      _BreakdownWrap(breakdown: row.signalBreakdown),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Column(
                children: [
                  _ScoreBadge(label: 'Score', value: row.score),
                  if (onTap != null) ...[
                    const SizedBox(height: 6),
                    Icon(
                      Icons.chevron_right_rounded,
                      color: colorScheme.onSurface.withValues(alpha: 0.34),
                    ),
                  ],
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CardArtwork extends StatelessWidget {
  const _CardArtwork({required this.url});

  final String? url;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      width: 52,
      height: 72,
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.46),
        borderRadius: BorderRadius.circular(12),
      ),
      child: (url ?? '').isEmpty
          ? Icon(
              Icons.image_not_supported_outlined,
              color: colorScheme.onSurface.withValues(alpha: 0.42),
              size: 20,
            )
          : Image.network(
              url!,
              fit: BoxFit.cover,
              cacheWidth: 160,
              errorBuilder: (context, error, stackTrace) => Icon(
                Icons.image_not_supported_outlined,
                color: colorScheme.onSurface.withValues(alpha: 0.42),
                size: 20,
              ),
            ),
    );
  }
}

class _BreakdownWrap extends StatelessWidget {
  const _BreakdownWrap({required this.breakdown});

  final Map<String, int> breakdown;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 6,
      runSpacing: 6,
      children: breakdown.entries
          .map(
            (entry) =>
                _MiniChip(label: '${_formatKey(entry.key)} ${entry.value}'),
          )
          .toList(growable: false),
    );
  }
}

class _RankBadge extends StatelessWidget {
  const _RankBadge({required this.rank});

  final int rank;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      width: 24,
      height: 24,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: colorScheme.primary.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        '$rank',
        style: Theme.of(context).textTheme.labelMedium?.copyWith(
          fontWeight: FontWeight.w800,
          color: colorScheme.primary,
        ),
      ),
    );
  }
}

class _ScoreBadge extends StatelessWidget {
  const _ScoreBadge({required this.label, required this.value});

  final String label;
  final int value;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
      decoration: BoxDecoration(
        color: colorScheme.primary.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        '$label $value',
        style: Theme.of(context).textTheme.labelMedium?.copyWith(
          fontWeight: FontWeight.w700,
          color: colorScheme.primary,
        ),
      ),
    );
  }
}

class _MiniChip extends StatelessWidget {
  const _MiniChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: Theme.of(
          context,
        ).textTheme.labelSmall?.copyWith(fontWeight: FontWeight.w700),
      ),
    );
  }
}

class _FounderSignalEmpty extends StatelessWidget {
  const _FounderSignalEmpty({required this.title, required this.body});

  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: Theme.of(
            context,
          ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 4),
        Text(
          body,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
            color: colorScheme.onSurface.withValues(alpha: 0.68),
            height: 1.35,
          ),
        ),
      ],
    );
  }
}

String _formatKey(String value) {
  final normalized = value.replaceAll('_', ' ').trim();
  if (normalized.isEmpty) {
    return value;
  }
  final parts = normalized.split(RegExp(r'\s+'));
  return parts
      .map(
        (part) => part.isEmpty
            ? part
            : '${part.substring(0, 1).toUpperCase()}${part.substring(1)}',
      )
      .join(' ');
}
