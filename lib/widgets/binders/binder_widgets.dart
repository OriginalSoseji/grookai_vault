import 'package:flutter/material.dart';

import '../../models/binders/binder_models.dart';
import '../../theme/gv_tokens.dart';
import '../gv_surface.dart';

Future<BinderReportReason?> showBinderReportReasonPicker(
  BuildContext context, {
  required String subjectLabel,
}) {
  return showDialog<BinderReportReason>(
    context: context,
    builder: (context) => SimpleDialog(
      title: Text('Why are you reporting $subjectLabel?'),
      children: [
        for (final reason in BinderReportReason.values)
          SimpleDialogOption(
            onPressed: () => Navigator.pop(context, reason),
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 5),
              child: Text(reason.label),
            ),
          ),
        SimpleDialogOption(
          onPressed: () => Navigator.pop(context),
          child: const Padding(
            padding: EdgeInsets.symmetric(vertical: 5),
            child: Text('Cancel'),
          ),
        ),
      ],
    ),
  );
}

class BinderProgressBar extends StatelessWidget {
  const BinderProgressBar({
    required this.completed,
    required this.total,
    required this.unit,
    this.compact = false,
    super.key,
  });

  final int completed;
  final int total;
  final String unit;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final safeTotal = total < 0 ? 0 : total;
    final safeCompleted = completed.clamp(0, safeTotal);
    final value = safeTotal == 0 ? 0.0 : safeCompleted / safeTotal;
    final percent = (value * 100).round();
    final displayUnit = unit.trim().replaceAll('_', ' ');
    final theme = Theme.of(context);
    return Semantics(
      label:
          '$safeCompleted of $safeTotal $displayUnit, '
          '$percent percent complete',
      value: '$percent%',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ExcludeSemantics(
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    '$safeCompleted of $safeTotal $displayUnit',
                    style:
                        (compact
                                ? theme.textTheme.labelMedium
                                : theme.textTheme.bodyMedium)
                            ?.copyWith(fontWeight: FontWeight.w700),
                  ),
                ),
                Text(
                  '$percent%',
                  style: theme.textTheme.labelLarge?.copyWith(
                    color: theme.colorScheme.primary,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ],
            ),
          ),
          SizedBox(height: compact ? 5 : 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(GvRadii.pill),
            child: LinearProgressIndicator(
              value: value,
              minHeight: compact ? 6 : 9,
              backgroundColor: theme.colorScheme.surfaceContainerHighest,
            ),
          ),
        ],
      ),
    );
  }
}

class BinderArtwork extends StatelessWidget {
  const BinderArtwork({
    required this.imageUrl,
    this.fallbackImageUrl,
    this.size = 58,
    this.icon = Icons.collections_bookmark_outlined,
    this.semanticLabel = 'Binder artwork',
    super.key,
  });

  final String? imageUrl;
  final String? fallbackImageUrl;
  final double size;
  final IconData icon;
  final String semanticLabel;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final url = (imageUrl ?? '').trim();
    final fallbackUrl = (fallbackImageUrl ?? '').trim();
    final fallback = Center(
      child: Icon(icon, color: colors.primary, size: size * 0.42),
    );
    final fallbackImage = fallbackUrl.isEmpty || fallbackUrl == url
        ? fallback
        : Image.network(
            fallbackUrl,
            fit: BoxFit.contain,
            semanticLabel: semanticLabel,
            errorBuilder: (_, _, _) => fallback,
          );
    return ClipRRect(
      borderRadius: BorderRadius.circular(GvRadii.control),
      child: ColoredBox(
        color: colors.primaryContainer.withValues(alpha: 0.35),
        child: SizedBox.square(
          dimension: size,
          child: url.isEmpty
              ? fallbackImage
              : Image.network(
                  url,
                  fit: BoxFit.contain,
                  semanticLabel: semanticLabel,
                  errorBuilder: (_, _, _) => fallbackImage,
                ),
        ),
      ),
    );
  }
}

class BinderSummaryCard extends StatelessWidget {
  const BinderSummaryCard({
    required this.binder,
    required this.onTap,
    super.key,
  });

  final BinderSummary binder;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Semantics(
      button: true,
      label:
          '${binder.title}. ${binder.progressLabel}. '
          '${binder.role.label}. Open Binder.',
      child: GvSurface(
        variant: GvSurfaceVariant.grouped,
        padding: EdgeInsets.zero,
        child: InkWell(
          borderRadius: BorderRadius.circular(GvRadii.surface),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(GvSpacing.md),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                BinderArtwork(imageUrl: binder.coverImageUrl),
                const SizedBox(width: GvSpacing.md),
                Expanded(
                  child: ExcludeSemantics(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                binder.title,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: theme.textTheme.titleSmall?.copyWith(
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              binder.role.label,
                              style: theme.textTheme.labelSmall?.copyWith(
                                color: theme.colorScheme.onSurfaceVariant,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 2),
                        Text(
                          [
                            if (binder.targetLabel.isNotEmpty)
                              binder.targetLabel,
                            binder.checklistMode.label,
                            if (binder.memberCount > 1)
                              '${binder.memberCount} members',
                          ].join(' · '),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                        const SizedBox(height: 10),
                        BinderProgressBar(
                          completed: binder.completedSlots,
                          total: binder.totalSlots,
                          unit: binder.effectiveProgressUnit,
                          compact: true,
                        ),
                        if (binder.pendingApprovalCount > 0) ...[
                          const SizedBox(height: 8),
                          Text(
                            '${binder.pendingApprovalCount} awaiting review',
                            style: theme.textTheme.labelSmall?.copyWith(
                              color: theme.colorScheme.tertiary,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 2),
                const Icon(Icons.chevron_right_rounded),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class BinderStateMessage extends StatelessWidget {
  const BinderStateMessage({
    required this.icon,
    required this.title,
    required this.body,
    this.action,
    super.key,
  });

  final IconData icon;
  final String title;
  final String body;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 46, color: theme.colorScheme.primary),
            const SizedBox(height: 14),
            Text(
              title,
              textAlign: TextAlign.center,
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 7),
            Text(
              body,
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
                height: 1.35,
              ),
            ),
            if (action != null) ...[const SizedBox(height: 16), action!],
          ],
        ),
      ),
    );
  }
}

class BinderVaultBoundaryNotice extends StatelessWidget {
  const BinderVaultBoundaryNotice({
    this.message =
        'Cards stay in each collector’s Vault. The Binder combines only the '
        'copies members choose to contribute.',
    super.key,
  });

  final String message;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Semantics(
      excludeSemantics: true,
      label: message,
      child: GvSurface(
        variant: GvSurfaceVariant.grouped,
        color: colors.primaryContainer.withValues(alpha: 0.25),
        padding: const EdgeInsets.all(12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(Icons.inventory_2_outlined, color: colors.primary),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                message,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: colors.onSurfaceVariant,
                  height: 1.35,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class BinderStaleBanner extends StatelessWidget {
  const BinderStaleBanner({
    required this.lastAuthorizedAt,
    required this.onRetry,
    super.key,
  });

  final DateTime? lastAuthorizedAt;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final timestamp = lastAuthorizedAt?.toLocal();
    final label = timestamp == null
        ? 'Showing saved Binder progress.'
        : 'Showing progress last authorized '
              '${timestamp.month}/${timestamp.day} '
              '${timestamp.hour.toString().padLeft(2, '0')}:'
              '${timestamp.minute.toString().padLeft(2, '0')}.';
    return MaterialBanner(
      content: Text('$label Changes require a connection.'),
      leading: const Icon(Icons.cloud_off_outlined),
      actions: [TextButton(onPressed: onRetry, child: const Text('Retry'))],
    );
  }
}
